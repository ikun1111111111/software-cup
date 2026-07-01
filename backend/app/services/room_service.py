"""Room service: multi-person collaborative tour with WebSocket broadcast."""
import json
import logging
import random
import time

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

ROOM_TTL = 7200  # 2 hours

# ─── In-memory fallback when Redis is unavailable ───
_mem_rooms: dict[str, dict] = {}      # key -> room JSON
_mem_members: dict[str, set] = {}     # key -> set of member JSON strings


def _generate_room_code() -> str:
    return f"{random.randint(100000, 999999)}"


def _room_key(room_id: str) -> str:
    return f"room:{room_id}"


def _members_key(room_id: str) -> str:
    return f"room:{room_id}:members"


async def _try_redis(fn, fallback=None):
    """Try a Redis operation; on connection error use fallback or raise."""
    try:
        return await fn()
    except Exception as e:
        logger.warning("Redis unavailable (%s), using in-memory fallback", e)
        if fallback is not None:
            return fallback()
        raise


async def create_room(creator_name: str) -> dict:
    """Create a new collaborative tour room. Returns room data."""
    room_id = _generate_room_code()

    room_data = {
        "room_id": room_id,
        "creator": creator_name,
        "created_at": int(time.time()),
        "itinerary": [],
        "active_route": None,
    }

    member_json = json.dumps({
        "name": creator_name,
        "role": "creator",
        "joined_at": int(time.time()),
    }, ensure_ascii=False)

    async def _redis_op():
        redis = await get_redis()
        await redis.set(_room_key(room_id), json.dumps(room_data, ensure_ascii=False), ex=ROOM_TTL)
        await redis.sadd(_members_key(room_id), member_json)
        await redis.expire(_members_key(room_id), ROOM_TTL)

    def _mem_op():
        _mem_rooms[_room_key(room_id)] = json.dumps(room_data, ensure_ascii=False)
        _mem_members.setdefault(_members_key(room_id), set()).add(member_json)

    await _try_redis(_redis_op, _mem_op)
    logger.info("Room created: %s by %s", room_id, creator_name)
    return room_data


async def join_room(room_id: str, member_name: str) -> dict:
    """Join an existing room. Raises ValueError if room doesn't exist."""
    member = {
        "name": member_name,
        "role": "member",
        "joined_at": int(time.time()),
    }

    async def _redis_op():
        redis = await get_redis()
        room_data = await redis.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        await redis.sadd(_members_key(room_id), json.dumps(member, ensure_ascii=False))
        await redis.expire(_room_key(room_id), ROOM_TTL)
        await redis.expire(_members_key(room_id), ROOM_TTL)
        members = await get_members(room_id)
        room["members"] = members
        return room

    def _mem_op():
        room_data = _mem_rooms.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        _mem_members.setdefault(_members_key(room_id), set()).add(
            json.dumps(member, ensure_ascii=False)
        )
        members = _get_members_mem(room_id)
        room["members"] = members
        return room

    room = await _try_redis(_redis_op, _mem_op)
    logger.info("Member '%s' joined room %s", member_name, room_id)
    return room


async def get_room(room_id: str) -> dict | None:
    """Get room data by ID."""
    async def _redis_op():
        redis = await get_redis()
        data = await redis.get(_room_key(room_id))
        if not data:
            return None
        room = json.loads(data)
        room["members"] = await get_members(room_id)
        return room

    def _mem_op():
        data = _mem_rooms.get(_room_key(room_id))
        if not data:
            return None
        room = json.loads(data)
        room["members"] = _get_members_mem(room_id)
        return room

    return await _try_redis(_redis_op, _mem_op)


def _get_members_mem(room_id: str) -> list[dict]:
    """Get members from in-memory store."""
    raw = _mem_members.get(_members_key(room_id), set())
    members = []
    for m in raw:
        try:
            members.append(json.loads(m))
        except Exception:
            continue
    return members


async def get_members(room_id: str) -> list[dict]:
    """Get list of room members."""
    async def _redis_op():
        redis = await get_redis()
        raw_members = await redis.smembers(_members_key(room_id))
        members = []
        for m in raw_members:
            try:
                members.append(json.loads(m))
            except Exception:
                continue
        return members

    return await _try_redis(_redis_op, lambda: _get_members_mem(room_id))


