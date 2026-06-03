"""Recommendation API endpoints."""
import json
import logging
from hashlib import md5

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.recommender import recommend, record_feedback

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recommend", tags=["recommend"])


class FeedbackRequest(BaseModel):
    session_id: str
    spot_name: str
    feedback: str  # "like" | "dislike"


class FeedbackResponse(BaseModel):
    status: str
    session_id: str
    spot_name: str


class RecommendItem(BaseModel):
    rank: int
    spot_name: str
    category: str
    reason: str
    suggested_duration: str
    tags: list[str]
    source: str


class RecommendResponse(BaseModel):
    session_id: str
    recommendations: list[RecommendItem]
    strategy: str
    cached: bool = False


def _cache_key(session_id: str, limit: int) -> str:
    return f"recommend:{session_id}:{limit}"


async def _check_cache(session_id: str, limit: int) -> dict | None:
    try:
        redis = await get_redis()
        key = _cache_key(session_id, limit)
        cached = await redis.get(key)
        if cached:
            data = json.loads(cached)
            data["cached"] = True
            return data
    except Exception as e:
        logger.debug("Recommend cache check failed: %s", e)
    return None


async def _set_cache(session_id: str, limit: int, data: dict, ttl: int = 300):
    try:
        redis = await get_redis()
        key = _cache_key(session_id, limit)
        await redis.set(key, json.dumps(data, ensure_ascii=False), ex=ttl)
    except Exception as e:
        logger.debug("Recommend cache set failed: %s", e)


@router.get("", response_model=RecommendResponse)
async def get_recommendations(
    session_id: str = Query(..., description="游客会话ID"),
    limit: int = Query(5, ge=1, le=20, description="返回推荐数量"),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized scenic spot recommendations for a tourist.

    - Cold-start: returns popular spots if no profile exists.
    - Personalized: uses interests + visit history for content-based recall.
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="session_id is required")

    # 1. Check cache
    cached = await _check_cache(session_id, limit)
    if cached:
        return cached

    # 2. Generate recommendations
    try:
        result = await recommend(session_id, db, limit=limit)
    except Exception as e:
        logger.error("Recommendation engine failed: %s", e)
        raise HTTPException(status_code=503, detail="推荐服务暂时不可用，请稍后重试")

    # 3. Cache result
    await _set_cache(session_id, limit, result)
    result["cached"] = False
    return result


@router.post("/feedback", response_model=FeedbackResponse)
async def post_feedback(
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Record user feedback on a recommended spot."""
    if request.feedback not in ("like", "dislike"):
        raise HTTPException(status_code=400, detail="feedback must be 'like' or 'dislike'")

    result = await record_feedback(request.session_id, request.spot_name, request.feedback, db)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("detail", "记录反馈失败"))

    return FeedbackResponse(
        status="ok",
        session_id=request.session_id,
        spot_name=request.spot_name,
    )
