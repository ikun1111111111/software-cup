from datetime import datetime, timedelta
from pathlib import Path
from tempfile import NamedTemporaryFile
import uuid

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.models.interaction import InteractionLog
from app.models.knowledge import FaqEntry
from app.models.tourist import ScenicSpot, TourRoute

router = APIRouter(prefix="/api/admin", tags=["admin"])


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[dict]


class ScenicSpotPayload(BaseModel):
    id: str | None = None
    name: str
    category: str = "核心景点"
    tags: list[str] | None = None
    overview: str = ""
    detail: str = ""
    qr_code: str | None = None
    related_spots: list[str] | None = None
    thumbnail: str | None = None
    detail_images: list[str] | None = None
    story_acts: list[dict] | None = None
    duration: str | None = None
    qa_json: list[dict] | None = None
    display_x: float | None = None
    display_y: float | None = None
    is_active: bool = True


class TourRoutePayload(BaseModel):
    id: str | None = None
    name: str
    route_type: str
    duration: str
    description: str = ""
    gradient: str | None = None
    cover_image: str | None = None
    color: str | None = None
    brush_image: str | None = None
    opening_text: str | None = None
    closing_text: str | None = None
    spot_order: list[str] = Field(default_factory=list)
    spot_details: dict | None = None
    is_active: bool = True


def _slug(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    return "-".join(part for part in cleaned.split("-") if part)[:48] or f"item-{int(datetime.utcnow().timestamp())}"


def _spot_to_dict(spot: ScenicSpot) -> dict:
    return {
        "id": spot.id,
        "name": spot.name,
        "category": spot.category,
        "tags": spot.tags,
        "overview": spot.overview,
        "detail": spot.detail,
        "qr_code": spot.qr_code,
        "related_spots": spot.related_spots,
        "thumbnail": spot.thumbnail,
        "detail_images": spot.detail_images,
        "story_acts": spot.story_acts,
        "duration": spot.duration,
        "qa_json": spot.qa_json,
        "display_x": spot.display_x,
        "display_y": spot.display_y,
        "is_active": spot.is_active,
        "created_at": spot.created_at.isoformat() if spot.created_at else None,
    }


def _route_to_dict(route: TourRoute) -> dict:
    return {
        "id": route.id,
        "name": route.name,
        "route_type": route.route_type,
        "duration": route.duration,
        "description": route.description,
        "gradient": route.gradient,
        "cover_image": route.cover_image,
        "color": route.color,
        "brush_image": route.brush_image,
        "opening_text": route.opening_text,
        "closing_text": route.closing_text,
        "spot_order": route.spot_order,
        "spot_details": route.spot_details,
        "is_active": route.is_active,
        "created_at": route.created_at.isoformat() if route.created_at else None,
    }


@router.get("/scenic-spots", response_model=PaginatedResponse)
async def list_admin_spots(
    q: str | None = Query(None),
    category: str | None = Query(None),
    include_inactive: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ScenicSpot)
    if not include_inactive:
        stmt = stmt.where(ScenicSpot.is_active == True)
    if category:
        stmt = stmt.where(ScenicSpot.category == category)
    if q:
        stmt = stmt.where(ScenicSpot.name.ilike(f"%{q}%"))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    rows = (await db.execute(stmt.order_by(ScenicSpot.created_at.desc()).offset((page - 1) * page_size).limit(page_size))).scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_spot_to_dict(row) for row in rows]}


@router.post("/scenic-spots")
async def create_admin_spot(payload: ScenicSpotPayload, db: AsyncSession = Depends(get_db)):
    spot_id = payload.id or _slug(payload.name)
    exists = await db.get(ScenicSpot, spot_id)
    if exists:
        raise HTTPException(status_code=409, detail="景点 ID 已存在")
    spot = ScenicSpot(id=spot_id, **payload.model_dump(exclude={"id"}))
    db.add(spot)
    await db.commit()
    await db.refresh(spot)
    return _spot_to_dict(spot)


@router.put("/scenic-spots/{spot_id}")
async def update_admin_spot(spot_id: str, payload: ScenicSpotPayload, db: AsyncSession = Depends(get_db)):
    spot = await db.get(ScenicSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")
    changed = payload.model_dump(exclude={"id"}, exclude_unset=True)
    story_acts_changed = "story_acts" in changed and changed["story_acts"] != spot.story_acts
    for field, value in changed.items():
        setattr(spot, field, value)
    await db.commit()
    await db.refresh(spot)
    if story_acts_changed:
        redis = await get_redis()
        await redis.delete(f"story:acts:{spot_id}")
        await redis.delete(f"story:{spot.name}")
    return _spot_to_dict(spot)


@router.delete("/scenic-spots/{spot_id}")
async def delete_admin_spot(spot_id: str, db: AsyncSession = Depends(get_db)):
    spot = await db.get(ScenicSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")
    spot.is_active = False
    await db.commit()
    return {"status": "deleted", "id": spot_id}


@router.get("/tour-routes", response_model=PaginatedResponse)
async def list_admin_routes(
    q: str | None = Query(None),
    route_type: str | None = Query(None),
    include_inactive: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TourRoute)
    if not include_inactive:
        stmt = stmt.where(TourRoute.is_active == True)
    if route_type:
        stmt = stmt.where(TourRoute.route_type == route_type)
    if q:
        stmt = stmt.where(TourRoute.name.ilike(f"%{q}%"))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    rows = (await db.execute(stmt.order_by(TourRoute.created_at.desc()).offset((page - 1) * page_size).limit(page_size))).scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_route_to_dict(row) for row in rows]}


