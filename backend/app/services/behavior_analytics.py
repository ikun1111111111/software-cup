import asyncio
import copy
import time
from collections import Counter, defaultdict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.behavior import TouristBehavior


CONSUMPTION_FIELDS = [
    ("ticket_cost", "门票"),
    ("food_cost", "餐饮"),
    ("shopping_cost", "购物文创"),
    ("transport_cost", "交通"),
    ("entertainment_cost", "娱乐其他"),
]

BEHAVIOR_ANALYSIS_CACHE_TTL_SECONDS = 90

_analysis_cache: dict[str, tuple[float, dict]] = {}
_analysis_locks: dict[str, asyncio.Lock] = {}


def invalidate_behavior_analysis_cache() -> None:
    _analysis_cache.clear()


def _clone_payload(data: dict) -> dict:
    return copy.deepcopy(data)


def _get_lock(key: str) -> asyncio.Lock:
    lock = _analysis_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _analysis_locks[key] = lock
    return lock


async def _cached_analysis(key: str, producer) -> dict:
    now = time.monotonic()
    cached = _analysis_cache.get(key)
    if cached and now - cached[0] < BEHAVIOR_ANALYSIS_CACHE_TTL_SECONDS:
        return _clone_payload(cached[1])

    async with _get_lock(key):
        now = time.monotonic()
        cached = _analysis_cache.get(key)
        if cached and now - cached[0] < BEHAVIOR_ANALYSIS_CACHE_TTL_SECONDS:
            return _clone_payload(cached[1])
        result = await producer()
        _analysis_cache[key] = (time.monotonic(), _clone_payload(result))
        return _clone_payload(result)


async def _consumption_analysis_uncached(db: AsyncSession) -> dict:
    sums = [
        func.coalesce(func.sum(getattr(TouristBehavior, field)), 0).label(field)
        for field, _ in CONSUMPTION_FIELDS
    ]
    row = (await db.execute(select(*sums))).mappings().one()
    total = float(sum(row[field] or 0 for field, _ in CONSUMPTION_FIELDS))
    breakdown = [
        {
            "field": field,
            "name": name,
            "value": round(float(row[field] or 0), 2),
            "ratio": round(float(row[field] or 0) / total, 4) if total else 0,
        }
        for field, name in CONSUMPTION_FIELDS
    ]

    month_expr = func.to_char(TouristBehavior.visit_date, "YYYY-MM")
    trend_rows = (
        await db.execute(
            select(
                month_expr.label("month"),
                func.count().label("visits"),
                func.coalesce(func.sum(TouristBehavior.total_cost), 0).label("total_cost"),
                func.coalesce(func.avg(TouristBehavior.total_cost), 0).label("avg_cost"),
            )
            .where(TouristBehavior.visit_date.isnot(None))
            .group_by(month_expr)
            .order_by(month_expr)
            .limit(24)
        )
    ).mappings().all()

    return {
        "total_cost": round(total, 2),
        "breakdown": breakdown,
        "monthly_trend": [
            {
                "month": row["month"],
                "visits": int(row["visits"] or 0),
                "total_cost": round(float(row["total_cost"] or 0), 2),
                "avg_cost": round(float(row["avg_cost"] or 0), 2),
            }
            for row in trend_rows
        ],
    }


async def _route_preference_analysis_uncached(db: AsyncSession, limit: int = 8000) -> dict:
    rows = (
        await db.execute(
            select(
                TouristBehavior.tourist_id,
                TouristBehavior.visit_date,
                TouristBehavior.attraction_name,
                TouristBehavior.id,
            )
            .where(TouristBehavior.attraction_name.isnot(None))
            .order_by(TouristBehavior.tourist_id, TouristBehavior.visit_date, TouristBehavior.id)
            .limit(limit)
        )
    ).all()

    transitions: Counter[tuple[str, str]] = Counter()
    nodes: Counter[str] = Counter()
    last_key: tuple[str, object] | None = None
    last_spot: str | None = None

    for tourist_id, visit_date, attraction_name, _ in rows:
        key = (tourist_id, visit_date)
        nodes[attraction_name] += 1
        if last_key == key and last_spot and last_spot != attraction_name:
            a, b = (last_spot, attraction_name) if last_spot < attraction_name else (attraction_name, last_spot)
            transitions[(a, b)] += 1
        last_key = key
        last_spot = attraction_name

    top_links = transitions.most_common(30)
    active_names = {name for link, _ in top_links for name in link}
    if not active_names:
        active_names = {name for name, _ in nodes.most_common(10)}

    return {
        "nodes": [{"name": name, "value": count} for name, count in nodes.items() if name in active_names],
        "links": [
            {"source": source, "target": target, "value": count}
            for (source, target), count in top_links
        ],
        "top_spots": [{"name": name, "visits": count} for name, count in nodes.most_common(10)],
    }


