"""Tests for room API — create, join, add-spot, sync endpoints."""
import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def mock_room_redis():
    """Mock Redis for all room API tests."""
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


class TestRoomCreateAPI:
    """M17 test group: POST /api/room/create."""

    @pytest.mark.asyncio
    async def test_create_room_returns_room_data(self, mock_room_redis):
        mock, storage = mock_room_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/api/room/create", json={"creator_name": "队长"})
                assert resp.status_code == 200
                data = resp.json()
                assert len(data["room_id"]) == 6
                assert data["creator"] == "队长"
                assert data["itinerary"] == []

    @pytest.mark.asyncio
    async def test_create_room_empty_name(self, mock_room_redis):
        mock, storage = mock_room_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/api/room/create", json={"creator_name": "  "})
                assert resp.status_code == 400


class TestAddSpotAPI:
    """M17 test group: POST /api/room/{id}/itinerary/add-spot."""

    @pytest.mark.asyncio
    async def test_add_spot_to_room(self, mock_room_redis):
        mock, storage = mock_room_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # Create room
                create_resp = await client.post("/api/room/create", json={"creator_name": "队长"})
                room_id = create_resp.json()["room_id"]

                # Add spot
                add_resp = await client.post(
                    f"/api/room/{room_id}/itinerary/add-spot",
                    json={"spot_name": "灵山大佛", "source": "vision", "confidence": 0.9},
                )
                assert add_resp.status_code == 200
                data = add_resp.json()
                assert data["status"] == "ok"
                assert data["spot_name"] == "灵山大佛"
                assert data["itinerary_count"] == 1

    @pytest.mark.asyncio
    async def test_add_spot_nonexistent_room(self, mock_room_redis):
        mock, storage = mock_room_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/api/room/999999/itinerary/add-spot",
                    json={"spot_name": "灵山大佛"},
                )
                assert resp.status_code == 400


class TestRoomRouteAPI:
    """PUT /api/room/{id}/route keeps canonical route order."""

    @pytest.mark.asyncio
    async def test_set_room_route_uses_route_spot_order(self, mock_room_redis):
        mock, storage = mock_room_redis

        class RouteResult:
            def scalar_one_or_none(self):
                return SimpleNamespace(
                    id="route-a",
                    name="经典路线",
                    spot_order=["spot-a", "spot-b", "spot-c"],
                    duration="2小时",
                    route_type="history",
                )

        class SpotResult:
            def all(self):
                return [
                    SimpleNamespace(id="spot-a", name="第一站"),
                    SimpleNamespace(id="spot-b", name="第二站"),
                    SimpleNamespace(id="spot-c", name="第三站"),
                ]

        class FakeSession:
            def __init__(self):
                self.calls = 0

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def execute(self, stmt):
                self.calls += 1
                return RouteResult() if self.calls == 1 else SpotResult()

        with (
            patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)),
            patch("app.api.room.async_session", new=lambda: FakeSession()),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                create_resp = await client.post("/api/room/create", json={"creator_name": "队长"})
                room_id = create_resp.json()["room_id"]

                route_resp = await client.put(
                    f"/api/room/{room_id}/route",
                    json={"route_id": "route-a"},
                )

                assert route_resp.status_code == 200
                active_route = route_resp.json()["active_route"]
                assert active_route["route_id"] == "route-a"
                assert active_route["spot_order"] == ["spot-a", "spot-b", "spot-c"]


class TestVisionSyncAPI:
    """M17 test group: POST /api/vision/sync-to-room."""

    @pytest.mark.asyncio
    async def test_vision_sync_to_room(self, mock_room_redis):
        mock, storage = mock_room_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # Create room
                create_resp = await client.post("/api/room/create", json={"creator_name": "队长"})
                room_id = create_resp.json()["room_id"]

                # Sync vision result
                sync_resp = await client.post(
                    "/api/vision/sync-to-room",
                    json={
                        "room_id": room_id,
                        "spot_name": "灵山大佛",
                        "confidence": 0.85,
                        "note": "拍照识别",
                    },
                )
                assert sync_resp.status_code == 200
                data = sync_resp.json()
                assert data["status"] == "ok"
                assert data["itinerary_count"] == 1

    @pytest.mark.asyncio
    async def test_vision_sync_low_confidence(self, mock_room_redis):
        mock, storage = mock_room_redis
        with patch("app.services.room_service.get_redis", new=AsyncMock(return_value=mock)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # Create room
                create_resp = await client.post("/api/room/create", json={"creator_name": "队长"})
                room_id = create_resp.json()["room_id"]

                # Try sync with low confidence
                sync_resp = await client.post(
                    "/api/vision/sync-to-room",
                    json={
                        "room_id": room_id,
                        "spot_name": "灵山大佛",
                        "confidence": 0.1,
                    },
                )
                assert sync_resp.status_code == 400
