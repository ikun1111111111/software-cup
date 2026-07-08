"""Show/event API endpoints for theme cards."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tourist import ShowEvent

router = APIRouter(prefix="/api/shows", tags=["shows"])


class ShowOut(BaseModel):
    id: int
    name: str
    spot_id: str | None
    venue: str | None
    start_time: str | None
    duration: str | None
    description: str | None
    price_note: str | None
    schedule_text: str | None

    class Config:
        from_attributes = True


@router.get("", response_model=list[ShowOut])
async def list_shows(
    spot_id: str | None = Query(None),
    name: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List show events, optionally filtered by spot_id or name."""
    stmt = select(ShowEvent).where(ShowEvent.is_active == True)
    if spot_id:
        stmt = stmt.where(ShowEvent.spot_id == spot_id)
    if name:
        stmt = stmt.where(ShowEvent.name.contains(name))
    stmt = stmt.order_by(ShowEvent.start_time)
    result = await db.execute(stmt)
    shows = result.scalars().all()
    return [ShowOut.model_validate(s) for s in shows]


@router.get("/{show_id}", response_model=ShowOut)
async def get_show(
    show_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a show event by ID."""
    stmt = select(ShowEvent).where(ShowEvent.id == show_id, ShowEvent.is_active == True)
    result = await db.execute(stmt)
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="演出未找到")
    return ShowOut.model_validate(show)
