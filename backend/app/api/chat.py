"""SSE streaming chat API."""
import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.llm import analyze_sentiment
from app.core.tts import synthesize_stream
from app.services.chat_service import (
    build_restroom_service_answer,
    build_smalltalk_answer,
    finalize_chat,
    is_restroom_query,
    is_smalltalk_query,
    process_chat,
)
from app.models.interaction import InteractionLog
from app.models.avatar import AvatarConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    question: str
    stream: bool = True
    history: list[dict] = []  # Optional conversation history from frontend


class ChatWithTTSRequest(BaseModel):
    session_id: str
    question: str
    history: list[dict] = []
    voice_id: str | None = None  # Optional override; active avatar voice used by default


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


async def _get_active_voice_id(db: AsyncSession | None = None) -> str | None:
    """Return voice_id of the currently active avatar, if any."""
    try:
        if db is None:
            from app.core.database import async_session
            async with async_session() as session:
                result = await session.execute(
                    select(AvatarConfig).where(AvatarConfig.is_active == True)
                )
                avatar = result.scalar_one_or_none()
                return avatar.voice_id if avatar else None
        result = await db.execute(
            select(AvatarConfig).where(AvatarConfig.is_active == True)
        )
        avatar = result.scalar_one_or_none()
        return avatar.voice_id if avatar else None
    except Exception as e:
        logger.debug("Failed to get active avatar voice_id: %s", e)
        return None


def _build_service_guide_result(question: str, start_time: float) -> dict:
    answer = build_restroom_service_answer(question)
    return {
        "answer": answer,
        "source": "service_guide",
        "chunks": [],
        "latency_ms": int((time.time() - start_time) * 1000),
        "sentiment_score": 0.5,
        "sentiment_label": "neutral",
        "topic": "food",
        "card": None,
    }


def _build_smalltalk_result(question: str, start_time: float) -> dict:
    answer = build_smalltalk_answer(question)
    return {
        "answer": answer,
        "source": "smalltalk",
        "chunks": [],
        "latency_ms": int((time.time() - start_time) * 1000),
        "sentiment_score": 0.5,
        "sentiment_label": "neutral",
        "topic": "general",
        "card": None,
    }


