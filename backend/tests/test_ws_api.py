"""Tests for WebSocket chat API."""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from starlette.testclient import TestClient

from app.main import app


client = TestClient(app)


def _mock_session_ctx():
    mock_db = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_db)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=False)
    return mock_session_ctx


def _chat_result(answer: str, source: str = "rag") -> dict:
    return {
        "answer": answer,
        "source": source,
        "chunks": [{"text": answer, "score": 0.95}],
        "sentiment_score": 0.9,
        "sentiment_label": "positive",
    }


class TestWebSocketChat:
    """Test WebSocket /ws/chat endpoint."""

    def test_ws_faq_hit(self):
        """Should return answer via WebSocket when FAQ matches."""
        with patch("app.api.ws.process_chat", new_callable=AsyncMock) as mock_chat, \
             patch("app.api.ws.finalize_chat", new_callable=AsyncMock), \
             patch("app.api.ws.async_session", return_value=_mock_session_ctx()):
            mock_chat.return_value = _chat_result("门票210元", source="faq")

            with client.websocket_connect("/ws/chat") as websocket:
                websocket.send_json({
                    "session_id": "ws-test",
                    "question": "门票多少钱？",
                    "type": "text",
                })
                response = websocket.receive_json()

                assert response["type"] == "answer"
                assert response["answer"] == "门票210元"
                assert response["source"] == "faq"

    def test_ws_rag_answer(self):
        """Should return RAG-based answer via WebSocket."""
        with patch("app.api.ws.process_chat", new_callable=AsyncMock) as mock_chat, \
             patch("app.api.ws.finalize_chat", new_callable=AsyncMock), \
             patch("app.api.ws.async_session", return_value=_mock_session_ctx()):
            mock_chat.return_value = _chat_result("88米高", source="rag")

            with client.websocket_connect("/ws/chat") as websocket:
                websocket.send_json({
                    "session_id": "ws-test",
                    "question": "灵山大佛多高？",
                    "type": "text",
                })
                response = websocket.receive_json()

                assert response["type"] == "answer"
                assert response["answer"] == "88米高"
                assert response["source"] == "rag"
                assert "chunks" in response

    def test_ws_invalid_json(self):
        """Should return error for invalid JSON."""
        with client.websocket_connect("/ws/chat") as websocket:
            websocket.send_text("not-json")
            response = websocket.receive_json()

            assert response["type"] == "error"
            assert "Invalid JSON" in response["message"]

    def test_ws_missing_fields(self):
        """Should return error when session_id or question is missing."""
        with client.websocket_connect("/ws/chat") as websocket:
            websocket.send_json({"session_id": "", "question": ""})
            response = websocket.receive_json()

            assert response["type"] == "error"
            assert "required" in response["message"].lower()

    def test_ws_llm_failure(self):
        """Should return error when LLM fails."""
        with patch("app.api.ws.process_chat", new_callable=AsyncMock, return_value={"answer": ""}), \
             patch("app.api.ws.async_session", return_value=_mock_session_ctx()):

            with client.websocket_connect("/ws/chat") as websocket:
                websocket.send_json({
                    "session_id": "ws-test",
                    "question": "test",
                    "type": "text",
                })
                response = websocket.receive_json()

                assert response["type"] == "error"
                assert "不可用" in response["message"]
