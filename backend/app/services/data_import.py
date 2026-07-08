"""Excel behavior data import service — imports 140,447 tourist behavior records.

Parses the 17-column Excel file, cleans data, performs batch inserts,
and computes pre-aggregated statistics for the analytics dashboard.
"""
import logging
from datetime import datetime, date
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.behavior import TouristBehavior, SpotStatistics
from app.core.database import async_session

logger = logging.getLogger(__name__)

# Expected Excel path relative to project root
EXCEL_PATH = Path(__file__).parent.parent.parent.parent / "docs" / "景点景区旅游数据行为分析数据.xlsx"

# Expected 17 columns in the Excel file
EXPECTED_COLUMNS = [
    "tourist_id",
    "user_nickname",
    "age",
    "gender",
    "attraction_name",
    "attraction_content",
    "attraction_type",
    "visit_date",
    "stay_duration",
    "ticket_cost",
    "food_cost",
    "shopping_cost",
    "transport_cost",
    "entertainment_cost",
    "total_cost",
    "group_size",
    "satisfaction",
]

# Batch size for database inserts
BATCH_SIZE = 5000


def _parse_date(value) -> Optional[date]:
    """Parse date from various formats (datetime, string, etc.)."""
    if value is None or pd.isna(value):
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return pd.to_datetime(value).date()
    except Exception:
        return None


def _parse_float(value, default: float = 0.0) -> float:
    """Safely parse float value."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _parse_int(value, default: int = 0) -> int:
    """Safely parse int value."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _parse_bool(value, default: bool = False) -> bool:
    """Safely parse boolean value."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.lower() in ("true", "1", "yes", "是")
    return default


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Rename Chinese/similar column names to expected English names."""
    column_mapping = {
        # Chinese → English
        "游客ID": "tourist_id",
        "游客id": "tourist_id",
        "用户昵称": "user_nickname",
        "游客昵称": "user_nickname",
        "昵称": "user_nickname",
        "年龄": "age",
        "性别": "gender",
        "景点名称": "attraction_name",
        "景点": "attraction_name",
        "景点内容": "attraction_content",
        "景点介绍": "attraction_content",
        "景点类型": "attraction_type",
        "景点类别": "attraction_type",
        "访问日期": "visit_date",
        "游览日期": "visit_date",
        "日期": "visit_date",
        "停留时长(分钟)": "stay_duration",
        "停留时长": "stay_duration",
        "游览时长": "stay_duration",
        "门票消费": "ticket_cost",
        "门票花费": "ticket_cost",
        "门票费用": "ticket_cost",
        "餐饮消费": "food_cost",
        "餐饮花费": "food_cost",
        "餐饮费用": "food_cost",
        "美食消费": "food_cost",
        "文创消费": "shopping_cost",
        "购物消费": "shopping_cost",
        "纪念品消费": "shopping_cost",
        "交通消费": "transport_cost",
        "交通花费": "transport_cost",
        "娱乐消费": "entertainment_cost",
        "娱乐花费": "entertainment_cost",
        "其他消费": "entertainment_cost",
        "总消费": "total_cost",
        "消费金额": "total_cost",
        "消费": "total_cost",
        "总花费": "total_cost",
        "同行人数": "group_size",
        "同伴人数": "group_size",
        "团队人数": "group_size",
        "满意度评分": "satisfaction",
        "满意度": "satisfaction",
    }
    df = df.rename(columns=column_mapping)
    return df


