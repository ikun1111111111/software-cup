"""Story service: multi-act storytelling narration for scenic spots."""
import asyncio
import json
import logging
from pathlib import Path

from sqlalchemy import select

from app.core.llm_router import LLMTask, route
from app.core.rag import retrieve
from app.core.prompts import build_story_act_prompt
from app.core.redis_client import get_redis
from app.core.database import async_session
from app.models.tourist import ScenicSpot

logger = logging.getLogger(__name__)

_CACHE_TTL = 3600

_frameworks_cache: dict | None = None
_frameworks_cache_time: float = 0.0
_frameworks_cache_ttl: float = 30.0


async def _load_frameworks() -> dict:
    """Load story act frameworks from scenic_spots.story_acts."""
    global _frameworks_cache, _frameworks_cache_time
    now = asyncio.get_event_loop().time()
    if _frameworks_cache is not None and (now - _frameworks_cache_time) < _frameworks_cache_ttl:
        return _frameworks_cache

    frameworks = {}
    try:
        async with async_session() as db:
            stmt = select(ScenicSpot).where(ScenicSpot.story_acts.isnot(None))
            result = await db.execute(stmt)
            spots = result.scalars().all()
            for spot in spots:
                frameworks[spot.id] = {
                    "name": spot.name,
                    "description": spot.overview or "",
                    "acts": spot.story_acts or [],
                }
    except Exception as e:
        logger.error("Failed to load story frameworks from DB: %s", e)
        raise

    _frameworks_cache = frameworks
    _frameworks_cache_time = now
    return frameworks


def invalidate_frameworks_cache() -> None:
    """Invalidate the in-memory frameworks cache. Call after DB writes."""
    global _frameworks_cache, _frameworks_cache_time
    _frameworks_cache = None
    _frameworks_cache_time = 0.0


def _cache_key(spot_id: str) -> str:
    return f"story:acts:{spot_id}"


def _fallback_narration(spot_name: str, act_title: str) -> str:
    return f"关于{spot_name}的{act_title}，小景暂时语塞，请稍候。"


async def _generate_one_act(
    spot_name: str,
    act: dict,
    context_chunks: list[dict],
) -> dict:
    """Generate narration for one act; on failure, return fallback text."""
    try:
        messages = build_story_act_prompt(
            spot_name=spot_name,
            act_title=act["title"],
            prompt_hint=act["prompt_hint"],
            emotion=act["emotion"],
            context_chunks=context_chunks,
        )
        narration = await route(LLMTask.chat, messages=messages)
        narration = (narration or "").strip()
        if not narration:
            narration = _fallback_narration(spot_name, act["title"])
    except Exception as e:
        logger.warning(
            "Story act generation failed for '%s/%s': %s",
            spot_name, act["id"], e,
        )
        narration = _fallback_narration(spot_name, act["title"])

    return {
        "id": act["id"],
        "title": act["title"],
        "narration": narration,
        "emotion": act["emotion"],
        "act_image": act.get("act_image"),
        "prompt_hint": act.get("prompt_hint"),
    }


async def generate_story_acts(spot_id: str, use_cache: bool = True) -> dict:
    """Generate a multi-act story script for a scenic spot.

    Args:
        spot_id: Spot identifier (slug).
        use_cache: Whether to use Redis cache (TTL 1 hour).

    Returns:
        Dict: {spot_id, spot_name, description, acts: [...]}
    """
    frameworks = await _load_frameworks()
    if spot_id not in frameworks:
        raise ValueError(f"Unknown spot_id: {spot_id}")

    framework = frameworks[spot_id]
    spot_name = framework["name"]
    description = framework.get("description", "")

    if use_cache:
        try:
            redis = await get_redis()
            cached = await redis.get(_cache_key(spot_id))
            if cached:
                logger.info("Story acts cache hit for '%s'", spot_id)
                return json.loads(cached)
        except Exception as e:
            logger.debug("Story acts cache check failed: %s", e)

    chunks: list[dict] = []
    try:
        chunks = await retrieve(f"{spot_name} 景点 历史 故事 典故")
    except Exception as e:
        logger.warning("RAG retrieval failed for story '%s': %s", spot_id, e)

    acts = await asyncio.gather(
        *[_generate_one_act(spot_name, act, chunks) for act in framework["acts"]]
    )

    result = {
        "spot_id": spot_id,
        "spot_name": spot_name,
        "description": description,
        "acts": list(acts),
    }

    if use_cache:
        try:
            redis = await get_redis()
            await redis.set(
                _cache_key(spot_id),
                json.dumps(result, ensure_ascii=False),
                ex=_CACHE_TTL,
            )
        except Exception as e:
            logger.debug("Story acts cache set failed: %s", e)

    return result


# ── Legacy single-story API (kept for backward compatibility) ──────────────

_LEGACY_EMOTION_MAP = {
    "sorry": ["感人", "悲伤", "遗憾", "不幸", "苦难", "牺牲", "泪水", "离别"],
    "surprise": ["壮观", "震撼", "奇迹", "惊叹", "宏伟", "磅礴", "令人叹为观止"],
    "smile": ["有趣", "欢乐", "幽默", "开心", "美好", "温馨", "幸福", "可爱"],
    "think": ["神秘", "传说", "谜团", "探索", "追寻", "发现"],
}


def _detect_emotion(story_text: str) -> str:
    scores: dict[str, int] = {e: 0 for e in _LEGACY_EMOTION_MAP}
    for emotion, keywords in _LEGACY_EMOTION_MAP.items():
        for kw in keywords:
            if kw in story_text:
                scores[emotion] += 1
    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    return best if scores[best] > 0 else "neutral"


def _legacy_cache_key(spot_name: str) -> str:
    return f"story:{spot_name}"


async def generate_story(spot_name: str, use_cache: bool = True) -> dict:
    """Legacy: generate a single-block storytelling narration."""
    from app.core.prompts import SYSTEM_PROMPT_STORY, build_story_prompt

    if use_cache:
        try:
            redis = await get_redis()
            cached = await redis.get(_legacy_cache_key(spot_name))
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.debug("Legacy story cache check failed: %s", e)

    chunks: list[dict] = []
    try:
        chunks = await retrieve(f"{spot_name} 景点历史 故事 典故")
    except Exception as e:
        logger.warning("RAG retrieval failed for story '%s': %s", spot_name, e)

    if chunks:
        messages = build_story_prompt(spot_name, chunks)
    else:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_STORY},
            {"role": "user", "content": f"请为景点「{spot_name}」讲一个动人的故事。请开始讲述:"},
        ]

    try:
        story_text = await route(LLMTask.chat, messages=messages)
    except Exception as e:
        logger.error("Story generation failed for '%s': %s", spot_name, e)
        return {
            "spot_name": spot_name,
            "story": f"关于{spot_name}的故事正在准备中，请稍后再试。",
            "emotion": "neutral",
            "knowledge_chunks": [],
        }

    emotion = _detect_emotion(story_text)
    result = {
        "spot_name": spot_name,
        "story": story_text.strip(),
        "emotion": emotion,
        "knowledge_chunks": [
            {"text": c.get("text", ""), "score": c.get("rerank_score", c.get("score", 0))}
            for c in chunks[:3]
        ],
    }

    if use_cache:
        try:
            redis = await get_redis()
            await redis.set(
                _legacy_cache_key(spot_name),
                json.dumps(result, ensure_ascii=False),
                ex=3600,
            )
        except Exception as e:
            logger.debug("Legacy story cache set failed: %s", e)

    return result
