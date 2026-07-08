"""add_scenic_structured_data_pois_and_shows

Revision ID: 1a7e3f9b2c8d
Revises: 9e5c9bf7d5c7
Create Date: 2026-06-19 15:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "1a7e3f9b2c8d"
down_revision: Union[str, None] = "9e5c9bf7d5c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # scenic_spots structured extensions
    op.add_column("scenic_spots", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("scenic_spots", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("scenic_spots", sa.Column("topic_tags", sa.JSON(), nullable=True))
    op.add_column("scenic_spots", sa.Column("ticket_info", sa.Text(), nullable=True))
    op.add_column("scenic_spots", sa.Column("open_time", sa.Text(), nullable=True))
    op.add_column("scenic_spots", sa.Column("must_see", sa.Text(), nullable=True))
    op.add_column("scenic_spots", sa.Column("best_time", sa.Text(), nullable=True))
    op.add_column("scenic_spots", sa.Column("narration", sa.Text(), nullable=True))
    op.create_index("ix_scenic_spots_latitude", "scenic_spots", ["latitude"], unique=False)
    op.create_index("ix_scenic_spots_longitude", "scenic_spots", ["longitude"], unique=False)

    # pois
    op.create_table(
        "pois",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(length=100), nullable=True),
        sa.Column("business_hours", sa.String(length=200), nullable=True),
        sa.Column("price_level", sa.String(length=50), nullable=True),
        sa.Column("intro", sa.Text(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=True, server_default="manual"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pois_name", "pois", ["name"], unique=False)
    op.create_index("ix_pois_category", "pois", ["category"], unique=False)
    op.create_index("ix_pois_latitude", "pois", ["latitude"], unique=False)
    op.create_index("ix_pois_longitude", "pois", ["longitude"], unique=False)

    # show_events
    op.create_table(
        "show_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("spot_id", sa.String(length=50), nullable=True),
        sa.Column("venue", sa.String(length=200), nullable=True),
        sa.Column("start_time", sa.String(length=50), nullable=True),
        sa.Column("duration", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_note", sa.Text(), nullable=True),
        sa.Column("schedule_text", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_show_events_name", "show_events", ["name"], unique=False)
    op.create_index("ix_show_events_spot_id", "show_events", ["spot_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_show_events_spot_id", table_name="show_events")
    op.drop_index("ix_show_events_name", table_name="show_events")
    op.drop_table("show_events")
    op.drop_index("ix_pois_longitude", table_name="pois")
    op.drop_index("ix_pois_latitude", table_name="pois")
    op.drop_index("ix_pois_category", table_name="pois")
    op.drop_index("ix_pois_name", table_name="pois")
    op.drop_table("pois")
    op.drop_index("ix_scenic_spots_longitude", table_name="scenic_spots")
    op.drop_index("ix_scenic_spots_latitude", table_name="scenic_spots")
    op.drop_column("scenic_spots", "narration")
    op.drop_column("scenic_spots", "best_time")
    op.drop_column("scenic_spots", "must_see")
    op.drop_column("scenic_spots", "open_time")
    op.drop_column("scenic_spots", "ticket_info")
    op.drop_column("scenic_spots", "topic_tags")
    op.drop_column("scenic_spots", "longitude")
    op.drop_column("scenic_spots", "latitude")
