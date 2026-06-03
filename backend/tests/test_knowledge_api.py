"""Tests for knowledge management API.

NOTE: Most tests require a running PostgreSQL database.
Run with: docker-compose up -d postgres
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestKnowledgeDocs:
    """Test document CRUD endpoints."""

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_list_documents(self):
        """Should return paginated document list."""
        response = client.get("/api/knowledge/docs?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_create_document(self):
        """Should create a document and trigger indexing."""
        response = client.post("/api/knowledge/docs", json={
            "title": "测试文档",
            "content": "这是测试内容。",
            "file_type": "txt",
        })
        assert response.status_code in (200, 201)

    def test_list_documents_status_filter(self):
        """Should reject invalid status filter (no DB needed)."""
        response = client.get("/api/knowledge/docs?status=invalid")
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_get_document_not_found(self):
        """Should return 404 for non-existent document."""
        response = client.get("/api/knowledge/docs/99999")
        assert response.status_code == 404

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_delete_document_not_found(self):
        """Should return 404 when deleting non-existent document."""
        response = client.delete("/api/knowledge/docs/99999")
        assert response.status_code == 404

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_reindex_document_not_found(self):
        """Should return 404 when reindexing non-existent document."""
        response = client.post("/api/knowledge/docs/99999/reindex")
        assert response.status_code == 404


class TestKnowledgeFaq:
    """Test FAQ CRUD endpoints."""

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_list_faq(self):
        """Should return FAQ list."""
        response = client.get("/api/knowledge/faq")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_create_faq_validation(self):
        """Should create FAQ with valid input."""
        response = client.post("/api/knowledge/faq", json={
            "question": "测试问题？",
            "answer": "测试答案。",
            "category": "test",
        })
        assert response.status_code in (200, 201)

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_update_faq_not_found(self):
        """Should return 404 for non-existent FAQ."""
        response = client.put("/api/knowledge/faq/99999", json={
            "question": "Updated?",
        })
        assert response.status_code == 404

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    def test_delete_faq_not_found(self):
        """Should return 404 when deleting non-existent FAQ."""
        response = client.delete("/api/knowledge/faq/99999")
        assert response.status_code == 404
