"""Scenic spots API endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import ScenicSpot
from app.services.scenic_fallback import get_demo_spot, list_demo_spots

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/spots", tags=["spots"])


class SpotOut(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str] | None
    overview: str
    qr_code: str | None
    thumbnail: str | None
    duration: str | None
    display_x: float | None
    display_y: float | None
    latitude: float | None
    longitude: float | None
    qa_json: list[dict] | None

    class Config:
        from_attributes = True


class SpotDetail(SpotOut):
    detail: str
    related_spots: list[str] | None
    detail_images: list[str] | None
    story_acts: list[dict] | None
    qa_json: list[dict] | None


@router.get("", response_model=list[SpotOut])
async def list_spots(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all scenic spots, optionally filtered by category."""
    try:
        stmt = select(ScenicSpot).where(ScenicSpot.is_active == True)
        if category:
            stmt = stmt.where(ScenicSpot.category == category)
        stmt = stmt.order_by(ScenicSpot.name)
        result = await db.execute(stmt)
        spots = result.scalars().all()
        return [SpotOut.model_validate(s) for s in spots]
    except Exception as exc:
        logger.warning("Failed to query spots: %s, returning demo data", exc)
        return [SpotOut.model_validate(s) for s in list_demo_spots(category)]


@router.get("/{spot_id}", response_model=SpotDetail)
async def get_spot(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a scenic spot by ID."""
    try:
        stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
        result = await db.execute(stmt)
        spot = result.scalar_one_or_none()
        if spot:
            return SpotDetail.model_validate(spot)
    except Exception as exc:
        logger.warning("Failed to query spot %s: %s, trying demo data", spot_id, exc)

    demo_spot = get_demo_spot(spot_id)
    if not demo_spot:
        raise HTTPException(status_code=404, detail="景点未找到")
    return SpotDetail.model_validate(demo_spot)


@router.get("/{spot_id}/card")
async def get_spot_card(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return structured card data for a scenic spot (for theme cards)."""
    stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="景点未找到")

    return {
        "type": "spot_info",
        "spot_id": spot.id,
        "name": spot.name,
        "category": spot.category,
        "overview": spot.overview,
        "detail": spot.detail,
        "tags": spot.tags or [],
        "latitude": spot.latitude,
        "longitude": spot.longitude,
        "ticket_info": spot.ticket_info,
        "open_time": spot.open_time,
        "must_see": spot.must_see,
        "best_time": spot.best_time,
        "narration": spot.narration,
        "thumbnail": spot.thumbnail,
        "duration": spot.duration,
    }
