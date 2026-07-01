"""Tests for mobile ASR REST endpoint."""
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_transcribe_endpoint_accepts_mobile_multipart_audio(monkeypatch):
    mock_transcribe = AsyncMock(return_value="灵山胜境")
    monkeypatch.setattr("app.api.asr.transcribe_file", mock_transcribe)

    response = client.post(
        "/api/asr/transcribe",
        files={"audio": ("recording.m4a", b"fake audio", "audio/m4a")},
        data={"language": "zh-CN"},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "灵山胜境"}
    mock_transcribe.assert_awaited_once()
    assert mock_transcribe.await_args.kwargs["language"] == "zh"


def test_transcribe_endpoint_rejects_empty_audio(monkeypatch):
    mock_transcribe = AsyncMock(return_value="should not run")
    monkeypatch.setattr("app.api.asr.transcribe_file", mock_transcribe)

    response = client.post(
        "/api/asr/transcribe",
        files={"audio": ("recording.m4a", b"", "audio/m4a")},
        data={"language": "zh-CN"},
    )

    assert response.status_code == 400
    assert "空" in response.json()["detail"]
    mock_transcribe.assert_not_awaited()
