"""Integration tests: analytics report generation full pipeline.

Covers: DB aggregation → Prompt building → LLM summary → Result assembly.
Mocks DB and LLM, report_generator logic runs real.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.report_generator import generate_report, _aggregate_stats, _build_report_prompt


class FakeInteractionLog:
    def __init__(self, **kwargs):
        self.user_input = kwargs.get("user_input", "")
        self.llm_response = kwargs.get("llm_response", "")
        self.sentiment_score = kwargs.get("sentiment_score", 0.5)
        self.sentiment_label = kwargs.get("sentiment_label", "neutral")
        self.is_faq_hit = kwargs.get("is_faq_hit", False)
        self.created_at = kwargs.get("created_at", datetime.utcnow())


# ── Integration: _aggregate_stats with realistic data ────────────────────────


@pytest.mark.asyncio
async def test_aggregate_stats_integration():
    """Integration: aggregation queries return correct computed stats."""
    mock_db = AsyncMock()

    # Simulate execute calls: we use AsyncMock side_effect returning coroutines
    call_count = [0]
    async def _async_side_effect(stmt):
        call_count[0] += 1
        r = MagicMock()
        if call_count[0] in (1, 2):  # count queries
            r.scalar.return_value = 100 if call_count[0] == 1 else 30
        elif call_count[0] == 3:  # avg query
            r.one_or_none.return_value = (0.72, 950.5)
        elif call_count[0] == 4:  # top questions
            r.all.return_value = [
                ("门票多少钱", 25),
                ("大佛多高", 18),
                ("梵宫演出时间", 12),
            ]
        else:
            r.scalar.return_value = 0
        return r

    mock_db.execute = _async_side_effect

    stats = await _aggregate_stats(mock_db, start_date=None, end_date=None)
    assert stats["total_interactions"] == 100
    assert stats["faq_hit_rate"] == 0.30
    assert stats["avg_sentiment_score"] == 0.72
    assert stats["avg_latency_ms"] == 950.5
    assert len(stats["top_questions"]) == 3
    assert stats["top_questions"][0]["question"] == "门票多少钱"


# ── Integration: generate_report full chain ──────────────────────────────────


@pytest.mark.asyncio
async def test_generate_report_full_chain():
    """Integration: DB data → LLM call → structured report with stats."""
    mock_db = AsyncMock()

    # Patch _aggregate_stats to return deterministic data
    fake_stats = {
        "total_interactions": 50,
        "faq_hit_rate": 0.4,
        "avg_sentiment_score": 0.8,
        "avg_latency_ms": 800,
        "top_questions": [
            {"question": "门票多少钱", "count": 10},
            {"question": "大佛多高", "count": 8},
        ],
    }

    fake_interactions = [
        FakeInteractionLog(
            user_input="门票多少钱",
            llm_response="门票210元",
            sentiment_score=0.6,
            sentiment_label="neutral",
            is_faq_hit=True,
        ),
        FakeInteractionLog(
            user_input="大佛多高",
            llm_response="88米",
            sentiment_score=0.9,
            sentiment_label="positive",
            is_faq_hit=False,
        ),
    ]

    with patch("app.core.report_generator._aggregate_stats", new_callable=AsyncMock) as mock_agg:
        mock_agg.return_value = fake_stats

        with patch("app.core.report_generator._fetch_interactions", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = fake_interactions

            with patch("app.core.report_generator.route", new_callable=AsyncMock) as mock_llm:
                mock_llm.return_value = "## 游客感受度报告\n\n满意度较高，游客关注门票和景点高度。"

                result = await generate_report(mock_db, days=7)

    assert "content" in result
    assert "stats" in result
    assert result["stats"] == fake_stats
    assert "游客感受度报告" in result["content"]
    assert "period" in result
    assert "generated_at" in result

    # Verify LLM was called with a proper prompt containing our stats
    mock_llm.assert_awaited_once()
    call_messages = mock_llm.call_args[1]["messages"]
    assert call_messages[0]["role"] == "system"
    assert "满意度趋势" in call_messages[0]["content"]
    prompt_content = call_messages[1]["content"]
    assert "门票多少钱" in prompt_content
    assert "88米" in prompt_content or "大佛" in prompt_content


@pytest.mark.asyncio
async def test_generate_report_llm_failure_fallback():
    """Integration: LLM failure returns template report with raw stats."""
    mock_db = AsyncMock()

    fake_stats = {
        "total_interactions": 10,
        "faq_hit_rate": 0.5,
        "avg_sentiment_score": 0.7,
        "avg_latency_ms": 600,
        "top_questions": [],
    }

    with patch("app.core.report_generator._aggregate_stats", new_callable=AsyncMock) as mock_agg:
        mock_agg.return_value = fake_stats

        with patch("app.core.report_generator._fetch_interactions", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = []

            with patch("app.core.report_generator.route", new_callable=AsyncMock) as mock_llm:
                mock_llm.side_effect = RuntimeError("LLM timeout")

                result = await generate_report(mock_db, days=7)

    # Should still return a report with stats embedded
    assert result["content"] is not None
    assert "10" in result["content"]  # total_interactions visible
    assert "50.0%" in result["content"] or "0.70" in result["content"]
    assert "LLM 总结生成失败" in result["content"] or "自动生成" in result["content"]


# ── Integration: prompt building with edge cases ─────────────────────────────


def test_build_report_prompt_empty_samples():
    stats = {
        "total_interactions": 0,
        "faq_hit_rate": 0.0,
        "avg_sentiment_score": 0.5,
        "avg_latency_ms": 0,
        "top_questions": [],
    }
    messages = _build_report_prompt(stats, [])
    assert "满意度趋势" in messages[0]["content"]
    assert "0" in messages[1]["content"]


def test_build_report_prompt_very_long_question():
    stats = {
        "total_interactions": 1,
        "faq_hit_rate": 0.0,
        "avg_sentiment_score": 0.5,
        "avg_latency_ms": 100,
        "top_questions": [{"question": "问" * 500, "count": 1}],
    }
    messages = _build_report_prompt(stats, [])
    assert "问" * 500 in messages[1]["content"]
