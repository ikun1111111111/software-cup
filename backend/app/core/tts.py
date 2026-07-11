"""TTS (Text-to-Speech) with Redis caching.

Supports Azure Speech Services (official, requires key) and edge-tts (free).
Provides text-to-audio synthesis with phoneme timestamps for lip-sync.
"""
import logging
import hashlib
import json
import time

from pydantic import BaseModel

from app.core.config import get_settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)
settings = get_settings()

# Voice mapping: voice_id -> Azure / edge-tts voice name
_EDGE_TTS_VOICES = {
    "mandarin": "zh-CN-XiaoxiaoNeural",        # 标准普通话女声
    "female": "zh-CN-XiaoyiNeural",            # 普通话年轻女声
    "liaoning": "zh-CN-liaoning-XiaobeiNeural", # 东北女声
    "shaanxi": "zh-CN-shaanxi-XiaoniNeural",   # 陕西女声
    "male": "zh-CN-YunxiNeural",               # 普通话男声
}


def _is_cjk(char: str) -> bool:
    return bool(char) and ('一' <= char <= '鿿' or 'ぁ' <= char <= 'ん')


def _fallback_mouth_shape(char: str) -> str:
    """Dependency-free mouth-shape fallback.

    The frontend only needs a stable open/half/closed signal for lip-sync.
    If pypinyin is unavailable in a local/demo environment, do not break TTS.
    """
    if not char.strip() or not _is_cjk(char):
        return "closed"
    return "half" if ord(char) % 5 == 0 else "open"


class TTSResult(BaseModel):
    """TTS synthesis result."""
    audio_bytes: bytes
    phoneme_timestamps: list[dict]
    sample_rate: int = 24000
    duration_ms: int = 0
    audio_format: str = "mp3"


def _classify_mouth_shape(char: str) -> str:
    """Classify a Chinese character's mouth shape for lip-sync.

    Returns:
        "open" for characters with a consonant initial (声母) — mouth opens to articulate
        "half" for semi-vowels (y/w) — moderate opening
        "closed" for non-CJK characters or silence — mouth stays closed
    """
    if not char.strip() or not _is_cjk(char):
        return "closed"

    try:
        import pypinyin

        pinyin_list = pypinyin.lazy_pinyin(char, style=pypinyin.Style.INITIALS)
        initial = pinyin_list[0] if pinyin_list else ""

        if initial in ("b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h",
                        "j", "q", "x", "zh", "ch", "sh", "z", "c", "s", "r"):
            return "open"
        elif initial in ("y", "w"):
            return "half"
        else:
            # No initial (pure vowel like a/o/e) — still open
            return "open"
    except ImportError:
        return _fallback_mouth_shape(char)
    except Exception:
        return "half"


def _normalize_phonemes(raw_phonemes: list[dict]) -> list[dict]:
    """Normalize phonemes to PLAN schema."""
    normalized = []
    for p in raw_phonemes:
        if "char" in p and "start_ms" in p:
            normalized.append(p)
        elif "phoneme" in p:
            char = p["phoneme"]
            start_ms = int(p.get("start", 0) * 1000)
            end_ms = int(p.get("end", 0) * 1000)
            normalized.append({
                "char": char,
                "start_ms": start_ms,
                "end_ms": end_ms,
                "mouth_shape": _classify_mouth_shape(char),
            })
        else:
            char = p.get("char", p.get("text", "?"))
            normalized.append({
                "char": char,
                "start_ms": int(p.get("start_ms", p.get("start", 0))),
                "end_ms": int(p.get("end_ms", p.get("end", 0))),
                "mouth_shape": p.get("mouth_shape", _classify_mouth_shape(char)),
            })
    return normalized


def _generate_phoneme_timestamps(text: str, duration_ms: int) -> list[dict]:
    """Generate approximate phoneme timestamps for lip-sync.

    Returns PLAN-compliant Phoneme schema:
        {"char": "你", "start_ms": 0, "end_ms": 250, "mouth_shape": "closed"}
    """
    if not text or duration_ms <= 0:
        return []

    segments = [char for char in text if char.strip()]

    if not segments:
        return []

    avg_ms = duration_ms / len(segments)
    timestamps = []
    current_ms = 0

    for seg in segments:
        mouth_shape = _classify_mouth_shape(seg)
        timestamps.append({
            "char": seg,
            "start_ms": int(current_ms),
            "end_ms": int(current_ms + avg_ms),
            "mouth_shape": mouth_shape,
        })
        current_ms += avg_ms

    return timestamps


