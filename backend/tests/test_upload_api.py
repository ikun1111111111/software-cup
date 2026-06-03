"""Tests for file upload API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestUploadFile:
    """Test POST /api/upload endpoint."""

    def test_upload_txt_file(self):
        """Should upload a text file successfully."""
        response = client.post(
            "/api/upload",
            files={"file": ("test.txt", "test content".encode("utf-8"), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["file_type"] == "txt"
        assert "file_path" in data
        assert "url" in data

    def test_upload_pdf_file(self):
        """Should accept PDF upload."""
        response = client.post(
            "/api/upload",
            files={"file": ("doc.pdf", b"%PDF-1.4 fake pdf content", "application/pdf")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["file_type"] == "pdf"

    def test_upload_unsupported_type(self):
        """Should reject unsupported file types."""
        response = client.post(
            "/api/upload",
            files={"file": ("image.png", b"fake image", "image/png")},
        )
        assert response.status_code == 400
        assert "Unsupported" in response.json()["detail"]

    def test_upload_empty_file(self):
        """Should handle empty file upload."""
        response = client.post(
            "/api/upload",
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert response.status_code == 200
