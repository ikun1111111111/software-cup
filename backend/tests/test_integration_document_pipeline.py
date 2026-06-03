"""Integration tests: full document processing pipeline.

Covers: KnowledgeDoc → parse → chunk → PG persist → Milvus vectorize → BM25 update.
All external dependencies (Milvus, BM25) are mocked, internal service/core chain runs real.
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.knowledge_service import process_document, chunk_text, parse_document
from app.models.knowledge import KnowledgeDoc, KnowledgeChunk, DocStatus


class FakeKnowledgeDoc:
    """Fake ORM object mimicking KnowledgeDoc behavior."""
    def __init__(self, doc_id=1, title="测试文档", content="灵山胜境位于无锡。", file_type="txt", file_path=None):
        self.id = doc_id
        self.title = title
        self.content = content
        self.file_type = file_type
        self.file_path = file_path
        self.status = DocStatus.pending
        self.chunk_count = 0
        self.version = 1
        self.is_active = True
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()


# ── Unit-like helpers (already covered, quick sanity) ────────────────────────


def test_chunk_text_paragraph_split():
    text = "第一段关于灵山。\n第二段关于梵宫。\n第三段关于九龙灌浴。"
    chunks = chunk_text(text, chunk_size=50, overlap=0)
    assert len(chunks) >= 1
    assert any("灵山" in c for c in chunks)


def test_parse_document_txt(tmp_path):
    f = tmp_path / "test.txt"
    f.write_text("灵山胜境", encoding="utf-8")
    result = parse_document(str(f), "txt")
    assert "灵山胜境" in result


# ── Integration: process_document full chain ─────────────────────────────────


@pytest.mark.asyncio
async def test_process_document_full_chain(tmp_path):
    """Integration: doc parse → chunk → PG → Milvus → BM25."""
    # 1. Setup fake doc on filesystem
    txt_file = tmp_path / "integration_doc.txt"
    txt_file.write_text(
        "灵山大佛高88米。\n梵宫是灵山胜境的标志性建筑。\n九龙灌浴每天有四场表演。\n"
        "五印坛城展现藏传佛教文化。\n曼飞龙塔具有南传佛教风格。\n",
        encoding="utf-8",
    )

    fake_doc = FakeKnowledgeDoc(
        doc_id=42,
        title="集成测试文档",
        content="",
        file_type="txt",
        file_path=str(txt_file),
    )

    # 2. Mock DB session
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = fake_doc
    mock_db.execute.return_value = mock_result

    # Track added objects
    added_objects = []
    def _track_add(obj):
        added_objects.append(obj)
        # Simulate auto-increment ID assignment
        if isinstance(obj, KnowledgeChunk) and obj.id is None:
            obj.id = len(added_objects) * 10  # fake id
    mock_db.add = _track_add

    # 3. Mock Milvus vector store
    fake_embedding_ids = ["emb_0", "emb_1", "emb_2"]
    mock_store = MagicMock()
    mock_store.ensure_collection = MagicMock()
    mock_store.insert_chunks.return_value = fake_embedding_ids

    # 4. Mock BM25 index
    mock_bm25 = MagicMock()
    mock_bm25.add_document = MagicMock()

    with patch("app.core.vector_store.get_vector_store", return_value=mock_store):
        with patch("app.core.bm25_search.get_bm25_index", return_value=mock_bm25):
            chunks = await process_document(42, mock_db)

    # Assertions on PG data
    assert fake_doc.status == DocStatus.indexed
    assert fake_doc.chunk_count > 0
    mock_db.commit.assert_called()

    # Assertions on chunks added to DB
    db_chunks = [o for o in added_objects if isinstance(o, KnowledgeChunk)]
    assert len(db_chunks) == fake_doc.chunk_count
    for i, ck in enumerate(db_chunks):
        assert ck.doc_id == 42
        assert ck.chunk_index == i
        assert ck.chunk_text  # non-empty

    # Assertions on Milvus
    mock_store.ensure_collection.assert_called_once()
    mock_store.insert_chunks.assert_called_once()
    call_args = mock_store.insert_chunks.call_args
    assert call_args[0][0] == 42  # doc_id
    inserted_chunk_dicts = call_args[0][1]
    assert len(inserted_chunk_dicts) == len(db_chunks)

    # Assertions on BM25
    mock_bm25.add_document.assert_called_once()
    bm25_call_args = mock_bm25.add_document.call_args[0]
    assert bm25_call_args[0] == 42
    assert len(bm25_call_args[1]) == len(db_chunks)

    # Embedding IDs should be written back to chunks
    for ck, eid in zip(db_chunks, fake_embedding_ids):
        assert ck.embedding_id == eid

    # Return value
    assert chunks == db_chunks


@pytest.mark.asyncio
async def test_process_document_without_file_path():
    """Integration: doc uses inline content, no filesystem file."""
    fake_doc = FakeKnowledgeDoc(
        doc_id=99,
        title="纯内容文档",
        content="灵山胜境门票210元。",
        file_type="txt",
        file_path=None,
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = fake_doc
    mock_db.execute.return_value = mock_result

    added_objects = []
    def _track_add(obj):
        added_objects.append(obj)
        if isinstance(obj, KnowledgeChunk) and obj.id is None:
            obj.id = len(added_objects) * 10
    mock_db.add = _track_add

    mock_store = MagicMock()
    mock_store.ensure_collection = MagicMock()
    mock_store.insert_chunks.return_value = ["emb_0"]

    mock_bm25 = MagicMock()
    mock_bm25.add_document = MagicMock()

    with patch("app.core.vector_store.get_vector_store", return_value=mock_store):
        with patch("app.core.bm25_search.get_bm25_index", return_value=mock_bm25):
            chunks = await process_document(99, mock_db)

    assert len(chunks) >= 1
    assert any("门票" in c.chunk_text for c in chunks)
    mock_store.insert_chunks.assert_called_once()


@pytest.mark.asyncio
async def test_process_document_milvus_failure_still_commits_pg():
    """Integration: Milvus failure should not rollback PG data."""
    fake_doc = FakeKnowledgeDoc(
        doc_id=7,
        title="失败测试",
        content="测试内容。",
        file_type="txt",
        file_path=None,
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = fake_doc
    mock_db.execute.return_value = mock_result

    added_objects = []
    def _track_add(obj):
        added_objects.append(obj)
        if isinstance(obj, KnowledgeChunk) and obj.id is None:
            obj.id = len(added_objects) * 10
    mock_db.add = _track_add

    mock_store = MagicMock()
    mock_store.ensure_collection.side_effect = RuntimeError("Milvus down")

    with patch("app.core.vector_store.get_vector_store", return_value=mock_store):
        chunks = await process_document(7, mock_db)

    # PG data should still be committed
    assert fake_doc.status == DocStatus.indexed
    assert fake_doc.chunk_count > 0
    mock_db.commit.assert_called()
    # But no embedding_ids assigned because Milvus failed
    db_chunks = [o for o in added_objects if isinstance(o, KnowledgeChunk)]
    for ck in db_chunks:
        assert ck.embedding_id is None


@pytest.mark.asyncio
async def test_process_document_parse_failure():
    """Integration: parse failure marks doc as failed."""
    fake_doc = FakeKnowledgeDoc(
        doc_id=8,
        title="坏文件",
        content="",
        file_type="pdf",
        file_path="/nonexistent/bad.pdf",
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = fake_doc
    mock_db.execute.return_value = mock_result

    with pytest.raises(Exception):
        await process_document(8, mock_db)

    assert fake_doc.status == DocStatus.failed
    mock_db.commit.assert_called()
