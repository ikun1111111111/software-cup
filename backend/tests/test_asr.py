"""Tests for ASR (Automatic Speech Recognition)."""
import io
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.core.asr import transcribe, transcribe_file
from app.main import app


client = TestClient(app)


class TestASR:
    """Test ASR transcription with fallback behavior."""

    @pytest.mark.asyncio
    async def test_transcribe_empty(self):
        """Empty audio should return empty string."""
        result = await transcribe(b"")
        assert result == ""

    @pytest.mark.asyncio
    async def test_transcribe_too_short(self):
        """Very short audio should return empty string."""
        result = await transcribe(b"\x00" * 50)
        assert result == ""

    @pytest.mark.asyncio
    async def test_transcribe_fallback_no_model(self):
        """Should return fallback text when model is not available."""
        # faster-whisper is not installed, so _get_whisper_model will raise
        result = await transcribe(b"\x00" * 1000)
        assert "语音服务暂不可用" in result

    @pytest.mark.asyncio
    async def test_transcribe_with_mock_model(self):
        """Should transcribe when model is available."""
        mock_segment = MagicMock()
        mock_segment.text = "  灵山胜境  "

        mock_info = MagicMock()
        mock_info.language = "zh"
        mock_info.language_probability = 0.95

        mock_model = MagicMock()
        mock_model.transcribe.return_value = ([mock_segment], mock_info)

        with patch("app.core.asr._get_whisper_model", return_value=mock_model):
            result = await transcribe(b"\x00" * 1000)
            assert "灵山胜境" in result
            mock_model.transcribe.assert_called_once()

    @pytest.mark.asyncio
    async def test_transcribe_file(self):
        """Should read file and transcribe."""
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(b"\x00" * 1000)
            tmp_path = tmp.name

        result = await transcribe_file(tmp_path)
        # Will fallback since no real model
        assert isinstance(result, str)


class TestASRAPI:
    """Test POST /api/asr endpoint."""

    def test_asr_api_rejects_non_audio(self):
        """Should reject non-audio uploads."""
        response = client.post("/api/asr", files={"audio": ("test.txt", io.BytesIO(b"not audio"), "text/plain")})
        assert response.status_code == 400

    def test_asr_api_rejects_short_audio(self):
        """Should reject too-short audio."""
        response = client.post("/api/asr", files={"audio": ("test.wav", io.BytesIO(b"\x00" * 50), "audio/wav")})
        assert response.status_code == 400

    def test_asr_api_transcribes(self):
        """Should return transcribed text."""
        with patch("app.api.asr.transcribe", new_callable=AsyncMock, return_value="灵山胜境"):
            response = client.post("/api/asr", files={"audio": ("test.wav", io.BytesIO(b"\x00" * 1000), "audio/wav")})
            assert response.status_code == 200
            assert response.json()["text"] == "灵山胜境"
