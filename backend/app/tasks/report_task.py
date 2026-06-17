"""Celery tasks for async analytics report generation."""
import asyncio
import json
import logging
import uuid
from datetime import datetime
from decimal import Decimal

from app.tasks.celery_app import celery_app
from app.core.database import async_session
from app.core.report_generator import generate_report
from app.core.redis_client import get_redis


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


@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def generate_report_task(
    self,
    start_date: str | None = None,
    end_date: str | None = None,
    days: int = 7,
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
            # Parse dates
            parsed_start = None
            parsed_end = None
            if start_date:
                parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
            if end_date:
                parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
                # Set to end of day
                parsed_end = parsed_end.replace(hour=23, minute=59, second=59)

            result = await generate_report(
                db,
                start_date=parsed_start,
                end_date=parsed_end,
                days=days,
            )
            result["task_id"] = task_id
            result["status"] = "done"
            return result

    try:
        report_data = _loop.run_until_complete(_run())
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        raise self.retry(exc=exc)

    # Cache in Redis
    async def _cache():
        cache_key = f"{REPORT_CACHE_PREFIX}:{task_id}"
        redis = await get_redis()
        await redis.set(cache_key, _json_dumps(report_data), ex=REPORT_CACHE_TTL)

    try:
        _loop.run_until_complete(_cache())
    except Exception as e:
        logger.warning("Failed to cache report result: %s", e)

    logger.info("Report generated: task_id=%s period=%s", task_id, report_data.get("period"))
    return report_data


async def get_report_status(task_id: str) -> dict | None:
    """Check report generation status from Redis cache."""
    try:
        redis = await get_redis()
        cached = await redis.get(f"{REPORT_CACHE_PREFIX}:{task_id}")
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.debug("Report status check failed: %s", e)
    return None
