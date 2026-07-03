import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.core.report_generator import generate_marketing_report, generate_report
from app.models.report_archive import ReportArchive

logger = logging.getLogger(__name__)

REPORT_TYPE_SENTIMENT = "sentiment"
REPORT_TYPE_MARKETING = "marketing"
SUPPORTED_REPORT_TYPES = {REPORT_TYPE_SENTIMENT, REPORT_TYPE_MARKETING}


def utcnow() -> datetime:
    return datetime.utcnow()


def normalize_report_type(report_type: str | None) -> str:
    value = (report_type or REPORT_TYPE_SENTIMENT).strip().lower()
    if value not in SUPPORTED_REPORT_TYPES:
        raise ValueError(f"Unsupported report_type: {report_type}")
    return value


def parse_report_period(
    start_date: str | None = None,
    end_date: str | None = None,
    days: int = 7,
) -> tuple[datetime | None, datetime | None]:
    if start_date:
        parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        parsed_start = None
    if end_date:
        parsed_end = datetime.strptime(end_date, "%Y-%m-%d").replace(
            hour=23,
            minute=59,
            second=59,
        )
    else:
        parsed_end = None

    if parsed_start is None and parsed_end is None:
        parsed_end = utcnow()
        parsed_start = parsed_end - timedelta(days=days)
    elif parsed_start is None and parsed_end is not None:
        parsed_start = parsed_end - timedelta(days=days)
    elif parsed_start is not None and parsed_end is None:
        parsed_end = utcnow()

    if parsed_start and parsed_end and parsed_start > parsed_end:
        raise ValueError("start_date must be before end_date")
    return parsed_start, parsed_end


def default_report_title(report_type: str) -> str:
    if report_type == REPORT_TYPE_MARKETING:
        return "Marketing Decision Report"
    return "Tourist Sentiment Report"


def completed_period_text(archive: ReportArchive, result: dict) -> str | None:
    if archive.report_type == REPORT_TYPE_SENTIMENT:
        return archive.period_text or result.get("period")
    if archive.report_type == REPORT_TYPE_MARKETING:
        return archive.period_text or "全部行为数据"
    return result.get("period") or archive.period_text


def serialize_report_archive(archive: ReportArchive, include_content: bool = True) -> dict:
    return {
        "id": archive.id,
        "task_id": archive.task_id,
        "report_type": archive.report_type,
        "title": archive.title,
        "content": archive.content if include_content else None,
        "stats": archive.stats_json,
        "period_start": archive.period_start.isoformat() if archive.period_start else None,
        "period_end": archive.period_end.isoformat() if archive.period_end else None,
        "period_text": archive.period_text,
        "status": archive.status,
        "trigger_source": archive.trigger_source,
        "schedule_date": archive.schedule_date.isoformat() if archive.schedule_date else None,
        "error_message": archive.error_message,
        "generated_at": archive.generated_at.isoformat() if archive.generated_at else None,
        "started_at": archive.started_at.isoformat() if archive.started_at else None,
        "completed_at": archive.completed_at.isoformat() if archive.completed_at else None,
        "created_at": archive.created_at.isoformat() if archive.created_at else None,
        "updated_at": archive.updated_at.isoformat() if archive.updated_at else None,
    }


