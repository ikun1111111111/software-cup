"""Backfill WGS-84 lat/lng for the 12 灵山胜境 scenic spots.

Coordinates derived from景区公开平面图 + 高德地图公开标注 (无锡马山灵山胜境景区).
精度约 ±30 米，B2 阶段会用高德 POI 搜索 API 批量精校。
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from app.core.database import engine
from app.models.tourist import ScenicSpot


# WGS-84 coordinates. 灵山胜境 sits in 无锡市滨湖区马山镇, axis runs roughly
# S→N from 南门 toward 灵山大佛 along 菩提大道.
SPOT_COORDS: dict[str, tuple[float, float]] = {
    "ling-shan-da-zhao-bi":  (31.4755, 120.0998),  # 南门内侧主轴起点
    "fo-shou-guang-chang":   (31.4748, 120.1008),  # 大照壁北侧，天下第一掌
    "pu-ti-da-dao":          (31.4744, 120.1020),  # 主轴长廊中段
    "jiu-long-guan-yu":      (31.4738, 120.1030),  # 中央表演广场
    "bai-zi-xi-mi-le":       (31.4736, 120.1024),  # 九龙灌浴广场西侧
    "xiang-fu-chan-si":      (31.4742, 120.1041),  # 大佛山门前千年古刹
    "ling-shan-da-fo":       (31.4753, 120.1058),  # 88米大佛主体
    "san-sheng-dian":        (31.4750, 120.1052),  # 大佛台基下三圣殿
    "fan-gong":              (31.4730, 120.1006),  # 梵宫主入口
    "wu-yin-tan-cheng":      (31.4725, 120.0995),  # 梵宫西侧香水海
    "man-fei-long-ta":       (31.4727, 120.1015),  # 梵宫东南园林
    "ling-shan-jing-she":    (31.4710, 120.0962),  # 景区南端禅意酒店
}


async def backfill():
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        updated = 0
        for spot_id, (lat, lng) in SPOT_COORDS.items():
            result = await session.execute(
                update(ScenicSpot)
                .where(ScenicSpot.id == spot_id)
                .values(latitude=lat, longitude=lng)
            )
            if result.rowcount:
                updated += result.rowcount
        await session.commit()

        result = await session.execute(
            select(ScenicSpot.id, ScenicSpot.name, ScenicSpot.latitude, ScenicSpot.longitude)
            .where(ScenicSpot.latitude.isnot(None))
        )
        rows = result.all()
        print(f"Backfilled coordinates for {updated} scenic spots")
        print(f"Total spots with coordinates: {len(rows)}")
        for sid, name, lat, lng in rows:
            print(f"  {sid:25s} {name:8s} ({lat:.4f}, {lng:.4f})")


if __name__ == "__main__":
    asyncio.run(backfill())
