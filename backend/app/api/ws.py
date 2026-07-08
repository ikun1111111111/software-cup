"""WebSocket chat API for bidirectional text/voice communication."""
import json
import logging
import time
import base64

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.services.chat_service import process_chat, finalize_chat
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
        {"type": "voice_answer", "asr_text": "...", "answer": "...", ...}
        {"type": "error", "message": "..."}
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted: %s", websocket.client)

    async def _log_interaction(
        db: AsyncSession,
        session_id: str,
        user_input: str,
        input_type: str,
        answer: str,
        source: str,
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
                is_faq_hit=(source == "faq"),
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

                # Process chat via chat_service (includes context + semantic cache)
                async with async_session() as db:
                    result = await process_chat(asr_text, session_id, db, stream=False)
                    if not result.get("answer"):
                        await websocket.send_json({"type": "error", "message": "AI 服务暂时不可用，请稍后重试"})
                        continue

                    answer = result["answer"]
                    source = result.get("source", "rag")
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
                        "source": source,
                        "audio_base64": audio_b64_out,
                        "phonemes": tts_result.phoneme_timestamps if tts_result else [],
                        "sentiment_score": sentiment_score,
                        "sentiment_label": sentiment_label,
                        "latency_ms": latency_ms,
                    })

                    # Persist turn and log
                    await finalize_chat(session_id, asr_text, answer, source)
                    await _log_interaction(
                        db, session_id, asr_text, "voice", answer,
                        source, sentiment_score, sentiment_label, latency_ms,
                    )
                continue

            # ============== Text Path ==============
            question = data.get("question", "").strip()
            if not question:
                await websocket.send_json({"type": "error", "message": "question is required"})
                continue

            async with async_session() as db:
                result = await process_chat(question, session_id, db, stream=False)
                if not result.get("answer"):
                    await websocket.send_json({"type": "error", "message": "AI 服务暂时不可用，请稍后重试"})
                    continue

                latency_ms = int((time.time() - start_time) * 1000)
                answer = result["answer"]
                source = result.get("source", "rag")
                sentiment_score = result.get("sentiment_score", 0.5)
                sentiment_label = result.get("sentiment_label", "neutral")

                response = {
                    "type": "answer",
                    "answer": answer,
                    "source": source,
                    "chunks": [
                        {"text": c.get("text", ""), "score": c.get("score", 0)}
                        for c in result.get("chunks", [])[:3]
                    ],
                    "sentiment_score": sentiment_score,
                    "sentiment_label": sentiment_label,
                    "latency_ms": latency_ms,
                }
                await websocket.send_json(response)

                # Persist turn and log
                await finalize_chat(session_id, question, answer, source)
                await _log_interaction(
                    db, session_id, question, "text", answer,
                    source, sentiment_score, sentiment_label, latency_ms,
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", websocket.client)
    except Exception as e:
        logger.error("WebSocket unexpected error: %s", e)
        try:
            await websocket.close()
        except Exception:
            pass
