"""Tour routes API endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import ScenicSpot, TourRoute
from app.services.scenic_fallback import get_demo_route, get_demo_spot, list_demo_routes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/routes", tags=["routes"])


class RouteOut(BaseModel):
    id: str
    name: str
    route_type: str
    duration: str
    description: str
    gradient: str | None
    cover_image: str | None
    color: str | None
    brush_image: str | None
    opening_text: str | None
    closing_text: str | None
    spot_order: list[str]

    class Config:
        from_attributes = True


class SpotBrief(BaseModel):
    id: str
    name: str


class RouteDetail(RouteOut):
    spot_names: list[SpotBrief]
    spot_details: dict | None
    is_active: bool


async def _load_route_spot_names(db: AsyncSession, spot_order: list[str]) -> list[SpotBrief]:
    if not spot_order:
        return []
    result = await db.execute(
        select(ScenicSpot.id, ScenicSpot.name).where(ScenicSpot.id.in_(spot_order))
    )
    spot_name_map = {spot_id: name for spot_id, name in result.all()}
    return [
        SpotBrief(id=spot_id, name=spot_name_map[spot_id])
        for spot_id in spot_order
        if spot_id in spot_name_map
    ]


def _load_demo_route_spot_names(spot_order: list[str]) -> list[SpotBrief]:
    return [
        SpotBrief(id=spot_id, name=spot["name"])
        for spot_id in spot_order
        if (spot := get_demo_spot(spot_id))
    ]


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
        return [RouteOut.model_validate(route) for route in routes]
    except Exception as exc:
        logger.warning("Failed to query routes: %s, returning demo data", exc)
        return [RouteOut.model_validate(route) for route in list_demo_routes(route_type)]


@router.get("/{route_id}", response_model=RouteDetail)
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a tour route by ID."""
    try:
        stmt = select(TourRoute).where(TourRoute.id == route_id)
        result = await db.execute(stmt)
        route = result.scalar_one_or_none()
        if route:
            route_data = RouteOut.model_validate(route).model_dump()
            return RouteDetail(
                **route_data,
                spot_names=await _load_route_spot_names(db, route.spot_order or []),
                spot_details=route.spot_details,
                is_active=route.is_active,
            )
    except Exception as exc:
        logger.warning("Failed to query route %s: %s, trying demo data", route_id, exc)

    demo_route = get_demo_route(route_id)
    if not demo_route:
        raise HTTPException(status_code=404, detail="路线未找到")

    route_data = RouteOut.model_validate(demo_route).model_dump()
    return RouteDetail(
        **route_data,
        spot_names=_load_demo_route_spot_names(demo_route.get("spot_order", [])),
        spot_details=demo_route.get("spot_details"),
        is_active=demo_route.get("is_active", True),
    )
