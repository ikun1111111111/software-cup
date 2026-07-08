"""Tests for WebSocket voice message handling."""
import json
import base64
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestWebSocketVoice:
    """Test WebSocket voice message flow via TestClient."""

    def test_voice_message_full_pipeline(self):
        """Voice message: base64 decode → ASR → chat → TTS → response."""
        fake_audio = b"\x00\x01\x02\x03"
        fake_b64 = base64.b64encode(fake_audio).decode("utf-8")

        with patch("app.api.ws.transcribe", new_callable=AsyncMock, return_value="灵山大佛多高？"), \
             patch("app.api.ws.synthesize_cached", new_callable=AsyncMock) as mock_tts, \
             patch("app.api.ws.search_faq", new_callable=AsyncMock) as mock_faq:

            mock_tts.return_value = MagicMock(
                audio_bytes=b"fake_audio_out",
                phoneme_timestamps=[{"phoneme": "灵", "start": 0.0, "end": 0.1}],
            )
            mock_faq.return_value = {
                "answer": "灵山大佛高88米",
                "faq_id": 3,
            }

            with client.websocket_connect("/ws/chat") as ws:
                ws.send_json({
                    "session_id": "test_voice",
                    "type": "voice",
                    "audio_base64": fake_b64,
                })
                response = ws.receive_json()
                assert response["type"] == "voice_answer"
                assert response["asr_text"] == "灵山大佛多高？"
                assert response["answer"] == "灵山大佛高88米"
                assert response["source"] == "faq"
                assert "audio_base64" in response
                assert len(response["phonemes"]) > 0

    def test_voice_invalid_base64(self):
        """Invalid base64 should return error."""
        with client.websocket_connect("/ws/chat") as ws:
            ws.send_json({
                "session_id": "test_voice",
                "type": "voice",
                "audio_base64": "not_valid_base64!!!",
            })
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "audio_base64" in response["message"].lower() or "Invalid" in response["message"]

    def test_voice_missing_audio(self):
        """Missing audio_base64 should return error."""
        with client.websocket_connect("/ws/chat") as ws:
            ws.send_json({
                "session_id": "test_voice",
                "type": "voice",
            })
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "audio_base64" in response["message"].lower()

    def test_voice_asr_failure(self):
        """ASR failure should return error."""
        fake_b64 = base64.b64encode(b"\x00").decode("utf-8")
        with patch("app.api.ws.transcribe", side_effect=Exception("ASR down")):
            with client.websocket_connect("/ws/chat") as ws:
                ws.send_json({
                    "session_id": "test_voice",
                    "type": "voice",
                    "audio_base64": fake_b64,
                })
                response = ws.receive_json()
                assert response["type"] == "error"
                assert "语音识别" in response["message"]

    def test_voice_asr_empty_result(self):
        """ASR empty result should return error."""
        fake_b64 = base64.b64encode(b"\x00").decode("utf-8")
        with patch("app.api.ws.transcribe", new_callable=AsyncMock, return_value=""):
            with client.websocket_connect("/ws/chat") as ws:
                ws.send_json({
                    "session_id": "test_voice",
                    "type": "voice",
                    "audio_base64": fake_b64,
                })
                response = ws.receive_json()
                assert response["type"] == "error"
                assert "语音识别" in response["message"]

    def test_voice_tts_failure_graceful(self):
        """TTS failure should still return text answer without audio."""
        fake_b64 = base64.b64encode(b"\x00").decode("utf-8")
        with patch("app.api.ws.transcribe", new_callable=AsyncMock, return_value="多高？"), \
             patch("app.api.ws.synthesize_cached", side_effect=Exception("TTS down")) as _, \
             patch("app.api.ws.search_faq", new_callable=AsyncMock) as mock_faq:

            mock_faq.return_value = {"answer": "88米", "faq_id": 1}

            with client.websocket_connect("/ws/chat") as ws:
                ws.send_json({
                    "session_id": "test_voice",
                    "type": "voice",
                    "audio_base64": fake_b64,
                })
                response = ws.receive_json()
                assert response["type"] == "voice_answer"
                assert response["answer"] == "88米"
                assert response["audio_base64"] == ""
                assert response["phonemes"] == []

    def test_text_message_via_ws(self):
        """Text message via WebSocket should work."""
        with patch("app.api.ws.search_faq", new_callable=AsyncMock) as mock_faq:

            mock_faq.return_value = {"answer": "无锡", "faq_id": 2}

            with client.websocket_connect("/ws/chat") as ws:
                ws.send_json({
                    "session_id": "test_text",
                    "type": "text",
                    "question": "灵山胜境在哪里？",
                })
                response = ws.receive_json()
                assert response["type"] == "answer"
                assert response["answer"] == "无锡"
                assert response["source"] == "faq"

    def test_invalid_json(self):
        """Invalid JSON should return error."""
        with client.websocket_connect("/ws/chat") as ws:
            ws.send_text("not json at all")
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "Invalid JSON" in response["message"]

    def test_missing_session_id(self):
        """Missing session_id should return error."""
        with client.websocket_connect("/ws/chat") as ws:
            ws.send_json({"type": "text", "question": "test"})
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "session_id" in response["message"].lower()
