"""TTS API endpoints for streaming audio and cache queries."""
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.tts import synthesize_cached, synthesize_stream

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice_id: str | None = None


class TTSCacheRequest(BaseModel):
    text: str
    voice_id: str | None = None


@router.post("/stream")
async def tts_stream(request: TTSRequest):
    """Stream TTS audio via Server-Sent Events.

    Returns SSE events:
        - event: audio     (base64 audio chunk)
        - event: phonemes  (phoneme timestamps array)
        - event: done      (final metadata with duration_ms)
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    async def event_generator():
        try:
            async for chunk in synthesize_stream(
                request.text,
                voice_id=request.voice_id,
            ):
                event_type = chunk["type"]
                # Wrap data consistently so frontend can always parse as {data: ...}
                if event_type == "audio":
                    payload = {"data": chunk["data"]}
                elif event_type == "phonemes":
                    payload = {"data": chunk["data"]}
                elif event_type == "done":
                    payload = {"duration_ms": chunk.get("duration_ms", 0)}
                else:
                    payload = chunk
                data = json.dumps(payload, ensure_ascii=False)
                yield f"event: {event_type}\ndata: {data}\n\n"
        except Exception as e:
            logger.error("TTS stream error: %s", e)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


@router.post("/cache")
async def tts_cache(request: TTSCacheRequest):
    """Check if TTS audio is cached for the given text.

    Returns:
        {"cached": true, "audio_url": "...", "duration_ms": ..., "phonemes": [...]}
        or {"cached": false}
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = await synthesize_cached(request.text, voice_id=request.voice_id)

    if result and result.audio_bytes:
        import base64
        return {
            "cached": True,
            "audio_base64": base64.b64encode(result.audio_bytes).decode("utf-8"),
            "audio_format": result.audio_format,
            "duration_ms": result.duration_ms,
            "phonemes": result.phoneme_timestamps,
        }

    return {"cached": False}


@router.get("/voices")
async def list_voices():
    """List available TTS voice presets.

    Returns:
        dict mapping voice_id to {speaker_id, description}.
    """
    settings = get_settings()
    return settings.tts_voices
