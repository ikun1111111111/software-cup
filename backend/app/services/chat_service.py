"""Core chat service: question -> topic -> FAQ check -> Semantic cache -> RAG retrieve -> LLM -> sentiment."""
import time
import logging
from app.core.rag import retrieve
from app.core.llm_router import LLMTask, route, route_stream
from app.core.faq_matcher import search_faq
from app.core.semantic_cache import get_similar
from app.core.context_manager import get_history
from app.core.topic_classifier import classify_topic, normalize_question
from app.core.llm import analyze_sentiment

logger = logging.getLogger(__name__)

RESTROOM_KEYWORDS = (
    "厕所",
    "洗手间",
    "卫生间",
    "茅厕",
    "如厕",
    "方便一下",
    "wc",
    "toilet",
    "restroom",
)

RESTROOM_GUIDES = {
    "nine_dragon": {
        "match": ("九龙灌浴", "九条龙", "喷泉"),
        "short_name": "九龙灌浴",
        "guide": (
            "你现在在九龙灌浴广场附近，找厕所不要往喷泉核心区里面走，"
            "建议沿广场外侧主路看“卫生间 / WC / 游客服务中心”指示牌。"
            "通常服务设施会布置在广场边缘，或通往主游线的节点。"
            "如果现场人多，先离开观看人群密集区，再按指示牌走会更快也更安全。"
        ),
    },
    "lingshan_dafo": {
        "match": ("灵山大佛", "大佛广场", "抱佛脚"),
        "short_name": "大佛广场",
        "guide": (
            "你现在在大佛广场附近，找厕所建议先沿主游线往广场下方和游客服务区方向走，"
            "留意“卫生间 / WC / 游客服务中心”的指示牌。这里人流量大，"
            "如果你在台阶或平台上，先下到平缓主路再找标识会更安全。"
        ),
    },
    "xiangfu_temple": {
        "match": ("祥符禅寺", "禅寺", "寺院"),
        "short_name": "祥符禅寺",
        "guide": (
            "你现在在祥符禅寺入口附近，找厕所建议先从寺院安静参观区退回主游线，"
            "沿“卫生间 / WC / 游客服务中心”指示牌走。寺院内部请尽量保持安静，"
            "不要穿行殿堂找服务设施；回到主路或入口服务节点会更容易找到。"
        ),
    },
    "default": {
        "match": (),
        "short_name": "当前点位",
        "guide": (
            "找厕所建议优先沿景区主游线寻找“卫生间 / WC / 游客服务中心”指示牌。"
            "如果大屏所在点位没有直接标识，就近询问工作人员最快；"
            "带老人、小朋友同行的话，建议先到游客服务中心或主服务区确认最近位置。"
        ),
    },
}

SMALLTALK_QUESTIONS = {
    "你好",
    "您好",
    "你好呀",
    "您好呀",
    "嗨",
    "哈喽",
    "hello",
    "hi",
    "hey",
    "在吗",
    "喂",
    "小景",
    "小景你好",
    "你好小景",
}

SMALLTALK_GUIDES = {
    "nine_dragon": {
        "match": ("九龙灌浴", "九条龙", "喷泉"),
        "short_name": "九龙灌浴",
        "guide": "可以问我九龙灌浴的典故、表演时间、最佳站位、下一站怎么走，也可以问厕所、餐饮和休息点。",
    },
    "lingshan_dafo": {
        "match": ("灵山大佛", "大佛广场", "抱佛脚"),
        "short_name": "大佛广场",
        "guide": "可以问我灵山大佛的高度、建造故事、抱佛脚动线、下一站怎么走，也可以问厕所、餐饮和演出安排。",
    },
    "xiangfu_temple": {
        "match": ("祥符禅寺", "禅寺", "寺院"),
        "short_name": "祥符禅寺",
        "guide": "可以问我祥符禅寺的历史、参观礼仪、殿堂看点、下一站怎么走，也可以问厕所、餐饮和休息点。",
    },
    "default": {
        "match": (),
        "short_name": "当前点位",
        "guide": "可以问我景点讲解、路线推荐、厕所餐饮、票务开放和演出活动。",
    },
}


def is_restroom_query(question: str) -> bool:
    """Return True when the tourist is asking for restroom/service facilities."""
    q = normalize_question(question or "").strip().lower()
    return any(keyword in q for keyword in RESTROOM_KEYWORDS)


def _compact_question(question: str) -> str:
    return "".join(
        char for char in normalize_question(question or "").strip().lower()
        if char not in "，。！？、,.!?~～ \t\r\n"
    )


def is_smalltalk_query(question: str) -> bool:
    """Return True for short greetings that should not trigger RAG/LLM."""
    return _compact_question(question) in SMALLTALK_QUESTIONS


