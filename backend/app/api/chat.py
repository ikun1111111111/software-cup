"""SSE streaming chat API."""
import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.services.chat_service import process_chat, finalize_chat
from app.models.interaction import InteractionLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    question: str
    stream: bool = True
    history: list[dict] = []  # Optional conversation history from frontend
    spot_id: str | None = None
    spot_name: str | None = None
    route_id: str | None = None
    source_page: str | None = None  # e.g. 'chat' | 'attraction'


def _exact_cache_key(session_id: str, question: str) -> str:
    """Generate Redis cache key for exact-match chat Q&A."""
    from hashlib import md5
    q_hash = md5(question.encode("utf-8")).hexdigest()[:16]
    return f"chat:{session_id}:{q_hash}"


async def _check_exact_cache(session_id: str, question: str) -> dict | None:
    """Check Redis for exact-match cached answer."""
    try:
        redis = await get_redis()
        key = _exact_cache_key(session_id, question)
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.debug("Exact cache check failed: %s", e)
    return None


async def _set_exact_cache(session_id: str, question: str, answer: dict, ttl: int = 300):
    """Cache answer in Redis with TTL (default 5 min)."""
    try:
        redis = await get_redis()
        key = _exact_cache_key(session_id, question)
        await redis.set(key, json.dumps(answer, ensure_ascii=False), ex=ttl)
    except Exception as e:
        logger.debug("Exact cache set failed: %s", e)


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
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Streaming chat endpoint via Server-Sent Events.

    Pipeline: exact cache -> chat_service (FAQ -> semantic cache -> RAG -> LLM) -> finalize

    Returns SSE events:
        - event: faq_hit   (if FAQ exact match)
        - event: cache_hit (if semantic cache hit)
        - event: chunk     (retrieved knowledge chunks)
        - event: token     (LLM streaming tokens)
        - event: done      (final metadata)
        - event: error     (on failure)
    """
    # Parse JSON body manually to work around FastAPI body parsing issues
    try:
        body_json = await request.json()
        request_data = ChatRequest(**body_json)
    except Exception as e:
        logger.error("Failed to parse request body: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")

    start_time = time.time()
    session_id = request_data.session_id
    question = request_data.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # 1. Exact-match cache (fastest, same question same session)
    cached = await _check_exact_cache(session_id, question)
    if cached:
        logger.info("Exact cache hit for session %s", session_id)
        cached["cached"] = True
        cached["latency_ms"] = int((time.time() - start_time) * 1000)

        async def cached_generator():
            yield f"event: done\ndata: {json.dumps(cached, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
        )

    # 2. Run full pipeline via chat_service
    result = await process_chat(
        question, session_id, db,
        stream=request_data.stream,
        history=request_data.history if request_data.history else None,
        spot_id=request_data.spot_id,
        spot_name=request_data.spot_name,
        route_id=request_data.route_id,
        source_page=request_data.source_page,
    )

    # Fast paths: FAQ or semantic cache hit -> immediate response
    if result.get("is_faq"):
        latency_ms = result["latency_ms"]
        answer = result["answer"]
        await _set_exact_cache(session_id, question, result)
        await finalize_chat(session_id, question, answer, "faq")
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

    if result.get("from_cache"):
        latency_ms = result["latency_ms"]
        answer = result["answer"]
        await _set_exact_cache(session_id, question, result)
        await finalize_chat(session_id, question, answer, "cache")
        await _log_interaction(
            db, session_id, question, answer, "cache", [],
            result.get("sentiment_score", 0.5), result.get("sentiment_label", "neutral"), latency_ms,
        )

        async def cache_generator():
            yield f"event: cache_hit\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            cache_generator(),
            media_type="text/event-stream",
        )

    # 3. Streaming generation
    if request_data.stream:
        chunks = result.get("chunks", [])
        stream_gen = result.get("_stream")

        async def token_generator():
            tokens = []
            try:
                # Yield retrieved chunks first
                for i, chunk in enumerate(chunks[:3]):
                    yield (
                        f"event: chunk\n"
                        f"data: {json.dumps({'index': i, 'text': chunk.get('text', '')[:200], 'score': chunk.get('score', 0)}, ensure_ascii=False)}\n\n"
                    )

                # Stream LLM tokens
                if stream_gen:
                    async for token in stream_gen:
                        tokens.append(token)
                        yield (
                            f"event: token\n"
                            f"data: {json.dumps({'token': token, 'index': len(tokens) - 1}, ensure_ascii=False)}\n\n"
                        )

                full_answer = "".join(tokens)
                latency_ms = int((time.time() - start_time) * 1000)
                sentiment_score = result.get("sentiment_score", 0.5)
                sentiment_label = result.get("sentiment_label", "neutral")

                done_result = {
                    "answer": full_answer,
                    "source": "rag",
                    "latency_ms": latency_ms,
                    "sentiment_score": sentiment_score,
                    "sentiment_label": sentiment_label,
                    "emotion": result.get("emotion", "neutral"),
                }

                # Send done immediately — don't block on cache/log writes
                yield f"event: done\ndata: {json.dumps(done_result, ensure_ascii=False)}\n\n"

                # Persist in background (non-blocking)
                import asyncio

                async def _background_persist():
                    await _set_exact_cache(session_id, question, done_result)
                    await finalize_chat(session_id, question, full_answer, "rag")
                    await _log_interaction(
                        db, session_id, question, full_answer, "rag",
                        chunks, sentiment_score, sentiment_label, latency_ms,
                    )
                asyncio.create_task(_background_persist())

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
        answer = result.get("answer", "")
        latency_ms = int((time.time() - start_time) * 1000)
        sentiment_score = result.get("sentiment_score", 0.5)
        sentiment_label = result.get("sentiment_label", "neutral")
        chunks = result.get("chunks", [])

        done_result = {
            "answer": answer,
            "source": "rag",
            "chunks": chunks,
            "latency_ms": latency_ms,
            "sentiment_score": sentiment_score,
            "sentiment_label": sentiment_label,
        }
        await _set_exact_cache(session_id, question, done_result)
        await finalize_chat(session_id, question, answer, "rag")
        await _log_interaction(
            db, session_id, question, answer, "rag",
            chunks, sentiment_score, sentiment_label, latency_ms,
        )
        return done_result
