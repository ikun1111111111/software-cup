"""Unified LLM router with multi-key rotation and automatic fallback."""
import logging
import random
import time
from enum import Enum
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# DeepSeek key pool for rotation
def _get_deepseek_key_pool() -> list[str]:
    """Collect all available DeepSeek API keys (no caching — reads fresh from settings)."""
    keys = [
        settings.deepseek_api_key,
        settings.deepseek_api_key_1,
        settings.deepseek_api_key_2,
        settings.deepseek_api_key_3,
        settings.deepseek_api_key_4,
        settings.deepseek_api_key_5,
        settings.deepseek_api_key_6,
        settings.deepseek_api_key_7,
        settings.deepseek_api_key_8,
    ]
    valid = [k for k in keys if k and k.strip()]
    if not valid:
        logger.warning("No DeepSeek API keys configured!")
    return valid


def _get_next_deepseek_key() -> str:
    """Round-robin key rotation. Uses function attribute to avoid module-level state pollution."""
    pool = _get_deepseek_key_pool()
    if not pool:
        return ""
    idx = getattr(_get_next_deepseek_key, "_index", 0)
    key = pool[idx % len(pool)]
    _get_next_deepseek_key._index = idx + 1
    return key


def _reset_deepseek_key_index() -> None:
    """Reset key rotation index (mainly for testing)."""
    _get_next_deepseek_key._index = 0


class LLMTask(str, Enum):
    chat = "chat"            # General Q&A -> DeepSeek-V3
    vision = "vision"        # Image recognition -> Qwen-VL
    sentiment = "sentiment"  # Sentiment analysis -> Doubao
    summary = "summary"      # Long text summary -> Qwen-Long
    verify = "verify"        # Fact verification -> Doubao


# Task -> (primary_model, fallback_models)
_TASK_ROUTES: dict[LLMTask, tuple[str, list[str]]] = {
    LLMTask.chat: ("deepseek", ["doubao", "qwen"]),
    LLMTask.vision: ("qwen_vl", ["deepseek"]),
    LLMTask.sentiment: ("doubao", ["deepseek"]),
    LLMTask.summary: ("qwen_long", ["deepseek"]),
    LLMTask.verify: ("doubao", ["deepseek"]),
}


async def _call_deepseek_sync(messages: list[dict], **kwargs) -> str:
    """Call DeepSeek-V3 (non-streaming) with key rotation."""
    from openai import AsyncOpenAI

    key = _get_next_deepseek_key()
    if not key:
        raise RuntimeError("No DeepSeek API key available")

    client = AsyncOpenAI(api_key=key, base_url=settings.deepseek_base_url)
    response = await client.chat.completions.create(
        model=settings.llm_default_model,
        messages=messages,
        stream=False,
        temperature=kwargs.get("temperature", 0.7),
        max_tokens=kwargs.get("max_tokens", 2048),
    )
    return response.choices[0].message.content


async def _call_deepseek_stream(messages: list[dict], **kwargs):
    """Call DeepSeek-V3 (streaming) with key rotation. Yields tokens."""
    from openai import AsyncOpenAI

    key = _get_next_deepseek_key()
    if not key:
        raise RuntimeError("No DeepSeek API key available")

    client = AsyncOpenAI(api_key=key, base_url=settings.deepseek_base_url)
    api_start = time.time()
    response = await client.chat.completions.create(
        model=settings.llm_default_model,
        messages=messages,
        stream=True,
        temperature=kwargs.get("temperature", 0.7),
        max_tokens=kwargs.get("max_tokens", 2048),
    )
    first_token = True
    async for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices else ""
        if delta:
            if first_token:
                logger.info("[llm_router] deepseek_first_token elapsed=%.3fs", time.time() - api_start)
                first_token = False
            yield delta


async def _call_doubao(messages: list[dict], **kwargs) -> str:
    """Call Doubao Lite."""
    from openai import AsyncOpenAI

    if not settings.doubao_api_key:
        raise RuntimeError("No Doubao API key available")

    client = AsyncOpenAI(api_key=settings.doubao_api_key, base_url=settings.doubao_base_url)
    response = await client.chat.completions.create(
        model=settings.llm_sentiment_model,
        messages=messages,
        stream=False,
        temperature=kwargs.get("temperature", 0.3),
        max_tokens=kwargs.get("max_tokens", 1024),
    )
    return response.choices[0].message.content


async def _call_qwen(messages: list[dict], **kwargs) -> str:
    """Call Qwen-Long (fallback for text tasks)."""
    from openai import AsyncOpenAI

    if not settings.qwen_api_key:
        raise RuntimeError("No Qwen API key available")

    # Qwen via OpenAI-compatible endpoint
    client = AsyncOpenAI(api_key=settings.qwen_api_key, base_url="https://dashscope.aliyuncs.com/compatible-mode/v1")
    response = await client.chat.completions.create(
        model=settings.llm_summary_model,
        messages=messages,
        stream=False,
        temperature=kwargs.get("temperature", 0.7),
        max_tokens=kwargs.get("max_tokens", 2048),
    )
    return response.choices[0].message.content


