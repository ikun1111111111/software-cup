"""POI API endpoints for theme cards (food/shops/services)."""
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import POI

router = APIRouter(prefix="/api/pois", tags=["pois"])


class POIOut(BaseModel):
    id: int
    name: str
    category: str
    address: str | None
    latitude: float | None
    longitude: float | None
    phone: str | None
    business_hours: str | None
    price_level: str | None
    intro: str | None
    tags: list[str] | None
    source: str | None

    class Config:
        from_attributes = True


@router.get("", response_model=list[POIOut])
async def list_pois(
    category: str | None = Query(None),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float = Query(5000, ge=0, le=50000),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List POIs optionally filtered by category and proximity.

    Query params:
        category: food/shop/parking/transport/toilet
        lat/lng: center coordinates (WGS-84)
        radius: search radius in meters
        limit: max results
    """
    stmt = select(POI).where(POI.is_active == True)
    if category:
        stmt = stmt.where(POI.category == category)

    result = await db.execute(stmt)
    pois = result.scalars().all()

    items = []
    for p in pois:
        dist = None
        if lat is not None and lng is not None and p.latitude is not None and p.longitude is not None:
            dist = _haversine(lat, lng, p.latitude, p.longitude)
            if dist > radius:
                continue
        items.append((dist, p))

    items.sort(key=lambda x: (x[0] is None, x[0] or 0))
    return [POIOut.model_validate(p) for _, p in items[:limit]]


@router.get("/{poi_id}", response_model=POIOut)
async def get_poi(
    poi_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a POI by ID."""
    stmt = select(POI).where(POI.id == poi_id, POI.is_active == True)
    result = await db.execute(stmt)
    poi = result.scalar_one_or_none()
    if not poi:
        raise HTTPException(status_code=404, detail="POI未找到")
    return POIOut.model_validate(poi)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance in meters."""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
