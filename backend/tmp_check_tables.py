import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def q():
    async with async_session() as s:
        r = await s.execute(text("SELECT COUNT(*) FROM scenic_spots"))
        print("scenic_spots:", r.scalar())
        r = await s.execute(text("SELECT COUNT(*) FROM tour_routes"))
        print("tour_routes:", r.scalar())

asyncio.run(q())
