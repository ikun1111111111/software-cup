"""Achievement engine — stamps, achievements, leaderboard (M16)."""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Achievement definitions
ACHIEVEMENTS = [
    {
        "id": "first_visit",
        "name": "初到灵山",
        "description": "首次访问灵山胜境",
        "icon": "🏔️",
        "condition": {"type": "visit_count", "value": 1},
    },
    {
        "id": "explorer_5",
        "name": "文化探索者",
        "description": "访问5个景点",
        "icon": "🗺️",
        "condition": {"type": "visit_count", "value": 5},
    },
    {
        "id": "explorer_10",
        "name": "深度旅行者",
        "description": "访问10个景点",
        "icon": "🏆",
        "condition": {"type": "visit_count", "value": 10},
    },
    {
        "id": "quiz_master_5",
        "name": "小学者",
        "description": "答对5道谜题",
        "icon": "📚",
        "condition": {"type": "correct_answers", "value": 5},
    },
    {
        "id": "quiz_master_20",
        "name": "文化学者",
        "description": "答对20道谜题",
        "icon": "🎓",
        "condition": {"type": "correct_answers", "value": 20},
    },
    {
        "id": "stamp_collector_3",
        "name": "印章新手",
        "description": "收集3枚印章",
        "icon": "🔖",
        "condition": {"type": "stamp_count", "value": 3},
    },
    {
        "id": "stamp_collector_all",
        "name": "集章大师",
        "description": "收集全部印章",
        "icon": "👑",
        "condition": {"type": "stamp_count", "value": 12},
    },
    {
        "id": "zen_master",
        "name": "禅修达人",
        "description": "完成3次冥想练习",
        "icon": "🧘",
        "condition": {"type": "meditation_count", "value": 3},
    },
]

# Stamp definitions per spot
STAMPS: dict[str, dict] = {
    "灵山大佛": {"id": "stamp_buddha", "name": "佛光印", "color": "#D4A017", "symbol": "☸"},
    "灵山梵宫": {"id": "stamp_palace", "name": "梵宫印", "color": "#7B2D8E", "symbol": "🏛"},
    "九龙灌浴": {"id": "stamp_dragon", "name": "九龙印", "color": "#1E90FF", "symbol": "🐉"},
    "五印坛城": {"id": "stamp_mandala", "name": "坛城印", "color": "#DC143C", "symbol": "☸"},
    "祥符禅寺": {"id": "stamp_temple", "name": "古刹印", "color": "#8B4513", "symbol": "🛕"},
    "佛手广场": {"id": "stamp_hand", "name": "佛手印", "color": "#FF8C00", "symbol": "🤲"},
    "百子戏弥勒": {"id": "stamp_milefo", "name": "欢喜印", "color": "#FF6347", "symbol": "😊"},
    "曼飞龙塔": {"id": "stamp_pagoda", "name": "飞塔印", "color": "#2E8B57", "symbol": "🗼"},
    "灵山精舍": {"id": "stamp_retreat", "name": "精舍印", "color": "#6B8E23", "symbol": "🏡"},
    "灵山大照壁": {"id": "stamp_wall", "name": "照壁印", "color": "#696969", "symbol": "🧱"},
    "菩提大道": {"id": "stamp_bodhi", "name": "菩提印", "color": "#228B22", "symbol": "🌿"},
    "三圣殿": {"id": "stamp_hall", "name": "三圣印", "color": "#4169E1", "symbol": "⛩"},
}

# In-memory state (in production, use Redis/PostgreSQL)
_user_state: dict[str, dict] = {}


def _get_user_state(session_id: str) -> dict:
    """Get or create user state."""
    if session_id not in _user_state:
        _user_state[session_id] = {
            "session_id": session_id,
            "visited_spots": [],
            "correct_answers": 0,
            "total_answers": 0,
            "stamps": [],
            "achievements": [],
            "score": 0,
            "meditation_count": 0,
            "created_at": datetime.utcnow().isoformat(),
        }
    return _user_state[session_id]


