"""Tests for RAG pipeline orchestration."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.core.rag import _rrf_fusion, hybrid_search, rerank, retrieve, init_collection


class TestRRFFusion:
    """Test Reciprocal Rank Fusion logic."""

    def test_fusion_both_sources(self):
        """Should fuse vector and BM25 results."""
        vector_results = [
            {"id": "v1", "entity": {"text": "vec1", "doc_id": 1, "chunk_index": 0}},
            {"id": "v2", "entity": {"text": "vec2", "doc_id": 1, "chunk_index": 1}},
        ]
        bm25_results = [
            {"text": "bm1", "doc_id": 1, "chunk_index": 1},
            {"text": "bm2", "doc_id": 2, "chunk_index": 0},
        ]

        fused = _rrf_fusion(vector_results, bm25_results, k=60)

        # v1, v2, bm25_1_1, bm25_2_0  (v2 and bm25_1_1 have different composite IDs)
        assert len(fused) == 4

    def test_fusion_only_vector(self):
        """Should handle only vector results."""
        vector_results = [
            {"id": "v1", "entity": {"text": "vec1"}},
        ]
        fused = _rrf_fusion(vector_results, [], k=60)
        assert len(fused) == 1
        assert fused[0]["id"] == "v1"

    def test_fusion_only_bm25(self):
        """Should handle only BM25 results."""
        bm25_results = [
            {"text": "bm1", "doc_id": 1, "chunk_index": 0},
        ]
        fused = _rrf_fusion([], bm25_results, k=60)
        assert len(fused) == 1

    def test_fusion_empty(self):
        """Should handle empty inputs."""
        fused = _rrf_fusion([], [], k=60)
        assert fused == []


class TestHybridSearch:
    """Test hybrid search with mocked dependencies."""

    @pytest.mark.asyncio
    async def test_hybrid_search_success(self):
        """Should combine vector and BM25 results."""
        with patch("app.core.rag.get_embedding_engine") as mock_emb, \
             patch("app.core.rag.get_vector_store") as mock_store, \
             patch("app.core.rag.get_bm25_index") as mock_bm25:

            mock_engine = MagicMock()
            mock_engine.encode_query.return_value = [0.1] * 1024
            mock_emb.return_value = mock_engine

            mock_vs = MagicMock()
            mock_vs.search.return_value = [
                {"id": "v1", "entity": {"text": "vec result", "doc_id": 1, "chunk_index": 0}}
            ]
            mock_store.return_value = mock_vs

            mock_idx = MagicMock()
            mock_idx.is_ready = True
            mock_idx.search.return_value = [
                {"text": "bm25 result", "doc_id": 2, "chunk_index": 0, "source": "bm25"}
            ]
            mock_bm25.return_value = mock_idx

            results = await hybrid_search("灵山胜境", top_k=3)
            assert len(results) == 2

    @pytest.mark.asyncio
    async def test_hybrid_search_vector_fails(self):
        """Should fallback to BM25 when vector search fails."""
        with patch("app.core.rag.get_embedding_engine") as mock_emb, \
             patch("app.core.rag.get_vector_store") as mock_store, \
             patch("app.core.rag.get_bm25_index") as mock_bm25:

            mock_engine = MagicMock()
            mock_engine.encode_query.return_value = [0.1] * 1024
            mock_emb.return_value = mock_engine

            mock_vs = MagicMock()
            mock_vs.search.side_effect = Exception("Milvus down")
            mock_store.return_value = mock_vs

            mock_idx = MagicMock()
            mock_idx.is_ready = True
            mock_idx.search.return_value = [
                {"text": "bm25 only", "doc_id": 1, "chunk_index": 0}
            ]
            mock_bm25.return_value = mock_idx

            results = await hybrid_search("test", top_k=3)
            assert len(results) == 1


class TestRerank:
    """Test rerank wrapper."""

    @pytest.mark.asyncio
    async def test_rerank_delegates(self):
        """Should delegate to reranker."""
        with patch("app.core.rag.get_reranker") as mock_get:
            mock_reranker = MagicMock()
            mock_reranker.rerank.return_value = [
                {"text": "best", "rerank_score": 0.99}
            ]
            mock_get.return_value = mock_reranker

            results = await rerank("query", [{"text": "a"}, {"text": "b"}], top_k=1)
            assert len(results) == 1
            assert results[0]["text"] == "best"


class TestRetrieve:
    """Test full retrieve pipeline."""

    @pytest.mark.asyncio
    async def test_retrieve_pipeline(self):
        """Should run hybrid + rerank end-to-end."""
        with patch("app.core.rag.hybrid_search", new_callable=AsyncMock) as mock_hybrid, \
             patch("app.core.rag.rerank", new_callable=AsyncMock) as mock_rerank:

            mock_hybrid.return_value = [
                {"id": "1", "text": "chunk1", "score": 0.8},
                {"id": "2", "text": "chunk2", "score": 0.7},
            ]
            mock_rerank.return_value = [
                {"id": "1", "text": "chunk1", "rerank_score": 0.95},
            ]

            results = await retrieve("灵山胜境")
            assert len(results) == 1
            assert results[0]["text"] == "chunk1"
            mock_hybrid.assert_awaited_once()
            mock_rerank.assert_awaited_once()
