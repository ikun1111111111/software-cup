"""Tests for core chat service pipeline."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.services.chat_service import process_chat, build_prompt


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

    @pytest.mark.asyncio
    async def test_sentiment_fallback(self):
        """Sentiment analysis failure should not break the pipeline."""
        mock_db = MagicMock()
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.services.chat_service.route", new_callable=AsyncMock, return_value="回答"), \
             patch("app.core.llm.analyze_sentiment", side_effect=Exception("sentiment down")):

            result = await process_chat("test", "s1", mock_db, stream=False)
            assert result["answer"] == "回答"
            assert result["sentiment_score"] == 0.5
            assert result["sentiment_label"] == "neutral"
