"""Room service: multi-person collaborative tour with WebSocket broadcast."""
import json
import logging
import random
import time

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

ROOM_TTL = 7200  # 2 hours


def _generate_room_code() -> str:
    return f"{random.randint(100000, 999999)}"


def _room_key(room_id: str) -> str:
    return f"room:{room_id}"


def _members_key(room_id: str) -> str:
    return f"room:{room_id}:members"


async def create_room(creator_name: str) -> dict:
    """Create a new collaborative tour room. Returns room data."""
    room_id = _generate_room_code()
    redis = await get_redis()

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
    redis = await get_redis()
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
    redis = await get_redis()
    data = await redis.get(_room_key(room_id))
    if not data:
        return None
    room = json.loads(data)
    room["members"] = await get_members(room_id)
    return room


async def get_members(room_id: str) -> list[dict]:
    """Get list of room members."""
    redis = await get_redis()
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
    redis = await get_redis()
    room_data = await redis.get(_room_key(room_id))
    if not room_data:
        raise ValueError("房间不存在或已过期")

    room = json.loads(room_data)
    room["itinerary"] = itinerary
    await redis.set(_room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL)
    return room


async def delete_room(room_id: str) -> bool:
    """Delete a room."""
    redis = await get_redis()
    deleted = await redis.delete(_room_key(room_id), _members_key(room_id))
    return deleted > 0


async def refresh_room_ttl(room_id: str) -> None:
    """Refresh room TTL on activity."""
    redis = await get_redis()
    await redis.expire(_room_key(room_id), ROOM_TTL)
    await redis.expire(_members_key(room_id), ROOM_TTL)
