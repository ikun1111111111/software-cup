"""SSE streaming chat API."""
import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.llm_router import LLMTask, route, route_stream
from app.core.rag import retrieve
from app.core.faq_matcher import search_faq
from app.core.prompts import build_chat_prompt
from app.models.interaction import InteractionLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    question: str
    stream: bool = True


def _cache_key(session_id: str, question: str) -> str:
    """Generate Redis cache key for chat Q&A."""
    from hashlib import md5
    q_hash = md5(question.encode("utf-8")).hexdigest()[:16]
    return f"chat:{session_id}:{q_hash}"


async def _check_cache(session_id: str, question: str) -> dict | None:
    """Check Redis for cached answer."""
    try:
        redis = await get_redis()
        key = _cache_key(session_id, question)
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.debug("Cache check failed: %s", e)
    return None


async def _set_cache(session_id: str, question: str, answer: dict, ttl: int = 300):
    """Cache answer in Redis with TTL (default 5 min)."""
    try:
        redis = await get_redis()
        key = _cache_key(session_id, question)
        await redis.set(key, json.dumps(answer, ensure_ascii=False), ex=ttl)
    except Exception as e:
        logger.debug("Cache set failed: %s", e)


async def _log_interaction(
    db: AsyncSession,
    session_id: str,
    question: str,
    answer: str,
    source: str,
    chunks: list[dict],
    sentiment_score: float,
    sentiment_label: str,
    latency_ms: int,
    is_faq: bool = False,
):
    """Persist interaction log to PostgreSQL (fire-and-forget)."""
    try:
        log = InteractionLog(
            session_id=session_id,
            user_input=question,
            input_type="text",
            retrieved_chunks=json.dumps(chunks, ensure_ascii=False) if chunks else None,
            llm_response=answer,
            llm_model="deepseek-chat",  # TODO: track actual model from router
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label,
            latency_ms=latency_ms,
            is_faq_hit=is_faq,
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        logger.warning("Failed to write interaction log: %s", e)
        await db.rollback()


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Streaming chat endpoint via Server-Sent Events.

    Returns SSE events:
        - event: faq_hit   (if FAQ exact match)
        - event: token     (LLM streaming tokens)
        - event: done      (final metadata)
        - event: error     (on failure)
    """
    start_time = time.time()
    session_id = request.session_id
    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. Check cache
    cached = await _check_cache(session_id, question)
    if cached:
        logger.info("Cache hit for session %s", session_id)
        cached["cached"] = True
        cached["latency_ms"] = int((time.time() - start_time) * 1000)

        async def cached_generator():
            yield f"event: done\ndata: {json.dumps(cached, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
        )

    # 2. FAQ check
    faq_result = await search_faq(question, db)
    if faq_result:
        latency_ms = int((time.time() - start_time) * 1000)
        answer = faq_result["answer"]
        result = {
            "answer": answer,
            "source": "faq",
            "faq_id": faq_result.get("faq_id"),
            "latency_ms": latency_ms,
        }
        await _set_cache(session_id, question, result)
        await _log_interaction(
            db, session_id, question, answer, "faq", [],
            0.5, "neutral", latency_ms, is_faq=True,
        )

        async def faq_generator():
            yield f"event: faq_hit\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            faq_generator(),
            media_type="text/event-stream",
        )

    # 3. RAG retrieval
    try:
        chunks = await retrieve(question)
    except Exception as e:
        logger.error("RAG retrieval failed: %s", e)
        chunks = []

    # 4. Build prompt
    messages = build_chat_prompt(question, chunks)

    # 5. Streaming or non-streaming generation
    if request.stream:
        async def token_generator():
            tokens = []
            try:
                # Yield retrieved chunks first
                for i, chunk in enumerate(chunks[:3]):
                    yield (
                        f"event: chunk\n"
                        f"data: {json.dumps({'index': i, 'text': chunk.get('text', '')[:200], 'score': chunk.get('rerank_score', chunk.get('score', 0))}, ensure_ascii=False)}\n\n"
                    )

                # Stream LLM tokens
                async for token in route_stream(LLMTask.chat, messages):
                    tokens.append(token)
                    yield (
                        f"event: token\n"
                        f"data: {json.dumps({'token': token, 'index': len(tokens) - 1}, ensure_ascii=False)}\n\n"
                    )

                full_answer = "".join(tokens)
                latency_ms = int((time.time() - start_time) * 1000)

                # Sentiment analysis (fire-and-forget)
                sentiment_score, sentiment_label = 0.5, "neutral"
                try:
                    from app.core.llm import analyze_sentiment
                    sentiment_score, sentiment_label = await analyze_sentiment(question)
                except Exception:
                    pass

                result = {
                    "answer": full_answer,
                    "source": "rag",
                    "latency_ms": latency_ms,
                    "sentiment_score": sentiment_score,
                    "sentiment_label": sentiment_label,
                }

                # Cache and log
                await _set_cache(session_id, question, result)
                await _log_interaction(
                    db, session_id, question, full_answer, "rag",
                    [{"text": c.get("text", ""), "score": c.get("rerank_score", c.get("score", 0))} for c in chunks],
                    sentiment_score, sentiment_label, latency_ms,
                )

                yield f"event: done\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"

            except Exception as e:
                logger.error("Stream generation failed: %s", e)
                yield (
                    f"event: error\n"
                    f"data: {json.dumps({'error': '生成回答时出错，请稍后重试'}, ensure_ascii=False)}\n\n"
                )

        return StreamingResponse(
            token_generator(),
            media_type="text/event-stream",
        )
    else:
        # Non-streaming fallback
        try:
            answer = await route(LLMTask.chat, messages=messages)
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            raise HTTPException(status_code=503, detail="AI 服务暂时不可用，请稍后重试")

        latency_ms = int((time.time() - start_time) * 1000)
        result = {
            "answer": answer,
            "source": "rag",
            "chunks": [{"text": c.get("text", ""), "score": c.get("rerank_score", c.get("score", 0))} for c in chunks],
            "latency_ms": latency_ms,
        }
        await _set_cache(session_id, question, result)
        await _log_interaction(
            db, session_id, question, answer, "rag",
            result["chunks"], 0.5, "neutral", latency_ms,
        )
        return result
