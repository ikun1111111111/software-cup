"""DNA clustering service: compute tourist DNA profile from behavior data."""
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.behavior import TouristBehavior

logger = logging.getLogger(__name__)

_DEFAULT_DNA: dict[str, Any] = {
    "dna_type": "未分类",
    "dna_scores": {
        "culture": 0.5,
        "nature": 0.5,
        "food": 0.5,
        "social": 0.5,
        "economy": 0.5,
        "leisure": 0.5,
    },
}

_TYPE_LABELS = {
    "culture": "文化",
    "nature": "自然",
    "food": "美食",
    "social": "社交",
    "economy": "经济",
    "leisure": "休闲",
}


def _safe_mean(values: list[float | None]) -> float:
    clean = [v for v in values if v is not None]
    return sum(clean) / len(clean) if clean else 0.0


async def compute_dna_profile(tourist_id: str, db: AsyncSession) -> dict[str, Any]:
    """Compute 6-dimension DNA profile for a tourist based on behavior data."""
    stmt = select(TouristBehavior).where(TouristBehavior.tourist_id == tourist_id)
    result = await db.execute(stmt)
    behaviors = list(result.scalars().all())

    if not behaviors:
        return _DEFAULT_DNA.copy()

    avg_cost = _safe_mean([b.costs for b in behaviors])
    avg_stay = _safe_mean([b.stay_duration_minutes for b in behaviors])
    visit_count = len(behaviors)
    avg_companion = _safe_mean([b.companion_count for b in behaviors])
    avg_satisfaction = _safe_mean([b.satisfaction_score for b in behaviors])
    unique_attractions = len({b.attraction_name for b in behaviors if b.attraction_name})

    # 6-dimension scoring (0-1)
    culture = min(1.0, (avg_satisfaction / 5) * 0.4 + (avg_stay / 300) * 0.3 + min(visit_count / 20, 1.0) * 0.3)
    nature = min(1.0, min(unique_attractions / 10, 1.0) * 0.5 + min(avg_cost / 500, 1.0) * 0.5)
    food = min(1.0, avg_cost / 1000)
    social = min(1.0, avg_companion / 5)
    economy = max(0.0, 1.0 - avg_cost / 1000)
    leisure = min(1.0, (avg_stay / 300) * 0.5 + (avg_satisfaction / 5) * 0.5)

    scores = {
        "culture": round(culture, 2),
        "nature": round(nature, 2),
        "food": round(food, 2),
        "social": round(social, 2),
        "economy": round(economy, 2),
        "leisure": round(leisure, 2),
    }

    # Determine DNA type based on top 2 dimensions
    sorted_dims = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top2 = [d[0] for d in sorted_dims[:2]]
    dna_type = f"{_TYPE_LABELS[top2[0]]}型{_TYPE_LABELS[top2[1]]}倾向"

    return {
        "dna_type": dna_type,
        "dna_scores": scores,
    }
