"""Tests for Redis client and caching operations."""
import pytest
from app.core.config import get_settings


@pytest.mark.asyncio
class TestRedisClient:
    """Test Redis client creation and basic usage."""

    async def test_redis_client_exists(self):
        """Redis client should be importable."""
        from app.core.redis_client import redis_client, get_redis
        assert redis_client is not None

    async def test_get_redis_dependency(self):
        """get_redis dependency should return the client."""
        from app.core.redis_client import get_redis
        client = await get_redis()
        assert client is not None

    @pytest.mark.skip(reason="Requires running Redis")
    async def test_set_and_get(self):
        """Should set and get a key-value pair."""
        from app.core.redis_client import redis_client

        await redis_client.set("test_key", "test_value", ex=60)
        value = await redis_client.get("test_key")
        assert value == "test_value"

        await redis_client.delete("test_key")

    @pytest.mark.skip(reason="Requires running Redis")
    async def test_cache_miss(self):
        """Should return None for non-existent key."""
        from app.core.redis_client import redis_client

        value = await redis_client.get("nonexistent_key_12345")
        assert value is None

    @pytest.mark.skip(reason="Requires running Redis")
    async def test_expiry(self):
        """Key should expire after TTL."""
        import asyncio
        from app.core.redis_client import redis_client

        await redis_client.set("expire_key", "value", ex=1)
        value = await redis_client.get("expire_key")
        assert value == "value"

        await asyncio.sleep(1.5)
        value = await redis_client.get("expire_key")
        assert value is None

    @pytest.mark.skip(reason="Requires running Redis")
    async def test_data_consistency(self):
        """Data should be consistent after write-read cycle."""
        import json
        from app.core.redis_client import redis_client

        data = {"key": "value", "number": 42, "list": [1, 2, 3]}
        await redis_client.set("json_test", json.dumps(data), ex=60)

        retrieved = await redis_client.get("json_test")
        assert json.loads(retrieved) == data

        await redis_client.delete("json_test")


class TestRedisConfig:
    """Test Redis configuration values."""

    def test_redis_url_format(self):
        """Redis URL should follow expected format."""
        settings = get_settings()
        url = settings.redis_url
        assert url.startswith("redis://")
        assert str(settings.redis_port) in url
