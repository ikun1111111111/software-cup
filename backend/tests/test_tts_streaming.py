"""Tests for TTS streaming API and streaming synthesis."""
import asyncio
import base64
import sys
import threading
from types import ModuleType

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
    async def test_synthesize_stream_yields_cosyvoice_audio_before_completion(
        self,
        monkeypatch,
    ):
        release_completion = threading.Event()

        class FakeResultCallback:
            pass

        class FakeAudioFormat:
            MP3_22050HZ_MONO_256KBPS = "mp3"

        class FakeSpeechSynthesizer:
            def __init__(self, *, callback=None, **_kwargs):
                self.callback = callback

            def call(self, _text, **_kwargs):
                return None

            def streaming_call(self, _text):
                self.callback.on_data(b"first")

            def streaming_complete(self, _timeout_millis):
                release_completion.wait(timeout=1)
                self.callback.on_data(b"second")
                self.callback.on_complete()

        async def empty_edge_stream(_text, _voice, _chunk_size, queue):
            await queue.put(None)

        dashscope_module = ModuleType("dashscope")
        audio_module = ModuleType("dashscope.audio")
        tts_v2_module = ModuleType("dashscope.audio.tts_v2")
        tts_v2_module.AudioFormat = FakeAudioFormat
        tts_v2_module.ResultCallback = FakeResultCallback
        tts_v2_module.SpeechSynthesizer = FakeSpeechSynthesizer
        monkeypatch.setitem(sys.modules, "dashscope", dashscope_module)
        monkeypatch.setitem(sys.modules, "dashscope.audio", audio_module)
        monkeypatch.setitem(sys.modules, "dashscope.audio.tts_v2", tts_v2_module)
        monkeypatch.setitem(sys.modules, "edge_tts", ModuleType("edge_tts"))

        with patch("app.core.tts.settings.qwen_api_key", "configured"), \
             patch("app.core.tts._get_cached", new_callable=AsyncMock, return_value=None), \
             patch("app.core.tts._synthesize_edge_stream", new=empty_edge_stream), \
             patch("app.core.tts._set_cache", new_callable=AsyncMock) as mock_set_cache:
            stream = synthesize_stream("你好", "female", chunk_size=64)
            try:
                first_event = await asyncio.wait_for(anext(stream), timeout=0.2)
            finally:
                release_completion.set()

            remaining_events = [event async for event in stream]

        assert first_event["type"] == "audio"
        assert base64.b64decode(first_event["data"]) == b"first"
        assert [event["type"] for event in remaining_events] == [
            "audio",
            "phonemes",
            "done",
        ]
        mock_set_cache.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_synthesize_stream_no_audio(self, monkeypatch):
        """Should handle streaming TTS failure gracefully."""
        async def empty_edge_stream(_text, _voice, _chunk_size, queue):
            await queue.put(None)

        monkeypatch.setitem(sys.modules, "edge_tts", ModuleType("edge_tts"))

        with patch("app.core.tts._get_cached", new_callable=AsyncMock, return_value=None), \
             patch("app.core.tts.settings.qwen_api_key", ""), \
             patch("app.core.tts.settings.azure_speech_key", ""), \
             patch("app.core.tts.settings.azure_speech_region", ""), \
             patch("app.core.tts._synthesize_edge_stream", new=empty_edge_stream):

            async def collect_events():
                return [chunk async for chunk in synthesize_stream("测试")]

            chunks = await asyncio.wait_for(collect_events(), timeout=1)

            audio_chunks = [c for c in chunks if c["type"] == "audio"]
            assert len(audio_chunks) == 0
            assert any(c["type"] == "tts_error" for c in chunks)
            assert any(c["type"] == "phonemes" for c in chunks)
            assert any(c["type"] == "done" for c in chunks)
