"""Tests for database connection and models."""
import pytest
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, async_session, Base, get_db, init_db
from app.models import (
    KnowledgeDoc, KnowledgeChunk, FaqEntry,
    InteractionLog, AvatarConfig, TouristProfile,
)


@pytest.mark.asyncio
class TestDatabaseConnection:
    """Test database connectivity and basic operations."""

    async def test_engine_created(self):
        """Engine should be created successfully."""
        assert engine is not None
        assert engine.url is not None

    async def test_session_factory(self):
        """Session factory should produce valid sessions."""
        async with async_session() as session:
            assert isinstance(session, AsyncSession)

    async def test_get_db_dependency(self):
        """get_db dependency should yield a session."""
        gen = get_db()
        session = await gen.__anext__()
        try:
            assert isinstance(session, AsyncSession)
        finally:
            await gen.aclose()


@pytest.mark.asyncio
class TestDatabaseTables:
    """Test table creation and schema."""

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    async def test_init_db_creates_tables(self):
        """init_db() should create all tables."""
        await init_db()

        async with engine.connect() as conn:
            tables = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_table_names()
            )
            assert "knowledge_docs" in tables
            assert "knowledge_chunks" in tables
            assert "faq_entries" in tables
            assert "interaction_logs" in tables
            assert "avatar_config" in tables
            assert "tourist_profiles" in tables

    async def test_model_table_names(self):
        """Models should have correct table names."""
        assert KnowledgeDoc.__tablename__ == "knowledge_docs"
        assert KnowledgeChunk.__tablename__ == "knowledge_chunks"
        assert FaqEntry.__tablename__ == "faq_entries"
        assert InteractionLog.__tablename__ == "interaction_logs"
        assert AvatarConfig.__tablename__ == "avatar_config"
        assert TouristProfile.__tablename__ == "tourist_profiles"

    async def test_base_metadata_has_all_tables(self):
        """Base.metadata should contain all declared tables."""
        table_names = Base.metadata.tables.keys()
        assert "knowledge_docs" in table_names
        assert "knowledge_chunks" in table_names
        assert "faq_entries" in table_names
        assert "interaction_logs" in table_names
        assert "avatar_config" in table_names
        assert "tourist_profiles" in table_names


@pytest.mark.asyncio
class TestDatabaseOperations:
    """Test basic CRUD operations on models."""

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    async def test_knowledge_doc_crud(self):
        """Should create, read, update, delete a knowledge document."""
        async with async_session() as db:
            # Create
            doc = KnowledgeDoc(
                title="测试文档",
                content="这是测试内容。",
                file_type="txt",
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)

            assert doc.id is not None
            assert doc.title == "测试文档"
            assert doc.status.value == "pending"

            # Read
            from sqlalchemy import select
            stmt = select(KnowledgeDoc).where(KnowledgeDoc.id == doc.id)
            result = await db.execute(stmt)
            found = result.scalar_one_or_none()
            assert found is not None
            assert found.title == "测试文档"

            # Update
            found.title = "更新后的文档"
            await db.commit()
            await db.refresh(found)
            assert found.title == "更新后的文档"

            # Delete
            await db.delete(found)
            await db.commit()

            result = await db.execute(stmt)
            assert result.scalar_one_or_none() is None

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    async def test_faq_entry_crud(self):
        """Should create, read FAQ entries."""
        async with async_session() as db:
            faq = FaqEntry(
                question="测试问题？",
                answer="测试答案。",
                keywords="测试",
                category="test",
            )
            db.add(faq)
            await db.commit()
            await db.refresh(faq)

            assert faq.id is not None
            assert faq.hit_count == 0
            assert faq.is_active is True