def load_and_clean_data(file_path: Optional[Path] = None) -> pd.DataFrame:
    """Load Excel data and perform cleaning.

    Args:
        file_path: Path to Excel file. Uses default if None.

    Returns:
        Cleaned DataFrame with normalized columns.
    """
    path = file_path or EXCEL_PATH

    if not path.exists():
        raise FileNotFoundError(f"Excel data file not found: {path}")

    logger.info("Loading Excel data from %s", path)
    df = pd.read_csv(path) if path.suffix.lower() == ".csv" else pd.read_excel(path)

    # Normalize column names
    df = normalize_column_names(df)

    # Ensure all expected columns exist
    for col in EXPECTED_COLUMNS:
        if col not in df.columns:
            logger.warning("Missing column '%s', filling with defaults", col)
            if col in ("stay_duration", "ticket_cost", "food_cost", "shopping_cost", "transport_cost", "entertainment_cost", "total_cost"):
                df[col] = 0.0
            elif col in ("age", "group_size", "satisfaction"):
                df[col] = 0
            else:
                df[col] = ""

    total_before = len(df)

    # Clean: drop rows with missing tourist_id or attraction_name
    df = df.dropna(subset=["tourist_id", "attraction_name"])

    # Clean: parse dates
    if "visit_date" in df.columns:
        df["visit_date"] = df["visit_date"].apply(_parse_date)

    # Clean: parse numeric fields
    for col in ("stay_duration", "ticket_cost", "food_cost", "shopping_cost", "transport_cost", "entertainment_cost", "total_cost"):
        df[col] = df[col].apply(_parse_float)

    df["age"] = df["age"].apply(_parse_int)
    df["group_size"] = df["group_size"].apply(_parse_int)
    df["satisfaction"] = df["satisfaction"].apply(lambda x: _parse_int(x, 3))

    # Clean: clamp satisfaction to 1-5
    df["satisfaction"] = df["satisfaction"].clip(1, 5)

    # Clean: clamp stay duration to reasonable range
    df["stay_duration"] = df["stay_duration"].clip(0, 1440)

    total_after = len(df)
    dropped = total_before - total_after
    if dropped > 0:
        logger.info("Dropped %d rows with missing required fields (tourist_id/attraction_name)", dropped)

    logger.info("Data loaded and cleaned: %d records", total_after)
    return df


async def import_behavior_data(
    db: AsyncSession,
    df: Optional[pd.DataFrame] = None,
    file_path: Optional[Path] = None,
) -> dict:
    """Import behavior data into the database.

    Args:
        db: Database session.
        df: Pre-loaded DataFrame. If None, loads from file.
        file_path: Path to Excel file.

    Returns:
        Dict with import statistics.
    """
    if df is None:
        df = load_and_clean_data(file_path)

    total_rows = len(df)
    inserted = 0
    skipped = 0
    errors = 0

    # Process in batches for performance
    for batch_start in range(0, total_rows, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total_rows)
        batch_df = df.iloc[batch_start:batch_end]

        records = []
        for _, row in batch_df.iterrows():
            try:
                record = TouristBehavior(
                    tourist_id=str(row["tourist_id"]),
                    user_nickname=str(row.get("user_nickname", "")) or None,
                    age=_parse_int(row.get("age", 0)) or None,
                    gender=str(row.get("gender", "")) or None,
                    attraction_name=str(row["attraction_name"]),
                    attraction_content=str(row.get("attraction_content", "")) or None,
                    attraction_type=str(row.get("attraction_type", "")) or None,
                    visit_date=row.get("visit_date"),
                    stay_duration=_parse_float(row.get("stay_duration", 0)),
                    ticket_cost=_parse_float(row.get("ticket_cost", 0)),
                    food_cost=_parse_float(row.get("food_cost", 0)),
                    shopping_cost=_parse_float(row.get("shopping_cost", 0)),
                    transport_cost=_parse_float(row.get("transport_cost", 0)),
                    entertainment_cost=_parse_float(row.get("entertainment_cost", 0)),
                    total_cost=_parse_float(row.get("total_cost", 0)),
                    group_size=_parse_int(row.get("group_size", 0)),
                    satisfaction=_parse_int(row.get("satisfaction", 3)),
                )
                records.append(record)
                inserted += 1
            except Exception as e:
                logger.warning("Failed to process row %d: %s", batch_start + _, e)
                errors += 1

        # Bulk insert this batch
        if records:
            db.add_all(records)
            await db.flush()

        if (batch_end) % 50000 == 0 or batch_end >= total_rows:
            logger.info("Imported %d/%d records...", batch_end, total_rows)

    await db.commit()
    logger.info("Behavior data import complete: %d inserted, %d skipped, %d errors", inserted, skipped, errors)

    return {
        "total_rows": total_rows,
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors,
    }


