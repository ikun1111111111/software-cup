"""Sentiment / analytics report generator using LLM long-context summary.

Aggregates interaction data and produces a natural-language report
via Qwen-Long (or fallback to DeepSeek).
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Sequence

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.analytics import mobile_tour_summary
from app.core.llm_router import LLMTask, route
from app.models.interaction import InteractionLog

logger = logging.getLogger(__name__)


# ── Data aggregation helpers ─────────────────────────────────────────────────


async def _fetch_interactions(
    db: AsyncSession,
    start_date: datetime | None,
    end_date: datetime | None,
    limit: int = 500,
) -> Sequence[InteractionLog]:
    """Fetch recent interaction logs within date range."""
    stmt = select(InteractionLog).order_by(InteractionLog.created_at.desc())

    if start_date:
        stmt = stmt.where(InteractionLog.created_at >= start_date)
    if end_date:
        stmt = stmt.where(InteractionLog.created_at <= end_date)

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def _aggregate_stats(
    db: AsyncSession,
    start_date: datetime | None,
    end_date: datetime | None,
) -> dict:
    """Compute basic statistics for the report preamble."""
    stmt = select(func.count()).select_from(InteractionLog)
    if start_date:
        stmt = stmt.where(InteractionLog.created_at >= start_date)
    if end_date:
        stmt = stmt.where(InteractionLog.created_at <= end_date)

    total_result = await db.execute(stmt)
    total = total_result.scalar() or 0

    faq_stmt = select(func.count()).select_from(InteractionLog).where(
        InteractionLog.is_faq_hit == True
    )
    if start_date:
        faq_stmt = faq_stmt.where(InteractionLog.created_at >= start_date)
    if end_date:
        faq_stmt = faq_stmt.where(InteractionLog.created_at <= end_date)
    faq_result = await db.execute(faq_stmt)
    faq_hits = faq_result.scalar() or 0

    sentiment_stmt = select(
        func.avg(InteractionLog.sentiment_score),
        func.avg(InteractionLog.latency_ms),
    ).select_from(InteractionLog)
    if start_date:
        sentiment_stmt = sentiment_stmt.where(InteractionLog.created_at >= start_date)
    if end_date:
        sentiment_stmt = sentiment_stmt.where(InteractionLog.created_at <= end_date)

    sentiment_result = await db.execute(sentiment_stmt)
    row = sentiment_result.one_or_none()
    avg_sentiment = round(row[0], 3) if row and row[0] else 0.5
    avg_latency = round(row[1], 1) if row and row[1] else 0.0

    # Top questions
    top_stmt = (
        select(InteractionLog.user_input, func.count().label("cnt"))
        .group_by(InteractionLog.user_input)
        .order_by(func.count().desc())
        .limit(10)
    )
    if start_date:
        top_stmt = top_stmt.where(InteractionLog.created_at >= start_date)
    if end_date:
        top_stmt = top_stmt.where(InteractionLog.created_at <= end_date)

    top_result = await db.execute(top_stmt)
    top_questions = [
        {"question": q, "count": c} for q, c in top_result.all()
    ]

    return {
        "total_interactions": total,
        "faq_hit_rate": round(faq_hits / total, 3) if total else 0.0,
        "avg_sentiment_score": avg_sentiment,
        "avg_latency_ms": avg_latency,
        "top_questions": top_questions,
    }


def _build_report_prompt(stats: dict, sample_interactions: list[dict]) -> list[dict]:
    """Build the LLM prompt for report generation."""
    stats_text = f"""统计周期内数据概览：
- 总交互次数: {stats['total_interactions']}
- FAQ 命中率: {stats['faq_hit_rate']:.1%}
- 平均情感得分: {stats['avg_sentiment_score']:.2f} (0-1, 越高越正面)
- 平均响应延迟: {stats['avg_latency_ms']:.0f} ms

