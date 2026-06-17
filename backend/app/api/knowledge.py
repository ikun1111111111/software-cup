"""Knowledge base management API — documents and FAQ CRUD."""
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.vector_store import get_vector_store
from app.core.bm25_search import get_bm25_index
from app.models.knowledge import KnowledgeDoc, KnowledgeChunk, FaqEntry, DocStatus
from app.services.knowledge_service import process_document, chunk_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


# ============== Pydantic Schemas ==============

class KnowledgeDocCreate(BaseModel):
    title: str
    content: str = ""
    file_type: str = "txt"
    file_path: str | None = None


class KnowledgeDocUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    is_active: bool | None = None


class KnowledgeDocOut(BaseModel):
    id: int
    title: str
    file_type: str
    status: str
    chunk_count: int
    is_active: bool
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True


class KnowledgeDocDetail(KnowledgeDocOut):
    chunks: list[dict] = []


class FaqCreate(BaseModel):
    question: str
    answer: str
    keywords: str | None = None
    category: str = "general"
    priority: int = 0


class FaqUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    keywords: str | None = None
    category: str | None = None
    priority: int | None = None
    is_active: bool | None = None


class FaqOut(BaseModel):
    id: int
    question: str
    answer: str
    keywords: str | None
    category: str
    priority: int
    hit_count: int
    is_active: bool
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[Any]


# ============== Document Endpoints ==============

