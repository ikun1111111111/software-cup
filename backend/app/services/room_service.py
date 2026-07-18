"""Room service: multi-person collaborative tour with WebSocket broadcast."""
from __future__ import annotations

import json
import logging
import random
import time
from collections import defaultdict

from redis.exceptions import RedisError

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

ROOM_TTL = 7200  # 2 hours


class _InMemoryRoomStore:
    """Process-local fallback used when Redis is unavailable in development."""

    def __init__(self) -> None:
        self._values: dict[str, str] = {}
        self._sets: dict[str, set[str]] = defaultdict(set)
        self._expires_at: dict[str, float] = {}

    def _evict_if_expired(self, key: str) -> None:
        expires_at = self._expires_at.get(key)
        if expires_at is not None and expires_at <= time.monotonic():
            self._values.pop(key, None)
            self._sets.pop(key, None)
            self._expires_at.pop(key, None)

    async def get(self, key: str) -> str | None:
        self._evict_if_expired(key)
        return self._values.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self._values[key] = value
        if ex is not None:
            self._expires_at[key] = time.monotonic() + ex
        return True

    async def sadd(self, key: str, *values: str) -> int:
        self._evict_if_expired(key)
        before = len(self._sets[key])
        self._sets[key].update(values)
        return len(self._sets[key]) - before

    async def smembers(self, key: str) -> set[str]:
        self._evict_if_expired(key)
        return set(self._sets.get(key, set()))

    async def expire(self, key: str, ttl: int) -> bool:
        self._evict_if_expired(key)
        if key not in self._values and key not in self._sets:
            return False
        self._expires_at[key] = time.monotonic() + ttl
        return True

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            self._evict_if_expired(key)
            existed = key in self._values or key in self._sets
            self._values.pop(key, None)
            self._sets.pop(key, None)
            self._expires_at.pop(key, None)
            deleted += int(existed)
        return deleted


_memory_room_store = _InMemoryRoomStore()
_redis_retry_after = 0.0
_failed_redis_client = None
_redis_fallback_logged = False


async def _get_room_store():
    """Return Redis when healthy, otherwise a short-lived in-memory fallback."""
    global _redis_retry_after, _failed_redis_client, _redis_fallback_logged

    now = time.monotonic()
    redis = await get_redis()
    if redis is _failed_redis_client and now < _redis_retry_after:
        return _memory_room_store

    try:
        await redis.ping()
        _failed_redis_client = None
        _redis_fallback_logged = False
        return redis
    except (RedisError, OSError, TimeoutError) as exc:
        _failed_redis_client = redis
        _redis_retry_after = now + 5
        if not _redis_fallback_logged:
            logger.warning(
                "Redis unavailable for room storage; using process-local fallback: %s",
                exc,
            )
            _redis_fallback_logged = True
        return _memory_room_store


def _generate_room_code() -> str:
    return f"{random.randint(100000, 999999)}"


def _room_key(room_id: str) -> str:
    return f"room:{room_id}"


def _members_key(room_id: str) -> str:
    return f"room:{room_id}:members"


async def create_room(creator_name: str) -> dict:
    """Create a new collaborative tour room. Returns room data."""
    room_id = _generate_room_code()
    redis = await _get_room_store()

    room_data = {
        "room_id": room_id,
        "creator": creator_name,
        "created_at": int(time.time()),
        "itinerary": [],
    }

    await redis.set(_room_key(room_id), json.dumps(room_data, ensure_ascii=False), ex=ROOM_TTL)
    await redis.sadd(_members_key(room_id), json.dumps({
        "name": creator_name,
        "role": "creator",
        "joined_at": int(time.time()),
    }, ensure_ascii=False))
    await redis.expire(_members_key(room_id), ROOM_TTL)

    logger.info("Room created: %s by %s", room_id, creator_name)
    return room_data


async def join_room(room_id: str, member_name: str) -> dict:
    """Join an existing room. Raises ValueError if room doesn't exist."""
    redis = await _get_room_store()
    room_data = await redis.get(_room_key(room_id))
    if not room_data:
        raise ValueError("房间不存在或已过期")

    room = json.loads(room_data)
    member = {
        "name": member_name,
        "role": "member",
        "joined_at": int(time.time()),
    }
    await redis.sadd(_members_key(room_id), json.dumps(member, ensure_ascii=False))
    await redis.expire(_room_key(room_id), ROOM_TTL)
    await redis.expire(_members_key(room_id), ROOM_TTL)

    members = await get_members(room_id)
    room["members"] = members

    logger.info("Member '%s' joined room %s", member_name, room_id)
    return room


async def get_room(room_id: str) -> dict | None:
    """Get room data by ID."""
    redis = await _get_room_store()
    data = await redis.get(_room_key(room_id))
    if not data:
        return None
    room = json.loads(data)
    room["members"] = await get_members(room_id)
    return room


async def get_members(room_id: str) -> list[dict]:
    """Get list of room members."""
    redis = await _get_room_store()
    raw_members = await redis.smembers(_members_key(room_id))
    members = []
    for m in raw_members:
        try:
            members.append(json.loads(m))
        except Exception:
            continue
    return members


async def update_itinerary(room_id: str, itinerary: list[dict]) -> dict:
    """Update the shared itinerary for a room."""
    redis = await _get_room_store()
    room_data = await redis.get(_room_key(room_id))
    if not room_data:
        raise ValueError("房间不存在或已过期")

    room = json.loads(room_data)
    room["itinerary"] = itinerary
    await redis.set(_room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL)
    return room


async def delete_room(room_id: str) -> bool:
    """Delete a room."""
    redis = await _get_room_store()
    deleted = await redis.delete(_room_key(room_id), _members_key(room_id))
    return deleted > 0


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

    redis = await _get_room_store()
    room_data = await redis.get(_room_key(room_id))
    if not room_data:
        raise ValueError("房间不存在或已过期")

    if confidence < 0.3:
        raise ValueError(f"可信度过低 ({confidence:.0%})，无法同步该景点")

    if not spot_name or not spot_name.strip():
        raise ValueError("景点名称不能为空")

    if spot_name in ("未知景点", "识别失败", "未知"):
        raise ValueError("无法识别该景点，请重新拍照")

    room = json.loads(room_data)
    itinerary: list = room.get("itinerary", [])

    # Deduplicate: skip if same spot already in itinerary
    if any(
        item.get("spot_name", "").strip() == spot_name.strip()
        for item in itinerary
    ):
        logger.info(
            "Spot '%s' already in room %s itinerary, skipping", spot_name, room_id
        )
        return room

    # Create spot entry
    now = datetime.now()
    spot_entry = {
        "spot_name": spot_name.strip(),
        "time": now.strftime("%H:%M"),
        "source": source,
        "confidence": confidence,
        "note": note,
        "added_at": int(time.time()),
    }
    itinerary.append(spot_entry)
    room["itinerary"] = itinerary

    await redis.set(
        _room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL
    )

    logger.info(
        "Spot '%s' added to room %s itinerary (source=%s, confidence=%.2f)",
        spot_name, room_id, source, confidence,
    )
    return room


async def refresh_room_ttl(room_id: str) -> None:
    """Refresh room TTL on activity."""
    redis = await _get_room_store()
    await redis.expire(_room_key(room_id), ROOM_TTL)
    await redis.expire(_members_key(room_id), ROOM_TTL)
