"""Analytics Dashboard API endpoints."""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
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
    mobile_tour_summary,
)
from app.models.mobile_event import MobileTourEvent
from app.tasks.report_task import generate_report_task, get_report_status
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


class MobileTourEventRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    event_name: str = Field(..., min_length=1, max_length=80)
    route_id: str | None = None
    route_name: str | None = None
    spot_id: str | None = None
    spot_name: str | None = None
    source_page: str | None = None
    duration_ms: int | None = Field(None, ge=0)
    latency_ms: int | None = Field(None, ge=0)
    completed: bool = False
    preferences: dict | None = None
    metadata: dict | None = None


class MobileTourEventResponse(BaseModel):
    id: int
    status: str


class MobileRouteSummaryItem(BaseModel):
    route_id: str
    route_name: str
    starts: int
    completions: int
    completion_rate: float


class MobileSpotSummaryItem(BaseModel):
    spot_id: str
    spot_name: str
    event_count: int


class MobileRecentEventItem(BaseModel):
    session_id: str
    event_name: str
    route_name: str | None = None
    spot_name: str | None = None
    source_page: str | None = None
    created_at: str | None = None


class MobileTourSummaryResponse(BaseModel):
    days: int
    total_events: int
    active_sessions: int
    route_starts: int
    route_completions: int
    route_completion_rate: float
    routes: list[MobileRouteSummaryItem]
    hot_spots: list[MobileSpotSummaryItem]
    preference_distribution: dict[str, int]
    recent_events: list[MobileRecentEventItem]


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
    start_date: str | None = Query(None, description="Start date YYYY-MM-DD"),
    end_date: str | None = Query(None, description="End date YYYY-MM-DD"),
    days: int = Query(7, ge=1, le=90, description="Look-back days"),
    report_type: str = Query(REPORT_TYPE_SENTIMENT, description="sentiment or marketing"),
):
    """Trigger an async analytics report generation via Celery.

    Use `/api/analytics/report/status/{task_id}` to poll for results.
    New DB-backed clients should use `/api/analytics/reports/generate`.
    """
    task = generate_report_task.delay(
        start_date=start_date,
        end_date=end_date,
        days=days,
        report_type=report_type,
    )
    return ReportTriggerResponse(
        task_id=task.id,
        status="queued",
        message="Report generation task queued; poll the status endpoint for results.",
    )


@router.post("/reports/generate", response_model=ReportArchiveGenerateResponse)
async def generate_report_archive(
    background_tasks: BackgroundTasks,
    report_type: str = Query(REPORT_TYPE_SENTIMENT, description="sentiment or marketing"),
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
    report_type: str = Query(REPORT_TYPE_SENTIMENT, description="sentiment or marketing"),
    db: AsyncSession = Depends(get_db),
):
    """Return the latest completed DB-backed report archive."""
    archive = await get_latest_report_archive(db, report_type=report_type)
    if not archive:
        return {"report": None}
    return {"report": serialize_report_archive(archive)}


@router.get("/reports", response_model=ReportArchiveListResponse)
async def list_reports(
    report_type: str | None = Query(None, description="sentiment or marketing"),
    status: str | None = Query(None, description="queued, running, done or failed"),
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
    """Return DB-backed report generation status."""
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


@router.post("/mobile-events", response_model=MobileTourEventResponse)
async def create_mobile_tour_event(
    request: MobileTourEventRequest,
    db: AsyncSession = Depends(get_db),
):
    """Record mobile guide lifecycle events for operations analytics."""
    event = MobileTourEvent(
        session_id=request.session_id,
        event_name=request.event_name,
        route_id=request.route_id,
        route_name=request.route_name,
        spot_id=request.spot_id,
        spot_name=request.spot_name,
        source_page=request.source_page,
        duration_ms=request.duration_ms,
        latency_ms=request.latency_ms,
        completed=request.completed,
        preferences_json=request.preferences,
        metadata_json=request.metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return {"id": event.id, "status": "ok"}


@router.get("/mobile-tour-summary", response_model=MobileTourSummaryResponse)
async def get_mobile_tour_summary(
    days: int = Query(7, ge=1, le=90, description="统计天数"),
    limit: int = Query(8, ge=1, le=50, description="榜单数量"),
    db: AsyncSession = Depends(get_db),
):
    """Mobile guide operation summary: routes, hot spots and preferences."""
    return await mobile_tour_summary(db, days=days, limit=limit)
