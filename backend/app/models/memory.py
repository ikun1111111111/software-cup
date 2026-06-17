from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TravelMemory(Base):
    __tablename__ = "travel_memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    original_content: Mapped[str] = mapped_column(Text, nullable=False)
    polished_content: Mapped[str | None] = mapped_column(Text)
    spot_name: Mapped[str | None] = mapped_column(String(200))
    spot_id: Mapped[str | None] = mapped_column(String(50))
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, default="chat")  # chat / vision / route
    mood_tag: Mapped[str | None] = mapped_column(String(20))  # 敬畏/惊喜/平静/感动
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    # 记忆胶囊字段
    is_capsule: Mapped[bool] = mapped_column(Boolean, default=False)
    capsule_unlock_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    capsule_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JourneySummary(Base):
    __tablename__ = "journey_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    spot_count: Mapped[int] = mapped_column(Integer, default=0)
    memory_count: Mapped[int] = mapped_column(Integer, default=0)
    date_range: Mapped[str] = mapped_column(String(100))
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
