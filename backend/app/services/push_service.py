"""Push service: proactive intelligent tour guide with location/time/weather triggers."""
import json
import logging
import math
import time

from app.core.redis_client import get_redis
from app.core.rag import retrieve
from app.core.llm_router import LLMTask, route
from app.core.prompts import SYSTEM_PROMPT_CHAT

logger = logging.getLogger(__name__)

DEDUP_TTL = 1800  # 30 minutes

SCENIC_SPOTS = [
    {"spot_name": "灵山大佛", "lat": 31.4281, "lng": 120.0947, "radius_m": 200, "trigger": "location"},
    {"spot_name": "梵宫", "lat": 31.4265, "lng": 120.0935, "radius_m": 150, "trigger": "location"},
    {"spot_name": "九龙灌浴", "lat": 31.4275, "lng": 120.0955, "radius_m": 100, "trigger": "location"},
    {"spot_name": "五印坛城", "lat": 31.4258, "lng": 120.0920, "radius_m": 150, "trigger": "location"},
]


def _dedup_key(user_id: str, spot_name: str) -> str:
    return f"push:dedup:{user_id}:{spot_name}"


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _is_already_pushed(user_id: str, spot_name: str) -> bool:
    try:
        redis = await get_redis()
        return bool(await redis.exists(_dedup_key(user_id, spot_name)))
    except Exception:
        return False


async def _mark_pushed(user_id: str, spot_name: str) -> None:
    try:
        redis = await get_redis()
        await redis.set(_dedup_key(user_id, spot_name), "1", ex=DEDUP_TTL)
    except Exception as e:
        logger.debug("Push dedup set failed: %s", e)


async def _generate_push_content(spot_name: str) -> dict:
    chunks = []
    try:
        chunks = await retrieve(f"{spot_name} 简介")
    except Exception as e:
        logger.warning("RAG failed for push '%s': %s", spot_name, e)

    brief = chunks[0].get("text", "")[:100] if chunks else f"您已到达{spot_name}附近"

    return {
        "spot_name": spot_name,
        "brief": brief,
        "action_hint": f"要不要听一下{spot_name}的故事？",
        "timestamp": int(time.time()),
    }


async def check_location_triggers(user_id: str, lat: float, lng: float) -> dict | None:
    """Check if user's location triggers any push notification."""
    for spot in SCENIC_SPOTS:
        if spot["trigger"] != "location":
            continue
        distance = _haversine(lat, lng, spot["lat"], spot["lng"])
        if distance > spot["radius_m"]:
            continue
        if await _is_already_pushed(user_id, spot["spot_name"]):
            continue

        notification = await _generate_push_content(spot["spot_name"])
        await _mark_pushed(user_id, spot["spot_name"])
        return notification

    return None


async def handle_push_action(spot_name: str, action: str) -> dict:
    """Handle user action on push notification (listen/navigate/ignore)."""
    if action == "listen":
        chunks = []
        try:
            chunks = await retrieve(f"{spot_name} 讲解 历史")
        except Exception:
            pass

        context = "\n\n".join(c.get("text", "") for c in chunks[:2])
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_CHAT},
            {"role": "user", "content": f"请简要介绍{spot_name}，控制在100字以内。\n参考资料:\n{context}"},
        ]

        try:
            answer = await route(LLMTask.chat, messages=messages)
        except Exception:
            answer = f"欢迎来到{spot_name}！这里是灵山胜境的著名景点。"

        return {
            "action": "listen",
            "spot_name": spot_name,
            "narration": answer.strip(),
            "emotion": "neutral",
        }

    elif action == "navigate":
        return {
            "action": "navigate",
            "spot_name": spot_name,
            "message": f"正在为您导航到{spot_name}...",
        }

    return {"action": "ignore", "spot_name": spot_name}
