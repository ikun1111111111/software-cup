import asyncio
import json
import requests
from app.core.redis_client import get_redis

BASE = 'http://localhost:8000'
SPOT_ID = 'ling-shan-da-fo'

async def main():
    # 1. trigger cache
    r = requests.get(f'{BASE}/api/story/{SPOT_ID}')
    assert r.status_code == 200
    print('story api ok')

    redis = await get_redis()
    keys_before = await redis.keys('story:*')
    print('keys before update:', keys_before)

    # 2. update story_acts
    new_acts = [
        {"id": "origin", "title": "缘起（测试）", "emotion": "think", "prompt_hint": "test", "act_image": "story/test.jpg"}
    ]
    payload = {
        "name": "灵山大佛",
        "category": "核心景点",
        "story_acts": new_acts,
    }
    r = requests.put(f'{BASE}/api/admin/scenic-spots/{SPOT_ID}', json=payload)
    print('update status:', r.status_code)

    keys_after = await redis.keys('story:*')
    print('keys after update:', keys_after)

    # 3. fetch story again, should regenerate without cache
    r = requests.get(f'{BASE}/api/story/{SPOT_ID}')
    data = r.json()
    print('acts after update:', [(a['id'], a.get('act_image')) for a in data['acts']])

asyncio.run(main())
