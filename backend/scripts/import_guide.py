"""Import tourism guide docx into knowledge_docs + knowledge_chunks."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import async_session
from app.models.knowledge import KnowledgeDoc, KnowledgeChunk, DocStatus
from app.services.knowledge_service import parse_document, chunk_text

DOC_PATH = Path(__file__).parent.parent.parent / "docs" / "灵山胜境：历史、文化、景点特色与个性化游览指南.docx"


async def import_guide():
    if not DOC_PATH.exists():
        print(f"File not found: {DOC_PATH}")
        return

    text = parse_document(str(DOC_PATH), "docx")
    print(f"Parsed {len(text)} chars from guide docx")

    async with async_session() as session:
        title = DOC_PATH.stem
        stmt = select(KnowledgeDoc).where(KnowledgeDoc.title == title)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Guide doc already exists as id={existing.id}. Deleting old chunks and re-indexing.")
            # Delete old chunks
            await session.execute(
                select(KnowledgeChunk).where(KnowledgeChunk.doc_id == existing.id)
            )
            from sqlalchemy import delete
            await session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.doc_id == existing.id))
            doc = existing
            doc.content = text
            doc.status = DocStatus.pending
            doc.chunk_count = 0
        else:
            doc = KnowledgeDoc(
                title=title,
                content=text,
                file_type="docx",
                file_path=str(DOC_PATH),
                status=DocStatus.pending,
                chunk_count=0,
            )
            session.add(doc)

        await session.commit()
        await session.refresh(doc)

        # Chunk and insert
        chunks = chunk_text(text)
        for i, chunk_text_str in enumerate(chunks):
            chunk = KnowledgeChunk(
                doc_id=doc.id,
                chunk_index=i,
                chunk_text=chunk_text_str,
                token_count=len(chunk_text_str),
            )
            session.add(chunk)

        doc.chunk_count = len(chunks)
        doc.status = DocStatus.indexed
        await session.commit()
        print(f"Imported guide doc id={doc.id} with {len(chunks)} chunks")


if __name__ == "__main__":
    asyncio.run(import_guide())
