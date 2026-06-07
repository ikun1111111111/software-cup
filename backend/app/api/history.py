"""History / Time-travel experience API (M14)."""
import logging
from datetime import date

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.history_kg import get_timeline, get_today_card, translate_to_classical

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/history", tags=["history"])


class TimelineEvent(BaseModel):
    era: str
    year: str
    event: str
    description: str
    spot: str


class TimelineResponse(BaseModel):
    total_events: int
    eras: list[str]
    events: list[TimelineEvent]


class TodayCard(BaseModel):
    month: int
    day: int
    title: str
    year_ago: str
    description: str


class TodayCardResponse(BaseModel):
    card: TodayCard
    match: str


class RoleplayRequest(BaseModel):
    era: str
    spot_name: str
    question: str = ""


class TranslateRequest(BaseModel):
    text: str


class TranslateResponse(BaseModel):
    original: str
    classical: str
    note: str | None = None


@router.get("/timeline", response_model=TimelineResponse)
async def timeline(spot_name: str | None = Query(None, description="景点名称筛选")):
    """Get historical timeline of Lingshan scenic area."""
    return await get_timeline(spot_name)


@router.get("/today", response_model=TodayCardResponse)
async def today_in_history():
    """Get 'On this day in history' card."""
    return await get_today_card()


@router.post("/roleplay")
async def roleplay(request: RoleplayRequest):
    """Historical role-play narration (requires LLM)."""
    return {
        "era": request.era,
        "spot_name": request.spot_name,
        "narration": f"（{request.era}风格讲解待LLM生成）关于{request.spot_name}的历史讲述",
        "note": "角色扮演讲解需要LLM服务支持",
    }


@router.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """Translate modern Chinese to classical Chinese."""
    result = await translate_to_classical(request.text)
    return result
