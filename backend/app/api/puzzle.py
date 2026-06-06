"""Puzzle / stamp / achievement API (M16)."""
import json
import logging

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.rag import retrieve
from app.core.llm_router import LLMTask, route
from app.core.prompts import build_puzzle_prompt
from app.services.achievement_engine import (
    record_visit,
    record_answer,
    get_user_profile,
    get_leaderboard,
    STAMPS,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/puzzle", tags=["puzzle"])


# ── Request / Response models ────────────────────────────────────────────────

class PuzzleGenerateRequest(BaseModel):
    spot_name: str
    count: int = 4


class PuzzleItem(BaseModel):
    id: int
    question: str
    options: list[str]
    answer_index: int
    explanation: str
    difficulty: str


class PuzzleGenerateResponse(BaseModel):
    spot_name: str
    puzzles: list[PuzzleItem]
    source: str


class AnswerRequest(BaseModel):
    session_id: str
    puzzle_id: int
    selected_index: int
    correct_index: int


class AnswerResponse(BaseModel):
    correct: bool
    total_correct: int
    total_answers: int
    score: int
    new_achievements: list[dict]


class StampItem(BaseModel):
    id: str
    name: str
    color: str
    symbol: str
    collected: bool
    spot_name: str


class StampResponse(BaseModel):
    stamps: list[StampItem]
    collected_count: int
    total_count: int


class AchievementItem(BaseModel):
    id: str
    name: str
    description: str
    icon: str


class ProfileResponse(BaseModel):
    session_id: str
    score: int
    visited_count: int
    correct_answers: int
    total_answers: int
    accuracy: float
    collected_stamps: int
    total_stamps: int
    achievements: list[str]
    level: dict


class LeaderboardItem(BaseModel):
    rank: int
    session_id: str
    score: int
    visited_count: int
    stamps: int
    achievements: int


class LeaderboardResponse(BaseModel):
    players: list[LeaderboardItem]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=PuzzleGenerateResponse)
async def generate_puzzles(request: PuzzleGenerateRequest):
    """Generate AI puzzles for a scenic spot."""
    spot_name = request.spot_name

    # Try LLM generation
    try:
        chunks = await retrieve(spot_name)
        messages = build_puzzle_prompt(spot_name, chunks)
        raw = await route(LLMTask.chat, messages=messages)

        # Parse JSON from LLM response
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            puzzles = [PuzzleItem(**p) for p in data.get("puzzles", [])]
            if puzzles:
                return PuzzleGenerateResponse(
                    spot_name=spot_name,
                    puzzles=puzzles,
                    source="llm",
                )
    except Exception as e:
        logger.warning("LLM puzzle generation failed: %s", e)

    # Fallback: static puzzles
    puzzles = _fallback_puzzles(spot_name)
    return PuzzleGenerateResponse(
        spot_name=spot_name,
        puzzles=puzzles,
        source="fallback",
    )


@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(request: AnswerRequest):
    """Submit a puzzle answer."""
    correct = request.selected_index == request.correct_index
    result = record_answer(request.session_id, correct)
    return AnswerResponse(
        correct=correct,
        total_correct=result["total_correct"],
        total_answers=result["total_answers"],
        score=result["score"],
        new_achievements=result["new_achievements"],
    )


@router.post("/visit")
async def record_spot_visit(
    session_id: str = Query(...),
    spot_name: str = Query(...),
):
    """Record a spot visit for achievements."""
    return record_visit(session_id, spot_name)


@router.get("/stamps", response_model=StampResponse)
async def get_stamps(session_id: str = Query(...)):
    """Get user's stamp collection."""
    profile = get_user_profile(session_id)
    return StampResponse(
        stamps=[StampItem(**s) for s in profile["stamps"]],
        collected_count=profile["collected_stamps"],
        total_count=profile["total_stamps"],
    )


