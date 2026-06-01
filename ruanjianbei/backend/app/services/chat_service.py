"""Core chat service: question -> FAQ check -> RAG retrieve -> LLM -> verify."""
import time
import logging
from app.core.rag import retrieve
from app.core.llm import chat_deepseek, chat_deepseek_sync, analyze_sentiment, verify_facts
from app.models.knowledge import FaqEntry

logger = logging.getLogger(__name__)


async def search_faq(question: str, db_session) -> dict | None:
    """Exact/partial FAQ match. Returns FAQ entry or None."""
    from sqlalchemy import select, or_
    import jieba

    # Exact match first
    stmt = select(FaqEntry).where(
        FaqEntry.is_active == True,
        FaqEntry.question.ilike(f"%{question}%"),
    )
    result = await db_session.execute(stmt)
    faq = result.scalar_one_or_none()
    if faq:
        faq.hit_count = (faq.hit_count or 0) + 1
        await db_session.commit()
        return {"question": faq.question, "answer": faq.answer, "source": "faq", "faq_id": faq.id}

    # Partial keyword match via jieba
    keywords = list(jieba.cut(question))
    conditions = [FaqEntry.keywords.ilike(f"%{kw}%") for kw in keywords if len(kw) > 1]
    if conditions:
        stmt = select(FaqEntry).where(FaqEntry.is_active == True, or_(*conditions))
        result = await db_session.execute(stmt)
        faqs = result.scalars().all()
        if faqs:
            best = faqs[0]  # Could add better scoring
            best.hit_count = (best.hit_count or 0) + 1
            await db_session.commit()
            return {"question": best.question, "answer": best.answer, "source": "faq_fuzzy", "faq_id": best.id}

    return None


def build_prompt(question: str, context_chunks: list[dict]) -> tuple[str, list[dict]]:
    """Build LLM prompt with retrieved context."""
    context_text = "\n\n---\n\n".join(
        f"[资料片段 {i+1}]\n{c['text']}" for i, c in enumerate(context_chunks)
    )
    system = (
        "你是一个智慧旅游景区的数字人导览员。你的名字是「小景」。\n"
        "请遵守以下规则：\n"
        "1. 基于提供的资料回答问题，不要编造信息\n"
        "2. 如果资料中没有相关信息，请诚实地说「这个问题我暂时还不太清楚，"
        "您可以咨询景区工作人员」\n"
        "3. 回答要亲切自然，像真人导游一样，不要使用列表或过于结构化的格式\n"
        "4. 适当使用「您」「欢迎」「谢谢」等礼貌用语\n"
        "5. 回答控制在200字以内，简洁明了"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"参考资料:\n{context_text}\n\n游客问: {question}\n请回答:"},
    ]
    return messages


async def process_chat(
    question: str,
    session_id: str,
    db_session,
    stream: bool = True,
) -> dict:
    """Full chat pipeline."""
    start_time = time.time()
    result = {
        "question": question,
        "answer": "",
        "source": "rag",
        "chunks": [],
        "is_faq": False,
        "sentiment_score": 0.5,
        "sentiment_label": "neutral",
        "latency_ms": 0,
    }

    # Step 1: FAQ exact match (fast path)
    faq_result = await search_faq(question, db_session)
    if faq_result:
        result["answer"] = faq_result["answer"]
        result["source"] = "faq"
        result["is_faq"] = True
        result["latency_ms"] = int((time.time() - start_time) * 1000)
        return result

    # Step 2: RAG retrieval
    chunks = await retrieve(question)
    result["chunks"] = [{"text": c["text"], "score": c.get("rerank_score", c["score"])} for c in chunks]

    # Step 3: LLM generation
    messages = build_prompt(question, chunks)
    if stream:
        result["_stream"] = chat_deepseek(messages, stream=True)
        result["answer"] = ""  # Will be filled by streaming consumer
    else:
        answer = await chat_deepseek_sync(messages)
        result["answer"] = answer

    # Step 4: Sentiment analysis (async, non-blocking)
    try:
        score, label = await analyze_sentiment(question)
        result["sentiment_score"] = score
        result["sentiment_label"] = label
    except Exception as e:
        logger.warning("Sentiment analysis failed: %s", e)

    result["latency_ms"] = int((time.time() - start_time) * 1000)
    return result
