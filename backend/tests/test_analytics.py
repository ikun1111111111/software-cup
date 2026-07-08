"""Tests for analytics dashboard service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.analytics import (
    overview_stats,
    trend_stats,
    top_questions,
    sentiment_distribution,
    knowledge_stats,
    realtime_logs,
)

client = TestClient(app)


class MockRow:
    """Simple mock for SQLAlchemy result rows."""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class TestOverviewStats:
    """Test overview KPI aggregation."""

    @pytest.mark.asyncio
    async def test_overview_with_data(self):
        """Should compute KPIs from mocked query results."""
        mock_db = MagicMock()
        # Simulate 6 scalar queries: total, today, faq, sentiment, latency, sessions, voice
        mock_db.execute = AsyncMock(side_effect=[
            MagicMock(scalar=lambda: 1000),   # total
            MagicMock(scalar=lambda: 50),     # today
            MagicMock(scalar=lambda: 280),    # faq hits
            MagicMock(scalar=lambda: 0.75),   # avg sentiment
            MagicMock(scalar=lambda: 1200.0), # avg latency
            MagicMock(scalar=lambda: 800),    # unique sessions
            MagicMock(scalar=lambda: 150),    # voice count
        ])

        result = await overview_stats(mock_db)
        assert result["total_interactions"] == 1000
        assert result["today_interactions"] == 50
        assert result["faq_hit_rate"] == 0.28
        assert result["avg_sentiment_score"] == 0.75
        assert result["avg_latency_ms"] == 1200.0
        assert result["unique_sessions"] == 800
        assert result["voice_ratio"] == 0.15

    @pytest.mark.asyncio
    async def test_overview_empty(self):
        """Should return zeros when no data."""
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(side_effect=[
            MagicMock(scalar=lambda: 0),
            MagicMock(scalar=lambda: 0),
            MagicMock(scalar=lambda: 0),
            MagicMock(scalar=lambda: None),
            MagicMock(scalar=lambda: None),
            MagicMock(scalar=lambda: 0),
            MagicMock(scalar=lambda: 0),
        ])

        result = await overview_stats(mock_db)
        assert result["total_interactions"] == 0
        assert result["faq_hit_rate"] == 0.0
        assert result["avg_sentiment_score"] == 0.0

    @pytest.mark.asyncio
    async def test_overview_db_error(self):
        """Should return safe defaults on DB error."""
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(side_effect=Exception("DB down"))
        result = await overview_stats(mock_db)
        assert result["total_interactions"] == 0
        assert result["avg_latency_ms"] == 0.0


class TestTrendStats:
    """Test trend aggregation."""

    @pytest.mark.asyncio
    async def test_trend_with_data(self):
        """Should return daily trend rows."""
        mock_db = MagicMock()
        row1 = MockRow(date="2024-06-01", interactions=100, avg_sentiment=0.8, avg_latency=1000.0, faq_hits=30)
        row2 = MockRow(date="2024-06-02", interactions=150, avg_sentiment=0.7, avg_latency=1200.0, faq_hits=45)
        mock_result = MagicMock()
        mock_result.all = lambda: [row1, row2]
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await trend_stats(mock_db, days=7)
        assert result["days"] == 7
        assert len(result["trends"]) == 2
        assert result["trends"][0]["date"] == "2024-06-01"
        assert result["trends"][0]["faq_hit_rate"] == 0.3

    @pytest.mark.asyncio
    async def test_trend_empty(self):
        """Should return empty trends when no data."""
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.all = lambda: []
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await trend_stats(mock_db, days=7)
        assert result["trends"] == []


class TestTopQuestions:
    """Test top questions aggregation."""

    @pytest.mark.asyncio
    async def test_top_questions_with_data(self):
        """Should return ranked question list."""
        mock_db = MagicMock()
        row1 = MockRow(question="灵山大佛多高？", count=50, is_faq=True)
        row2 = MockRow(question="门票多少钱？", count=30, is_faq=False)
        mock_result = MagicMock()
        mock_result.all = lambda: [row1, row2]
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await top_questions(mock_db, limit=10)
        assert len(result["questions"]) == 2
        assert result["questions"][0]["question"] == "灵山大佛多高？"
        assert result["questions"][0]["source"] == "faq"
        assert result["questions"][1]["source"] == "rag"


class TestSentimentDistribution:
    """Test sentiment distribution."""

    @pytest.mark.asyncio
    async def test_sentiment_distribution_with_data(self):
        """Should compute sentiment proportions."""
        mock_db = MagicMock()
        row1 = MockRow(sentiment_label="positive", count=60)
        row2 = MockRow(sentiment_label="neutral", count=30)
        row3 = MockRow(sentiment_label="negative", count=10)

        mock_result = MagicMock()
        mock_result.all = lambda: [row1, row2, row3]

        mock_db.execute = AsyncMock(side_effect=[
            mock_result,              # distribution query
            MagicMock(scalar=lambda: 0.72),  # avg score query
        ])

        result = await sentiment_distribution(mock_db)
        assert result["positive"] == 0.6
        assert result["neutral"] == 0.3
        assert result["negative"] == 0.1
        assert result["avg_score"] == 0.72


class TestKnowledgeStats:
    """Test knowledge base statistics."""

    @pytest.mark.asyncio
    async def test_knowledge_stats_with_data(self):
        """Should return doc/faq counts."""
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(side_effect=[
            MagicMock(scalar=lambda: 45),   # total docs
            MagicMock(scalar=lambda: 42),   # indexed docs
            MagicMock(scalar=lambda: 120),  # total faqs
            MagicMock(scalar=lambda: 118),  # active faqs
            MagicMock(all=lambda: [         # top faqs
                MockRow(question="灵山胜境有哪些主要景点？", hit_count=3400),
                MockRow(question="灵山大佛有多高？", hit_count=2100),
            ]),
        ])

        result = await knowledge_stats(mock_db)
        assert result["total_docs"] == 45
        assert result["indexed_docs"] == 42
        assert result["total_faqs"] == 120
        assert result["active_faqs"] == 118
        assert len(result["top_faqs"]) == 2
        assert result["top_faqs"][0]["hit_count"] == 3400


class TestRealtimeLogs:
    """Test realtime logs retrieval."""

    @pytest.mark.asyncio
    async def test_realtime_logs_with_data(self):
        """Should return recent interaction logs."""
        from datetime import datetime
        mock_log = MagicMock()
        mock_log.session_id = "s1"
        mock_log.user_input = "灵山大佛多高？"
        mock_log.llm_response = "灵山大佛高88米。"
        mock_log.input_type = "text"
        mock_log.sentiment_label = "positive"
        mock_log.sentiment_score = 0.85
        mock_log.is_faq_hit = True
        mock_log.latency_ms = 120
        mock_log.created_at = datetime(2024, 6, 2, 10, 30, 0)

        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_log]
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await realtime_logs(mock_db, limit=20)
        assert len(result["recent"]) == 1
        assert result["recent"][0]["session_id"] == "s1"
        assert result["recent"][0]["source"] == "faq"
        assert result["recent"][0]["created_at"] == "2024-06-02T10:30:00"


class TestAnalyticsAPI:
    """Test FastAPI endpoints."""

    @pytest.mark.asyncio
    async def test_get_overview_endpoint(self):
        """Direct call to endpoint logic."""
        from app.api.analytics import get_overview
        mock_db = MagicMock()
        with patch("app.api.analytics.overview_stats", new_callable=AsyncMock) as mock_fn:
            mock_fn.return_value = {
                "total_interactions": 100,
                "today_interactions": 5,
                "faq_hit_rate": 0.2,
                "avg_sentiment_score": 0.8,
                "avg_latency_ms": 1000.0,
                "unique_sessions": 80,
                "voice_ratio": 0.1,
            }
            result = await get_overview(start_date="2024-01-01", end_date="2024-01-31", db=mock_db)
            assert result["total_interactions"] == 100
            mock_fn.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_trends_endpoint(self):
        from app.api.analytics import get_trends
        mock_db = MagicMock()
        with patch("app.api.analytics.trend_stats", new_callable=AsyncMock) as mock_fn:
            mock_fn.return_value = {"days": 7, "trends": []}
            result = await get_trends(days=7, db=mock_db)
            assert result["days"] == 7

    def test_get_overview_route(self):
        """Test route registration via TestClient."""
        with patch("app.api.analytics.overview_stats", new_callable=AsyncMock) as mock_fn:
            mock_fn.return_value = {
                "total_interactions": 0,
                "today_interactions": 0,
                "faq_hit_rate": 0.0,
                "avg_sentiment_score": 0.0,
                "avg_latency_ms": 0.0,
                "unique_sessions": 0,
                "voice_ratio": 0.0,
            }
            response = client.get("/api/analytics/overview")
            assert response.status_code == 200
            data = response.json()
            assert "total_interactions" in data

    def test_get_trends_route(self):
        with patch("app.api.analytics.trend_stats", new_callable=AsyncMock) as mock_fn:
            mock_fn.return_value = {"days": 7, "trends": []}
            response = client.get("/api/analytics/trends?days=7")
            assert response.status_code == 200

    def test_get_realtime_route(self):
        with patch("app.api.analytics.realtime_logs", new_callable=AsyncMock) as mock_fn:
            mock_fn.return_value = {"recent": []}
            response = client.get("/api/analytics/realtime?limit=10")
            assert response.status_code == 200

    def test_invalid_date_params(self):
        """Invalid query params should not crash (graceful handling)."""
        with patch("app.api.analytics.overview_stats", new_callable=AsyncMock) as mock_fn:
            mock_fn.return_value = {
                "total_interactions": 0,
                "today_interactions": 0,
                "faq_hit_rate": 0.0,
                "avg_sentiment_score": 0.0,
                "avg_latency_ms": 0.0,
                "unique_sessions": 0,
                "voice_ratio": 0.0,
            }
            response = client.get("/api/analytics/overview?start_date=invalid")
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_record_mobile_event_accepts_queued_shape(self):
        """Mobile queued event shape should be normalized into MobileTourEvent."""
        from app.api.analytics import MobileTourEventRequest, record_mobile_tour_event

        mock_db = MagicMock()
        async def flush_with_id():
            mock_db.add.call_args.args[0].id = 99

        mock_db.flush = AsyncMock(side_effect=flush_with_id)
        mock_db.commit = AsyncMock()
        mock_db.rollback = AsyncMock()

        payload = MobileTourEventRequest(
            id="client-event-1",
            name="spot_arrived",
            session_id="mobile-session-1",
            timestamp="2026-07-02T10:00:00.000Z",
            fields={
                "spotId": "ling-shan-da-fo",
                "spotName": "灵山大佛",
                "sourcePage": "route-detail",
                "durationMs": 1200,
                "completed": True,
            },
        )

        response = await record_mobile_tour_event(payload, db=mock_db)
        event = mock_db.add.call_args.args[0]

        assert response.status == "ok"
        assert event.event_name == "spot_arrived"
        assert event.spot_id == "ling-shan-da-fo"
        assert event.spot_name == "灵山大佛"
        assert event.source_page == "route-detail"
        assert event.duration_ms == 1200
        assert event.completed is True
        assert event.metadata_json["client_event_id"] == "client-event-1"

    @pytest.mark.asyncio
    async def test_record_mobile_event_batch_skips_invalid_rows(self):
        """Batch upload should persist valid rows and report invalid rows."""
        from app.api.analytics import MobileTourEventRequest, record_mobile_tour_events_batch

        mock_db = MagicMock()
        async def flush_with_ids():
            for index, call in enumerate(mock_db.add.call_args_list, start=1):
                call.args[0].id = index

        mock_db.flush = AsyncMock(side_effect=flush_with_ids)
        mock_db.commit = AsyncMock()
        mock_db.rollback = AsyncMock()

        response = await record_mobile_tour_events_batch(
            [
                MobileTourEventRequest(name="tour_started", session_id="s1"),
                MobileTourEventRequest(session_id="s1"),
            ],
            db=mock_db,
        )

        assert response.status == "partial"
        assert response.inserted == 1
        assert response.skipped == 1
        assert response.errors[0]["index"] == 1