def _restroom_guide_for_question(question: str) -> dict:
    raw = question or ""
    for key, guide in RESTROOM_GUIDES.items():
        if key == "default":
            continue
        if any(word in raw for word in guide["match"]):
            return guide
    return RESTROOM_GUIDES["default"]


def _smalltalk_guide_for_question(question: str) -> dict:
    raw = question or ""
    for key, guide in SMALLTALK_GUIDES.items():
        if key == "default":
            continue
        if any(word in raw for word in guide["match"]):
            return guide
    return SMALLTALK_GUIDES["default"]


def build_restroom_service_answer(question: str) -> str:
    """Build a deterministic current-spot restroom answer without RAG/LLM."""
    guide = _restroom_guide_for_question(question)
    return "\n\n".join([
        f"你问的是厕所位置，我按你当前所在的“{guide['short_name']}”来指路。",
        guide["guide"],
        "如果现场标识和我说的不一致，请以景区当天指示牌、广播和工作人员引导为准。",
    ])


def build_smalltalk_answer(question: str) -> str:
    """Build an instant kiosk greeting answer without RAG/LLM."""
    guide = _smalltalk_guide_for_question(question)
    return f"你好呀，我在这里。你现在位于{guide['short_name']}，{guide['guide']}"


def build_prompt(question: str, context_chunks: list[dict], history: list[dict] | None = None, topic: str | None = None) -> list[dict]:
    """Build LLM prompt with retrieved context and optional history."""
    from app.core.prompts import build_chat_prompt
    return build_chat_prompt(question, context_chunks, history=history, topic=topic)


