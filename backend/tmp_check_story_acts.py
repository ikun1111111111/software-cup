import asyncio
from app.core.database import async_session
from sqlalchemy import select
from app.models.tourist import ScenicSpot

async def q():
    async with async_session() as s:
        r = await s.execute(select(ScenicSpot).where(ScenicSpot.id == 'ling-shan-da-fo'))
        spot = r.scalar()
        print(spot.story_acts)

asyncio.run(q())
