"""Behavior data model — tourist behavior records from Excel import."""
from datetime import datetime, date
from sqlalchemy import String, Text, Integer, DateTime, Float, Date, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TouristBehavior(Base):
    """Tourist behavior record imported from 140,447 Excel rows.

    Columns mapped from the 17-column Excel:
    tourist_id, user_nickname, age, gender, attraction_name, attraction_content,
    attraction_type, visit_date, stay_duration, ticket_cost, food_cost, shopping_cost,
    transport_cost, entertainment_cost, total_cost, group_size, satisfaction
    """
    __tablename__ = "tourist_behaviors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tourist_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_nickname: Mapped[str | None] = mapped_column(String(100))
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(20))
    attraction_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    attraction_content: Mapped[str | None] = mapped_column(Text)
    attraction_type: Mapped[str | None] = mapped_column(String(100))
    visit_date: Mapped[date] = mapped_column(Date, nullable=True, index=True)
    stay_duration: Mapped[float | None] = mapped_column(Float)
    ticket_cost: Mapped[float | None] = mapped_column(Float)
    food_cost: Mapped[float | None] = mapped_column(Float)
    shopping_cost: Mapped[float | None] = mapped_column(Float)
    transport_cost: Mapped[float | None] = mapped_column(Float)
    entertainment_cost: Mapped[float | None] = mapped_column(Float)
    total_cost: Mapped[float | None] = mapped_column(Float)
    group_size: Mapped[int | None] = mapped_column(Integer)
    satisfaction: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_tourist_visit", "tourist_id", "visit_date"),
        Index("idx_attraction_date", "attraction_name", "visit_date"),
        Index("idx_satisfaction", "satisfaction"),
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
