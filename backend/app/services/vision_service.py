"""Vision service: image recognition for scenic spots using Qwen-VL-Max."""
import logging
import base64

from app.core.llm_router import _call_qwen_vl
from app.core.rag import retrieve

logger = logging.getLogger(__name__)

VISION_IDENTIFY_PROMPT = (
    "请识别这张图片中的景点或地标。"
    "返回格式：景点名称|置信度(0-1)|简短描述\n"
    "如果无法识别，返回：未知|0|无法识别该图片中的景点"
)


async def identify_scenic_spot(image_data: bytes, mime_type: str = "image/jpeg") -> dict:
    """Identify a scenic spot from an image.

    Args:
        image_data: Raw image bytes.
        mime_type: Image MIME type (default: image/jpeg).

    Returns:
        Dict with keys: spot_name, confidence, description, raw_response
    """
    try:
        # Convert image to base64 data URL for Qwen-VL
        b64 = base64.b64encode(image_data).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"

        # Call Qwen-VL-Max to identify the spot
        raw_response = await _call_qwen_vl(data_url, VISION_IDENTIFY_PROMPT)

        # Parse response: expected format "景点名称|置信度|描述"
        parts = raw_response.strip().split("|")
        if len(parts) >= 3:
            spot_name = parts[0].strip()
            try:
                confidence = float(parts[1].strip())
            except ValueError:
                confidence = 0.5
            description = parts[2].strip()
        else:
            # Fallback: treat entire response as description
            spot_name = "未知景点"
            confidence = 0.3
            description = raw_response.strip()

        return {
            "spot_name": spot_name,
            "confidence": confidence,
            "description": description,
            "raw_response": raw_response,
        }

    except Exception as e:
        logger.error("Vision identification failed: %s", e)
        return {
            "spot_name": "识别失败",
            "confidence": 0.0,
            "description": "抱歉，暂时无法识别该图片，请尝试更清晰的照片。",
            "raw_response": str(e),
        }


async def get_spot_knowledge(spot_name: str) -> list[dict]:
    """Retrieve knowledge about a spot from RAG.

    Args:
        spot_name: Name of the scenic spot.

    Returns:
        List of knowledge chunks.
    """
    if not spot_name or spot_name in ("未知景点", "识别失败"):
        return []

    try:
        chunks = await retrieve(f"{spot_name} 景点介绍 历史")
        return chunks
    except Exception as e:
        logger.warning("RAG retrieval failed for spot '%s': %s", spot_name, e)
        return []


async def identify_and_explain(image_data: bytes, mime_type: str = "image/jpeg") -> dict:
    """Full pipeline: identify spot + retrieve knowledge + generate explanation.

    Args:
        image_data: Raw image bytes.
        mime_type: Image MIME type.

    Returns:
        Dict with keys: spot_name, confidence, description, knowledge_chunks, explanation
    """
    # Step 1: Identify the spot
    identification = await identify_scenic_spot(image_data, mime_type)

    # Step 2: Retrieve knowledge if identified
    chunks = []
    if identification["confidence"] > 0.3:
        chunks = await get_spot_knowledge(identification["spot_name"])

    # Step 3: Build explanation
    if chunks:
        context = "\n\n---\n\n".join(c["text"] for c in chunks[:3])
        explanation = f"【{identification['spot_name']}】\n\n{identification['description']}\n\n相关知识：\n{context}"
    else:
        explanation = f"【{identification['spot_name']}】\n\n{identification['description']}"

    return {
        "spot_name": identification["spot_name"],
        "confidence": identification["confidence"],
        "description": identification["description"],
        "knowledge_chunks": [{"text": c["text"], "score": c.get("score", 0)} for c in chunks],
        "explanation": explanation,
    }
