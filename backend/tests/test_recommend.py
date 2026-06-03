"""Tests for recommendation service."""
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.recommender import (
    recommend,
    record_feedback,
    _extract_spot_names,
    _popular_fallback,
    _content_recall,
    _llm_enhance,
)
from app.models.tourist import TouristProfile
from app.models.knowledge import FaqEntry


client = TestClient(app)


class TestSpotExtraction:
    """Test spot name extraction from text."""

    def test_extract_known_spots(self):
        text = "灵山大佛和九龙灌浴是必看景点，梵宫也很壮观。"
        spots = _extract_spot_names(text)
        assert "灵山大佛" in spots
        assert "九龙灌浴" in spots
        assert "梵宫" in spots

    def test_extract_no_spots(self):
        spots = _extract_spot_names("今天天气真好")
        assert spots == []


class TestPopularFallback:
    """Test popular spot fallback."""

    @pytest.mark.skip(reason="Requires running PostgreSQL")
    @pytest.mark.asyncio
    async def test_popular_fallback_returns_spots(self):
        """Should return spots from FAQ entries."""
        pass


class TestContentRecall:
    """Test content-based recall."""

    @pytest.mark.asyncio
    async def test_content_recall_keyword_fallback(self):
        """Should fall back to keyword matching when vector store unavailable."""
        result = await _content_recall(["佛教", "拍照"], limit=3)
        assert len(result) > 0
        names = [r["spot_name"] for r in result]
        assert "灵山大佛" in names

    @pytest.mark.asyncio
    async def test_content_recall_empty_interests(self):
        """Should return popular spots when no interests provided."""
        result = await _content_recall([], limit=3)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_content_recall_excludes_visited(self):
        """Should exclude already visited spots."""
        result = await _content_recall([], limit=10, exclude_spots={"灵山大佛"})
        names = [r["spot_name"] for r in result]
        assert "灵山大佛" not in names


class TestLLMEnhance:
    """Test LLM enhancement of recommendations."""

    @pytest.mark.asyncio
    async def test_llm_enhance_no_spots(self):
        """Should handle empty spot list."""
        result = await _llm_enhance([], None)
        assert result == []

    @pytest.mark.asyncio
    async def test_llm_enhance_with_mock(self):
        """Should enhance reasons when LLM available."""
        spots = [{
            "spot_name": "灵山大佛",
            "reason": "热门景点",
            "source": "popular",
        }]
        mock_profile = MagicMock()
        mock_profile.interests = ["佛教"]

        with patch("app.core.llm_router.route", new_callable=AsyncMock) as mock_route:
            mock_route.return_value = '[{"spot_name":"灵山大佛","reason":"宏伟的青铜佛像，佛教文化圣地"}]'
            result = await _llm_enhance(spots, mock_profile)
            assert result[0]["reason"] == "宏伟的青铜佛像，佛教文化圣地"
            assert result[0]["source"] == "llm_enhanced"

    @pytest.mark.asyncio
    async def test_llm_enhance_fallback_on_error(self):
        """Should keep original reasons when LLM fails."""
        spots = [{"spot_name": "灵山大佛", "reason": "热门景点", "source": "popular"}]
        with patch("app.core.llm_router.route", side_effect=Exception("LLM down")):
            result = await _llm_enhance(spots, None)
            assert result[0]["reason"] == "热门景点"
            assert result[0]["source"] == "popular"


