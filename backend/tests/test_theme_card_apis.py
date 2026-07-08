"""Tests for theme-card data APIs: POIs, Shows, Spot cards."""
import pytest
from unittest.mock import AsyncMock, Mock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import get_db
from app.models.tourist import POI, ScenicSpot, ShowEvent


def _make_mock_session(model_instances):
    """Build an AsyncMock session whose execute returns the given instances."""
    mock_session = AsyncMock()

    async def _execute(stmt):
        result = Mock()
        scalars = Mock()
        scalars.all = Mock(return_value=model_instances)
        result.scalars.return_value = scalars
        result.scalar_one_or_none = Mock(
            return_value=model_instances[0] if model_instances else None
        )
        return result

    mock_session.execute = AsyncMock(side_effect=_execute)
    return mock_session


def _override_db(mock_session):
    """Override FastAPI's get_db dependency for a single test."""

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    """Ensure dependency overrides are cleaned up after every test."""
    yield
    app.dependency_overrides.clear()


class TestSpotCard:
    """Test GET /api/spots/{id}/card."""

    @pytest.mark.asyncio
    async def test_spot_card_not_found(self):
        mock_session = _make_mock_session([])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/spots/nonexistent/card")
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_spot_card_found(self):
        spot = ScenicSpot(
            id="LS-001",
            name="灵山大佛",
            category="核心景点",
            overview="概述",
            detail="详情",
            latitude=31.42,
            longitude=120.12,
            ticket_info="210元",
            open_time="08:30-17:00",
            must_see="佛脚",
            best_time="早晨",
            narration="讲解词",
            thumbnail="http://example.com/img.jpg",
            duration="2小时",
        )
        mock_session = _make_mock_session([spot])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/spots/LS-001/card")
            assert response.status_code == 200
            data = response.json()
            assert data["type"] == "spot_info"
            assert data["spot_id"] == "LS-001"
            assert data["name"] == "灵山大佛"


class TestPOIAPI:
    """Test POI endpoints."""

    @pytest.mark.asyncio
    async def test_list_pois_no_filters(self):
        poi = POI(
            id=1,
            name="灵山素斋馆",
            category="food",
            address="景区入口",
            latitude=31.42,
            longitude=120.12,
        )
        mock_session = _make_mock_session([poi])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/pois")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["name"] == "灵山素斋馆"

    @pytest.mark.asyncio
    async def test_list_pois_with_category(self):
        poi = POI(id=1, name="灵山素斋馆", category="food")
        mock_session = _make_mock_session([poi])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/pois?category=food")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert all(item["category"] == "food" for item in data)

    @pytest.mark.asyncio
    async def test_list_pois_with_geo(self):
        poi = POI(
            id=1,
            name="灵山素斋馆",
            category="food",
            latitude=31.4201,
            longitude=120.1201,
        )
        mock_session = _make_mock_session([poi])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/pois?lat=31.42&lng=120.12&radius=3000")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_poi_not_found(self):
        mock_session = _make_mock_session([])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/pois/999999")
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_poi_found(self):
        poi = POI(id=1, name="灵山素斋馆", category="food", intro="素斋")
        mock_session = _make_mock_session([poi])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/pois/1")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "灵山素斋馆"


class TestShowAPI:
    """Test show event endpoints."""

    @pytest.mark.asyncio
    async def test_list_shows_no_filters(self):
        show = ShowEvent(
            id=1,
            name="九龙灌浴",
            spot_id="LS-006",
            venue="九龙灌浴广场",
            start_time="10:00",
        )
        mock_session = _make_mock_session([show])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/shows")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["name"] == "九龙灌浴"

    @pytest.mark.asyncio
    async def test_list_shows_by_spot(self):
        show = ShowEvent(id=1, name="九龙灌浴", spot_id="LS-006")
        mock_session = _make_mock_session([show])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/shows?spot_id=LS-006")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert all(item["spot_id"] == "LS-006" for item in data)

    @pytest.mark.asyncio
    async def test_get_show_not_found(self):
        mock_session = _make_mock_session([])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/shows/999999")
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_show_found(self):
        show = ShowEvent(id=1, name="九龙灌浴", spot_id="LS-006", venue="广场")
        mock_session = _make_mock_session([show])
        _override_db(mock_session)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/shows/1")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == 1
            assert data["name"] == "九龙灌浴"
