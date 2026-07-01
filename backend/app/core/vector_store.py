"""Milvus vector store abstraction for knowledge chunks."""
import logging
from typing import Any

from pymilvus import MilvusClient, DataType

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_store: "VectorStore | None" = None


class VectorStore:
    """High-level Milvus vector store for scenic knowledge chunks."""

    def __init__(self, collection_name: str | None = None):
        self.collection_name = collection_name or settings.milvus_collection
        self._client: MilvusClient | None = None

    @property
    def client(self) -> MilvusClient:
        """Lazy-init Milvus client."""
        if self._client is None:
            uri = f"http://{settings.milvus_host}:{settings.milvus_port}"
            self._client = MilvusClient(uri=uri)
            logger.debug("Milvus client connected to %s", uri)
        return self._client

    def ensure_collection(self, dim: int = 1024):
        """Create collection if it does not exist."""
        cli = self.client
        if cli.has_collection(self.collection_name):
            logger.debug("Collection %s already exists", self.collection_name)
            return

        schema = cli.create_schema(auto_id=False, enable_dynamic_field=False)
        schema.add_field("id", DataType.VARCHAR, max_length=200, is_primary=True)
        schema.add_field("doc_id", DataType.INT64)
        schema.add_field("chunk_index", DataType.INT32)
        schema.add_field("text", DataType.VARCHAR, max_length=65535)
        schema.add_field("embedding", DataType.FLOAT_VECTOR, dim=dim)

        index_params = cli.prepare_index_params()
        # HNSW索引：在高召回和检索速度之间取得平衡，比IVF_FLAT更稳定
        index_params.add_index(
            "embedding",
            index_type="HNSW",
            metric_type="COSINE",
            params={"M": 16, "efConstruction": 200},
        )

        cli.create_collection(
            collection_name=self.collection_name,
            schema=schema,
            index_params=index_params,
        )
        logger.info("Created Milvus collection: %s", self.collection_name)

    def _make_id(self, doc_id: int, chunk_index: int) -> str:
        return f"{doc_id}_{chunk_index}"

    def insert_chunks(
        self,
        doc_id: int,
        chunks: list[dict],
        embeddings: list[list[float]] | None = None,
    ) -> list[str]:
        """Insert chunks with optional pre-computed embeddings.

        Args:
            doc_id: The knowledge document ID.
            chunks: List of chunk dicts with at least 'chunk_index' and 'chunk_text'.
            embeddings: Optional pre-computed embeddings. If None, they will be generated.

        Returns:
            List of inserted embedding IDs.
        """
        from app.core.embedding import get_embedding_engine

        self.ensure_collection()

        if embeddings is None:
            texts = [c["chunk_text"] for c in chunks]
            engine = get_embedding_engine()
            embeddings = engine.encode(texts)

        data = []
        ids = []
        for chunk, emb in zip(chunks, embeddings):
            eid = self._make_id(doc_id, chunk["chunk_index"])
            ids.append(eid)
            data.append({
                "id": eid,
                "doc_id": doc_id,
                "chunk_index": chunk["chunk_index"],
                "text": chunk["chunk_text"],
                "embedding": emb,
            })

        if data:
            self.client.insert(collection_name=self.collection_name, data=data)
            logger.info("Inserted %d vectors for doc %d", len(data), doc_id)

        return ids

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 10,
        output_fields: list[str] | None = None,
    ) -> list[dict]:
        """Vector search with HNSW ef tuned for better recall."""
        if output_fields is None:
            output_fields = ["id", "doc_id", "chunk_index", "text"]

        # HNSW搜索参数：ef越大召回越高，但速度越慢
        search_params = {"metric_type": "COSINE", "params": {"ef": max(top_k, 64)}}

        results = self.client.search(
            collection_name=self.collection_name,
            data=[query_embedding],
            limit=top_k,
            output_fields=output_fields,
            search_params=search_params,
        )
        return results[0] if results else []

    def delete_by_doc_id(self, doc_id: int) -> int:
        """Delete all vectors for a given document. Returns deleted count."""
        try:
            result = self.client.delete(
                collection_name=self.collection_name,
                filter=f"doc_id == {doc_id}",
            )
            deleted = result.get("delete_count", 0)
            logger.info("Deleted %d vectors for doc %d", deleted, doc_id)
            return deleted
        except Exception as e:
            logger.warning("Failed to delete vectors for doc %d: %s", doc_id, e)
            return 0

    def count(self) -> int:
        """Return total number of vectors in collection."""
        stats = self.client.get_collection_stats(self.collection_name)
        return stats.get("row_count", 0)


def get_vector_store() -> VectorStore:
    """Get the global vector store singleton."""
    global _store
    if _store is None:
        _store = VectorStore()
    return _store


def reset_vector_store() -> None:
    """Reset global vector store (mainly for testing)."""
    global _store
    _store = None
