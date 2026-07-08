"""ASR REST API endpoint."""
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.asr import transcribe

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/asr", tags=["asr"])


@router.post("")
@router.post("/transcribe")
async def asr_transcribe(audio: UploadFile = File(...)):
    """Transcribe uploaded audio to text.

    Args:
        audio: Audio file (preferred 16kHz 16bit mono WAV).

    Returns:
        {"text": "transcribed text"}
    """
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be audio")

    try:
        audio_bytes = await audio.read()
        if not audio_bytes or len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Audio too short or empty")

        text = await transcribe(audio_bytes)
        logger.info("[asr_api] transcribed len=%d text=%r", len(audio_bytes), text[:50])
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[asr_api] transcription failed: %s", e)
        raise HTTPException(status_code=500, detail=f"语音识别失败: {str(e)}")
