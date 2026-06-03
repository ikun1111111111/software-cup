"""Tests for BM25 keyword search index."""
import pytest
from app.core.bm25_search import BM25Index, get_bm25_index, reset_bm25_index


class TestBM25Index:
    """Test BM25 index build and search."""

    def test_build_and_search(self):
        """Should build index and return relevant results."""
        index = BM25Index()
        chunks = [
            {"chunk_text": "灵山大佛高88米，是中国最高的青铜立佛。", "doc_id": 1, "chunk_index": 0, "id": 1},
            {"chunk_text": "梵宫被誉为东方卢浮宫，内部有众多佛教艺术品。", "doc_id": 1, "chunk_index": 1, "id": 2},
            {"chunk_text": "九龙灌浴是大型动态音乐群雕，场面壮观。", "doc_id": 1, "chunk_index": 2, "id": 3},
            {"chunk_text": "灵山胜境门票成人票210元，优待票105元。", "doc_id": 2, "chunk_index": 0, "id": 4},
        ]
        index.build(chunks)

        assert index.is_ready
        assert len(index._corpus) == 4

        results = index.search("灵山大佛有多高", top_k=2)
        assert len(results) > 0
        # The result about 灵山大佛 should rank high
        texts = [r["text"] for r in results]
        assert any("大佛" in t or "88" in t for t in texts)

    def test_search_no_match(self):
        """Should return empty for unrelated query."""
        index = BM25Index()
        index.build([{"chunk_text": "灵山胜境简介", "doc_id": 1, "chunk_index": 0, "id": 1}])
        results = index.search("宇宙大爆炸理论", top_k=3)
        assert len(results) == 0

    def test_empty_index_not_ready(self):
        """Empty index should not be ready."""
        index = BM25Index()
        assert not index.is_ready
        results = index.search("anything")
        assert results == []

    def test_add_document_incremental(self):
        """Should support incremental document addition."""
        index = BM25Index()
        index.build([
            {"chunk_text": "原有文档内容。", "doc_id": 1, "chunk_index": 0, "id": 1},
        ])
        assert len(index._corpus) == 1

        index.add_document(2, [
            {"chunk_text": "新增文档的片段一，详细介绍了灵山胜境的景点。", "doc_id": 2, "chunk_index": 0, "id": 2},
            {"chunk_text": "新增文档的片段二，继续介绍灵山的历史文化。", "doc_id": 2, "chunk_index": 1, "id": 3},
        ])
        assert len(index._corpus) == 3

        results = index.search("灵山胜境景点", top_k=2)
        assert len(results) > 0
        texts = [r["text"] for r in results]
        assert any("灵山" in t for t in texts)

    def test_clear(self):
        """Should clear all data."""
        index = BM25Index()
        index.build([{"chunk_text": "测试", "doc_id": 1, "chunk_index": 0, "id": 1}])
        assert index.is_ready
        index.clear()
        assert not index.is_ready
        assert len(index._corpus) == 0


class TestBM25Singleton:
    """Test global BM25 index singleton."""

    def test_get_bm25_index(self):
        """Should return singleton instance."""
        reset_bm25_index()
        idx1 = get_bm25_index()
        idx2 = get_bm25_index()
        assert idx1 is idx2