@router.post("/tour-routes")
async def create_admin_route(payload: TourRoutePayload, db: AsyncSession = Depends(get_db)):
    route_id = payload.id or _slug(payload.name)
    exists = await db.get(TourRoute, route_id)
    if exists:
        raise HTTPException(status_code=409, detail="路线 ID 已存在")
    route = TourRoute(id=route_id, **payload.model_dump(exclude={"id"}))
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return _route_to_dict(route)


@router.put("/tour-routes/{route_id}")
async def update_admin_route(route_id: str, payload: TourRoutePayload, db: AsyncSession = Depends(get_db)):
    route = await db.get(TourRoute, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")
    for field, value in payload.model_dump(exclude={"id"}).items():
        setattr(route, field, value)
    await db.commit()
    await db.refresh(route)
    return _route_to_dict(route)


@router.delete("/tour-routes/{route_id}")
async def delete_admin_route(route_id: str, db: AsyncSession = Depends(get_db)):
    route = await db.get(TourRoute, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")
    route.is_active = False
    await db.commit()
    return {"status": "deleted", "id": route_id}


@router.get("/interactions", response_model=PaginatedResponse)
async def list_admin_interactions(
    session_id: str | None = Query(None),
    q: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(InteractionLog)
    if session_id:
        stmt = stmt.where(InteractionLog.session_id == session_id)
    if q:
        stmt = stmt.where(InteractionLog.user_input.ilike(f"%{q}%"))
    if start_date:
        stmt = stmt.where(InteractionLog.created_at >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        stmt = stmt.where(InteractionLog.created_at < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    rows = (await db.execute(stmt.order_by(InteractionLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size))).scalars().all()
    items = [
        {
            "id": row.id,
            "session_id": row.session_id,
            "question": row.user_input,
            "answer": row.llm_response,
            "input_type": row.input_type,
            "sentiment_label": row.sentiment_label,
            "sentiment_score": row.sentiment_score,
            "source": "faq" if row.is_faq_hit else "rag",
            "latency_ms": row.latency_ms,
            "feedback": row.user_feedback,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/faq/import")
async def import_faq(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv"}:
        raise HTTPException(status_code=400, detail="仅支持 xlsx/xls/csv")

    content = await file.read()
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        df = pd.read_csv(tmp_path) if suffix == ".csv" else pd.read_excel(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)
        await file.close()

    mapping = {
        "问题": "question",
        "答案": "answer",
        "关键词": "keywords",
        "分类": "category",
        "优先级": "priority",
    }
    df = df.rename(columns=mapping)
    if "question" not in df.columns or "answer" not in df.columns:
        raise HTTPException(status_code=400, detail="缺少 question/answer 或 问题/答案 列")

    imported = 0
    updated = 0
    skipped = 0
    for _, row in df.iterrows():
        question = str(row.get("question", "")).strip()
        answer = str(row.get("answer", "")).strip()
        if not question or not answer or question.lower() == "nan" or answer.lower() == "nan":
            skipped += 1
            continue
        existing = (await db.execute(select(FaqEntry).where(FaqEntry.question == question))).scalar_one_or_none()
        if existing:
            existing.answer = answer
            existing.keywords = None if pd.isna(row.get("keywords")) else str(row.get("keywords", "")).strip()
            existing.category = "general" if pd.isna(row.get("category")) else str(row.get("category", "general")).strip()
            existing.priority = 0 if pd.isna(row.get("priority")) else int(row.get("priority", 0))
            updated += 1
        else:
            db.add(FaqEntry(
                question=question,
                answer=answer,
                keywords=None if pd.isna(row.get("keywords")) else str(row.get("keywords", "")).strip(),
                category="general" if pd.isna(row.get("category")) else str(row.get("category", "general")).strip(),
                priority=0 if pd.isna(row.get("priority")) else int(row.get("priority", 0)),
            ))
            imported += 1

    await db.commit()
    return {"imported": imported, "updated": updated, "skipped": skipped}


IMAGE_DIR = Path(__file__).resolve().parents[2].parent / "frontend" / "public" / "image"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}


class ImageUploadResponse(BaseModel):
    path: str
    url: str


@router.post("/upload-image", response_model=ImageUploadResponse)
async def upload_image(
    subdir: str = Query("icons", pattern=r"^[a-zA-Z0-9_\-/]+$"),
    file: UploadFile = File(...),
):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        suffix = Path(file.filename or "").suffix.lower().lstrip(".")
        if suffix not in {"jpg", "jpeg", "png", "webp"}:
            raise HTTPException(status_code=400, detail="仅支持 jpg/png/webp 图片")
    target_dir = IMAGE_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "").suffix.lower() or ".png"
    unique_name = f"{uuid.uuid4().hex[:16]}{ext}"
    file_path = target_dir / unique_name
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    finally:
        await file.close()
    relative = f"image/{subdir}/{unique_name}"
    return ImageUploadResponse(path=relative, url=f"/{relative}")
