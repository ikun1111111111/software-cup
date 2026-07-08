"""add_report_archives

Revision ID: f6d4a2c9e8b1
Revises: b8c2e6a1f4d9
Create Date: 2026-07-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6d4a2c9e8b1"
down_revision: Union[str, None] = "b8c2e6a1f4d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_archives",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("task_id", sa.String(length=120), nullable=True),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("stats_json", sa.JSON(), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),
        sa.Column("period_text", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("trigger_source", sa.String(length=20), nullable=False),
        sa.Column("schedule_date", sa.Date(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", name="uq_report_archives_task_id"),
        sa.UniqueConstraint(
            "report_type",
            "trigger_source",
            "schedule_date",
            name="uq_report_archives_scheduled_once",
        ),
    )
    op.create_index("ix_report_archives_task_id", "report_archives", ["task_id"], unique=True)
    op.create_index("ix_report_archives_report_type", "report_archives", ["report_type"], unique=False)
    op.create_index("ix_report_archives_status", "report_archives", ["status"], unique=False)
    op.create_index("ix_report_archives_trigger_source", "report_archives", ["trigger_source"], unique=False)
    op.create_index("ix_report_archives_schedule_date", "report_archives", ["schedule_date"], unique=False)
    op.create_index("ix_report_archives_generated_at", "report_archives", ["generated_at"], unique=False)
    op.create_index("ix_report_archives_created_at", "report_archives", ["created_at"], unique=False)
    op.create_index(
        "idx_report_archives_lookup",
        "report_archives",
        ["report_type", "status", "generated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_report_archives_lookup", table_name="report_archives")
    op.drop_index("ix_report_archives_created_at", table_name="report_archives")
    op.drop_index("ix_report_archives_generated_at", table_name="report_archives")
    op.drop_index("ix_report_archives_schedule_date", table_name="report_archives")
    op.drop_index("ix_report_archives_trigger_source", table_name="report_archives")
    op.drop_index("ix_report_archives_status", table_name="report_archives")
    op.drop_index("ix_report_archives_report_type", table_name="report_archives")
    op.drop_index("ix_report_archives_task_id", table_name="report_archives")
    op.drop_table("report_archives")
