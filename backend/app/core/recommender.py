"""Recommendation engine: hybrid content + popularity + LLM enhancement."""
import json
import logging
import re
from typing import Any

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tourist import TouristProfile
from app.models.knowledge import FaqEntry
from app.models.interaction import InteractionLog

logger = logging.getLogger(__name__)

# Known spot keywords extracted from FAQ dataset — used as heuristics when
# vector store is unavailable.
_KNOWN_SPOTS = [
    "灵山大佛", "九龙灌浴", "梵宫", "五印坛城",
    "祥符禅寺", "佛手广场", "百子戏弥勒",
    "曼飞龙塔", "灵山精舍", "灵山大照壁",
    "菩提大道", "三圣殿",
]

_SPOT_TO_TAGS = {
    "灵山大佛": ["佛教", "地标", "拍照", "青铜佛像"],
    "九龙灌浴": ["表演", "音乐", "群雕", "喷水", "亲子"],
    "梵宫": ["建筑", "艺术", "佛教文化", "演出"],
    "五印坛城": ["藏传佛教", "建筑", "文化"],
    "祥符禅寺": ["历史", "古刹", "玄奘", "佛教"],
    "佛手广场": ["祈福", "亲子", "拍照"],
    "百子戏弥勒": ["亲子", "雕塑", "趣味"],
    "曼飞龙塔": ["傣族佛教", "园林", "自然风光"],
    "灵山精舍": ["禅意", "素斋", "住宿"],
    "灵山大照壁": ["浮雕", "佛教文化", "入口"],
    "菩提大道": ["自然风光", "太湖风光"],
    "三圣殿": ["佛教历史", "文化展示"],
}

_SPOT_TO_DURATION = {
    "灵山大佛": "1.5-2小时",
    "九龙灌浴": "30分钟（含表演等待）",
    "梵宫": "1-1.5小时",
    "五印坛城": "40分钟",
    "祥符禅寺": "40分钟",
    "佛手广场": "20分钟",
    "百子戏弥勒": "20分钟",
    "曼飞龙塔": "30分钟",
    "灵山精舍": "1小时",
    "灵山大照壁": "10分钟",
    "菩提大道": "30分钟",
    "三圣殿": "30分钟",
}


def _extract_spot_names(text: str) -> list[str]:
    """Extract known spot names from a text snippet."""
    found = []
    for spot in _KNOWN_SPOTS:
        if spot in text:
            found.append(spot)
    return found


def _deduplicate_spots(spots: list[dict]) -> list[dict]:
    """Deduplicate spots by name, keeping highest score."""
    seen = {}
    for s in spots:
        name = s["spot_name"]
        if name not in seen or s.get("score", 0) > seen[name].get("score", 0):
            seen[name] = s
    return list(seen.values())


