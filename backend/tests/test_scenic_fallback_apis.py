"""Regression tests for scenic spot/route API demo-data fallback."""
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db
from app.main import app


def _override_broken_db() -> None:
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=RuntimeError("database schema is stale"))

    async def _override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_spots_returns_demo_data_when_database_query_fails():
    _override_broken_db()
    transport = ASGITransport(app=app, raise_app_exceptions=False)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/spots")

    assert response.status_code == 200
    data = response.json()
    assert data
    assert data[0]["id"]
    assert any(spot["name"] == "佛手广场" for spot in data)


@pytest.mark.asyncio
async def test_list_routes_returns_demo_data_when_database_query_fails():
    _override_broken_db()
    transport = ASGITransport(app=app, raise_app_exceptions=False)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/routes")

    assert response.status_code == 200
    data = response.json()
    assert data
    assert data[0]["route_type"]
    assert any(route["name"] == "祈福专线" for route in data)
