"""Add user linkage fields to tourist profiles

Revision ID: 005
Revises: 004
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE tourist_profiles ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
    op.execute("ALTER TABLE tourist_profiles ADD COLUMN IF NOT EXISTS dna_type VARCHAR(50)")
    op.execute("ALTER TABLE tourist_profiles ADD COLUMN IF NOT EXISTS dna_scores JSON")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tourist_profiles_user_id ON tourist_profiles(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tourist_profiles_dna_type ON tourist_profiles(dna_type)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_tourist_profiles_dna_type")
    op.execute("DROP INDEX IF EXISTS ix_tourist_profiles_user_id")
    op.execute("ALTER TABLE tourist_profiles DROP COLUMN IF EXISTS dna_scores")
    op.execute("ALTER TABLE tourist_profiles DROP COLUMN IF EXISTS dna_type")
    op.execute("ALTER TABLE tourist_profiles DROP COLUMN IF EXISTS user_id")
