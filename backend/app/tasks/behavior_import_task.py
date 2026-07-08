import asyncio
import json
import logging
from pathlib import Path

from sqlalchemy import delete

from app.core.database import async_session
from app.core.redis_client import get_redis
from app.models.behavior import SpotStatistics, TouristBehavior
from app.services.data_import import compute_spot_statistics, import_behavior_data
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

BEHAVIOR_IMPORT_PREFIX = "behavior_import"
BEHAVIOR_IMPORT_TTL = 24 * 3600

_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)


async def _set_status(task_id: str, status: dict) -> None:
    try:
        redis = await get_redis()
        await redis.set(
            f"{BEHAVIOR_IMPORT_PREFIX}:{task_id}",
            json.dumps(status, ensure_ascii=False),
            ex=BEHAVIOR_IMPORT_TTL,
        )
    except Exception as exc:
        logger.debug("Behavior import status cache failed: %s", exc)


@celery_app.task(bind=True, max_retries=1, default_retry_delay=20)
def import_behavior_file_task(self, file_path: str, strategy: str = "append"):
    task_id = self.request.id

    async def _run():
        await _set_status(task_id, {"task_id": task_id, "status": "running", "progress": 10})
        async with async_session() as db:
            if strategy == "overwrite":
                await db.execute(delete(SpotStatistics))
                await db.execute(delete(TouristBehavior))
                await db.commit()
                await _set_status(task_id, {"task_id": task_id, "status": "running", "progress": 25})

            result = await import_behavior_data(db, file_path=Path(file_path))
            await _set_status(task_id, {"task_id": task_id, "status": "running", "progress": 80, **result})
            stats = await compute_spot_statistics(db)
            return {**result, "statistics": stats}

    try:
        result = _loop.run_until_complete(_run())
        payload = {"task_id": task_id, "status": "done", "progress": 100, **result}
        _loop.run_until_complete(_set_status(task_id, payload))
        return payload
    except Exception as exc:
        payload = {"task_id": task_id, "status": "failed", "progress": 100, "error": str(exc)}
        _loop.run_until_complete(_set_status(task_id, payload))
        logger.error("Behavior import failed: %s", exc)
        raise self.retry(exc=exc)


async def get_behavior_import_status(task_id: str) -> dict | None:
    try:
        redis = await get_redis()
        cached = await redis.get(f"{BEHAVIOR_IMPORT_PREFIX}:{task_id}")
        if cached:
            return json.loads(cached)
    except Exception as exc:
        logger.debug("Behavior import status lookup failed: %s", exc)
    return None
