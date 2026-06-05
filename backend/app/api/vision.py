"""Vision API — photo-based scenic spot identification and narration."""
import logging
import time

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.vision_service import identify_and_explain, identify_scenic_spot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/vision", tags=["vision"])

# Max image size: 10 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
}


class VisionResponse(BaseModel):
    spot_name: str
    confidence: float
    description: str
    knowledge_chunks: list[dict]
    explanation: str
    latency_ms: int


class IdentifyOnlyResponse(BaseModel):
    spot_name: str
    confidence: float
    description: str
    raw_response: str
    latency_ms: int


@router.post("/identify", response_model=VisionResponse)
async def identify_spot_with_explanation(file: UploadFile = File(...)):
    """Identify a scenic spot from an uploaded image and generate narration.

    Full pipeline: image → Qwen-VL-Max identification → RAG knowledge → explanation.
    """
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的图片格式: {content_type}。请上传 JPEG、PNG、WebP 或 GIF 图片。",
        )

    # Read and validate size
    try:
        image_data = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded image: %s", e)
        raise HTTPException(status_code=500, detail="图片读取失败")
    finally:
        await file.close()

    if len(image_data) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"图片大小超过限制 ({MAX_IMAGE_SIZE // (1024 * 1024)}MB)",
        )

    if len(image_data) == 0:
        raise HTTPException(status_code=400, detail="上传的图片为空")

    # Run identification pipeline
    start_time = time.time()
    try:
        result = await identify_and_explain(image_data, content_type)
    except Exception as e:
        logger.error("Vision pipeline failed: %s", e)
        raise HTTPException(status_code=500, detail="图片识别服务暂时不可用，请稍后重试")

    latency_ms = int((time.time() - start_time) * 1000)

    return VisionResponse(
        spot_name=result["spot_name"],
        confidence=result["confidence"],
        description=result["description"],
        knowledge_chunks=result["knowledge_chunks"],
        explanation=result["explanation"],
        latency_ms=latency_ms,
    )


@router.post("/identify-only", response_model=IdentifyOnlyResponse)
async def identify_spot_only(file: UploadFile = File(...)):
    """Identify a scenic spot from an image without RAG lookup.

    Faster endpoint for when only identification is needed.
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的图片格式: {content_type}。请上传 JPEG、PNG、WebP 或 GIF 图片。",
        )

    try:
        image_data = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded image: %s", e)
        raise HTTPException(status_code=500, detail="图片读取失败")
    finally:
        await file.close()

    if len(image_data) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"图片大小超过限制 ({MAX_IMAGE_SIZE // (1024 * 1024)}MB)",
        )

    start_time = time.time()
    try:
        result = await identify_scenic_spot(image_data, content_type)
    except Exception as e:
        logger.error("Vision identification failed: %s", e)
        raise HTTPException(status_code=500, detail="图片识别服务暂时不可用")

    latency_ms = int((time.time() - start_time) * 1000)

    return IdentifyOnlyResponse(
        spot_name=result["spot_name"],
        confidence=result["confidence"],
        description=result["description"],
        raw_response=result["raw_response"],
        latency_ms=latency_ms,
    )
