"""Tests for TTS streaming API and streaming synthesis."""
import pytest
from unittest.mock import patch, AsyncMock

from app.core.tts import TTSResult, synthesize_stream


class TestTTSStreaming:
    """Test TTS streaming functionality."""

    @pytest.mark.asyncio
    async def test_synthesize_stream_empty(self):
        """Empty text should yield only done event."""
        chunks = []
        async for chunk in synthesize_stream(""):
            chunks.append(chunk)
        assert len(chunks) == 1
        assert chunks[0]["type"] == "done"
        assert chunks[0]["duration_ms"] == 0

    @pytest.mark.asyncio
    async def test_synthesize_stream_yields_audio(self):
        """Should yield audio chunks as base64."""
        with patch("app.core.tts._get_cached", new_callable=AsyncMock) as mock_cached:
            mock_cached.return_value = TTSResult(
                audio_bytes=b"\x00" * 8192,
                phoneme_timestamps=[{"char": "测", "start_ms": 0, "end_ms": 100, "mouth_shape": "closed"}],
                duration_ms=100,
            )

            chunks = []
            async for chunk in synthesize_stream("测试", chunk_size=4096):
                chunks.append(chunk)

            audio_chunks = [c for c in chunks if c["type"] == "audio"]
            phoneme_chunks = [c for c in chunks if c["type"] == "phonemes"]
            done_chunks = [c for c in chunks if c["type"] == "done"]

            assert len(audio_chunks) >= 1
            assert len(phoneme_chunks) == 1
            assert len(done_chunks) == 1
            assert done_chunks[0]["duration_ms"] == 100

    @pytest.mark.asyncio
    async def test_synthesize_stream_phonemes_schema(self):
        """Phonemes should match PLAN schema."""
        with patch("app.core.tts._get_cached", new_callable=AsyncMock) as mock_cached:
            mock_cached.return_value = TTSResult(
                audio_bytes=b"\x00" * 100,
                phoneme_timestamps=[
                    {"char": "你", "start_ms": 0, "end_ms": 50, "mouth_shape": "closed"},
                    {"char": "好", "start_ms": 50, "end_ms": 100, "mouth_shape": "open"},
                ],
                duration_ms=100,
            )

            chunks = []
            async for chunk in synthesize_stream("你好"):
                chunks.append(chunk)

            phoneme_chunk = next(c for c in chunks if c["type"] == "phonemes")
            phonemes = phoneme_chunk["data"]
            assert len(phonemes) == 2
            for p in phonemes:
                assert "char" in p
                assert "start_ms" in p
                assert "end_ms" in p
                assert "mouth_shape" in p

    @pytest.mark.asyncio
    async def test_synthesize_stream_no_audio(self):
        """Should handle streaming TTS failure gracefully."""
        with patch("app.core.tts._get_cached", new_callable=AsyncMock, return_value=None), \
             patch("edge_tts.Communicate", side_effect=RuntimeError("TTS down")):

            chunks = []
            async for chunk in synthesize_stream("测试"):
                chunks.append(chunk)

            audio_chunks = [c for c in chunks if c["type"] == "audio"]
            assert len(audio_chunks) == 0
            assert any(c["type"] == "tts_error" for c in chunks)
            assert any(c["type"] == "phonemes" for c in chunks)
            assert any(c["type"] == "done" for c in chunks)
