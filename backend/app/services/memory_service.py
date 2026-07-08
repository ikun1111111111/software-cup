"""Memory service: extract, polish, and summarize travel memories."""
import json
import logging
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm_router import LLMTask, route
from app.core.redis_client import get_redis
from app.models.interaction import InteractionLog
from app.models.memory import TravelMemory, JourneySummary

logger = logging.getLogger(__name__)

_MOOD_MAP = {
    "敬畏": ["壮观", "震撼", "宏伟", "巍峨", "庄严", "肃穆", "敬仰", "崇高"],
    "惊喜": ["惊喜", "意外", "没想到", "竟然", "奇妙", "惊喜万分"],
    "平静": ["宁静", "安详", "舒适", "惬意", "悠闲", "恬淡", "淡然"],
    "感动": ["感动", "动人", "温馨", "感人", "泪目", "触动", "深情"],
    "愉悦": ["开心", "快乐", "高兴", "愉快", "欢喜", "喜悦", "幸福"],
}


def _detect_mood(text: str) -> str | None:
    scores: dict[str, int] = {m: 0 for m in _MOOD_MAP}
    for mood, keywords in _MOOD_MAP.items():
        for kw in keywords:
            if kw in text:
                scores[mood] += 1
    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    return best if scores[best] > 0 else None


