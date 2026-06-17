"""Celery tasks for async document indexing."""
import asyncio
import logging
from app.tasks.celery_app import celery_app
from app.core.database import async_session
from app.services.knowledge_service import process_document

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def index_document(self, doc_id: int):
    """Async task: parse, chunk, and index a knowledge document."""
    async def _run():
        async with async_session() as db:
            try:
                await process_document(doc_id, db)
                logger.info("Async indexing complete for doc %d", doc_id)
                return {"status": "ok", "doc_id": doc_id}
            except Exception as e:
                logger.error("Async indexing failed for doc %d: %s", doc_id, e)
                raise

    try:
        return asyncio.get_event_loop().run_until_complete(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True)
def reindex_all_documents(self):
    """Async task: reindex all active knowledge documents."""
    async def _run():
        from sqlalchemy import select
        from app.models.knowledge import KnowledgeDoc, DocStatus

        async with async_session() as db:
            stmt = select(KnowledgeDoc).where(
                KnowledgeDoc.is_active == True,
                KnowledgeDoc.status == DocStatus.indexed,
            )
            result = await db.execute(stmt)
            docs = result.scalars().all()

            for doc in docs:
                doc.status = DocStatus.pending
            await db.commit()

            for doc in docs:
                index_document.delay(doc.id)

            return {"status": "queued", "count": len(docs)}

    return asyncio.get_event_loop().run_until_complete(_run())
