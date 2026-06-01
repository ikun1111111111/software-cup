from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, JSON, ARRAY, Float
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
