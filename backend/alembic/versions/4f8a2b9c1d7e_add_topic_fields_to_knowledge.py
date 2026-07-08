"""add_topic_fields_to_knowledge

Revision ID: 4f8a2b9c1d7e
Revises: dda5554fb7ff
Create Date: 2026-06-19 14:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "4f8a2b9c1d7e"
down_revision: Union[str, None] = "dda5554fb7ff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # knowledge_docs topic fields
    op.add_column("knowledge_docs", sa.Column("topic", sa.String(length=50), nullable=True))
    op.add_column("knowledge_docs", sa.Column("topic_tags", sa.Text(), nullable=True))
    op.create_index("ix_knowledge_docs_topic", "knowledge_docs", ["topic"], unique=False)

    # knowledge_chunks topic field
    op.add_column("knowledge_chunks", sa.Column("topic", sa.String(length=50), nullable=True))
    op.create_index("ix_knowledge_chunks_topic", "knowledge_chunks", ["topic"], unique=False)

    # faq category index for topic-aware lookup
    op.create_index("ix_faq_entries_category", "faq_entries", ["category"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_faq_entries_category", table_name="faq_entries")
    op.drop_index("ix_knowledge_chunks_topic", table_name="knowledge_chunks")
    op.drop_column("knowledge_chunks", "topic")
    op.drop_index("ix_knowledge_docs_topic", table_name="knowledge_docs")
    op.drop_column("knowledge_docs", "topic_tags")
    op.drop_column("knowledge_docs", "topic")