def _fallback_stream_events(text: str, error: Exception | str):
    """Yield non-fatal TTS fallback events.

    TTS can fail because edge-tts/network is unavailable. Chat text should still
    complete, and the frontend can use browser speech synthesis as a best-effort
    voice fallback.
    """
    duration_ms = max(len([char for char in text if char.strip()]) * 250, 800)
    phonemes = _generate_phoneme_timestamps(text, duration_ms)
    yield {"type": "tts_error", "error": str(error)}
    yield {"type": "phonemes", "data": phonemes}
    yield {"type": "done", "duration_ms": duration_ms, "audio_unavailable": True}


def _resolve_voice(voice_id: str | None) -> str:
    """Resolve voice_id to edge-tts voice name.

    Returns:
        edge-tts voice name string.
    """
    if voice_id and voice_id in _EDGE_TTS_VOICES:
        return _EDGE_TTS_VOICES[voice_id]
    return _EDGE_TTS_VOICES["mandarin"]


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
                sample_rate=data.get("sample_rate", 24000),
                duration_ms=data.get("duration_ms", 0),
                audio_format=data.get("audio_format", "mp3"),
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
            "audio_format": result.audio_format,
        }
        await redis.set(key, json.dumps(data), ex=604800)  # 7 days
    except Exception as e:
        logger.debug("TTS cache set failed: %s", e)


def _estimate_mp3_duration(audio_bytes: bytes) -> int:
    """Estimate MP3 duration in milliseconds from file size.

    For edge-tts output (128kbps CBR), this is accurate enough.
    """
    if not audio_bytes:
        return 0
    # edge-tts produces ~128kbps MP3 = 16000 bytes/sec
    return int(len(audio_bytes) / 16)


def _synthesize_azure(text: str, voice_name: str) -> TTSResult:
    """Synthesize text using official Azure Speech SDK.

    Requires AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables.
    Falls back to empty audio on failure so callers can try edge-tts.
    """
    try:
        import azure.cognitiveservices.speech as speechsdk

        speech_config = speechsdk.SpeechConfig(
            subscription=settings.azure_speech_key,
            region=settings.azure_speech_region,
        )
        speech_config.speech_synthesis_voice_name = voice_name
        # Request MP3 output to match edge-tts format
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )

        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
        result = synthesizer.speak_text_async(text).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_bytes = result.audio_data
            duration_ms = _estimate_mp3_duration(audio_bytes)
            phonemes = _generate_phoneme_timestamps(text, duration_ms)
            logger.info("Azure TTS synthesized: %d bytes, %dms", len(audio_bytes), duration_ms)
            return TTSResult(
                audio_bytes=audio_bytes,
                phoneme_timestamps=phonemes,
                duration_ms=duration_ms,
            )
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            logger.error("Azure TTS canceled: %s", cancellation.error_details)
            return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)
    except Exception as e:
        logger.error("Azure TTS failed: %s", e)
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)


