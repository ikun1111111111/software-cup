from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReportArchive(Base):
    __tablename__ = "report_archives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    report_type: Mapped[str] = mapped_column(String(50), default="sentiment", index=True)
    title: Mapped[str] = mapped_column(String(200), default="Tourist Sentiment Report")
    content: Mapped[str | None] = mapped_column(Text)
    stats_json: Mapped[dict | None] = mapped_column(JSON)
    period_start: Mapped[datetime | None] = mapped_column(DateTime)
    period_end: Mapped[datetime | None] = mapped_column(DateTime)
    period_text: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    trigger_source: Mapped[str] = mapped_column(String(20), default="manual", index=True)
    schedule_date: Mapped[date | None] = mapped_column(Date, index=True)
    error_message: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint(
            "report_type",
            "trigger_source",
            "schedule_date",
            name="uq_report_archives_scheduled_once",
        ),
        Index("idx_report_archives_lookup", "report_type", "status", "generated_at"),
    )
