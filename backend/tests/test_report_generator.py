"""Tests for report_generator module."""
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.report_generator import _build_report_prompt, _aggregate_stats


@pytest.mark.asyncio
async def test_aggregate_stats_empty_db():
    mock_db = AsyncMock()

    # First execute call: total count
    # Second execute call: faq count
    # Third execute call: sentiment avg
    # Fourth execute call: top questions
    def _make_result(scalar_val=None, one_none_val=None, all_val=None):
        r = MagicMock()
        if scalar_val is not None:
            r.scalar.return_value = scalar_val
        if one_none_val is not None:
            r.one_or_none.return_value = one_none_val
        if all_val is not None:
            r.all.return_value = all_val
        return r

    mock_db.execute.side_effect = [
        _make_result(scalar_val=0),           # total count
        _make_result(scalar_val=0),           # faq count
        _make_result(one_none_val=(None, None)),  # sentiment avg
        _make_result(all_val=[]),             # top questions
    ]

    stats = await _aggregate_stats(mock_db, start_date=None, end_date=None)
    assert stats["total_interactions"] == 0
    assert stats["faq_hit_rate"] == 0.0
    assert stats["avg_sentiment_score"] == 0.5
    assert stats["avg_latency_ms"] == 0.0
    assert stats["top_questions"] == []


@pytest.mark.asyncio
async def test_aggregate_stats_with_data():
    mock_db = AsyncMock()

    def _make_result(scalar_val=None, one_none_val=None, all_val=None):
        r = MagicMock()
        if scalar_val is not None:
            r.scalar.return_value = scalar_val
        if one_none_val is not None:
            r.one_or_none.return_value = one_none_val
        if all_val is not None:
            r.all.return_value = all_val
        return r

    mock_db.execute.side_effect = [
        _make_result(scalar_val=100),              # total count
        _make_result(scalar_val=40),               # faq count
        _make_result(one_none_val=(0.75, 1200.5)), # sentiment avg
        _make_result(all_val=[("门票多少钱", 15), ("大佛多高", 12)]),  # top questions
    ]

    stats = await _aggregate_stats(mock_db, start_date=None, end_date=None)
    assert stats["total_interactions"] == 100
    assert stats["faq_hit_rate"] == 0.4
    assert stats["avg_sentiment_score"] == 0.75
    assert stats["avg_latency_ms"] == 1200.5
    assert len(stats["top_questions"]) == 2


def test_build_report_prompt():
    stats = {
        "total_interactions": 50,
        "faq_hit_rate": 0.4,
        "avg_sentiment_score": 0.8,
        "avg_latency_ms": 800,
        "top_questions": [
            {"question": "门票多少钱", "count": 10},
        ],
    }
    samples = [
        {"user_input": "门票多少钱", "llm_response": "门票210元", "sentiment_label": "neutral"},
    ]
    messages = _build_report_prompt(stats, samples)
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "满意度趋势" in messages[0]["content"]
    assert "门票多少钱" in messages[1]["content"]


def test_build_report_prompt_many_samples():
    stats = {
        "total_interactions": 200,
        "faq_hit_rate": 0.5,
        "avg_sentiment_score": 0.7,
        "avg_latency_ms": 900,
        "top_questions": [],
    }
    samples = [{"user_input": f"Q{i}", "llm_response": f"A{i}", "sentiment_label": "positive"} for i in range(50)]
    messages = _build_report_prompt(stats, samples)
    # Should only include first 30 samples
    assert "Q0" in messages[1]["content"]
    assert "Q29" in messages[1]["content"]
    assert "Q30" not in messages[1]["content"]