async def synthesize(text: str, voice_id: str | None = None) -> TTSResult:
    """Synthesize text to speech using Azure (if configured) or edge-tts.

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.

    Returns:
        TTSResult with MP3 audio bytes and phoneme timestamps.
    """
    # Try Azure first if configured
    voice_name = _resolve_voice(voice_id)
    if settings.azure_speech_key and settings.azure_speech_region:
        azure_result = _synthesize_azure(text, voice_name)
        if azure_result.audio_bytes:
            return azure_result
        logger.info("Azure TTS returned empty audio, falling back to edge-tts")

    if not text or not text.strip():
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

    try:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice_name)

        audio_chunks = []
        raw_phonemes = []

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                raw_phonemes.append({
                    "char": chunk["text"],
                    "start_ms": chunk["offset"] // 10000,  # 100ns ticks -> ms
                    "end_ms": (chunk["offset"] + chunk["duration"]) // 10000,
                    "mouth_shape": _classify_mouth_shape(chunk["text"][0] if chunk["text"] else "?"),
                })

        audio_bytes = b"".join(audio_chunks)
        if not audio_bytes:
            raise RuntimeError("edge-tts returned empty audio")

        # Use real word boundaries if available, otherwise generate approximate ones
        if raw_phonemes:
            phonemes = _normalize_phonemes(raw_phonemes)
        else:
            duration_ms = _estimate_mp3_duration(audio_bytes)
            phonemes = _generate_phoneme_timestamps(text, duration_ms)

        duration_ms = _estimate_mp3_duration(audio_bytes)

        logger.info("TTS synthesized: %d bytes, %dms, %d phonemes",
                     len(audio_bytes), duration_ms, len(phonemes))

        return TTSResult(
            audio_bytes=audio_bytes,
            phoneme_timestamps=phonemes,
            duration_ms=duration_ms,
        )

    except ImportError:
        logger.error("edge-tts not installed. Run: pip install edge-tts")
        duration_ms = len(text) * 250
        phonemes = _generate_phoneme_timestamps(text, duration_ms)
        return TTSResult(
            audio_bytes=b"",
            phoneme_timestamps=phonemes,
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.error("TTS synthesis failed: %s", e)
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


async def synthesize_stream(
    text: str,
    voice_id: str | None = None,
    chunk_size: int = 16384,
):
    """Synthesize text to speech with streaming output.

    Yields audio chunks as base64-encoded strings for SSE streaming.
    Also yields phoneme timestamps at the end.

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.
        chunk_size: Bytes per chunk (default 16KB).

    Yields:
        dict with either:
            {"type": "audio", "data": "<base64_chunk>"}
            {"type": "phonemes", "data": [...]}
            {"type": "done", "duration_ms": int}
    """
    if not text or not text.strip():
        yield {"type": "done", "duration_ms": 0}
        return

    # Check cache first
    cached = await _get_cached(text, voice_id)
    if cached and cached.audio_bytes:
        import base64
        audio = cached.audio_bytes
        logger.info("[tts] cache_hit text_len=%d audio_bytes=%d", len(text), len(audio))
        for i in range(0, len(audio), chunk_size):
            chunk = audio[i:i + chunk_size]
            yield {"type": "audio", "data": base64.b64encode(chunk).decode("utf-8")}
        yield {"type": "phonemes", "data": cached.phoneme_timestamps}
        yield {"type": "done", "duration_ms": cached.duration_ms}
        return

    # Fresh synthesis: stream directly from edge-tts for lowest TTFB.
    logger.info("[tts] synthesis_start text_len=%d", len(text))
    import base64

    try:
        import edge_tts
    except ImportError as e:
        logger.error("[tts] edge-tts not installed: %s", e)
        for event in _fallback_stream_events(text, e):
            yield event
        return

    audio_buffer = []
    all_audio_chunks = []
    raw_phonemes = []
    first_audio_yielded = False
    synth_start = time.time()

    try:
        voice = _resolve_voice(voice_id)
        communicate = edge_tts.Communicate(text, voice)

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                data = chunk.get("data", b"")
                if not data:
                    continue
                audio_buffer.append(data)
                all_audio_chunks.append(data)
                # Accumulate a small buffer then start streaming to balance TTFB and chunk count.
                accumulated = b"".join(audio_buffer)
                if len(accumulated) >= chunk_size or not first_audio_yielded:
                    if accumulated:
                        if not first_audio_yielded:
                            logger.info("[tts] first_audio_chunk elapsed=%.3fs bytes=%d",
                                        time.time() - synth_start, len(accumulated))
                            first_audio_yielded = True
                        yield {"type": "audio", "data": base64.b64encode(accumulated).decode("utf-8")}
                        audio_buffer = []
            elif chunk["type"] == "WordBoundary":
                raw_phonemes.append({
                    "char": chunk["text"],
                    "start_ms": chunk["offset"] // 10000,  # 100ns ticks -> ms
                    "end_ms": (chunk["offset"] + chunk["duration"]) // 10000,
                    "mouth_shape": _classify_mouth_shape(chunk["text"][0] if chunk["text"] else "?"),
                })
    except Exception as e:
        logger.error("[tts] streaming synthesis failed: %s", e)
        for event in _fallback_stream_events(text, e):
            yield event
        return

    # Flush any remaining audio
    remaining = b"".join(audio_buffer)
    if remaining:
        if not first_audio_yielded:
            logger.info("[tts] first_audio_chunk elapsed=%.3fs bytes=%d",
                        time.time() - synth_start, len(remaining))
        yield {"type": "audio", "data": base64.b64encode(remaining).decode("utf-8")}

    audio_bytes = b"".join(all_audio_chunks)

    if raw_phonemes:
        phonemes = _normalize_phonemes(raw_phonemes)
    else:
        duration_ms = _estimate_mp3_duration(audio_bytes)
        phonemes = _generate_phoneme_timestamps(text, duration_ms)

    duration_ms = _estimate_mp3_duration(audio_bytes)
    logger.info("[tts] synthesis_end elapsed=%.3fs audio_bytes=%d phonemes=%d duration_ms=%d",
                time.time() - synth_start, len(audio_bytes), len(phonemes), duration_ms)

    result = TTSResult(
        audio_bytes=audio_bytes,
        phoneme_timestamps=phonemes,
        duration_ms=duration_ms,
    )

    if result.audio_bytes:
        await _set_cache(text, voice_id, result)

    yield {"type": "phonemes", "data": result.phoneme_timestamps}
    yield {"type": "done", "duration_ms": result.duration_ms}
