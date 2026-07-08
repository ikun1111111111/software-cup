"""Analytics Dashboard API endpoints."""
import logging
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.analytics import (
    overview_stats,
    trend_stats,
    top_questions,
    sentiment_distribution,
    knowledge_stats,
    realtime_logs,
    heatmap_stats,
)
from app.models.mobile_event import MobileTourEvent
from app.tasks.report_task import generate_report_inline, get_report_status
from app.services.crowd_predict import get_crowd_prediction, get_best_time, get_crowd_alerts
from app.services.report_archive_service import (
    REPORT_TYPE_SENTIMENT,
    create_report_archive,
    get_latest_report_archive,
    get_report_archive as get_report_archive_record,
    list_report_archives,
    run_report_generation,
    serialize_report_archive,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Response models ──────────────────────────────────────────────────────────


class OverviewResponse(BaseModel):
    total_interactions: int
    today_interactions: int
    faq_hit_rate: float
    avg_sentiment_score: float
    avg_latency_ms: float
    unique_sessions: int
    voice_ratio: float


class TrendItem(BaseModel):
    date: str
    interactions: int
    avg_sentiment: float
    avg_latency_ms: float
    faq_hit_rate: float
    positive_ratio: float
    neutral_ratio: float
    negative_ratio: float


class TrendsResponse(BaseModel):
    days: int
    trends: list[TrendItem]


class TopQuestionItem(BaseModel):
    question: str
    count: int
    source: str


class TopQuestionsResponse(BaseModel):
    questions: list[TopQuestionItem]


class SentimentDistributionResponse(BaseModel):
    positive: float
    neutral: float
    negative: float
    avg_score: float


class TopFaqItem(BaseModel):
    question: str
    hit_count: int


class KnowledgeStatsResponse(BaseModel):
    total_docs: int
    indexed_docs: int
    total_faqs: int
    active_faqs: int
    top_faqs: list[TopFaqItem]


class RealtimeLogItem(BaseModel):
    session_id: str
    question: str
    answer: str
    input_type: str
    sentiment_label: str | None
    sentiment_score: float | None
    source: str
    latency_ms: int
    created_at: str | None


class RealtimeResponse(BaseModel):
    recent: list[RealtimeLogItem]


class HeatmapItem(BaseModel):
    day_of_week: int
    hour: int
    count: int


class HeatmapResponse(BaseModel):
    data: list[HeatmapItem]


class ReportTriggerResponse(BaseModel):
    task_id: str
    report_id: int | None = None
    status: str
    message: str


class ReportStatusResponse(BaseModel):
    task_id: str
    report_id: int | None = None
    status: str
    content: str | None = None
    period: str | None = None
    generated_at: str | None = None


class ReportArchiveListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[dict]


class ReportArchiveGenerateResponse(BaseModel):
    report_id: int
    task_id: str
    status: str
    message: str


class MobileTourEventRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    session_id: str | None = Field(None, max_length=100)
    event_name: str | None = Field(None, max_length=80)
    name: str | None = Field(None, max_length=80)
    id: str | None = Field(None, max_length=120)
    timestamp: str | None = None
    fields: dict | None = None
    route_id: str | None = None
    route_name: str | None = None
    spot_id: str | None = None
    spot_name: str | None = None
    source_page: str | None = None
    duration_ms: int | None = Field(None, ge=0)
    latency_ms: int | None = Field(None, ge=0)
    completed: bool | None = None
    preferences: dict | None = None
    metadata: dict | None = None


class MobileTourEventResponse(BaseModel):
    id: int
    status: str


class MobileTourBatchRequest(BaseModel):
    events: list[MobileTourEventRequest] = Field(default_factory=list)


class MobileTourBatchResponse(BaseModel):
    status: str
    inserted: int
    skipped: int
    ids: list[int]
    errors: list[dict]


class MobileTourSummaryResponse(BaseModel):
    days: int
    total_events: int
    event_counts: list[dict]
    top_routes: list[dict]
    top_spots: list[dict]


class MobileTourRecentEvent(BaseModel):
    id: int
    session_id: str
    event_name: str
    route_id: str | None = None
    route_name: str | None = None
    spot_id: str | None = None
    spot_name: str | None = None
    source_page: str | None = None
    duration_ms: int | None = None
    latency_ms: int | None = None
    completed: bool
    created_at: str | None = None


class MobileTourRecentResponse(BaseModel):
    recent: list[MobileTourRecentEvent]


def _clean_text(value: object, max_length: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_length]


def _clean_int(value: object) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def _clean_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "done", "completed"}
    return bool(value)


