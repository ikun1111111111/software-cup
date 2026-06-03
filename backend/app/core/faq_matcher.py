"""FAQ exact and fuzzy matching against the faq_entries table."""
import logging

from sqlalchemy import select, or_

from app.models.knowledge import FaqEntry

logger = logging.getLogger(__name__)


async def search_faq(question: str, db_session) -> dict | None:
    """Search FAQ by exact or fuzzy match.

    Matching strategy:
        1. Exact/partial match: question ILIKE '%question%'
        2. Keyword match: jieba-cut keywords matched against FaqEntry.keywords

    Returns:
        {"question": str, "answer": str, "source": "faq"|"faq_fuzzy", "faq_id": int}
        or None if no match.
    """
    if not question or not question.strip():
        return None

    # Step 1: Exact / partial match on question text
    stmt = select(FaqEntry).where(
        FaqEntry.is_active == True,
        FaqEntry.question.ilike(f"%{question}%"),
    )
    result = await db_session.execute(stmt)
    faq = result.scalar_one_or_none()
    if faq:
        faq.hit_count = (faq.hit_count or 0) + 1
        await db_session.commit()
        return {
            "question": faq.question,
            "answer": faq.answer,
            "source": "faq",
            "faq_id": faq.id,
        }

    # Step 2: Keyword match via jieba
    import jieba

    keywords = list(jieba.cut(question))
    # Filter out single-char tokens (too noisy)
    conditions = [FaqEntry.keywords.ilike(f"%{kw}%") for kw in keywords if len(kw) > 1]

    if conditions:
        stmt = select(FaqEntry).where(
            FaqEntry.is_active == True,
            or_(*conditions),
        )
        result = await db_session.execute(stmt)
        faqs = result.scalars().all()
        if faqs:
            # TODO: could implement better scoring (keyword overlap ratio)
            best = faqs[0]
            best.hit_count = (best.hit_count or 0) + 1
            await db_session.commit()
            return {
                "question": best.question,
                "answer": best.answer,
                "source": "faq_fuzzy",
                "faq_id": best.id,
            }

    return None


async def get_faq_by_id(faq_id: int, db_session) -> FaqEntry | None:
    """Get a single FAQ entry by ID."""
    stmt = select(FaqEntry).where(FaqEntry.id == faq_id)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()
