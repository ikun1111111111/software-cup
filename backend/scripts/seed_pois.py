"""Seed POI data (餐饮/住宿/服务) into the pois table.

Source: 灵山胜境官方游览指南 DOCX (餐饮与住宿推荐章节) + 公开景区平面图。
经纬度暂留 None，待 B2 阶段通过高德 Web 服务 POI 搜索批量回填精确坐标。
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from app.core.database import engine, Base
from app.models.tourist import POI


# Seed records derived from official guide DOCX. Coordinates filled where
# verifiable from景区公开平面图 (WGS-84, 无锡马山灵山胜境景区).
# Unverified coords left null — backfilled via 高德 POI API in B2.
SEED_POIS: list[dict] = [
    # —— 餐饮 ——————————————————————————————————————————————
    {
        "name": "梵宫素斋自助",
        "category": "food",
        "address": "灵山胜境景区灵山梵宫内",
        "latitude": 31.4738,
        "longitude": 120.0975,
        "phone": None,
        "business_hours": "11:00-13:30, 17:00-19:30",
        "price_level": "50元/位",
        "intro": "灵山梵宫内素斋自助，菜品丰富，体验佛门饮食文化，清淡雅致。",
        "tags": ["素斋", "自助", "梵宫", "佛门饮食"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "灵山精舍素斋",
        "category": "food",
        "address": "灵山胜境景区灵山精舍",
        "latitude": 31.4710,
        "longitude": 120.0962,
        "phone": None,
        "business_hours": "07:00-09:00, 11:30-13:30, 17:30-19:30",
        "price_level": "约80-150元/位",
        "intro": "禅意酒店内素斋，环境优雅，菜品精致，适合深度体验佛教文化的游客。配套早课体验。",
        "tags": ["素斋", "精舍", "禅意", "深度体验"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "景区素面馆",
        "category": "food",
        "address": "灵山胜境景区内（佛手广场附近）",
        "latitude": 31.4729,
        "longitude": 120.0989,
        "phone": None,
        "business_hours": "10:00-17:00",
        "price_level": "35元/位",
        "intro": "景区素面套餐，价格实惠口味清淡，适合游览中快速用餐。",
        "tags": ["素面", "快餐", "亲民"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "梵宫咖啡",
        "category": "food",
        "address": "灵山梵宫一层",
        "latitude": 31.4736,
        "longitude": 120.0976,
        "phone": None,
        "business_hours": "09:30-17:30",
        "price_level": "30-60元/位",
        "intro": "梵宫内的咖啡休闲区，可在禅意空间小憩，提供咖啡、茶饮与素点。",
        "tags": ["咖啡", "茶饮", "休闲"],
        "source": "official_guide",
        "is_active": True,
    },

    # —— 住宿 ——————————————————————————————————————————————
    {
        "name": "灵山精舍",
        "category": "hotel",
        "address": "灵山胜境景区内灵山精舍",
        "latitude": 31.4710,
        "longitude": 120.0962,
        "phone": "0510-85698888",
        "business_hours": "全天",
        "price_level": "约880-1880元/晚",
        "intro": "景区内禅意酒店，含素斋与早课体验，适合深度感受佛教文化，体验禅意生活。",
        "tags": ["禅意酒店", "景区内", "早课体验"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "无锡灵山君来波罗蜜多酒店",
        "category": "hotel",
        "address": "无锡市滨湖区马山环山西路18号（拈花湾景区内）",
        "latitude": 31.4581,
        "longitude": 120.0823,
        "phone": "0510-88880000",
        "business_hours": "全天",
        "price_level": "约1080-2680元/晚",
        "intro": "拈花湾景区内禅意度假酒店，与灵山胜境一山之隔，含禅修体验与温泉。",
        "tags": ["禅意度假", "拈花湾", "温泉"],
        "source": "official_guide",
        "is_active": True,
    },

    # —— 服务设施 ——————————————————————————————————————————
    {
        "name": "灵山胜境南门游客中心",
        "category": "service",
        "address": "灵山胜境景区南门",
        "latitude": 31.4759,
        "longitude": 120.0998,
        "phone": "0510-85698888",
        "business_hours": "07:30-17:30",
        "price_level": None,
        "intro": "景区主入口游客服务中心，提供售票、咨询、寄存、轮椅婴儿车租赁等服务。",
        "tags": ["游客中心", "南门", "咨询", "售票"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "南门停车场",
        "category": "parking",
        "address": "灵山胜境景区南门外",
        "latitude": 31.4768,
        "longitude": 120.1003,
        "phone": None,
        "business_hours": "07:00-18:30",
        "price_level": "小车10元/次",
        "intro": "景区主停车场，约容纳800个车位，紧邻南门入口。",
        "tags": ["停车场", "南门", "主入口"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "景区电瓶车（观光车）",
        "category": "transport",
        "address": "南门 → 大照壁 → 梵宫 → 大佛环线",
        "latitude": None,
        "longitude": None,
        "phone": None,
        "business_hours": "08:00-17:00",
        "price_level": "40元/人 单独购票，套票225元含无限次乘坐",
        "intro": "景区内交通工具，从南门到核心景点的环线，适合体力有限的游客或快速通勤。",
        "tags": ["观光车", "电瓶车", "环线", "代步"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "梵宫公共卫生间",
        "category": "toilet",
        "address": "灵山梵宫一层东侧",
        "latitude": 31.4738,
        "longitude": 120.0978,
        "phone": None,
        "business_hours": "全天",
        "price_level": None,
        "intro": "无障碍卫生间，含母婴室。",
        "tags": ["卫生间", "无障碍", "母婴室"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "九龙灌浴公共卫生间",
        "category": "toilet",
        "address": "九龙灌浴广场西侧",
        "latitude": 31.4733,
        "longitude": 120.0986,
        "phone": None,
        "business_hours": "全天",
        "price_level": None,
        "intro": "九龙灌浴表演广场配套卫生间。",
        "tags": ["卫生间"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "灵山大佛登云道入口卫生间",
        "category": "toilet",
        "address": "灵山大佛216级登云道入口处",
        "latitude": 31.4751,
        "longitude": 120.1067,
        "phone": None,
        "business_hours": "全天",
        "price_level": None,
        "intro": "登山前最后的卫生间，建议登顶前使用。",
        "tags": ["卫生间", "登顶必停"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "祥符禅寺香烛供应处",
        "category": "shop",
        "address": "祥符禅寺山门内",
        "latitude": 31.4741,
        "longitude": 120.1041,
        "phone": None,
        "business_hours": "08:00-16:30",
        "price_level": "免费请香",
        "intro": "千年古刹祥符禅寺免费请香处，可领取祈福香烛。",
        "tags": ["请香", "祈福", "免费"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "梵宫文创店",
        "category": "shop",
        "address": "灵山梵宫一层",
        "latitude": 31.4737,
        "longitude": 120.0974,
        "phone": None,
        "business_hours": "09:00-17:30",
        "price_level": "20-500元",
        "intro": "梵宫艺术衍生品、佛教文化文创、琉璃工艺品。",
        "tags": ["文创", "纪念品", "琉璃"],
        "source": "official_guide",
        "is_active": True,
    },
    {
        "name": "灵山胜境医务室",
        "category": "service",
        "address": "南门游客中心二楼",
        "latitude": 31.4759,
        "longitude": 120.0998,
        "phone": "0510-85698120",
        "business_hours": "08:00-17:00",
        "price_level": None,
        "intro": "景区医务室，提供应急医疗、轻微外伤处理、急救药品。",
        "tags": ["医务", "急救"],
        "source": "official_guide",
        "is_active": True,
    },
]


async def seed_pois():
    """Seed POI table — clears existing official_guide rows first."""
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Clear previously imported official_guide records to avoid duplicates
        await session.execute(delete(POI).where(POI.source == "official_guide"))
        for record in SEED_POIS:
            session.add(POI(**record))
        await session.commit()

        result = await session.execute(select(POI))
        all_pois = result.scalars().all()
        print(f"Inserted {len(SEED_POIS)} POIs (source=official_guide)")
        print(f"Total POIs in DB: {len(all_pois)}")
        by_cat: dict[str, int] = {}
        for p in all_pois:
            by_cat[p.category] = by_cat.get(p.category, 0) + 1
        for cat, n in sorted(by_cat.items()):
            print(f"  - {cat}: {n}")


if __name__ == "__main__":
    asyncio.run(seed_pois())
