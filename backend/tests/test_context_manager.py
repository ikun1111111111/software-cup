"""Tests for context_manager: conversation history in Redis."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.context_manager import save_turn, get_history, clear_history


class TestSaveTurn:
    """Test saving dialogue turns."""

    @pytest.mark.asyncio
    async def test_save_turn_basic(self):
        """Should save a turn to Redis list."""
        mock_redis = MagicMock()
        mock_redis.lpush = AsyncMock()
        mock_redis.ltrim = AsyncMock()
        mock_redis.expire = AsyncMock()

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            await save_turn("session_123", "灵山大佛有多高？", "灵山大佛高88米。")

        mock_redis.lpush.assert_called_once()
        mock_redis.ltrim.assert_called_once()
        mock_redis.expire.assert_called_once()

    @pytest.mark.asyncio
    async def test_save_turn_empty_session(self):
        """Should silently skip if session_id is empty."""
        mock_redis = MagicMock()
        mock_redis.lpush = AsyncMock()

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            await save_turn("", "question", "answer")

        mock_redis.lpush.assert_not_called()

    @pytest.mark.asyncio
    async def test_save_turn_redis_failure(self):
        """Should not raise on Redis failure."""
        with patch("app.core.context_manager.get_redis", side_effect=Exception("Redis down")):
            # Should not raise
            await save_turn("s1", "q", "a")


class TestGetHistory:
    """Test retrieving conversation history."""

    @pytest.mark.asyncio
    async def test_get_history_basic(self):
        """Should return turns in chronological order."""
        import json

        mock_redis = MagicMock()
        mock_redis.lrange = AsyncMock(return_value=[
            json.dumps({"user": "第二问？", "assistant": "第二答。", "timestamp": 1001}),
            json.dumps({"user": "第一问？", "assistant": "第一答。", "timestamp": 1000}),
        ])

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            history = await get_history("session_123", max_rounds=5)

        assert len(history) == 2
        # Chronological order: oldest first
        assert history[0]["user"] == "第一问？"
        assert history[0]["assistant"] == "第一答。"
        assert history[1]["user"] == "第二问？"

    @pytest.mark.asyncio
    async def test_get_history_empty(self):
        """Should return empty list for new session."""
        mock_redis = MagicMock()
        mock_redis.lrange = AsyncMock(return_value=[])

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            history = await get_history("new_session")

        assert history == []

    @pytest.mark.asyncio
    async def test_get_history_invalid_json(self):
        """Should skip invalid JSON entries."""
        mock_redis = MagicMock()
        mock_redis.lrange = AsyncMock(return_value=[
            "not json",
            "{invalid}",
        ])

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            history = await get_history("s1")

        assert history == []

    @pytest.mark.asyncio
    async def test_get_history_respects_max_rounds(self):
        """Should limit to max_rounds."""
        import json

        mock_redis = MagicMock()
        # Redis returns newest first (LPUSH order)
        mock_redis.lrange = AsyncMock(return_value=[
            json.dumps({"user": f"问{i}", "assistant": f"答{i}", "timestamp": i})
            for i in range(10, 0, -1)
        ])

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            history = await get_history("s1", max_rounds=3)

        assert len(history) == 3

    @pytest.mark.asyncio
    async def test_get_history_empty_session(self):
        """Should return empty list for empty session_id."""
        history = await get_history("")
        assert history == []


class TestClearHistory:
    """Test clearing conversation history."""

    @pytest.mark.asyncio
    async def test_clear_history_basic(self):
        """Should delete Redis key."""
        mock_redis = MagicMock()
        mock_redis.delete = AsyncMock()

        with patch("app.core.context_manager.get_redis", return_value=mock_redis):
            await clear_history("session_123")

        mock_redis.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_clear_history_failure(self):
        """Should not raise on Redis failure."""
        with patch("app.core.context_manager.get_redis", side_effect=Exception("Redis down")):
            await clear_history("s1")