async def _satisfaction_analysis_uncached(db: AsyncSession) -> dict:
    score_rows = (
        await db.execute(
            select(TouristBehavior.satisfaction, func.count())
            .where(TouristBehavior.satisfaction.isnot(None))
            .group_by(TouristBehavior.satisfaction)
            .order_by(TouristBehavior.satisfaction)
        )
    ).all()
    distribution = [{"score": int(score or 0), "count": int(count or 0)} for score, count in score_rows]

    attraction_rows = (
        await db.execute(
            select(
                TouristBehavior.attraction_name,
                func.count().label("visits"),
                func.coalesce(func.avg(TouristBehavior.satisfaction), 0).label("avg_satisfaction"),
            )
            .where(TouristBehavior.attraction_name.isnot(None))
            .group_by(TouristBehavior.attraction_name)
            .order_by(func.avg(TouristBehavior.satisfaction).desc())
            .limit(12)
        )
    ).mappings().all()

    return {
        "distribution": distribution,
        "by_attraction": [
            {
                "name": row["attraction_name"],
                "visits": int(row["visits"] or 0),
                "avg_satisfaction": round(float(row["avg_satisfaction"] or 0), 2),
            }
            for row in attraction_rows
        ],
    }


async def _behavior_overview_uncached(db: AsyncSession) -> dict:
    row = (
        await db.execute(
            select(
                func.count().label("visits"),
                func.count(func.distinct(TouristBehavior.tourist_id)).label("tourists"),
                func.coalesce(func.sum(TouristBehavior.total_cost), 0).label("total_cost"),
                func.coalesce(func.avg(TouristBehavior.total_cost), 0).label("avg_cost"),
                func.coalesce(func.avg(TouristBehavior.satisfaction), 0).label("avg_satisfaction"),
                func.coalesce(func.avg(TouristBehavior.stay_duration), 0).label("avg_stay_duration"),
            )
        )
    ).mappings().one()

    return {
        "visits": int(row["visits"] or 0),
        "tourists": int(row["tourists"] or 0),
        "total_cost": round(float(row["total_cost"] or 0), 2),
        "avg_cost": round(float(row["avg_cost"] or 0), 2),
        "avg_satisfaction": round(float(row["avg_satisfaction"] or 0), 2),
        "avg_stay_duration": round(float(row["avg_stay_duration"] or 0), 1),
    }


async def _marketing_analysis_uncached(db: AsyncSession) -> dict:
    consumption = await consumption_analysis(db)
    routes = await route_preference_analysis(db)
    satisfaction = await satisfaction_analysis(db)
    overview = await behavior_overview(db)

    top_consumption = None
    if consumption["total_cost"] > 0:
        top_consumption = max(consumption["breakdown"], key=lambda item: item["value"], default=None)
    low_satisfaction = [
        item for item in satisfaction["by_attraction"]
        if item["avg_satisfaction"] < 3.8 and item["visits"] >= 5
    ][:5]
    top_route = routes["links"][0] if routes["links"] else None

    suggestions = []
    if top_consumption:
        suggestions.append(f"消费主力集中在「{top_consumption['name']}」，可围绕该场景设计联票或组合权益。")
    if top_route:
        suggestions.append(f"高频动线为「{top_route['source']} → {top_route['target']}」，适合布置沿线导览与二次消费触点。")
    if low_satisfaction:
        names = "、".join(item["name"] for item in low_satisfaction[:3])
        suggestions.append(f"「{names}」满意度偏低，建议优先排查排队、讲解与服务承接。")
    if not suggestions:
        suggestions.append("当前样本规模有限，建议先补充消费与满意度数据后再生成精细化营销策略。")

    return {
        "persona": {
            "label": "高意愿体验型游客" if overview["avg_cost"] >= 120 else "轻量游览型游客",
            "avg_cost": overview["avg_cost"],
            "avg_stay_duration": overview["avg_stay_duration"],
            "avg_satisfaction": overview["avg_satisfaction"],
        },
        "recommended_route": top_route,
        "risk_spots": low_satisfaction,
        "suggestions": suggestions,
        "source": {
            "consumption": consumption,
            "route_preference": routes,
            "satisfaction": satisfaction,
            "overview": overview,
        },
    }


async def consumption_analysis(db: AsyncSession) -> dict:
    return await _cached_analysis("consumption", lambda: _consumption_analysis_uncached(db))


async def route_preference_analysis(db: AsyncSession, limit: int = 8000) -> dict:
    return await _cached_analysis(
        f"route_preference:{limit}",
        lambda: _route_preference_analysis_uncached(db, limit=limit),
    )


async def satisfaction_analysis(db: AsyncSession) -> dict:
    return await _cached_analysis("satisfaction", lambda: _satisfaction_analysis_uncached(db))


async def behavior_overview(db: AsyncSession) -> dict:
    return await _cached_analysis("overview", lambda: _behavior_overview_uncached(db))


async def marketing_analysis(db: AsyncSession) -> dict:
    return await _cached_analysis("marketing", lambda: _marketing_analysis_uncached(db))
