"""BM25 keyword search with jieba tokenization.

The index is built in-memory from PostgreSQL knowledge_chunks on startup.
For incremental updates, call add_document() after new chunks are inserted.
"""
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_index: "BM25Index | None" = None


class BM25Index:
    """In-memory BM25 index for Chinese text search."""

    def __init__(self):
        self._corpus: list[str] = []
        self._tokenized: list[list[str]] = []
        self._bm25 = None
        self._meta: list[dict] = []  # parallel with corpus: [{doc_id, chunk_index, chunk_id}]

    @property
    def is_ready(self) -> bool:
        return self._bm25 is not None and len(self._corpus) > 0

    def build(self, chunks: list[dict]):
        """Build index from a list of chunk dicts.

        Each chunk dict should have:
            - chunk_text (str)
            - doc_id (int)
            - chunk_index (int)
            - id (int, optional) — the PG primary key
        """
        import jieba
        from rank_bm25 import BM25Okapi

        self._corpus = []
        self._tokenized = []
        self._meta = []

        for chunk in chunks:
            text = chunk.get("chunk_text", "")
            if not text or not text.strip():
                continue
            self._corpus.append(text)
            self._tokenized.append(list(jieba.cut(text)))
            self._meta.append({
                "doc_id": chunk.get("doc_id"),
                "chunk_index": chunk.get("chunk_index"),
                "chunk_id": chunk.get("id"),
            })

        if self._tokenized:
            self._bm25 = BM25Okapi(self._tokenized)
            logger.info("BM25 index built with %d documents", len(self._corpus))
        else:
            self._bm25 = None
            logger.warning("BM25 index built with 0 documents")

    def add_document(self, doc_id: int, chunks: list[dict]):
        """Incrementally add chunks from a single document."""
        import jieba
        from rank_bm25 import BM25Okapi

        for chunk in chunks:
            text = chunk.get("chunk_text", "")
            if not text or not text.strip():
                continue
            self._corpus.append(text)
            self._tokenized.append(list(jieba.cut(text)))
            self._meta.append({
                "doc_id": doc_id,
                "chunk_index": chunk.get("chunk_index"),
                "chunk_id": chunk.get("id"),
            })

        if self._tokenized:
            self._bm25 = BM25Okapi(self._tokenized)
            logger.info("BM25 index updated: %d total documents", len(self._corpus))

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """Search BM25 index and return ranked results.

        Returns:
            List of dicts with keys: text, score, doc_id, chunk_index, chunk_id
        """
        import jieba

        if not self.is_ready:
            logger.debug("BM25 index not ready, returning empty results")
            return []

        tokenized_query = list(jieba.cut(query))
        scores = self._bm25.get_scores(tokenized_query)
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]

        results = []
        for idx, score in ranked:
            if score <= 0:
                continue
            meta = self._meta[idx]
            results.append({
                "text": self._corpus[idx],
                "score": float(score),
                "doc_id": meta.get("doc_id"),
                "chunk_index": meta.get("chunk_index"),
                "chunk_id": meta.get("chunk_id"),
                "source": "bm25",
            })
        return results

    def clear(self):
        """Clear the index."""
        self._corpus = []
        self._tokenized = []
        self._bm25 = None
        self._meta = []
        logger.info("BM25 index cleared")


async def rebuild_bm25_index_from_db():
    """Rebuild BM25 index from all knowledge_chunks in PostgreSQL.

    Should be called on application startup.
    """
    from app.core.database import async_session
    from sqlalchemy import select
    from app.models.knowledge import KnowledgeChunk

    index = get_bm25_index()
    index.clear()

    async with async_session() as db:
        stmt = select(KnowledgeChunk).order_by(KnowledgeChunk.doc_id, KnowledgeChunk.chunk_index)
        result = await db.execute(stmt)
        chunks = result.scalars().all()

        chunk_dicts = [
            {
                "id": c.id,
                "doc_id": c.doc_id,
                "chunk_index": c.chunk_index,
                "chunk_text": c.chunk_text,
            }
            for c in chunks
        ]

    index.build(chunk_dicts)
    logger.info("BM25 index rebuilt from DB: %d chunks", len(chunk_dicts))
    return len(chunk_dicts)


def get_bm25_index() -> BM25Index:
    """Get the global BM25 index singleton."""
    global _index
    if _index is None:
        _index = BM25Index()
    return _index


def reset_bm25_index() -> None:
    """Reset global BM25 index (mainly for testing)."""
    global _index
    _index = None
