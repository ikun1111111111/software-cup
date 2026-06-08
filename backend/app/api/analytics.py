"""Analytics Dashboard API endpoints."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query
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
)
from app.tasks.report_task import generate_report_task, get_report_status
from app.services.crowd_predict import get_crowd_prediction, get_best_time, get_crowd_alerts

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
    status: str
    message: str


class ReportStatusResponse(BaseModel):
    task_id: str
    status: str
    content: str | None = None
    period: str | None = None
    generated_at: str | None = None


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
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
    days: int = Query(7, ge=1, le=90, description="默认回溯天数"),
):
    """Trigger an async analytics report generation via Celery.

    Use `/api/analytics/report/status/{task_id}` to poll for results.
    """
    task = generate_report_task.delay(start_date=start_date, end_date=end_date, days=days)
    return ReportTriggerResponse(
        task_id=task.id,
        status="queued",
        message="报告生成任务已提交，请通过 status 接口查询结果",
    )


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
