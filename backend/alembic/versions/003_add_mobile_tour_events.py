"""Add mobile tour events

Revision ID: 003
Revises: 002
Create Date: 2026-06-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mobile_tour_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(100), nullable=False),
        sa.Column("event_name", sa.String(80), nullable=False),
        sa.Column("route_id", sa.String(100), nullable=True),
        sa.Column("route_name", sa.String(200), nullable=True),
        sa.Column("spot_id", sa.String(100), nullable=True),
        sa.Column("spot_name", sa.String(200), nullable=True),
        sa.Column("source_page", sa.String(100), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("preferences_json", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mobile_tour_events_created_at", "mobile_tour_events", ["created_at"])
    op.create_index("ix_mobile_tour_events_event_name", "mobile_tour_events", ["event_name"])
    op.create_index("ix_mobile_tour_events_route_id", "mobile_tour_events", ["route_id"])
    op.create_index("ix_mobile_tour_events_session_id", "mobile_tour_events", ["session_id"])
    op.create_index("ix_mobile_tour_events_spot_id", "mobile_tour_events", ["spot_id"])


def downgrade() -> None:
    op.drop_index("ix_mobile_tour_events_spot_id", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_session_id", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_route_id", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_event_name", table_name="mobile_tour_events")
    op.drop_index("ix_mobile_tour_events_created_at", table_name="mobile_tour_events")
    op.drop_table("mobile_tour_events")
