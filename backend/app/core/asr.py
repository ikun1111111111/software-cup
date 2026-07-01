"""ASR (Automatic Speech Recognition) via faster-whisper.

Provides audio-to-text transcription with preprocessing (VAD + noise reduction).
When faster-whisper is not available, falls back to a placeholder implementation.
"""
import logging
import io
import struct
import tempfile
import wave
import asyncio
from typing import Optional

import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy-loaded whisper model with async initialization
_whisper_model = None
_model_lock = asyncio.Lock()


async def init_asr_model():
    """Pre-load ASR model at application startup for faster first request."""
    global _whisper_model
    if _whisper_model is not None:
        return
    
    async with _model_lock:
        if _whisper_model is not None:
            return
        
        try:
            from faster_whisper import WhisperModel
            logger.info("Pre-loading Whisper model: %s", settings.whisper_model)
            
            # Load model in thread pool to avoid blocking event loop
            loop = asyncio.get_event_loop()
            _whisper_model = await loop.run_in_executor(
                None,
                lambda: WhisperModel(
                    settings.whisper_model,
                    device=settings.whisper_device,
                    compute_type="int8",
                )
            )
            logger.info("Whisper model pre-loaded successfully")
        except Exception as e:
            logger.error("Failed to pre-load Whisper model: %s", e)
            # Don't raise - allow fallback behavior


async def _get_whisper_model():
    """Get whisper model, initializing if necessary."""
    global _whisper_model
    if _whisper_model is None:
        await init_asr_model()
    return _whisper_model


def _read_wav_pcm(audio_bytes: bytes) -> Optional[np.ndarray]:
    """尝试将 bytes 解析为 16kHz/16bit/mono WAV 并返回 PCM numpy 数组。"""
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)

        if sampwidth != 2:
            logger.warning("WAV sample width %d != 2, skipping PCM parse", sampwidth)
            return None

        pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32)

        # 多声道取平均
        if n_channels > 1:
            pcm = pcm.reshape(-1, n_channels).mean(axis=1)

        # 重采样到 16kHz
        if framerate != 16000:
            ratio = 16000 / framerate
            new_len = int(len(pcm) * ratio)
            indices = np.linspace(0, len(pcm) - 1, new_len).astype(int)
            pcm = pcm[indices]

        return pcm
    except Exception as e:
        logger.debug("WAV PCM parse failed: %s", e)
        return None


def _apply_noise_reduce(pcm: np.ndarray) -> np.ndarray:
    """使用 noisereduce 库进行简单降噪。"""
    try:
        import noisereduce as nr
        return nr.reduce_noise(y=pcm, sr=16000, prop_decrease=0.6, stationary=True)
    except Exception as e:
        logger.debug("Noise reduction failed: %s, skipping", e)
        return pcm


def _apply_vad_trim(pcm: np.ndarray) -> np.ndarray:
    """使用 webrtcvad 去除首尾静音段。"""
    try:
        import webrtcvad
        vad = webrtcvad.Vad(2)  # 中等敏感度
        frame_ms = 30
        frame_size = int(16000 * frame_ms / 1000)  # 480 samples at 16kHz

        # 确保 PCM 长度是 frame_size 的整数倍
        pad_len = frame_size - (len(pcm) % frame_size)
        if pad_len < frame_size:
            pcm_padded = np.pad(pcm, (0, pad_len), mode="constant")
        else:
            pcm_padded = pcm

        pcm_int16 = pcm_padded.astype(np.int16)
        n_frames = len(pcm_int16) // frame_size

        # 找首个有声帧
        first_voice = 0
        for i in range(n_frames):
            chunk = pcm_int16[i * frame_size:(i + 1) * frame_size]
            if vad.is_speech(chunk.tobytes(), 16000):
                first_voice = i
                break

        # 找最后有声帧
        last_voice = n_frames - 1
        for i in range(n_frames - 1, -1, -1):
            chunk = pcm_int16[i * frame_size:(i + 1) * frame_size]
            if vad.is_speech(chunk.tobytes(), 16000):
                last_voice = i
                break

        # 加前后 100ms 缓冲
        buffer_frames = int(100 / frame_ms) + 1
        start = max(0, (first_voice - buffer_frames) * frame_size)
        end = min(len(pcm), (last_voice + buffer_frames + 1) * frame_size)

        if end - start < frame_size:
            return pcm  # 太短，不裁剪

        return pcm[start:end]
    except Exception as e:
        logger.debug("VAD trim failed: %s, skipping", e)
        return pcm


def _preprocess_audio(audio_bytes: bytes) -> bytes:
    """Preprocess audio: noise reduction + VAD trim, return WAV bytes.

    Falls back to original audio on any processing failure.
    """
    pcm = _read_wav_pcm(audio_bytes)
    if pcm is None or len(pcm) < 1600:  # < 100ms
        return audio_bytes

    try:
        # 1. 降噪
        pcm = _apply_noise_reduce(pcm)

        # 2. VAD 裁剪首尾静音
        pcm = _apply_vad_trim(pcm)

        # 3. 归一化音量
        peak = np.max(np.abs(pcm))
        if peak > 0:
            pcm = pcm / peak * 32000  # 接近 int16 最大值

        # 4. 转回 WAV bytes
        pcm_int16 = pcm.astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(pcm_int16.tobytes())

        return buf.getvalue()
    except Exception as e:
        logger.warning("Audio preprocessing failed, using original: %s", e)
        return audio_bytes


async def transcribe(audio_bytes: bytes, language: str = "zh") -> str:
    """Transcribe audio bytes to text.

    Args:
        audio_bytes: Raw audio data (expected 16kHz 16bit mono WAV).
        language: Language code, default "zh" for Chinese.

    Returns:
        Transcribed text.

    Raises:
        RuntimeError: If ASR model is not available.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        logger.warning("Audio too short or empty")
        return ""

    try:
        model = await _get_whisper_model()
        if model is None:
            logger.warning("ASR fallback: model not available")
            return "[语音服务暂不可用，请使用文字输入]"
        
        processed = _preprocess_audio(audio_bytes)

        # Write to temp file (faster-whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(processed)
            tmp_path = tmp.name

        # Run transcription in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        segments, info = await loop.run_in_executor(
            None,
            lambda: model.transcribe(tmp_path, language=language, beam_size=5)
        )
        text = " ".join(s.text.strip() for s in segments)

        logger.info("ASR result [%s, confidence=%.2f]: %s", info.language, info.language_probability, text[:50])
        return text

    except RuntimeError:
        # Model not available — fallback
        logger.warning("ASR fallback: model not available")
        return "[语音服务暂不可用，请使用文字输入]"
    except Exception as e:
        logger.error("ASR transcription failed: %s", e)
        return "[语音识别失败，请重试]"


async def transcribe_file(file_path: str, language: str = "zh") -> str:
    """Transcribe audio file to text.

    Args:
        file_path: Path to audio file.
        language: Language code.

    Returns:
        Transcribed text.
    """
    try:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
    except Exception as e:
        logger.error("Failed to read audio file: %s", e)
        return ""

    return await transcribe(audio_bytes, language)
