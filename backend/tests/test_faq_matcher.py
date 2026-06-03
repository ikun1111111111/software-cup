"""Tests for FAQ matcher (exact + fuzzy matching)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.faq_matcher import search_faq, get_faq_by_id
from app.models.knowledge import FaqEntry


class MockFaq:
    """Mock FAQ entry for testing."""

    def __init__(self, id, question, answer, keywords=None, hit_count=0):
        self.id = id
        self.question = question
        self.answer = answer
        self.keywords = keywords or ""
        self.hit_count = hit_count
        self.is_active = True


class TestSearchFaq:
    """Test FAQ search matching."""

    @pytest.mark.asyncio
    async def test_exact_match(self):
        """Exact question match should return FAQ and update hit_count."""
        mock_faq = MockFaq(1, "灵山大佛多高？", "88米", hit_count=5)
        mock_db = MagicMock()
        mock_db.commit = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_faq
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await search_faq("灵山大佛多高？", mock_db)
        assert result is not None
        assert result["faq_id"] == 1
        assert result["source"] == "faq"
        assert result["answer"] == "88米"
        assert mock_faq.hit_count == 6
        mock_db.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_partial_match(self):
        """Partial text match via ILIKE should work."""
        mock_faq = MockFaq(2, "灵山胜境在哪里？", "无锡", hit_count=0)
        mock_db = MagicMock()
        mock_db.commit = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_faq
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await search_faq("灵山胜境", mock_db)
        assert result is not None
        assert result["faq_id"] == 2

    @pytest.mark.asyncio
    async def test_keyword_fuzzy_match(self):
        """Keyword fuzzy match via jieba should find FAQ."""
        mock_faq = MockFaq(3, "门票多少钱？", "210元", keywords="门票,价格,多少钱", hit_count=0)
        mock_db = MagicMock()
        mock_db.commit = AsyncMock()
        # First query (exact) returns None
        first_result = MagicMock()
        first_result.scalar_one_or_none.return_value = None
        # Second query (keyword) returns FAQ list
        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = [mock_faq]
        mock_db.execute = AsyncMock(side_effect=[first_result, second_result])

        result = await search_faq("门票价格是多少？", mock_db)
        assert result is not None
        assert result["faq_id"] == 3
        assert result["source"] == "faq_fuzzy"
        assert mock_faq.hit_count == 1

    @pytest.mark.asyncio
    async def test_no_match(self):
        """No match should return None."""
        mock_db = MagicMock()
        first_result = MagicMock()
        first_result.scalar_one_or_none.return_value = None
        second_result = MagicMock()
        second_result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(side_effect=[first_result, second_result])

        result = await search_faq("完全不相关的问题", mock_db)
        assert result is None

    @pytest.mark.asyncio
    async def test_empty_input(self):
        """Empty input should return None immediately."""
        mock_db = MagicMock()
        result = await search_faq("", mock_db)
        assert result is None
        assert not mock_db.execute.called

    @pytest.mark.asyncio
    async def test_empty_input_whitespace(self):
        """Whitespace-only input should return None."""
        mock_db = MagicMock()
        result = await search_faq("   ", mock_db)
        assert result is None


class TestGetFaqById:
    """Test get FAQ by ID."""

    @pytest.mark.asyncio
    async def test_found(self):
        mock_faq = MockFaq(1, "Q", "A")
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_faq
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await get_faq_by_id(1, mock_db)
        assert result == mock_faq

    @pytest.mark.asyncio
    async def test_not_found(self):
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await get_faq_by_id(999, mock_db)
        assert result is None
