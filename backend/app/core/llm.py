"""Multi-LLM API router with fallback strategies."""
import logging
from enum import Enum
from openai import AsyncOpenAI
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMTask(str, Enum):
    chat = "chat"            # General Q&A -> DeepSeek
    vision = "vision"        # Image recognition -> Qwen-VL
    sentiment = "sentiment"  # Sentiment analysis -> Doubao
    summary = "summary"      # Long text summary -> Qwen-Long
    verify = "verify"        # Fact verification -> Doubao


# Lazy-init clients
_deepseek_client: AsyncOpenAI | None = None
_doubao_client: AsyncOpenAI | None = None


def _get_deepseek() -> AsyncOpenAI:
    global _deepseek_client
    if _deepseek_client is None:
        _deepseek_client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    return _deepseek_client


def _get_doubao() -> AsyncOpenAI:
    global _doubao_client
    if _doubao_client is None:
        _doubao_client = AsyncOpenAI(
            api_key=settings.doubao_api_key,
            base_url=settings.doubao_base_url,
        )
    return _doubao_client


async def chat_deepseek_stream(messages: list[dict]):
    """Streaming DeepSeek-V3 (async generator). Yields tokens."""
    client = _get_deepseek()
    response = await client.chat.completions.create(
        model=settings.llm_default_model,
        messages=messages,
        stream=True,
        temperature=0.7,
        max_tokens=2048,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices else ""
        if delta:
            yield delta


async def chat_deepseek_sync(messages: list[dict]) -> str:
    """Non-streaming call for non-chat scenarios."""
    client = _get_deepseek()
    response = await client.chat.completions.create(
        model=settings.llm_default_model,
        messages=messages,
        stream=False,
        temperature=0.7,
        max_tokens=2048,
    )
    return response.choices[0].message.content


async def chat_qwen_vision(image_url: str, prompt: str) -> str:
    """Image recognition via Qwen-VL-Max (dashscope)."""
    import dashscope
    from dashscope import MultiModalConversation

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
    return ""


async def chat_doubao(messages: list[dict]) -> str:
    """Sentiment/analysis via Doubao Lite."""
    client = _get_doubao()
    response = await client.chat.completions.create(
        model=settings.llm_sentiment_model,
        messages=messages,
        stream=False,
        temperature=0.3,
        max_tokens=1024,
    )
    return response.choices[0].message.content


async def analyze_sentiment(text: str) -> tuple[float, str]:
    """Analyze sentiment of visitor message. Returns (score, label)."""
    messages = [
        {"role": "system", "content": "分析用户消息的情感倾向。只返回JSON: {\"score\": 0.0-1.0, \"label\": \"positive|neutral|negative\"}"},
        {"role": "user", "content": text},
    ]
    result = await chat_doubao(messages)
    try:
        import json
        data = json.loads(result)
        return data["score"], data["label"]
    except Exception:
        return 0.5, "neutral"


async def chat_qwen_long(messages: list[dict]) -> str:
    """Long context summary via Qwen-Long."""
    client = _get_doubao()  # Qwen-Long via OpenAI-compatible endpoint
    response = await client.chat.completions.create(
        model=settings.llm_summary_model,
        messages=messages,
        stream=False,
        temperature=0.5,
        max_tokens=4096,
    )
    return response.choices[0].message.content


async def verify_facts(question: str, answer: str, context: str) -> bool:
    """Verify if answer is factually consistent with context."""
    messages = [
        {"role": "system", "content": "判断回答是否与提供的资料一致。只回复 YES 或 NO。"},
        {"role": "user", "content": f"资料:\n{context}\n\n问题: {question}\n回答: {answer}\n\n回答与资料一致?"},
    ]
    result = await chat_doubao(messages)
    return "YES" in result.upper()
