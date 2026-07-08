from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user_optional
from app.models.tour_session import TourSession
from app.models.tourist import ScenicSpot, TourRoute
from app.models.user import User


router = APIRouter(prefix="/api/tour", tags=["tour"])


class StartTourRequest(BaseModel):
    session_id: str
    route_id: str
    preferences: dict | None = None


class UpdateProgressRequest(BaseModel):
    tour_id: str
    current_spot_id: str
    completed: bool = True


class CheckinRequest(BaseModel):
    session_id: str
    spot_id: str
    spot_name: str
    lat: float
    lng: float
    timestamp: int | None = None


def _spot_to_mobile(spot: ScenicSpot) -> dict:
    return {
        "id": spot.id,
        "name": spot.name,
        "description": spot.overview or spot.detail or "",
        "image": spot.thumbnail,
        "latitude": spot.latitude,
        "longitude": spot.longitude,
    }


def _route_to_mobile(route: TourRoute, spots: list[dict]) -> dict:
    return {
        "id": route.id,
        "name": route.name,
        "description": route.description,
        "spots": spots,
        "duration": route.duration,
        "route_type": route.route_type,
    }


async def _load_route_and_spots(db: AsyncSession, route_id: str) -> tuple[TourRoute, list[dict]]:
    route_result = await db.execute(
        select(TourRoute).where(TourRoute.id == route_id, TourRoute.is_active == True)
    )
    route = route_result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="路线未找到")

    spot_order = route.spot_order or []
    if not spot_order:
        raise HTTPException(status_code=404, detail="路线中没有有效景点")

    spot_result = await db.execute(
        select(ScenicSpot).where(ScenicSpot.id.in_(spot_order), ScenicSpot.is_active == True)
    )
    spot_map = {spot.id: spot for spot in spot_result.scalars().all()}
    spots = [_spot_to_mobile(spot_map[spot_id]) for spot_id in spot_order if spot_id in spot_map]
    if not spots:
        raise HTTPException(status_code=404, detail="路线中没有有效景点")
    return route, spots


def _progress_payload(session: TourSession, spots: list[dict]) -> dict:
    completed = session.completed_spots or []
    current_index = 0
    if session.current_spot_id:
        current_index = next((idx for idx, spot in enumerate(spots) if spot["id"] == session.current_spot_id), 0)
    current_index = min(current_index, max(len(spots) - 1, 0))
    return {
        "total": len(spots),
        "completed": len(completed),
        "current": current_index + 1,
    }


@router.post("/start")
async def start_tour(
    request: StartTourRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    route, spots = await _load_route_and_spots(db, request.route_id)

    tour_id = f"tour_{request.session_id}_{request.route_id}_{uuid4().hex[:8]}"
    first_spot = spots[0]
    tour_session = TourSession(
        id=tour_id,
        session_id=request.session_id,
        user_id=user.id if user else None,
        route_id=route.id,
        route_name=route.name,
        status="in_progress",
        current_spot_id=first_spot["id"],
        completed_spots=[],
        preferences_json=request.preferences or {},
    )
    db.add(tour_session)
    await db.commit()

    return {
        "tour_id": tour_id,
        "route": _route_to_mobile(route, spots),
        "first_spot": first_spot,
        "narration": {
            "spot": first_spot,
            "text": first_spot.get("description") or f"欢迎来到{first_spot['name']}。",
            "audioUrl": None,
            "duration": None,
        },
        "next_spots": spots[1:],
    }


@router.post("/progress")
async def update_progress(request: UpdateProgressRequest, db: AsyncSession = Depends(get_db)):
    session = await db.get(TourSession, request.tour_id)
    if not session:
        raise HTTPException(status_code=404, detail="导览会话不存在")

    route, spots = await _load_route_and_spots(db, session.route_id)
    spot_ids = [spot["id"] for spot in spots]
    current_index = spot_ids.index(request.current_spot_id) if request.current_spot_id in spot_ids else 0

    completed_spots = list(session.completed_spots or [])
    if request.completed and request.current_spot_id not in completed_spots:
        completed_spots.append(request.current_spot_id)

    next_index = current_index + 1
    is_complete = next_index >= len(spots)
    session.completed_spots = completed_spots
    session.current_spot_id = None if is_complete else spots[next_index]["id"]
    session.status = "completed" if is_complete else "in_progress"
    session.updated_at = datetime.utcnow()
    if is_complete:
        session.ended_at = datetime.utcnow()

    await db.commit()

    return {
        "next_spot": None if is_complete else spots[next_index],
        "is_complete": is_complete,
    }


@router.get("/progress/{session_id}")
async def get_session_progress(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TourSession)
        .where(TourSession.session_id == session_id)
        .order_by(desc(TourSession.updated_at))
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="导览会话不存在")

    _, spots = await _load_route_and_spots(db, session.route_id)
    current_spot = next((spot for spot in spots if spot["id"] == session.current_spot_id), None)
    return {
        "tour_id": session.id,
        "status": session.status,
        "current_spot": current_spot,
        "progress": _progress_payload(session, spots),
        "route_name": session.route_name or "",
    }


@router.post("/{tour_id}/pause")
async def pause_tour(tour_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(TourSession, tour_id)
    if not session:
        raise HTTPException(status_code=404, detail="导览会话不存在")
    session.status = "paused"
    session.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "导览已暂停"}


@router.post("/{tour_id}/resume")
async def resume_tour(tour_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(TourSession, tour_id)
    if not session:
        raise HTTPException(status_code=404, detail="导览会话不存在")
    session.status = "in_progress"
    session.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "导览已恢复"}


@router.post("/{tour_id}/end")
async def end_tour(tour_id: str, db: AsyncSession = Depends(get_db)):
    session = await db.get(TourSession, tour_id)
    if not session:
        return {"message": "导览已结束"}
    session.status = "ended"
    session.ended_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "导览已结束"}


@router.post("/checkin")
async def checkin_spot(request: CheckinRequest):
    return {
        "success": True,
        "distance": 0,
        "message": f"{request.spot_name}打卡成功",
        "spot_id": request.spot_id,
        "tour_progress": None,
    }
