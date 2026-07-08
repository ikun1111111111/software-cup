"""Add memory media and capsule fields

Revision ID: 004
Revises: 003
Create Date: 2026-06-23
"""
from typing import Sequence, Union

from alembic import op


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE travel_memories ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)")
    op.execute("ALTER TABLE travel_memories ADD COLUMN IF NOT EXISTS voice_url VARCHAR(500)")
    op.execute("ALTER TABLE travel_memories ADD COLUMN IF NOT EXISTS voice_duration INTEGER")
    op.execute("ALTER TABLE travel_memories ADD COLUMN IF NOT EXISTS is_capsule BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE travel_memories ADD COLUMN IF NOT EXISTS capsule_unlock_at TIMESTAMP WITHOUT TIME ZONE")
    op.execute("ALTER TABLE travel_memories ADD COLUMN IF NOT EXISTS capsule_content TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE travel_memories DROP COLUMN IF EXISTS capsule_content")
    op.execute("ALTER TABLE travel_memories DROP COLUMN IF EXISTS capsule_unlock_at")
    op.execute("ALTER TABLE travel_memories DROP COLUMN IF EXISTS is_capsule")
    op.execute("ALTER TABLE travel_memories DROP COLUMN IF EXISTS voice_duration")
    op.execute("ALTER TABLE travel_memories DROP COLUMN IF EXISTS voice_url")
    op.execute("ALTER TABLE travel_memories DROP COLUMN IF EXISTS photo_url")
