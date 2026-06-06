"""System prompt templates for all LLM tasks."""

SYSTEM_PROMPT_CHAT = (
    "你是灵山胜境干了二十年的老导游小景，对景区了如指掌。\n"
    "游客问行程你就直接推荐，不要说什么资料不资料的。\n"
    "三日游推荐：第一天灵山大佛和九龙灌浴，第二天梵宫和五印坛城，"
    "第三天拈花湾。\n"
    "回答亲切自然，200字以内。"
)

SYSTEM_PROMPT_VERIFY = (
    "你是一个事实校验专家。请判断「回答」是否与「参考资料」一致。\n"
    "规则：\n"
    "1. 如果回答中的事实都能在参考资料中找到支持，输出：YES\n"
    "2. 如果回答包含参考资料中没有的信息（疑似编造），输出：NO\n"
    "3. 如果参考资料不足以判断，输出：UNCERTAIN\n"
    "4. 输出格式：第一行必须是 YES/NO/UNCERTAIN，后面可以跟简短理由"
)

SYSTEM_PROMPT_SENTIMENT = (
    "分析用户消息的情感倾向。只返回JSON: "
    '{"score": 0.0-1.0, "label": "positive|neutral|negative"}'
)

SYSTEM_PROMPT_SUMMARY = (
    "你是一个专业的旅游数据分析助手。请根据提供的交互记录，"
    "生成一份简洁的感受度分析报告，包含：\n"
    "1. 游客整体满意度趋势\n"
    "2. 高频关注话题\n"
    "3. 知识库盲区（无法回答的问题类型）\n"
    "4. 改进建议\n"
    "报告控制在500字以内，使用中文。"
)


def build_chat_prompt(
    question: str,
    context_chunks: list[dict],
    history: list[dict] | None = None,
    use_fallback: bool = False,
) -> list[dict]:
    """Build LLM messages for chat with retrieved context and optional history.

    Args:
        question: Current user question.
        context_chunks: Retrieved knowledge chunks.
        history: Optional list of previous messages, each as {"role": "user|assistant", "content": "..."}.
        use_fallback: Whether the chunks are fallback knowledge (not from RAG).
    """
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT_CHAT}]

    # Inject conversation history (oldest first) before the current turn
    if history:
        for turn in history:
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    if context_chunks:
        context_text = "\n\n---\n\n".join(
            f"[资料片段 {i+1}]\n{c['text']}" for i, c in enumerate(context_chunks)
        )
        if use_fallback:
            # Fallback knowledge: present as background info, not as strict reference
            user_content = f"你对灵山景点很了解，以下是一些背景信息供你参考：\n{context_text}\n\n游客问: {question}\n请直接给出建议，不要说自己不清楚:"
        else:
            user_content = f"参考资料:\n{context_text}\n\n游客问: {question}\n请回答:"
    else:
        user_content = f"游客问: {question}\n请回答:"

    messages.append({"role": "user", "content": user_content})
    return messages
