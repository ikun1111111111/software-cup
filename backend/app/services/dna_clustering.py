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

_CLUSTER_LABELS = [
    "深度文化控",
    "自然探索家",
    "美食体验官",
    "社交活跃派",
    "经济实用型",
    "休闲度假党",
]


def _safe_mean(values: list[float | None]) -> float:
    clean = [v for v in values if v is not None]
    return sum(clean) / len(clean) if clean else 0.0


def _normalize(value: float, min_val: float, max_val: float) -> float:
    if max_val <= min_val:
        return 0.5
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def _rule_based_scores(behaviors: list[TouristBehavior]) -> dict[str, Any]:
    """Fallback rule-based scoring when insufficient data for clustering."""
    avg_cost = _safe_mean([b.costs for b in behaviors])
    avg_stay = _safe_mean([b.stay_duration_minutes for b in behaviors])
    visit_count = len(behaviors)
    avg_companion = _safe_mean([b.companion_count for b in behaviors])
    avg_satisfaction = _safe_mean([b.satisfaction_score for b in behaviors])
    unique_attractions = len({b.attraction_name for b in behaviors if b.attraction_name})

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

    sorted_dims = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top2 = [d[0] for d in sorted_dims[:2]]
    dna_type = f"{_TYPE_LABELS[top2[0]]}型{_TYPE_LABELS[top2[1]]}倾向"

    return {"dna_type": dna_type, "dna_scores": scores}


def _build_features(behaviors: list[TouristBehavior]) -> list[list[float]]:
    """Build feature matrix from behavior records."""
    features = []
    for b in behaviors:
        features.append([
            float(b.costs or 0),
            float(b.stay_duration_minutes or 0),
            float(b.companion_count or 0),
            float(b.satisfaction_score or 0),
            float(len(b.attraction_name or "")),  # proxy for attraction info richness
        ])
    return features


def _kmeans_clustering(all_behaviors: list[TouristBehavior], target_id: str) -> dict[str, Any] | None:
    """Run K-Means clustering and return DNA profile for target tourist."""
    if len(all_behaviors) < 100:
        return None

    try:
        from sklearn.cluster import KMeans
        import numpy as np
    except ImportError:
        logger.warning("scikit-learn not installed, falling back to rule-based")
        return None

    # Group behaviors by tourist_id
    tourist_behaviors: dict[str, list[TouristBehavior]] = {}
    for b in all_behaviors:
        tid = b.tourist_id or "unknown"
        tourist_behaviors.setdefault(tid, []).append(b)

    if target_id not in tourist_behaviors:
        return None

    # Build per-tourist aggregated features
    tourist_ids = []
    feature_matrix = []
    for tid, tbehaviors in tourist_behaviors.items():
        tourist_ids.append(tid)
        avg_cost = _safe_mean([b.costs for b in tbehaviors])
        avg_stay = _safe_mean([b.stay_duration_minutes for b in tbehaviors])
        visit_count = len(tbehaviors)
        avg_companion = _safe_mean([b.companion_count for b in tbehaviors])
        avg_satisfaction = _safe_mean([b.satisfaction_score for b in tbehaviors])
        unique_attractions = len({b.attraction_name for b in tbehaviors if b.attraction_name})

        feature_matrix.append([
            avg_cost,
            avg_stay,
            visit_count,
            avg_companion,
            avg_satisfaction,
            unique_attractions,
        ])

    if len(feature_matrix) < 6:
        return None

    X = np.array(feature_matrix)
    n_clusters = min(6, len(feature_matrix))

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    # Map label index to cluster DNA scores
    cluster_scores: dict[int, dict[str, float]] = {}
    for i, label in enumerate(labels):
        if label not in cluster_scores:
            cluster_scores[label] = {
                "culture": [],
                "nature": [],
                "food": [],
                "social": [],
                "economy": [],
                "leisure": [],
            }
        tid = tourist_ids[i]
        tbehaviors = tourist_behaviors[tid]
        rb = _rule_based_scores(tbehaviors)
        for dim in cluster_scores[label]:
            cluster_scores[label][dim].append(rb["dna_scores"][dim])

    # Compute mean scores per cluster and normalize
    final_cluster_scores: dict[int, dict[str, float]] = {}
    for label, dims in cluster_scores.items():
        final_cluster_scores[label] = {}
        for dim, vals in dims.items():
            final_cluster_scores[label][dim] = round(sum(vals) / len(vals), 2) if vals else 0.5

    # Find target tourist's cluster
    try:
        target_idx = tourist_ids.index(target_id)
    except ValueError:
        return None

    target_label = int(labels[target_idx])
    scores = final_cluster_scores[target_label]

    # Map label to Chinese DNA type name
    dna_type = _CLUSTER_LABELS[target_label % len(_CLUSTER_LABELS)]

    return {
        "dna_type": dna_type,
        "dna_scores": scores,
    }


async def compute_dna_profile(tourist_id: str, db: AsyncSession) -> dict[str, Any]:
    """Compute 6-dimension DNA profile for a tourist based on behavior data."""
    stmt = select(TouristBehavior)
    result = await db.execute(stmt)
    all_behaviors = list(result.scalars().all())

    if not all_behaviors:
        return _DEFAULT_DNA.copy()

    # Try K-Means clustering when data is sufficient
    clustered = _kmeans_clustering(all_behaviors, tourist_id)
    if clustered:
        return clustered

    # Fallback: rule-based scoring using only target tourist's behaviors
    target_behaviors = [b for b in all_behaviors if b.tourist_id == tourist_id]
    if not target_behaviors:
        return _DEFAULT_DNA.copy()

    return _rule_based_scores(target_behaviors)