async def compute_spot_statistics(db: AsyncSession) -> dict:
    """Compute pre-aggregated spot statistics from behavior data.

    Uses raw SQL for performance on 140K+ rows.
    """
    logger.info("Computing spot statistics...")

    # Clear existing statistics
    await db.execute(text("DELETE FROM spot_statistics"))

    # Aggregate query
    stats_query = text("""
        INSERT INTO spot_statistics (
            attraction_name, total_visits, avg_satisfaction, avg_stay_minutes,
            avg_cost, peak_hour, peak_season, popular_with_family,
            popular_with_couples, popular_with_solo, total_reviews,
            updated_at
        )
        SELECT
            attraction_name,
            COUNT(*) AS total_visits,
            ROUND(AVG(satisfaction)::numeric, 2) AS avg_satisfaction,
            ROUND(AVG(stay_duration)::numeric, 1) AS avg_stay_minutes,
            ROUND(AVG(total_cost)::numeric, 2) AS avg_cost,
            NULL AS peak_hour,
            MODE() WITHIN GROUP (
                ORDER BY CASE WHEN EXTRACT(MONTH FROM visit_date) IN (3, 4, 5) THEN 'spring'
                    WHEN EXTRACT(MONTH FROM visit_date) IN (6, 7, 8) THEN 'summer'
                    WHEN EXTRACT(MONTH FROM visit_date) IN (9, 10, 11) THEN 'autumn'
                    ELSE 'winter' END
            ) AS peak_season,
            COUNT(*) FILTER (WHERE group_size >= 3) > COUNT(*) FILTER (WHERE group_size = 2) AS popular_with_family,
            COUNT(*) FILTER (WHERE group_size = 2) > COUNT(*) FILTER (WHERE group_size >= 3) AS popular_with_couples,
            COUNT(*) FILTER (WHERE group_size <= 1) > COUNT(*) FILTER (WHERE group_size > 1) AS popular_with_solo,
            COUNT(*) FILTER (WHERE satisfaction IS NOT NULL) AS total_reviews,
            NOW()
        FROM tourist_behaviors
        GROUP BY attraction_name
    """)

    await db.execute(stats_query)
    await db.commit()

    # Get count
    result = await db.execute(text("SELECT COUNT(*) FROM spot_statistics"))
    count = result.scalar()

    logger.info("Spot statistics computed for %d attractions", count)
    return {"attractions_with_stats": count}


async def run_full_import(
    file_path: Optional[Path] = None,
    compute_stats: bool = True,
) -> dict:
    """Run the complete data import pipeline.

    1. Load and clean Excel data
    2. Import to tourist_behaviors table
    3. Compute spot statistics

    Args:
        file_path: Optional custom Excel path.
        compute_stats: Whether to compute post-import statistics.

    Returns:
        Dict with complete import results.
    """
    logger.info("Starting full behavior data import pipeline...")

    df = load_and_clean_data(file_path)
    total_records = len(df)
    unique_tourists = df["tourist_id"].nunique()
    unique_spots = df["attraction_name"].nunique()

    async with async_session() as db:
        async with db.begin():
            import_result = await import_behavior_data(db, df)

            stats_result = None
            if compute_stats:
                stats_result = await compute_spot_statistics(db)

    result = {
        **import_result,
        "unique_tourists": unique_tourists,
        "unique_attractions": unique_spots,
        "statistics": stats_result,
    }

    logger.info("Full import pipeline complete: %s", result)
    return result


# CLI entry point
if __name__ == "__main__":
    import asyncio

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(run_full_import())