@router.get("/docs", response_model=PaginatedResponse)
async def list_documents(
    status: str | None = Query(None, description="Filter by status: pending|indexing|indexed|failed"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List knowledge documents with pagination and status filter."""
    # Build query
    stmt = select(KnowledgeDoc).where(KnowledgeDoc.is_active == True)
    if status:
        try:
            status_enum = DocStatus(status)
            stmt = stmt.where(KnowledgeDoc.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Paginate
    stmt = stmt.order_by(KnowledgeDoc.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    docs = result.scalars().all()

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[KnowledgeDocOut.model_validate(d).model_dump() for d in docs],
    )


@router.post("/docs", response_model=KnowledgeDocOut)
async def create_document(
    data: KnowledgeDocCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new knowledge document and trigger indexing."""
    doc = KnowledgeDoc(
        title=data.title,
        content=data.content,
        file_type=data.file_type,
        file_path=data.file_path,
        status=DocStatus.pending,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Trigger async indexing
    try:
        await process_document(doc.id, db)
    except Exception as e:
        logger.warning("Document %d initial indexing failed: %s", doc.id, e)
        # Don't fail the creation, doc status will be "failed"

    await db.refresh(doc)
    return KnowledgeDocOut.model_validate(doc)


@router.get("/docs/{doc_id}", response_model=KnowledgeDocDetail)
async def get_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get document details including chunks."""
    stmt = select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Load chunks
    chunk_stmt = select(KnowledgeChunk).where(KnowledgeChunk.doc_id == doc_id)
    chunk_result = await db.execute(chunk_stmt)
    chunks = chunk_result.scalars().all()

    detail = KnowledgeDocDetail.model_validate(doc)
    detail.chunks = [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "chunk_text": c.chunk_text,
            "token_count": c.token_count,
        }
        for c in chunks
    ]
    return detail


@router.put("/docs/{doc_id}", response_model=KnowledgeDocOut)
async def update_document(
    doc_id: int,
    data: KnowledgeDocUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update document and trigger reindexing if content changed."""
    stmt = select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    content_changed = False
    if data.title is not None:
        doc.title = data.title
    if data.content is not None:
        doc.content = data.content
        content_changed = True
    if data.is_active is not None:
        doc.is_active = data.is_active

    await db.commit()
    await db.refresh(doc)

    # Reindex if content changed
    if content_changed:
        try:
            # Delete old vectors
            store = get_vector_store()
            store.delete_by_doc_id(doc_id)

            # Delete old chunks
            await db.execute(
                select(KnowledgeChunk).where(KnowledgeChunk.doc_id == doc_id)
            )
            # Note: chunk deletion is handled by cascade or manual cleanup
            # For simplicity, we re-process which will create new chunks
            await process_document(doc_id, db)
        except Exception as e:
            logger.warning("Reindex after update failed for doc %d: %s", doc_id, e)

    return KnowledgeDocOut.model_validate(doc)


@router.delete("/docs/{doc_id}")
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete document and all associated data (chunks, vectors, BM25 index)."""
    stmt = select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Delete Milvus vectors
    try:
        store = get_vector_store()
        store.delete_by_doc_id(doc_id)
    except Exception as e:
        logger.warning("Failed to delete Milvus vectors for doc %d: %s", doc_id, e)

    # 2. Delete chunks from PostgreSQL
    await db.execute(
        select(KnowledgeChunk).where(KnowledgeChunk.doc_id == doc_id)
    )
    # Actually delete
    from sqlalchemy import delete
    await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.doc_id == doc_id))

    # 3. Delete document
    await db.delete(doc)
    await db.commit()

    # 4. Rebuild BM25 index (or just clear and let next startup rebuild)
    # For incremental: we could remove specific doc entries, but rebuild is simpler
    try:
        bm25 = get_bm25_index()
        bm25.clear()
        # Trigger background rebuild? For now, clear and next search will be vector-only until restart
        # Better: rebuild from DB
        from app.core.bm25_search import rebuild_bm25_index_from_db
        await rebuild_bm25_index_from_db()
    except Exception as e:
        logger.warning("BM25 rebuild after delete failed: %s", e)

    return {"status": "deleted", "doc_id": doc_id}


@router.post("/docs/{doc_id}/reindex")
async def reindex_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Reindex a document: delete old vectors/chunks, re-process."""
    stmt = select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Delete old vectors
    try:
        store = get_vector_store()
        store.delete_by_doc_id(doc_id)
    except Exception as e:
        logger.warning("Failed to delete old vectors for doc %d: %s", doc_id, e)

    # 2. Delete old chunks
    from sqlalchemy import delete
    await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.doc_id == doc_id))
    await db.commit()

    # 3. Reset status and re-process
    doc.status = DocStatus.pending
    doc.chunk_count = 0
    await db.commit()

    try:
        await process_document(doc_id, db)
    except Exception as e:
        logger.error("Reindex failed for doc %d: %s", doc_id, e)
        raise HTTPException(status_code=500, detail="Reindex failed")

    await db.refresh(doc)
    return {
        "status": "reindexed",
        "doc_id": doc_id,
        "new_status": doc.status.value,
        "chunk_count": doc.chunk_count,
    }


# ============== FAQ Endpoints ==============

@router.get("/faq", response_model=PaginatedResponse)
async def list_faq(
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List FAQ entries with pagination and category filter."""
    stmt = select(FaqEntry).where(FaqEntry.is_active == True)
    if category:
        stmt = stmt.where(FaqEntry.category == category)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(FaqEntry.priority.desc(), FaqEntry.hit_count.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    faqs = result.scalars().all()

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[FaqOut.model_validate(f).model_dump() for f in faqs],
    )


@router.post("/faq", response_model=FaqOut)
async def create_faq(
    data: FaqCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new FAQ entry."""
    faq = FaqEntry(**data.model_dump())
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    return FaqOut.model_validate(faq)


@router.put("/faq/{faq_id}", response_model=FaqOut)
async def update_faq(
    faq_id: int,
    data: FaqUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an FAQ entry."""
    stmt = select(FaqEntry).where(FaqEntry.id == faq_id)
    result = await db.execute(stmt)
    faq = result.scalar_one_or_none()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faq, field, value)

    await db.commit()
    await db.refresh(faq)
    return FaqOut.model_validate(faq)


@router.delete("/faq/{faq_id}")
async def delete_faq(
    faq_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete an FAQ entry (set is_active=False)."""
    stmt = select(FaqEntry).where(FaqEntry.id == faq_id)
    result = await db.execute(stmt)
    faq = result.scalar_one_or_none()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    faq.is_active = False
    await db.commit()
    return {"status": "deleted", "faq_id": faq_id}
