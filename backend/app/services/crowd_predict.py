"""Crowd prediction service — time-series forecasting for scenic spot visitor flow."""
import logging
from datetime import datetime, timedelta, date
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.behavior import TouristBehavior, SpotStatistics

logger = logging.getLogger(__name__)

# Crowd level thresholds
CROWD_LOW = 50
CROWD_MEDIUM = 150
# above CROWD_MEDIUM is "crowded"


async def get_crowd_prediction(
    db: AsyncSession,
    attraction_name: str | None = None,
    target_date: date | None = None,
) -> dict:
    """Predict crowd levels for scenic spots.

    Uses historical averages + day-of-week adjustment as a lightweight
    Prophet-like model. Returns per-spot crowd predictions by hour.
    """
    if target_date is None:
        target_date = date.today()

    day_of_week = target_date.weekday()  # 0=Mon, 6=Sun
    is_weekend = day_of_week >= 5

    # Base query: aggregate hourly visitor counts per attraction
    stmt = (
        select(
            TouristBehavior.attraction_name,
            TouristBehavior.visit_hour,
            func.count(TouristBehavior.id).label("visitor_count"),
            func.avg(TouristBehavior.satisfaction_score).label("avg_satisfaction"),
        )
        .group_by(TouristBehavior.attraction_name, TouristBehavior.visit_hour)
        .order_by(TouristBehavior.attraction_name, TouristBehavior.visit_hour)
    )
    if attraction_name:
        stmt = stmt.where(TouristBehavior.attraction_name == attraction_name)

    result = await db.execute(stmt)
    rows = result.all()

    # Build prediction map: {spot: {hour: predicted_count}}
    predictions: dict[str, list[dict]] = {}
    for row in rows:
        spot = row.attraction_name
        hour = row.visit_hour or 10
        base_count = row.visitor_count

        # Weekend/holiday multiplier
        multiplier = 1.4 if is_weekend else 1.0

        # Time-of-day curve: peak at 10-11 and 14-15
        if hour in (10, 11, 14, 15):
            time_factor = 1.3
        elif hour in (9, 12, 13, 16):
            time_factor = 1.0
        elif hour in (8, 17):
            time_factor = 0.7
        else:
            time_factor = 0.3

        predicted = int(base_count * multiplier * time_factor)

        if predicted < CROWD_LOW:
            level = "low"
            emoji = "🟢"
        elif predicted < CROWD_MEDIUM:
            level = "medium"
            emoji = "🟡"
        else:
            level = "high"
            emoji = "🔴"

        predictions.setdefault(spot, []).append({
            "hour": hour,
            "predicted_visitors": predicted,
            "crowd_level": level,
            "emoji": emoji,
        })

    # If no data, generate reasonable defaults for known spots
    if not predictions:
        default_spots = [
            "灵山大佛", "灵山梵宫", "九龙灌浴", "五印坛城",
            "祥符禅寺", "佛手广场", "百子戏弥勒",
        ]
        for spot in default_spots:
            if attraction_name and spot != attraction_name:
                continue
            predictions[spot] = _generate_default_hours(is_weekend)

    return {
        "target_date": target_date.isoformat(),
        "is_weekend": is_weekend,
        "predictions": predictions,
    }


async def get_best_time(
    db: AsyncSession,
    attraction_name: str,
    target_date: date | None = None,
) -> dict:
    """Recommend the best visiting time for a scenic spot."""
    data = await get_crowd_prediction(db, attraction_name, target_date)
    hours = data["predictions"].get(attraction_name, [])

    if not hours:
        return {
            "attraction_name": attraction_name,
            "best_time": "10:00-12:00",
            "reason": "数据不足，推荐上午游览",
            "hourly": [],
        }

    # Sort by predicted visitors ascending
    sorted_hours = sorted(hours, key=lambda h: h["predicted_visitors"])
    best = sorted_hours[:3]

    start_hour = min(h["hour"] for h in best)
    end_hour = max(h["hour"] for h in best) + 1

    return {
        "attraction_name": attraction_name,
        "best_time": f"{start_hour:02d}:00-{end_hour:02d}:00",
        "reason": f"预计此时段客流最少，游览体验最佳",
        "hourly": hours,
    }


async def get_crowd_alerts(
    db: AsyncSession,
    threshold: int = CROWD_MEDIUM,
    target_date: date | None = None,
) -> dict:
    """Get crowd alerts — spots predicted to exceed threshold."""
    data = await get_crowd_prediction(db, target_date=target_date)
    alerts = []

    for spot, hours in data["predictions"].items():
        peak_hours = [h for h in hours if h["predicted_visitors"] >= threshold]
        if peak_hours:
            peak_hour_list = sorted(set(h["hour"] for h in peak_hours))
            alerts.append({
                "attraction_name": spot,
                "level": "warning" if any(h["predicted_visitors"] >= CROWD_MEDIUM * 2 for h in peak_hours) else "info",
                "peak_hours": peak_hour_list,
                "max_predicted": max(h["predicted_visitors"] for h in peak_hours),
                "suggestion": f"建议避开 {'、'.join(f'{h}:00' for h in peak_hour_list[:3])} 时段",
            })

    return {
        "target_date": data["target_date"],
        "threshold": threshold,
        "alerts": alerts,
        "total_alerts": len(alerts),
    }


def _generate_default_hours(is_weekend: bool) -> list[dict]:
    """Generate default hourly predictions when no historical data exists."""
    base = 80 if is_weekend else 50
    hours = []
    for h in range(8, 18):
        if h in (10, 11, 14, 15):
            count = int(base * 1.5)
        elif h in (9, 12, 13, 16):
            count = base
        else:
            count = int(base * 0.4)

        if count < CROWD_LOW:
            level, emoji = "low", "🟢"
        elif count < CROWD_MEDIUM:
            level, emoji = "medium", "🟡"
        else:
            level, emoji = "high", "🔴"

        hours.append({
            "hour": h,
            "predicted_visitors": count,
            "crowd_level": level,
            "emoji": emoji,
        })
    return hours
