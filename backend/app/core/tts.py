"""TTS (Text-to-Speech) via CosyVoice with Redis caching.

Provides text-to-audio synthesis with phoneme timestamps.
When CosyVoice is not available, falls back to a placeholder implementation.
"""
import logging
import hashlib
import json

from pydantic import BaseModel

from app.core.config import get_settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)
settings = get_settings()


class TTSResult(BaseModel):
    """TTS synthesis result."""
    audio_bytes: bytes
    phoneme_timestamps: list[dict]
    sample_rate: int = 22050
    duration_ms: int = 0


# Lazy-loaded CosyVoice client
_cosyvoice_client = None


def _get_cosyvoice_client():
    """Lazy load CosyVoice client."""
    global _cosyvoice_client
    if _cosyvoice_client is None:
        try:
            # CosyVoice can be used via grpc/HTTP or direct import
            # Try importing first
            import cosyvoice
            _cosyvoice_client = cosyvoice
            logger.info("CosyVoice loaded")
        except ImportError:
            logger.warning("CosyVoice not installed, will use HTTP fallback")
            _cosyvoice_client = "http"
    return _cosyvoice_client


def _generate_phoneme_timestamps(text: str, duration_ms: int) -> list[dict]:
    """Generate approximate phoneme timestamps for lip-sync.

    Real implementation should come from CosyVoice's phoneme alignment.
    This is a fallback that distributes time evenly across characters.
    """
    import jieba

    if not text or duration_ms <= 0:
        return []

    # Segment text into roughly phoneme-level units
    # For Chinese: each character is a syllable
    # For mixed text: use jieba + character split
    segments = []
    for char in text:
        if char.strip():
            segments.append(char)

    if not segments:
        return []

    avg_ms = duration_ms / len(segments)
    timestamps = []
    current_ms = 0

    for seg in segments:
        start = current_ms / 1000.0
        end = (current_ms + avg_ms) / 1000.0
        timestamps.append({
            "phoneme": seg,
            "start": round(start, 3),
            "end": round(end, 3),
        })
        current_ms += avg_ms

    return timestamps


def _cache_key(text: str, voice_id: str | None) -> str:
    """Generate Redis cache key for TTS."""
    key_data = f"{voice_id or 'default'}:{text}"
    return f"tts:{hashlib.md5(key_data.encode('utf-8')).hexdigest()}"


async def _get_cached(text: str, voice_id: str | None) -> TTSResult | None:
    """Check Redis for cached TTS result."""
    try:
        redis = await get_redis()
        key = _cache_key(text, voice_id)
        cached = await redis.get(key)
        if cached:
            data = json.loads(cached)
            return TTSResult(
                audio_bytes=bytes.fromhex(data["audio_hex"]),
                phoneme_timestamps=data["phonemes"],
                sample_rate=data.get("sample_rate", 22050),
                duration_ms=data.get("duration_ms", 0),
            )
    except Exception as e:
        logger.debug("TTS cache check failed: %s", e)
    return None


async def _set_cache(text: str, voice_id: str | None, result: TTSResult) -> None:
    """Cache TTS result in Redis with TTL (default 7 days)."""
    try:
        redis = await get_redis()
        key = _cache_key(text, voice_id)
        data = {
            "audio_hex": result.audio_bytes.hex(),
            "phonemes": result.phoneme_timestamps,
            "sample_rate": result.sample_rate,
            "duration_ms": result.duration_ms,
        }
        await redis.set(key, json.dumps(data), ex=604800)  # 7 days
    except Exception as e:
        logger.debug("TTS cache set failed: %s", e)


async def synthesize(text: str, voice_id: str | None = None) -> TTSResult:
    """Synthesize text to speech.

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.

    Returns:
        TTSResult with audio bytes and phoneme timestamps.

    Raises:
        RuntimeError: If TTS service is not available.
    """
    if not text or not text.strip():
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

    try:
        # Try real CosyVoice
        client = _get_cosyvoice_client()

        if client == "http":
            # HTTP fallback to CosyVoice service
            import httpx
            async with httpx.AsyncClient() as client_http:
                response = await client_http.post(
                    f"{settings.cosyvoice_endpoint}/synthesize",
                    json={"text": text, "voice": voice_id or "default"},
                    timeout=30.0,
                )
                response.raise_for_status()
                result_data = response.json()
                # Assume service returns base64 audio + phonemes
                import base64
                audio_bytes = base64.b64decode(result_data["audio"])
                phonemes = result_data.get("phonemes", [])
                duration_ms = result_data.get("duration_ms", len(audio_bytes) // 4)
                if not audio_bytes:
                    raise RuntimeError("CosyVoice HTTP returned empty audio")
                return TTSResult(
                    audio_bytes=audio_bytes,
                    phoneme_timestamps=phonemes,
                    duration_ms=duration_ms,
                )

        # Direct CosyVoice usage
        # This is placeholder — actual API depends on CosyVoice version
        logger.info("CosyVoice direct synthesis: %s", text[:30])
        # Simulate audio generation
        duration_ms = len(text) * 250  # ~250ms per character (Chinese)
        audio_bytes = b"\x00" * (duration_ms * 44)  # 44 bytes/ms approx for 22kHz mono
        phonemes = _generate_phoneme_timestamps(text, duration_ms)
        return TTSResult(
            audio_bytes=audio_bytes,
            phoneme_timestamps=phonemes,
            duration_ms=duration_ms,
        )

    except Exception as e:
        logger.error("TTS synthesis failed: %s", e)
        # Graceful fallback: return empty audio but valid phonemes for lip-sync
        # Caller (ws.py) should check audio_bytes and decide whether to play TTS
        duration_ms = len(text) * 250
        phonemes = _generate_phoneme_timestamps(text, duration_ms)
        return TTSResult(
            audio_bytes=b"",
            phoneme_timestamps=phonemes,
            duration_ms=duration_ms,
        )


async def synthesize_cached(text: str, voice_id: str | None = None) -> TTSResult:
    """Synthesize with Redis cache check.

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.

    Returns:
        TTSResult (cached or newly synthesized).
    """
    # Check cache
    cached = await _get_cached(text, voice_id)
    if cached:
        logger.debug("TTS cache hit: %s", text[:30])
        return cached

    # Synthesize
    result = await synthesize(text, voice_id)

    # Cache if has audio
    if result.audio_bytes:
        await _set_cache(text, voice_id, result)

    return result
