"""Tests for fact checker."""
import pytest
from unittest.mock import patch, AsyncMock

from app.core.fact_checker import verify_facts


class TestFactChecker:
    """Test fact verification logic."""

    @pytest.mark.asyncio
    async def test_verify_facts_consistent(self):
        """Should return True when answer matches context."""
        with patch("app.core.fact_checker.route", new_callable=AsyncMock) as mock_route:
            mock_route.return_value = "YES\n回答与资料完全一致。"
            ok, reasoning = await verify_facts(
                question="灵山大佛多高？",
                answer="88米",
                context="灵山大佛高88米，是中国最高的青铜立佛。",
            )
            assert ok is True
            assert "一致" in reasoning

    @pytest.mark.asyncio
    async def test_verify_facts_inconsistent(self):
        """Should return False when answer contradicts context."""
        with patch("app.core.fact_checker.route", new_callable=AsyncMock) as mock_route:
            mock_route.return_value = "NO\n资料说88米，回答说是100米。"
            ok, reasoning = await verify_facts(
                question="灵山大佛多高？",
                answer="100米",
                context="灵山大佛高88米。",
            )
            assert ok is False
            assert "资料" in reasoning

    @pytest.mark.asyncio
    async def test_verify_facts_uncertain(self):
        """Should return True with uncertain note for unclear results."""
        with patch("app.core.fact_checker.route", new_callable=AsyncMock) as mock_route:
            mock_route.return_value = "UNCERTAIN\n资料没有提到具体数字。"
            ok, reasoning = await verify_facts(
                question="梵宫有多大？",
                answer="很大",
                context="梵宫是灵山胜境的标志性建筑。",
            )
            assert ok is True
            assert "不足以" in reasoning

    @pytest.mark.asyncio
    async def test_verify_empty_context(self):
        """Should skip verification when no context provided."""
        ok, reasoning = await verify_facts(
            question="anything",
            answer="anything",
            context="",
        )
        assert ok is True
        assert "跳过" in reasoning

    @pytest.mark.asyncio
    async def test_verify_service_failure(self):
        """Should fail-open when LLM service fails."""
        with patch("app.core.fact_checker.route", new_callable=AsyncMock) as mock_route:
            mock_route.side_effect = Exception("LLM timeout")
            ok, reasoning = await verify_facts(
                question="test",
                answer="test",
                context="some context",
            )
            assert ok is True
            assert "异常" in reasoning