高频提问 Top10:
"""
    for i, item in enumerate(stats["top_questions"], 1):
        stats_text += f"{i}. {item['question']} (出现 {item['count']} 次)\n"

    interactions_text = "\n".join(
        f"- 用户: {it['user_input']}\n  回答: {it['llm_response'][:200]}...\n  情感: {it.get('sentiment_label', 'unknown')}"
        for it in sample_interactions[:30]
    )

    system_msg = (
        "你是一名智慧旅游数据分析师。请根据提供的交互统计数据和对话样本，"
        "生成一份简明的《游客感受度分析报告》。报告必须严格包含以下四部分，"
        "每部分标题固定如下，列表项统一使用 '- ' 作为前缀：\n"
        "1. 满意度趋势概述（1-2句，不使用列表）\n"
        "2. 游客关注点分析（列出2-3个高频主题，使用 '- ' 前缀列表）\n"
        "3. 知识库盲区发现（指出系统未能很好回答的问题类型，使用 '- ' 前缀列表）\n"
        "4. 服务改进建议（2-3条具体建议，使用 '- ' 前缀列表）\n"
        "报告总字数控制在 300-500 字，语言专业且通俗易懂。"
    )

    user_msg = f"【统计数据】\n{stats_text}\n\n【对话样本】\n{interactions_text}"

    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


# ── Public API ───────────────────────────────────────────────────────────────


def _format_marketing_list(items: list[dict[str, Any]], name_key: str, metric_key: str) -> str:
    lines = []
    for index, item in enumerate(items[:8], 1):
        name = item.get(name_key) or item.get("route_id") or item.get("spot_id") or "unknown"
        metric = item.get(metric_key, 0)
        lines.append(f"{index}. {name} ({metric_key}: {metric})")
    return "\n".join(lines) if lines else "No data"


def _build_marketing_report_prompt(stats: dict[str, Any]) -> list[dict]:
    routes_text = _format_marketing_list(stats.get("routes", []), "route_name", "starts")
    spots_text = _format_marketing_list(stats.get("hot_spots", []), "spot_name", "event_count")
    preferences = stats.get("preference_distribution") or {}
    pref_text = "\n".join(f"- {key}: {value}" for key, value in preferences.items()) or "No data"

    system_msg = (
        "You are a tourism operations analyst. Create a concise marketing decision "
        "report from mobile guide usage data. Include: 1) demand signal, "
        "2) high-potential routes or spots, 3) user preference insight, "
        "4) 2-3 actionable campaign suggestions. Keep it practical."
    )
    user_msg = f"""Mobile guide operation summary:
- Period: last {stats.get('days', 7)} days
- Total events: {stats.get('total_events', 0)}
- Active sessions: {stats.get('active_sessions', 0)}
- Route starts: {stats.get('route_starts', 0)}
- Route completions: {stats.get('route_completions', 0)}
- Route completion rate: {stats.get('route_completion_rate', 0):.1%}

Top routes:
{routes_text}

Hot spots:
{spots_text}

Preference distribution:
{pref_text}
"""
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


async def generate_marketing_report(
    db: AsyncSession,
    days: int = 7,
) -> dict:
    """Generate a mobile-guide marketing decision report."""
    now = datetime.utcnow()
    stats = await mobile_tour_summary(db, days=days, limit=8)
    messages = _build_marketing_report_prompt(stats)

    try:
        report_text = await route(LLMTask.summary, messages=messages)
    except Exception as e:
        logger.error("LLM marketing report generation failed: %s", e)
        report_text = (
            "## Marketing Decision Report\n\n"
            f"- Period: last {stats.get('days', days)} days\n"
            f"- Active sessions: {stats.get('active_sessions', 0)}\n"
            f"- Route starts: {stats.get('route_starts', 0)}\n"
            f"- Route completions: {stats.get('route_completions', 0)}\n"
            f"- Completion rate: {stats.get('route_completion_rate', 0):.1%}\n\n"
            "LLM summary unavailable; use the attached operation stats for decisions."
        )

    return {
        "content": report_text.strip(),
        "stats": stats,
        "generated_at": now.isoformat(),
        "period": f"last {stats.get('days', days)} days",
    }


async def generate_report(
    db: AsyncSession,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    days: int = 7,
) -> dict:
    """Generate a sentiment / analytics report.

    Returns:
        {
            "content": str,       # Markdown-like report text
            "stats": dict,        # Raw aggregated statistics
            "generated_at": str,  # ISO timestamp
            "period": str,        # Human-readable period description
        }
    """
    now = datetime.utcnow()
    if end_date is None:
        end_date = now
    if start_date is None:
        start_date = end_date - timedelta(days=days)

    # 1. Aggregate stats
    stats = await _aggregate_stats(db, start_date, end_date)

    # 2. Fetch sample interactions for qualitative analysis
    interactions = await _fetch_interactions(db, start_date, end_date, limit=100)
    sample_data = [
        {
            "user_input": it.user_input,
            "llm_response": it.llm_response,
            "sentiment_label": it.sentiment_label,
            "sentiment_score": it.sentiment_score,
            "source": "faq" if it.is_faq_hit else "rag",
            "created_at": it.created_at.isoformat() if it.created_at else None,
        }
        for it in interactions
    ]

    # 3. Build prompt and call LLM
    messages = _build_report_prompt(stats, sample_data)
    try:
        report_text = await route(LLMTask.summary, messages=messages)
    except Exception as e:
        logger.error("LLM report generation failed: %s", e)
        # Fallback: return a structured template with stats only
        report_text = (
            f"## 游客感受度报告（自动生成）\n\n"
            f"**统计周期**: {start_date.date()} ~ {end_date.date()}\n\n"
            f"**总交互次数**: {stats['total_interactions']}\n"
            f"**FAQ 命中率**: {stats['faq_hit_rate']:.1%}\n"
            f"**平均情感得分**: {stats['avg_sentiment_score']:.2f}\n"
            f"**平均响应延迟**: {stats['avg_latency_ms']:.0f} ms\n\n"
            f"_LLM 总结生成失败，以上为原始统计数据。_"
        )

    period_str = f"{start_date.date()} 至 {end_date.date()}"
    return {
        "content": report_text.strip(),
        "stats": stats,
        "generated_at": now.isoformat(),
        "period": period_str,
    }