async def process_chat(
    question: str,
    session_id: str,
    db_session,
    stream: bool = True,
    use_context: bool = True,
    use_semantic_cache: bool = True,
    history: list[dict] | None = None,
) -> dict:
    """Full chat pipeline with topic classification, context and semantic cache.

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
    user_question = normalize_question(question)

    # Step 0: Topic classification (zero-cost rule based)
    topic = classify_topic(user_question)
    logger.info("[chat_service] topic=%s question=%r raw_question=%r", topic, user_question, question)

    result = {
        "question": question,
        "answer": "",
        "source": "rag",
        "chunks": [],
        "is_faq": False,
        "from_cache": False,
        "sentiment_score": 0.5,
        "sentiment_label": "neutral",
        "latency_ms": 0,
        "topic": topic,
    }

    # Deterministic service-facility path.
    # Restroom questions must not hit semantic cache/RAG, because spot context
    # can otherwise pull scenic narration such as "九龙灌浴典故".
    if is_restroom_query(user_question):
        result["answer"] = build_restroom_service_answer(question)
        result["source"] = "service_guide"
        result["topic"] = "food"
        result["latency_ms"] = int((time.time() - start_time) * 1000)
        return result

    if is_smalltalk_query(user_question):
        result["answer"] = build_smalltalk_answer(question)
        result["source"] = "smalltalk"
        result["topic"] = "general"
        result["latency_ms"] = int((time.time() - start_time) * 1000)
        return result

    # Step 1: FAQ exact match (fastest path)
    faq_start = time.time()
    faq_result = await search_faq(user_question, db_session, topic=topic)
    logger.info("[chat_service] faq_check elapsed=%.3fs hit=%s", time.time() - faq_start, faq_result is not None)
    if faq_result:
        result["answer"] = faq_result["answer"]
        result["source"] = "faq"
        result["is_faq"] = True
        result["latency_ms"] = int((time.time() - start_time) * 1000)
        result["card"] = await _build_card(db_session, topic, user_question)
        return result

    # Step 2: Semantic cache (fast path for similar questions)
    if use_semantic_cache:
        try:
            cache_start = time.time()
            cached_answer = await get_similar(user_question)
            logger.info("[chat_service] semantic_cache_check elapsed=%.3fs hit=%s",
                        time.time() - cache_start, cached_answer is not None)
            if cached_answer:
                result["answer"] = cached_answer
                result["source"] = "cache"
                result["from_cache"] = True
                result["latency_ms"] = int((time.time() - start_time) * 1000)
                result["card"] = await _build_card(db_session, topic, user_question)
                return result
        except Exception as e:
            logger.warning("[chat_service] semantic cache check failed: %s", e)

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

    # Step 4: RAG retrieval with topic filter
    use_fallback = False
    try:
        retrieve_start = time.time()
        chunks = await retrieve(user_question, topic=topic)
        logger.info("[chat_service] rag_retrieve elapsed=%.3fs chunks=%d topic=%s", time.time() - retrieve_start, len(chunks), topic)
    except Exception as e:
        logger.error("[chat_service] RAG retrieval failed: %s", e)
        chunks = []

    # Fallback: inject default knowledge when retrieval returns empty
    if not chunks:
        use_fallback = True
        chunks = _fallback_chunks(topic)

    result["chunks"] = [{"text": c["text"], "score": c.get("rerank_score", c["score"])} for c in chunks]

    # Step 5: LLM generation with history and topic-aware prompt
    # When using fallback, pass empty chunks so the LLM relies solely on system prompt knowledge
    prompt_start = time.time()
    prompt_chunks = [] if use_fallback else chunks
    messages = build_prompt(user_question, prompt_chunks, history=history_messages if history_messages else None, topic=topic)
    logger.info("[chat_service] prompt_build elapsed=%.3fs history_len=%d", time.time() - prompt_start, len(history_messages))
    if stream:
        result["_stream"] = route_stream(LLMTask.chat, messages)
        result["answer"] = ""  # Will be filled by streaming consumer
    else:
        try:
            llm_start = time.time()
            answer = await route(LLMTask.chat, messages=messages)
            logger.info("[chat_service] llm_sync elapsed=%.3fs", time.time() - llm_start)
            result["answer"] = answer
        except Exception as e:
            logger.error("[chat_service] LLM generation failed: %s", e)
            result["answer"] = "抱歉，AI服务暂时不可用，请稍后重试。"

        # Sentiment analysis for non-streaming responses
        try:
            sentiment_score, sentiment_label = await analyze_sentiment(user_question)
            result["sentiment_score"] = sentiment_score
            result["sentiment_label"] = sentiment_label
        except Exception as e:
            logger.warning("[chat_service] sentiment analysis failed: %s", e)

    result["latency_ms"] = int((time.time() - start_time) * 1000)
    result["card"] = await _build_card(db_session, topic, user_question)
    logger.info("[chat_service] pipeline_total elapsed=%.3fs", time.time() - start_time)
    return result


def _fallback_chunks(topic: str | None) -> list[dict]:
    """Return topic-aware fallback knowledge when retrieval is empty."""
    fallbacks = {
        "ticket": (
            "灵山胜境门票信息：成人票约210元/人，儿童、老人、学生等可享受优惠票价；"
            "景区开放时间一般为7:00-17:00（冬季可能微调）。建议通过官方渠道或合作平台提前预约购票。"
        ),
        "food": (
            "灵山胜境及周边餐饮以素斋、素面为特色，景区内有素斋馆提供禅意素食；"
            "拈花湾也有多家餐厅和小吃店，游客可品尝本地素食文化与江南小吃。"
            "若游客询问厕所、洗手间、卫生间、休息区等服务设施，应优先回答服务查询："
            "建议游客沿当前点位主游线寻找卫生间/游客服务中心指示牌，或就近询问现场工作人员；"
            "不要把厕所问题回答成景点文化讲解。"
        ),
        "route": (
            "灵山胜境经典游览路线：上午参观灵山大佛与祥符禅寺，中午观看九龙灌浴演出；"
            "下午游览梵宫及吉祥颂演出，傍晚可前往拈花湾欣赏夜景。"
        ),
        "history": (
            "灵山胜境位于江苏无锡太湖之滨，历史悠久，佛教文化底蕴深厚；"
            "灵山大佛于1997年建成开光，高88米，是世界最高的青铜立佛之一。"
        ),
        "culture": (
            "灵山胜境融合佛教文化、禅宗智慧与当代艺术，标志性景点包括灵山大佛、梵宫、九龙灌浴、五印坛城等；"
            "景区常举办祈福、禅修等文化活动。"
        ),
    }
    text = fallbacks.get(topic, (
        "灵山胜境主要景点包括：灵山大佛（高88米，世界最高青铜立佛）、"
        "梵宫（被誉为东方卢浮宫，内有吉祥颂演出）、"
        "九龙灌浴（大型动态雕塑群，每日定时演示）、"
        "五印坛城（藏传佛教文化建筑）、"
        "拈花湾（禅意小镇，夜景优美）。"
        "景区全年开放，夏季7:00-17:30，冬季7:00-17:00。\n\n"
        "行程规划参考：第一天上午参观灵山大佛和祥符禅寺，下午观看九龙灌浴；"
        "第二天上午游览梵宫及吉祥颂演出，下午参观五印坛城；"
        "第三天可前往拈花湾体验禅意文化，傍晚欣赏夜景。"
    ))
    return [{"text": text, "score": 1.0}]


async def _build_card(db_session, topic: str, question: str) -> dict | None:
    """Build a structured theme card payload based on the classified topic."""
    from sqlalchemy import select
    from app.models.tourist import POI, ScenicSpot, ShowEvent, TourRoute

    try:
        if topic == "food":
            stmt = (
                select(POI)
                .where(POI.is_active == True, POI.category == "food")
                .order_by(POI.id)
                .limit(10)
            )
            result = await db_session.execute(stmt)
            pois = result.scalars().all()
            if not pois:
                return None
            return {
                "type": "food_map",
                "center": {"lat": 31.42, "lng": 120.12},
                "pois": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "category": p.category,
                        "address": p.address,
                        "latitude": p.latitude,
                        "longitude": p.longitude,
                        "phone": p.phone,
                        "business_hours": p.business_hours,
                        "price_level": p.price_level,
                        "intro": p.intro,
                        "tags": p.tags or [],
                    }
                    for p in pois
                ],
            }

        if topic == "route":
            stmt = (
                select(TourRoute)
                .where(TourRoute.is_active == True)
                .order_by(TourRoute.id)
                .limit(1)
            )
            result = await db_session.execute(stmt)
            route = result.scalar_one_or_none()
            if not route:
                return None
            spot_ids = route.spot_order or []
            spots = []
            if spot_ids:
                spot_stmt = select(ScenicSpot).where(ScenicSpot.id.in_(spot_ids), ScenicSpot.is_active == True)
                spot_result = await db_session.execute(spot_stmt)
                spot_map = {s.id: s for s in spot_result.scalars().all()}
                for sid in spot_ids:
                    s = spot_map.get(sid)
                    if s:
                        spots.append({
                            "id": s.id,
                            "name": s.name,
                            "latitude": s.latitude,
                            "longitude": s.longitude,
                            "thumbnail": s.thumbnail,
                            "narration": s.narration,
                        })
            return {
                "type": "route_map",
                "route": {
                    "id": route.id,
                    "name": route.name,
                    "route_type": route.route_type,
                    "duration": route.duration,
                    "description": route.description,
                    "cover_image": route.cover_image,
                    "color": route.color,
                },
                "spots": spots,
            }

        if topic in ("ticket", "spot"):
            stmt = (
                select(ScenicSpot)
                .where(ScenicSpot.is_active == True)
                .order_by(ScenicSpot.id)
                .limit(5)
            )
            result = await db_session.execute(stmt)
            spots = result.scalars().all()
            if not spots:
                return None
            if topic == "ticket":
                return {
                    "type": "ticket_info",
                    "spots": [
                        {
                            "id": s.id,
                            "name": s.name,
                            "ticket_info": s.ticket_info,
                            "open_time": s.open_time,
                            "must_see": s.must_see,
                            "thumbnail": s.thumbnail,
                        }
                        for s in spots
                    ],
                }
            # topic == "spot"
            selected = spots[0]
            return {
                "type": "spot_info",
                "spot": {
                    "id": selected.id,
                    "name": selected.name,
                    "category": selected.category,
                    "overview": selected.overview,
                    "detail": selected.detail,
                    "tags": selected.tags or [],
                    "latitude": selected.latitude,
                    "longitude": selected.longitude,
                    "ticket_info": selected.ticket_info,
                    "open_time": selected.open_time,
                    "must_see": selected.must_see,
                    "best_time": selected.best_time,
                    "narration": selected.narration,
                    "thumbnail": selected.thumbnail,
                    "duration": selected.duration,
                },
            }

        if topic == "history":
            stmt = (
                select(ScenicSpot)
                .where(ScenicSpot.is_active == True, ScenicSpot.topic_tags.contains(["history"]))
                .limit(5)
            )
            result = await db_session.execute(stmt)
            spots = result.scalars().all()
            events = [
                {"year": "古代", "title": "灵山佛教渊源", "description": "灵山地处无锡太湖之滨，佛教文化渊源流长。"},
                {"year": "1994", "title": "灵山大佛奠基", "description": "灵山大佛正式奠基开工。"},
                {"year": "1997", "title": "灵山大佛开光", "description": "灵山大佛落成开光，高88米，成为世界最高青铜立佛之一。"},
            ]
            if spots:
                events.append({
                    "year": "当代",
                    "title": "景区扩建",
                    "description": "陆续建成梵宫、九龙灌浴、五印坛城等文化地标。",
                })
            return {"type": "timeline", "events": events}

        if topic == "culture":
            return {
                "type": "culture_image",
                "image": None,
                "title": "灵山胜境的佛教艺术",
                "description": "灵山胜境融合佛教文化、禅宗智慧与当代艺术，标志性景点包括灵山大佛、梵宫、九龙灌浴、五印坛城等。",
            }

    except Exception as e:
        logger.warning("[chat_service] build_card failed: %s", e)

    return None


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
    if source not in ("faq", "cache", "service_guide", "smalltalk") and answer:
        try:
            await set_cache(question, answer)
        except Exception as e:
            logger.warning("Failed to save semantic cache: %s", e)
