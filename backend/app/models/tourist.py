from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, JSON, ARRAY, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TouristProfile(Base):
    __tablename__ = "tourist_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    openid: Mapped[str | None] = mapped_column(String(200), unique=True, index=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    interests: Mapped[list | None] = mapped_column(JSON)     # ["history", "nature", "food"]
    interest_embedding: Mapped[list | None] = mapped_column(ARRAY(Float))  # interest vector
    preferences_json: Mapped[dict | None] = mapped_column(JSON)  # preferred depth, voice, etc
    visit_history: Mapped[list | None] = mapped_column(JSON)     # [{"spot": "xx", "time": "..."}]
    total_interactions: Mapped[int] = mapped_column(Integer, default=0)
    avg_sentiment: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScenicSpot(Base):
    __tablename__ = "scenic_spots"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    category: Mapped[str] = mapped_column(String(50), default="核心景点")
    tags: Mapped[list | None] = mapped_column(JSON)
    overview: Mapped[str] = mapped_column(Text, default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    qr_code: Mapped[str | None] = mapped_column(String(200), index=True)
    related_spots: Mapped[list | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TourRoute(Base):
    __tablename__ = "tour_routes"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    route_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    gradient: Mapped[str | None] = mapped_column(String(200))
    spot_order: Mapped[list] = mapped_column(JSON)
    spot_details: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
