"""Integration tests: WebSocket voice chat full pipeline.

Covers: WS receive → base64 decode → ASR transcribe → chat pipeline → TTS synthesize → WS send.
Mocks external ASR/TTS and internal chat dependencies, WS protocol stack runs real via TestClient.
"""
import base64
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ── Helper ───────────────────────────────────────────────────────────────────


def _make_voice_msg(session_id: str, audio_bytes: bytes) -> dict:
    return {
        "session_id": session_id,
        "type": "voice",
        "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
    }


def _make_text_msg(session_id: str, question: str) -> dict:
    return {
        "session_id": session_id,
        "type": "text",
        "question": question,
    }


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
        "chunks": [{"text": "灵山大佛高88米", "score": 0.9}],
        "sentiment_score": 0.8,
        "sentiment_label": "positive",
    }


# ── Integration: text message through WebSocket ──────────────────────────────


def test_ws_text_full_pipeline(monkeypatch):
    """Integration: text question → chat pipeline → answer via WebSocket."""
    fake_answer = "灵山大佛高88米。"

    monkeypatch.setattr("app.api.ws.process_chat", AsyncMock(return_value=_chat_result(fake_answer)))
    monkeypatch.setattr("app.api.ws.finalize_chat", AsyncMock())
    monkeypatch.setattr("app.api.ws.async_session", lambda: _mock_session_ctx())

    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json(_make_text_msg("ws_text_1", "灵山大佛多高"))
        resp = websocket.receive_json()

    assert resp["type"] == "answer"
    assert resp["answer"] == fake_answer
    assert resp["source"] == "rag"
    assert "latency_ms" in resp


# ── Integration: voice message full pipeline ─────────────────────────────────


def test_ws_voice_full_pipeline(monkeypatch):
    """Integration: voice → ASR → chat → TTS → voice_answer."""
    fake_asr_text = "灵山大佛有多高"
    fake_answer = "灵山大佛高88米"
    fake_audio_bytes = b"\x00\x01\x02"  # fake wav

    # Patch ASR
    monkeypatch.setattr("app.api.ws.transcribe", AsyncMock(return_value=fake_asr_text))

    monkeypatch.setattr("app.api.ws.process_chat", AsyncMock(return_value=_chat_result(fake_answer)))
    monkeypatch.setattr("app.api.ws.finalize_chat", AsyncMock())

    # Patch TTS
    fake_tts_result = MagicMock()
    fake_tts_result.audio_bytes = fake_audio_bytes
    fake_tts_result.phoneme_timestamps = [{"phoneme": "灵", "start": 0.0, "end": 0.2}]
    monkeypatch.setattr("app.api.ws.synthesize_cached", AsyncMock(return_value=fake_tts_result))

    monkeypatch.setattr("app.api.ws.async_session", lambda: _mock_session_ctx())

    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json(_make_voice_msg("voice_session_1", b"fake_audio_data"))
        resp = websocket.receive_json()

    assert resp["type"] == "voice_answer"
    assert resp["asr_text"] == fake_asr_text
    assert resp["answer"] == fake_answer
    assert resp["source"] == "rag"
    assert resp["audio_base64"] == base64.b64encode(fake_audio_bytes).decode("utf-8")
    assert len(resp["phonemes"]) > 0
    assert "latency_ms" in resp
    assert "sentiment_score" in resp


# ── Integration: ASR failure graceful handling ───────────────────────────────


def test_ws_voice_asr_failure(monkeypatch):
    """Integration: ASR fails, WS returns error but keeps connection alive."""
    monkeypatch.setattr("app.api.ws.transcribe", AsyncMock(return_value="[语音识别失败，请重试]"))

    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json(_make_voice_msg("voice_session_2", b"bad_audio"))
        resp = websocket.receive_json()

    assert resp["type"] == "error"
    assert "语音识别" in resp["message"] or "为空" in resp["message"]


# ── Integration: TTS failure graceful handling ───────────────────────────────


def test_ws_voice_tts_failure_graceful(monkeypatch):
    """Integration: TTS fails, still returns text answer with empty audio."""
    fake_asr_text = "你好"
    fake_answer = "你好，欢迎来到灵山胜境！"

    monkeypatch.setattr("app.api.ws.transcribe", AsyncMock(return_value=fake_asr_text))
    monkeypatch.setattr("app.api.ws.process_chat", AsyncMock(return_value=_chat_result(fake_answer)))
    monkeypatch.setattr("app.api.ws.finalize_chat", AsyncMock())

    # TTS raises exception
    monkeypatch.setattr("app.api.ws.synthesize_cached", AsyncMock(side_effect=RuntimeError("TTS down")))

    monkeypatch.setattr("app.api.ws.async_session", lambda: _mock_session_ctx())

    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json(_make_voice_msg("voice_session_3", b"audio"))
        resp = websocket.receive_json()

    assert resp["type"] == "voice_answer"
    assert resp["answer"] == fake_answer
    assert resp["audio_base64"] == ""  # empty audio on TTS failure
    assert resp["phonemes"] == []


# ── Integration: invalid base64 audio ────────────────────────────────────────


def test_ws_voice_invalid_base64():
    """Integration: invalid base64 returns error, connection stays alive."""
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json({
            "session_id": "voice_session_4",
            "type": "voice",
            "audio_base64": "!!!not_valid_base64!!!",
        })
        resp = websocket.receive_json()

    assert resp["type"] == "error"
    assert "Invalid audio_base64" in resp["message"]


# ── Integration: missing session_id ──────────────────────────────────────────


def test_ws_missing_session_id():
    """Integration: missing session_id returns error."""
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json({"type": "text", "question": "hello"})
        resp = websocket.receive_json()

    assert resp["type"] == "error"
    assert "session_id" in resp["message"]


# ── Integration: invalid JSON ────────────────────────────────────────────────


def test_ws_invalid_json():
    """Integration: invalid JSON returns error."""
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_text("not json at all")
        resp = websocket.receive_json()

    assert resp["type"] == "error"
    assert "Invalid JSON" in resp["message"]
