"""Tests for core chat service pipeline."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.services.chat_service import process_chat, build_prompt, finalize_chat


class TestBuildPrompt:
    """Test prompt building."""

    def test_build_prompt_with_chunks(self):
        chunks = [
            {"text": "灵山大佛高88米"},
            {"text": "九龙灌浴是大型表演"},
        ]
        messages = build_prompt("灵山大佛多高？", chunks)
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "灵山大佛高88米" in messages[1]["content"]
        assert "游客问: 灵山大佛多高？" in messages[1]["content"]

    def test_build_prompt_empty_chunks(self):
        messages = build_prompt("test", [])
        assert len(messages) == 2
        assert "游客问: test" in messages[1]["content"]


class TestProcessChat:
    """Test full chat pipeline."""

    @pytest.mark.asyncio
    async def test_faq_fast_path(self):
        """FAQ match should bypass RAG/LLM."""
        mock_db = MagicMock()
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq:
            mock_faq.return_value = {
                "answer": "灵山大佛高88米",
                "faq_id": 3,
            }
            result = await process_chat("灵山大佛多高？", "s1", mock_db, stream=True)
            assert result["answer"] == "灵山大佛高88米"
            assert result["source"] == "faq"
            assert result["is_faq"] is True
            assert "_stream" not in result
            assert "topic" in result

    @pytest.mark.asyncio
    async def test_rag_non_streaming(self):
        """RAG + non-streaming LLM path."""
        mock_db = MagicMock()
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route", new_callable=AsyncMock, return_value="88米"), \
             patch("app.services.chat_service.analyze_sentiment", new_callable=AsyncMock, return_value=(0.8, "positive")):

            mock_retrieve.return_value = [
                {"text": "灵山大佛高88米", "score": 0.95, "rerank_score": 0.98},
            ]

            result = await process_chat("多高？", "s1", mock_db, stream=False)
            assert result["answer"] == "88米"
            assert result["source"] == "rag"
            assert result["is_faq"] is False
            assert result["sentiment_label"] == "positive"
            assert result["sentiment_score"] == 0.8
            assert "topic" in result

    @pytest.mark.asyncio
    async def test_rag_streaming(self):
        """RAG + streaming LLM path should return stream generator."""
        mock_db = MagicMock()

        async def fake_stream():
            yield "灵"
            yield "山"

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route_stream", return_value=fake_stream()) as mock_stream, \
             patch("app.core.llm.analyze_sentiment", new_callable=AsyncMock, return_value=(0.5, "neutral")):

            mock_retrieve.return_value = [
                {"text": "灵山", "score": 0.9},
            ]

            result = await process_chat("test", "s1", mock_db, stream=True)
            assert result["source"] == "rag"
            assert "_stream" in result
            assert result["answer"] == ""
            assert "topic" in result

    @pytest.mark.asyncio
    async def test_semantic_cache_fast_path(self):
        """Semantic cache hit should bypass RAG/LLM."""
        mock_db = MagicMock()
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value="缓存答案"):

            result = await process_chat("灵山大佛多高？", "s1", mock_db, stream=True)
            assert result["answer"] == "缓存答案"
            assert result["source"] == "cache"
            assert result["from_cache"] is True
            assert "_stream" not in result
            assert "topic" in result

    @pytest.mark.asyncio
    async def test_restroom_question_bypasses_cache_rag_and_llm(self):
        """Restroom service questions should be answered deterministically."""
        mock_db = MagicMock()
        question = (
            "当前互动大屏点位：九龙灌浴（当前点位 · 九龙灌浴广场）。\n"
            "请优先围绕当前点位回答。\n"
            "游客问题：厕所在哪里？"
        )

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq, \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock) as mock_cache, \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route_stream") as mock_stream:

            result = await process_chat(question, "s1", mock_db, stream=True)
            assert result["source"] == "service_guide"
            assert result["topic"] == "food"
            assert "九龙灌浴广场" in result["answer"]
            assert "卫生间 / WC / 游客服务中心" in result["answer"]
            assert "莲花绽放" not in result["answer"]
            assert "_stream" not in result
            mock_faq.assert_not_called()
            mock_cache.assert_not_called()
            mock_retrieve.assert_not_called()
            mock_stream.assert_not_called()

    @pytest.mark.asyncio
    async def test_greeting_bypasses_faq_cache_rag_and_llm(self):
        """Short greetings should be answered instantly without full AI pipeline."""
        mock_db = MagicMock()
        question = (
            "当前互动大屏点位：九龙灌浴（当前点位 · 九龙灌浴广场）。\n"
            "请优先围绕当前点位回答。\n"
            "游客问题：你好"
        )

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq, \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock) as mock_cache, \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route_stream") as mock_stream:

            result = await process_chat(question, "s1", mock_db, stream=True)
            assert result["source"] == "smalltalk"
            assert result["topic"] == "general"
            assert "你现在位于九龙灌浴" in result["answer"]
            assert "_stream" not in result
            mock_faq.assert_not_called()
            mock_cache.assert_not_called()
            mock_retrieve.assert_not_called()
            mock_stream.assert_not_called()

    @pytest.mark.asyncio
    async def test_context_history_injected(self):
        """Should load history and inject into prompt."""
        mock_db = MagicMock()

        async def fake_stream():
            yield "回"
            yield "答"

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_history", new_callable=AsyncMock, return_value=[
                 {"user": "之前的问题？", "assistant": "之前的答案。", "timestamp": 1000}
             ]), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.services.chat_service.route_stream", return_value=fake_stream()), \
             patch("app.core.llm.analyze_sentiment", new_callable=AsyncMock, return_value=(0.5, "neutral")):

            result = await process_chat("现在的问题？", "s1", mock_db, stream=True)
            assert result["source"] == "rag"
            assert "_stream" in result

    @pytest.mark.asyncio
    async def test_external_history_priority(self):
        """Should use externally provided history instead of loading from Redis."""
        mock_db = MagicMock()

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_history", new_callable=AsyncMock) as mock_get_history, \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.services.chat_service.route", new_callable=AsyncMock, return_value="回答"), \
             patch("app.core.llm.analyze_sentiment", new_callable=AsyncMock, return_value=(0.5, "neutral")):

            external_history = [
                {"role": "user", "content": "外部问题"},
                {"role": "assistant", "content": "外部回答"},
            ]
            result = await process_chat("问题", "s1", mock_db, stream=False, history=external_history)
            assert result["answer"] == "回答"
            # Should NOT call get_history because external history was provided
            mock_get_history.assert_not_called()

    @pytest.mark.asyncio
    async def test_finalize_chat(self):
        """Should save turn to context and semantic cache."""
        with patch("app.core.context_manager.save_turn", new_callable=AsyncMock) as mock_save, \
             patch("app.core.semantic_cache.set_cache", new_callable=AsyncMock) as mock_cache:

            await finalize_chat("s1", "问题", "答案", "rag")
            mock_save.assert_called_once_with("s1", "问题", "答案")
            mock_cache.assert_called_once_with("问题", "答案")

    @pytest.mark.asyncio
    async def test_finalize_chat_skips_faq(self):
        """Should not save to semantic cache for FAQ answers."""
        with patch("app.core.context_manager.save_turn", new_callable=AsyncMock) as mock_save, \
             patch("app.core.semantic_cache.set_cache", new_callable=AsyncMock) as mock_cache:

            await finalize_chat("s1", "问题", "答案", "faq")
            mock_save.assert_called_once()
            mock_cache.assert_not_called()

    @pytest.mark.asyncio
    async def test_finalize_chat_skips_cache(self):
        """Should not save to semantic cache for cache hits."""
        with patch("app.core.context_manager.save_turn", new_callable=AsyncMock) as mock_save, \
             patch("app.core.semantic_cache.set_cache", new_callable=AsyncMock) as mock_cache:

            await finalize_chat("s1", "问题", "答案", "cache")
            mock_save.assert_called_once()
            mock_cache.assert_not_called()

    @pytest.mark.asyncio
    async def test_finalize_chat_skips_service_guide_cache(self):
        """Should not save deterministic service answers to semantic cache."""
        with patch("app.core.context_manager.save_turn", new_callable=AsyncMock) as mock_save, \
             patch("app.core.semantic_cache.set_cache", new_callable=AsyncMock) as mock_cache:

            await finalize_chat("s1", "厕所在哪里？", "服务指引", "service_guide")
            mock_save.assert_called_once()
            mock_cache.assert_not_called()

    @pytest.mark.asyncio
    async def test_finalize_chat_skips_smalltalk_cache(self):
        """Should not save instant greeting answers to semantic cache."""
        with patch("app.core.context_manager.save_turn", new_callable=AsyncMock) as mock_save, \
             patch("app.core.semantic_cache.set_cache", new_callable=AsyncMock) as mock_cache:

            await finalize_chat("s1", "你好", "你好呀", "smalltalk")
            mock_save.assert_called_once()
            mock_cache.assert_not_called()

    @pytest.mark.asyncio
    async def test_sentiment_failure(self):
        """Sentiment analysis failure should not break the pipeline."""
        mock_db = MagicMock()
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.services.chat_service.route", new_callable=AsyncMock, return_value="回答"), \
             patch("app.services.chat_service.analyze_sentiment", side_effect=Exception("sentiment down")):

            result = await process_chat("test", "s1", mock_db, stream=False)
            assert result["answer"] == "回答"
            assert result["sentiment_score"] == 0.5
            assert result["sentiment_label"] == "neutral"
