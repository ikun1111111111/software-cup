"""Scenic spots API endpoints."""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.models.tourist import ScenicSpot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/spots", tags=["spots"])


class SpotOut(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str] | None
    overview: str
    qr_code: str | None
    latitude: float | None = None
    longitude: float | None = None

    class Config:
        from_attributes = True


class SpotDetail(SpotOut):
    detail: str
    related_spots: list[str] | None


class SpotGuide(BaseModel):
    """景点讲解内容"""
    id: str
    name: str
    guide_content: str
    audio_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@router.get("", response_model=list[SpotOut])
async def list_spots(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all scenic spots, optionally filtered by category."""
    cache_key = f"spots:list:{category or 'all'}"
    try:
        redis = await get_redis()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    stmt = select(ScenicSpot).where(ScenicSpot.is_active == True)
    if category:
        stmt = stmt.where(ScenicSpot.category == category)
    stmt = stmt.order_by(ScenicSpot.name)
    result = await db.execute(stmt)
    spots = result.scalars().all()
    data = [SpotOut.model_validate(s) for s in spots]

    try:
        redis = await get_redis()
        await redis.setex(cache_key, 300, json.dumps([s.model_dump() for s in data], ensure_ascii=False, default=str))
    except Exception:
        pass

    return data


@router.get("/{spot_id}", response_model=SpotDetail)
async def get_spot(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a scenic spot by ID (with Redis cache)."""
    # Try Redis cache first
    try:
        redis = await get_redis()
        cached = await redis.get(f"spot:{spot_id}")
        if cached:
            return SpotDetail(**json.loads(cached))
    except Exception as e:
        logger.warning("Redis cache miss for spot %s: %s", spot_id, e)

    # Cache miss — query DB
    stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="景点未找到")

    data = SpotDetail.model_validate(spot)

    # Write to Redis cache (10 minutes TTL)
    try:
        redis = await get_redis()
        await redis.setex(
            f"spot:{spot_id}",
            600,
            json.dumps(data.model_dump(), ensure_ascii=False, default=str),
        )
    except Exception as e:
        logger.warning("Failed to cache spot %s: %s", spot_id, e)

    return data


@router.get("/{spot_id}/guide", response_model=SpotGuide)
async def get_spot_guide(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """获取景点讲解内容（用于GPS定点讲解）"""
    # Try Redis cache first
    try:
        redis = await get_redis()
        cached = await redis.get(f"spot_guide:{spot_id}")
        if cached:
            return SpotGuide(**json.loads(cached))
    except Exception as e:
        logger.warning("Redis cache miss for spot guide %s: %s", spot_id, e)

    stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()

    if not spot:
        raise HTTPException(status_code=404, detail="景点未找到")

    # 使用 detail 作为讲解内容（如果有 detail 则使用 detail）
    guide_content = spot.detail or spot.overview or f"欢迎来到{spot.name}"

    # TODO: 如果有音频文件，生成 audio_url
    audio_url = None  # 可以后续实现音频生成

    data = SpotGuide(
        id=spot.id,
        name=spot.name,
        guide_content=guide_content,
        audio_url=audio_url,
        latitude=spot.latitude,
        longitude=spot.longitude,
    )

    # Write to Redis cache (10 minutes TTL)
    try:
        redis = await get_redis()
        await redis.setex(
            f"spot_guide:{spot_id}",
            600,
            json.dumps(data.model_dump(), ensure_ascii=False, default=str),
        )
    except Exception as e:
        logger.warning("Failed to cache spot guide %s: %s", spot_id, e)

    return data
