"""Tests for vision_room_sync — confidence filtering, fuzzy matching, sync."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.vision_room_sync import (
    sync_vision_to_room,
    sync_vision_result_to_room,
    _fuzzy_match_spot,
    MIN_CONFIDENCE,
)


@pytest.fixture
def mock_room_redis():
    """Mock Redis for room operations."""
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
        for k in keys:
            storage.pop(k, None)
        return 1

    m = MagicMock()
    m.get = AsyncMock(side_effect=_get)
    m.set = AsyncMock(side_effect=_set)
    m.sadd = AsyncMock(side_effect=_sadd)
    m.smembers = AsyncMock(side_effect=_smembers)
    m.expire = AsyncMock(side_effect=_expire)
    m.delete = AsyncMock(side_effect=_delete)

    return m, storage


class TestFuzzyMatch:
    """M17 test group: fuzzy spot name matching."""

    def test_exact_match(self):
        assert _fuzzy_match_spot("灵山大佛") == "灵山大佛"

    def test_substring_match(self):
        assert _fuzzy_match_spot("大佛") == "灵山大佛"

    def test_partial_match(self):
        result = _fuzzy_match_spot("梵宫景区")
        assert result == "灵山梵宫"

    def test_no_match(self):
        assert _fuzzy_match_spot("完全不存在") is None

    def test_empty_input(self):
        assert _fuzzy_match_spot("") is None


class TestSyncVisionToRoom:
    """M17 test group: vision→room sync service."""

    @pytest.mark.asyncio
    async def test_sync_with_valid_confidence(self, mock_room_redis):
        mock, storage = mock_room_redis
        from app.services import room_service
        with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
            # Create a room first
            room = await room_service.create_room("队长")
            result = await sync_vision_to_room(
                room["room_id"], "灵山大佛", confidence=0.85
            )
            assert result["status"] == "ok"
            assert result["spot_name"] == "灵山大佛"
            assert result["itinerary_count"] == 1

    @pytest.mark.asyncio
    async def test_sync_low_confidence_rejected(self, mock_room_redis):
        mock, storage = mock_room_redis
        from app.services import room_service
        with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
            room = await room_service.create_room("队长")
            with pytest.raises(ValueError, match="可信度过低"):
                await sync_vision_to_room(room["room_id"], "灵山大佛", confidence=0.1)

    @pytest.mark.asyncio
    async def test_sync_unknown_spot_rejected(self, mock_room_redis):
        mock, storage = mock_room_redis
        from app.services import room_service
        with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
            room = await room_service.create_room("队长")
            with pytest.raises(ValueError, match="不在灵山胜境景点列表"):
                await sync_vision_to_room(
                    room["room_id"], "某个随机地点", confidence=0.8
                )

    @pytest.mark.asyncio
    async def test_sync_nonexistent_room(self, mock_room_redis):
        mock, storage = mock_room_redis
        from app.services import room_service
        with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
            with pytest.raises(ValueError, match="不存在或已过期"):
                await sync_vision_to_room("999999", "灵山大佛", confidence=0.8)

    @pytest.mark.asyncio
    async def test_sync_fuzzy_match_spot(self, mock_room_redis):
        mock, storage = mock_room_redis
        from app.services import room_service
        with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
            room = await room_service.create_room("队长")
            result = await sync_vision_to_room(
                room["room_id"], "大佛", confidence=0.9
            )
            assert result["status"] == "ok"
            assert result["spot_name"] == "灵山大佛"
