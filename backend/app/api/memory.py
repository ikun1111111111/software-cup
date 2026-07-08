"""Memory API — travel memory extraction, polishing, and journey summary."""
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.memory_service import (
    extract_memories_from_chat,
    get_memories,
    polish_memory,
    generate_journey_summary,
    get_latest_summary,
    create_memory_from_input,
)
from app.services.session_stats_service import get_session_stats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryOut(BaseModel):
    id: int
    session_id: str
    title: str
    original_content: str
    polished_content: str | None = None
    spot_name: str | None = None
    spot_id: str | None = None
    source_type: str
    mood_tag: str | None = None
    metadata_json: dict | None = None
    photo_url: str | None = None
    voice_url: str | None = None
    voice_duration: int | None = None
    is_capsule: bool = False
    capsule_unlock_at: str | None = None
    capsule_content: str | None = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class JourneySummaryOut(BaseModel):
    id: int
    session_id: str
    title: str
    content: str
    spot_count: int
    memory_count: int
    date_range: str
    cover_image_url: str | None = None
    created_at: str

    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    session_id: str


class PolishRequest(BaseModel):
    pass


class SummaryGenerateRequest(BaseModel):
    session_id: str


class CreateMemoryRequest(BaseModel):
    session_id: str
    user_input: str
    spot_name: str | None = None
    spot_id: str | None = None
    source_type: str | None = None
    mood_tag: str | None = None
    metadata_json: dict | None = None
    photo_url: str | None = None
    voice_url: str | None = None
    voice_duration: int | None = None


class CreateCapsuleRequest(BaseModel):
    session_id: str
    title: str
    content: str
    unlock_days: int = 30  # 多少天后解锁
    spot_name: str | None = None
    mood_tag: str | None = None


