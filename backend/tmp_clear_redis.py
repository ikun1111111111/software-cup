import asyncio
from app.core.redis_client import get_redis

async def q():
    r = await get_redis()
    print('keys', await r.keys('story:*'))
    await r.delete('story:acts:ling-shan-da-fo')
    print('deleted')

asyncio.run(q())
