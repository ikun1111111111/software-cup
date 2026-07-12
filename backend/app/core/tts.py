"""TTS (Text-to-Speech) with Redis caching.

Supports Azure Speech Services (official, requires key) and edge-tts (free).
Provides text-to-audio synthesis with phoneme timestamps for lip-sync.
"""
import asyncio
import logging
import hashlib
import json
import time

from pydantic import BaseModel

from app.core.config import get_settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)
settings = get_settings()

_MEMORY_TTS_CACHE: dict[str, "TTSResult"] = {}
_MEMORY_TTS_CACHE_LIMIT = 128
_REDIS_TTS_TIMEOUT_SECONDS = 0.25

# Voice mapping: voice_id -> Azure / edge-tts voice name
_EDGE_TTS_VOICES = {
    "mandarin": "zh-CN-XiaoxiaoNeural",        # 标准普通话女声
    "female": "zh-CN-XiaoyiNeural",            # 普通话年轻女声
    "liaoning": "zh-CN-liaoning-XiaobeiNeural", # 东北女声
    "shaanxi": "zh-CN-shaanxi-XiaoniNeural",   # 陕西女声
    "male": "zh-CN-YunxiNeural",               # 普通话男声
}

# Voice mapping: voice_id -> DashScope CosyVoice speaker
_COSYVOICE_VOICES = {
    voice: cfg["cosyvoice_speaker"]
    for voice, cfg in settings.tts_voices.items()
    if "cosyvoice_speaker" in cfg
}


def _resolve_cosyvoice_speaker(voice_id: str | None) -> str | None:
    """Resolve voice_id to DashScope CosyVoice speaker name."""
    if voice_id and voice_id in _COSYVOICE_VOICES:
        return _COSYVOICE_VOICES[voice_id]
    return _COSYVOICE_VOICES.get("mandarin")


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


# MP3 frame header parsing tables for accurate duration estimation.
_MPEG1_LAYER3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
_MPEG2_LAYER3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
_MPEG_SAMPLE_RATES = {
    0: [11025, 12000, 8000, 0],    # MPEG2.5
    2: [22050, 24000, 16000, 0],   # MPEG2
    3: [44100, 48000, 32000, 0],   # MPEG1
}


def _skip_id3v2(audio_bytes: bytes) -> int:
    """Return the byte offset after an ID3v2 tag, or 0 if none."""
    if len(audio_bytes) < 10 or audio_bytes[:3] != b"ID3":
        return 0
    # Synchsafe integer (7 bits per byte)
    size = (
        (audio_bytes[6] << 21)
        | (audio_bytes[7] << 14)
        | (audio_bytes[8] << 7)
        | audio_bytes[9]
    )
    return 10 + size


def _parse_mp3_duration_ms(audio_bytes: bytes) -> int | None:
    """Estimate MP3 duration by walking frame headers.

    edge-tts produces CBR MP3 (commonly 24kHz/24-48kbps mono). The previous
    fixed 128kbps assumption over-estimated duration by 2x-5x, breaking
    lip-sync and subtitle timing.
    """
    if not audio_bytes or len(audio_bytes) < 4:
        return None

    offset = _skip_id3v2(audio_bytes)
    n = len(audio_bytes)
    total_ms = 0.0
    frame_count = 0
    i = offset

    while i < n - 4:
        # Frame sync: 11 consecutive 1-bits
        if audio_bytes[i] != 0xFF or (audio_bytes[i + 1] & 0xE0) != 0xE0:
            i += 1
            continue

        b1 = audio_bytes[i + 1]
        b2 = audio_bytes[i + 2]
        version = (b1 >> 3) & 0x3
        layer_bits = (b1 >> 1) & 0x3
        bitrate_index = (b2 >> 4) & 0xF
        sr_index = (b2 >> 2) & 0x3
        padding = (b2 >> 1) & 0x1

        # version==1 is reserved; layer_bits==0 is reserved; sr_index==3 is reserved
        if version == 1 or layer_bits == 0 or sr_index == 3:
            i += 1
            continue
        if version not in _MPEG_SAMPLE_RATES:
            i += 1
            continue

        sample_rate = _MPEG_SAMPLE_RATES[version][sr_index]
        if sample_rate == 0:
            i += 1
            continue

        # layer_bits: 3=LayerI, 2=LayerII, 1=LayerIII
        if layer_bits == 3:
            samples_per_frame = 384
        elif version == 3:
            samples_per_frame = 1152
        else:
            samples_per_frame = 576

        if version == 3:
            bitrate = _MPEG1_LAYER3_BITRATES[bitrate_index]
        else:
            bitrate = _MPEG2_LAYER3_BITRATES[bitrate_index]
        if bitrate == 0:
            i += 1
            continue

        frame_ms = samples_per_frame / sample_rate * 1000
        frame_size = int(samples_per_frame * bitrate * 125 / sample_rate) + padding
        if frame_size < 1:
            i += 1
            continue

        total_ms += frame_ms
        frame_count += 1
        i += frame_size

    if frame_count == 0:
        return None
    return int(total_ms)


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
    key = _cache_key(text, voice_id)
    memory_cached = _MEMORY_TTS_CACHE.get(key)
    if memory_cached:
        return memory_cached

    try:
        redis = await get_redis()
        cached = await asyncio.wait_for(
            redis.get(key),
            timeout=_REDIS_TTS_TIMEOUT_SECONDS,
        )
        if cached:
            data = json.loads(cached)
            result = TTSResult(
                audio_bytes=bytes.fromhex(data["audio_hex"]),
                phoneme_timestamps=data["phonemes"],
                sample_rate=data.get("sample_rate", 24000),
                duration_ms=data.get("duration_ms", 0),
                audio_format=data.get("audio_format", "mp3"),
            )
            _MEMORY_TTS_CACHE[key] = result
            return result
    except Exception as e:
        logger.debug("TTS cache check failed: %s", e)
    return None