def _serialize_memory(m) -> dict:
    return {
        "id": m.id,
        "session_id": m.session_id,
        "title": m.title,
        "original_content": m.original_content,
        "polished_content": m.polished_content,
        "spot_name": m.spot_name,
        "spot_id": m.spot_id,
        "source_type": m.source_type,
        "mood_tag": m.mood_tag,
        "metadata_json": m.metadata_json,
        "photo_url": getattr(m, "photo_url", None),
        "voice_url": getattr(m, "voice_url", None),
        "voice_duration": getattr(m, "voice_duration", None),
        "is_capsule": getattr(m, "is_capsule", False),
        "capsule_unlock_at": m.capsule_unlock_at.isoformat() if getattr(m, "capsule_unlock_at", None) else None,
        "capsule_content": m.capsule_content if getattr(m, "is_capsule", False) and m.capsule_unlock_at and m.capsule_unlock_at <= datetime.utcnow() else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def _serialize_summary(s) -> dict:
    return {
        "id": s.id,
        "session_id": s.session_id,
        "title": s.title,
        "content": s.content,
        "spot_count": s.spot_count,
        "memory_count": s.memory_count,
        "date_range": s.date_range,
        "cover_image_url": s.cover_image_url,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/list")
async def list_memories(
    session_id: str = Query(..., description="游客会话ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取指定会话的所有旅行记忆。"""
    memories = await get_memories(session_id, db)
    return [_serialize_memory(m) for m in memories]


@router.get("/session-stats")
async def session_stats(
    session_id: str = Query(..., description="游客会话ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取指定会话的实时统计数据和可入册线索。"""
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="session_id 不能为空")

    try:
        stats = await get_session_stats(session_id.strip(), db)
    except Exception as e:
        logger.error("Session stats failed: %s", e)
        raise HTTPException(status_code=500, detail="统计数据暂时不可用")

    # Fill memory_count from actual memory list
    memories = await get_memories(session_id.strip(), db)
    stats["memory_count"] = len(memories)
    return stats


@router.post("/generate")
async def generate_memories(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """从对话记录中自动提取旅行记忆。"""
    if not request.session_id or not request.session_id.strip():
        raise HTTPException(status_code=400, detail="session_id 不能为空")

    try:
        new_memories = await extract_memories_from_chat(request.session_id.strip(), db)
    except Exception as e:
        logger.error("Memory generation failed: %s", e)
        raise HTTPException(status_code=500, detail="记忆生成服务暂时不可用")

    all_memories = await get_memories(request.session_id.strip(), db)
    return {
        "new_count": len(new_memories),
        "total_count": len(all_memories),
        "memories": [_serialize_memory(m) for m in all_memories],
    }


@router.post("/{memory_id}/polish")
async def polish_single_memory(
    memory_id: int,
    db: AsyncSession = Depends(get_db),
):
    """AI 润色单条记忆。"""
    try:
        memory = await polish_memory(memory_id, db)
    except Exception as e:
        logger.error("Memory polish failed: %s", e)
        raise HTTPException(status_code=500, detail="润色服务暂时不可用")

    if not memory:
        raise HTTPException(status_code=404, detail="记忆不存在")

    return _serialize_memory(memory)


@router.post("/summary/generate")
async def generate_summary(
    request: SummaryGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """生成旅程总结。"""
    if not request.session_id or not request.session_id.strip():
        raise HTTPException(status_code=400, detail="session_id 不能为空")

    try:
        summary = await generate_journey_summary(request.session_id.strip(), db)
    except Exception as e:
        logger.error("Journey summary generation failed: %s", e)
        raise HTTPException(status_code=500, detail="旅程总结生成服务暂时不可用")

    if not summary:
        raise HTTPException(status_code=404, detail="没有可用的旅行记忆，请先生成记忆")

    return _serialize_summary(summary)


@router.get("/summary/latest")
async def get_latest_journey_summary(
    session_id: str = Query(..., description="游客会话ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取最新的旅程总结。"""
    summary = await get_latest_summary(session_id, db)
    if not summary:
        return None
    return _serialize_summary(summary)


@router.post("/create")
async def create_memory(
    request: CreateMemoryRequest,
    db: AsyncSession = Depends(get_db),
):
    """数字人根据用户输入生成旅行记忆。"""
    if not request.user_input or not request.user_input.strip():
        raise HTTPException(status_code=400, detail="请输入你的感受")

    try:
        memory = await create_memory_from_input(
            session_id=request.session_id.strip(),
            user_input=request.user_input.strip(),
            spot_name=request.spot_name,
            spot_id=request.spot_id,
            source_type=request.source_type,
            mood_tag=request.mood_tag,
            metadata_json=request.metadata_json,
            db=db,
        )
        # 更新照片和语音字段
        if request.photo_url or request.voice_url:
            memory.photo_url = request.photo_url
            memory.voice_url = request.voice_url
            memory.voice_duration = request.voice_duration
            await db.commit()
            await db.refresh(memory)
    except Exception as e:
        logger.error("Memory creation failed: %s", e)
        raise HTTPException(status_code=500, detail="记忆生成服务暂时不可用")

    return _serialize_memory(memory)


@router.post("/capsule/create")
async def create_capsule(
    request: CreateCapsuleRequest,
    db: AsyncSession = Depends(get_db),
):
    """创建记忆胶囊 — 给未来的自己写一封信。"""
    from app.models.memory import TravelMemory
    from sqlalchemy import select

    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="请输入胶囊内容")

    unlock_at = datetime.utcnow() + timedelta(days=request.unlock_days)

    capsule = TravelMemory(
        session_id=request.session_id.strip(),
        title=request.title or "给未来的自己",
        original_content=request.content.strip(),
        source_type="capsule",
        spot_name=request.spot_name,
        mood_tag=request.mood_tag,
        is_capsule=True,
        capsule_unlock_at=unlock_at,
        capsule_content=request.content.strip(),
        metadata_json={"type": "time_capsule", "unlock_days": request.unlock_days},
    )

    db.add(capsule)
    await db.commit()
    await db.refresh(capsule)

    return _serialize_memory(capsule)


@router.post("/capsule/{capsule_id}/unlock")
async def unlock_capsule(
    capsule_id: int,
    db: AsyncSession = Depends(get_db),
):
    """解锁记忆胶囊 — 到期后可查看内容。"""
    from app.models.memory import TravelMemory
    from sqlalchemy import select

    result = await db.execute(select(TravelMemory).where(TravelMemory.id == capsule_id))
    capsule = result.scalar_one_or_none()

    if not capsule:
        raise HTTPException(status_code=404, detail="胶囊不存在")

    if not capsule.is_capsule:
        raise HTTPException(status_code=400, detail="这不是记忆胶囊")

    now = datetime.utcnow()
    if capsule.capsule_unlock_at and capsule.capsule_unlock_at > now:
        remaining = (capsule.capsule_unlock_at - now).days
        raise HTTPException(status_code=403, detail=f"胶囊尚未解锁，还需等待 {remaining} 天")

    # 解锁成功，返回完整内容
    return {
        "id": capsule.id,
        "title": capsule.title,
        "capsule_content": capsule.capsule_content,
        "capsule_unlock_at": capsule.capsule_unlock_at.isoformat() if capsule.capsule_unlock_at else None,
        "unlocked": True,
    }
