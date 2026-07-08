"""add_mobile_compat_tables

Revision ID: b8c2e6a1f4d9
Revises: 965e9d30cf52
Create Date: 2026-07-02 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c2e6a1f4d9"
down_revision: Union[str, None] = "965e9d30cf52"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("nickname", sa.String(length=50), nullable=True),
        sa.Column("avatar", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="tourist"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "tour_sessions",
        sa.Column("id", sa.String(length=120), nullable=False),
        sa.Column("session_id", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("route_id", sa.String(length=100), nullable=False),
        sa.Column("route_name", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="in_progress"),
        sa.Column("current_spot_id", sa.String(length=100), nullable=True),
        sa.Column("completed_spots", sa.JSON(), nullable=True),
        sa.Column("preferences_json", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tour_sessions_session_id", "tour_sessions", ["session_id"], unique=False)
    op.create_index("ix_tour_sessions_user_id", "tour_sessions", ["user_id"], unique=False)
    op.create_index("ix_tour_sessions_route_id", "tour_sessions", ["route_id"], unique=False)
    op.create_index("ix_tour_sessions_status", "tour_sessions", ["status"], unique=False)
    op.create_index("ix_tour_sessions_current_spot_id", "tour_sessions", ["current_spot_id"], unique=False)

    op.create_table(
        "mobile_tour_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(length=100), nullable=False),
        sa.Column("event_name", sa.String(length=80), nullable=False),
        sa.Column("route_id", sa.String(length=100), nullable=True),
        sa.Column("route_name", sa.String(length=200), nullable=True),
        sa.Column("spot_id", sa.String(length=100), nullable=True),
        sa.Column("spot_name", sa.String(length=200), nullable=True),
        sa.Column("source_page", sa.String(length=100), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("preferences_json", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mobile_tour_events_session_id", "mobile_tour_events", ["session_id"], unique=False)
    op.create_index("ix_mobile_tour_events_event_name", "mobile_tour_events", ["event_name"], unique=False)
    op.create_index("ix_mobile_tour_events_route_id", "mobile_tour_events", ["route_id"], unique=False)
    op.create_index("ix_mobile_tour_events_spot_id", "mobile_tour_events", ["spot_id"], unique=False)
    op.create_index("ix_mobile_tour_events_created_at", "mobile_tour_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_mobile_tour_events_created_at", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_spot_id", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_route_id", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_event_name", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_session_id", table_name="mobile_tour_events")
    op.drop_table("mobile_tour_events")

    op.drop_index("ix_tour_sessions_current_spot_id", table_name="tour_sessions")
    op.drop_index("ix_tour_sessions_status", table_name="tour_sessions")
    op.drop_index("ix_tour_sessions_route_id", table_name="tour_sessions")
    op.drop_index("ix_tour_sessions_user_id", table_name="tour_sessions")
    op.drop_index("ix_tour_sessions_session_id", table_name="tour_sessions")
    op.drop_table("tour_sessions")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
