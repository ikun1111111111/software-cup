"""ASR (Automatic Speech Recognition) via faster-whisper.

Provides audio-to-text transcription with preprocessing (VAD + noise reduction).
When faster-whisper is not available, falls back to a placeholder implementation.
"""
import logging
import io
import tempfile

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy-loaded whisper model
_whisper_model = None


def _get_whisper_model():
    """Lazy load faster-whisper model."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Loading Whisper model: %s", settings.whisper_model)
            _whisper_model = WhisperModel(
                settings.whisper_model,
                device=settings.whisper_device,
                compute_type="int8",
            )
            logger.info("Whisper model loaded")
        except Exception as e:
            logger.error("Failed to load Whisper model: %s", e)
            raise RuntimeError(
                "Whisper model not available. "
                "Please install faster-whisper and download the model."
            ) from e
    return _whisper_model


def _preprocess_audio(audio_bytes: bytes) -> bytes:
    """Preprocess audio: convert to wav if needed, apply VAD + noise reduction.

    Currently assumes input is already 16kHz 16bit mono WAV.
    Future: add format conversion, resampling, VAD trimming.
    """
    # TODO: add webrtcvad trimming + noisereduce
    # For now, pass through
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
        model = _get_whisper_model()
        processed = _preprocess_audio(audio_bytes)

        # Write to temp file (faster-whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(processed)
            tmp_path = tmp.name

        segments, info = model.transcribe(tmp_path, language=language, beam_size=5)
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
