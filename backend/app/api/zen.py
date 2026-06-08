"""Zen meditation API (M15)."""
import logging

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.meditation_service import (
    generate_meditation_script,
    generate_zen_report,
    get_sound_map,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/zen", tags=["zen"])


class MeditationRequest(BaseModel):
    spot_name: str
    duration: int = 180  # seconds


class MeditationResponse(BaseModel):
    spot_name: str
    script: str
    source: str
    duration_seconds: int


class ZenReportRequest(BaseModel):
    spots_visited: list[str] = []
    meditation_count: int = 0
    sound_sessions: int = 0


class ZenReportResponse(BaseModel):
    report: str
    spots_visited: list[str]
    meditation_count: int
    sound_sessions: int


class SoundMapSpot(BaseModel):
    sounds: list[str]
    description: str
    ambient: str


class SoundMapResponse(BaseModel):
    spot: str | None = None
    spots: dict[str, SoundMapSpot] | None = None
    sounds: list[str] | None = None
    description: str | None = None
    ambient: str | None = None


@router.post("/meditation-script", response_model=MeditationResponse)
async def meditation_script(request: MeditationRequest):
    """Generate a meditation script for a scenic spot."""
    result = await generate_meditation_script(request.spot_name)
    return result


@router.get("/report", response_model=ZenReportResponse)
async def zen_report(
    spots: str = Query("", description="逗号分隔的景点列表"),
    meditation_count: int = Query(0, ge=0),
    sound_sessions: int = Query(0, ge=0),
):
    """Generate a zen retreat report."""
    spots_list = [s.strip() for s in spots.split(",") if s.strip()] if spots else []
    result = await generate_zen_report(spots_list, meditation_count, sound_sessions)
    return result


@router.get("/sound-map", response_model=SoundMapResponse)
async def sound_map(spot_name: str | None = Query(None, description="景点名称")):
    """Get sound map data for scenic spots."""
    return get_sound_map(spot_name)
