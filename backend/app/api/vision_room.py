"""Vision-Room bridge API — sync photo identification results to rooms."""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.vision_room_sync import sync_vision_to_room

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/vision", tags=["vision-room"])


class SyncToRoomRequest(BaseModel):
    room_id: str = Field(..., min_length=6, max_length=6, description="6-digit room code")
    spot_name: str = Field(..., min_length=1, description="Identified scenic spot name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Vision confidence score")
    note: str = Field(default="", description="Optional note")


class SyncToRoomResponse(BaseModel):
    status: str
    room_id: str
    spot_name: str
    confidence: float
    itinerary_count: int


@router.post("/sync-to-room", response_model=SyncToRoomResponse)
async def sync_vision_to_room_endpoint(request: SyncToRoomRequest):
    """Sync a vision-identified scenic spot to a collaborative room.

    The identified spot is added to the room's shared itinerary and
    broadcast to all members via WebSocket.

    Requirements:
        - room_id must be a valid 6-digit active room
        - confidence must be >= 0.4
        - spot_name must match a known Lingshengjing scenic spot
    """
    try:
        result = await sync_vision_to_room(
            room_id=request.room_id,
            spot_name=request.spot_name,
            confidence=request.confidence,
            note=request.note,
        )
        return SyncToRoomResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Vision sync to room failed: %s", e)
        raise HTTPException(status_code=500, detail="同步失败，请稍后重试")
