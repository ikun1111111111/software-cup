"""RAG pipeline: hybrid retrieval + reranking."""
import logging
from pymilvus import MilvusClient, DataType
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_milvus: MilvusClient | None = None
_bm25_corpus: list[str] = []
_bm25_tokenized: list[list[str]] = []


def get_milvus() -> MilvusClient:
    global _milvus
    if _milvus is None:
        _milvus = MilvusClient(uri=f"http://{settings.milvus_host}:{settings.milvus_port}")
    return _milvus


def init_collection():
    """Create Milvus collection if not exists."""
    client = get_milvus()
    if client.has_collection(settings.milvus_collection):
        return

    schema = client.create_schema(auto_id=False, enable_dynamic_field=False)
    schema.add_field("id", DataType.VARCHAR, max_length=200, is_primary=True)
    schema.add_field("doc_id", DataType.INT64)
    schema.add_field("chunk_index", DataType.INT32)
    schema.add_field("text", DataType.VARCHAR, max_length=65535)
    schema.add_field("embedding", DataType.FLOAT_VECTOR, dim=1024)  # BGE-M3 dim

    index_params = client.prepare_index_params()
    index_params.add_index("embedding", index_type="IVF_FLAT", metric_type="COSINE", params={"nlist": 128})

    client.create_collection(
        collection_name=settings.milvus_collection,
        schema=schema,
        index_params=index_params,
    )


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings via BGE-M3."""
    from FlagEmbedding import BGEM3FlagModel
    model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
    embeddings = model.encode(texts, batch_size=32, max_length=512)["dense_vecs"]
    return embeddings.tolist()


async def embed_query(query: str) -> list[float]:
    """Generate single query embedding."""
    embeddings = await embed_texts([query])
    return embeddings[0]


def _build_bm25_index(chunks: list[dict]):
    """Build in-memory BM25 index from chunks."""
    import jieba
    from rank_bm25 import BM25Okapi

    global _bm25_corpus, _bm25_tokenized
    _bm25_corpus = [c["text"] for c in chunks]
    _bm25_tokenized = [list(jieba.cut(t)) for t in _bm25_corpus]
    return BM25Okapi(_bm25_tokenized)


async def hybrid_search(query: str, top_k: int | None = None) -> list[dict]:
    """Hybrid search: vector + BM25 with RRF fusion."""
    if top_k is None:
        top_k = settings.retrieval_top_k

    client = get_milvus()
    query_embedding = await embed_query(query)

    # Vector search
    vector_results = client.search(
        collection_name=settings.milvus_collection,
        data=[query_embedding],
        limit=top_k * 2,
        output_fields=["id", "doc_id", "chunk_index", "text"],
    )[0]

    # BM25 keyword search
    import jieba
    from rank_bm25 import BM25Okapi

    bm25 = BM25Okapi(_bm25_tokenized) if _bm25_tokenized else None
    bm25_results = []
    if bm25:
        tokenized_query = list(jieba.cut(query))
        scores = bm25.get_scores(tokenized_query)
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k * 2]
        bm25_results = [{"text": _bm25_corpus[i], "score": float(s), "index": i} for i, s in ranked]

    # RRF fusion
    fused = _rrf_fusion(vector_results, bm25_results, k=60)
    return fused[:top_k]


def _rrf_fusion(vector_results: list, bm25_results: list, k: int = 60) -> list[dict]:
    """Reciprocal Rank Fusion."""
    scores: dict[str, dict] = {}

    for rank, r in enumerate(vector_results, 1):
        rid = r["id"]
        if rid not in scores:
            scores[rid] = {"id": rid, "text": r["entity"]["text"], "score": 0.0}
        scores[rid]["score"] += 1.0 / (k + rank)

    for rank, r in enumerate(bm25_results, 1):
        rid = f"bm25_{r['index']}"
        if rid not in scores:
            scores[rid] = {"id": rid, "text": r["text"], "score": 0.0}
        scores[rid]["score"] += 1.0 / (k + rank)

    return sorted(scores.values(), key=lambda x: x["score"], reverse=True)


async def rerank(query: str, chunks: list[dict], top_k: int | None = None) -> list[dict]:
    """Re-rank chunks via BGE-Reranker."""
    if top_k is None:
        top_k = settings.rerank_top_k
    if len(chunks) <= top_k:
        return chunks

    from FlagEmbedding import FlagReranker

    reranker = FlagReranker("BAAI/bge-reranker-v2-m3", use_fp16=True)
    pairs = [[query, c["text"]] for c in chunks]
    scores = reranker.compute_score(pairs)

    for i, s in enumerate(scores):
        chunks[i]["rerank_score"] = float(s)

    chunks.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
    return chunks[:top_k]


async def retrieve(query: str, rerank_top_k: int | None = None) -> list[dict]:
    """Full retrieval pipeline: hybrid search + rerank."""
    hybrid_results = await hybrid_search(query)
    reranked = await rerank(query, hybrid_results, rerank_top_k)
    return reranked
