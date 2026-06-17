"""FAQ exact and fuzzy matching against the faq_entries table."""
import logging

from sqlalchemy import select, or_, func

from app.models.knowledge import FaqEntry

logger = logging.getLogger(__name__)

# Minimum keyword overlap ratio for fuzzy match to be considered valid.
# e.g. 0.3 means at least 30% of FAQ keywords must match user question keywords.
_MIN_KEYWORD_OVERLAP_RATIO = 0.3
# Minimum absolute keyword matches for short FAQ entries.
_MIN_KEYWORD_MATCHES = 1


async def search_faq(question: str, db_session) -> dict | None:
    """Search FAQ by exact or fuzzy match.

    Matching strategy:
        1. Exact/partial match: user question contains FAQ question
           OR FAQ question contains user question (bidirectional)
        2. Keyword match: jieba-cut keywords matched against FaqEntry.keywords
           with overlap-ratio scoring and threshold filtering.

    Returns:
        {"question": str, "answer": str, "source": "faq"|"faq_fuzzy", "faq_id": int}
        or None if no match.
    """
    if not question or not question.strip():
        return None

    q = question.strip()

    # Step 1: Bidirectional exact / partial match on question text
    # User question contains FAQ question, OR FAQ question contains user question
    stmt = select(FaqEntry).where(
        FaqEntry.is_active == True,
        or_(
            FaqEntry.question.ilike(f"%{q}%"),
            func.lower(q).like(func.lower(FaqEntry.question) + "%"),
        ),
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

    # Step 2: Keyword match via jieba with overlap-ratio scoring
    import jieba

    user_keywords = set(
        kw.strip().lower()
        for kw in jieba.cut(q)
        if len(kw.strip()) > 1
    )
    if not user_keywords:
        return None

    # Fetch all active FAQs and score them
    stmt = select(FaqEntry).where(FaqEntry.is_active == True)
    result = await db_session.execute(stmt)
    all_faqs = result.scalars().all()

    best_faq = None
    best_score = 0.0

    for faq in all_faqs:
        if not faq.keywords:
            continue
        faq_keywords = set(
            kw.strip().lower()
            for kw in faq.keywords.split(",")
            if kw.strip()
        )
        if not faq_keywords:
            continue

        # Compute overlap: intersection / union
        intersection = user_keywords & faq_keywords
        union = user_keywords | faq_keywords
        if not union:
            continue

        overlap_ratio = len(intersection) / len(union)
        # Also consider raw intersection count for short queries
        match_count = len(intersection)

        # Must meet threshold
        meets_threshold = (
            overlap_ratio >= _MIN_KEYWORD_OVERLAP_RATIO
            or match_count >= _MIN_KEYWORD_MATCHES
        )
        if not meets_threshold:
            continue

        # Pick the one with highest overlap ratio; tie-break by match count
        if overlap_ratio > best_score or (
            overlap_ratio == best_score and match_count > (best_faq[1] if best_faq else 0)
        ):
            best_faq = (faq, match_count)
            best_score = overlap_ratio

    if best_faq:
        faq, _ = best_faq
        faq.hit_count = (faq.hit_count or 0) + 1
        await db_session.commit()
        return {
            "question": faq.question,
            "answer": faq.answer,
            "source": "faq_fuzzy",
            "faq_id": faq.id,
        }

    return None


async def get_faq_by_id(faq_id: int, db_session) -> FaqEntry | None:
    """Get a single FAQ entry by ID."""
    stmt = select(FaqEntry).where(FaqEntry.id == faq_id)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()