async def _call_qwen_vl(image_url: str, prompt: str, **kwargs) -> str:
    """Call Qwen-VL-Max for vision tasks."""
    import dashscope
    from dashscope import MultiModalConversation

    if not settings.qwen_api_key:
        raise RuntimeError("No Qwen API key available")

    messages = [
        {
            "role": "user",
            "content": [
                {"image": image_url},
                {"text": prompt},
            ],
        }
    ]
    response = MultiModalConversation.call(
        model=settings.llm_vision_model,
        messages=messages,
        api_key=settings.qwen_api_key,
    )
    if response.status_code == 200:
        return response.output.choices[0].message.content[0]["text"]
    logger.error("Qwen-VL error: %s", response.message)
    raise RuntimeError(f"Qwen-VL failed: {response.message}")


async def _call_doubao_stream(messages: list[dict], **kwargs):
    """Call Doubao Lite (streaming). Yields tokens."""
    from openai import AsyncOpenAI

    if not settings.doubao_api_key:
        raise RuntimeError("No Doubao API key available")

    client = AsyncOpenAI(api_key=settings.doubao_api_key, base_url=settings.doubao_base_url)
    api_start = time.time()
    response = await client.chat.completions.create(
        model=settings.llm_sentiment_model,
        messages=messages,
        stream=True,
        temperature=kwargs.get("temperature", 0.7),
        max_tokens=kwargs.get("max_tokens", 2048),
    )
    first_token = True
    async for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices else ""
        if delta:
            if first_token:
                logger.info("[llm_router] doubao_first_token elapsed=%.3fs", time.time() - api_start)
                first_token = False
            yield delta


async def _call_qwen_stream(messages: list[dict], **kwargs):
    """Call Qwen-Long (streaming). Yields tokens."""
    from openai import AsyncOpenAI

    if not settings.qwen_api_key:
        raise RuntimeError("No Qwen API key available")

    client = AsyncOpenAI(api_key=settings.qwen_api_key, base_url="https://dashscope.aliyuncs.com/compatible-mode/v1")
    api_start = time.time()
    response = await client.chat.completions.create(
        model=settings.llm_summary_model,
        messages=messages,
        stream=True,
        temperature=kwargs.get("temperature", 0.7),
        max_tokens=kwargs.get("max_tokens", 2048),
    )
    first_token = True
    async for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices else ""
        if delta:
            if first_token:
                logger.info("[llm_router] qwen_first_token elapsed=%.3fs", time.time() - api_start)
                first_token = False
            yield delta


# Map provider name to caller function name (resolved at runtime via globals())
_CALLER_NAMES = {
    "deepseek": "_call_deepseek_sync",
    "doubao": "_call_doubao",
    "qwen": "_call_qwen",
    "qwen_vl": "_call_qwen_vl",
    "qwen_long": "_call_qwen",
}

# Map provider name to stream caller function name
_STREAM_CALLER_NAMES = {
    "deepseek": "_call_deepseek_stream",
    "doubao": "_call_doubao_stream",
    "qwen": "_call_qwen_stream",
}


async def route(
    task: LLMTask,
    messages: list[dict] | None = None,
    **kwargs,
) -> str:
    """Route LLM request to appropriate model with automatic fallback.

    Args:
        task: The type of LLM task.
        messages: Chat messages (for text tasks).
        **kwargs: Additional args like temperature, max_tokens, image_url.

    Returns:
        Generated text response.

    Raises:
        RuntimeError: If all providers fail.
    """
    primary, fallbacks = _TASK_ROUTES.get(task, ("deepseek", ["doubao"]))
    providers = [primary] + fallbacks

    last_error = None
    for provider in providers:
        try:
            logger.debug("Trying provider %s for task %s", provider, task.value)
            caller_name = _CALLER_NAMES[provider]
            caller = globals()[caller_name]

            if provider == "qwen_vl":
                call_kwargs = dict(kwargs)
                image_url = call_kwargs.pop("image_url", "")
                prompt = call_kwargs.pop("prompt", "")
                result = await caller(image_url, prompt, **call_kwargs)
            else:
                if messages is None:
                    messages = []
                result = await caller(messages, **kwargs)

            logger.info("Provider %s succeeded for task %s", provider, task.value)
            return result

        except Exception as e:
            last_error = e
            logger.warning(
                "Provider %s failed for task %s: %s",
                provider, task.value, e,
            )
            continue

    # All providers failed
    logger.error("All LLM providers failed for task %s", task.value)
    raise RuntimeError(
        f"All providers failed for task {task.value}. Last error: {last_error}"
    )


async def route_stream(
    task: LLMTask,
    messages: list[dict],
    **kwargs,
):
    """Streaming version of route (only for chat tasks). Yields tokens."""
    if task != LLMTask.chat:
        raise ValueError("Streaming is only supported for chat tasks")

    providers = ["deepseek", "doubao", "qwen"]
    last_error = None

    for provider in providers:
        try:
            provider_start = time.time()
            stream_name = _STREAM_CALLER_NAMES.get(provider, "_call_deepseek_stream")
            stream_caller = globals()[stream_name]
            # stream_caller is an async generator function; calling it returns the async generator
            gen = stream_caller(messages, **kwargs)
            async for token in gen:
                yield token
            logger.info("[llm_router] provider=%s stream_success elapsed=%.3fs", provider, time.time() - provider_start)
            return
        except Exception as e:
            last_error = e
            logger.warning("[llm_router] provider=%s stream failed: %s", provider, e)
            continue

    logger.error("[llm_router] All providers failed for streaming chat")
    raise RuntimeError(f"All providers failed for streaming. Last error: {last_error}")
