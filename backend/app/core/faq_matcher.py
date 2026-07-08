"""FAQ exact and fuzzy matching against the faq_entries table."""
import logging

from sqlalchemy import select, or_, func, case

from app.models.knowledge import FaqEntry

logger = logging.getLogger(__name__)

# Minimum keyword overlap ratio for fuzzy match to be considered valid.
# e.g. 0.3 means at least 30% of FAQ keywords must match user question keywords.
_MIN_KEYWORD_OVERLAP_RATIO = 0.3
# Minimum absolute keyword matches for short FAQ entries.
_MIN_KEYWORD_MATCHES = 2
_BROAD_GUIDE_MARKERS = ("介绍", "讲讲", "讲解", "看点", "亮点")


def _normalize_question(question: str) -> str:
    """Keep FAQ matching focused on the tourist's actual question."""
    q = question.strip()
    marker = "游客问题："
    if marker in q:
        q = q.rsplit(marker, 1)[-1].strip()
    return q


async def search_faq(question: str, db_session, topic: str | None = None) -> dict | None:
    """Search FAQ by exact or fuzzy match, optionally biased by topic.

    Matching strategy:
        1. Exact/partial match on question text (topic-independent)
        2. Keyword match with overlap-ratio scoring
        3. If topic is provided, boost FAQs in the same category

    Returns:
        {"question": str, "answer": str, "source": "faq"|"faq_fuzzy", "faq_id": int}
        or None if no match.
    """
    if not question or not question.strip():
        return None

    q = _normalize_question(question)
    if not q:
        return None
    q_lower = q.lower()

    # Step 1: Bidirectional exact / partial match on question text
    stmt = select(FaqEntry).where(
        FaqEntry.is_active == True,
        or_(
            FaqEntry.question.ilike(f"%{q}%"),
            func.lower(q).like(func.lower(FaqEntry.question) + "%"),
        ),
    )
    if topic:
        # Prefer same-topic match; if none, still allow cross-topic exact match
        stmt = stmt.order_by(
            case((FaqEntry.category == topic, 1), else_=0).desc()
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
        token_matches = user_keywords & faq_keywords
        substring_matches = {
            kw for kw in faq_keywords
            if len(kw) > 1 and kw in q_lower
        }
        matched_keywords = token_matches | substring_matches
        union = user_keywords | faq_keywords
        if not union:
            continue

        overlap_ratio = len(matched_keywords) / len(union)
        # Also consider raw intersection count for short queries
        match_count = len(matched_keywords)
        has_specific_match = any(len(kw) >= 4 for kw in substring_matches)
        is_broad_guide_request = any(marker in q_lower for marker in _BROAD_GUIDE_MARKERS)

        # Must meet threshold
        meets_threshold = (
            overlap_ratio >= _MIN_KEYWORD_OVERLAP_RATIO
            or match_count >= _MIN_KEYWORD_MATCHES
            or (topic and faq.category == topic and has_specific_match)
        )
        if not meets_threshold or (is_broad_guide_request and match_count < _MIN_KEYWORD_MATCHES + 1):
            continue

        # Topic boost: same-category FAQ gets +0.15
        if topic and faq.category == topic:
            overlap_ratio += 0.15

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