async def _fetch_profile(db: AsyncSession, session_id: str) -> TouristProfile | None:
    """Fetch tourist profile by session_id."""
    stmt = select(TouristProfile).where(TouristProfile.session_id == session_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _popular_fallback(db: AsyncSession, limit: int) -> list[dict]:
    """Return popular spots from FAQ entries (cold-start / fallback)."""
    stmt = (
        select(FaqEntry)
        .where(FaqEntry.category == "spots", FaqEntry.is_active == True)
        .order_by(desc(FaqEntry.hit_count))
        .limit(limit * 2)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    recommendations = []
    for row in rows:
        spots = _extract_spot_names(row.answer)
        if not spots:
            continue
        for spot in spots:
            recommendations.append({
                "spot_name": spot,
                "category": "spots",
                "reason": f"{spot}是景区热门景点，深受游客喜爱",
                "suggested_duration": _SPOT_TO_DURATION.get(spot, "1小时"),
                "tags": _SPOT_TO_TAGS.get(spot, []),
                "score": float(row.hit_count),
                "source": "popular",
            })

    return _deduplicate_spots(recommendations)[:limit]


async def _content_recall(
    interests: list[str],
    limit: int,
    exclude_spots: set[str] | None = None,
) -> list[dict]:
    """Recall spots by embedding similarity via Milvus.

    Falls back to keyword matching if vector store is unavailable.
    """
    exclude_spots = exclude_spots or set()
    recommendations = []

    # Try vector-based recall first
    try:
        from app.core.embedding import get_embedding_engine
        from app.core.vector_store import get_vector_store

        engine = get_embedding_engine()
        store = get_vector_store()

        query_text = "、".join(interests) if interests else "景区热门景点推荐"
        embedding = engine.encode_query(query_text)

        results = store.search(embedding, top_k=limit * 3, output_fields=["id", "doc_id", "text"])

        for hit in results:
            text = hit.get("entity", {}).get("text", "")
            if not text:
                continue
            spots = _extract_spot_names(text)
            for spot in spots:
                if spot in exclude_spots:
                    continue
                recommendations.append({
                    "spot_name": spot,
                    "category": "spots",
                    "reason": f"根据您的兴趣「{'、'.join(interests)}」推荐",
                    "suggested_duration": _SPOT_TO_DURATION.get(spot, "1小时"),
                    "tags": _SPOT_TO_TAGS.get(spot, []),
                    "score": float(hit.get("distance", 0)),
                    "source": "content_match",
                })
    except Exception as e:
        logger.warning("Vector-based content recall failed: %s", e)

    # Fallback: keyword matching from known spots
    if not recommendations:
        for spot in _KNOWN_SPOTS:
            if spot in exclude_spots:
                continue
            # Simple relevance: how many interests match tags
            tags = set(_SPOT_TO_TAGS.get(spot, []))
            interest_set = set(interests)
            match_count = len(tags & interest_set)
            if match_count > 0 or not interests:
                recommendations.append({
                    "spot_name": spot,
                    "category": "spots",
                    "reason": f"根据您的兴趣「{'、'.join(interests)}」推荐" if interests else f"{spot}是景区热门景点",
                    "suggested_duration": _SPOT_TO_DURATION.get(spot, "1小时"),
                    "tags": list(tags),
                    "score": float(match_count),
                    "source": "keyword_match",
                })

    recommendations = _deduplicate_spots(recommendations)
    recommendations.sort(key=lambda x: x.get("score", 0), reverse=True)
    return recommendations[:limit]


async def _llm_enhance(
    spots: list[dict],
    profile: TouristProfile | None,
) -> list[dict]:
    """Use LLM to generate personalized reasons for each spot.

    If LLM fails, keep original reasons.
    """
    if not spots:
        return spots

    interests = profile.interests if profile and profile.interests else []
    interest_str = "、".join(interests) if interests else "一般游客"

    spot_list = "\n".join(f"{i+1}. {s['spot_name']}" for i, s in enumerate(spots))

    messages = [
        {
            "role": "system",
            "content": (
                "你是智慧旅游景区的数字人导览员「小景」。"
                "请为以下景点列表生成一句简短的个性化推荐理由（20字以内），"
                "要针对游客的兴趣标签，亲切自然。"
                "只输出JSON数组，格式：[{\"spot_name\":\"...\",\"reason\":\"...\"}]"
            ),
        },
        {
            "role": "user",
            "content": f"游客兴趣：{interest_str}\n景点列表：\n{spot_list}\n请输出JSON：",
        },
    ]

    try:
        from app.core.llm_router import LLMTask, route
        raw = await route(LLMTask.chat, messages=messages, temperature=0.7)

        # Try to extract JSON array
        json_match = re.search(r"\[.*\]", raw, re.DOTALL)
        if json_match:
            reasons = json.loads(json_match.group())
            reason_map = {r["spot_name"]: r["reason"] for r in reasons if "spot_name" in r and "reason" in r}
            for s in spots:
                if s["spot_name"] in reason_map:
                    s["reason"] = reason_map[s["spot_name"]]
                    s["source"] = "llm_enhanced"
    except Exception as e:
        logger.warning("LLM enhancement failed: %s", e)

    return spots


async def recommend(
    session_id: str,
    db: AsyncSession,
    limit: int = 5,
) -> dict:
    """Main recommendation entry point.

    Strategy:
        1. Fetch tourist profile.
        2. If profile has interests → content recall (vector/keyword).
        3. If not enough results → popular fallback.
        4. Exclude already visited spots.
        5. Optionally enhance with LLM.
        6. Return ranked list.
    """
    if limit <= 0:
        limit = 5

    profile = await _fetch_profile(db, session_id)
    visited = set()
    if profile and profile.visit_history:
        for entry in profile.visit_history:
            if isinstance(entry, dict) and "spot" in entry:
                visited.add(entry["spot"])

    recommendations = []
    strategy = "cold_start"

    # Content-based recall
    if profile and profile.interests:
        strategy = "personalized"
        recommendations = await _content_recall(
            profile.interests, limit, exclude_spots=visited
        )

    # Popular fallback if not enough
    if len(recommendations) < limit:
        needed = limit - len(recommendations)
        existing_names = {r["spot_name"] for r in recommendations} | visited
        popular = await _popular_fallback(db, needed * 2)
        for p in popular:
            if p["spot_name"] not in existing_names:
                recommendations.append(p)
                existing_names.add(p["spot_name"])
            if len(recommendations) >= limit:
                break
        if strategy == "cold_start":
            strategy = "popular"

    # LLM enhancement
    if recommendations:
        recommendations = await _llm_enhance(recommendations, profile)

    # Add rank
    for i, r in enumerate(recommendations[:limit], start=1):
        r["rank"] = i

    return {
        "session_id": session_id,
        "recommendations": recommendations[:limit],
        "strategy": strategy,
    }


async def record_feedback(
    session_id: str,
    spot_name: str,
    feedback: str,  # "like" | "dislike"
    db: AsyncSession,
) -> dict:
    """Record user feedback on a recommendation.

    Updates InteractionLog with metadata so we can track recommendation quality.
    """
    try:
        log = InteractionLog(
            session_id=session_id,
            user_input=f"recommendation_feedback:{spot_name}",
            llm_response=feedback,
            input_type="recommend_feedback",
            user_feedback=feedback,
            metadata_json={"spot_name": spot_name, "feedback": feedback},
        )
        db.add(log)
        await db.commit()
        return {"status": "ok", "session_id": session_id, "spot_name": spot_name}
    except Exception as e:
        logger.warning("Failed to record recommendation feedback: %s", e)
        await db.rollback()
        return {"status": "error", "detail": str(e)}
