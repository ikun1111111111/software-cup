"""Bulk import tourist behaviors from xlsx using pandas + PostgreSQL COPY.

The database schema has extra columns compared to the ORM model (is_holiday, costs,
weather, etc.). This script maps the 17 Excel columns to the actual table columns
and supplies sensible defaults for missing fields.
"""
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import psycopg2
from sqlalchemy import text
from sqlalchemy import create_engine
from app.core.config import get_settings

settings = get_settings()
XLSX_PATH = Path(__file__).parent.parent.parent / "docs" / "景点景区旅游数据行为分析数据.xlsx"
BATCH_SIZE = 1000

# Column order must match the actual PostgreSQL table schema
COPY_COLUMNS = [
    "tourist_id", "attraction_name", "visit_date", "costs", "stay_duration_minutes",
    "satisfaction_score", "companion_count", "companion_type", "weather", "temperature",
    "is_holiday", "visit_hour", "device_type", "search_keyword", "click_attraction",
    "page_view_count", "review_text", "created_at", "user_nickname", "age", "gender",
    "attraction_content", "attraction_type", "stay_duration", "ticket_cost", "food_cost",
    "shopping_cost", "transport_cost", "entertainment_cost", "total_cost", "group_size",
    "satisfaction",
]


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize dtypes and fill missing values for COPY."""
    # Core required string columns
    df["tourist_id"] = df["tourist_id"].astype(str)
    df["attraction_name"] = df["attraction_name"].astype(str)

    for col in ["user_nickname", "gender", "attraction_type"]:
        if col in df.columns:
            df[col] = df[col].where(df[col].notna(), None)

    for col in ["age", "group_size", "satisfaction"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in ["stay_duration", "ticket_cost", "food_cost", "shopping_cost",
                "transport_cost", "entertainment_cost", "total_cost"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "visit_date" in df.columns:
        df["visit_date"] = pd.to_datetime(df["visit_date"], errors="coerce").dt.date

    df = df.dropna(subset=["tourist_id", "attraction_name"])

    from datetime import datetime
    df["created_at"] = datetime.utcnow()

    # Map derived columns from existing data
    df["costs"] = df["total_cost"]
    df["stay_duration_minutes"] = (df["stay_duration"] * 60).round().astype("Int64")
    df["satisfaction_score"] = df["satisfaction"]
    df["companion_count"] = df["group_size"] - 1
    df["companion_type"] = None
    df["weather"] = None
    df["temperature"] = None
    df["is_holiday"] = False
    df["visit_hour"] = None
    df["device_type"] = None
    df["search_keyword"] = None
    df["click_attraction"] = df["attraction_name"]
    df["page_view_count"] = None
    df["review_text"] = None

    # Ensure exact column order and fill missing columns
    for col in COPY_COLUMNS:
        if col not in df.columns:
            df[col] = None
    return df[COPY_COLUMNS]


def import_behaviors():
    if not XLSX_PATH.exists():
        print(f"File not found: {XLSX_PATH}")
        return

    print("Reading xlsx...")
    df = pd.read_excel(XLSX_PATH, engine="openpyxl")
    print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")

    df = _clean_dataframe(df)
    print(f"Cleaned {len(df)} rows ready for import")

    engine = create_engine(settings.database_url_sync)
    with engine.connect() as conn:
        existing = conn.execute(text("SELECT COUNT(*) FROM tourist_behaviors")).scalar()
        print(f"Existing rows in tourist_behaviors: {existing}")

    print(f"Inserting {len(df)} rows via PostgreSQL COPY in batches of {BATCH_SIZE}...")

    raw_conn = psycopg2.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        dbname=settings.db_name,
    )
    try:
        with raw_conn.cursor() as cur:
            total = len(df)
            for start in range(0, total, BATCH_SIZE):
                end = min(start + BATCH_SIZE, total)
                chunk = df.iloc[start:end]
                buffer = io.StringIO()
                chunk.to_csv(buffer, index=False, header=False, sep="\t", na_rep="\\N", quoting=None)
                buffer.seek(0)
                cur.copy_from(
                    buffer,
                    "tourist_behaviors",
                    sep="\t",
                    null="\\N",
                    columns=COPY_COLUMNS,
                )
                print(f"  Copied {end}/{total} rows")
        raw_conn.commit()
    finally:
        raw_conn.close()

    with engine.connect() as conn:
        new_count = conn.execute(text("SELECT COUNT(*) FROM tourist_behaviors")).scalar()
        print(f"Import complete. Total rows now: {new_count} (inserted {new_count - existing})")


if __name__ == "__main__":
    import_behaviors()
