"""Initial schema — all tables

Revision ID: 001
Revises: None
Create Date: 2026-06-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # knowledge_docs
    op.create_table(
        "knowledge_docs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("file_type", sa.String(20), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=True),
        sa.Column("status", sa.Enum("pending", "indexing", "indexed", "failed", name="docstatus"), nullable=False),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # knowledge_chunks
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("doc_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding_id", sa.String(200), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_chunks_doc_id", "knowledge_chunks", ["doc_id"])

    # faq_entries
    op.create_table(
        "faq_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=False, server_default="general"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # interaction_logs
    op.create_table(
        "interaction_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(100), nullable=False),
        sa.Column("user_input", sa.Text(), nullable=False),
        sa.Column("input_type", sa.String(20), nullable=False, server_default="text"),
        sa.Column("asr_text", sa.Text(), nullable=True),
        sa.Column("retrieved_chunks", sa.Text(), nullable=True),
        sa.Column("llm_response", sa.Text(), nullable=False),
        sa.Column("llm_model", sa.String(100), nullable=False),
        sa.Column("tts_audio_url", sa.String(1000), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("sentiment_label", sa.String(20), nullable=True),
        sa.Column("user_feedback", sa.String(20), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_faq_hit", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interaction_logs_session_id", "interaction_logs", ["session_id"])

    # avatar_config
    op.create_table(
        "avatar_config",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("model_path", sa.String(1000), nullable=True),
        sa.Column("appearance_json", sa.JSON(), nullable=True),
        sa.Column("voice_id", sa.String(200), nullable=True),
        sa.Column("emotion_presets", sa.JSON(), nullable=True),
        sa.Column("welcome_message", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # tourist_profiles
    op.create_table(
        "tourist_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("openid", sa.String(200), nullable=True),
        sa.Column("session_id", sa.String(100), nullable=False),
        sa.Column("interests", sa.JSON(), nullable=True),
        sa.Column("interest_embedding", sa.ARRAY(sa.Float()), nullable=True),
        sa.Column("preferences_json", sa.JSON(), nullable=True),
        sa.Column("visit_history", sa.JSON(), nullable=True),
        sa.Column("total_interactions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_sentiment", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tourist_profiles_openid", "tourist_profiles", ["openid"], unique=True)
    op.create_index("ix_tourist_profiles_session_id", "tourist_profiles", ["session_id"], unique=True)


def downgrade() -> None:
    op.drop_table("tourist_profiles")
    op.drop_table("avatar_config")
    op.drop_index("ix_interaction_logs_session_id", table_name="interaction_logs")
    op.drop_table("interaction_logs")
    op.drop_table("faq_entries")
    op.drop_index("ix_knowledge_chunks_doc_id", table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_docs")
    op.execute("DROP TYPE IF EXISTS docstatus")
