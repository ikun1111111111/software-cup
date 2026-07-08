"""merge_topic_and_scenic_branches

Revision ID: 965e9d30cf52
Revises: 4f8a2b9c1d7e, 1a7e3f9b2c8d
Create Date: 2026-06-19 21:18:58.650899
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '965e9d30cf52'
down_revision: Union[str, None] = ('4f8a2b9c1d7e', '1a7e3f9b2c8d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
