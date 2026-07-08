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
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq, \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
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

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route_stream", return_value=fake_stream()) as mock_route, \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
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
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route", new_callable=AsyncMock, return_value="88米"), \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
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
            call_kwargs = mock_process.call_args.kwargs
            assert "history" in call_kwargs
            assert len(call_kwargs["history"]) == 2

    def test_chat_stream_llm_failure_fallback(self):
        """Should return fallback message when LLM fails (non-streaming)."""
        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.services.chat_service.route", new_callable=AsyncMock, side_effect=RuntimeError("All failed")):

            response = client.post("/api/chat/stream", json={
                "session_id": "test",
                "question": "test",
                "stream": False,
            })

            assert response.status_code == 200
            data = response.json()
            assert "AI服务暂时不可用" in data["answer"]


class TestChatStreamWithTTS:
    """Test POST /api/chat/stream_with_tts endpoint."""

    def test_stream_with_tts_validation_empty_question(self):
        """Should reject empty question."""
        response = client.post("/api/chat/stream_with_tts", json={
            "session_id": "test",
            "question": "   ",
        })
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_stream_with_tts_faq_hit(self):
        """Should stream faq_hit + tts_audio + done events."""
        async def fake_tts():
            yield {"type": "audio", "data": "YmFzZTY0"}
            yield {"type": "phonemes", "data": [{"char": "灵"}]}
            yield {"type": "done", "duration_ms": 1000}

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq, \
             patch("app.api.chat._get_active_voice_id", new_callable=AsyncMock, return_value="mandarin"), \
             patch("app.api.chat.synthesize_stream", return_value=fake_tts()), \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock):

            mock_faq.return_value = {
                "answer": "灵山大佛高88米。",
                "faq_id": 3,
            }

            response = client.post("/api/chat/stream_with_tts", json={
                "session_id": "test",
                "question": "灵山大佛多高？",
            })

            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")
            body = response.text
            assert "event: faq_hit" in body
            assert "event: tts_audio" in body
            assert "event: tts_phonemes" in body
            assert "event: done" in body
            assert "灵山大佛高88米" in body

    def test_stream_with_tts_exact_cache(self):
        """Should return done + tts_audio for exact cache hit."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "answer": "cached answer",
            "source": "faq",
        }, ensure_ascii=False))

        async def fake_tts():
            yield {"type": "audio", "data": "YmFzZTY0"}
            yield {"type": "done", "duration_ms": 500}

        with patch("app.api.chat.get_redis", return_value=mock_redis), \
             patch("app.api.chat._get_active_voice_id", new_callable=AsyncMock, return_value="mandarin"), \
             patch("app.api.chat.synthesize_stream", return_value=fake_tts()):

            response = client.post("/api/chat/stream_with_tts", json={
                "session_id": "test",
                "question": "热门问题",
            })

            assert response.status_code == 200
            body = response.text
            assert "event: done" in body
            assert "event: tts_audio" in body

    def test_stream_with_tts_restroom_bypasses_exact_cache_and_llm(self):
        """Restroom questions should not reuse stale scenic narration cache."""
        async def fake_tts():
            yield {"type": "done", "duration_ms": 300}

        stale_answer = "九龙灌浴依据释迦牟尼诞生传说打造，莲花绽放、太子佛升起。"

        with patch("app.api.chat._check_exact_cache", new_callable=AsyncMock, return_value={
            "answer": stale_answer,
            "source": "cache",
        }) as mock_exact_cache, \
             patch("app.api.chat.process_chat", new_callable=AsyncMock) as mock_process, \
             patch("app.api.chat._get_active_voice_id", new_callable=AsyncMock, return_value="mandarin"), \
             patch("app.api.chat.synthesize_stream", return_value=fake_tts()), \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
             patch("app.api.chat.finalize_chat", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock):

            response = client.post("/api/chat/stream_with_tts", json={
                "session_id": "test",
                "question": (
                    "当前互动大屏点位：九龙灌浴（当前点位 · 九龙灌浴广场）。\n"
                    "请优先围绕当前点位回答。\n"
                    "游客问题：厕所在哪里？"
                ),
            })

            assert response.status_code == 200
            body = response.text
            assert "event: done" in body
            assert "service_guide" in body
            assert "九龙灌浴广场" in body
            assert "卫生间 / WC / 游客服务中心" in body
            assert "莲花绽放" not in body
            mock_exact_cache.assert_not_called()
            mock_process.assert_not_called()

    def test_stream_with_tts_greeting_bypasses_exact_cache_and_llm(self):
        """Short greetings should not run through cached scenic/RAG answers."""
        async def fake_tts():
            yield {"type": "done", "duration_ms": 200}

        with patch("app.api.chat._check_exact_cache", new_callable=AsyncMock, return_value={
            "answer": "cached scenic answer",
            "source": "cache",
        }) as mock_exact_cache, \
             patch("app.api.chat.process_chat", new_callable=AsyncMock) as mock_process, \
             patch("app.api.chat._get_active_voice_id", new_callable=AsyncMock, return_value="mandarin"), \
             patch("app.api.chat.synthesize_stream", return_value=fake_tts()), \
             patch("app.api.chat.finalize_chat", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock):

            response = client.post("/api/chat/stream_with_tts", json={
                "session_id": "test",
                "question": (
                    "当前互动大屏点位：九龙灌浴（当前点位 · 九龙灌浴广场）。\n"
                    "请优先围绕当前点位回答。\n"
                    "游客问题：你好"
                ),
            })

            assert response.status_code == 200
            body = response.text
            assert "event: done" in body
            assert "smalltalk" in body
            assert "你现在位于九龙灌浴" in body
            assert "cached scenic answer" not in body
            mock_exact_cache.assert_not_called()
            mock_process.assert_not_called()

    def test_stream_with_tts_tts_failure_is_non_fatal(self):
        """TTS failure should not mark the whole chat answer as failed."""
        async def failing_tts():
            raise RuntimeError("TTS down")
            yield  # pragma: no cover

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq, \
             patch("app.api.chat._get_active_voice_id", new_callable=AsyncMock, return_value="mandarin"), \
             patch("app.api.chat.synthesize_stream", return_value=failing_tts()), \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock):

            mock_faq.return_value = {
                "answer": "灵山大佛高88米。",
                "faq_id": 3,
            }

            response = client.post("/api/chat/stream_with_tts", json={
                "session_id": "test",
                "question": "灵山大佛多高？",
            })

            assert response.status_code == 200
            body = response.text
            assert "event: faq_hit" in body
            assert "event: tts_error" in body
            assert "event: done" in body
            assert "event: error" not in body
            assert "灵山大佛高88米" in body

    @pytest.mark.asyncio
    async def test_stream_with_tts_rag(self):
        """Should stream tokens then tts events for RAG answer."""
        async def fake_stream():
            for token in ["灵", "山", "大", "佛"]:
                yield token

        async def fake_tts():
            yield {"type": "audio", "data": "YmFzZTY0"}
            yield {"type": "phonemes", "data": [{"char": "灵"}]}
            yield {"type": "done", "duration_ms": 1200}

        with patch("app.services.chat_service.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.get_similar", new_callable=AsyncMock, return_value=None), \
             patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.services.chat_service.route_stream", return_value=fake_stream()) as mock_route, \
             patch("app.api.chat._get_active_voice_id", new_callable=AsyncMock, return_value="mandarin"), \
             patch("app.api.chat.synthesize_stream", return_value=fake_tts()), \
             patch("app.api.chat._set_exact_cache", new_callable=AsyncMock), \
             patch("app.api.chat._log_interaction", new_callable=AsyncMock), \
             patch("app.core.llm.analyze_sentiment", new_callable=AsyncMock, return_value=(0.8, "positive")):

            mock_retrieve.return_value = [
                {"text": "灵山大佛高88米", "score": 0.95, "rerank_score": 0.98},
            ]

            response = client.post("/api/chat/stream_with_tts", json={
                "session_id": "test",
                "question": "灵山大佛多高？",
            })

            assert response.status_code == 200
            body = response.text
            assert "event: token" in body
            assert "event: tts_audio" in body
            assert "event: tts_phonemes" in body
            assert "event: done" in body
            assert "灵山" in body
