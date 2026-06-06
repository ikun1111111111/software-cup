"""Analytics engine: aggregate statistics for dashboard."""
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select, desc, cast, Date, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interaction import InteractionLog
from app.models.knowledge import KnowledgeDoc, FaqEntry, DocStatus
from app.models.tourist import TouristProfile

logger = logging.getLogger(__name__)


def _date_filter(stmt, model, start_date: str | None, end_date: str | None):
    """Apply date range filter to a statement if dates provided."""
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            stmt = stmt.where(model.created_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            stmt = stmt.where(model.created_at < end_dt)
        except ValueError:
            pass
    return stmt


async def overview_stats(
    db: AsyncSession,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Return core KPIs for the dashboard overview."""
    try:
        # Total interactions
        total_stmt = select(func.count(InteractionLog.id))
        total_stmt = _date_filter(total_stmt, InteractionLog, start_date, end_date)
        total_result = await db.execute(total_stmt)
        total_interactions = total_result.scalar() or 0

        # Today's interactions
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_stmt = select(func.count(InteractionLog.id)).where(
            InteractionLog.created_at >= today_start
        )
        today_result = await db.execute(today_stmt)
        today_interactions = today_result.scalar() or 0

        # FAQ hit rate
        faq_stmt = select(func.count(InteractionLog.id)).where(InteractionLog.is_faq_hit == True)
        faq_stmt = _date_filter(faq_stmt, InteractionLog, start_date, end_date)
        faq_result = await db.execute(faq_stmt)
        faq_hits = faq_result.scalar() or 0
        faq_hit_rate = round(faq_hits / total_interactions, 4) if total_interactions > 0 else 0.0

        # Average sentiment score
        sentiment_stmt = select(func.avg(InteractionLog.sentiment_score))
        sentiment_stmt = _date_filter(sentiment_stmt, InteractionLog, start_date, end_date)
        sentiment_result = await db.execute(sentiment_stmt)
        avg_sentiment = round(sentiment_result.scalar() or 0.0, 4)

        # Average latency
        latency_stmt = select(func.avg(InteractionLog.latency_ms))
        latency_stmt = _date_filter(latency_stmt, InteractionLog, start_date, end_date)
        latency_result = await db.execute(latency_stmt)
        avg_latency = round(latency_result.scalar() or 0.0, 2)

        # Unique sessions
        session_stmt = select(func.count(func.distinct(InteractionLog.session_id)))
        session_stmt = _date_filter(session_stmt, InteractionLog, start_date, end_date)
        session_result = await db.execute(session_stmt)
        unique_sessions = session_result.scalar() or 0

        # Voice ratio
        voice_stmt = select(func.count(InteractionLog.id)).where(
            InteractionLog.input_type == "voice"
        )
        voice_stmt = _date_filter(voice_stmt, InteractionLog, start_date, end_date)
        voice_result = await db.execute(voice_stmt)
        voice_count = voice_result.scalar() or 0
        voice_ratio = round(voice_count / total_interactions, 4) if total_interactions > 0 else 0.0

        return {
            "total_interactions": total_interactions,
            "today_interactions": today_interactions,
            "faq_hit_rate": faq_hit_rate,
            "avg_sentiment_score": avg_sentiment,
            "avg_latency_ms": avg_latency,
            "unique_sessions": unique_sessions,
            "voice_ratio": voice_ratio,
        }
    except Exception as e:
        logger.warning("overview_stats failed: %s", e)
        return {
            "total_interactions": 0,
            "today_interactions": 0,
            "faq_hit_rate": 0.0,
            "avg_sentiment_score": 0.0,
            "avg_latency_ms": 0.0,
            "unique_sessions": 0,
            "voice_ratio": 0.0,
        }


async def trend_stats(db: AsyncSession, days: int = 7) -> dict:
    """Return daily trend data for the last N days."""
    try:
        since = datetime.utcnow() - timedelta(days=days)

        # Base aggregates per day
        stmt = (
            select(
                cast(InteractionLog.created_at, Date).label("date"),
                func.count(InteractionLog.id).label("interactions"),
                func.avg(InteractionLog.sentiment_score).label("avg_sentiment"),
                func.avg(InteractionLog.latency_ms).label("avg_latency"),
                func.sum(cast(InteractionLog.is_faq_hit, Integer)).label("faq_hits"),
            )
            .where(InteractionLog.created_at >= since)
            .group_by(cast(InteractionLog.created_at, Date))
            .order_by(cast(InteractionLog.created_at, Date))
        )

        result = await db.execute(stmt)
        rows = result.all()

        # Sentiment label distribution per day
        sentiment_stmt = (
            select(
                cast(InteractionLog.created_at, Date).label("date"),
                InteractionLog.sentiment_label,
                func.count(InteractionLog.id).label("count"),
            )
            .where(InteractionLog.created_at >= since)
            .where(InteractionLog.sentiment_label.isnot(None))
            .group_by(cast(InteractionLog.created_at, Date), InteractionLog.sentiment_label)
        )
        sentiment_result = await db.execute(sentiment_stmt)
        sentiment_rows = sentiment_result.all()

        # Build sentiment ratio map: date -> {positive, neutral, negative}
        sentiment_map: dict[str, dict[str, int]] = {}
        for row in sentiment_rows:
            d = str(row.date)
            if d not in sentiment_map:
                sentiment_map[d] = {"positive": 0, "neutral": 0, "negative": 0}
            label = row.sentiment_label or "neutral"
            if label in sentiment_map[d]:
                sentiment_map[d][label] = row.count or 0

        trends = []
        for row in rows:
            total = row.interactions or 0
            faq_hits = row.faq_hits or 0
            d = str(row.date)
            s = sentiment_map.get(d, {"positive": 0, "neutral": 0, "negative": 0})
            trends.append({
                "date": d,
                "interactions": total,
                "avg_sentiment": round(float(row.avg_sentiment or 0), 4),
                "avg_latency_ms": round(float(row.avg_latency or 0), 2),
                "faq_hit_rate": round(faq_hits / total, 4) if total > 0 else 0.0,
                "positive_ratio": round(s["positive"] / total, 4) if total > 0 else 0.0,
                "neutral_ratio": round(s["neutral"] / total, 4) if total > 0 else 0.0,
                "negative_ratio": round(s["negative"] / total, 4) if total > 0 else 0.0,
            })

        return {"days": days, "trends": trends}
    except Exception as e:
        logger.warning("trend_stats failed: %s", e)
        return {"days": days, "trends": []}


async def top_questions(
    db: AsyncSession,
    limit: int = 10,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Return most frequent user questions."""
    try:
        stmt = (
            select(
                InteractionLog.user_input.label("question"),
                func.count(InteractionLog.id).label("count"),
                InteractionLog.is_faq_hit.label("is_faq"),
            )
            .group_by(InteractionLog.user_input, InteractionLog.is_faq_hit)
            .order_by(desc(func.count(InteractionLog.id)))
            .limit(limit)
        )
        stmt = _date_filter(stmt, InteractionLog, start_date, end_date)

        result = await db.execute(stmt)
        rows = result.all()

        questions = []
        for row in rows:
            questions.append({
                "question": row.question,
                "count": row.count,
                "source": "faq" if row.is_faq else "rag",
            })

        return {"questions": questions}
    except Exception as e:
        logger.warning("top_questions failed: %s", e)
        return {"questions": []}


async def sentiment_distribution(
    db: AsyncSession,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Return sentiment label distribution."""
    try:
        stmt = (
            select(
                InteractionLog.sentiment_label,
                func.count(InteractionLog.id).label("count"),
            )
            .where(InteractionLog.sentiment_label.isnot(None))
            .group_by(InteractionLog.sentiment_label)
        )
        stmt = _date_filter(stmt, InteractionLog, start_date, end_date)

        result = await db.execute(stmt)
        rows = result.all()

        total = sum(r.count for r in rows) or 1
        distribution = {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
        for row in rows:
            label = row.sentiment_label or "neutral"
            if label in distribution:
                distribution[label] = round(row.count / total, 4)

        # Average score
        avg_stmt = select(func.avg(InteractionLog.sentiment_score))
        avg_stmt = _date_filter(avg_stmt, InteractionLog, start_date, end_date)
        avg_result = await db.execute(avg_stmt)
        avg_score = round(avg_result.scalar() or 0.0, 4)

        return {
            "positive": distribution["positive"],
            "neutral": distribution["neutral"],
            "negative": distribution["negative"],
            "avg_score": avg_score,
        }
    except Exception as e:
        logger.warning("sentiment_distribution failed: %s", e)
        return {"positive": 0.0, "neutral": 0.0, "negative": 0.0, "avg_score": 0.0}


async def knowledge_stats(db: AsyncSession) -> dict:
    """Return knowledge base statistics."""
    try:
        # Document counts
        total_docs_stmt = select(func.count(KnowledgeDoc.id))
        total_docs_result = await db.execute(total_docs_stmt)
        total_docs = total_docs_result.scalar() or 0

        indexed_docs_stmt = select(func.count(KnowledgeDoc.id)).where(
            KnowledgeDoc.status == DocStatus.indexed
        )
        indexed_docs_result = await db.execute(indexed_docs_stmt)
        indexed_docs = indexed_docs_result.scalar() or 0

        # FAQ counts
        total_faqs_stmt = select(func.count(FaqEntry.id))
        total_faqs_result = await db.execute(total_faqs_stmt)
        total_faqs = total_faqs_result.scalar() or 0

        active_faqs_stmt = select(func.count(FaqEntry.id)).where(FaqEntry.is_active == True)
        active_faqs_result = await db.execute(active_faqs_stmt)
        active_faqs = active_faqs_result.scalar() or 0

        # Top FAQs by hit_count
        top_faqs_stmt = (
            select(FaqEntry.question, FaqEntry.hit_count)
            .where(FaqEntry.is_active == True)
            .order_by(desc(FaqEntry.hit_count))
            .limit(5)
        )
        top_faqs_result = await db.execute(top_faqs_stmt)
        top_faqs_rows = top_faqs_result.all()

        top_faqs = [
            {"question": row.question, "hit_count": row.hit_count}
            for row in top_faqs_rows
        ]

        return {
            "total_docs": total_docs,
            "indexed_docs": indexed_docs,
            "total_faqs": total_faqs,
            "active_faqs": active_faqs,
            "top_faqs": top_faqs,
        }
    except Exception as e:
        logger.warning("knowledge_stats failed: %s", e)
        return {
            "total_docs": 0,
            "indexed_docs": 0,
            "total_faqs": 0,
            "active_faqs": 0,
            "top_faqs": [],
        }


async def heatmap_stats(db: AsyncSession) -> dict:
    """Return interaction heatmap data by day-of-week and hour."""
    try:
        stmt = (
            select(
                func.extract("dow", InteractionLog.created_at).label("dow"),
                func.extract("hour", InteractionLog.created_at).label("hour"),
                func.count(InteractionLog.id).label("count"),
            )
            .group_by(
                func.extract("dow", InteractionLog.created_at),
                func.extract("hour", InteractionLog.created_at),
            )
            .order_by(
                func.extract("dow", InteractionLog.created_at),
                func.extract("hour", InteractionLog.created_at),
            )
        )
        result = await db.execute(stmt)
        rows = result.all()

        data = []
        for row in rows:
            # PostgreSQL dow: 0=Sun, 1=Mon, ..., 6=Sat
            # Frontend expects: 0=Mon, ..., 6=Sun
            dow = int(row.dow or 0)
            mapped_dow = dow - 1 if dow > 0 else 6
            data.append({
                "day_of_week": mapped_dow,
                "hour": int(row.hour or 0),
                "count": int(row.count or 0),
            })

        return {"data": data}
    except Exception as e:
        logger.warning("heatmap_stats failed: %s", e)
        return {"data": []}


async def realtime_logs(db: AsyncSession, limit: int = 20) -> dict:
    """Return recent interaction logs."""
    try:
        stmt = (
            select(InteractionLog)
            .order_by(desc(InteractionLog.created_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()

        recent = []
        for row in rows:
            recent.append({
                "session_id": row.session_id,
                "question": row.user_input[:200],
                "answer": row.llm_response[:300],
                "input_type": row.input_type,
                "sentiment_label": row.sentiment_label,
                "sentiment_score": row.sentiment_score,
                "source": "faq" if row.is_faq_hit else "rag",
                "latency_ms": row.latency_ms,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            })

        return {"recent": recent}
    except Exception as e:
        logger.warning("realtime_logs failed: %s", e)
        return {"recent": []}
