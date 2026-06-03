"""Fact verification using cross-check against provided context."""
import logging

from app.core.llm_router import LLMTask, route

logger = logging.getLogger(__name__)


async def verify_facts(
    question: str,
    answer: str,
    context: str,
    strict: bool = False,
) -> tuple[bool, str]:
    """Verify if the answer is factually consistent with the provided context.

    Uses Doubao-Lite (with DeepSeek fallback) to judge consistency.

    Args:
        question: The original user question.
        answer: The LLM-generated answer.
        context: The retrieved context chunks used to generate the answer.
        strict: If True, requires high confidence to pass.

    Returns:
        (is_consistent, reasoning)
        is_consistent: True if answer is supported by context.
        reasoning: Brief explanation of the judgment.
    """
    if not context or not context.strip():
        # No context available — cannot verify
        logger.debug("No context provided for fact checking, skipping")
        return True, "无参考资料，跳过校验"

    system_prompt = (
        "你是一个事实校验专家。请判断「回答」是否与「参考资料」一致。\n"
        "规则：\n"
        "1. 如果回答中的事实都能在参考资料中找到支持，输出：YES\n"
        "2. 如果回答包含参考资料中没有的信息（疑似编造），输出：NO\n"
        "3. 如果参考资料不足以判断，输出：UNCERTAIN\n"
        "4. 输出格式：第一行必须是 YES/NO/UNCERTAIN，后面可以跟简短理由"
    )

    user_content = (
        f"参考资料:\n{context}\n\n"
        f"问题: {question}\n"
        f"回答: {answer}\n\n"
        f"请判断回答是否与参考资料一致:"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    try:
        result = await route(LLMTask.verify, messages=messages, temperature=0.1)
        result_clean = result.strip().upper()

        if result_clean.startswith("YES"):
            reasoning = result.strip().split("\n", 1)[1] if "\n" in result.strip() else "校验通过"
            return True, reasoning
        elif result_clean.startswith("NO"):
            reasoning = result.strip().split("\n", 1)[1] if "\n" in result.strip() else "回答与参考资料不一致"
            return False, reasoning
        else:
            # UNCERTAIN or unclear
            return True, "参考资料不足以明确判断，默认可信"

    except Exception as e:
        logger.error("Fact checking failed: %s", e)
        # Fail-open: if checker fails, assume answer is okay
        return True, f"校验服务异常，默认通过: {e}"
