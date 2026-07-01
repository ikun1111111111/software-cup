"""TTS (Text-to-Speech) via edge-tts or Azure Speech Services with Redis caching.

Provides text-to-audio synthesis with phoneme timestamps for lip-sync.
Supports:
- Microsoft Edge TTS (free, high quality Chinese voices)
- Azure Speech Services (premium quality with SSML support)
- Sentence-level parallel synthesis for long texts
"""
import logging
import hashlib
import base64
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave

from pydantic import BaseModel

from app.core.config import get_settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)
settings = get_settings()

# edge-tts voice mapping: voice_id -> edge-tts voice name
_EDGE_TTS_VOICES = {
    "mandarin": "zh-CN-XiaoxiaoNeural",     # 标准普通话女声
    "nanjinghua": "zh-CN-XiaoxiaoNeural",    # 南京话暂用普通话
    "sichuanhua": "zh-CN-XiaoxiaoNeural",    # 四川话暂用普通话
    "male": "zh-CN-YunxiNeural",             # 普通话男声
    "female": "zh-CN-XiaoyiNeural",          # 普通话年轻女声
}

# Azure Speech Services voice mapping: voice_id -> voice name
_AZURE_TTS_VOICES = {
    "mandarin": "zh-CN-XiaoxiaoNeural",      # 标准普通话女声（情感丰富）
    "nanjinghua": "zh-CN-XiaoxiaoNeural",     # 南京话暂用普通话
    "sichuanhua": "zh-CN-XiaoxiaoNeural",     # 四川话暂用普通话
    "male": "zh-CN-YunxiNeural",              # 普通话男声
    "female": "zh-CN-XiaoyiNeural",           # 普通话年轻女声
}


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
    import pypinyin

    if not char.strip() or not ('一' <= char <= '鿿' or 'ぁ' <= char <= 'ん'):
        return "closed"

    try:
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


def _resolve_voice(voice_id: str | None) -> str:
    """Resolve voice_id to edge-tts voice name."""
    if voice_id and voice_id in _EDGE_TTS_VOICES:
        return _EDGE_TTS_VOICES[voice_id]
    return _EDGE_TTS_VOICES["mandarin"]


def _resolve_azure_voice(voice_id: str | None) -> str:
    """Resolve voice_id to Azure Speech Services voice name."""
    if voice_id and voice_id in _AZURE_TTS_VOICES:
        return _AZURE_TTS_VOICES[voice_id]
    return _AZURE_TTS_VOICES["mandarin"]


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