async def update_itinerary(room_id: str, itinerary: list[dict]) -> dict:
    """Update the shared itinerary for a room."""
    async def _redis_op():
        redis = await get_redis()
        room_data = await redis.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        room["itinerary"] = itinerary
        await redis.set(_room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL)
        return room

    def _mem_op():
        room_data = _mem_rooms.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        room["itinerary"] = itinerary
        _mem_rooms[_room_key(room_id)] = json.dumps(room, ensure_ascii=False)
        return room

    return await _try_redis(_redis_op, _mem_op)


async def update_active_route(room_id: str, active_route: dict) -> dict:
    """Set the shared route for a collaborative room."""
    if not active_route.get("route_id"):
        raise ValueError("路线 ID 不能为空")
    if not active_route.get("spot_order"):
        raise ValueError("路线中没有可用景点")

    async def _redis_op():
        redis = await get_redis()
        room_data = await redis.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        room["active_route"] = active_route
        await redis.set(_room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL)
        return room

    def _mem_op():
        room_data = _mem_rooms.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        room["active_route"] = active_route
        _mem_rooms[_room_key(room_id)] = json.dumps(room, ensure_ascii=False)
        return room

    room = await _try_redis(_redis_op, _mem_op)
    logger.info("Room %s active route set to %s", room_id, active_route.get("route_id"))
    return room


async def delete_room(room_id: str) -> bool:
    """Delete a room."""
    async def _redis_op():
        redis = await get_redis()
        deleted = await redis.delete(_room_key(room_id), _members_key(room_id))
        return deleted > 0

    def _mem_op():
        existed = _room_key(room_id) in _mem_rooms
        _mem_rooms.pop(_room_key(room_id), None)
        _mem_members.pop(_members_key(room_id), None)
        return existed

    return await _try_redis(_redis_op, _mem_op)


async def add_spot_to_itinerary(
    room_id: str,
    spot_name: str,
    source: str = "manual",
    confidence: float = 1.0,
    note: str = "",
) -> dict:
    """Add a single scenic spot to the room's shared itinerary.

    Args:
        room_id: The room identifier.
        spot_name: Name of the scenic spot to add.
        source: Source of the addition — "vision", "recommend", or "manual".
        confidence: Confidence score (0-1) for vision-based additions.
        note: Optional note for the spot entry.

    Returns:
        Updated room data dict.

    Raises:
        ValueError: If room doesn't exist, confidence too low, or spot unknown.
    """
    from datetime import datetime

    if confidence < 0.3:
        raise ValueError(f"可信度过低 ({confidence:.0%})，无法同步该景点")

    if not spot_name or not spot_name.strip():
        raise ValueError("景点名称不能为空")

    if spot_name in ("未知景点", "识别失败", "未知"):
        raise ValueError("无法识别该景点，请重新拍照")

    now = datetime.now()
    spot_entry = {
        "spot_name": spot_name.strip(),
        "time": now.strftime("%H:%M"),
        "source": source,
        "confidence": confidence,
        "note": note,
        "added_at": int(time.time()),
    }

    async def _redis_op():
        redis = await get_redis()
        room_data = await redis.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        itinerary: list = room.get("itinerary", [])
        if any(
            item.get("spot_name", "").strip() == spot_name.strip()
            for item in itinerary
        ):
            logger.info("Spot '%s' already in room %s itinerary, skipping", spot_name, room_id)
            return room
        itinerary.append(spot_entry)
        room["itinerary"] = itinerary
        await redis.set(_room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL)
        return room

    def _mem_op():
        room_data = _mem_rooms.get(_room_key(room_id))
        if not room_data:
            raise ValueError("房间不存在或已过期")
        room = json.loads(room_data)
        itinerary: list = room.get("itinerary", [])
        if any(
            item.get("spot_name", "").strip() == spot_name.strip()
            for item in itinerary
        ):
            logger.info("Spot '%s' already in room %s itinerary, skipping", spot_name, room_id)
            return room
        itinerary.append(spot_entry)
        room["itinerary"] = itinerary
        _mem_rooms[_room_key(room_id)] = json.dumps(room, ensure_ascii=False)
        return room

    room = await _try_redis(_redis_op, _mem_op)
    logger.info(
        "Spot '%s' added to room %s itinerary (source=%s, confidence=%.2f)",
        spot_name, room_id, source, confidence,
    )
    return room


async def refresh_room_ttl(room_id: str) -> None:
    """Refresh room TTL on activity."""
    async def _redis_op():
        redis = await get_redis()
        await redis.expire(_room_key(room_id), ROOM_TTL)
        await redis.expire(_members_key(room_id), ROOM_TTL)

    await _try_redis(_redis_op, lambda: None)
