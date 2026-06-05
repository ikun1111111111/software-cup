"""Scenic spots API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import ScenicSpot

router = APIRouter(prefix="/api/spots", tags=["spots"])


class SpotOut(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str] | None
    overview: str
    qr_code: str | None

    class Config:
        from_attributes = True


class SpotDetail(SpotOut):
    detail: str
    related_spots: list[str] | None


@router.get("", response_model=list[SpotOut])
async def list_spots(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all scenic spots, optionally filtered by category."""
    stmt = select(ScenicSpot).where(ScenicSpot.is_active == True)
    if category:
        stmt = stmt.where(ScenicSpot.category == category)
    stmt = stmt.order_by(ScenicSpot.name)
    result = await db.execute(stmt)
    spots = result.scalars().all()
    return [SpotOut.model_validate(s) for s in spots]


@router.get("/{spot_id}", response_model=SpotDetail)
async def get_spot(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a scenic spot by ID."""
    stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="景点未找到")
    return SpotDetail.model_validate(spot)
