"""Tests for WebSocket chat API."""
import json
import pytest
from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient

from app.main import app


client = TestClient(app)


class TestWebSocketChat:
    """Test WebSocket /ws/chat endpoint."""

    def test_ws_faq_hit(self):
        """Should return answer via WebSocket when FAQ matches."""
        with patch("app.api.ws.search_faq", new_callable=AsyncMock) as mock_faq:
            mock_faq.return_value = {"answer": "门票210元", "faq_id": 5}

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
        with patch("app.api.ws.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.api.ws.retrieve", new_callable=AsyncMock) as mock_retrieve, \
             patch("app.api.ws.route", new_callable=AsyncMock, return_value="88米高"), \
             patch("app.core.llm.analyze_sentiment", new_callable=AsyncMock, return_value=(0.9, "positive")):

            mock_retrieve.return_value = [
                {"text": "灵山大佛高88米", "score": 0.95, "rerank_score": 0.98},
            ]

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
        with patch("app.api.ws.search_faq", new_callable=AsyncMock, return_value=None), \
             patch("app.api.ws.retrieve", new_callable=AsyncMock, return_value=[]), \
             patch("app.api.ws.route", new_callable=AsyncMock, side_effect=RuntimeError("down")):

            with client.websocket_connect("/ws/chat") as websocket:
                websocket.send_json({
                    "session_id": "ws-test",
                    "question": "test",
                    "type": "text",
                })
                response = websocket.receive_json()

                assert response["type"] == "error"
                assert "不可用" in response["message"]