@router.get("/achievements")
async def get_achievements(session_id: str = Query(...)):
    """Get user's achievements."""
    profile = get_user_profile(session_id)
    from app.services.achievement_engine import ACHIEVEMENTS
    all_achievements = []
    for ach in ACHIEVEMENTS:
        all_achievements.append({
            **ach,
            "unlocked": ach["id"] in profile["achievements"],
        })
    return {
        "achievements": all_achievements,
        "unlocked_count": len(profile["achievements"]),
        "total_count": len(all_achievements),
    }


@router.get("/profile", response_model=ProfileResponse)
async def user_profile(session_id: str = Query(...)):
    """Get user's full game profile."""
    profile = get_user_profile(session_id)
    return ProfileResponse(**profile)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(limit: int = Query(10, ge=1, le=50)):
    """Get puzzle leaderboard."""
    players = get_leaderboard(limit)
    return LeaderboardResponse(players=[LeaderboardItem(**p) for p in players])


# ── Fallback puzzles ─────────────────────────────────────────────────────────

def _fallback_puzzles(spot_name: str) -> list[PuzzleItem]:
    """Generate fallback static puzzles when LLM is unavailable."""
    puzzles_data: dict[str, list[dict]] = {
        "灵山大佛": [
            {"question": "灵山大佛的高度是多少米？", "options": ["68米", "78米", "88米", "98米"], "answer": 2, "difficulty": "easy", "explanation": "灵山大佛高88米，是世界最高露天青铜释迦牟尼立像。"},
            {"question": "灵山大佛建于哪一年？", "options": ["1995年", "1997年", "1999年", "2001年"], "answer": 1, "difficulty": "medium", "explanation": "灵山大佛于1997年11月15日落成开光。"},
            {"question": "登顶大佛需要走多少级台阶？", "options": ["108级", "156级", "216级", "360级"], "answer": 2, "difficulty": "medium", "explanation": "216级台阶寓意108烦恼与108愿望。"},
            {"question": "灵山大佛与哪座大佛共同构成'五方五佛'？", "options": ["普陀山大佛", "峨眉山金佛", "香港天坛大佛", "布达拉宫大佛"], "answer": 2, "difficulty": "hard", "explanation": "五方五佛包括灵山大佛、天坛大佛、乐山大佛、云冈大佛、龙门大佛。"},
        ],
        "灵山梵宫": [
            {"question": "灵山梵宫被誉为？", "options": ["东方明珠", "佛教艺术的卢浮宫", "东方威尼斯", "江南第一宫"], "answer": 1, "difficulty": "easy", "explanation": "灵山梵宫被誉为'佛教艺术的卢浮宫'。"},
            {"question": "梵宫于哪一年正式开放？", "options": ["2007年", "2008年", "2009年", "2010年"], "answer": 2, "difficulty": "medium", "explanation": "灵山梵宫于2009年1月1日正式开放。"},
            {"question": "梵宫内著名的琉璃作品名为？", "options": ["《莲花世界》", "《华藏世界》", "《极乐世界》", "《大千世界》"], "answer": 1, "difficulty": "hard", "explanation": "《华藏世界》琉璃作品七彩光芒令人叹为观止。"},
        ],
    }

    data = puzzles_data.get(spot_name, [
        {"question": f"以下哪个描述与{spot_name}最相关？", "options": ["灵山胜境核心景点", "位于太湖之滨", "佛教文化重要场所", "以上都是"], "answer": 3, "difficulty": "easy", "explanation": f"{spot_name}是灵山胜境的重要组成部分。"},
        {"question": "灵山胜境位于中国的哪个城市？", "options": ["南京", "苏州", "无锡", "杭州"], "answer": 2, "difficulty": "easy", "explanation": "灵山胜境位于江苏省无锡市。"},
        {"question": "灵山胜境的命名与哪位历史人物有关？", "options": ["李白", "苏轼", "玄奘", "鉴真"], "answer": 2, "difficulty": "medium", "explanation": "玄奘法师见此地山形似印度灵鹫山，命名为'小灵山'。"},
    ])

    return [
        PuzzleItem(
            id=i + 1,
            question=p["question"],
            options=p["options"],
            answer_index=p["answer"],
            explanation=p["explanation"],
            difficulty=p["difficulty"],
        )
        for i, p in enumerate(data)
    ]
