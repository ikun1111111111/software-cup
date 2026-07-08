"""智能路线规划服务：基于用户偏好和时间预算生成个性化游览路线。

支持三种策略：
- recommended: 综合推荐（偏好匹配 + 距离效率 + 热门度平衡）
- fast: 快速游览（距离优先，核心景点精简）
- deep: 深度游览（更多景点，偏好深度体验）
"""
import json
import math
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 数据文件路径
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_SPOTS_FILE = _DATA_DIR / "ling_sheng_jing_spots.json"
_ROUTES_FILE = _DATA_DIR / "ling_sheng_jing_routes.json"

# 策略配置
STRATEGY_CONFIG = {
    "recommended": {
        "name": "综合推荐路线",
        "max_spots": 6,
        "min_spots": 4,
        "weights": {"preference": 0.4, "distance": 0.35, "popularity": 0.25},
        "duration_label": "约3-4小时",
    },
    "fast": {
        "name": "快速游览路线",
        "max_spots": 4,
        "min_spots": 3,
        "weights": {"preference": 0.2, "distance": 0.6, "popularity": 0.2},
        "duration_label": "约1.5-2小时",
    },
    "deep": {
        "name": "深度体验路线",
        "max_spots": 9,
        "min_spots": 6,
        "weights": {"preference": 0.5, "distance": 0.2, "popularity": 0.3},
        "duration_label": "约5-6小时",
    },
}

# 景点热门度权重（核心景点 > 其他）
CATEGORY_POPULARITY = {
    "核心景点": 1.0,
    "文化景点": 0.8,
    "休闲景点": 0.6,
    "生态景点": 0.5,
}

# 缓存
_spots_cache: Optional[list[dict]] = None


def _load_spots() -> list[dict]:
    """加载景点数据（带缓存）。"""
    global _spots_cache
    if _spots_cache is not None:
        return _spots_cache

    try:
        with open(_SPOTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _spots_cache = data.get("spots", [])
        logger.info("Loaded %d spots for route planning", len(_spots_cache))
        return _spots_cache
    except Exception as e:
        logger.error("Failed to load spots: %s", e)
        return []


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine 距离（米）。"""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _preference_score(spot: dict, preferred_tags: list[str]) -> float:
    """景点偏好匹配分（0-1）。"""
    if not preferred_tags:
        return 0.5
    tags = spot.get("tags", [])
    if not tags:
        return 0.0
    overlap = len(set(tags) & set(preferred_tags))
    return min(overlap / max(len(preferred_tags), 1), 1.0)


def _popularity_score(spot: dict) -> float:
    """景点热门度分（0-1）。"""
    cat = spot.get("category", "")
    base = CATEGORY_POPULARITY.get(cat, 0.5)
    # 有关联景点的加分
    related = spot.get("related_spots", [])
    bonus = min(len(related) * 0.05, 0.2)
    return min(base + bonus, 1.0)


def _greedy_nearest_neighbor(
    candidates: list[dict], max_spots: int, start_lat: float = 31.4243, start_lon: float = 120.0952
) -> list[dict]:
    """贪心最近邻算法：从起始点出发，每次选最近的未访问景点。"""
    if not candidates:
        return []

    remaining = list(candidates)
    ordered = []
    cur_lat, cur_lon = start_lat, start_lon

    while remaining and len(ordered) < max_spots:
        best_idx = 0
        best_dist = float("inf")
        for i, spot in enumerate(remaining):
            slat = spot.get("latitude", cur_lat)
            slon = spot.get("longitude", cur_lon)
            d = haversine(cur_lat, cur_lon, slat, slon)
            if d < best_dist:
                best_dist = d
                best_idx = i
        chosen = remaining.pop(best_idx)
        ordered.append(chosen)
        cur_lat = chosen.get("latitude", cur_lat)
        cur_lon = chosen.get("longitude", cur_lon)

    return ordered


def _score_and_select(
    spots: list[dict],
    strategy: str,
    preferred_tags: list[str],
) -> list[dict]:
    """根据策略评分并选择景点。"""
    cfg = STRATEGY_CONFIG[strategy]
    w = cfg["weights"]

    scored = []
    for spot in spots:
        pref = _preference_score(spot, preferred_tags)
        pop = _popularity_score(spot)
        # 距离分在选完后统一优化，这里给默认值
        score = w["preference"] * pref + w["popularity"] * pop + w["distance"] * 0.5
        scored.append((score, spot))

    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [s for _, s in scored[: cfg["max_spots"]]]

    # 确保最少景点数
    if len(selected) < cfg["min_spots"]:
        for _, s in scored[cfg["min_spots"]:]:
            if s not in selected:
                selected.append(s)
            if len(selected) >= cfg["min_spots"]:
                break

    return selected


def _compute_total_distance(route_spots: list[dict]) -> float:
    """计算路线总距离（米）。"""
    total = 0.0
    for i in range(len(route_spots) - 1):
        s1 = route_spots[i]
        s2 = route_spots[i + 1]
        total += haversine(
            s1.get("latitude", 0), s1.get("longitude", 0),
            s2.get("latitude", 0), s2.get("longitude", 0),
        )
    return total


async def plan_routes(
    preferred_tags: list[str] | None = None,
    time_budget_hours: float | None = None,
) -> list[dict]:
    """生成3条差异化路线。

    Args:
        preferred_tags: 用户偏好标签列表，如 ["佛教造像", "拍照", "表演"]。
        time_budget_hours: 时间预算（小时），用于过滤不合适的路线。

    Returns:
        3条路线的列表，每条包含 id/name/type/duration/description/spots/total_distance。
    """
    all_spots = _load_spots()
    if not all_spots:
        return []

    tags = preferred_tags or []
    results = []

    for strategy_key, cfg in STRATEGY_CONFIG.items():
        # 选择景点
        selected = _score_and_select(all_spots, strategy_key, tags)

        # 贪心最近邻优化路线顺序
        ordered = _greedy_nearest_neighbor(selected, cfg["max_spots"])

        # 计算总距离
        total_dist = _compute_total_distance(ordered)

        # 时间预算过滤：估算每小时约走3个景点
        estimated_hours = len(ordered) / 3.0
        if time_budget_hours and estimated_hours > time_budget_hours * 1.2:
            # 超预算则裁剪
            ordered = ordered[: max(int(time_budget_hours * 3), cfg["min_spots"])]
            total_dist = _compute_total_distance(ordered)

        spot_names = [s["name"] for s in ordered]
        route = {
            "id": f"smart_{strategy_key}",
            "name": cfg["name"],
            "type": strategy_key,
            "duration": cfg["duration_label"],
            "description": f"智能规划{cfg['name']}，沿途经过：{' → '.join(spot_names)}。总步行约{total_dist / 1000:.1f}公里。",
            "spots": ordered,
            "spot_ids": [s["id"] for s in ordered],
            "total_distance_m": round(total_dist),
        }
        results.append(route)

    return results