def _payload_value(payload: MobileTourEventRequest, *keys: str) -> object | None:
    data = payload.model_dump(exclude_none=True)
    extra = payload.model_extra or {}
    fields = payload.fields if isinstance(payload.fields, dict) else {}
    for source in (data, extra, fields):
        for key in keys:
            value = source.get(key)
            if value is not None and value != "":
                return value
    return None


def _payload_dict_value(payload: MobileTourEventRequest, *keys: str) -> dict | None:
    value = _payload_value(payload, *keys)
    return value if isinstance(value, dict) else None


def _build_mobile_tour_event(payload: MobileTourEventRequest) -> MobileTourEvent:
    event_name = _clean_text(
        _payload_value(payload, "event_name", "eventName", "name", "event", "type"),
        80,
    )
    if not event_name:
        raise ValueError("event_name/name is required")

    session_id = _clean_text(
        _payload_value(payload, "session_id", "sessionId", "sid", "anonymous_id", "device_id"),
        100,
    ) or "mobile-app-session"
    fields = payload.fields if isinstance(payload.fields, dict) else {}
    metadata = dict(fields)
    metadata.update(_payload_dict_value(payload, "metadata", "meta") or {})
    if payload.id:
        metadata.setdefault("client_event_id", payload.id)
    if payload.timestamp:
        metadata.setdefault("client_timestamp", payload.timestamp)
    metadata.setdefault("ingest_source", "mobile")

    return MobileTourEvent(
        session_id=session_id,
        event_name=event_name,
        route_id=_clean_text(_payload_value(payload, "route_id", "routeId"), 100),
        route_name=_clean_text(_payload_value(payload, "route_name", "routeName"), 200),
        spot_id=_clean_text(_payload_value(payload, "spot_id", "spotId"), 100),
        spot_name=_clean_text(_payload_value(payload, "spot_name", "spotName"), 200),
        source_page=_clean_text(_payload_value(payload, "source_page", "sourcePage", "page"), 100),
        duration_ms=_clean_int(_payload_value(payload, "duration_ms", "durationMs", "duration")),
        latency_ms=_clean_int(_payload_value(payload, "latency_ms", "latencyMs", "latency")),
        completed=_clean_bool(_payload_value(payload, "completed", "isCompleted", "done")),
        preferences_json=_payload_dict_value(payload, "preferences", "prefs"),
        metadata_json=metadata,
    )


# ── Crowd Prediction endpoints (M12) ─────────────────────────────────────────


class HourlyPrediction(BaseModel):
    hour: int
    predicted_visitors: int
    crowd_level: str
    emoji: str


class CrowdPredictionResponse(BaseModel):
    target_date: str
    is_weekend: bool
    predictions: dict[str, list[HourlyPrediction]]


class BestTimeResponse(BaseModel):
    attraction_name: str
    best_time: str
    reason: str
    hourly: list[HourlyPrediction]


class CrowdAlertItem(BaseModel):
    attraction_name: str
    level: str
    peak_hours: list[int]
    max_predicted: int
    suggestion: str


class CrowdAlertResponse(BaseModel):
    target_date: str
    threshold: int
    alerts: list[CrowdAlertItem]
    total_alerts: int


@router.post("/mobile-events", response_model=MobileTourEventResponse)
async def record_mobile_tour_event(
    payload: MobileTourEventRequest,
    db: AsyncSession = Depends(get_db),
):
    """Record raw mobile tourist behavior events for admin analytics."""
    try:
        event = _build_mobile_tour_event(payload)
        db.add(event)
        await db.flush()
        event_id = event.id
        await db.commit()
        return MobileTourEventResponse(id=event_id, status="ok")
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to record mobile tour event: %s", exc)
        raise HTTPException(status_code=500, detail="mobile event record failed")


