import asyncio
import logging
from datetime import datetime, time, timedelta, timezone

from app.services.report_archive_service import generate_scheduled_reports_for_date

logger = logging.getLogger(__name__)

SHANGHAI_TZ = timezone(timedelta(hours=8))
SCHEDULE_TIME = time(hour=18, minute=0, second=0, tzinfo=SHANGHAI_TZ)


def next_run_at(now: datetime | None = None) -> datetime:
    current = now or datetime.now(SHANGHAI_TZ)
    if current.tzinfo is None:
        current = current.replace(tzinfo=SHANGHAI_TZ)
    local_now = current.astimezone(SHANGHAI_TZ)
    candidate = datetime.combine(local_now.date(), SCHEDULE_TIME)
    if local_now >= candidate:
        candidate += timedelta(days=1)
    return candidate


async def report_scheduler_loop(stop_event: asyncio.Event) -> None:
    logger.info("Report scheduler started; daily run time is 18:00 Asia/Shanghai")
    while not stop_event.is_set():
        run_at = next_run_at()
        wait_seconds = max(1.0, (run_at - datetime.now(SHANGHAI_TZ)).total_seconds())
        logger.info("Next scheduled report run: %s", run_at.isoformat())
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=wait_seconds)
            break
        except TimeoutError:
            pass

        schedule_date = datetime.now(SHANGHAI_TZ).date()
        try:
            await generate_scheduled_reports_for_date(schedule_date)
        except Exception as exc:
            logger.exception("Scheduled report generation loop failed: %s", exc)

    logger.info("Report scheduler stopped")


def start_report_scheduler() -> tuple[asyncio.Task, asyncio.Event]:
    stop_event = asyncio.Event()
    task = asyncio.create_task(report_scheduler_loop(stop_event))
    return task, stop_event


async def stop_report_scheduler(task: asyncio.Task | None, stop_event: asyncio.Event | None) -> None:
    if stop_event:
        stop_event.set()
    if task:
        try:
            await asyncio.wait_for(task, timeout=5)
        except TimeoutError:
            task.cancel()
        except asyncio.CancelledError:
            pass
