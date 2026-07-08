import asyncio
from app.services.story_service import generate_story_acts

async def q():
    result = await generate_story_acts('ling-shan-da-fo')
    print([a.get('act_image') for a in result['acts']])

asyncio.run(q())
