"""RAG pipeline: hybrid retrieval + reranking.

Orchestrates embedding, vector search, BM25 keyword search, RRF fusion,
and reranking into a single retrieve() call.
"""
import asyncio
import logging

from app.core.config import get_settings
from app.core.embedding import get_embedding_engine
from app.core.vector_store import get_vector_store
from app.core.bm25_search import get_bm25_index
from app.core.reranker import get_reranker

logger = logging.getLogger(__name__)
settings = get_settings()


def init_collection():
    """Create Milvus collection if not exists."""
    store = get_vector_store()
    store.ensure_collection(dim=settings.chunk_size)


def _rrf_fusion(
    vector_results: list[dict],
    bm25_results: list[dict],
    k: int = 60,
) -> list[dict]:
    """Reciprocal Rank Fusion of vector and BM25 results."""
    scores: dict[str, dict] = {}

    # Vector scores
    for rank, r in enumerate(vector_results, 1):
        rid = r["id"]
        if rid not in scores:
            entity = r.get("entity", {})
            scores[rid] = {
                "id": rid,
                "text": entity.get("text", ""),
                "doc_id": entity.get("doc_id"),
                "chunk_index": entity.get("chunk_index"),
                "score": 0.0,
                "sources": [],
            }
        scores[rid]["score"] += 1.0 / (k + rank)
        scores[rid]["sources"].append("vector")

    # BM25 scores
    for rank, r in enumerate(bm25_results, 1):
        # Build a composite ID for BM25 results
        rid = f"bm25_{r.get('doc_id')}_{r.get('chunk_index')}"
        if rid not in scores:
            scores[rid] = {
                "id": rid,
                "text": r["text"],
                "doc_id": r.get("doc_id"),
                "chunk_index": r.get("chunk_index"),
                "score": 0.0,
                "sources": [],
            }
        scores[rid]["score"] += 1.0 / (k + rank)
        scores[rid]["sources"].append("bm25")

    # Sort by fused score descending
    fused = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
    return fused


async def hybrid_search(query: str, top_k: int | None = None, topic: str | None = None) -> list[dict]:
    """Hybrid search: vector + BM25 with RRF fusion and optional topic filter.

    Returns:
        Fused results sorted by RRF score.
    """
    if top_k is None:
        top_k = settings.retrieval_top_k

    loop = asyncio.get_running_loop()

    # BM25 is independent from embedding/vector search; start it early in a worker
    # so keyword retrieval does not wait behind embedding latency.
    bm25 = get_bm25_index()
    bm25_future = (
        loop.run_in_executor(None, lambda: bm25.search(query, top_k=top_k * 2, topic=topic))
        if bm25.is_ready
        else None
    )

    # Vector search (run embedding in thread pool to avoid blocking event loop)
    engine = get_embedding_engine()
    store = get_vector_store()
    try:
        query_embedding = await loop.run_in_executor(None, engine.encode_query, query)
    except Exception as e:
        logger.warning("Embedding failed, skipping vector search: %s", e)
        query_embedding = None

    vector_results = []
    if query_embedding is not None:
        try:
            vector_results = await loop.run_in_executor(
                None,
                lambda: store.search(
                    query_embedding=query_embedding,
                    top_k=top_k * 2,
                    output_fields=["id", "doc_id", "chunk_index", "text", "topic"],
                    topic=topic,
                ),
            )
        except Exception as e:
            logger.warning("Vector search failed: %s", e)
            vector_results = []

    bm25_results = []
    if bm25_future:
        try:
            bm25_results = await bm25_future
        except Exception as e:
            logger.warning("BM25 search failed: %s", e)

    # RRF fusion
    fused = _rrf_fusion(vector_results, bm25_results, k=60)
    return fused[:top_k]


async def rerank(
    query: str,
    chunks: list[dict],
    top_k: int | None = None,
) -> list[dict]:
    """Re-rank chunks via BGE-Reranker."""
    if top_k is None:
        top_k = settings.rerank_top_k

    reranker = get_reranker()
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: reranker.rerank(query, chunks, top_k=top_k))


async def retrieve(query: str, rerank_top_k: int | None = None, topic: str | None = None) -> list[dict]:
    """Full retrieval pipeline: hybrid search + rerank.

    Args:
        query: User question.
        rerank_top_k: Number of results after reranking.
        topic: Optional topic filter for retrieval.

    Returns:
        List of chunk dicts with keys:
            - id, text, doc_id, chunk_index
            - score (RRF fused score)
            - rerank_score (from reranker)
            - sources (list of "vector" | "bm25")
    """
    hybrid_results = await hybrid_search(query, topic=topic)
    reranked = await rerank(query, hybrid_results, rerank_top_k)
    return reranked