def record_visit(session_id: str, spot_name: str) -> dict:
    """Record a spot visit and check for new achievements/stamps."""
    state = _get_user_state(session_id)
    new_achievements = []
    new_stamps = []

    if spot_name not in state["visited_spots"]:
        state["visited_spots"].append(spot_name)
        state["score"] += 10

    # Check stamps
    if spot_name in STAMPS and STAMPS[spot_name]["id"] not in state["stamps"]:
        stamp = STAMPS[spot_name]
        state["stamps"].append(stamp["id"])
        new_stamps.append(stamp)
        state["score"] += 20

    # Check achievements
    new_achievements = _check_achievements(state)

    return {
        "session_id": session_id,
        "visited_spots": state["visited_spots"],
        "stamps": state["stamps"],
        "achievements": state["achievements"],
        "score": state["score"],
        "new_stamps": new_stamps,
        "new_achievements": new_achievements,
    }


def record_answer(session_id: str, correct: bool) -> dict:
    """Record a puzzle answer."""
    state = _get_user_state(session_id)
    state["total_answers"] += 1
    if correct:
        state["correct_answers"] += 1
        state["score"] += 15

    new_achievements = _check_achievements(state)

    return {
        "correct": correct,
        "total_correct": state["correct_answers"],
        "total_answers": state["total_answers"],
        "score": state["score"],
        "new_achievements": new_achievements,
    }


def get_user_profile(session_id: str) -> dict:
    """Get user's full profile with progress."""
    state = _get_user_state(session_id)
    all_stamps = []
    for spot, stamp in STAMPS.items():
        all_stamps.append({
            **stamp,
            "collected": stamp["id"] in state["stamps"],
            "spot_name": spot,
        })

    return {
        "session_id": session_id,
        "score": state["score"],
        "visited_count": len(state["visited_spots"]),
        "visited_spots": state["visited_spots"],
        "correct_answers": state["correct_answers"],
        "total_answers": state["total_answers"],
        "accuracy": (
            round(state["correct_answers"] / state["total_answers"] * 100, 1)
            if state["total_answers"] > 0 else 0
        ),
        "stamps": all_stamps,
        "collected_stamps": len(state["stamps"]),
        "total_stamps": len(STAMPS),
        "achievements": state["achievements"],
        "level": _calculate_level(state["score"]),
    }


def get_leaderboard(limit: int = 10) -> list[dict]:
    """Get top players by score."""
    players = sorted(
        _user_state.values(),
        key=lambda s: s["score"],
        reverse=True,
    )[:limit]

    return [
        {
            "rank": i + 1,
            "session_id": p["session_id"][:8] + "...",
            "score": p["score"],
            "visited_count": len(p["visited_spots"]),
            "stamps": len(p["stamps"]),
            "achievements": len(p["achievements"]),
        }
        for i, p in enumerate(players)
    ]


def _check_achievements(state: dict) -> list[dict]:
    """Check and award new achievements."""
    new = []
    for ach in ACHIEVEMENTS:
        if ach["id"] in state["achievements"]:
            continue

        cond = ach["condition"]
        value = 0
        if cond["type"] == "visit_count":
            value = len(state["visited_spots"])
        elif cond["type"] == "correct_answers":
            value = state["correct_answers"]
        elif cond["type"] == "stamp_count":
            value = len(state["stamps"])
        elif cond["type"] == "meditation_count":
            value = state.get("meditation_count", 0)

        if value >= cond["value"]:
            state["achievements"].append(ach["id"])
            new.append(ach)
            state["score"] += 50

    return new


def _calculate_level(score: int) -> dict:
    """Calculate user level from score."""
    if score >= 500:
        return {"name": "灵山大师", "icon": "👑", "min_score": 500}
    elif score >= 300:
        return {"name": "文化学者", "icon": "🎓", "min_score": 300}
    elif score >= 150:
        return {"name": "探索者", "icon": "🗺️", "min_score": 150}
    elif score >= 50:
        return {"name": "旅行者", "icon": "🏔️", "min_score": 50}
    else:
        return {"name": "初学者", "icon": "🌱", "min_score": 0}
