"""Core chat service: question -> FAQ check -> RAG retrieve -> LLM -> verify."""
import time
import logging
from app.core.rag import retrieve
from app.core.llm_router import LLMTask, route, route_stream
from app.core.faq_matcher import search_faq
from app.core.llm import analyze_sentiment

logger = logging.getLogger(__name__)


def build_prompt(question: str, context_chunks: list[dict]) -> list[dict]:
    """Build LLM prompt with retrieved context."""
    from app.core.prompts import build_chat_prompt
    return build_chat_prompt(question, context_chunks)


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
        result["_stream"] = route_stream(LLMTask.chat, messages)
        result["answer"] = ""  # Will be filled by streaming consumer
    else:
        answer = await route(LLMTask.chat, messages=messages)
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