async def _tts_event_stream(
    text: str,
    voice_id: str | None,
    duration_holder: dict | None = None,
):
    """Yield SSE events for a TTS audio stream."""
    try:
        async for chunk in synthesize_stream(text, voice_id=voice_id):
            event_type = chunk["type"]
            if event_type == "audio":
                payload = {"data": chunk["data"]}
                yield f"event: tts_audio\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            elif event_type == "phonemes":
                payload = {"data": chunk["data"]}
                yield f"event: tts_phonemes\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            elif event_type == "tts_error":
                payload = {"error": chunk.get("error", "TTS unavailable")}
                yield f"event: tts_error\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            elif event_type == "done" and duration_holder is not None:
                duration_holder["duration_ms"] = chunk.get("duration_ms", 0)
    except Exception as e:
        logger.error("[chat_tts] tts stream failed: %s", e)
        yield (
            f"event: tts_error\n"
            f"data: {json.dumps({'error': '语音合成失败，请查看文字回答'}, ensure_ascii=False)}\n\n"
        )


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

    logger.info("[chat] request start session=%s question=%r", session_id, question)

    if is_restroom_query(question):
        result = _build_service_guide_result(question, start_time)
        answer = result["answer"]
        await _set_exact_cache(session_id, question, result)
        await finalize_chat(session_id, question, answer, "service_guide")
        await _log_interaction(
            db, session_id, question, answer, "service_guide", [],
            0.5, "neutral", result["latency_ms"],
        )

        async def service_generator():
            yield f"event: done\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            service_generator(),
            media_type="text/event-stream",
        )

    if is_smalltalk_query(question):
        result = _build_smalltalk_result(question, start_time)
        answer = result["answer"]
        await finalize_chat(session_id, question, answer, "smalltalk")
        await _log_interaction(
            db, session_id, question, answer, "smalltalk", [],
            0.5, "neutral", result["latency_ms"],
        )

        async def smalltalk_generator():
            yield f"event: done\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            smalltalk_generator(),
            media_type="text/event-stream",
        )

    # 1. Exact-match cache (fastest, same question same session)
    cache_start = time.time()
    cached = await _check_exact_cache(session_id, question)
    logger.info("[chat] exact_cache_check elapsed=%.3fs hit=%s", time.time() - cache_start, cached is not None)
    if cached:
        logger.info("[chat] exact cache hit for session %s", session_id)
        cached["cached"] = True
        cached["latency_ms"] = int((time.time() - start_time) * 1000)

        async def cached_generator():
            yield f"event: done\ndata: {json.dumps(cached, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
        )

    # 2. Run full pipeline via chat_service
    pipeline_start = time.time()
    try:
        result = await process_chat(
            question, session_id, db,
            stream=request_data.stream,
            history=request_data.history if request_data.history else None,
        )
        topic = result.get("topic", "general")
        logger.info("[chat] process_chat elapsed=%.3fs faq=%s cache=%s has_stream=%s topic=%s",
                    time.time() - pipeline_start,
                    result.get("is_faq"),
                    result.get("from_cache"),
                    result.get("_stream") is not None,
                    topic)
    except Exception as e:
        logger.exception("[chat] process_chat failed: %s", e)
        error_msg = f'服务内部错误: {str(e)}'
        async def error_generator():
            yield f"event: error\ndata: {json.dumps({'error': error_msg}, ensure_ascii=False)}\n\n"
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream",
            status_code=200,
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
            payload = {**result, "topic": topic}
            yield f"event: faq_hit\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

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
            0.5, "neutral", latency_ms,
        )

        async def cache_generator():
            payload = {**result, "topic": topic}
            yield f"event: done\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

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
            first_token_time = None
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
                        if first_token_time is None:
                            first_token_time = time.time()
                            logger.info("[chat] first_token elapsed=%.3fs token=%r",
                                        first_token_time - start_time, token)
                        tokens.append(token)
                        yield (
                            f"event: token\n"
                            f"data: {json.dumps({'token': token, 'index': len(tokens) - 1}, ensure_ascii=False)}\n\n"
                        )

                full_answer = "".join(tokens)
                latency_ms = int((time.time() - start_time) * 1000)
                logger.info("[chat] stream_end total_tokens=%d elapsed=%.3fs",
                            len(tokens), time.time() - start_time)

                # Sentiment analysis after streaming to avoid blocking TTFB
                try:
                    sentiment_score, sentiment_label = await analyze_sentiment(question)
                except Exception:
                    sentiment_score, sentiment_label = 0.5, "neutral"

                done_result = {
                    "answer": full_answer,
                    "source": "rag",
                    "latency_ms": latency_ms,
                    "sentiment_score": sentiment_score,
                    "sentiment_label": sentiment_label,
                    "topic": topic,
                }

                # Persist turn and cache
                persist_start = time.time()
                await _set_exact_cache(session_id, question, done_result)
                await finalize_chat(session_id, question, full_answer, "rag")
                await _log_interaction(
                    db, session_id, question, full_answer, "rag",
                    chunks, sentiment_score, sentiment_label, latency_ms,
                )
                logger.info("[chat] persist elapsed=%.3fs", time.time() - persist_start)

                yield f"event: done\ndata: {json.dumps(done_result, ensure_ascii=False)}\n\n"

            except Exception as e:
                logger.error("[chat] stream generation failed: %s", e)
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
            "topic": topic,
        }
        await _set_exact_cache(session_id, question, done_result)
        await finalize_chat(session_id, question, answer, "rag")
        await _log_interaction(
            db, session_id, question, answer, "rag",
            chunks, sentiment_score, sentiment_label, latency_ms,
        )
        return done_result


