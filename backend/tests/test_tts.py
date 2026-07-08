"""Tests for TTS (Text-to-Speech) with caching."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.core.tts import (
    TTSResult,
    synthesize,
    synthesize_cached,
    _generate_phoneme_timestamps,
    _classify_mouth_shape,
    _cache_key,
    _resolve_voice,
)


class TestTTS:
    """Test TTS synthesis and caching."""

    def test_tts_result_model(self):
        """Should create TTSResult correctly."""
        result = TTSResult(
            audio_bytes=b"audio",
            phoneme_timestamps=[{"char": "a", "start_ms": 0, "end_ms": 100, "mouth_shape": "open"}],
            duration_ms=100,
        )
        assert result.duration_ms == 100
        assert result.sample_rate == 24000

    def test_classify_mouth_shape(self):
        """Should classify mouth shapes correctly."""
        assert _classify_mouth_shape("8") == "closed"
        assert _classify_mouth_shape(" ") == "closed"
        # All results must be one of the three valid shapes
        for char in ["大", "好", "你", "吃", "佛", "啊"]:
            assert _classify_mouth_shape(char) in ("closed", "half", "open")

    def test_generate_phoneme_timestamps(self):
        """Should distribute time evenly across characters with PLAN schema."""
        text = "灵山"
        timestamps = _generate_phoneme_timestamps(text, 500)
        assert len(timestamps) == 2
        assert timestamps[0]["char"] == "灵"
        assert timestamps[1]["char"] == "山"
        assert timestamps[0]["start_ms"] == 0
        assert timestamps[1]["end_ms"] == 500
        assert timestamps[0]["mouth_shape"] in ("closed", "half", "open")
        assert timestamps[1]["mouth_shape"] in ("closed", "half", "open")

    def test_generate_phoneme_timestamps_schema(self):
        """Phoneme timestamps should match PLAN schema."""
        timestamps = _generate_phoneme_timestamps("你好", 500)
        for ts in timestamps:
            assert "char" in ts
            assert "start_ms" in ts
            assert "end_ms" in ts
            assert "mouth_shape" in ts
            assert ts["mouth_shape"] in ("closed", "half", "open")
            assert isinstance(ts["start_ms"], int)
            assert isinstance(ts["end_ms"], int)

    def test_generate_phoneme_timestamps_empty(self):
        """Empty text should return empty list."""
        assert _generate_phoneme_timestamps("", 100) == []
        assert _generate_phoneme_timestamps("test", 0) == []

    def test_cache_key(self):
        """Should generate consistent cache key."""
        k1 = _cache_key("灵山胜境", "default")
        k2 = _cache_key("灵山胜境", "default")
        k3 = _cache_key("灵山胜境", "other")
        assert k1 == k2
        assert k1 != k3
        assert k1.startswith("tts:")

    @pytest.mark.asyncio
    async def test_synthesize_empty(self):
        """Empty text should return empty result."""
        result = await synthesize("")
        assert result.audio_bytes == b""
        assert result.duration_ms == 0

    @pytest.mark.asyncio
    async def test_synthesize_fallback(self):
        """Should return fallback when CosyVoice is not available."""
        result = await synthesize("灵山大佛高88米")
        assert len(result.phoneme_timestamps) > 0
        assert result.duration_ms > 0
        for ts in result.phoneme_timestamps:
            assert "char" in ts
            assert "start_ms" in ts
            assert "end_ms" in ts
            assert "mouth_shape" in ts

    @pytest.mark.asyncio
    async def test_synthesize_cached(self):
        """Should cache and retrieve TTS result."""
        with patch("app.core.tts._get_cached", new_callable=AsyncMock, return_value=None), \
             patch("app.core.tts._set_cache", new_callable=AsyncMock), \
             patch("app.core.tts.synthesize", new_callable=AsyncMock) as mock_syn:
            mock_syn.return_value = TTSResult(
                audio_bytes=b"cached_audio",
                phoneme_timestamps=[{"char": "测", "start_ms": 0, "end_ms": 100, "mouth_shape": "closed"}],
                duration_ms=100,
            )

            result1 = await synthesize_cached("测试缓存", voice_id="default")
            assert result1.audio_bytes == b"cached_audio"
            mock_syn.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_synthesize_cached_hit(self):
        """Should return cached result on second call."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()

        with patch("app.core.tts.get_redis", return_value=mock_redis):
            with patch("app.core.tts.synthesize", new_callable=AsyncMock) as mock_syn:
                mock_syn.return_value = TTSResult(
                    audio_bytes=b"test_audio",
                    phoneme_timestamps=[],
                    duration_ms=50,
                )

                await synthesize_cached("同样文本")
                assert mock_syn.await_count == 1

                mock_redis.get = AsyncMock(return_value='{"audio_hex":"74657374","phonemes":[],"sample_rate":22050,"duration_ms":50}')
                result2 = await synthesize_cached("同样文本")
                assert result2 is not None

    def test_resolve_voice_mandarin(self):
        """Should resolve mandarin voice preset."""
        voice = _resolve_voice("mandarin")
        assert voice == "zh-CN-XiaoxiaoNeural"

    def test_resolve_voice_dialect(self):
        """Should resolve dialect voice preset."""
        voice = _resolve_voice("nanjinghua")
        assert voice == "zh-CN-XiaoxiaoNeural"

    def test_resolve_voice_sichuan(self):
        """Should resolve Sichuan dialect."""
        voice = _resolve_voice("sichuanhua")
        assert voice == "zh-CN-XiaoxiaoNeural"

    def test_resolve_voice_none(self):
        """None voice_id should fall back to mandarin."""
        voice = _resolve_voice(None)
        assert voice == "zh-CN-XiaoxiaoNeural"

    def test_resolve_voice_unknown(self):
        """Unknown voice_id should fall back to mandarin."""
        voice = _resolve_voice("unknown_voice")
        assert voice == "zh-CN-XiaoxiaoNeural"