async def extract_memories_from_chat(session_id: str, db: AsyncSession) -> list[TravelMemory]:
    """Extract travel memories from chat interaction logs.

    Queries interaction_logs for the session, uses LLM to identify
    valuable memory-worthy exchanges, and stores them as TravelMemory records.
    """
    stmt = select(InteractionLog).where(
        InteractionLog.session_id == session_id
    ).order_by(InteractionLog.created_at)
    logs = (await db.execute(stmt)).scalars().all()

    if not logs:
        return []

    existing_stmt = select(TravelMemory).where(TravelMemory.session_id == session_id)
    existing = (await db.execute(existing_stmt)).scalars().all()
    existing_count = len(existing)

    conversations = []
    for i, log in enumerate(logs):
        conversations.append(f"[第{i+1}轮] 游客: {log.user_input}\nAI导游: {log.llm_response[:200]}")

    chat_text = "\n\n".join(conversations)

    messages = [
        {"role": "system", "content": (
            "你是一位旅行记忆提取师。分析游客与AI导游的对话记录，提取值得铭记的旅行瞬间。\n"
            "每条记忆应该是一个有意义的旅行片段——可能是首次了解某个景点、表达情感的时刻、获得有趣知识的瞬间等。\n"
            "请以JSON数组格式返回，每个元素包含:\n"
            "- title: 简短标题(10字以内)\n"
            "- content: 记忆内容描述(50-100字)\n"
            "- spot_name: 关联景点名(如果没有则为null)\n"
            "- source_type: 来源类型，固定为\"chat\"\n\n"
            "只返回JSON数组，不要其他文字。如果没有值得提取的记忆，返回空数组[]。"
        )},
        {"role": "user", "content": f"以下是游客的对话记录（共{len(logs)}轮），请提取旅行记忆:\n\n{chat_text}"},
    ]

    try:
        result_text = await route(LLMTask.chat, messages=messages, temperature=0.3)
    except Exception as e:
        logger.error("Memory extraction LLM call failed: %s", e)
        return []

    result_text = result_text.strip()
    if result_text.startswith("```"):
        lines = result_text.split("\n")
        result_text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        memories_data = json.loads(result_text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM memory extraction result")
        return []

    if not isinstance(memories_data, list):
        return []

    new_memories = []
    for item in memories_data:
        if not isinstance(item, dict) or not item.get("title") or not item.get("content"):
            continue

        full_text = f"{item.get('title', '')} {item.get('content', '')}"
        mood = _detect_mood(full_text)

        memory = TravelMemory(
            session_id=session_id,
            title=item["title"],
            original_content=item["content"],
            spot_name=item.get("spot_name"),
            source_type=item.get("source_type", "chat"),
            mood_tag=mood,
            metadata_json={"extracted_from": f"{len(logs)}_chat_turns"},
        )
        db.add(memory)
        new_memories.append(memory)

    await db.commit()
    for m in new_memories:
        await db.refresh(m)

    try:
        redis = await get_redis()
        await redis.delete(f"memory:list:{session_id}")
    except Exception:
        pass

    logger.info("Extracted %d new memories for session %s (total existing: %d)", len(new_memories), session_id, existing_count)
    return new_memories


async def polish_memory(memory_id: int, db: AsyncSession) -> TravelMemory | None:
    """Use LLM to polish a single memory's content into literary style."""
    result = await db.execute(
        select(TravelMemory).where(TravelMemory.id == memory_id)
    )
    memory = result.scalar_one_or_none()
    if not memory:
        return None

    if memory.polished_content:
        return memory

    spot_hint = f"关于{memory.spot_name}" if memory.spot_name else ""
    messages = [
        {"role": "system", "content": (
            "你是一位文笔优美的旅行散文作家。请将游客的旅行记录润色为古风散文风格。\n"
            "要求:\n"
            "- 保留原意，不添加虚构内容\n"
            "- 语言优美，适当引用诗词典故\n"
            "- 50-150字\n"
            "- 直接返回润后的文字，不要加任何前缀说明"
        )},
        {"role": "user", "content": f"请润色以下旅行记录{spot_hint}:\n\n{memory.original_content}"},
    ]

    try:
        polished = await route(LLMTask.chat, messages=messages, temperature=0.7)
    except Exception as e:
        logger.error("Memory polish LLM call failed: %s", e)
        memory.polished_content = memory.original_content
        await db.commit()
        return memory

    memory.polished_content = polished.strip()
    await db.commit()
    await db.refresh(memory)

    logger.info("Polished memory %d", memory_id)
    return memory


async def get_memories(session_id: str, db: AsyncSession) -> list[TravelMemory]:
    """Get all memories for a session."""
    try:
        redis = await get_redis()
        cached = await redis.get(f"memory:list:{session_id}")
        if cached:
            data = json.loads(cached)
            stmt = select(TravelMemory).where(
                TravelMemory.session_id == session_id
            ).order_by(TravelMemory.created_at)
            return list((await db.execute(stmt)).scalars().all())
    except Exception:
        pass

    stmt = select(TravelMemory).where(
        TravelMemory.session_id == session_id
    ).order_by(TravelMemory.created_at)
    memories = list((await db.execute(stmt)).scalars().all())

    try:
        redis = await get_redis()
        await redis.set(
            f"memory:list:{session_id}",
            json.dumps({"count": len(memories)}, ensure_ascii=False),
            ex=60,
        )
    except Exception:
        pass

    return memories


async def generate_journey_summary(session_id: str, db: AsyncSession) -> JourneySummary | None:
    """Generate a complete journey summary from all memories."""
    memories = await get_memories(session_id, db)
    if not memories:
        return None

    memory_texts = []
    spot_names = set()
    for m in memories:
        content = m.polished_content or m.original_content
        memory_texts.append(f"【{m.title}】{content}")
        if m.spot_name:
            spot_names.add(m.spot_name)

    combined = "\n\n".join(memory_texts)
    date_range = memories[0].created_at.strftime("%Y-%m-%d") if memories else ""
    if len(memories) > 1:
        end_date = memories[-1].created_at.strftime("%Y-%m-%d")
        date_range = f"{date_range} ~ {end_date}" if end_date != date_range else date_range

    messages = [
        {"role": "system", "content": (
            "你是一位旅行游记作家。请根据游客的旅行记忆，生成一篇完整的游记。\n"
            "要求:\n"
            "- 包含行程概览、亮点景点、旅途感悟\n"
            "- 语言优美，适当引用诗词\n"
            "- 200-500字\n"
            "- 适合发朋友圈/小红书\n"
            "- 同时给这篇游记起一个标题(10字以内)\n\n"
            "请以JSON格式返回: {\"title\": \"游记标题\", \"content\": \"游记正文\"}"
        )},
        {"role": "user", "content": f"以下是游客的{len(memories)}条旅行记忆:\n\n{combined}"},
    ]

    try:
        result_text = await route(LLMTask.summary, messages=messages, temperature=0.7)
    except Exception as e:
        logger.error("Journey summary LLM call failed: %s", e)
        return None

    result_text = result_text.strip()
    if result_text.startswith("```"):
        lines = result_text.split("\n")
        result_text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        summary_data = json.loads(result_text)
    except json.JSONDecodeError:
        summary_data = {"title": "我的旅行游记", "content": result_text}

    summary = JourneySummary(
        session_id=session_id,
        title=summary_data.get("title", "我的旅行游记"),
        content=summary_data.get("content", combined),
        spot_count=len(spot_names),
        memory_count=len(memories),
        date_range=date_range,
    )
    db.add(summary)
    await db.commit()
    await db.refresh(summary)

    logger.info("Generated journey summary for session %s", session_id)
    return summary


async def get_latest_summary(session_id: str, db: AsyncSession) -> JourneySummary | None:
    """Get the most recent journey summary for a session."""
    stmt = select(JourneySummary).where(
        JourneySummary.session_id == session_id
    ).order_by(JourneySummary.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_memory_from_input(
    session_id: str,
    user_input: str,
    spot_name: str | None = None,
    spot_id: str | None = None,
    source_type: str | None = None,
    mood_tag: str | None = None,
    metadata_json: dict | None = None,
    db: AsyncSession | None = None,
) -> TravelMemory:
    """Create a travel memory from user input, polished by LLM."""
    spot_hint = f"在{spot_name}，" if spot_name else ""
    mood_hint = f"情绪基调：{mood_tag}。" if mood_tag else ""

    messages = [
        {"role": "system", "content": (
            "你是一位旅行记忆书写师。根据游客的描述，生成一段精美的旅行记忆。\n"
            "要求:\n"
            "- 保留游客描述的核心内容和情感\n"
            "- 语言优美，有画面感，适当引用诗词或典故\n"
            "- 50-120字\n"
            "- 以JSON格式返回: {\"title\": \"10字以内标题\", \"content\": \"记忆正文\"}\n"
            "- 只返回JSON，不要其他文字"
        )},
        {"role": "user", "content": f"{spot_hint}{mood_hint}我的感受：\n\n{user_input}"},
    ]

    try:
        result_text = await route(LLMTask.chat, messages=messages, temperature=0.7)
    except Exception as e:
        logger.error("Memory creation LLM call failed: %s", e)
        result_text = ""

    result_text = result_text.strip()
    if result_text.startswith("```"):
        lines = result_text.split("\n")
        result_text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    title = user_input[:10]
    content = user_input
    try:
        data = json.loads(result_text)
        title = data.get("title", title)
        content = data.get("content", content)
    except (json.JSONDecodeError, AttributeError):
        pass

    detected_mood = mood_tag or _detect_mood(content) or _detect_mood(user_input)

    memory = TravelMemory(
        session_id=session_id,
        title=title,
        original_content=content,
        spot_name=spot_name,
        spot_id=spot_id,
        source_type=source_type or "user_input",
        mood_tag=detected_mood,
        metadata_json={
            "source": "digital_human",
            "user_raw": user_input[:500],
            **(metadata_json or {}),
        },
    )

    if db:
        db.add(memory)
        await db.commit()
        await db.refresh(memory)

    return memory
