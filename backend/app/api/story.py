"""Story API — multi-act storytelling narration for scenic spots."""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.story_service import generate_story_acts

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/story", tags=["story"])


class StoryAct(BaseModel):
    id: str
    title: str
    narration: str
    emotion: str
    act_image: str | None = None
    prompt_hint: str | None = None


class StoryActsResponse(BaseModel):
    spot_id: str
    spot_name: str
    description: str
    acts: list[StoryAct]


@router.get("/{spot_id}", response_model=StoryActsResponse)
async def get_story(spot_id: str, use_cache: bool = True):
    """Get a multi-act story script for a scenic spot.

    Returns 3-4 acts with predefined emotion and LLM-generated narration.
    Cached for 1 hour.
    """
    if not spot_id or not spot_id.strip():
        raise HTTPException(status_code=400, detail="景点 ID 不能为空")

    try:
        result = await generate_story_acts(spot_id.strip(), use_cache=use_cache)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Story API failed for '%s': %s", spot_id, e)
        raise HTTPException(status_code=500, detail="故事生成服务暂时不可用")

    return StoryActsResponse(
        spot_id=result["spot_id"],
        spot_name=result["spot_name"],
        description=result["description"],
        acts=[StoryAct(**a) for a in result["acts"]],
    )
