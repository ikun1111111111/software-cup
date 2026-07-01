"""Tests for room_service — create, join, itinerary, add_spot."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.room_service import (
    create_room,
    join_room,
    get_room,
    add_spot_to_itinerary,
    update_itinerary,
    update_active_route,
)


@pytest.fixture
def mock_redis():
    """Mock Redis with in-memory storage."""
    storage = {}

    async def _get(key):
        return storage.get(key)

    async def _set(key, value, ex=None):
        storage[key] = value

    async def _sadd(key, *values):
        if key not in storage:
            storage[key] = set()
        for v in values:
            storage[key].add(v)

    async def _smembers(key):
        return list(storage.get(key, set()))

    async def _expire(key, ttl):
        pass

    async def _delete(*keys):
        deleted = 0
        for k in keys:
            if k in storage:
                del storage[k]
                deleted += 1
        return deleted

    m = MagicMock()
    m.get = AsyncMock(side_effect=_get)
    m.set = AsyncMock(side_effect=_set)
    m.sadd = AsyncMock(side_effect=_sadd)
    m.smembers = AsyncMock(side_effect=_smembers)
    m.expire = AsyncMock(side_effect=_expire)
    m.delete = AsyncMock(side_effect=_delete)

    return m, storage


class TestCreateRoom:
    """M17 test group: room creation."""

    @pytest.mark.asyncio
    async def test_create_room_returns_valid_code(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            assert len(room["room_id"]) == 6
            assert room["creator"] == "队长"
            assert room["itinerary"] == []

    @pytest.mark.asyncio
    async def test_create_room_stores_in_redis(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            import json
            stored = json.loads(storage[f"room:{room['room_id']}"])
            assert stored["creator"] == "队长"


class TestAddSpotToItinerary:
    """M17 test group: add_spot_to_itinerary."""

    @pytest.mark.asyncio
    async def test_add_spot_to_empty_itinerary(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            updated = await add_spot_to_itinerary(
                room["room_id"], "灵山大佛", source="vision", confidence=0.9
            )
            assert len(updated["itinerary"]) == 1
            assert updated["itinerary"][0]["spot_name"] == "灵山大佛"
            assert updated["itinerary"][0]["source"] == "vision"

    @pytest.mark.asyncio
    async def test_add_duplicate_spot_no_increase(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            await add_spot_to_itinerary(room["room_id"], "灵山大佛")
            updated = await add_spot_to_itinerary(room["room_id"], "灵山大佛")
            assert len(updated["itinerary"]) == 1  # No duplicate

    @pytest.mark.asyncio
    async def test_add_spot_nonexistent_room(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            with pytest.raises(ValueError, match="房间不存在"):
                await add_spot_to_itinerary("000000", "灵山大佛")

    @pytest.mark.asyncio
    async def test_add_multiple_spots_accumulates(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            await add_spot_to_itinerary(room["room_id"], "灵山大佛")
            await add_spot_to_itinerary(room["room_id"], "九龙灌浴")
            updated = await add_spot_to_itinerary(room["room_id"], "灵山梵宫")
            assert len(updated["itinerary"]) == 3

    @pytest.mark.asyncio
    async def test_low_confidence_rejected(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            with pytest.raises(ValueError, match="可信度过低"):
                await add_spot_to_itinerary(
                    room["room_id"], "灵山大佛", confidence=0.1
                )

    @pytest.mark.asyncio
    async def test_unknown_spot_rejected(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            with pytest.raises(ValueError, match="无法识别"):
                await add_spot_to_itinerary(room["room_id"], "未知景点")


class TestActiveRoute:
    """Collaborative room shared route state."""

    @pytest.mark.asyncio
    async def test_update_active_route_keeps_route_order(self, mock_redis):
        mock, storage = mock_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            room = await create_room("队长")
            active_route = {
                "route_id": "route-a",
                "name": "经典路线",
                "spot_order": ["spot-a", "spot-b", "spot-c"],
                "spot_names": [
                    {"id": "spot-a", "name": "第一站"},
                    {"id": "spot-b", "name": "第二站"},
                    {"id": "spot-c", "name": "第三站"},
                ],
                "duration": "2小时",
                "route_type": "history",
            }

            updated = await update_active_route(room["room_id"], active_route)

            assert updated["active_route"]["route_id"] == "route-a"
            assert updated["active_route"]["spot_order"] == ["spot-a", "spot-b", "spot-c"]
