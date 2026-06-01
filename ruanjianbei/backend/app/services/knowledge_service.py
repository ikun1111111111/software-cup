"""Knowledge document processing service."""
import os
import logging
from app.models.knowledge import KnowledgeDoc, KnowledgeChunk, DocStatus
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def chunk_text(text: str, chunk_size: int | None = None, overlap: int | None = None) -> list[str]:
    """Split text into overlapping chunks by paragraph + sentence boundary."""
    if chunk_size is None:
        chunk_size = settings.chunk_size
    if overlap is None:
        overlap = settings.chunk_overlap

    paragraphs = text.split("\n")
    chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current) + len(para) <= chunk_size:
            current += para + "\n"
        else:
            if current.strip():
                chunks.append(current.strip())
            # Handle overlong single paragraph by sentence splitting
            if len(para) > chunk_size:
                sentences = para.replace("。", "。\n").replace("！", "！\n").replace("？", "？\n").split("\n")
                for sent in sentences:
                    sent = sent.strip()
                    if not sent:
                        continue
                    if len(current) + len(sent) <= chunk_size:
                        current += sent
                    else:
                        if current.strip():
                            chunks.append(current.strip())
                        # Add overlap from previous
                        if overlap > 0 and chunks:
                            prev = chunks[-1]
                            current = prev[-overlap:] + sent
                        else:
                            current = sent
            else:
                current = para + "\n"

    if current.strip():
        chunks.append(current.strip())

    # Add overlap between chunks
    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev = chunks[i - 1]
            curr = chunks[i]
            overlapped.append(prev[-overlap:] + curr)
        return overlapped

    return chunks


def parse_document(file_path: str, file_type: str) -> str:
    """Parse document to plain text based on file type."""
    if file_type == "pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    elif file_type in ("docx", "doc"):
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    elif file_type == "md":
        return open(file_path, encoding="utf-8").read()
    elif file_type == "txt":
        return open(file_path, encoding="utf-8").read()
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


async def process_document(doc_id: int, db_session) -> list[KnowledgeChunk]:
    """Parse, chunk, and store a knowledge document."""
    from sqlalchemy import select

    stmt = select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id)
    result = await db_session.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise ValueError(f"Document {doc_id} not found")

    doc.status = DocStatus.indexing
    await db_session.commit()

    try:
        # Parse
        text = parse_document(doc.file_path, doc.file_type) if doc.file_path else doc.content

        # Chunk
        chunks_text = chunk_text(text)
        doc.chunk_count = len(chunks_text)

        # Store chunks
        db_chunks = []
        for i, chunk_text in enumerate(chunks_text):
            chunk = KnowledgeChunk(
                doc_id=doc_id,
                chunk_index=i,
                chunk_text=chunk_text,
                token_count=len(chunk_text),
            )
            db_session.add(chunk)
            db_chunks.append(chunk)

        doc.status = DocStatus.indexed
        await db_session.commit()
        logger.info("Document %d indexed: %d chunks", doc_id, len(chunks_text))
        return db_chunks

    except Exception as e:
        doc.status = DocStatus.failed
        await db_session.commit()
        logger.error("Document %d indexing failed: %s", doc_id, e)
        raise
