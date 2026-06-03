"""File upload API — saves to local uploads/ directory (MinIO optional)."""
import os
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["upload"])

# Upload directory (relative to backend root)
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/markdown": "md",
    "text/plain": "txt",
    "application/msword": "doc",
}


class UploadResponse(BaseModel):
    filename: str
    file_path: str
    file_type: str
    url: str


@router.post("", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a document file.

    Returns file metadata including local path.
    MinIO integration can be added later for production.
    """
    # Validate file type
    content_type = file.content_type or ""
    ext = ALLOWED_TYPES.get(content_type)
    if not ext:
        # Try to infer from filename extension
        suffix = Path(file.filename or "").suffix.lower().lstrip(".")
        if suffix in ("pdf", "docx", "doc", "md", "txt"):
            ext = suffix
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {content_type}. Allowed: pdf, docx, doc, md, txt",
            )

    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex[:16]}_{file.filename or 'upload'}"
    file_path = UPLOAD_DIR / unique_name

    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        logger.info("Uploaded file: %s (%d bytes)", unique_name, len(contents))
    except Exception as e:
        logger.error("File upload failed: %s", e)
        raise HTTPException(status_code=500, detail="File upload failed")
    finally:
        await file.close()

    return UploadResponse(
        filename=file.filename or unique_name,
        file_path=str(file_path),
        file_type=ext,
        url=f"/uploads/{unique_name}",
    )
