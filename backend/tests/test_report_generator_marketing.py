from unittest.mock import AsyncMock, patch

import pytest

from app.core.report_generator import generate_marketing_report


@pytest.mark.asyncio
async def test_generate_marketing_report_returns_archive_payload_shape():
    mock_db = AsyncMock()
    summary = {
        "days": 7,
        "total_events": 12,
        "active_sessions": 4,
        "route_starts": 3,
        "route_completions": 2,
        "route_completion_rate": 0.6667,
        "routes": [
            {
                "route_id": "route-a",
                "route_name": "Route A",
                "starts": 3,
                "completions": 2,
                "completion_rate": 0.6667,
            }
        ],
        "hot_spots": [
            {"spot_id": "spot-a", "spot_name": "Spot A", "event_count": 5}
        ],
        "preference_distribution": {"mode:deep": 2},
        "recent_events": [],
    }

    with patch(
        "app.core.report_generator.mobile_tour_summary",
        new_callable=AsyncMock,
    ) as mock_summary:
        mock_summary.return_value = summary
        with patch(
            "app.core.report_generator.route",
            new_callable=AsyncMock,
        ) as mock_route:
            mock_route.return_value = "Marketing recommendations"

            result = await generate_marketing_report(mock_db, days=7)

    assert result["content"] == "Marketing recommendations"
    assert result["stats"] == summary
    assert result["period"] == "last 7 days"
    assert "generated_at" in result
    mock_summary.assert_awaited_once_with(mock_db, days=7, limit=8)
    mock_route.assert_awaited_once()
