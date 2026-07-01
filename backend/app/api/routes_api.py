"""Tour routes API endpoints."""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.models.tourist import TourRoute, ScenicSpot
from app.services.route_planner import plan_routes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/routes", tags=["routes"])


class SpotBrief(BaseModel):
    id: str
    name: str


class RouteOut(BaseModel):
    id: str
    name: str
    route_type: str
    duration: str
    description: str
    gradient: str | None
    spot_names: list[SpotBrief] = []

    class Config:
        from_attributes = True


class RouteDetail(RouteOut):
    spot_order: list[str]
    spot_names: list[SpotBrief]
    spot_details: dict | None


@router.get("", response_model=list[RouteOut])
async def list_routes(
    route_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all tour routes, optionally filtered by type."""
    cache_key = f"routes:list:{route_type or 'all'}"
    try:
        redis = await get_redis()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    try:
        stmt = select(TourRoute).where(TourRoute.is_active == True)
        if route_type:
            stmt = stmt.where(TourRoute.route_type == route_type)
        result = await db.execute(stmt)
        routes = result.scalars().all()
        data = [RouteOut.model_validate(r) for r in routes]

        try:
            redis = await get_redis()
            await redis.setex(cache_key, 300, json.dumps([r.model_dump() for r in data], ensure_ascii=False, default=str))
        except Exception:
            pass

        return data
    except Exception as e:
        logger.warning("Failed to query routes: %s, returning empty list", e)
        return []


@router.get("/{route_id}", response_model=RouteDetail)
async def get_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a tour route by ID with spot names."""
    stmt = select(TourRoute).where(TourRoute.id == route_id)
    result = await db.execute(stmt)
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="路线未找到")

    # 批量查询景点名称
    spot_names = []
    if route.spot_order:
        spot_stmt = select(ScenicSpot.id, ScenicSpot.name).where(
            ScenicSpot.id.in_(route.spot_order),
            ScenicSpot.is_active == True,
        )
        spot_result = await db.execute(spot_stmt)
        spot_map = {row.id: row.name for row in spot_result.all()}
        spot_names = [
            SpotBrief(id=sid, name=spot_map.get(sid, sid))
            for sid in route.spot_order
        ]

    return RouteDetail(
        id=route.id,
        name=route.name,
        route_type=route.route_type,
        duration=route.duration,
        description=route.description or "",
        gradient=route.gradient,
        spot_order=route.spot_order or [],
        spot_names=spot_names,
        spot_details=route.spot_details,
    )


class SmartRouteRequest(BaseModel):
    preferred_tags: list[str] | None = None
    time_budget_hours: float | None = None


@router.post("/recommend")
async def recommend_routes(req: SmartRouteRequest):
    """智能路线推荐：根据偏好和时间预算生成3条差异化路线。"""
    try:
        routes = await plan_routes(
            preferred_tags=req.preferred_tags,
            time_budget_hours=req.time_budget_hours,
        )
        return {"routes": routes}
    except Exception as e:
        logger.error("Route planning failed: %s", e)
        raise HTTPException(status_code=500, detail="路线规划失败")
