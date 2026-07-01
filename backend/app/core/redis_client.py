import redis.asyncio as aioredis
from app.core.config import get_settings

settings = get_settings()

redis_client = aioredis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_connect_timeout=0.2,
    socket_timeout=0.2,
    retry_on_timeout=False,
)


async def get_redis():
    return redis_client
