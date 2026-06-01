from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AvatarConfig(Base):
    __tablename__ = "avatar_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    model_path: Mapped[str | None] = mapped_column(String(1000))  # Live2D model file path
    appearance_json: Mapped[dict | None] = mapped_column(JSON)    # clothing, hair, accessory
    voice_id: Mapped[str | None] = mapped_column(String(200))     # TTS voice preset
    emotion_presets: Mapped[dict | None] = mapped_column(JSON)    # emotion expression configs
    welcome_message: Mapped[str | None] = mapped_column(Text)     # default greeting
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
