"""Story service: storytelling narration for scenic spots."""
import json
import logging

from app.core.llm_router import LLMTask, route
from app.core.rag import retrieve
from app.core.prompts import build_story_prompt
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

_EMOTION_MAP = {
    "sorry": ["感人", "悲伤", "遗憾", "不幸", "苦难", "牺牲", "泪水", "离别"],
    "surprise": ["壮观", "震撼", "奇迹", "惊叹", "宏伟", "磅礴", "令人叹为观止"],
    "smile": ["有趣", "欢乐", "幽默", "开心", "美好", "温馨", "幸福", "可爱"],
    "think": ["神秘", "传说", "谜团", "探索", "追寻", "发现"],
}


def _detect_emotion(story_text: str) -> str:
    """Detect dominant emotion from story text for digital human expression."""
    scores: dict[str, int] = {e: 0 for e in _EMOTION_MAP}
    for emotion, keywords in _EMOTION_MAP.items():
        for kw in keywords:
            if kw in story_text:
                scores[emotion] += 1

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    return best if scores[best] > 0 else "neutral"


def _cache_key(spot_name: str) -> str:
    return f"story:{spot_name}"


async def generate_story(spot_name: str, use_cache: bool = True) -> dict:
    """Generate a storytelling narration for a scenic spot.

    Args:
        spot_name: Name of the scenic spot.
        use_cache: Whether to use Redis cache (default True, TTL 1 hour).

    Returns:
        Dict with keys: spot_name, story, emotion, knowledge_chunks
    """
    if use_cache:
        try:
            redis = await get_redis()
            cached = await redis.get(_cache_key(spot_name))
            if cached:
                logger.info("Story cache hit for '%s'", spot_name)
                return json.loads(cached)
        except Exception as e:
            logger.debug("Story cache check failed: %s", e)

    chunks = []
    try:
        chunks = await retrieve(f"{spot_name} 景点历史 故事 典故")
    except Exception as e:
        logger.warning("RAG retrieval failed for story '%s': %s", spot_name, e)

    if chunks:
        messages = build_story_prompt(spot_name, chunks)
    else:
        from app.core.prompts import SYSTEM_PROMPT_STORY
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
        "knowledge_chunks": [{"text": c.get("text", ""), "score": c.get("rerank_score", c.get("score", 0))} for c in chunks[:3]],
    }

    if use_cache:
        try:
            redis = await get_redis()
            await redis.set(
                _cache_key(spot_name),
                json.dumps(result, ensure_ascii=False),
                ex=3600,
            )
        except Exception as e:
            logger.debug("Story cache set failed: %s", e)

    return result
