"""RAG pipeline: hybrid retrieval + reranking.

Orchestrates embedding, vector search, BM25 keyword search, RRF fusion,
and reranking into a single retrieve() call.
"""
import hashlib
import json
import logging
import time

from app.core.config import get_settings
from app.core.embedding import get_embedding_engine
from app.core.vector_store import get_vector_store
from app.core.bm25_search import get_bm25_index
from app.core.reranker import get_reranker
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)
settings = get_settings()

# 内存级检索结果缓存
_in_memory_rag_cache: dict[str, tuple[list[dict], float]] = {}
_RAG_CACHE_TTL_SECONDS = 300  # 5分钟


def _hash_query(query: str) -> str:
    return hashlib.sha256(query.lower().strip().encode()).hexdigest()[:16]


def _serialize_results(results: list[dict]) -> str:
    return json.dumps(results, ensure_ascii=False)


def _deserialize_results(raw: str) -> list[dict]:
    return json.loads(raw)


async def _get_cached_hybrid_results(query_hash: str) -> list[dict] | None:
    """从内存或Redis获取缓存的检索结果。"""
    now = time.time()

    # L1: 内存缓存
    if query_hash in _in_memory_rag_cache:
        results, expired_at = _in_memory_rag_cache[query_hash]
        if now < expired_at:
            logger.debug("RAG memory cache hit: %s", query_hash)
            return results
        del _in_memory_rag_cache[query_hash]

    # L2: Redis缓存
    try:
        redis = await get_redis()
        raw = await redis.get(f"rag:hybrid:{query_hash}")
        if raw:
            results = _deserialize_results(raw)
            # 回填内存缓存
            _in_memory_rag_cache[query_hash] = (results, now + _RAG_CACHE_TTL_SECONDS)
            logger.debug("RAG redis cache hit: %s", query_hash)
            return results
    except Exception as e:
        logger.warning("RAG redis cache read failed: %s", e)

    return None


async def _set_cached_hybrid_results(query_hash: str, results: list[dict]) -> None:
    """缓存检索结果到内存和Redis。"""
    now = time.time()
    _in_memory_rag_cache[query_hash] = (results, now + _RAG_CACHE_TTL_SECONDS)

    try:
        redis = await get_redis()
        await redis.setex(
            f"rag:hybrid:{query_hash}",
            _RAG_CACHE_TTL_SECONDS,
            _serialize_results(results),
        )
    except Exception as e:
        logger.warning("RAG redis cache write failed: %s", e)


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


async def hybrid_search(query: str, top_k: int | None = None) -> list[dict]:
    """Hybrid search: vector + BM25 with RRF fusion + 2-layer cache.

    Returns:
        Fused results sorted by RRF score.
    """
    if top_k is None:
        top_k = settings.retrieval_top_k

    query_hash = _hash_query(query)

    # 1. 缓存命中直接返回
    cached = await _get_cached_hybrid_results(query_hash)
    if cached is not None:
        return cached[:top_k]

    # 2. Vector search (run embedding in thread pool to avoid blocking event loop)
    engine = get_embedding_engine()
    store = get_vector_store()
    try:
        loop = __import__('asyncio').get_running_loop()
        query_embedding = await loop.run_in_executor(None, engine.encode_query, query)
    except Exception as e:
        logger.warning("Embedding failed, skipping vector search: %s", e)
        query_embedding = None

    vector_results = []
    if query_embedding is not None:
        try:
            vector_results = store.search(
                query_embedding=query_embedding,
                top_k=top_k * 2,
                output_fields=["id", "doc_id", "chunk_index", "text"],
            )
        except Exception as e:
            logger.warning("Vector search failed: %s", e)
            vector_results = []

    # 3. BM25 search
    bm25 = get_bm25_index()
    bm25_results = bm25.search(query, top_k=top_k * 2) if bm25.is_ready else []

    # 4. RRF fusion
    fused = _rrf_fusion(vector_results, bm25_results, k=60)
    results = fused[:top_k]

    # 5. 写入缓存
    await _set_cached_hybrid_results(query_hash, results)

    return results


async def rerank(
    query: str,
    chunks: list[dict],
    top_k: int | None = None,
) -> list[dict]:
    """Re-rank chunks via BGE-Reranker."""
    if top_k is None:
        top_k = settings.rerank_top_k

    reranker = get_reranker()
    return reranker.rerank(query, chunks, top_k=top_k)


def _boost_spot_chunks(chunks: list[dict], spot_name: str | None, boost: float = 0.05) -> list[dict]:
    """Re-rank retrieved chunks so that chunks mentioning the current spot are preferred."""
    if not spot_name or not chunks:
        return chunks
    name = spot_name.strip()
    if not name:
        return chunks
    for chunk in chunks:
        text = chunk.get("text", "")
        if name in text:
            chunk["rerank_score"] = chunk.get("rerank_score", chunk.get("score", 0)) + boost
            chunk["spot_boosted"] = True
    return sorted(chunks, key=lambda c: c.get("rerank_score", c.get("score", 0)), reverse=True)


async def retrieve(
    query: str,
    rerank_top_k: int | None = None,
    spot_name: str | None = None,
) -> list[dict]:
    """Full retrieval pipeline: hybrid search + rerank + optional spot boost.

    Returns:
        List of chunk dicts with keys:
            - id, text, doc_id, chunk_index
            - score (RRF fused score)
            - rerank_score (from reranker)
            - sources (list of "vector" | "bm25")
            - spot_boosted (bool, optional)
    """
    hybrid_results = await hybrid_search(query)
    reranked = await rerank(query, hybrid_results, rerank_top_k)
    return _boost_spot_chunks(reranked, spot_name)
