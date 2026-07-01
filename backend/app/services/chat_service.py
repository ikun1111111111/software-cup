"""Core chat service: question -> FAQ check -> Semantic cache -> RAG retrieve -> LLM -> sentiment."""
import time
import logging
from app.core.rag import retrieve
from app.core.llm_router import LLMTask, route, route_stream
from app.core.faq_matcher import search_faq
from app.core.llm import analyze_sentiment
from app.core.semantic_cache import get_similar
from app.core.context_manager import get_history
from app.core.emotion_mapper import detect_emotion, detect_emotion_from_answer

logger = logging.getLogger(__name__)


def build_prompt(
    question: str,
    context_chunks: list[dict],
    history: list[dict] | None = None,
    spot_context: dict | None = None,
) -> list[dict]:
    """Build LLM prompt with retrieved context and optional history."""
    from app.core.prompts import build_chat_prompt
    return build_chat_prompt(
        question,
        context_chunks,
        history=history,
        spot_context=spot_context,
    )


async def process_chat(
    question: str,
    session_id: str,
    db_session,
    stream: bool = True,
    use_context: bool = True,
    use_semantic_cache: bool = True,
    history: list[dict] | None = None,
    spot_id: str | None = None,
    spot_name: str | None = None,
    route_id: str | None = None,
    source_page: str | None = None,
) -> dict:
    """Full chat pipeline with context and semantic cache.

    Args:
        question: User question.
        session_id: Session identifier.
        db_session: Database session.
        stream: Whether to stream LLM output.
        use_context: Whether to inject conversation history into the prompt.
        use_semantic_cache: Whether to check semantic cache before RAG.
        history: Optional pre-fetched history from frontend (avoids Redis round-trip).

    Returns:
        Result dict. For stream=True, the caller must iterate `_stream` and
        then call `finalize_chat()` to persist the turn and cache.
    """
    start_time = time.time()
    result = {
        "question": question,
        "answer": "",
        "source": "rag",
        "chunks": [],
        "is_faq": False,
        "from_cache": False,
        "sentiment_score": 0.5,
        "sentiment_label": "neutral",
        "emotion": "neutral",
        "latency_ms": 0,
    }

    # Step 1: FAQ exact match (fastest path)
    faq_result = await search_faq(question, db_session)
    if faq_result:
        result["answer"] = faq_result["answer"]
        result["source"] = "faq"
        result["is_faq"] = True
        result["emotion"] = detect_emotion_from_answer(faq_result["answer"])
        result["latency_ms"] = int((time.time() - start_time) * 1000)
        return result

    # Step 2: Semantic cache (fast path for similar questions)
    if use_semantic_cache:
        try:
            cached_answer = await get_similar(question)
            if cached_answer:
                result["answer"] = cached_answer
                result["source"] = "cache"
                result["from_cache"] = True
                result["emotion"] = detect_emotion_from_answer(cached_answer)
                result["latency_ms"] = int((time.time() - start_time) * 1000)
                return result
        except Exception as e:
            logger.warning("Semantic cache check failed: %s", e)

    # Step 3: Load conversation history
    history_messages: list[dict] = []
    if use_context and session_id:
        # Prefer externally provided history (from frontend) to avoid Redis round-trip
        if history:
            history_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history
                if msg.get("role") in ("user", "assistant") and msg.get("content")
            ]
        else:
            try:
                turns = await get_history(session_id)
                for turn in turns:
                    history_messages.append({"role": "user", "content": turn["user"]})
                    history_messages.append({"role": "assistant", "content": turn["assistant"]})
            except Exception as e:
                logger.warning("Failed to load context history: %s", e)

    # Step 4: RAG retrieval (boost current-spot chunks when spot_name provided)
    use_fallback = False
    try:
        chunks = await retrieve(question, spot_name=spot_name)
    except Exception as e:
        logger.error("RAG retrieval failed: %s", e)
        chunks = []

    # Fallback: inject default knowledge when retrieval returns empty
    if not chunks:
        use_fallback = True
        chunks = [{
            "text": (
                "灵山胜境主要景点包括：灵山大佛（高88米，世界最高青铜立佛）、"
                "梵宫（被誉为东方卢浮宫，内有吉祥颂演出）、"
                "九龙灌浴（大型动态雕塑群，每日定时演示）、"
                "五印坛城（藏传佛教文化建筑）、"
                "拈花湾（禅意小镇，夜景优美）。"
                "景区全年开放，夏季7:00-17:30，冬季7:00-17:00。\n\n"
                "行程规划参考：第一天上午参观灵山大佛和祥符禅寺，下午观看九龙灌浴；"
                "第二天上午游览梵宫及吉祥颂演出，下午参观五印坛城；"
                "第三天可前往拈花湾体验禅意文化，傍晚欣赏夜景。"
            ),
            "score": 1.0,
        }]

    result["chunks"] = [{"text": c["text"], "score": c.get("rerank_score", c["score"])} for c in chunks]

    # Step 5: LLM generation with history
    # When using fallback, pass empty chunks so the LLM relies solely on system prompt knowledge
    prompt_chunks = [] if use_fallback else chunks
    messages = build_prompt(
        question,
        prompt_chunks,
        history=history_messages if history_messages else None,
        spot_context={"spot_id": spot_id, "spot_name": spot_name, "route_id": route_id, "source_page": source_page},
    )

    # Run sentiment analysis in parallel with LLM (no dependency between them)
    import asyncio

    async def _sentiment_task():
        try:
            return await analyze_sentiment(question)
        except Exception as e:
            logger.warning("Sentiment analysis failed: %s", e)
            return 0.5, "neutral"

    sentiment_task = asyncio.create_task(_sentiment_task())

    if stream:
        result["_stream"] = route_stream(LLMTask.chat, messages)
        result["answer"] = ""  # Will be filled by streaming consumer
    else:
        try:
            answer = await route(LLMTask.chat, messages=messages)
            result["answer"] = answer
        except Exception as e:
            logger.error("LLM generation failed: %s", e)
            result["answer"] = "抱歉，AI服务暂时不可用，请稍后重试。"

    # Await sentiment (likely already done by now)
    score, label = await sentiment_task
    result["sentiment_score"] = score
    result["sentiment_label"] = label
    result["emotion"] = detect_emotion(question, label)

    result["latency_ms"] = int((time.time() - start_time) * 1000)
    return result


async def finalize_chat(session_id: str, question: str, answer: str, source: str) -> None:
    """Persist a completed chat turn to context history and semantic cache.

    Call this after the full answer is known (especially for streaming mode).
    """
    from app.core.context_manager import save_turn
    from app.core.semantic_cache import set_cache

    # Save to conversation history
    try:
        await save_turn(session_id, question, answer)
    except Exception as e:
        logger.warning("Failed to save chat turn: %s", e)

    # Save to semantic cache (skip FAQ since it's already fast)
    if source not in ("faq", "cache") and answer:
        try:
            await set_cache(question, answer)
        except Exception as e:
            logger.warning("Failed to save semantic cache: %s", e)
