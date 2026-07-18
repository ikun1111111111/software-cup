import base64
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_audio_ticket_streams_raw_mp3_chunks():
    async def fake_synthesize_stream(text, voice_id=None, chunk_size=16384):
        assert text == "fast voice"
        assert voice_id == "mandarin"
        yield {"type": "audio", "data": base64.b64encode(b"first-").decode()}
        yield {"type": "audio", "data": base64.b64encode(b"second").decode()}
        yield {"type": "phonemes", "data": []}
        yield {"type": "done", "duration_ms": 500}

    ticket_response = client.post(
        "/api/tts/stream-ticket",
        json={"text": "fast voice", "voice_id": "mandarin"},
    )

    assert ticket_response.status_code == 200
    ticket = ticket_response.json()["ticket"]

    with patch("app.api.tts.synthesize_stream", new=fake_synthesize_stream):
        audio_response = client.get(f"/api/tts/audio/{ticket}")

    assert audio_response.status_code == 200
    assert audio_response.headers["content-type"].startswith("audio/mpeg")
    assert audio_response.content == b"first-second"


def test_audio_ticket_rejects_unknown_ticket():
    response = client.get("/api/tts/audio/not-a-ticket")

    assert response.status_code == 404