async def _set_cache(text: str, voice_id: str | None, result: TTSResult) -> None:
    """Cache TTS result in Redis with TTL (default 7 days)."""
    key = _cache_key(text, voice_id)
    _MEMORY_TTS_CACHE[key] = result
    if len(_MEMORY_TTS_CACHE) > _MEMORY_TTS_CACHE_LIMIT:
        _MEMORY_TTS_CACHE.pop(next(iter(_MEMORY_TTS_CACHE)))

    try:
        redis = await get_redis()
        data = {
            "audio_hex": result.audio_bytes.hex(),
            "phonemes": result.phoneme_timestamps,
            "sample_rate": result.sample_rate,
            "duration_ms": result.duration_ms,
            "audio_format": result.audio_format,
        }
        await asyncio.wait_for(
            redis.set(key, json.dumps(data), ex=604800),
            timeout=_REDIS_TTS_TIMEOUT_SECONDS,
        )  # 7 days
    except Exception as e:
        logger.debug("TTS cache set failed: %s", e)


def _estimate_mp3_duration(audio_bytes: bytes) -> int:
    """Estimate MP3 duration in milliseconds.

    Parses the actual frame headers when possible; falls back to a conservative
    byte-rate estimate otherwise.
    """
    if not audio_bytes:
        return 0
    parsed = _parse_mp3_duration_ms(audio_bytes)
    if parsed is not None:
        return parsed
    # Conservative fallback: edge-tts commonly uses 24-48 kbps mono MP3.
    # 48 kbps ~= 6000 bytes/sec, 24 kbps ~= 3000 bytes/sec. Use 24kbps to avoid
    # over-estimation when the real bitrate is unknown.
    return int(len(audio_bytes) / 3)


_EDGE_TTS_TIMEOUT_SECONDS = 30
_EDGE_TTS_MAX_RETRIES = 2
_EDGE_TTS_RATE = "-4%"
_EDGE_TTS_PITCH = "+2Hz"


