"""Collaborative filtering service: simplified UserCF based on satisfaction scores."""
import logging
import math
from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.behavior import TouristBehavior

logger = logging.getLogger(__name__)


async def collaborative_filter_recommend(
    tourist_id: str,
    db: AsyncSession,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Simple UserCF: recommend attractions that similar users liked.

    Builds a user-attraction rating matrix from satisfaction scores,
    computes cosine similarity between users, and recommends attractions
    liked by similar users but not yet visited by the target user.
    """
    stmt = select(TouristBehavior)
    result = await db.execute(stmt)
    all_behaviors = list(result.scalars().all())

    if not all_behaviors:
        return []

    # Build user-attraction rating matrix
    user_ratings: dict[str, dict[str, float]] = defaultdict(dict)
    for b in all_behaviors:
        if b.attraction_name:
            user_ratings[b.tourist_id][b.attraction_name] = b.satisfaction or 3.0

    if tourist_id not in user_ratings:
        return []

    target_ratings = user_ratings[tourist_id]

    # Compute cosine similarity with other users
    similarities: list[tuple[str, float]] = []
    for other_id, other_ratings in user_ratings.items():
        if other_id == tourist_id:
            continue
        common = set(target_ratings.keys()) & set(other_ratings.keys())
        if not common:
            continue
        dot = sum(target_ratings[a] * other_ratings[a] for a in common)
        norm_target = math.sqrt(sum(r ** 2 for r in target_ratings.values()))
        norm_other = math.sqrt(sum(r ** 2 for r in other_ratings.values()))
        if norm_target == 0 or norm_other == 0:
            continue
        sim = dot / (norm_target * norm_other)
        if sim > 0:
            similarities.append((other_id, sim))

    similarities.sort(key=lambda x: x[1], reverse=True)
    top_similar = similarities[:10]

    # Recommend attractions liked by similar users but not visited by target
    candidates: dict[str, float] = defaultdict(float)
    for other_id, sim in top_similar:
        for attr, score in user_ratings[other_id].items():
            if attr not in target_ratings:
                candidates[attr] += sim * score

    sorted_candidates = sorted(candidates.items(), key=lambda x: x[1], reverse=True)
    return [{"attraction": a, "score": round(s, 3)} for a, s in sorted_candidates[:limit]]
