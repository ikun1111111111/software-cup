"""Bulk import tourist behaviors from xlsx using sync engine + pandas."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()
XLSX_PATH = Path(__file__).parent.parent.parent / "docs" / "景点景区旅游数据行为分析数据.xlsx"
BATCH_SIZE = 5000


def import_behaviors():
    if not XLSX_PATH.exists():
        print(f"File not found: {XLSX_PATH}")
        return

    print("Reading xlsx...")
    df = pd.read_excel(XLSX_PATH, engine="openpyxl")
    print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")

    # Map columns
    col_map = {
        "tourist_id": "tourist_id",
        "user_nickname": "user_nickname",
        "age": "age",
        "gender": "gender",
        "attraction_name": "attraction_name",
        "attraction_content": "attraction_content",
        "attraction_type": "attraction_type",
        "visit_date": "visit_date",
        "stay_duration": "stay_duration",
        "ticket_cost": "ticket_cost",
        "food_cost": "food_cost",
        "shopping_cost": "shopping_cost",
        "transport_cost": "transport_cost",
        "entertainment_cost": "entertainment_cost",
        "total_cost": "total_cost",
        "group_size": "group_size",
        "satisfaction": "satisfaction",
    }

    # Rename if needed
    rename = {k: v for k, v in col_map.items() if k in df.columns}
    df = df.rename(columns=rename)

    # Ensure required columns exist
    for c in ["tourist_id", "attraction_name"]:
        if c not in df.columns:
            raise ValueError(f"Missing required column: {c}")

    # Clean data types
    df["tourist_id"] = df["tourist_id"].astype(str)
    df["attraction_name"] = df["attraction_name"].astype(str)
    for col in ["user_nickname", "gender", "attraction_type"]:
        if col in df.columns:
            df[col] = df[col].astype(str).where(df[col].notna(), None)
    for col in ["age", "group_size", "satisfaction"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
    for col in ["stay_duration", "ticket_cost", "food_cost", "shopping_cost", "transport_cost", "entertainment_cost", "total_cost"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    if "visit_date" in df.columns:
        df["visit_date"] = pd.to_datetime(df["visit_date"], errors="coerce").dt.date

    # Drop rows missing required fields
    before = len(df)
    df = df.dropna(subset=["tourist_id", "attraction_name"])
    after = len(df)
    if before != after:
        print(f"Dropped {before - after} rows with missing required fields")

    # Add created_at column (pandas to_sql won't use SQLAlchemy defaults)
    from datetime import datetime
    df["created_at"] = datetime.utcnow()

    # Connect sync engine
    engine = create_engine(settings.database_url_sync)

    # Truncate and load approach for speed: delete existing, then COPY-like insert
    with engine.connect() as conn:
        # Check existing count
        existing = conn.execute(text("SELECT COUNT(*) FROM tourist_behaviors")).scalar()
        print(f"Existing rows in tourist_behaviors: {existing}")

        # Optional: clear existing if you want fresh import
        # conn.execute(text("TRUNCATE TABLE tourist_behaviors RESTART IDENTITY CASCADE"))
        # conn.commit()

        # Bulk insert via pandas to_sql
        print(f"Inserting {len(df)} rows in batches of {BATCH_SIZE}...")
        df.to_sql(
            "tourist_behaviors",
            con=conn,
            if_exists="append",
            index=False,
            method="multi",
            chunksize=BATCH_SIZE,
        )
        conn.commit()

        new_count = conn.execute(text("SELECT COUNT(*) FROM tourist_behaviors")).scalar()
        print(f"Import complete. Total rows now: {new_count} (inserted {new_count - existing})")


if __name__ == "__main__":
    import_behaviors()