@router.post("/stream_with_tts")
async def chat_stream_with_tts(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Combined streaming chat + TTS endpoint via Server-Sent Events.

    Pipeline: exact cache -> chat_service -> TTS synthesis -> SSE audio/text events.

    Returns SSE events:
        - event: faq_hit      (if FAQ exact match)
        - event: cache_hit    (if semantic cache hit)
        - event: chunk        (retrieved knowledge chunks)
        - event: token        (LLM streaming tokens)
        - event: tts_audio    (base64 audio chunk)
        - event: tts_phonemes (phoneme timestamps)
        - event: done         (final metadata)
        - event: error        (on failure)
    """
    try:
        body_json = await request.json()
        request_data = ChatWithTTSRequest(**body_json)
    except Exception as e:
        logger.error("Failed to parse request body: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")

    start_time = time.time()
    session_id = request_data.session_id
    question = request_data.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    voice_id = request_data.voice_id or await _get_active_voice_id(db)
    logger.info("[chat_tts] request start session=%s question=%r voice_id=%s",
                session_id, question, voice_id)

    if is_restroom_query(question):
        result = _build_service_guide_result(question, start_time)
        answer = result["answer"]
        await _set_exact_cache(session_id, question, result)
        await finalize_chat(session_id, question, answer, "service_guide")
        await _log_interaction(
            db, session_id, question, answer, "service_guide", [],
            0.5, "neutral", result["latency_ms"],
        )

        async def service_tts_generator():
            yield f"event: done\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"
            async for sse in _tts_event_stream(answer, voice_id):
                yield sse

        return StreamingResponse(
            service_tts_generator(),
            media_type="text/event-stream",
        )

    if is_smalltalk_query(question):
        result = _build_smalltalk_result(question, start_time)
        answer = result["answer"]
        await finalize_chat(session_id, question, answer, "smalltalk")
        await _log_interaction(
            db, session_id, question, answer, "smalltalk", [],
            0.5, "neutral", result["latency_ms"],
        )

        async def smalltalk_tts_generator():
            yield f"event: done\ndata: {json.dumps(result, ensure_ascii=False)}\n\n"
            async for sse in _tts_event_stream(answer, voice_id):
                yield sse

        return StreamingResponse(
            smalltalk_tts_generator(),
            media_type="text/event-stream",
        )

    # 1. Exact-match cache
    cache_start = time.time()
    cached = await _check_exact_cache(session_id, question)
    logger.info("[chat_tts] exact_cache_check elapsed=%.3fs hit=%s",
                time.time() - cache_start, cached is not None)
    if cached:
        logger.info("[chat_tts] exact cache hit for session %s", session_id)
        cached["cached"] = True
        cached["latency_ms"] = int((time.time() - start_time) * 1000)
        answer = cached.get("answer", "")

        async def exact_cached_tts_generator():
            yield f"event: done\ndata: {json.dumps(cached, ensure_ascii=False)}\n\n"
            async for sse in _tts_event_stream(answer, voice_id):
                yield sse

        return StreamingResponse(
            exact_cached_tts_generator(),
            media_type="text/event-stream",
        )

    # 2. Full pipeline
    pipeline_start = time.time()
    try:
        result = await process_chat(
            question, session_id, db,
            stream=True,
            history=request_data.history if request_data.history else None,
        )
        topic = result.get("topic", "general")
        logger.info("[chat_tts] process_chat elapsed=%.3fs faq=%s cache=%s topic=%s",
                    time.time() - pipeline_start,
                    result.get("is_faq"),
                    result.get("from_cache"),
                    topic)
    except Exception as e:
        logger.exception("[chat_tts] process_chat failed: %s", e)
        error_msg = f'服务内部错误: {str(e)}'
        async def error_generator():
            yield f"event: error\ndata: {json.dumps({'error': error_msg}, ensure_ascii=False)}\n\n"
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream",
            status_code=200,
        )

    # Fast paths: FAQ or semantic cache hit
    if result.get("is_faq"):
        latency_ms = result["latency_ms"]
        answer = result["answer"]
        await _set_exact_cache(session_id, question, result)
        await finalize_chat(session_id, question, answer, "faq")
        await _log_interaction(
            db, session_id, question, answer, "faq", [],
            0.5, "neutral", latency_ms, is_faq=True,
        )

        async def faq_tts_generator():
            payload = {**result, "topic": topic}
            yield f"event: faq_hit\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            tts_duration = {}
            async for sse in _tts_event_stream(answer, voice_id, duration_holder=tts_duration):
                yield sse
            done_payload = {
                "answer": answer,
                "source": "faq",
                "latency_ms": latency_ms,
                "topic": topic,
                "sentiment_score": 0.5,
                "sentiment_label": "neutral",
                "tts_duration_ms": tts_duration.get("duration_ms", 0),
                "card": result.get("card"),
            }
            yield f"event: done\ndata: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            faq_tts_generator(),
            media_type="text/event-stream",
        )

    if result.get("from_cache"):
        latency_ms = result["latency_ms"]
        answer = result["answer"]
        await _set_exact_cache(session_id, question, result)
        await finalize_chat(session_id, question, answer, "cache")
        await _log_interaction(
            db, session_id, question, answer, "cache", [],
            0.5, "neutral", latency_ms,
        )

        async def cache_tts_generator():
            payload = {**result, "topic": topic}
            yield f"event: cache_hit\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            tts_duration = {}
            async for sse in _tts_event_stream(answer, voice_id, duration_holder=tts_duration):
                yield sse
            done_payload = {
                "answer": answer,
                "source": "cache",
                "latency_ms": latency_ms,
                "topic": topic,
                "sentiment_score": 0.5,
                "sentiment_label": "neutral",
                "tts_duration_ms": tts_duration.get("duration_ms", 0),
                "card": result.get("card"),
            }
            yield f"event: done\ndata: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            cache_tts_generator(),
            media_type="text/event-stream",
        )

    # 3. Streaming generation with TTS
    chunks = result.get("chunks", [])
    stream_gen = result.get("_stream")

    async def tts_token_generator():
        tokens = []
        first_token_time = None
        full_answer = ""
        try:
            # Yield retrieved chunks first
            for i, chunk in enumerate(chunks[:3]):
                yield (
                    f"event: chunk\n"
                    f"data: {json.dumps({'index': i, 'text': chunk.get('text', '')[:200], 'score': chunk.get('score', 0)}, ensure_ascii=False)}\n\n"
                )

            # Stream LLM tokens
            card = result.get("card")
            if card:
                yield (
                    f"event: card\n"
                    f"data: {json.dumps(card, ensure_ascii=False)}\n\n"
                )
            if stream_gen:
                async for token in stream_gen:
                    if first_token_time is None:
                        first_token_time = time.time()
                        logger.info("[chat_tts] first_token elapsed=%.3fs token=%r",
                                    first_token_time - start_time, token)
                    tokens.append(token)
                    yield (
                        f"event: token\n"
                        f"data: {json.dumps({'token': token, 'index': len(tokens) - 1}, ensure_ascii=False)}\n\n"
                    )

            full_answer = "".join(tokens)
            latency_ms = int((time.time() - start_time) * 1000)
            logger.info("[chat_tts] stream_end total_tokens=%d elapsed=%.3fs",
                        len(tokens), time.time() - start_time)

            done_result = {
                "answer": full_answer,
                "source": "rag",
                "latency_ms": latency_ms,
                "sentiment_score": 0.5,
                "sentiment_label": "neutral",
                "topic": topic,
                "card": card,
            }

            yield f"event: done\ndata: {json.dumps(done_result, ensure_ascii=False)}\n\n"

            # Start TTS before non-critical analysis/persistence so the guide speaks sooner.
            tts_start = time.time()
            tts_duration = {}
            async for sse in _tts_event_stream(full_answer, voice_id, duration_holder=tts_duration):
                yield sse
            done_result["tts_duration_ms"] = tts_duration.get("duration_ms", 0)
            logger.info("[chat_tts] tts_stream elapsed=%.3fs", time.time() - tts_start)

            try:
                sentiment_score, sentiment_label = await analyze_sentiment(question)
                done_result["sentiment_score"] = sentiment_score
                done_result["sentiment_label"] = sentiment_label
            except Exception:
                sentiment_score, sentiment_label = 0.5, "neutral"

            persist_start = time.time()
            await _set_exact_cache(session_id, question, done_result)
            await finalize_chat(session_id, question, full_answer, "rag")
            await _log_interaction(
                db, session_id, question, full_answer, "rag",
                chunks, sentiment_score, sentiment_label, latency_ms,
            )
            logger.info("[chat_tts] persist elapsed=%.3fs", time.time() - persist_start)

        except Exception as e:
            logger.error("[chat_tts] stream generation failed: %s", e)
            yield (
                f"event: error\n"
                f"data: {json.dumps({'error': '生成回答时出错，请稍后重试'}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(
        tts_token_generator(),
        media_type="text/event-stream",
    )


class FeedbackRequest(BaseModel):
    session_id: str
    message_id: str | None = None
    rating: str  # "like" | "dislike"


@router.post("/feedback")
async def submit_feedback(
    body: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit user feedback (like/dislike) for a chat message."""
    from sqlalchemy import update
    try:
        stmt = (
            update(InteractionLog)
            .where(InteractionLog.session_id == body.session_id)
            .values(user_feedback=body.rating)
        )
        await db.execute(stmt)
        await db.commit()
        return {"status": "ok"}
    except Exception as e:
        logger.warning("Failed to save feedback: %s", e)
        await db.rollback()
        return {"status": "error", "message": str(e)}
