"""Tests for LLM router with key rotation and fallback."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.llm_router import (
    LLMTask,
    route,
    route_stream,
    _get_deepseek_key_pool,
    _get_next_deepseek_key,
    _reset_deepseek_key_index,
)


class TestDeepSeekKeyRotation:
    """Test DeepSeek API key pool rotation."""

    def test_key_pool_collection(self, monkeypatch):
        """Should collect all non-empty keys."""
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key", "sk-main")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_1", "sk-1")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_2", "")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_3", "sk-3")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_4", "")

        pool = _get_deepseek_key_pool()
        assert pool == ["sk-main", "sk-1", "sk-3"]

    def test_round_robin_rotation(self):
        """Should rotate keys in round-robin fashion."""
        with patch("app.core.llm_router._get_deepseek_key_pool", return_value=["sk-a", "sk-b"]):
            _reset_deepseek_key_index()

            assert _get_next_deepseek_key() == "sk-a"
            assert _get_next_deepseek_key() == "sk-b"
            assert _get_next_deepseek_key() == "sk-a"  # wrap around

    def test_empty_pool(self, monkeypatch):
        """Should return empty string when no keys available."""
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key", "")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_1", "")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_2", "")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_3", "")
        monkeypatch.setattr(
            "app.core.llm_router.settings.deepseek_api_key_4", "")

        assert _get_next_deepseek_key() == ""


class TestLLMTaskRouting:
    """Test task-to-provider routing logic."""

    def test_task_enum_values(self):
        """Task enum should have expected values."""
        assert LLMTask.chat.value == "chat"
        assert LLMTask.vision.value == "vision"
        assert LLMTask.sentiment.value == "sentiment"
        assert LLMTask.summary.value == "summary"
        assert LLMTask.verify.value == "verify"

    @pytest.mark.asyncio
    async def test_route_chat_success(self):
        """Should route chat task to DeepSeek."""
        mock_ds = AsyncMock(return_value="Hello from DeepSeek")
        with patch.dict("app.core.llm_router._CALLER_NAMES", {"deepseek": "_mock_ds"}), \
             patch.dict("app.core.llm_router.__dict__", {"_mock_ds": mock_ds}):
            result = await route(
                LLMTask.chat,
                messages=[{"role": "user", "content": "hi"}],
            )
            assert result == "Hello from DeepSeek"
            mock_ds.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_route_fallback_on_failure(self):
        """Should fallback to next provider when primary fails."""
        mock_ds = AsyncMock(side_effect=Exception("DeepSeek down"))
        mock_db = AsyncMock(return_value="Hello from Doubao fallback")

        with patch.dict("app.core.llm_router._CALLER_NAMES", {
            "deepseek": "_mock_ds",
            "doubao": "_mock_db",
            "qwen": "_mock_qw",
        }), patch.dict("app.core.llm_router.__dict__", {
            "_mock_ds": mock_ds,
            "_mock_db": mock_db,
            "_mock_qw": AsyncMock(),
        }):
            result = await route(
                LLMTask.chat,
                messages=[{"role": "user", "content": "hi"}],
            )
            assert result == "Hello from Doubao fallback"
            mock_ds.assert_awaited_once()
            mock_db.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_route_all_providers_fail(self):
        """Should raise RuntimeError when all providers fail."""
        mock_ds = AsyncMock(side_effect=Exception("DS fail"))
        mock_db = AsyncMock(side_effect=Exception("DB fail"))
        mock_qw = AsyncMock(side_effect=Exception("QW fail"))

        with patch.dict("app.core.llm_router._CALLER_NAMES", {
            "deepseek": "_mock_ds",
            "doubao": "_mock_db",
            "qwen": "_mock_qw",
        }), patch.dict("app.core.llm_router.__dict__", {
            "_mock_ds": mock_ds,
            "_mock_db": mock_db,
            "_mock_qw": mock_qw,
        }):
            with pytest.raises(RuntimeError, match="All providers failed"):
                await route(
                    LLMTask.chat,
                    messages=[{"role": "user", "content": "hi"}],
                )

    @pytest.mark.asyncio
    async def test_route_vision(self):
        """Should route vision task to Qwen-VL."""
        mock_vl = AsyncMock(return_value="This is a picture of a Buddha")
        with patch.dict("app.core.llm_router._CALLER_NAMES", {
            "qwen_vl": "_mock_vl",
            "deepseek": "_mock_ds",
        }), patch.dict("app.core.llm_router.__dict__", {
            "_mock_vl": mock_vl,
            "_mock_ds": AsyncMock(),
        }):
            result = await route(
                LLMTask.vision,
                image_url="http://example.com/img.jpg",
                prompt="Describe this",
            )
            assert result == "This is a picture of a Buddha"
            mock_vl.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_route_sentiment(self):
        """Should route sentiment task to Doubao."""
        mock_db = AsyncMock(return_value='{"score": 0.9, "label": "positive"}')
        with patch.dict("app.core.llm_router._CALLER_NAMES", {
            "doubao": "_mock_db",
            "deepseek": "_mock_ds",
        }), patch.dict("app.core.llm_router.__dict__", {
            "_mock_db": mock_db,
            "_mock_ds": AsyncMock(),
        }):
            result = await route(
                LLMTask.sentiment,
                messages=[{"role": "user", "content": "分析情感"}],
            )
            assert result == '{"score": 0.9, "label": "positive"}'
            mock_db.assert_awaited_once()


class TestRouteStream:
    """Test streaming route."""

    @pytest.mark.asyncio
    async def test_stream_chat(self):
        """Should yield tokens from streaming DeepSeek."""
        async def fake_stream():
            for token in ["Hello", " ", "world"]:
                yield token

        mock_stream = MagicMock(return_value=fake_stream())
        with patch.dict("app.core.llm_router._STREAM_CALLER_NAMES", {
            "deepseek": "_mock_stream",
            "doubao": "_mock_stream",
            "qwen": "_mock_stream",
        }), patch.dict("app.core.llm_router.__dict__", {"_mock_stream": mock_stream}):
            tokens = []
            async for token in route_stream(
                LLMTask.chat,
                messages=[{"role": "user", "content": "hi"}],
            ):
                tokens.append(token)
            assert tokens == ["Hello", " ", "world"]

    @pytest.mark.asyncio
    async def test_stream_non_chat_raises(self):
        """Should raise ValueError for non-chat streaming."""
        with pytest.raises(ValueError, match="Streaming is only supported for chat tasks"):
            async for _ in route_stream(
                LLMTask.sentiment,
                messages=[{"role": "user", "content": "hi"}],
            ):
                pass
