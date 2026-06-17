"""Tests for Milvus vector database connectivity."""
import pytest
from app.core.config import get_settings


class TestMilvusConfig:
    """Test Milvus configuration."""

    def test_milvus_settings_exist(self):
        """Milvus settings should be configured."""
        settings = get_settings()
        assert settings.milvus_host is not None
        assert settings.milvus_port == 19530
        assert settings.milvus_collection is not None
        assert settings.milvus_collection == "scenic_knowledge"

    @pytest.mark.skip(reason="Requires running Milvus")
    def test_milvus_connection(self):
        """Should connect to Milvus server."""
        from pymilvus import MilvusClient, connections

        settings = get_settings()
        client = MilvusClient(
            uri=f"http://{settings.milvus_host}:{settings.milvus_port}"
        )
        # A simple list_collections call should succeed
        collections = client.list_collections()
        assert isinstance(collections, list)

    @pytest.mark.skip(reason="Requires running Milvus")
    def test_collection_init(self):
        """init_collection should create collection if not exists."""
        from app.core.rag import init_collection, get_milvus

        settings = get_settings()
        client = get_milvus()

        # Clean up first
        if client.has_collection(settings.milvus_collection):
            client.drop_collection(settings.milvus_collection)

        init_collection()

        assert client.has_collection(settings.milvus_collection)

    @pytest.mark.skip(reason="Requires running Milvus")
    def test_vector_insert_and_search(self):
        """Should insert vectors and retrieve them."""
        import numpy as np
        from app.core.rag import get_milvus, init_collection

        settings = get_settings()
        init_collection()
        client = get_milvus()

        # Insert a test vector
        test_id = "test_vec_001"
        test_vector = np.random.randn(1024).tolist()

        client.insert(
            collection_name=settings.milvus_collection,
            data=[{
                "id": test_id,
                "doc_id": 9999,
                "chunk_index": 0,
                "text": "测试向量文本",
                "embedding": test_vector,
            }],
        )

        # Search
        results = client.search(
            collection_name=settings.milvus_collection,
            data=[test_vector],
            limit=1,
            output_fields=["id", "text"],
        )

        assert len(results) > 0
        assert len(results[0]) > 0
        assert results[0][0]["id"] == test_id

        # Cleanup
        client.delete(collection_name=settings.milvus_collection, ids=[test_id])