_MPEG_BITRATES = {
    (3, 3): [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    (3, 2): [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
    (3, 1): [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    (2, 3): [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
    (2, 2): [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
    (2, 1): [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
}

_MPEG_SAMPLE_RATES = {
    3: [44100, 48000, 32000, 0],
    2: [22050, 24000, 16000, 0],
    0: [11025, 12000, 8000, 0],
}


def _skip_id3v2(audio_bytes: bytes) -> int:
    if len(audio_bytes) < 10 or audio_bytes[:3] != b"ID3":
        return 0
    size = (
        (audio_bytes[6] & 0x7F) << 21
        | (audio_bytes[7] & 0x7F) << 14
        | (audio_bytes[8] & 0x7F) << 7
        | (audio_bytes[9] & 0x7F)
    )
    return min(len(audio_bytes), 10 + size)


def _estimate_mp3_duration(audio_bytes: bytes) -> int:
    """Estimate MP3 duration from frame headers, falling back to file size."""
    if not audio_bytes:
        return 0

    offset = _skip_id3v2(audio_bytes)
    total_samples = 0
    total_sample_rate = 0
    frame_count = 0
    i = offset

    while i + 4 <= len(audio_bytes):
        b0, b1, b2, _b3 = audio_bytes[i:i + 4]
        if b0 != 0xFF or (b1 & 0xE0) != 0xE0:
            i += 1
            continue

        version = (b1 >> 3) & 0x03
        layer = (b1 >> 1) & 0x03
        bitrate_index = (b2 >> 4) & 0x0F
        sample_rate_index = (b2 >> 2) & 0x03
        padding = (b2 >> 1) & 0x01

        if version == 1 or layer == 0 or bitrate_index in (0, 15) or sample_rate_index == 3:
            i += 1
            continue

        bitrate_table_version = 3 if version == 3 else 2
        bitrate = _MPEG_BITRATES.get((bitrate_table_version, layer), [])[bitrate_index]
        sample_rate = _MPEG_SAMPLE_RATES.get(version, [0, 0, 0, 0])[sample_rate_index]
        if bitrate <= 0 or sample_rate <= 0:
            i += 1
            continue

        if layer == 3:
            samples_per_frame = 384
            frame_length = int((12 * bitrate * 1000 / sample_rate + padding) * 4)
        elif layer == 2:
            samples_per_frame = 1152
            frame_length = int(144 * bitrate * 1000 / sample_rate + padding)
        else:
            samples_per_frame = 1152 if version == 3 else 576
            coeff = 144 if version == 3 else 72
            frame_length = int(coeff * bitrate * 1000 / sample_rate + padding)

        if frame_length <= 4:
            i += 1
            continue

        total_samples += samples_per_frame
        total_sample_rate += sample_rate
        frame_count += 1
        i += frame_length

    if frame_count > 0:
        avg_sample_rate = total_sample_rate / frame_count
        return int(total_samples / avg_sample_rate * 1000)

    # Conservative fallback for low-bitrate TTS MP3. Underestimation makes subtitles run ahead.
    return int(len(audio_bytes) / 6)


def _read_wav_metadata(audio_bytes: bytes) -> tuple[int, int]:
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            sample_rate = wf.getframerate()
            duration_ms = int(wf.getnframes() / sample_rate * 1000) if sample_rate else 0
            return sample_rate, duration_ms
    except Exception:
        return 16000, max(1, int(len(audio_bytes) / 32))


def _synthesize_windows_sapi(text: str, voice_id: str | None = None) -> TTSResult | None:
    if not sys.platform.startswith("win"):
        return None

    powershell = shutil.which("powershell") or shutil.which("pwsh")
    if not powershell:
        return None

    text_path = ""
    audio_path = ""
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as text_file:
            text_file.write(text)
            text_path = text_file.name
        audio_fd, audio_path = tempfile.mkstemp(suffix=".wav")
        os.close(audio_fd)
        os.remove(audio_path)

        script = r"""
$TextPath = $env:LOCAL_TTS_TEXT_PATH
$OutputPath = $env:LOCAL_TTS_AUDIO_PATH
Add-Type -AssemblyName System.Speech
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$voice = $synth.GetInstalledVoices() |
  Where-Object { $_.VoiceInfo.Culture.Name -eq 'zh-CN' } |
  Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$text = Get-Content -LiteralPath $TextPath -Raw -Encoding UTF8
$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($text)
$synth.Dispose()
"""
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        env = os.environ.copy()
        env["LOCAL_TTS_TEXT_PATH"] = text_path
        env["LOCAL_TTS_AUDIO_PATH"] = audio_path
        completed = subprocess.run(
            [
                powershell,
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-EncodedCommand",
                encoded,
            ],
            capture_output=True,
            env=env,
            timeout=30,
            check=False,
        )
        if completed.returncode != 0 or not os.path.exists(audio_path):
            logger.warning("Windows SAPI fallback failed: %s", completed.stderr.decode("utf-8", "ignore")[:200])
            return None

        with open(audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
        if not audio_bytes:
            return None

        sample_rate, duration_ms = _read_wav_metadata(audio_bytes)
        if duration_ms <= 0:
            return None
        return TTSResult(
            audio_bytes=audio_bytes,
            phoneme_timestamps=_generate_phoneme_timestamps(text, duration_ms),
            sample_rate=sample_rate,
            duration_ms=duration_ms,
            audio_format="wav",
        )
    except Exception as e:
        logger.warning("Windows SAPI fallback unavailable: %s", e)
        return None
    finally:
        for path in (text_path, audio_path):
            if path:
                try:
                    os.remove(path)
                except OSError:
                    pass


def _fallback_tts_result(text: str, voice_id: str | None = None) -> TTSResult:
    local = _synthesize_windows_sapi(text, voice_id)
    if local and local.audio_bytes:
        return local

    duration_ms = len(text) * 250
    phonemes = _generate_phoneme_timestamps(text, duration_ms)
    return TTSResult(
        audio_bytes=b"",
        phoneme_timestamps=phonemes,
        duration_ms=duration_ms,
    )


async def synthesize(text: str, voice_id: str | None = None) -> TTSResult:
    """Synthesize text to speech using edge-tts.

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.

    Returns:
        TTSResult with MP3 audio bytes and phoneme timestamps.
    """
    if not text or not text.strip():
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)

    try:
        import edge_tts

        voice = _resolve_voice(voice_id)
        communicate = edge_tts.Communicate(text, voice)

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
        return _fallback_tts_result(text, voice_id)
    except Exception as e:
        logger.error("TTS synthesis failed: %s", e)
        return _fallback_tts_result(text, voice_id)


async def synthesize_cached(text: str, voice_id: str | None = None) -> TTSResult:
    """Synthesize with Redis cache check and parallel sentence synthesis.

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

    # Split text into sentences for parallel synthesis
    sentences = _split_sentences(text)
    
    if len(sentences) > 1:
        # Parallel synthesis for multiple sentences
        result = await _synthesize_parallel(sentences, voice_id)
    else:
        # Single sentence synthesis
        result = await synthesize(text, voice_id)

    # Cache if has audio
    if result.audio_bytes:
        await _set_cache(text, voice_id, result)

    return result


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences by Chinese punctuation."""
    if not text:
        return []
    
    # Split by sentence-ending punctuation
    sentences = re.split(r'([。！？；\n]+)', text)
    
    # Merge punctuation with previous sentence
    result = []
    for i in range(0, len(sentences) - 1, 2):
        sentence = sentences[i] + (sentences[i+1] if i+1 < len(sentences) else '')
        if sentence.strip():
            result.append(sentence.strip())
    
    # Handle last sentence without punctuation
    if len(sentences) % 2 == 1 and sentences[-1].strip():
        result.append(sentences[-1].strip())
    
    return result if result else [text]


async def _synthesize_parallel(sentences: list[str], voice_id: str | None = None) -> TTSResult:
    """Synthesize multiple sentences in parallel and merge results."""
    import asyncio
    
    # Synthesize all sentences in parallel
    tasks = [synthesize(sent, voice_id) for sent in sentences]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out exceptions
    valid_results = [r for r in results if isinstance(r, TTSResult)]
    
    if not valid_results:
        return TTSResult(audio_bytes=b"", phoneme_timestamps=[], duration_ms=0)
    
    # Merge audio bytes
    audio_bytes = b"".join(r.audio_bytes for r in valid_results)
    
    # Merge phoneme timestamps with offset
    phonemes = []
    offset_ms = 0
    for r in valid_results:
        for p in r.phoneme_timestamps:
            phonemes.append({
                "char": p.get("char", ""),
                "start_ms": p.get("start_ms", 0) + offset_ms,
                "end_ms": p.get("end_ms", 0) + offset_ms,
                "mouth_shape": p.get("mouth_shape", "closed"),
            })
        offset_ms += r.duration_ms
    
    duration_ms = sum(r.duration_ms for r in valid_results)
    
    logger.info("Parallel TTS: %d sentences, %d bytes, %dms", 
                len(valid_results), len(audio_bytes), duration_ms)
    
    return TTSResult(
        audio_bytes=audio_bytes,
        phoneme_timestamps=phonemes,
        duration_ms=duration_ms,
    )


async def synthesize_stream(
    text: str,
    voice_id: str | None = None,
    chunk_size: int = 4096,
):
    """Synthesize text to speech with streaming output.

    Yields audio chunks as base64-encoded strings for SSE streaming.
    Also yields phoneme timestamps at the end.

    Args:
        text: Text to synthesize.
        voice_id: Voice preset identifier.
        chunk_size: Bytes per chunk (default 4KB).

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
        for i in range(0, len(audio), chunk_size):
            chunk = audio[i:i + chunk_size]
            yield {"type": "audio", "data": base64.b64encode(chunk).decode("utf-8")}
        yield {"type": "phonemes", "data": cached.phoneme_timestamps}
        yield {"type": "done", "duration_ms": cached.duration_ms}
        return

    # Fresh synthesis
    result = await synthesize(text, voice_id)

    if result.audio_bytes:
        import base64
        audio = result.audio_bytes
        for i in range(0, len(audio), chunk_size):
            chunk = audio[i:i + chunk_size]
            yield {"type": "audio", "data": base64.b64encode(chunk).decode("utf-8")}
        # Cache in background
        await _set_cache(text, voice_id, result)

    yield {"type": "phonemes", "data": result.phoneme_timestamps}
    yield {"type": "done", "duration_ms": result.duration_ms}
