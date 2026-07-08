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
    dna_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    dna_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
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
    thumbnail: Mapped[str | None] = mapped_column(String(255))
    detail_images: Mapped[list | None] = mapped_column(JSON)
    story_acts: Mapped[list | None] = mapped_column(JSON)
    duration: Mapped[str | None] = mapped_column(String(50))
    qa_json: Mapped[list | None] = mapped_column(JSON)
    display_x: Mapped[float | None] = mapped_column(Float)
    display_y: Mapped[float | None] = mapped_column(Float)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    topic_tags: Mapped[list | None] = mapped_column(JSON)
    ticket_info: Mapped[str | None] = mapped_column(Text)
    open_time: Mapped[str | None] = mapped_column(Text)
    must_see: Mapped[str | None] = mapped_column(Text)
    best_time: Mapped[str | None] = mapped_column(Text)
    narration: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class POI(Base):
    __tablename__ = "pois"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    phone: Mapped[str | None] = mapped_column(String(100))
    business_hours: Mapped[str | None] = mapped_column(String(200))
    price_level: Mapped[str | None] = mapped_column(String(50))
    intro: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list | None] = mapped_column(JSON)
    source: Mapped[str | None] = mapped_column(String(50), default="manual")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ShowEvent(Base):
    __tablename__ = "show_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    spot_id: Mapped[str | None] = mapped_column(String(50), index=True)
    venue: Mapped[str | None] = mapped_column(String(200))
    start_time: Mapped[str | None] = mapped_column(String(50))
    duration: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    price_note: Mapped[str | None] = mapped_column(Text)
    schedule_text: Mapped[str | None] = mapped_column(Text)
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
    cover_image: Mapped[str | None] = mapped_column(String(255))
    color: Mapped[str | None] = mapped_column(String(50))
    brush_image: Mapped[str | None] = mapped_column(String(255))
    opening_text: Mapped[str | None] = mapped_column(Text)
    closing_text: Mapped[str | None] = mapped_column(Text)
    spot_order: Mapped[list] = mapped_column(JSON)
    spot_details: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
