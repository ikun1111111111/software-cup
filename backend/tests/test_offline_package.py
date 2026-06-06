"""Tests for offline package API endpoints."""
import json
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.offline import router

# Lightweight app with only the offline router — avoids heavy app.main imports
app = FastAPI()
app.include_router(router)
client = TestClient(app)


@pytest.fixture(autouse=True)
def _ensure_package(tmp_path, monkeypatch):
    """Create a temporary offline package for testing."""
    import app.api.offline as mod

    pkg_dir = tmp_path / "offline"
    pkg_dir.mkdir()
    pkg_file = pkg_dir / "offline_package.json"
    data = {
        "version": "1.0.0",
        "qa_pairs": [
            {"q": "测试问题？", "a": "测试答案。"},
            {"q": "第二个问题？", "a": "第二个答案。"},
        ],
        "scenic_spots": [{"id": "spot1", "name": "景点1"}],
    }
    pkg_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    monkeypatch.setattr(mod, "PACKAGE_DIR", pkg_dir)
    monkeypatch.setattr(mod, "PACKAGE_FILE", pkg_file)
    yield pkg_file


class TestOfflineStatus:
    def test_status_available(self):
        resp = client.get("/api/offline/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["available"] is True
        assert body["entry_count"] == 2
        assert "etag" in body
        assert "last_modified" in body
        assert "size_kb" in body

    def test_status_unavailable(self, monkeypatch):
        import app.api.offline as mod

        monkeypatch.setattr(mod, "PACKAGE_FILE", Path("/nonexistent/file.json"))
        resp = client.get("/api/offline/status")
        assert resp.status_code == 200
        assert resp.json()["available"] is False


class TestOfflinePackage:
    def test_download_package(self):
        resp = client.get("/api/offline/package")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/json"
        assert "etag" in resp.headers
        data = resp.json()
        assert len(data["qa_pairs"]) == 2

    def test_etag_returns_304(self):
        resp1 = client.get("/api/offline/package")
        etag = resp1.headers["etag"]

        resp2 = client.get("/api/offline/package", headers={"if-none-match": etag})
        assert resp2.status_code == 304

    def test_if_modified_since_returns_304(self):
        import time
        from email.utils import formatdate

        resp1 = client.get("/api/offline/package")
        future = formatdate(time.time() + 3600, usegmt=True)
        resp2 = client.get("/api/offline/package", headers={"if-modified-since": future})
        assert resp2.status_code == 304

    def test_package_not_found(self, monkeypatch):
        import app.api.offline as mod

        monkeypatch.setattr(mod, "PACKAGE_FILE", Path("/nonexistent/file.json"))
        resp = client.get("/api/offline/package")
        assert resp.status_code == 404
