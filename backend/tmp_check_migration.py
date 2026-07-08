import asyncio
import json
from app.core.database import async_session
from sqlalchemy import select
from app.models.tourist import ScenicSpot, TourRoute

async def q():
    async with async_session() as db:
        # Check a spot with story acts
        stmt = select(ScenicSpot).where(ScenicSpot.id == "ling-shan-da-fo")
        r = await db.execute(stmt)
        spot = r.scalar_one()
        print("=== ling-shan-da-fo ===")
        print("duration:", spot.duration)
        print("thumbnail:", spot.thumbnail)
        print("display_x/y:", spot.display_x, spot.display_y)
        print("qa count:", len(spot.qa_json) if spot.qa_json else 0)
        print("story_acts:", json.dumps(spot.story_acts, ensure_ascii=False, indent=2)[:500])

        # Check routes
        stmt = select(TourRoute)
        r = await db.execute(stmt)
        routes = r.scalars().all()
        print("\n=== routes ===")
        for route in routes:
            print(route.id, route.name, route.duration, route.color, len(route.spot_order))

asyncio.run(q())