@router.post("/mobile-events/batch", response_model=MobileTourBatchResponse)
async def record_mobile_tour_events_batch(
    payload: MobileTourBatchRequest | list[MobileTourEventRequest] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Record queued mobile events in one request; invalid rows are skipped."""
    items = payload if isinstance(payload, list) else payload.events
    events: list[MobileTourEvent] = []
    errors: list[dict] = []

    for index, item in enumerate(items):
        try:
            event = _build_mobile_tour_event(item)
        except ValueError as exc:
            errors.append({"index": index, "message": str(exc)})
            continue
        db.add(event)
        events.append(event)

    try:
        if events:
            await db.flush()
        ids = [event.id for event in events if event.id is not None]
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.exception("Failed to record mobile event batch: %s", exc)
        raise HTTPException(status_code=500, detail="mobile event batch record failed")

    return MobileTourBatchResponse(
        status="ok" if not errors else "partial",
        inserted=len(events),
        skipped=len(errors),
        ids=ids,
        errors=errors,
    )


@router.get("/mobile-tour-summary", response_model=MobileTourSummaryResponse)
async def get_mobile_tour_summary(
    days: int = Query(7, ge=1, le=90, description="统计天数"),
    db: AsyncSession = Depends(get_db),
):
    """Summarize mobile-side route, spot and interaction events for admin screens."""
    since = datetime.utcnow() - timedelta(days=days)
    filters = [MobileTourEvent.created_at >= since]

    total_result = await db.execute(
        select(func.count(MobileTourEvent.id)).where(*filters)
    )
    total_events = int(total_result.scalar() or 0)

    event_count_expr = func.count(MobileTourEvent.id)
    event_rows = await db.execute(
        select(MobileTourEvent.event_name, event_count_expr.label("count"))
        .where(*filters)
        .group_by(MobileTourEvent.event_name)
        .order_by(event_count_expr.desc())
    )

    route_count_expr = func.count(MobileTourEvent.id)
    route_rows = await db.execute(
        select(
            MobileTourEvent.route_id,
            MobileTourEvent.route_name,
            route_count_expr.label("count"),
        )
        .where(*filters, MobileTourEvent.route_id.is_not(None))
        .group_by(MobileTourEvent.route_id, MobileTourEvent.route_name)
        .order_by(route_count_expr.desc())
        .limit(10)
    )

    spot_count_expr = func.count(MobileTourEvent.id)
    spot_rows = await db.execute(
        select(
            MobileTourEvent.spot_id,
            MobileTourEvent.spot_name,
            spot_count_expr.label("count"),
        )
        .where(*filters, MobileTourEvent.spot_id.is_not(None))
        .group_by(MobileTourEvent.spot_id, MobileTourEvent.spot_name)
        .order_by(spot_count_expr.desc())
        .limit(10)
    )

    return MobileTourSummaryResponse(
        days=days,
        total_events=total_events,
        event_counts=[
            {"event_name": event_name, "count": count}
            for event_name, count in event_rows.all()
        ],
        top_routes=[
            {"route_id": route_id, "route_name": route_name, "count": count}
            for route_id, route_name, count in route_rows.all()
        ],
        top_spots=[
            {"spot_id": spot_id, "spot_name": spot_name, "count": count}
            for spot_id, spot_name, count in spot_rows.all()
        ],
    )


@router.get("/mobile-events/recent", response_model=MobileTourRecentResponse)
async def get_recent_mobile_tour_events(
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """Return recent mobile tourist events for the dual-terminal admin console."""
    result = await db.execute(
        select(MobileTourEvent)
        .order_by(MobileTourEvent.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return MobileTourRecentResponse(
        recent=[
            MobileTourRecentEvent(
                id=row.id,
                session_id=row.session_id,
                event_name=row.event_name,
                route_id=row.route_id,
                route_name=row.route_name,
                spot_id=row.spot_id,
                spot_name=row.spot_name,
                source_page=row.source_page,
                duration_ms=row.duration_ms,
                latency_ms=row.latency_ms,
                completed=row.completed,
                created_at=row.created_at.isoformat() if row.created_at else None,
            )
            for row in rows
        ]
    )


@router.get("/crowd", response_model=CrowdPredictionResponse)
async def crowd_prediction(
    attraction_name: str | None = Query(None, description="景点名称"),
    target_date: str | None = Query(None, description="目标日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Predict crowd levels for scenic spots by hour."""
    from datetime import date as dt_date
    td = None
    if target_date:
        try:
            td = dt_date.fromisoformat(target_date)
        except ValueError:
            pass
    result = await get_crowd_prediction(db, attraction_name=attraction_name, target_date=td)
    return result


@router.get("/crowd/best-time", response_model=BestTimeResponse)
async def crowd_best_time(
    attraction_name: str = Query(..., description="景点名称"),
    target_date: str | None = Query(None, description="目标日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Recommend the best visiting time for a scenic spot."""
    from datetime import date as dt_date
    td = None
    if target_date:
        try:
            td = dt_date.fromisoformat(target_date)
        except ValueError:
            pass
    result = await get_best_time(db, attraction_name, target_date=td)
    return result


@router.get("/crowd/alert", response_model=CrowdAlertResponse)
async def crowd_alert(
    threshold: int = Query(150, ge=1, description="拥挤阈值"),
    target_date: str | None = Query(None, description="目标日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Get crowd alerts — spots predicted to exceed threshold."""
    from datetime import date as dt_date
    td = None
    if target_date:
        try:
            td = dt_date.fromisoformat(target_date)
        except ValueError:
            pass
    result = await get_crowd_alerts(db, threshold=threshold, target_date=td)
    return result


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard overview KPIs."""
    result = await overview_stats(db, start_date=start_date, end_date=end_date)
    return result


@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    days: int = Query(7, ge=1, le=90, description="统计天数"),
    db: AsyncSession = Depends(get_db),
):
    """Daily trend statistics for the last N days."""
    result = await trend_stats(db, days=days)
    return result


@router.get("/top_questions", response_model=TopQuestionsResponse)
async def get_top_questions(
    limit: int = Query(10, ge=1, le=100, description="返回数量"),
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Most frequent user questions."""
    result = await top_questions(db, limit=limit, start_date=start_date, end_date=end_date)
    return result


@router.get("/sentiment_distribution", response_model=SentimentDistributionResponse)
async def get_sentiment_distribution(
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Sentiment label distribution."""
    result = await sentiment_distribution(db, start_date=start_date, end_date=end_date)
    return result


@router.get("/knowledge_stats", response_model=KnowledgeStatsResponse)
async def get_knowledge_stats(
    db: AsyncSession = Depends(get_db),
):
    """Knowledge base document and FAQ statistics."""
    result = await knowledge_stats(db)
    return result


@router.get("/realtime", response_model=RealtimeResponse)
async def get_realtime(
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """Recent interaction logs."""
    result = await realtime_logs(db, limit=limit)
    return result


@router.post("/report", response_model=ReportTriggerResponse)
async def trigger_report(
    background_tasks: BackgroundTasks,
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
    days: int = Query(7, ge=1, le=90, description="默认回溯天数"),
    report_type: str = Query(REPORT_TYPE_SENTIMENT, pattern="^(sentiment|marketing)$"),
):
    """Trigger an async analytics report generation.

    Use `/api/analytics/report/status/{task_id}` to poll for results.
    """
    task_id = f"local-{uuid4().hex}"
    background_tasks.add_task(
        generate_report_inline,
        task_id=task_id,
        start_date=start_date,
        end_date=end_date,
        days=days,
        report_type=report_type,
    )
    return ReportTriggerResponse(
        task_id=task_id,
        status="queued",
        message="报告生成任务已提交，请通过 status 接口查询结果",
    )


@router.post("/reports/generate", response_model=ReportArchiveGenerateResponse)
async def generate_report_archive(
    background_tasks: BackgroundTasks,
    report_type: str = Query(REPORT_TYPE_SENTIMENT, pattern="^(sentiment|marketing)$"),
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Create a DB-backed report archive and generate it in the background."""
    try:
        archive = await create_report_archive(
            db,
            report_type=report_type,
            trigger_source="manual",
            start_date=start_date,
            end_date=end_date,
            days=days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    background_tasks.add_task(run_report_generation, archive.id)
    return ReportArchiveGenerateResponse(
        report_id=archive.id,
        task_id=archive.task_id or str(archive.id),
        status=archive.status,
        message="report generation queued",
    )


@router.get("/reports/latest")
async def get_latest_report(
    report_type: str = Query(REPORT_TYPE_SENTIMENT, pattern="^(sentiment|marketing)$"),
    db: AsyncSession = Depends(get_db),
):
    """Return the latest completed DB-backed report archive."""
    archive = await get_latest_report_archive(db, report_type=report_type)
    if not archive:
        return {"report": None}
    return {"report": serialize_report_archive(archive)}


@router.get("/reports", response_model=ReportArchiveListResponse)
async def list_reports(
    report_type: str | None = Query(None, pattern="^(sentiment|marketing)$"),
    status: str | None = Query(None, pattern="^(queued|running|done|failed)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List DB-backed report archives."""
    rows, total = await list_report_archives(
        db,
        report_type=report_type,
        status=status,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    return ReportArchiveListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[serialize_report_archive(row, include_content=False) for row in rows],
    )


@router.get("/reports/{report_id}")
async def get_report_archive(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return a single DB-backed report archive."""
    archive = await get_report_archive_record(db, report_id)
    if not archive:
        raise HTTPException(status_code=404, detail="report not found")
    return {"report": serialize_report_archive(archive)}


@router.get("/reports/{report_id}/status")
async def get_report_archive_status(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return report generation status from DB."""
    archive = await get_report_archive_record(db, report_id)
    if not archive:
        raise HTTPException(status_code=404, detail="report not found")
    return {"report": serialize_report_archive(archive)}


@router.get("/report/status/{task_id}", response_model=ReportStatusResponse)
async def get_report(
    task_id: str,
):
    """Get report generation status and result."""
    report = await get_report_status(task_id)
    if not report:
        return ReportStatusResponse(task_id=task_id, status="pending")
    return ReportStatusResponse(
        task_id=task_id,
        report_id=report.get("report_id"),
        status=report.get("status", "unknown"),
        content=report.get("content"),
        period=report.get("period"),
        generated_at=report.get("generated_at"),
    )


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    db: AsyncSession = Depends(get_db),
):
    """Interaction heatmap by day-of-week and hour."""
    result = await heatmap_stats(db)
    return HeatmapResponse(data=result["data"])
