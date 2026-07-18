"""Tests for TTS streaming API and streaming synthesis."""
import asyncio
import base64
import sys
import threading
from types import ModuleType, SimpleNamespace

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

        class FakeHttpSpeechSynthesizer:
            @classmethod
            def call(cls, **kwargs):
                assert kwargs["stream"] is True
                assert kwargs["audio_format"] == "mp3"

                def chunks():
                    yield SimpleNamespace(audio_url=None, audio_data=b"first")
                    release_completion.wait(timeout=1)
                    yield SimpleNamespace(audio_url=None, audio_data=b"second")
                    yield SimpleNamespace(
                        audio_url="https://example.test/full.mp3",
                        audio_data=b"duplicate-full-audio",
                    )

                return chunks()

        dashscope_module = ModuleType("dashscope")
        audio_module = ModuleType("dashscope.audio")
        http_tts_module = ModuleType("dashscope.audio.http_tts")
        http_speech_module = ModuleType(
            "dashscope.audio.http_tts.http_speech_synthesizer"
        )
        http_speech_module.HttpSpeechSynthesizer = FakeHttpSpeechSynthesizer
        monkeypatch.setitem(sys.modules, "dashscope", dashscope_module)
        monkeypatch.setitem(sys.modules, "dashscope.audio", audio_module)
        monkeypatch.setitem(sys.modules, "dashscope.audio.http_tts", http_tts_module)
        monkeypatch.setitem(
            sys.modules,
            "dashscope.audio.http_tts.http_speech_synthesizer",
            http_speech_module,
        )

        with patch("app.core.tts.settings.qwen_api_key", "configured"), \
             patch("app.core.tts._get_cached", new_callable=AsyncMock, return_value=None), \
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
    async def test_synthesize_stream_drops_final_aggregate_audio_without_url(
        self,
        monkeypatch,
    ):
        class FakeHttpSpeechSynthesizer:
            @classmethod
            def call(cls, **kwargs):
                assert kwargs["stream"] is True

                def chunks():
                    yield SimpleNamespace(audio_url=None, audio_data=b"first-")
                    yield SimpleNamespace(audio_url=None, audio_data=b"second")
                    # DashScope's HTTP SDK emits the full joined audio again
                    # for the final stop event, even when no audio URL exists.
                    yield SimpleNamespace(
                        audio_url=None,
                        audio_data=b"first-second",
                    )

                return chunks()

        dashscope_module = ModuleType("dashscope")
        audio_module = ModuleType("dashscope.audio")
        http_tts_module = ModuleType("dashscope.audio.http_tts")
        http_speech_module = ModuleType(
            "dashscope.audio.http_tts.http_speech_synthesizer"
        )
        http_speech_module.HttpSpeechSynthesizer = FakeHttpSpeechSynthesizer
        monkeypatch.setitem(sys.modules, "dashscope", dashscope_module)
        monkeypatch.setitem(sys.modules, "dashscope.audio", audio_module)
        monkeypatch.setitem(sys.modules, "dashscope.audio.http_tts", http_tts_module)
        monkeypatch.setitem(
            sys.modules,
            "dashscope.audio.http_tts.http_speech_synthesizer",
            http_speech_module,
        )

        with patch("app.core.tts.settings.qwen_api_key", "configured"), \
             patch("app.core.tts._get_cached", new_callable=AsyncMock, return_value=None), \
             patch("app.core.tts._set_cache", new_callable=AsyncMock):
            events = [
                event
                async for event in synthesize_stream(
                    "只播放一次",
                    "female",
                    chunk_size=64,
                )
            ]

        audio = b"".join(
            base64.b64decode(event["data"])
            for event in events
            if event["type"] == "audio"
        )
        assert audio == b"first-second"

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
            assert not any(c["type"] == "phonemes" for c in chunks)
            assert any(c["type"] == "done" for c in chunks)
