"""WebSocket chat API for bidirectional text/voice communication."""
import json
import logging
import time
import base64

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.core.llm_router import LLMTask, route
from app.core.rag import retrieve
from app.core.faq_matcher import search_faq
from app.core.prompts import build_chat_prompt
from app.core.asr import transcribe
from app.core.tts import synthesize_cached

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/chat")
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for chat.

    Expected receive JSON:
        {"session_id": "...", "question": "...", "type": "text"}

    Send JSON:
        {"type": "answer", "answer": "...", "source": "...", ...}
        {"type": "error", "message": "..."}
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted: %s", websocket.client)

    async def _process_chat(db: AsyncSession, question: str, msg_type: str) -> dict:
        """Core chat pipeline: FAQ → RAG → LLM. Returns result dict."""
        # 1. FAQ check
        faq_result = await search_faq(question, db)
        if faq_result:
            return {
                "type": "answer",
                "answer": faq_result["answer"],
                "source": "faq",
                "faq_id": faq_result.get("faq_id"),
            }

        # 2. RAG retrieval
        try:
            chunks = await retrieve(question)
        except Exception as e:
            logger.error("RAG retrieval failed in WS: %s", e)
            chunks = []

        # 3. LLM generation
        messages = build_chat_prompt(question, chunks)
        try:
            answer = await route(LLMTask.chat, messages=messages)
        except Exception as e:
            logger.error("LLM generation failed in WS: %s", e)
            return {"type": "error", "message": "AI 服务暂时不可用，请稍后重试"}

        # 4. Sentiment analysis
        sentiment_score, sentiment_label = 0.5, "neutral"
        try:
            from app.core.llm import analyze_sentiment
            sentiment_score, sentiment_label = await analyze_sentiment(question)
        except Exception:
            pass

        return {
            "type": "answer",
            "answer": answer,
            "source": "rag",
            "chunks": [
                {"text": c.get("text", ""), "score": c.get("rerank_score", c.get("score", 0))}
                for c in chunks[:3]
            ],
            "sentiment_score": sentiment_score,
            "sentiment_label": sentiment_label,
        }

    async def _log_interaction(
        db: AsyncSession,
        session_id: str,
        user_input: str,
        input_type: str,
        answer: str,
        sentiment_score: float,
        sentiment_label: str,
        latency_ms: int,
    ):
        """Persist interaction log."""
        try:
            from app.models.interaction import InteractionLog
            log = InteractionLog(
                session_id=session_id,
                user_input=user_input,
                input_type=input_type,
                llm_response=answer,
                llm_model="deepseek-chat",
                sentiment_score=sentiment_score,
                sentiment_label=sentiment_label,
                latency_ms=latency_ms,
            )
            db.add(log)
            await db.commit()
        except Exception as e:
            logger.warning("WS interaction log failed: %s", e)
            await db.rollback()

    try:
        while True:
            # Receive message
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
                continue

            session_id = data.get("session_id", "")
            msg_type = data.get("type", "text")
            start_time = time.time()

            if not session_id:
                await websocket.send_json({"type": "error", "message": "session_id is required"})
                continue

            # ============== Voice Path ==============
            if msg_type == "voice":
                audio_b64 = data.get("audio_base64", "")
                if not audio_b64:
                    await websocket.send_json({"type": "error", "message": "audio_base64 is required for voice"})
                    continue

                try:
                    audio_bytes = base64.b64decode(audio_b64)
                except Exception:
                    await websocket.send_json({"type": "error", "message": "Invalid audio_base64"})
                    continue

                # ASR
                try:
                    asr_text = await transcribe(audio_bytes, language="zh")
                except Exception as e:
                    logger.error("ASR failed: %s", e)
                    await websocket.send_json({"type": "error", "message": "语音识别失败，请重试"})
                    continue

                if not asr_text or asr_text.startswith("["):
                    await websocket.send_json({"type": "error", "message": asr_text or "语音识别结果为空"})
                    continue

                # Process chat
                async with async_session() as db:
                    result = await _process_chat(db, asr_text, "voice")
                    if result.get("type") == "error":
                        await websocket.send_json(result)
                        continue

                    answer = result["answer"]
                    sentiment_score = result.get("sentiment_score", 0.5)
                    sentiment_label = result.get("sentiment_label", "neutral")

                    # TTS
                    try:
                        tts_result = await synthesize_cached(answer)
                        audio_b64_out = base64.b64encode(tts_result.audio_bytes).decode("utf-8") if tts_result.audio_bytes else ""
                    except Exception as e:
                        logger.error("TTS failed: %s", e)
                        audio_b64_out = ""
                        tts_result = None

                    latency_ms = int((time.time() - start_time) * 1000)

                    await websocket.send_json({
                        "type": "voice_answer",
                        "asr_text": asr_text,
                        "answer": answer,
                        "source": result.get("source", "rag"),
                        "audio_base64": audio_b64_out,
                        "phonemes": tts_result.phoneme_timestamps if tts_result else [],
                        "sentiment_score": sentiment_score,
                        "sentiment_label": sentiment_label,
                        "latency_ms": latency_ms,
                    })

                    await _log_interaction(
                        db, session_id, asr_text, "voice", answer,
                        sentiment_score, sentiment_label, latency_ms,
                    )
                continue

            # ============== Text Path ==============
            question = data.get("question", "").strip()
            if not question:
                await websocket.send_json({"type": "error", "message": "question is required"})
                continue

            async with async_session() as db:
                result = await _process_chat(db, question, "text")
                if result.get("type") == "error":
                    await websocket.send_json(result)
                    continue

                latency_ms = int((time.time() - start_time) * 1000)
                result["latency_ms"] = latency_ms
                await websocket.send_json(result)

                await _log_interaction(
                    db, session_id, question, "text", result["answer"],
                    result.get("sentiment_score", 0.5), result.get("sentiment_label", "neutral"), latency_ms,
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", websocket.client)
    except Exception as e:
        logger.error("WebSocket unexpected error: %s", e)
        try:
            await websocket.close()
        except Exception:
            pass
