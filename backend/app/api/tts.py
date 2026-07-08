"""TTS API endpoints for streaming audio and cache queries."""
import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.tts import synthesize_cached, synthesize_stream
from app.models.avatar import AvatarConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice_id: str | None = None


class TTSCacheRequest(BaseModel):
    text: str
    voice_id: str | None = None


async def _get_active_voice_id(db: AsyncSession | None = None) -> str | None:
    """Return the voice_id of the currently active avatar, if any."""
    try:
        if db is None:
            from app.core.database import async_session
            async with async_session() as session:
                result = await session.execute(
                    select(AvatarConfig).where(AvatarConfig.is_active == True)
                )
                avatar = result.scalar_one_or_none()
                return avatar.voice_id if avatar else None
        result = await db.execute(
            select(AvatarConfig).where(AvatarConfig.is_active == True)
        )
        avatar = result.scalar_one_or_none()
        return avatar.voice_id if avatar else None
    except Exception as e:
        logger.debug("Failed to get active avatar voice_id: %s", e)
        return None


@router.post("/stream")
async def tts_stream(request: TTSRequest, db: AsyncSession = Depends(get_db)):
    """Stream TTS audio via Server-Sent Events.

    Returns SSE events:
        - event: audio     (base64 audio chunk)
        - event: phonemes  (phoneme timestamps array)
        - event: done      (final metadata with duration_ms)
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    voice_id = request.voice_id or await _get_active_voice_id(db)
    logger.info("[tts_api] request start text_len=%d voice_id=%s", len(request.text), voice_id)
    stream_start = time.time()

    async def event_generator():
        try:
            async for chunk in synthesize_stream(
                request.text,
                voice_id=voice_id,
            ):
                event_type = chunk["type"]
                # Wrap data consistently so frontend can always parse as {data: ...}
                if event_type == "audio":
                    payload = {"data": chunk["data"]}
                elif event_type == "phonemes":
                    payload = {"data": chunk["data"]}
                elif event_type == "done":
                    payload = {"duration_ms": chunk.get("duration_ms", 0)}
                elif event_type == "tts_error":
                    payload = {"error": chunk.get("error", "TTS unavailable")}
                    event_type = "error"
                else:
                    payload = chunk
                data = json.dumps(payload, ensure_ascii=False)
                yield f"event: {event_type}\ndata: {data}\n\n"
        except Exception as e:
            logger.error("[tts_api] stream error: %s", e)
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
    logger.info("[tts_api] response ready elapsed=%.3fs", time.time() - stream_start)
    return response


@router.post("/cache")
async def tts_cache(request: TTSCacheRequest, db: AsyncSession = Depends(get_db)):
    """Check if TTS audio is cached for the given text.

    Returns:
        {"cached": true, "audio_url": "...", "duration_ms": ..., "phonemes": [...]}
        or {"cached": false}
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    voice_id = request.voice_id or await _get_active_voice_id(db)
    result = await synthesize_cached(request.text, voice_id=voice_id)

    if result and result.audio_bytes:
        import base64
        return {
            "cached": True,
            "audio_base64": base64.b64encode(result.audio_bytes).decode("utf-8"),
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
