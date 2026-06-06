"""Offline package API for pre-cached tour content.

Provides a downloadable package of Top50 Q&A, audio, scenic info, and thumbnails.
Supports incremental updates via ETag/Last-Modified headers.
"""
import hashlib
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, Response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/offline", tags=["offline"])

# Offline package storage path
PACKAGE_DIR = Path(__file__).parent.parent.parent / "data" / "offline"
PACKAGE_FILE = PACKAGE_DIR / "offline_package.json"


def _get_package_meta() -> dict:
    """Get package metadata (ETag, last-modified)."""
    if not PACKAGE_FILE.exists():
        return {}
    stat = PACKAGE_FILE.stat()
    etag = hashlib.md5(f"{stat.st_mtime_ns}:{stat.st_size}".encode()).hexdigest()
    return {
        "etag": etag,
        "last_modified": stat.st_mtime,
        "size": stat.st_size,
    }


@router.get("/package")
async def download_package(request: Request):
    """Download the offline tour package.

    Supports conditional requests:
        - If-None-Match (ETag)
        - If-Modified-Since

    Returns:
        JSON package with top50 Q&A, audio references, scenic info, thumbnails.
    """
    if not PACKAGE_FILE.exists():
        raise HTTPException(status_code=404, detail="Offline package not generated yet")

    meta = _get_package_meta()

    # Check ETag
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == meta["etag"]:
        return Response(status_code=304)

    # Check If-Modified-Since
    if_modified_since = request.headers.get("if-modified-since")
    if if_modified_since:
        try:
            from email.utils import parsedate_to_datetime
            client_time = parsedate_to_datetime(if_modified_since).timestamp()
            if client_time >= meta["last_modified"]:
                return Response(status_code=304)
        except Exception:
            pass

    return FileResponse(
        path=str(PACKAGE_FILE),
        media_type="application/json",
        filename="offline_package.json",
        headers={
            "ETag": meta["etag"],
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.get("/status")
async def package_status():
    """Check offline package availability and metadata.

    Returns:
        {available, etag, last_modified, size_kb, entry_count}
    """
    if not PACKAGE_FILE.exists():
        return {"available": False}

    meta = _get_package_meta()
    entry_count = 0
    try:
        with open(PACKAGE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            entry_count = len(data.get("qa_pairs", []))
    except Exception:
        pass

    return {
        "available": True,
        "etag": meta["etag"],
        "last_modified": meta["last_modified"],
        "size_kb": round(meta["size"] / 1024, 1),
        "entry_count": entry_count,
    }
