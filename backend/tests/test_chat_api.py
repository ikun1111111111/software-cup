"""Tests for SSE chat API endpoints."""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


class TestChatStream:
    """Test POST /api/chat/stream endpoint."""

    def test_chat_stream_validation_empty_question(self):
        """Should reject empty question."""
        response = client.post("/api/chat/stream", json={
            "session_id": "test",
            "question": "   ",
            "stream": True,
        })
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_chat_stream_faq_hit(self):
        """Should return faq_hit event when FAQ matches."""
        with patch("app.api.chat.search_faq", new_callable=AsyncMock) as mock_faq, \
             patch("app.api.chat._set_cache", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock):

            mock_faq.return_value = {
                "answer": "灵山大佛高88米。",
                "faq_id": 3,
            }

            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "灵山大佛多高？",
                "stream": True,
            })

            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")
            assert "faq_hit" in response.text
            assert "灵山大佛高88米" in response.text

    def test_chat_stream_cache_hit(self):
        """Should return cached result from Redis."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "answer": "cached answer",
            "source": "faq",
        }, ensure_ascii=False))

        with patch("app.api.chat.get_redis", return_value=mock_redis):
            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "热门问题",
                "stream": True,
            })

            assert response.status_code == 200
            assert "cached" in response.text or "cached answer" in response.text

    @pytest.mark.asyncio
    async def test_chat_stream_rag_tokens(self):
        """Should stream tokens for RAG-based answer."""
        async def fake_stream():
            for token in ["灵", "山", "大", "佛"]:
                yield token

        with patch("app.api.chat.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.api.chat.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.api.chat.route_stream", return_value=fake_stream()) as mock_route, \
             patch("app.api.chat._set_cache", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock), \
             patch("app.core.llm.analyze_sentiment", new_callable=AsyncMock, return_value=(0.8, "positive")):

            mock_retrieve.return_value = [
                {"text": "灵山大佛高88米", "score": 0.95, "rerank_score": 0.98},
            ]

            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "灵山大佛多高？",
                "stream": True,
            })

            assert response.status_code == 200
            body = response.text
            assert "event: token" in body
            assert "event: done" in body
            assert "灵山" in body

    def test_chat_stream_non_streaming(self):
        """Should return JSON directly when stream=false."""
        with patch("app.api.chat.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.api.chat.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.api.chat.route", new_callable=AsyncMock, return_value="88米"), \
             patch("app.api.chat._set_cache", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock):

            mock_retrieve.return_value = [
                {"text": "灵山大佛高88米", "score": 0.95},
            ]

            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "灵山大佛多高？",
                "stream": False,
            })

            assert response.status_code == 200
            data = response.json()
            assert data["answer"] == "88米"
            assert data["source"] == "rag"

    def test_chat_stream_with_history(self):
        """Should accept and pass history field."""
        with patch("app.api.chat.process_chat", new_callable=AsyncMock) as mock_process:
            mock_process.return_value = {
                "answer": "88米",
                "source": "faq",
                "is_faq": True,
                "latency_ms": 10,
            }

            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "它是什么材质？",
                "stream": True,
                "history": [
                    {"role": "user", "content": "灵山大佛有多高？"},
                    {"role": "assistant", "content": "灵山大佛高88米。"},
                ],
            })

            assert response.status_code == 200
            # Verify process_chat was called with history
            call_kwargs = mock_process.call_args.kwargs
            assert "history" in call_kwargs
            assert len(call_kwargs["history"]) == 2
        """Should return 503 when all LLM providers fail (non-streaming)."""
        with patch("app.api.chat.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.api.chat.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.api.chat.route", new_callable=AsyncMock, side_effect=RuntimeError("All failed")):

            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "test",
                "stream": False,
            })

            assert response.status_code == 503
