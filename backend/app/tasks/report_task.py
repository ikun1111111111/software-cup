"""Celery tasks for async analytics report generation."""
import asyncio
import json
import logging
from datetime import datetime
from decimal import Decimal

from app.tasks.celery_app import celery_app
from app.core.database import async_session
from app.core.redis_client import get_redis
from app.services.report_archive_service import (
    create_report_archive,
    get_report_by_task_id,
    legacy_report_status_payload,
    run_report_generation,
)


class _DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def _json_dumps(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, cls=_DecimalEncoder)


logger = logging.getLogger(__name__)

REPORT_CACHE_PREFIX = "report"
REPORT_CACHE_TTL = 7 * 24 * 3600  # 7 days

# Persistent event loop for the Celery solo worker.
# All tasks run in the same thread sequentially, so reusing one loop avoids
# SQLAlchemy/redis connection-pool corruption caused by repeatedly closing loops.
_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)


async def _cache_report(report_data: dict) -> None:
    cache_key = f"{REPORT_CACHE_PREFIX}:{report_data['task_id']}"
    redis = await get_redis()
    await redis.set(cache_key, _json_dumps(report_data), ex=REPORT_CACHE_TTL)


def _parse_report_dates(start_date: str | None, end_date: str | None) -> tuple[datetime | None, datetime | None]:
    parsed_start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    parsed_end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59) if end_date else None
    return parsed_start, parsed_end


async def generate_report_inline(
    task_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
    days: int = 7,
    report_type: str = "sentiment",
    report_id: int | None = None,
) -> None:
    """Generate report inside the API process and cache status in Redis.

    This is used as a local fallback for development/demo environments where a
    separate Celery worker is not running. It keeps the same Redis status
    contract as the Celery task, so the frontend polling API remains unchanged.
    """
    await _cache_report({
        "task_id": task_id,
        "status": "running",
        "content": None,
        "period": None,
        "generated_at": datetime.utcnow().isoformat(),
    })
    try:
        if report_id is None:
            async with async_session() as db:
                archive = await create_report_archive(
                    db,
                    report_type=report_type,
                    trigger_source="manual",
                    start_date=start_date,
                    end_date=end_date,
                    days=days,
                    task_id=task_id,
                )
                report_id = archive.id
        result = await run_report_generation(report_id)
        if result:
            await _cache_report(
                {
                    "task_id": result.get("task_id") or task_id,
                    "report_id": result.get("id"),
                    "status": result.get("status", "unknown"),
                    "content": result.get("content"),
                    "period": result.get("period_text"),
                    "generated_at": result.get("generated_at"),
                }
            )
            logger.info("Report generated inline: task_id=%s report_id=%s", task_id, report_id)
    except Exception as exc:
        logger.exception("Inline report generation failed: %s", exc)
        await _cache_report({
            "task_id": task_id,
            "status": "failed",
            "content": f"报告生成失败：{exc}",
            "period": None,
            "generated_at": datetime.utcnow().isoformat(),
        })


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def generate_report_task(
    self,
    start_date: str | None = None,
    end_date: str | None = None,
    days: int = 7,
    report_type: str = "sentiment",
):
    """Async task: generate sentiment/analytics report and cache result.

    Args:
        start_date: ISO date string (YYYY-MM-DD) or None.
        end_date: ISO date string (YYYY-MM-DD) or None.
        days: Look-back days when start_date is not provided.

    Returns:
        {"task_id": str, "status": "done", "content": "...", "period": "..."}
    """
    task_id = self.request.id

    async def _run():
        async with async_session() as db:
            archive = await create_report_archive(
                db,
                report_type=report_type,
                trigger_source="manual",
                start_date=start_date,
                end_date=end_date,
                days=days,
                task_id=task_id,
            )
            archive_id = archive.id
        result = await run_report_generation(archive_id)
        return {
            "task_id": task_id,
            "report_id": archive_id,
            "status": result.get("status", "unknown") if result else "failed",
            "content": result.get("content") if result else None,
            "period": result.get("period_text") if result else None,
            "generated_at": result.get("generated_at") if result else datetime.utcnow().isoformat(),
        }

    try:
        report_data = _loop.run_until_complete(_run())
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        raise self.retry(exc=exc)

    try:
        _loop.run_until_complete(_cache_report(report_data))
    except Exception as e:
        logger.warning("Failed to cache report result: %s", e)

    logger.info("Report generated: task_id=%s period=%s", task_id, report_data.get("period"))
    return report_data


async def get_report_status(task_id: str) -> dict | None:
    """Check report generation status from DB archive, falling back to Redis."""
    try:
        async with async_session() as db:
            archive = await get_report_by_task_id(db, task_id)
            if archive:
                return legacy_report_status_payload(archive)
    except Exception as e:
        logger.debug("Report DB status check failed: %s", e)

    try:
        redis = await get_redis()
        cached = await redis.get(f"{REPORT_CACHE_PREFIX}:{task_id}")
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.debug("Report status check failed: %s", e)
    return None
