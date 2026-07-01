"""数字人主动导览 API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Literal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import TourRoute, ScenicSpot

router = APIRouter(prefix="/api/tour", tags=["tour"])


# ============ 数据模型 ============

class Spot(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class Route(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    spots: List[Spot]
    duration: Optional[str] = None
    route_type: Optional[str] = None


class NarrationContent(BaseModel):
    spot: Spot
    text: str
    audioUrl: Optional[str] = None
    duration: Optional[int] = None


class TourProgress(BaseModel):
    total: int
    completed: int
    current: int


class TourPreferences(BaseModel):
    mode: Literal["tour", "free"] = "tour"
    autoNarrate: bool = True
    narrationSpeed: Literal["slow", "normal", "fast"] = "normal"
    dndMode: bool = False


# ============ 请求/响应模型 ============

class StartTourRequest(BaseModel):
    session_id: str
    route_id: str
    preferences: Optional[dict] = None


class StartTourResponse(BaseModel):
    tour_id: str
    route: Route
    first_spot: Spot
    narration: Optional[NarrationContent] = None
    next_spots: List[Spot] = []


class UpdateProgressRequest(BaseModel):
    tour_id: str
    current_spot_id: str
    completed: bool = True


class UpdateProgressResponse(BaseModel):
    next_spot: Optional[Spot] = None
    narration: Optional[NarrationContent] = None
    is_complete: bool = False


class TourStatusResponse(BaseModel):
    tour_id: str
    status: str
    current_spot: Optional[Spot] = None
    progress: TourProgress
    recommendations: List[Spot] = []


# ============ 内存存储（示例） ============

# 实际应使用数据库
_tour_sessions: dict = {}


# ============ 端点 ============

@router.post("/start", response_model=StartTourResponse)
async def start_tour(request: StartTourRequest, db: AsyncSession = Depends(get_db)):
    """开始导览，返回导览计划和第一个景点"""
    # 从数据库获取真实路线数据
    stmt = select(TourRoute).where(TourRoute.id == request.route_id, TourRoute.is_active == True)
    result = await db.execute(stmt)
    db_route = result.scalar_one_or_none()
    if not db_route:
        raise HTTPException(status_code=404, detail="路线未找到")

    # 批量查询景点详情（避免 N+1 查询）
    spot_stmt = select(ScenicSpot).where(
        ScenicSpot.id.in_(db_route.spot_order),
        ScenicSpot.is_active == True,
    )
    spot_result = await db.execute(spot_stmt)
    spot_map = {spot.id: spot for spot in spot_result.scalars().all()}

    spots = []
    for spot_id in db_route.spot_order:
        spot = spot_map.get(spot_id)
        if spot:
            spots.append(Spot(
                id=spot.id,
                name=spot.name,
                description=spot.overview,
                latitude=spot.latitude,
                longitude=spot.longitude,
            ))

    if not spots:
        raise HTTPException(status_code=404, detail="路线中没有有效景点")

    route = Route(
        id=db_route.id,
        name=db_route.name,
        description=db_route.description,
        spots=spots,
        duration=db_route.duration,
        route_type=db_route.route_type,
    )

    # 创建导览会话
    tour_id = f"tour_{request.session_id}_{request.route_id}"
    _tour_sessions[tour_id] = {
        "route": route,
        "current_spot_index": 0,
        "completed_spots": [],
        "preferences": request.preferences or {},
    }

    first_spot = route.spots[0]
    next_spots = route.spots[1:]

    return StartTourResponse(
        tour_id=tour_id,
        route=route,
        first_spot=first_spot,
        next_spots=next_spots,
    )


@router.post("/progress", response_model=UpdateProgressResponse)
async def update_progress(request: UpdateProgressRequest):
    """更新导览进度，返回下一个景点"""
    tour_id = request.tour_id
    
    if tour_id not in _tour_sessions:
        raise HTTPException(status_code=404, detail="导览会话不存在")

    session = _tour_sessions[tour_id]
    route = session["route"]
    
    # 更新进度
    if request.completed:
        session["completed_spots"].append(request.current_spot_id)
        session["current_spot_index"] += 1

    # 检查是否完成
    is_complete = session["current_spot_index"] >= len(route.spots)
    
    if is_complete:
        return UpdateProgressResponse(is_complete=True)

    # 获取下一个景点
    next_spot = route.spots[session["current_spot_index"]]
    
    # 生成讲解内容（示例）
    narration = NarrationContent(
        spot=next_spot,
        text=f"欢迎来到{next_spot.name}。{next_spot.description or '这里是灵山胜境的重要景点之一。'}",
        duration=180,
    )

    return UpdateProgressResponse(
        next_spot=next_spot,
        narration=narration,
        is_complete=False,
    )


@router.get("/{tour_id}/status", response_model=TourStatusResponse)
async def get_tour_status(tour_id: str):
    """获取导览状态"""
    if tour_id not in _tour_sessions:
        raise HTTPException(status_code=404, detail="导览会话不存在")

    session = _tour_sessions[tour_id]
    route = session["route"]
    current_index = session["current_spot_index"]
    
    current_spot = None
    if current_index < len(route.spots):
        current_spot = route.spots[current_index]

    progress = TourProgress(
        total=len(route.spots),
        completed=len(session["completed_spots"]),
        current=current_index + 1,
    )

    # 推荐下一个景点
    recommendations = []
    if current_index + 1 < len(route.spots):
        recommendations = [route.spots[current_index + 1]]

    return TourStatusResponse(
        tour_id=tour_id,
        status="in_progress",
        current_spot=current_spot,
        progress=progress,
        recommendations=recommendations,
    )


@router.post("/{tour_id}/pause")
async def pause_tour(tour_id: str):
    """暂停导览"""
    if tour_id not in _tour_sessions:
        raise HTTPException(status_code=404, detail="导览会话不存在")
    
    _tour_sessions[tour_id]["status"] = "paused"
    return {"message": "导览已暂停"}


@router.post("/{tour_id}/resume")
async def resume_tour(tour_id: str):
    """恢复导览"""
    if tour_id not in _tour_sessions:
        raise HTTPException(status_code=404, detail="导览会话不存在")
    
    _tour_sessions[tour_id]["status"] = "in_progress"
    return {"message": "导览已恢复"}


@router.post("/{tour_id}/end")
async def end_tour(tour_id: str):
    """结束导览"""
    if tour_id in _tour_sessions:
        del _tour_sessions[tour_id]
    return {"message": "导览已结束"}


# ============ GPS打卡相关 ============

class CheckinRequest(BaseModel):
    """GPS打卡请求"""
    session_id: str
    spot_id: str
    spot_name: str
    lat: float
    lng: float
    timestamp: Optional[int] = None


class CheckinResponse(BaseModel):
    """GPS打卡响应"""
    success: bool
    distance: float  # 距离(米)
    message: str
    spot_id: Optional[str] = None
    tour_progress: Optional[TourProgress] = None


@router.post("/checkin", response_model=CheckinResponse)
async def checkin_spot(request: CheckinRequest):
    """GPS打卡校验

    校验逻辑：
    1. 检查景点是否有GPS坐标
    2. 计算用户GPS与景点GPS的Haversine距离
    3. 距离 ≤ 30m 则打卡成功，否则返回距离提示
    """
    CHECKIN_RADIUS = 30  # 打卡有效半径(米)

    # 景点GPS坐标映射（从数据库获取）
    SPOT_COORDINATES = {
        "pu-ti-da-dao": {"lat": 31.4260, "lng": 120.0950},
        "fan-gong": {"lat": 31.4283, "lng": 120.0975},
        "wu-yin-tan-cheng": {"lat": 31.4266, "lng": 120.0970},
        "ling-shan-da-fo": {"lat": 31.4303, "lng": 120.0959},
        "jiu-long-guan-yu": {"lat": 31.4267, "lng": 120.0955},
        "xiang-fu-chan-si": {"lat": 31.4289, "lng": 120.0959},
        "fo-shou-guang-chang": {"lat": 31.4281, "lng": 120.0959},
        "bai-zi-xi-mi-le": {"lat": 31.4268, "lng": 120.0947},
        "man-fei-long-ta": {"lat": 31.4259, "lng": 120.1004},
        "ling-shan-jing-she": {"lat": 31.4288, "lng": 120.1000},
        "wu-ming-qiao": {"lat": 31.4246, "lng": 120.0952},
        "fo-zu-tan": {"lat": 31.4250, "lng": 120.0964},
        "wu-zhi-men": {"lat": 31.4255, "lng": 120.0954},
        "xiang-mo-fu-diao": {"lat": 31.4261, "lng": 120.0956},
        "a-yu-wang-zhu": {"lat": 31.4263, "lng": 120.0961},
        "san-sheng-dian": {"lat": 31.4259, "lng": 120.0942},
    }

    # 1. 获取景点坐标
    spot_coords = SPOT_COORDINATES.get(request.spot_id)
    if not spot_coords:
        # 景点无GPS坐标 → 允许打卡（手动模式）
        return CheckinResponse(
            success=True,
            distance=0,
            message=f"{request.spot_name}无GPS坐标，打卡成功（手动模式）",
            spot_id=request.spot_id,
        )

    # 2. Haversine距离计算
    import math
    R = 6371e3  # 地球半径(米)
    lat1_rad = math.radians(request.lat)
    lat2_rad = math.radians(spot_coords["lat"])
    dlat = math.radians(spot_coords["lat"] - request.lat)
    dlng = math.radians(spot_coords["lng"] - request.lng)

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c

    # 3. 半径校验
    if distance <= CHECKIN_RADIUS:
        # 打卡成功 → 更新进度
        # 查找匹配的tour_id（格式: tour_{session_id}_{route_id}）
        tour_id = None
        session = None
        for tid, s in _tour_sessions.items():
            if tid.startswith(f"tour_{request.session_id}_"):
                tour_id = tid
                session = s
                break

        progress = None
        if tour_id and session:
            route = session["route"]
            spot_idx = next((i for i, s in enumerate(route.spots) if s.id == request.spot_id), -1)
            if spot_idx >= 0:
                if request.spot_id not in session["completed_spots"]:
                    session["completed_spots"].append(request.spot_id)
                    session["current_spot_index"] = spot_idx + 1

                progress = TourProgress(
                    total=len(route.spots),
                    completed=len(session["completed_spots"]),
                    current=min(session["current_spot_index"] + 1, len(route.spots)),
                )

        return CheckinResponse(
            success=True,
            distance=round(distance, 1),
            message=f"打卡成功！您距离{request.spot_name}约{round(distance)}米",
            spot_id=request.spot_id,
            tour_progress=progress,
        )
    else:
        return CheckinResponse(
            success=False,
            distance=round(distance, 1),
            message=f"您距离{request.spot_name}还有{round(distance)}米，请靠近后再打卡（有效范围{CHECKIN_RADIUS}米内）",
        )


@router.get("/progress/{session_id}")
async def get_session_progress(session_id: str):
    """查询导览进度"""
    # 查找匹配的tour_id（格式: tour_{session_id}_{route_id}）
    tour_id = None
    session = None
    for tid, s in _tour_sessions.items():
        if tid.startswith(f"tour_{session_id}_"):
            tour_id = tid
            session = s
            break

    if not tour_id or not session:
        raise HTTPException(status_code=404, detail="导览会话不存在")

    route = session["route"]
    current_index = session["current_spot_index"]

    current_spot = None
    if current_index < len(route.spots):
        current_spot = route.spots[current_index]

    progress = TourProgress(
        total=len(route.spots),
        completed=len(session["completed_spots"]),
        current=current_index + 1,
    )

    return {
        "tour_id": tour_id,
        "status": session.get("status", "in_progress"),
        "current_spot": current_spot,
        "progress": progress,
        "route_name": route.name,
    }
