"""Recommendation API endpoints."""
import json
import logging
from hashlib import md5
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.recommender import recommend, record_feedback
from app.models.tourist import TouristProfile
from app.services.dna_clustering import compute_dna_profile
from app.services.collaborative_filter import collaborative_filter_recommend

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


def _dna_cache_key(session_id: str, limit: int) -> str:
    return f"recommend:dna:{session_id}:{limit}"


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


# ── DNA Recommendation ───────────────────────────────────────────────────────


class DNAProfileResponse(BaseModel):
    session_id: str
    dna_type: str
    dna_scores: dict[str, float]


class DNARecommendItem(BaseModel):
    rank: int
    spot_name: str
    category: str
    reason: str
    suggested_duration: str
    tags: list[str]
    source: str
    dna_similarity: float | None = None


class DNARecommendResponse(BaseModel):
    session_id: str
    dna_type: str
    dna_scores: dict[str, float]
    recommendations: list[DNARecommendItem]
    cf_attractions: list[dict[str, Any]]
    strategy: str


@router.get("/dna/profile", response_model=DNAProfileResponse)
async def get_dna_profile(
    session_id: str = Query(..., description="游客会话ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get (or compute) the tourist's DNA profile."""
    stmt = select(TouristProfile).where(TouristProfile.session_id == session_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="游客画像不存在")

    if not profile.dna_type:
        dna = await compute_dna_profile(session_id, db)
        profile.dna_type = dna["dna_type"]
        profile.dna_scores = dna["dna_scores"]
        await db.commit()

    return DNAProfileResponse(
        session_id=session_id,
        dna_type=profile.dna_type or "未分类",
        dna_scores=profile.dna_scores or {},
    )


@router.get("/dna", response_model=DNARecommendResponse)
async def get_dna_recommendations(
    session_id: str = Query(..., description="游客会话ID"),
    limit: int = Query(5, ge=1, le=20, description="返回推荐数量"),
    db: AsyncSession = Depends(get_db),
):
    """Get DNA-based personalized recommendations.

    Combines collaborative filtering with content-based recommendations
    and enriches with DNA similarity scores.
    """
    # 0. Check cache
    try:
        redis = await get_redis()
        cache_key = _dna_cache_key(session_id, limit)
        cached = await redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            data["cached"] = True
            return DNARecommendResponse(**data)
    except Exception as e:
        logger.debug("DNA recommend cache check failed: %s", e)

    # 1. Ensure profile exists
    stmt = select(TouristProfile).where(TouristProfile.session_id == session_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="游客画像不存在")

    # 2. Compute DNA if missing
    if not profile.dna_type:
        dna = await compute_dna_profile(session_id, db)
        profile.dna_type = dna["dna_type"]
        profile.dna_scores = dna["dna_scores"]
        await db.commit()

    # 3. Content-based recommendations
    cb_result = await recommend(session_id, db, limit=limit)
    cb_recs = cb_result.get("recommendations", [])

    # 4. Collaborative filtering recommendations
    cf_recs = await collaborative_filter_recommend(session_id, db, limit=limit)

    # 5. Merge CF attractions into CB recommendations as enrichment
    cf_attraction_names = {r["attraction"] for r in cf_recs}
    for rec in cb_recs:
        if rec["spot_name"] in cf_attraction_names:
            rec["source"] = "hybrid"
            rec["dna_similarity"] = 0.85

    # 6. Add rank
    for i, r in enumerate(cb_recs, start=1):
        r["rank"] = i

    response = DNARecommendResponse(
        session_id=session_id,
        dna_type=profile.dna_type or "未分类",
        dna_scores=profile.dna_scores or {},
        recommendations=cb_recs,
        cf_attractions=cf_recs,
        strategy="dna_hybrid",
    )

    # 7. Cache result
    try:
        redis = await get_redis()
        cache_key = _dna_cache_key(session_id, limit)
        await redis.set(
            cache_key,
            json.dumps(response.model_dump(), ensure_ascii=False),
            ex=300,
        )
    except Exception as e:
        logger.debug("DNA recommend cache set failed: %s", e)

    return response
