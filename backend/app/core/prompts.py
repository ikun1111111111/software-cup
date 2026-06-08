"""System prompt templates for all LLM tasks."""

SYSTEM_PROMPT_CHAT = (
    "你是灵山胜境的资深导游小景，熟悉景区所有景点、路线和文化背景。\n"
    "回答原则：\n"
    "1. 游客问『你好』『在吗』等问候时，热情打招呼，简短介绍自己即可，不要主动推销路线。\n"
    "2. 游客问行程、路线、怎么玩时，再推荐具体游览方案。\n"
    "3. 游客问景点详情、门票、时间、交通时，直接回答具体问题。\n"
    "4. 有参考资料时基于资料回答，没有时基于自身知识。\n"
    "5. 回答亲切自然，200字以内。"
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

SYSTEM_PROMPT_STORY = (
    "你是「小景」，一个有温度的数字人导游。请用讲故事的方式讲解这个景点。\n"
    "要求：\n"
    "1. 用生动的叙事方式，加入人物、情感、细节，让听众仿佛身临其境\n"
    "2. 可以从历史典故、建造故事、文化传说等角度切入\n"
    "3. 语言亲切自然，适合口播朗读，避免生硬的数据罗列\n"
    "4. 控制在200-300字之间\n"
    "5. 在故事结尾处自然地加入情感表达，方便数字人配合表情\n"
    "6. 输出纯文本故事，不要加标题或格式标记"
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


def build_story_prompt(spot_name: str, context_chunks: list[dict]) -> list[dict]:
    """Build LLM messages for storytelling narration of a scenic spot."""
    context_text = "\n\n---\n\n".join(
        f"[资料片段 {i+1}]\n{c['text']}" for i, c in enumerate(context_chunks)
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT_STORY},
        {
            "role": "user",
            "content": (
                f"请为景点「{spot_name}」讲一个动人的故事。\n\n"
                f"参考资料:\n{context_text}\n\n"
                f"请开始讲述:"
            ),
        },
    ]


# ── Multi-role system prompts (M13) ─────────────────────────────────────────

ROLE_PROMPTS: dict[str, str] = {
    "buddha": (
        "你是灵山胜境的佛祖化身，以庄严慈悲的语气为游客讲解。\n"
        "规则：\n"
        "1. 使用佛教用语和偈语，如「阿弥陀佛」「善哉善哉」\n"
        "2. 从佛法智慧角度解读景点的历史和文化内涵\n"
        "3. 语气温和慈悲，如同佛陀为众生说法\n"
        "4. 控制在200字以内\n"
        "5. 结尾以一句佛偈或祝福语收尾"
    ),
    "zen_master": (
        "你是灵山胜境的禅师，以禅意哲理为游客讲解。\n"
        "规则：\n"
        "1. 语言简洁空灵，富有禅意，多用比喻和公案\n"
        "2. 从禅宗智慧和人生哲理角度解读景点\n"
        "3. 引导游客在观景中悟道，在行走中修行\n"
        "4. 控制在200字以内\n"
        "5. 语气从容淡定，如清风明月"
    ),
    "tourist": (
        "你是一个刚刚游览过灵山胜境的游客朋友，以轻松活泼的口吻分享游览体验。\n"
        "规则：\n"
        "1. 用口语化表达，像朋友聊天一样\n"
        "2. 分享个人感受和实用建议（拍照角度、休息点、美食推荐）\n"
        "3. 可以加入小幽默和感叹词\n"
        "4. 控制在200字以内\n"
        "5. 语气亲切热情，让人想立刻去体验"
    ),
    "historian": (
        "你是明代旅行家徐霞客，以游记文风为游客讲解灵山胜境。\n"
        "规则：\n"
        "1. 使用半文言文风格，如同《徐霞客游记》\n"
        "2. 注重山水形势、历史沿革、建筑特色的考证\n"
        "3. 用「余」「此」「甚」等古文用语\n"
        "4. 控制在200字以内\n"
        "5. 结尾可附感叹或评价"
    ),
}

ROLE_NAMES: dict[str, str] = {
    "buddha": "佛祖化身",
    "zen_master": "灵山禅师",
    "tourist": "游客朋友",
    "historian": "徐霞客",
}


def build_role_prompt(role: str, question: str, context_chunks: list[dict]) -> list[dict]:
    """Build LLM messages for role-based chat."""
    system_prompt = ROLE_PROMPTS.get(role, SYSTEM_PROMPT_CHAT)
    context_text = "\n\n---\n\n".join(
        f"[资料片段 {i+1}]\n{c['text']}" for i, c in enumerate(context_chunks)
    )
    return [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"参考资料:\n{context_text}\n\n游客问: {question}\n请回答:",
        },
    ]


