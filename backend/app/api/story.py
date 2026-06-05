"""Story API — storytelling narration for scenic spots."""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.story_service import generate_story

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/story", tags=["story"])


class StoryResponse(BaseModel):
    spot_name: str
    story: str
    emotion: str
    knowledge_chunks: list[dict]


@router.get("/{spot_name}", response_model=StoryResponse)
async def get_story(spot_name: str, use_cache: bool = True):
    """Get a storytelling narration for a scenic spot.

    Returns a story with detected emotion for digital human expression.
    Results are cached for 1 hour.
    """
    if not spot_name or not spot_name.strip():
        raise HTTPException(status_code=400, detail="景点名称不能为空")

    try:
        result = await generate_story(spot_name.strip(), use_cache=use_cache)
    except Exception as e:
        logger.error("Story API failed for '%s': %s", spot_name, e)
        raise HTTPException(status_code=500, detail="故事生成服务暂时不可用")

    return StoryResponse(
        spot_name=result["spot_name"],
        story=result["story"],
        emotion=result["emotion"],
        knowledge_chunks=result["knowledge_chunks"],
    )
