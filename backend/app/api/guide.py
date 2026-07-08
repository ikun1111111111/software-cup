"""数字人智能向导 API：SSE 流、状态管理、偏好设置。"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import ScenicSpot, TourRoute
from app.services.guide_service import GuideService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/guide", tags=["guide"])


class GuideStreamRequest(BaseModel):
    session_id: str
    action: str = Field(
        default="init",
        description="init | dismiss_prompt | accept_prompt | start_narrate | end_narrate | "
                    "ask_question | set_preferences | heartbeat",
    )
    payload: dict = Field(default_factory=dict)


class UpdatePreferencesRequest(BaseModel):
    enable_nearby_prompt: Optional[bool] = None
    enable_idle_prompt: Optional[bool] = None
    enable_detour_prompt: Optional[bool] = None
    prompt_frequency: Optional[str] = None
    auto_narrate: Optional[bool] = None
    narration_speed: Optional[str] = None
    dnd_mode: Optional[bool] = None
    preferred_role: Optional[str] = None
    preferred_route_type: Optional[str] = None


def _event(name: str, data: Any) -> str:
    return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _load_spots(db: AsyncSession) -> list[dict]:
    """加载所有有效景点。"""
    try:
        stmt = select(ScenicSpot).where(ScenicSpot.is_active == True)
        result = await db.execute(stmt)
        spots = result.scalars().all()
        return [
            {
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "tags": s.tags or [],
                "overview": s.overview,
                "detail": s.detail,
                "latitude": s.latitude,
                "longitude": s.longitude,
            }
            for s in spots
        ]
    except Exception as e:
        logger.warning("Failed to load spots for guide: %s", e)
        return []


async def _load_routes(db: AsyncSession) -> list[dict]:
    """加载所有有效路线。"""
    try:
        stmt = select(TourRoute).where(TourRoute.is_active == True)
        result = await db.execute(stmt)
        routes = result.scalars().all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "route_type": r.route_type,
                "duration": r.duration,
                "description": r.description,
                "gradient": r.gradient,
                "spot_order": r.spot_order,
            }
            for r in routes
        ]
    except Exception as e:
        logger.warning("Failed to load routes for guide: %s", e)
        return []


async def _find_route_by_type(route_type: str, routes: list[dict]) -> Optional[dict]:
    for r in routes:
        if r["route_type"] == route_type:
            return r
    return routes[0] if routes else None


async def _handle_action(
    session_id: str,
    action: str,
    payload: dict,
    spots: list[dict],
    routes: list[dict],
) -> list[dict]:
    """处理一次客户端动作，返回应发送的 SSE 事件列表。"""
    events: list[dict] = []
    state = await GuideService.get_state(session_id)
    prefs = await GuideService.get_preferences(session_id)

    if action == "init":
        # 发送当前状态和欢迎语
        events.append({
            "type": "state_change",
            "from": "none",
            "to": state["status"],
        })
        events.append({
            "type": "welcome",
            "message": f"欢迎来到灵山胜境！我是您的数字导览员{prefs.get('preferred_role', '小灵')}。",
            "quick_questions": ["推荐一条游玩路线", "灵山大佛有多高？", "景区门票多少钱？"],
        })
        # 如果用户偏好自动讲解且当前在景点附近，直接触发
        context = payload.get("context", {})
        prompt = await GuideService.check_prompts(session_id, context, spots)
        if prompt:
            state = await GuideService.update_state(session_id, status="prompting")
            events.append(prompt)
            events.append({"type": "state_change", "from": "idle", "to": "prompting"})
        return events

    if action == "heartbeat":
        # 仅做策略检测，不强制改变状态
        context = payload.get("context", {})
        if state["status"] in ("idle", "free"):
            prompt = await GuideService.check_prompts(session_id, context, spots)
            if prompt:
                await GuideService.update_state(session_id, status="prompting")
                events.append(prompt)
                events.append({"type": "state_change", "from": state["status"], "to": "prompting"})
        return events

    if action == "dismiss_prompt":
        prompt_type = state.get("last_prompt_type") or payload.get("prompt_type", "nearby")
        spot_id = payload.get("spot_id")
        await GuideService.record_rejection(session_id, prompt_type, spot_id)
        new_state = await GuideService.update_state(session_id, status="idle", current_spot=None)
        events.append({"type": "state_change", "from": state["status"], "to": new_state["status"]})
        return events

    if action == "accept_prompt":
        prompt_type = state.get("last_prompt_type") or payload.get("prompt_type", "nearby")
        if prompt_type == "nearby":
            spot = state.get("current_spot") or payload.get("spot")
            if spot:
                await GuideService.update_state(session_id, status="narrating", current_spot=spot)
                narration = await GuideService.build_narration(spot, prefs.get("preferred_role", "小灵"))
                await GuideService.mark_narrated_today(session_id, spot["id"])
                events.append({
                    "type": "start_narrate",
                    "spot": spot,
                    "content": {"text": narration},
                })
                events.append({"type": "state_change", "from": state["status"], "to": "narrating"})
        elif prompt_type == "idle":
            route_type = prefs.get("preferred_route_type", "经典全景")
            route = await _find_route_by_type(route_type, routes)
            if not route:
                route = await GuideService.generate_route_suggestion(spots, route_type, routes)
            await GuideService.update_state(session_id, status="free", current_route=route)
            events.append({
                "type": "suggest_route",
                "route": route,
                "reason": f"根据您的{prefs.get('preferred_route_type', '偏好')}推荐",
            })
            events.append({"type": "state_change", "from": state["status"], "to": "free"})
        elif prompt_type == "detour":
            route_type = prefs.get("preferred_route_type", "经典全景")
            route = await _find_route_by_type(route_type, routes)
            if not route:
                route = await GuideService.generate_route_suggestion(spots, route_type, routes)
            await GuideService.update_state(session_id, status="free", current_route=route)
            events.append({
                "type": "suggest_route",
                "route": route,
                "reason": "已根据您当前位置重新规划路线",
            })
            events.append({"type": "state_change", "from": state["status"], "to": "free"})
        return events

    if action == "start_narrate":
        spot_id = payload.get("spot_id")
        spot = next((s for s in spots if s["id"] == spot_id), None)
        if spot:
            await GuideService.update_state(session_id, status="narrating", current_spot=spot)
            narration = await GuideService.build_narration(spot, prefs.get("preferred_role", "小灵"))
            await GuideService.mark_narrated_today(session_id, spot["id"])
            events.append({
                "type": "start_narrate",
                "spot": spot,
                "content": {"text": narration},
            })
            events.append({"type": "state_change", "from": state["status"], "to": "narrating"})
        else:
            events.append({"type": "error", "message": "未找到对应景点"})
        return events

    if action == "end_narrate":
        new_state = await GuideService.update_state(session_id, status="free", current_spot=None)
        events.append({"type": "end_narrate"})
        events.append({"type": "state_change", "from": state["status"], "to": new_state["status"]})
        return events

    if action == "ask_question":
        question = payload.get("question", "").strip()
        if not question:
            events.append({"type": "error", "message": "问题不能为空"})
            return events
        await GuideService.update_state(session_id, status="chatting")
        # 简单 FAQ 映射，无需 LLM 依赖
        answer = _answer_question(question, spots, prefs.get("preferred_role", "小灵"))
        events.append({
            "type": "chat_reply",
            "question": question,
            "answer": answer,
        })
        # 回答完毕后保持 chatting，由前端决定是否结束
        return events

    if action == "set_preferences":
        updates = payload.get("preferences", {})
        new_prefs = await GuideService.update_preferences(session_id, updates)
        events.append({"type": "preferences_updated", "preferences": new_prefs})
        return events

    # 未知 action
    events.append({"type": "error", "message": f"未知动作: {action}"})
    return events


def _answer_question(question: str, spots: list[dict], role: str = "小灵") -> str:
    """轻量级问答，无需调用 LLM。"""
    q = question.lower()
    if "多高" in q or "高度" in q or "88" in q:
        return "灵山大佛高88米，是世界上最高的青铜释迦牟尼立像。"
    if "门票" in q or "多少钱" in q or "票价" in q:
        return "灵山胜境门票价格请以官方渠道为准，建议提前在小程序或携程等平台购买。"
    if "路线" in q or "怎么走" in q or "推荐" in q:
        return "我们有三条精选路线：历史文化爱好者路线、自然风光爱好者路线、亲子家庭路线。您也可以告诉我您的偏好，我帮您定制。"
    if "时间" in q or "几点" in q or "开放" in q:
        return "景区一般早上7:00开放，下午17:00-17:30闭园，具体以季节和官方公告为准。"
    if "演出" in q or "表演" in q or "九龙灌浴" in q:
        return "九龙灌浴是灵山胜境的经典演出，演示太子出生的场景，建议提前查看当日演出时间表。"
    # 景点匹配
    for spot in spots:
        if spot["name"] in question:
            return f"{spot['name']}：{spot.get('overview', '是一处很有特色的景点')}。"
    return f"我是{role}，这个问题我暂时无法回答太详细，您可以在聊天窗口中继续追问。"


@router.post("/stream")
async def guide_stream(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """数字人向导 SSE 流。

    客户端通过 action + payload 与向导交互，服务端推送事件：
        - welcome / state_change / prompt_nearby / prompt_idle / prompt_detour
        - suggest_route / start_narrate / end_narrate / chat_reply
        - preferences_updated / error
    """
    try:
        body_json = await request.json()
        req = GuideStreamRequest(**body_json)
    except Exception as e:
        logger.error("Failed to parse guide stream request: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")

    spots = await _load_spots(db)
    routes = await _load_routes(db)

    async def event_generator():
        try:
            events = await _handle_action(req.session_id, req.action, req.payload, spots, routes)
            for ev in events:
                yield _event(ev.get("type", "message"), ev)

            # 如果心跳或初始化后无事件，发送一次状态同步
            if not events:
                state = await GuideService.get_state(req.session_id)
                yield _event("state_sync", state)
        except Exception as e:
            logger.error("Guide stream handler failed: %s", e)
            yield _event("error", {"message": "向导处理出错，请稍后重试"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/state")
async def get_guide_state(
    session_id: str = Query(..., description="会话 ID"),
):
    """获取当前向导状态。"""
    state = await GuideService.get_state(session_id)
    prefs = await GuideService.get_preferences(session_id)
    return {
        "status": state.get("status", "idle"),
        "current_spot": state.get("current_spot"),
        "current_route": state.get("current_route"),
        "preferences": prefs,
    }


@router.get("/preferences")
async def get_preferences(
    session_id: str = Query(..., description="会话 ID"),
):
    """获取用户偏好设置。"""
    prefs = await GuideService.get_preferences(session_id)
    return prefs


@router.post("/preferences")
async def update_preferences(
    request: Request,
    session_id: str = Query(..., description="会话 ID"),
):
    """更新用户偏好设置。"""
    try:
        body_json = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")

    # 过滤未知字段
    updates = {k: v for k, v in body_json.items() if k in UpdatePreferencesRequest.model_fields}
    prefs = await GuideService.update_preferences(session_id, updates)
    return prefs
