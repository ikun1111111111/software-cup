"""Avatar (digital human) configuration API endpoints."""
import logging
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.avatar import AvatarConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/avatar", tags=["avatar"])


# ── Request / Response models ────────────────────────────────────────────────


class AvatarCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    model_path: str | None = None
    appearance_json: dict | None = None
    voice_id: str | None = None
    emotion_presets: dict | None = None
    welcome_message: str | None = None


class AvatarUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    model_path: str | None = None
    appearance_json: dict | None = None
    voice_id: str | None = None
    emotion_presets: dict | None = None
    welcome_message: str | None = None


class AvatarOut(BaseModel):
    id: int
    name: str
    description: str | None
    model_path: str | None
    appearance_json: dict | None
    voice_id: str | None
    emotion_presets: dict | None
    welcome_message: str | None
    is_active: bool
    created_at: str | None
    updated_at: str | None

    class Config:
        from_attributes = True


class PaginatedAvatars(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AvatarOut]


class ActiveAvatarResponse(AvatarOut):
    pass


class ActivateResponse(BaseModel):
    status: str
    avatar_id: int


# ── Helpers ──────────────────────────────────────────────────────────────────


def _serialize_avatar(avatar: AvatarConfig) -> AvatarOut:
    return AvatarOut(
        id=avatar.id,
        name=avatar.name,
        description=avatar.description,
        model_path=avatar.model_path,
        appearance_json=avatar.appearance_json,
        voice_id=avatar.voice_id,
        emotion_presets=avatar.emotion_presets,
        welcome_message=avatar.welcome_message,
        is_active=avatar.is_active,
        created_at=avatar.created_at.isoformat() if avatar.created_at else None,
        updated_at=avatar.updated_at.isoformat() if avatar.updated_at else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedAvatars)
async def list_avatars(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all avatar configurations with pagination."""
    offset = (page - 1) * page_size

    total_result = await db.execute(select(func.count()).select_from(AvatarConfig))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(AvatarConfig)
        .order_by(AvatarConfig.is_active.desc(), AvatarConfig.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items: Sequence[AvatarConfig] = result.scalars().all()

    return PaginatedAvatars(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_avatar(item) for item in items],
    )


@router.post("", response_model=AvatarOut, status_code=201)
async def create_avatar(
    request: AvatarCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new avatar configuration."""
    avatar = AvatarConfig(**request.model_dump(exclude_unset=True))
    db.add(avatar)
    await db.commit()
    await db.refresh(avatar)
    logger.info("Avatar created: id=%d name=%s", avatar.id, avatar.name)
    return _serialize_avatar(avatar)


@router.get("/{avatar_id}", response_model=AvatarOut)
async def get_avatar(
    avatar_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single avatar configuration by ID."""
    result = await db.execute(select(AvatarConfig).where(AvatarConfig.id == avatar_id))
    avatar = result.scalar_one_or_none()
    if not avatar:
        raise HTTPException(status_code=404, detail="数字人配置不存在")
    return _serialize_avatar(avatar)


@router.put("/{avatar_id}", response_model=AvatarOut)
async def update_avatar(
    avatar_id: int,
    request: AvatarUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an avatar configuration."""
    result = await db.execute(select(AvatarConfig).where(AvatarConfig.id == avatar_id))
    avatar = result.scalar_one_or_none()
    if not avatar:
        raise HTTPException(status_code=404, detail="数字人配置不存在")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(avatar, key, value)

    await db.commit()
    await db.refresh(avatar)
    logger.info("Avatar updated: id=%d", avatar_id)
    return _serialize_avatar(avatar)


@router.delete("/{avatar_id}")
async def delete_avatar(
    avatar_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete an avatar configuration."""
    result = await db.execute(select(AvatarConfig).where(AvatarConfig.id == avatar_id))
    avatar = result.scalar_one_or_none()
    if not avatar:
        raise HTTPException(status_code=404, detail="数字人配置不存在")

    await db.delete(avatar)
    await db.commit()
    logger.info("Avatar deleted: id=%d", avatar_id)
    return {"status": "deleted", "avatar_id": avatar_id}


@router.post("/{avatar_id}/activate", response_model=ActivateResponse)
async def activate_avatar(
    avatar_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Activate an avatar (only one can be active at a time)."""
    result = await db.execute(select(AvatarConfig).where(AvatarConfig.id == avatar_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="数字人配置不存在")

    # Deactivate all others
    await db.execute(
        select(AvatarConfig).where(AvatarConfig.is_active == True)
    )
    all_result = await db.execute(select(AvatarConfig))
    for avatar in all_result.scalars().all():
        if avatar.id != avatar_id and avatar.is_active:
            avatar.is_active = False

    target.is_active = True
    await db.commit()
    logger.info("Avatar activated: id=%d", avatar_id)
    return ActivateResponse(status="activated", avatar_id=avatar_id)


@router.get("/active", response_model=ActiveAvatarResponse)
async def get_active_avatar(
    db: AsyncSession = Depends(get_db),
):
    """Get the currently active avatar configuration.

    Returns 404 if no avatar is activated.
    """
    result = await db.execute(
        select(AvatarConfig).where(AvatarConfig.is_active == True)
    )
    avatar = result.scalar_one_or_none()
    if not avatar:
        raise HTTPException(status_code=404, detail="当前没有激活的数字人配置")
    return _serialize_avatar(avatar)
