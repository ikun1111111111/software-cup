"""Behavior data model — tourist behavior records from Excel import."""
from datetime import datetime, date
from sqlalchemy import String, Text, Integer, DateTime, Float, Date, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TouristBehavior(Base):
    """Tourist behavior record imported from 140,447 Excel rows.

    Columns mapped from the 17-column Excel:
    tourist_id, attraction_name, visit_date, costs, stay_duration_minutes,
    satisfaction_score, companion_count, companion_type, weather, temperature,
    is_holiday, visit_hour, device_type, search_keyword, click_attraction,
    page_view_count, review_text
    """
    __tablename__ = "tourist_behaviors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tourist_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    attraction_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    visit_date: Mapped[date] = mapped_column(Date, nullable=True, index=True)
    costs: Mapped[float | None] = mapped_column(Float, default=0.0)
    stay_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=0)
    satisfaction_score: Mapped[float | None] = mapped_column(Float, default=3.0)
    companion_count: Mapped[int | None] = mapped_column(Integer, default=0)
    companion_type: Mapped[str | None] = mapped_column(String(50))
    weather: Mapped[str | None] = mapped_column(String(50))
    temperature: Mapped[float | None] = mapped_column(Float)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False)
    visit_hour: Mapped[int | None] = mapped_column(Integer)
    device_type: Mapped[str | None] = mapped_column(String(50))
    search_keyword: Mapped[str | None] = mapped_column(String(200))
    click_attraction: Mapped[str | None] = mapped_column(String(200))
    page_view_count: Mapped[int | None] = mapped_column(Integer, default=1)
    review_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_tourist_visit", "tourist_id", "visit_date"),
        Index("idx_attraction_date", "attraction_name", "visit_date"),
        Index("idx_satisfaction", "satisfaction_score"),
    )


class SpotStatistics(Base):
    """Pre-computed statistics per scenic spot."""
    __tablename__ = "spot_statistics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attraction_name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    total_visits: Mapped[int] = mapped_column(Integer, default=0)
    avg_satisfaction: Mapped[float | None] = mapped_column(Float)
    avg_stay_minutes: Mapped[float | None] = mapped_column(Float)
    avg_cost: Mapped[float | None] = mapped_column(Float)
    peak_hour: Mapped[int | None] = mapped_column(Integer)
    peak_season: Mapped[str | None] = mapped_column(String(50))
    popular_with_family: Mapped[bool] = mapped_column(Boolean, default=False)
    popular_with_couples: Mapped[bool] = mapped_column(Boolean, default=False)
    popular_with_solo: Mapped[bool] = mapped_column(Boolean, default=False)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
