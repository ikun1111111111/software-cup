"""Seed scenic spots data from JSON into PostgreSQL."""
import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.models.tourist import ScenicSpot, TourRoute


def load_spots_from_json(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    spots = []
    for s in data["spots"]:
        spots.append({
            "id": s["id"],
            "name": s["name"],
            "category": s.get("category", "特色景点"),
            "tags": s.get("tags", []),
            "overview": s.get("overview", ""),
            "detail": s.get("detail", ""),
            "qr_code": s.get("qr_code"),
            "related_spots": s.get("related_spots"),
            "latitude": s.get("latitude"),
            "longitude": s.get("longitude"),
            "is_active": True,
        })
    return spots


def get_routes() -> list[dict]:
    return [
        {
            "id": "RT-001",
            "name": "历史文化爱好者路线",
            "route_type": "history",
            "duration": "6小时",
            "description": "深度体验灵山胜境的千年历史文化。从灵山大照壁到千年古刹祥符禅寺，再到灵山大佛与梵宫佛教艺术殿堂，最后在五印坛城感受藏传佛教文化，全程配有详细的历史讲解与文化解读。",
            "gradient": None,
            "spot_order": ["ling-shan-da-zhao-bi", "wu-zhi-men", "pu-ti-da-dao", "jiu-long-guan-yu", "xiang-mo-fu-diao", "a-yu-wang-zhu", "xiang-fu-chan-si", "ling-shan-da-fo", "fo-jiao-wen-hua-blan-guan", "fan-gong", "wu-yin-tan-cheng"],
            "spot_details": {
                "ling-shan-da-zhao-bi": {"讲解重点": ["赵朴初题写鎏金灵山大字，背面《小灵山》诗刻"], "特色体验": ["打卡合影，拍摄湖光壁影同框美景", "解读诗刻文化"]},
                "wu-zhi-men": {"讲解重点": ["五门象征五方五佛，六柱代表六度波罗蜜"], "特色体验": ["穿门祈福，感受佛教建筑恢弘气势"]},
                "pu-ti-da-dao": {"讲解重点": ["两侧印度菩提树，象征佛陀悟道"], "特色体验": ["漫步林荫拱廊，感受禅意清幽"]},
                "jiu-long-guan-yu": {"讲解重点": ["依据《本行经》释迦牟尼诞生传说打造"], "特色体验": ["观赏花开见佛动态喷泉表演", "接取龙头圣水"]},
                "xiang-mo-fu-diao": {"讲解重点": ["长26米高4.6米巨型花岗岩浮雕"], "特色体验": ["观赏精湛浮雕艺术", "聆听佛陀降魔成道故事"]},
                "a-yu-wang-zhu": {"讲解重点": ["通高16.9米，总重180吨整块花岗岩雕刻"], "特色体验": ["瞻仰巨型石柱感受威严气势"]},
                "xiang-fu-chan-si": {"讲解重点": ["始建于唐代贞观年间，玄奘弟子窥基大师开坛"], "特色体验": ["礼佛祈福，聆听江南第一钟钟声"]},
                "ling-shan-da-fo": {"讲解重点": ["佛像高88米，含台基总高101.5米", "216级台阶寓意108烦恼与108愿望"], "特色体验": ["登顶俯瞰太湖全景", "抱佛脚祈福"]},
                "fo-jiao-wen-hua-blan-guan": {"讲解重点": ["三层结构，展示五方五佛与佛教四大名山"], "特色体验": ["体验智能导览深入了解佛教历史"]},
                "fan-gong": {"讲解重点": ["穹顶天象图用100公斤纯金绘制", "东阳木雕、敦煌壁画等非遗艺术汇聚"], "特色体验": ["仰望星空穹顶", "观看《灵山吉祥颂》全息演出"]},
                "wu-yin-tan-cheng": {"讲解重点": ["五印代表五方五佛的五种手印"], "特色体验": ["顺时针转动转经筒祈福", "五层顶层俯瞰全景"]},
            },
            "is_active": True,
        },
        {
            "id": "RT-002",
            "name": "自然风光爱好者路线",
            "route_type": "nature",
            "duration": "5小时",
            "description": "全景游览灵山胜境的自然与人文景观。沿菩提大道漫步欣赏太湖风光，登灵山大佛俯瞰全景，探访曼飞龙塔园林景观，在灵山精舍体验禅意园林的宁静之美。",
            "gradient": None,
            "spot_order": ["fo-zu-tan", "jiu-long-guan-yu", "pu-ti-da-dao", "ling-shan-da-fo", "man-fei-long-ta", "fan-gong"],
            "spot_details": {
                "fo-zu-tan": {"讲解重点": ["复刻佛祖释迦牟尼真身脚印", "足心刻有32种吉祥图案"], "特色体验": ["瞻仰佛足，触摸足心吉祥图案"]},
                "jiu-long-guan-yu": {"讲解重点": ["总高27.2米，鎏金太子佛高7.2米"], "特色体验": ["观赏动态喷泉表演", "接取祈福圣水"]},
                "pu-ti-da-dao": {"讲解重点": ["两侧印度菩提树，欣赏太湖风光"], "特色体验": ["漫步林荫拱廊欣赏太湖风光"]},
                "ling-shan-da-fo": {"讲解重点": ["大佛选址的地理优势", "俯瞰太湖马山半岛"], "特色体验": ["登顶俯瞰太湖全景", "拍摄夕阳下的大佛"]},
                "man-fei-long-ta": {"讲解重点": ["傣族佛教建筑风格，九塔组合"], "特色体验": ["拍照打卡感受南传佛教异域美学"]},
                "fan-gong": {"讲解重点": ["五座莲花圣塔象征五方五佛"], "特色体验": ["感受佛教艺术殿堂的恢弘气势"]},
            },
            "is_active": True,
        },
        {
            "id": "RT-003",
            "name": "亲子家庭路线",
            "route_type": "family",
            "duration": "4小时",
            "description": "轻松有趣的亲子游览路线。观赏九龙灌浴动态表演，摸天下第一掌沾福气，与百子戏弥勒互动拍照，在梵宫欣赏艺术作品，最后在五印坛城体验藏式文化。",
            "gradient": None,
            "spot_order": ["jiu-long-guan-yu", "fo-shou-guang-chang", "bai-zi-xi-mi-le", "fan-gong", "wu-yin-tan-cheng"],
            "spot_details": {
                "jiu-long-guan-yu": {"讲解重点": ["用生动语言讲述释迦牟尼诞生故事"], "特色体验": ["观赏动态喷泉表演", "接取祈福圣水，亲子互动"]},
                "fo-shou-guang-chang": {"讲解重点": ["天下第一掌为灵山大佛右手复制品"], "特色体验": ["摸掌祈福，沾福气保平安"]},
                "bai-zi-xi-mi-le": {"讲解重点": ["弥勒佛象征欢喜包容慈悲"], "特色体验": ["摸弥勒肚皮享一生福气", "亲子互动拍照"]},
                "fan-gong": {"讲解重点": ["简化艺术术语，重点介绍色彩造型"], "特色体验": ["观看《吉祥颂》全息投影互动演出"]},
                "wu-yin-tan-cheng": {"讲解重点": ["用简单语言介绍藏传佛教文化"], "特色体验": ["转动经筒祈福", "体验藏式文化"]},
            },
            "is_active": True,
        },
    ]


async def seed():
    base = os.path.dirname(__file__)
    json_path = os.path.join(base, "data", "ling_sheng_jing_spots.json")
    spots = load_spots_from_json(json_path)
    print(f"Loaded {len(spots)} spots from JSON")

    routes = get_routes()
    print(f"Prepared {len(routes)} routes")

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from sqlalchemy import select

    async with async_session() as session:
        for s in spots:
            result = await session.execute(
                select(ScenicSpot).where(ScenicSpot.id == s["id"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                for key, value in s.items():
                    setattr(existing, key, value)
            else:
                session.add(ScenicSpot(**s))
        for r in routes:
            result = await session.execute(
                select(TourRoute).where(TourRoute.id == r["id"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                for key, value in r.items():
                    setattr(existing, key, value)
            else:
                session.add(TourRoute(**r))
        await session.commit()
    print(f"Seeded {len(spots)} spots + {len(routes)} routes into database")
    except Exception as e:
        print(f"ERROR during seed: {e}")
        import traceback
        traceback.print_exc()
        raise
    print(f"Seeded {len(spots)} spots + {len(routes)} routes into database")


if __name__ == "__main__":
    asyncio.run(seed())