def json_safe(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [json_safe(item) for item in value]
    return value


def legacy_report_status_payload(archive: ReportArchive) -> dict:
    return {
        "task_id": archive.task_id,
        "report_id": archive.id,
        "status": archive.status,
        "content": archive.content,
        "period": archive.period_text,
        "generated_at": archive.generated_at.isoformat() if archive.generated_at else None,
    }


async def get_report_by_task_id(db: AsyncSession, task_id: str) -> ReportArchive | None:
    result = await db.execute(
        select(ReportArchive).where(ReportArchive.task_id == task_id).limit(1)
    )
    return result.scalar_one_or_none()


async def get_report_archive(db: AsyncSession, report_id: int) -> ReportArchive | None:
    return await db.get(ReportArchive, report_id)


async def get_latest_report_archive(
    db: AsyncSession,
    report_type: str = REPORT_TYPE_SENTIMENT,
) -> ReportArchive | None:
    report_type = normalize_report_type(report_type)
    result = await db.execute(
        select(ReportArchive)
        .where(
            ReportArchive.report_type == report_type,
            ReportArchive.status == "done",
        )
        .order_by(
            ReportArchive.generated_at.desc().nullslast(),
            ReportArchive.completed_at.desc().nullslast(),
            ReportArchive.created_at.desc(),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def list_report_archives(
    db: AsyncSession,
    report_type: str | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ReportArchive], int]:
    stmt = select(ReportArchive)
    count_stmt = select(func.count()).select_from(ReportArchive)
    filters = []
    if report_type:
        filters.append(ReportArchive.report_type == normalize_report_type(report_type))
    if status:
        filters.append(ReportArchive.status == status)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    total = int((await db.execute(count_stmt)).scalar() or 0)
    rows = (
        await db.execute(
            stmt.order_by(ReportArchive.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()
    return list(rows), total


async def create_report_archive(
    db: AsyncSession,
    report_type: str = REPORT_TYPE_SENTIMENT,
    trigger_source: str = "manual",
    start_date: str | None = None,
    end_date: str | None = None,
    days: int = 7,
    task_id: str | None = None,
    schedule_date: date | None = None,
) -> ReportArchive:
    report_type = normalize_report_type(report_type)
    period_start, period_end = (
        parse_report_period(start_date, end_date, days)
        if report_type == REPORT_TYPE_SENTIMENT
        else (None, None)
    )
    archive = ReportArchive(
        task_id=task_id or f"report-{uuid4().hex}",
        report_type=report_type,
        title=default_report_title(report_type),
        period_start=period_start,
        period_end=period_end,
        period_text=(
            f"{period_start.date()} to {period_end.date()}"
            if period_start and period_end
            else None
        ),
        status="queued",
        trigger_source=trigger_source,
        schedule_date=schedule_date,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(archive)
    await db.commit()
    await db.refresh(archive)
    return archive


async def get_or_create_scheduled_report(
    db: AsyncSession,
    report_type: str,
    schedule_date: date,
    days: int = 7,
) -> tuple[ReportArchive, bool]:
    report_type = normalize_report_type(report_type)
    existing = (
        await db.execute(
            select(ReportArchive)
            .where(
                ReportArchive.report_type == report_type,
                ReportArchive.trigger_source == "scheduled",
                ReportArchive.schedule_date == schedule_date,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing:
        return existing, False

    if report_type == REPORT_TYPE_SENTIMENT:
        end_date = schedule_date.isoformat()
        start_date = (schedule_date - timedelta(days=days)).isoformat()
    else:
        start_date = None
        end_date = None

    archive = await create_report_archive(
        db,
        report_type=report_type,
        trigger_source="scheduled",
        start_date=start_date,
        end_date=end_date,
        days=days,
        schedule_date=schedule_date,
    )
    return archive, True


async def _generate_archive_content(
    db: AsyncSession,
    archive: ReportArchive,
) -> dict:
    if archive.report_type == REPORT_TYPE_MARKETING:
        return await generate_marketing_report(db)

    return await generate_report(
        db,
        start_date=archive.period_start,
        end_date=archive.period_end,
        days=7,
    )


async def run_report_generation(report_id: int) -> dict | None:
    async with async_session() as db:
        archive = await get_report_archive(db, report_id)
        if not archive:
            logger.warning("Report archive not found: id=%s", report_id)
            return None
        if archive.status == "done":
            return serialize_report_archive(archive)
        archive.status = "running"
        archive.started_at = utcnow()
        archive.updated_at = utcnow()
        archive.error_message = None
        await db.commit()

    try:
        async with async_session() as db:
            archive = await get_report_archive(db, report_id)
            if not archive:
                return None
            result = await _generate_archive_content(db, archive)
            completed_at = utcnow()
            archive.content = result.get("content")
            archive.stats_json = json_safe(result.get("stats"))
            archive.period_text = completed_period_text(archive, result)
            archive.generated_at = completed_at
            archive.completed_at = completed_at
            archive.status = "done"
            archive.updated_at = completed_at
            archive.error_message = None
            await db.commit()
            await db.refresh(archive)
            logger.info(
                "Report archive generated: id=%s type=%s source=%s",
                archive.id,
                archive.report_type,
                archive.trigger_source,
            )
            return serialize_report_archive(archive)
    except Exception as exc:
        logger.exception("Report archive generation failed: id=%s", report_id)
        async with async_session() as db:
            archive = await get_report_archive(db, report_id)
            if not archive:
                return None
            archive.status = "failed"
            archive.error_message = str(exc)
            archive.completed_at = utcnow()
            archive.updated_at = utcnow()
            await db.commit()
            await db.refresh(archive)
            return serialize_report_archive(archive)


async def generate_scheduled_reports_for_date(schedule_date: date) -> list[dict]:
    generated: list[dict] = []
    for report_type in (REPORT_TYPE_SENTIMENT, REPORT_TYPE_MARKETING):
        try:
            async with async_session() as db:
                archive, created = await get_or_create_scheduled_report(
                    db,
                    report_type=report_type,
                    schedule_date=schedule_date,
                )
                archive_id = archive.id
            if created or archive.status in {"queued", "failed"}:
                result = await run_report_generation(archive_id)
                if result:
                    generated.append(result)
        except Exception as exc:
            logger.exception(
                "Scheduled report failed: type=%s date=%s error=%s",
                report_type,
                schedule_date,
                exc,
            )
    return generated
