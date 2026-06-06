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
    "attraction_name",
    "visit_date",
    "costs",
    "stay_duration_minutes",
    "satisfaction_score",
    "companion_count",
    "companion_type",
    "weather",
    "temperature",
    "is_holiday",
    "visit_hour",
    "device_type",
    "search_keyword",
    "click_attraction",
    "page_view_count",
    "review_text",
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
        "景点名称": "attraction_name",
        "景点": "attraction_name",
        "访问日期": "visit_date",
        "游览日期": "visit_date",
        "日期": "visit_date",
        "消费金额": "costs",
        "消费": "costs",
        "停留时长(分钟)": "stay_duration_minutes",
        "停留时长": "stay_duration_minutes",
        "游览时长": "stay_duration_minutes",
        "满意度评分": "satisfaction_score",
        "满意度": "satisfaction_score",
        "同行人数": "companion_count",
        "同伴人数": "companion_count",
        "同行类型": "companion_type",
        "同伴类型": "companion_type",
        "天气": "weather",
        "气温": "temperature",
        "温度": "temperature",
        "是否节假日": "is_holiday",
        "节假日": "is_holiday",
        "访问时段": "visit_hour",
        "游览时段": "visit_hour",
        "设备类型": "device_type",
        "设备": "device_type",
        "搜索关键词": "search_keyword",
        "搜索词": "search_keyword",
        "点击景点": "click_attraction",
        "浏览页数": "page_view_count",
        "页面浏览数": "page_view_count",
        "评价内容": "review_text",
        "评论": "review_text",
        "评价": "review_text",
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
    df = pd.read_excel(path)

    # Normalize column names
    df = normalize_column_names(df)

    # Ensure all expected columns exist
    for col in EXPECTED_COLUMNS:
        if col not in df.columns:
            logger.warning("Missing column '%s', filling with defaults", col)
            if col in ("costs", "satisfaction_score", "temperature"):
                df[col] = 0.0
            elif col in ("stay_duration_minutes", "companion_count", "visit_hour", "page_view_count"):
                df[col] = 0
            elif col == "is_holiday":
                df[col] = False
            else:
                df[col] = ""

    total_before = len(df)

    # Clean: drop rows with missing tourist_id or attraction_name
    df = df.dropna(subset=["tourist_id", "attraction_name"])

    # Clean: parse dates
    if "visit_date" in df.columns:
        df["visit_date"] = df["visit_date"].apply(_parse_date)

    # Clean: parse numeric fields
    df["costs"] = df["costs"].apply(_parse_float)
    df["satisfaction_score"] = df["satisfaction_score"].apply(lambda x: _parse_float(x, 3.0))
    df["stay_duration_minutes"] = df["stay_duration_minutes"].apply(_parse_int)
    df["companion_count"] = df["companion_count"].apply(_parse_int)
    df["temperature"] = df["temperature"].apply(lambda x: _parse_float(x, 20.0))
    df["visit_hour"] = df["visit_hour"].apply(_parse_int)
    df["page_view_count"] = df["page_view_count"].apply(lambda x: _parse_int(x, 1))

    # Clean: parse boolean
    df["is_holiday"] = df["is_holiday"].apply(_parse_bool)

    # Clean: string fields
    for col in ["companion_type", "weather", "device_type"]:
        df[col] = df[col].fillna("").astype(str)

    # Clean: clamp satisfaction to 1-5
    df["satisfaction_score"] = df["satisfaction_score"].clip(1.0, 5.0)

    # Clean: clamp stay duration to reasonable range
    df["stay_duration_minutes"] = df["stay_duration_minutes"].clip(0, 1440)

    # Clean: clamp visit_hour to 0-23
    df["visit_hour"] = df["visit_hour"].clip(0, 23)

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
                    attraction_name=str(row["attraction_name"]),
                    visit_date=row.get("visit_date"),
                    costs=_parse_float(row.get("costs", 0)),
                    stay_duration_minutes=_parse_int(row.get("stay_duration_minutes", 0)),
                    satisfaction_score=_parse_float(row.get("satisfaction_score", 3.0)),
                    companion_count=_parse_int(row.get("companion_count", 0)),
                    companion_type=str(row.get("companion_type", "")) or None,
                    weather=str(row.get("weather", "")) or None,
                    temperature=_parse_float(row.get("temperature", 20.0)),
                    is_holiday=_parse_bool(row.get("is_holiday", False)),
                    visit_hour=_parse_int(row.get("visit_hour", 0)),
                    device_type=str(row.get("device_type", "")) or None,
                    search_keyword=str(row.get("search_keyword", "")) or None,
                    click_attraction=str(row.get("click_attraction", "")) or None,
                    page_view_count=_parse_int(row.get("page_view_count", 1)),
                    review_text=str(row.get("review_text", "")) or None,
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
            ROUND(AVG(satisfaction_score)::numeric, 2) AS avg_satisfaction,
            ROUND(AVG(stay_duration_minutes)::numeric, 1) AS avg_stay_minutes,
            ROUND(AVG(costs)::numeric, 2) AS avg_cost,
            MODE() WITHIN GROUP (ORDER BY visit_hour) AS peak_hour,
            MODE() WITHIN GROUP (
                ORDER BY CASE WHEN is_holiday THEN 'holiday' ELSE 'weekday' END
            ) AS peak_season,
            COUNT(*) FILTER (WHERE companion_type = 'family') > COUNT(*) FILTER (WHERE companion_type = 'couple') AS popular_with_family,
            COUNT(*) FILTER (WHERE companion_type = 'couple') > COUNT(*) FILTER (WHERE companion_type = 'family') AS popular_with_couples,
            COUNT(*) FILTER (WHERE companion_type = 'solo' OR companion_count = 0) > COUNT(*) FILTER (WHERE companion_count > 0) AS popular_with_solo,
            COUNT(*) FILTER (WHERE review_text IS NOT NULL AND review_text != '') AS total_reviews,
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
