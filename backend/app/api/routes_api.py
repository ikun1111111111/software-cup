"""Tour routes API endpoints."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import TourRoute

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/routes", tags=["routes"])


class RouteOut(BaseModel):
    id: str
    name: str
    route_type: str
    duration: str
    description: str
    gradient: str | None

    class Config:
        from_attributes = True


class RouteDetail(RouteOut):
    spot_order: list[str]
    spot_details: dict | None


@router.get("", response_model=list[RouteOut])
async def list_routes(
    route_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all tour routes, optionally filtered by type."""
    try:
        stmt = select(TourRoute).where(TourRoute.is_active == True)
        if route_type:
            stmt = stmt.where(TourRoute.route_type == route_type)
        result = await db.execute(stmt)
        routes = result.scalars().all()
        return [RouteOut.model_validate(r) for r in routes]
    except Exception as e:
        logger.warning("Failed to query routes: %s, returning empty list", e)
        return []


@router.get("/{route_id}", response_model=RouteDetail)
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a tour route by ID."""
    stmt = select(TourRoute).where(TourRoute.id == route_id)
    result = await db.execute(stmt)
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="路线未找到")
    return RouteDetail.model_validate(route)
