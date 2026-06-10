"""Add spot coordinates

Revision ID: 002
Revises: 001
Create Date: 2026-06-10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("scenic_spots", sa.Column("latitude", sa.Float(), nullable=True, comment="纬度 GCJ-02"))
    op.add_column("scenic_spots", sa.Column("longitude", sa.Float(), nullable=True, comment="经度 GCJ-02"))


def downgrade() -> None:
    op.drop_column("scenic_spots", "longitude")
    op.drop_column("scenic_spots", "latitude")
