"""Import scenic spots from extracted JSON into scenic_spots table."""
import json
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import async_session
from app.models.tourist import ScenicSpot

DATA_PATH = Path(__file__).parent.parent / "data" / "ling_sheng_jing_spots_docx.json"


async def import_spots():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    spots = data.get("spots", [])
    print(f"Loaded {len(spots)} spots from JSON")

    async with async_session() as session:
        for spot in spots:
            spot_id = spot.get("id")
            stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing with richer detail
                existing.name = spot.get("name", existing.name)
                existing.category = spot.get("category", existing.category)
                existing.overview = spot.get("overview", existing.overview)
                existing.detail = spot.get("detail", existing.detail)
                existing.qr_code = spot.get("qr_code", existing.qr_code)
                existing.tags = spot.get("tags") or existing.tags
                existing.related_spots = spot.get("related_spots") or existing.related_spots
                print(f"  Updated: {spot_id} - {spot.get('name')}")
            else:
                new_spot = ScenicSpot(
                    id=spot_id,
                    name=spot.get("name", ""),
                    category=spot.get("category", "核心景点"),
                    tags=spot.get("tags") or [],
                    overview=spot.get("overview", ""),
                    detail=spot.get("detail", ""),
                    qr_code=spot.get("qr_code"),
                    related_spots=spot.get("related_spots") or [],
                    is_active=True,
                )
                session.add(new_spot)
                print(f"  Inserted: {spot_id} - {spot.get('name')}")

        await session.commit()
        print("Import complete.")


if __name__ == "__main__":
    asyncio.run(import_spots())