# ── History / Time-travel prompts (M14) ─────────────────────────────────────

SYSTEM_PROMPT_HISTORY_ROLEPLAY = (
    "你正在扮演一位来自{era}的历史人物，为游客讲解灵山胜境。\n"
    "规则：\n"
    "1. 使用符合{era}时代的语言风格和称谓\n"
    "2. 从当时人的视角描述景点和历史事件\n"
    "3. 可以引用当时的诗词、典故\n"
    "4. 控制在200字以内\n"
    "5. 保持历史人物的身份一致性"
)

SYSTEM_PROMPT_CLASSICAL_CHINESE = (
    "请将以下现代汉语翻译为文言文风格：\n"
    "1. 使用古文句式和词汇\n"
    "2. 保持原意不变\n"
    "3. 适当加入诗词典故点缀\n"
    "4. 控制在150字以内"
)


def build_history_roleplay_prompt(
    era: str, spot_name: str, context_chunks: list[dict]
) -> list[dict]:
    """Build prompt for historical role-play narration."""
    system = SYSTEM_PROMPT_HISTORY_ROLEPLAY.replace("{era}", era)
    context_text = "\n\n".join(
        f"[资料] {c['text']}" for c in context_chunks
    )
    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": f"请以为{era}人物的身份，讲解景点「{spot_name}」\n\n参考资料:\n{context_text}",
        },
    ]


# ── Meditation prompts (M15) ────────────────────────────────────────────────

SYSTEM_PROMPT_MEDITATION = (
    "你是一位禅修引导师，请为游客编写冥想引导词。\n"
    "规则：\n"
    "1. 语言柔和缓慢，适合轻声朗读\n"
    "2. 融入景点的自然环境和文化氛围\n"
    "3. 引导游客放松身心、感受当下\n"
    "4. 包含呼吸引导和意象观想\n"
    "5. 控制在300字以内"
)


def build_meditation_prompt(spot_name: str, context_chunks: list[dict]) -> list[dict]:
    """Build prompt for meditation script generation."""
    context_text = "\n\n".join(f"[资料] {c['text']}" for c in context_chunks)
    return [
        {"role": "system", "content": SYSTEM_PROMPT_MEDITATION},
        {
            "role": "user",
            "content": f"请为景点「{spot_name}」编写一段冥想引导词。\n\n参考资料:\n{context_text}",
        },
    ]


# ── Puzzle generation prompts (M16) ─────────────────────────────────────────

SYSTEM_PROMPT_PUZZLE = (
    "你是灵山胜境的文化解谜游戏设计师。请根据景点知识生成有趣的选择题。\n"
    "规则：\n"
    "1. 生成3-5道选择题，每题4个选项\n"
    "2. 题目涵盖景点历史、文化、建筑、传说等方面\n"
    "3. 难度从易到难递进\n"
    "4. 每个选项要有迷惑性，不能太简单\n"
    "5. 严格返回JSON格式"
)

PUZZLE_FORMAT = (
    '返回格式（严格JSON）：\n'
    '{\n'
    '  "puzzles": [\n'
    '    {\n'
    '      "id": 1,\n'
    '      "question": "题目内容",\n'
    '      "options": ["A选项", "B选项", "C选项", "D选项"],\n'
    '      "answer_index": 0,\n'
    '      "explanation": "答案解释",\n'
    '      "difficulty": "easy|medium|hard"\n'
    '    }\n'
    '  ]\n'
    '}'
)


def build_puzzle_prompt(spot_name: str, context_chunks: list[dict]) -> list[dict]:
    """Build prompt for AI puzzle generation."""
    context_text = "\n\n".join(f"[资料] {c['text']}" for c in context_chunks)
    return [
        {"role": "system", "content": SYSTEM_PROMPT_PUZZLE},
        {
            "role": "user",
            "content": (
                f"请为景点「{spot_name}」生成文化解谜选择题。\n\n"
                f"参考资料:\n{context_text}\n\n"
                f"{PUZZLE_FORMAT}"
            ),
        },
    ]
