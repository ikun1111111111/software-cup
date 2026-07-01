"""数字人智能向导服务：状态管理、偏好设置、提示策略引擎。"""
import json
import logging
import math
from datetime import datetime
from typing import Optional

from app.core.redis_client import get_redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Redis key 前缀
GUIDE_PREFIX = "guide"

# 默认偏好
DEFAULT_PREFERENCES = {
    "enable_nearby_prompt": True,
    "enable_idle_prompt": True,
    "enable_detour_prompt": True,
    "prompt_frequency": "medium",  # low | medium | high
    "auto_narrate": False,
    "narration_speed": "normal",  # slow | normal | fast
    "dnd_mode": False,
    "dnd_schedule": {"start": "22:00", "end": "08:00"},
    "preferred_role": "小灵",
    "preferred_route_type": "经典全景",
}

# 冷却时间（秒）
COOLDOWN = {
    "nearby": 300,
    "idle": 600,
    "detour": 180,
}


class GuideService:
    """数字人向导核心服务。"""

    @staticmethod
    def _state_key(session_id: str) -> str:
        return f"{GUIDE_PREFIX}:state:{session_id}"

    @staticmethod
    def _prefs_key(session_id: str) -> str:
        return f"{GUIDE_PREFIX}:prefs:{session_id}"

    @staticmethod
    def _history_key(session_id: str) -> str:
        return f"{GUIDE_PREFIX}:history:{session_id}"

    @staticmethod
    def _today_key(session_id: str) -> str:
        return f"{GUIDE_PREFIX}:today:{session_id}:{datetime.utcnow().strftime('%Y%m%d')}"

    # ---------- 偏好设置 ----------

    @classmethod
    async def get_preferences(cls, session_id: str) -> dict:
        redis = await get_redis()
        key = cls._prefs_key(session_id)
        try:
            data = await redis.get(key)
            if data:
                prefs = json.loads(data)
                # 合并默认配置，防止新增字段缺失
                return {**DEFAULT_PREFERENCES, **prefs}
        except Exception as e:
            logger.warning("Failed to load preferences for %s: %s", session_id, e)
        return dict(DEFAULT_PREFERENCES)

    @classmethod
    async def update_preferences(cls, session_id: str, updates: dict) -> dict:
        prefs = await cls.get_preferences(session_id)
        # 只允许更新已知的字段
        allowed = set(DEFAULT_PREFERENCES.keys())
        for k, v in updates.items():
            if k in allowed:
                prefs[k] = v
        redis = await get_redis()
        key = cls._prefs_key(session_id)
        try:
            await redis.set(key, json.dumps(prefs, ensure_ascii=False), ex=settings.context_ttl)
        except Exception as e:
            logger.warning("Failed to save preferences for %s: %s", session_id, e)
        return prefs

    # ---------- 状态管理 ----------

    @classmethod
    async def get_state(cls, session_id: str) -> dict:
        redis = await get_redis()
        key = cls._state_key(session_id)
        try:
            data = await redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning("Failed to load state for %s: %s", session_id, e)
        return {
            "status": "idle",
            "current_spot": None,
            "current_route": None,
            "last_prompt_type": None,
            "last_prompt_time": 0,
        }

    @classmethod
    async def set_state(cls, session_id: str, state: dict) -> dict:
        redis = await get_redis()
        key = cls._state_key(session_id)
        try:
            await redis.set(key, json.dumps(state, ensure_ascii=False), ex=settings.context_ttl)
        except Exception as e:
            logger.warning("Failed to save state for %s: %s", session_id, e)
        return state

    @classmethod
    async def update_state(cls, session_id: str, **kwargs) -> dict:
        state = await cls.get_state(session_id)
        state.update(kwargs)
        return await cls.set_state(session_id, state)

    # ---------- 今日讲解记录 ----------

    @classmethod
    async def is_narrated_today(cls, session_id: str, spot_id: str) -> bool:
        redis = await get_redis()
        key = cls._today_key(session_id)
        try:
            return await redis.sismember(key, spot_id)
        except Exception as e:
            logger.warning("Failed to check today narrated: %s", e)
            return False

    @classmethod
    async def mark_narrated_today(cls, session_id: str, spot_id: str):
        redis = await get_redis()
        key = cls._today_key(session_id)
        try:
            await redis.sadd(key, spot_id)
            await redis.expire(key, 86400)
        except Exception as e:
            logger.warning("Failed to mark narrated today: %s", e)

    # ---------- 历史反馈 ----------

    @classmethod
    async def record_rejection(cls, session_id: str, prompt_type: str, spot_id: Optional[str] = None):
        redis = await get_redis()
        key = cls._history_key(session_id)
        try:
            record = {"type": prompt_type, "spot_id": spot_id, "time": datetime.utcnow().timestamp()}
            await redis.lpush(key, json.dumps(record, ensure_ascii=False))
            await redis.expire(key, 86400 * 7)
        except Exception as e:
            logger.warning("Failed to record rejection: %s", e)

    # ---------- 工具方法 ----------

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """计算两点间距离（米），使用 GCJ-02 近似球面距离。"""
        R = 6371000  # 地球半径（米）
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def find_nearest_spot(lat: float, lon: float, spots: list[dict]) -> tuple[Optional[dict], float]:
        """返回最近的景点及距离（米）。"""
        nearest = None
        min_dist = float("inf")
        for spot in spots:
            slat = spot.get("latitude")
            slon = spot.get("longitude")
            if slat is None or slon is None:
                continue
            dist = GuideService.haversine_distance(lat, lon, slat, slon)
            if dist < min_dist:
                min_dist = dist
                nearest = spot
        return nearest, min_dist

    # ---------- 提示策略引擎 ----------

    @classmethod
    async def check_prompts(cls, session_id: str, context: dict, spots: list[dict]) -> Optional[dict]:
        """根据上下文判断是否需要主动提示。返回 prompt 事件或 None。"""
        prefs = await cls.get_preferences(session_id)
        state = await cls.get_state(session_id)

        # 免打扰模式直接跳过
        if prefs.get("dnd_mode"):
            return None

        now = datetime.utcnow().timestamp()
        last_time = state.get("last_prompt_time", 0) or 0
        time_since = now - last_time

        lat = context.get("latitude")
        lon = context.get("longitude")

        # 1. 偏离路线提示
        if prefs.get("enable_detour_prompt") and context.get("deviation_distance", 0) > 100:
            if time_since > COOLDOWN["detour"]:
                await cls.update_state(
                    session_id,
                    last_prompt_type="detour",
                    last_prompt_time=now,
                )
                return {
                    "type": "prompt_detour",
                    "message": "您偏离了推荐路线，需要重新规划吗？",
                    "actions": ["重新规划", "不用了", "静音"],
                    "auto_dismiss": 8,
                    "deviation": context.get("deviation_distance"),
                }

        # 2. 接近景点提示
        if prefs.get("enable_nearby_prompt") and lat is not None and lon is not None and spots:
            nearest, distance = cls.find_nearest_spot(lat, lon, spots)
            if nearest and distance < 50:
                # 根据频率调整阈值
                freq = prefs.get("prompt_frequency", "medium")
                threshold = 50 if freq == "high" else 40 if freq == "medium" else 30
                if distance <= threshold:
                    spot_id = nearest["id"]
                    if time_since > COOLDOWN["nearby"] and not await cls.is_narrated_today(session_id, spot_id):
                        await cls.update_state(
                            session_id,
                            last_prompt_type="nearby",
                            last_prompt_time=now,
                            current_spot=nearest,
                        )
                        return {
                            "type": "prompt_nearby",
                            "spot": nearest,
                            "message": f"前面就是{nearest['name']}，要听听讲解吗？",
                            "actions": ["听听", "不用了"],
                            "auto_dismiss": 5,
                        }

        # 3. 空闲提示
        idle_time = context.get("idle_time", 0)
        if prefs.get("enable_idle_prompt") and idle_time > 120:
            if time_since > COOLDOWN["idle"]:
                await cls.update_state(
                    session_id,
                    last_prompt_type="idle",
                    last_prompt_time=now,
                )
                return {
                    "type": "prompt_idle",
                    "message": "需要推荐附近景点吗？",
                    "actions": ["推荐", "不用了"],
                    "auto_dismiss": 3,
                    "suggestions": spots[:3] if spots else [],
                }

        return None

    # ---------- 讲解内容生成 ----------

    @classmethod
    async def build_narration(cls, spot: dict, role: str = "小灵") -> str:
        """基于景点信息生成讲解词（无 LLM 依赖，保证离线可用）。"""
        name = spot.get("name", "这个景点")
        overview = spot.get("overview", "").strip()
        detail = spot.get("detail", "").strip()
        tags = spot.get("tags") or []

        parts = [f"欢迎来到{name}。"]
        if overview:
            parts.append(overview)
        if detail:
            parts.append(detail[:300] if len(detail) > 300 else detail)
        if tags:
            parts.append(f"这里的关键词是：{'、'.join(tags[:5])}。")

        if len(parts) == 1:
            parts.append(f"我是您的数字导览员{role}，有什么想了解的吗？")

        return "".join(parts)

    @classmethod
    async def generate_route_suggestion(cls, spots: list[dict], route_type: str = "经典全景", routes: list[dict] | None = None) -> dict:
        """生成一条推荐路线，优先使用数据库中的真实路线。"""
        # 优先从已有路线中匹配
        if routes:
            matched = next((r for r in routes if r.get("route_type") == route_type), None)
            if not matched:
                matched = routes[0] if routes else None
            if matched:
                spot_order = matched.get("spot_order", [])
                matched_spots = [s for s in spots if s["id"] in spot_order]
                # 按 spot_order 排序
                if matched_spots:
                    spot_name_map = {s["id"]: s for s in matched_spots}
                    ordered = [spot_name_map[sid] for sid in spot_order if sid in spot_name_map]
                    return {
                        "id": matched["id"],
                        "name": matched["name"],
                        "route_type": matched.get("route_type", route_type),
                        "duration": matched.get("duration", "2-3小时"),
                        "description": matched.get("description", f"为您推荐{matched['name']}"),
                        "spots": ordered,
                        "spot_order": spot_order,
                    }

        # 无匹配路线时，从景点列表中选取
        selected = spots[:6] if len(spots) >= 6 else spots
        spot_names = [s["name"] for s in selected]
        route = {
            "id": f"guide_auto_{route_type}",
            "name": f"{route_type}推荐路线",
            "route_type": route_type,
            "duration": f"约{len(selected) // 2 + 1}小时",
            "description": f"为您推荐一条{route_type}路线，沿途经过：{' → '.join(spot_names)}。",
            "spots": selected,
        }
        return route
