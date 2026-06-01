from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class InteractionLog(Base):
    __tablename__ = "interaction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_input: Mapped[str] = mapped_column(Text, nullable=False)
    input_type: Mapped[str] = mapped_column(String(20), default="text")  # text / voice
    asr_text: Mapped[str | None] = mapped_column(Text)  # ASR result if voice
    retrieved_chunks: Mapped[str | None] = mapped_column(Text)  # JSON of retrieved chunk ids
    llm_response: Mapped[str] = mapped_column(Text, nullable=False)
    llm_model: Mapped[str] = mapped_column(String(100))
    tts_audio_url: Mapped[str | None] = mapped_column(String(1000))
    sentiment_score: Mapped[float | None] = mapped_column(Float)
    sentiment_label: Mapped[str | None] = mapped_column(String(20))  # positive/neutral/negative
    user_feedback: Mapped[str | None] = mapped_column(String(20))  # like/dislike/none
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    is_faq_hit: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
