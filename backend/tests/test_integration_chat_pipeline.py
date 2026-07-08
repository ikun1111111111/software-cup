"""Integration tests: full chat pipeline.

Covers: process_chat → FAQ matcher → RAG retrieve → LLM router → Sentiment analysis.
Mocks external LLM/RAG/FAQ DB, internal service chain runs real.
"""
import pytest
from unittest.mock import AsyncMock, patch

from app.services.chat_service import process_chat, build_prompt


# ── build_prompt sanity ──────────────────────────────────────────────────────


def test_build_prompt_structure():
    chunks = [
        {"text": "灵山胜境位于无锡", "score": 0.9, "rerank_score": 0.95},
    ]
    messages = build_prompt("灵山在哪里？", chunks)
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "灵山在哪里" in messages[1]["content"]


# ── Integration: process_chat FAQ hit path ───────────────────────────────────


@pytest.mark.asyncio
async def test_chat_pipeline_faq_hit():
    """Integration: FAQ match returns immediately, skips RAG + LLM."""
    mock_db = AsyncMock()

    with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq:
        mock_faq.return_value = {
            "question": "门票多少钱",
            "answer": "成人票210元",
            "faq_id": 3,
            "source": "faq",
        }

        with patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_rag:
            with patch("app.services.chat_service.route", new_callable=AsyncMock) as mock_llm:
                result = await process_chat(
                    question="门票多少钱",
                    session_id="s_001",
                    db_session=mock_db,
                    stream=False,
                )

    assert result["is_faq"] is True
    assert result["answer"] == "成人票210元"
    assert result["source"] == "faq"
    mock_faq.assert_awaited_once()
    # RAG and LLM should NOT be called when FAQ hits
    mock_rag.assert_not_awaited()
    mock_llm.assert_not_awaited()


# ── Integration: process_chat RAG → LLM non-streaming path ───────────────────


@pytest.mark.asyncio
async def test_chat_pipeline_rag_llm_non_stream():
    """Integration: FAQ miss → RAG retrieve → LLM sync call → sentiment."""
    mock_db = AsyncMock()

    fake_chunks = [
        {"text": "灵山大佛高88米", "score": 0.85, "rerank_score": 0.92},
        {"text": "梵宫是标志性建筑", "score": 0.80, "rerank_score": 0.88},
    ]

    with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq:
        mock_faq.return_value = None  # FAQ miss

        with patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = fake_chunks

            with patch("app.services.chat_service.route", new_callable=AsyncMock) as mock_llm:
                mock_llm.return_value = "灵山大佛高88米，是中国最高的青铜立佛。"

                with patch("app.services.chat_service.analyze_sentiment", new_callable=AsyncMock) as mock_sentiment:
                    mock_sentiment.return_value = (0.85, "positive")

                    result = await process_chat(
                        question="灵山大佛多高？",
                        session_id="s_002",
                        db_session=mock_db,
                        stream=False,
                        use_semantic_cache=False,
                    )

    assert result["is_faq"] is False
    assert result["source"] == "rag"
    assert result["answer"] == "灵山大佛高88米，是中国最高的青铜立佛。"
    assert result["sentiment_score"] == 0.85
    assert result["sentiment_label"] == "positive"
    assert len(result["chunks"]) == 2

    # Verify call chain order and args
    mock_faq.assert_awaited_once_with("灵山大佛多高？", mock_db, topic=result["topic"])
    mock_rag.assert_awaited_once_with("灵山大佛多高？", topic=result["topic"])
    mock_llm.assert_awaited_once()
    call_messages = mock_llm.call_args[1]["messages"]
    assert call_messages[0]["role"] == "system"
    assert "灵山大佛多高" in call_messages[1]["content"]
    mock_sentiment.assert_awaited_once_with("灵山大佛多高？")


# ── Integration: process_chat streaming path ─────────────────────────────────


@pytest.mark.asyncio
async def test_chat_pipeline_streaming_path():
    """Integration: FAQ miss → RAG → LLM stream (returns generator)."""
    mock_db = AsyncMock()

    fake_chunks = [{"text": "测试片段", "score": 0.9, "rerank_score": 0.95}]

    async def _fake_stream(*args, **kwargs):
        yield "灵"
        yield "山"
        yield "大"
        yield "佛"

    with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq:
        mock_faq.return_value = None

        with patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = fake_chunks

            with patch("app.services.chat_service.route_stream", return_value=_fake_stream()) as mock_stream:
                with patch("app.services.chat_service.analyze_sentiment", new_callable=AsyncMock) as mock_sentiment:
                    mock_sentiment.return_value = (0.6, "neutral")

                    result = await process_chat(
                        question="灵山大佛",
                        session_id="s_003",
                        db_session=mock_db,
                        stream=True,
                        use_semantic_cache=False,
                    )

    assert result["is_faq"] is False
    assert result["source"] == "rag"
    assert result["answer"] == ""  # streaming consumer fills this
    assert "_stream" in result
    mock_stream.assert_called_once()
    # Sentiment analysis is performed by the streaming consumer, not process_chat.


# ── Integration: sentiment failure does not break chat ───────────────────────


@pytest.mark.asyncio
async def test_chat_pipeline_sentiment_failure_graceful():
    """Integration: sentiment analysis failure returns default values, chat succeeds."""
    mock_db = AsyncMock()

    with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq:
        mock_faq.return_value = None

        with patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = [{"text": "x", "score": 0.5}]

            with patch("app.services.chat_service.route", new_callable=AsyncMock) as mock_llm:
                mock_llm.return_value = "回答内容"

                with patch("app.services.chat_service.analyze_sentiment", new_callable=AsyncMock) as mock_sentiment:
                    mock_sentiment.side_effect = RuntimeError("sentiment service down")

                    result = await process_chat(
                        question="问题",
                        session_id="s_004",
                        db_session=mock_db,
                        stream=False,
                    )

    assert result["answer"] == "回答内容"
    assert result["sentiment_score"] == 0.5  # default
    assert result["sentiment_label"] == "neutral"  # default


# ── Integration: FAQ miss with empty RAG chunks ──────────────────────────────


@pytest.mark.asyncio
async def test_chat_pipeline_empty_rag_fallback():
    """Integration: RAG returns empty, LLM called with empty context."""
    mock_db = AsyncMock()

    with patch("app.services.chat_service.search_faq", new_callable=AsyncMock) as mock_faq:
        mock_faq.return_value = None

        with patch("app.services.chat_service.retrieve", new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = []

            with patch("app.services.chat_service.route", new_callable=AsyncMock) as mock_llm:
                mock_llm.return_value = "抱歉，没有找到相关资料。"

                with patch("app.services.chat_service.analyze_sentiment", new_callable=AsyncMock) as mock_sentiment:
                    mock_sentiment.return_value = (0.5, "neutral")

                    result = await process_chat(
                        question="宇宙尽头在哪",
                        session_id="s_005",
                        db_session=mock_db,
                        stream=False,
                        use_semantic_cache=False,
                    )

    assert result["answer"] == "抱歉，没有找到相关资料。"
    assert len(result["chunks"]) > 0  # fallback knowledge injected
    mock_llm.assert_awaited_once()