async def _synthesize_edge_once(text: str, voice_name: str) -> tuple[bytes, list[dict]]:
    """Run a single edge-tts synthesis and return audio + word boundaries."""
    import edge_tts

    communicate = edge_tts.Communicate(
        text,
        voice_name,
        rate=_EDGE_TTS_RATE,
        pitch=_EDGE_TTS_PITCH,
    )
    audio_chunks: list[bytes] = []
    raw_phonemes: list[dict] = []

    async def _collect():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                data = chunk.get("data", b"")
                if data:
                    audio_chunks.append(data)
            elif chunk["type"] == "WordBoundary":
                raw_phonemes.append({
                    "char": chunk.get("text", ""),
                    "start_ms": chunk.get("offset", 0) // 10000,
                    "end_ms": (chunk.get("offset", 0) + chunk.get("duration", 0)) // 10000,
                    "mouth_shape": _classify_mouth_shape(
                        chunk.get("text", "")[0] if chunk.get("text") else "?"
                    ),
                })

    try:
        await asyncio.wait_for(_collect(), timeout=_EDGE_TTS_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as e:
        raise RuntimeError(f"edge-tts timed out after {_EDGE_TTS_TIMEOUT_SECONDS}s") from e

    audio_bytes = b"".join(audio_chunks)
    if not audio_bytes:
        raise RuntimeError("edge-tts returned empty audio")
    return audio_bytes, raw_phonemes


async def _synthesize_edge_with_retry(text: str, voice_name: str) -> tuple[bytes, list[dict]]:
    """Synthesize via edge-tts with retries on transient failures."""
    last_error: Exception | None = None
    for attempt in range(_EDGE_TTS_MAX_RETRIES + 1):
        try:
            return await _synthesize_edge_once(text, voice_name)
        except Exception as e:
            last_error = e
            logger.warning("edge-tts attempt %d failed: %s", attempt + 1, e)
            if attempt < _EDGE_TTS_MAX_RETRIES:
                await asyncio.sleep(0.5 * (attempt + 1))
    raise last_error or RuntimeError("edge-tts synthesis failed after retries")


async def _synthesize_edge_stream(
    text: str,
    voice_name: str,
    chunk_size: int,
    queue: asyncio.Queue,
):
    """Stream edge-tts audio into an asyncio.Queue with a global timeout handled by caller."""
    import edge_tts

    communicate = edge_tts.Communicate(
        text,
        voice_name,
        rate=_EDGE_TTS_RATE,
        pitch=_EDGE_TTS_PITCH,
    )
    audio_buffer: list[bytes] = []
    first_chunk_sent = False
    stream_start = time.time()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            data = chunk.get("data", b"")
            if not data:
                continue
            audio_buffer.append(data)
            accumulated = b"".join(audio_buffer)
            if len(accumulated) >= chunk_size or not first_chunk_sent:
                if not first_chunk_sent:
                    logger.info("[tts] first_audio_chunk elapsed=%.3fs bytes=%d",
                                time.time() - stream_start, len(accumulated))
                    first_chunk_sent = True
                await queue.put({"type": "audio", "data": accumulated})
                audio_buffer.clear()
        elif chunk["type"] == "WordBoundary":
            await queue.put({
                "type": "phoneme",
                "data": {
                    "char": chunk.get("text", ""),
                    "start_ms": chunk.get("offset", 0) // 10000,
                    "end_ms": (chunk.get("offset", 0) + chunk.get("duration", 0)) // 10000,
                    "mouth_shape": _classify_mouth_shape(
                        chunk.get("text", "")[0] if chunk.get("text") else "?"
                    ),
                },
            })

    remaining = b"".join(audio_buffer)
    if remaining:
        await queue.put({"type": "audio", "data": remaining})
    await queue.put(None)  # sentinel


async def _synthesize_dashscope(text: str, voice_id: str | None) -> TTSResult:
    """Synthesize text using DashScope CosyVoice.

    Requires QWEN_API_KEY environment variable (loaded as settings.qwen_api_key).
    Returns empty audio on failure so callers can fall back to Azure / edge-tts.
    """
    speaker = _resolve_cosyvoice_speaker(voice_id)
    if not speaker:
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)
    if not settings.qwen_api_key:
        logger.debug("DashScope API key not configured, skipping CosyVoice")
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

    try:
        from dashscope.audio.tts import SpeechSynthesizer
        from dashscope.api_entities.dashscope_response import SpeechSynthesisResponse

        def _call():
            response = SpeechSynthesizer.call(
                model=settings.cosyvoice_model,
                text=text,
                voice=speaker,
                format="mp3",
                api_key=settings.qwen_api_key,
            )
            if isinstance(response, SpeechSynthesisResponse):
                return response.get_audio_data() if response.get_audio_data() is not None else b""
            if isinstance(response, bytes):
                return response
            return b""

        audio_bytes = await asyncio.to_thread(_call)
        if not audio_bytes:
            logger.warning("DashScope CosyVoice returned empty audio for voice=%s", speaker)
            return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

        duration_ms = _estimate_mp3_duration(audio_bytes)
        phonemes = _generate_phoneme_timestamps(text, duration_ms)
        logger.info("DashScope CosyVoice synthesized: %d bytes, %dms", len(audio_bytes), duration_ms)
        return TTSResult(
            audio_bytes=audio_bytes,
            phoneme_timestamps=phonemes,
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.error("DashScope CosyVoice failed: %s", e)
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)


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
    """Synthesize text to speech using DashScope CosyVoice, Azure, or edge-tts.

    Priority:
        1. DashScope CosyVoice (if QWEN_API_KEY is set)
        2. Azure Speech Services (if AZURE_SPEECH_KEY/REGION are set)
        3. edge-tts (free, network-dependent)

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.

    Returns:
        TTSResult with MP3 audio bytes and phoneme timestamps.
    """
    if not text or not text.strip():
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

    # 1. Try DashScope CosyVoice first (preferred high-quality voice)
    if settings.qwen_api_key:
        cosy_result = await _synthesize_dashscope(text, voice_id)
        if cosy_result.audio_bytes:
            return cosy_result
        logger.info("CosyVoice returned empty audio, trying next provider")

    # 2. Try Azure Speech Services if configured
    voice_name = _resolve_voice(voice_id)
    if settings.azure_speech_key and settings.azure_speech_region:
        azure_result = _synthesize_azure(text, voice_name)
        if azure_result.audio_bytes:
            return azure_result
        logger.info("Azure TTS returned empty audio, falling back to edge-tts")

    if not text or not text.strip():
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

    try:
        audio_bytes, raw_phonemes = await _synthesize_edge_with_retry(text, voice_name)

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

    # Fresh synthesis: prefer DashScope CosyVoice, fall back to edge-tts stream.
    logger.info("[tts] synthesis_start text_len=%d", len(text))
    import base64

    synth_start = time.time()

    # 1. Try DashScope CosyVoice first (high quality, low latency for short text)
    if settings.qwen_api_key:
        try:
            cosy_result = await _synthesize_dashscope(text, voice_id)
            if cosy_result.audio_bytes:
                audio = cosy_result.audio_bytes
                logger.info("[tts] cosyvoice first_chunk elapsed=%.3fs bytes=%d",
                            time.time() - synth_start, len(audio))
                for i in range(0, len(audio), chunk_size):
                    chunk = audio[i:i + chunk_size]
                    yield {"type": "audio", "data": base64.b64encode(chunk).decode("utf-8")}
                yield {"type": "phonemes", "data": cosy_result.phoneme_timestamps}
                yield {"type": "done", "duration_ms": cosy_result.duration_ms}
                await _set_cache(text, voice_id, cosy_result)
                return
            logger.info("[tts] cosyvoice returned empty audio, falling back to edge-tts")
        except Exception as e:
            logger.warning("[tts] cosyvoice failed: %s, falling back to edge-tts", e)

    try:
        import edge_tts  # noqa: F401
    except ImportError as e:
        logger.error("[tts] edge-tts not installed: %s", e)
        for event in _fallback_stream_events(text, e):
            yield event
        return

    audio_chunks: list[bytes] = []
    raw_phonemes: list[dict] = []
    first_audio_yielded = False
    voice = _resolve_voice(voice_id)
    queue: asyncio.Queue = asyncio.Queue()

    producer = asyncio.create_task(_synthesize_edge_stream(text, voice, chunk_size, queue))

    try:
        while True:
            event = await asyncio.wait_for(queue.get(), timeout=_EDGE_TTS_TIMEOUT_SECONDS)
            if event is None:
                break
            if event["type"] == "audio":
                data = event["data"]
                audio_chunks.append(data)
                if not first_audio_yielded:
                    logger.info("[tts] first_audio_chunk elapsed=%.3fs bytes=%d",
                                time.time() - synth_start, len(data))
                    first_audio_yielded = True
                yield {"type": "audio", "data": base64.b64encode(data).decode("utf-8")}
            elif event["type"] == "phoneme":
                raw_phonemes.append(event["data"])
    except asyncio.TimeoutError as e:
        producer.cancel()
        logger.error("[tts] streaming synthesis timed out: %s", e)
        for event in _fallback_stream_events(text, RuntimeError("edge-tts stream timeout")):
            yield event
        return
    except Exception as e:
        producer.cancel()
        logger.error("[tts] streaming synthesis failed: %s", e)
        for event in _fallback_stream_events(text, e):
            yield event
        return
    finally:
        if not producer.done():
            producer.cancel()

    audio_bytes = b"".join(audio_chunks)
    if not audio_bytes:
        logger.error("[tts] edge-tts stream produced no audio")
        for event in _fallback_stream_events(text, RuntimeError("edge-tts produced no audio")):
            yield event
        return

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
