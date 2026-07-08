from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TourSession(Base):
    __tablename__ = "tour_sessions"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True)
    route_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    route_name: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default="in_progress", index=True)
    current_spot_id: Mapped[str | None] = mapped_column(String(100), index=True)
    completed_spots: Mapped[list | None] = mapped_column(JSON)
    preferences_json: Mapped[dict | None] = mapped_column(JSON)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)