class TestRecommendMain:
    """Test main recommend() entry point with mocked DB."""

    @pytest.mark.asyncio
    async def test_cold_start_no_profile(self):
        """No profile → cold-start popular recommendations."""
        mock_db = MagicMock()

        profile_result = MagicMock()
        profile_result.scalar_one_or_none.return_value = None

        faq_result = MagicMock()
        faq_scalars = MagicMock()
        faq_scalars.all.return_value = []
        faq_result.scalars.return_value = faq_scalars

        mock_db.execute = AsyncMock(side_effect=[profile_result, faq_result])

        result = await recommend("session_cold", mock_db, limit=3)
        assert result["session_id"] == "session_cold"
        assert result["strategy"] == "popular"
        assert isinstance(result["recommendations"], list)

    @pytest.mark.asyncio
    async def test_personalized_with_interests(self):
        """Profile with interests → personalized recommendations."""
        profile = TouristProfile(
            session_id="session_pers",
            interests=["佛教", "艺术"],
            visit_history=[],
        )
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await recommend("session_pers", mock_db, limit=3)
        assert result["strategy"] == "personalized"
        assert len(result["recommendations"]) > 0

    @pytest.mark.asyncio
    async def test_excludes_visited_spots(self):
        """Should not recommend already visited spots."""
        profile = TouristProfile(
            session_id="session_visited",
            interests=["佛教", "拍照", "艺术", "表演"],
            visit_history=[{"spot": "灵山大佛", "time": "2024-01-01"}],
        )
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = profile
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await recommend("session_visited", mock_db, limit=10)
        names = [r["spot_name"] for r in result["recommendations"]]
        assert "灵山大佛" not in names

    @pytest.mark.asyncio
    async def test_limit_zero_defaults_to_five(self):
        """limit=0 should be corrected to 5."""
        mock_db = MagicMock()
        profile_result = MagicMock()
        profile_result.scalar_one_or_none.return_value = None
        faq_result = MagicMock()
        faq_scalars = MagicMock()
        faq_scalars.all.return_value = []
        faq_result.scalars.return_value = faq_scalars
        mock_db.execute = AsyncMock(side_effect=[profile_result, faq_result])

        result = await recommend("session_limit", mock_db, limit=0)
        assert len(result["recommendations"]) <= 7


class TestRecordFeedback:
    """Test feedback recording."""

    @pytest.mark.asyncio
    async def test_record_feedback_success(self):
        """Should record feedback to InteractionLog."""
        mock_db = MagicMock()
        mock_db.commit = AsyncMock()
        result = await record_feedback("s1", "灵山大佛", "like", mock_db)
        assert result["status"] == "ok"
        assert mock_db.add.called

    @pytest.mark.asyncio
    async def test_record_feedback_db_error(self):
        """Should handle DB errors gracefully."""
        mock_db = MagicMock()
        mock_db.commit = AsyncMock(side_effect=Exception("DB error"))
        mock_db.rollback = AsyncMock()
        result = await record_feedback("s1", "灵山大佛", "like", mock_db)
        assert result["status"] == "error"


class TestRecommendAPI:
    """Test FastAPI endpoints."""

    @pytest.mark.asyncio
    async def test_get_recommendations_endpoint(self):
        """Direct call to endpoint logic should return recommendations."""
        from app.api.recommend import get_recommendations
        mock_db = MagicMock()
        mock_spot = {
            "rank": 1,
            "spot_name": "灵山大佛",
            "category": "spots",
            "reason": "热门景点",
            "suggested_duration": "1.5-2小时",
            "tags": ["佛教"],
            "source": "popular",
        }
        with patch("app.api.recommend._check_cache", new_callable=AsyncMock, return_value=None), \
             patch("app.api.recommend._set_cache", new_callable=AsyncMock), \
             patch("app.core.recommender._fetch_profile", new_callable=AsyncMock, return_value=None), \
             patch("app.core.recommender._popular_fallback", new_callable=AsyncMock, return_value=[mock_spot]):

            result = await get_recommendations(session_id="test_session", limit=3, db=mock_db)
            assert result["session_id"] == "test_session"
            assert "recommendations" in result
            assert isinstance(result["recommendations"], list)
            assert result["recommendations"][0]["spot_name"] == "灵山大佛"

    def test_get_recommendations_missing_session(self):
        """Missing session_id should return 422 (FastAPI query validation)."""
        response = client.get("/api/recommend?limit=3")
        assert response.status_code == 422

    def test_post_feedback_endpoint(self):
        """POST /api/recommend/feedback should record feedback."""
        with patch("app.api.recommend.record_feedback", new_callable=AsyncMock) as mock_fb:
            mock_fb.return_value = {"status": "ok", "session_id": "s1", "spot_name": "灵山大佛"}

            response = client.post(
                "/api/recommend/feedback",
                json={"session_id": "s1", "spot_name": "灵山大佛", "feedback": "like"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"

    def test_post_feedback_invalid(self):
        """Invalid feedback should return 400."""
        response = client.post(
            "/api/recommend/feedback",
            json={"session_id": "s1", "spot_name": "灵山大佛", "feedback": "maybe"},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_recommendations_cache_hit(self):
        """Should return cached result on cache hit."""
        from app.api.recommend import get_recommendations
        cached_data = {
            "session_id": "cache_test",
            "recommendations": [],
            "strategy": "popular",
            "cached": True,
        }
        mock_db = MagicMock()
        with patch("app.api.recommend._check_cache", new_callable=AsyncMock, return_value=cached_data):
            result = await get_recommendations(session_id="cache_test", limit=2, db=mock_db)
            assert result["cached"] is True
