"""Seed scenic spots data from docx into PostgreSQL."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from docx import Document
from app.core.database import engine, Base
from app.core.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.models.tourist import ScenicSpot, TourRoute


def parse_docx(path: str) -> list[dict]:
    doc = Document(path)
    spots = []
    for table in doc.tables:
        for ri, row in enumerate(table.rows):
            if ri == 0:
                continue
            cells = [cell.text.strip() for cell in row.cells]
            spot_id = cells[1]
            name = cells[2]
            category = cells[0]
            location = cells[3]
            params = cells[4]
            function = cells[5]
            culture = cells[6]
            detail = cells[7]
            highlights = cells[8]
            open_info = cells[9]

            overview = f"{location}\n\n{params}\n\n核心功能：{function}"

            full_detail = detail
            if culture:
                full_detail += f"\n\n【文化内涵】\n{culture}"
            if highlights:
                full_detail += f"\n\n【游玩亮点】\n{highlights}"
            if open_info:
                full_detail += f"\n\n【开放信息】\n{open_info}"

            tags = []
            for kw in ["祈福", "打卡", "观赏", "体验", "科普", "文化", "禅意", "自然", "商业", "演艺", "历史", "艺术"]:
                if kw in function or kw in name:
                    tags.append(kw)
            if not tags:
                tags = ["景点"]

            spots.append({
                "id": spot_id,
                "name": name,
                "category": category,
                "tags": tags,
                "overview": overview,
                "detail": full_detail,
                "qr_code": None,
                "related_spots": None,
                "is_active": True,
            })
    # Supplement spots with empty data from docx
    supplement = {
        "LS-011": {
            "overview": "灵山大佛位于无锡马山秦履峰南侧，背靠灵山，面朝太湖，是中国五方五佛之一。佛像高88米，含台基总高101.5米，耗铜725吨。\n\n核心功能：祈福、打卡、观赏、文化体验",
            "detail": (
                "灵山大佛是世界最高露天青铜释迦牟尼立像，始建于1994年，1997年11月15日落成开光。"
                "佛像高88米，含台基总高101.5米，耗铜725吨，采用青铜铸造工艺，融合了传统技艺与现代科技。"
                "216级登云台阶寓意108烦恼与108愿望，登顶可俯瞰太湖全景。"
                "佛像右手施无畏印，左手施与愿印，两脚呈踏莲之势，庄严慈祥。"
                "灵山大佛的建造体现了赵朴初\"五方五佛\"的理念，与香港天坛大佛、四川乐山大佛、山西云冈大佛、河南龙门大佛共同构成中国佛教五大佛像格局。"
            ),
            "tags": ["祈福", "打卡", "观赏", "文化", "历史", "艺术"],
        },
        "NH-006": {
            "overview": "鹿鸣谷位于拈花湾景区东部，是一处以自然生态与禅意休闲为主题的山谷景观区。\n\n核心功能：观赏、体验、自然",
            "detail": (
                "鹿鸣谷是拈花湾景区的自然生态体验区，以幽静山谷和自然植被为特色。"
                "谷内小径蜿蜒，溪水潺潺，林木葱郁，是远离城市喧嚣、感受禅意自然的理想去处。"
                "游客可在此漫步山林，聆听鸟鸣水声，体验禅意慢生活。"
                "谷中设有休憩凉亭与禅意小品，适合静坐冥想、放松身心。"
            ),
            "tags": ["自然", "体验", "禅意"],
        },
    }
    for spot in spots:
        if spot["id"] in supplement and not spot["detail"]:
            sup = supplement[spot["id"]]
            spot["overview"] = sup["overview"]
            spot["detail"] = sup["detail"]
            spot["tags"] = sup["tags"]
    return spots


def get_routes() -> list[dict]:
    return [
        {
            "id": "RT-001",
            "name": "历史文化爱好者路线",
            "route_type": "history",
            "duration": "6小时",
            "description": "深度体验灵山胜境的千年历史文化。从华夏第一壁到千年古刹祥符禅寺，再到灵山大佛与梵宫佛教艺术殿堂，最后在五印坛城感受藏传佛教文化，全程配有详细的历史讲解与文化解读。",
            "gradient": None,
            "spot_order": ["LS-001", "LS-004", "LS-005", "LS-006", "LS-007", "LS-008", "LS-010", "LS-011", "LS-012", "LS-013", "LS-014"],
            "spot_details": {
                "LS-001": {"讲解重点": ["赵朴初题写鎏金灵山大字，背面《小灵山》诗刻，将无锡小灵山与印度灵鹫山相媲美"], "特色体验": ["打卡合影，拍摄湖光壁影同框美景", "解读诗刻文化，感受赵朴初书法魅力"]},
                "LS-004": {"讲解重点": ["五门象征五方五佛，六柱代表六度波罗蜜", "门柱刻有佛教经文，门楣饰有飞天、神兽、莲花图案"], "特色体验": ["穿门祈福，感受佛教建筑恢弘气势", "解读门柱经文与门楣图案"]},
                "LS-005": {"讲解重点": ["两侧种植近百棵印度引进正宗菩提树", "菩提树象征佛陀悟道成佛的艰辛历程"], "特色体验": ["漫步林荫拱廊，感受禅意清幽", "春季观赏菩提花，捡拾菩提叶"]},
                "LS-006": {"讲解重点": ["依据《本行经》释迦牟尼诞生传说打造", "总高27.2米，鎏金太子佛高7.2米，九龙吐水沐浴"], "特色体验": ["观赏花开见佛动态喷泉表演", "接取龙头圣水，寓意祈福安康"]},
                "LS-007": {"讲解重点": ["长26米高4.6米巨型花岗岩浮雕", "再现佛陀菩提树下战胜魔王波旬最终觉悟成佛"], "特色体验": ["观赏精湛浮雕艺术", "聆听佛陀降魔成道故事"]},
                "LS-008": {"讲解重点": ["通高16.9米，总重180吨整块花岗岩雕刻", "复刻古印度阿育王石柱，四狮朝向四方象征佛法传播"], "特色体验": ["瞻仰巨型石柱感受威严气势", "了解阿育王弘扬佛法与佛教东传历史"]},
                "LS-010": {"讲解重点": ["始建于唐代贞观年间，玄奘弟子窥基大师开坛", "千年古刹，六角井八角井等历史遗存"], "特色体验": ["礼佛祈福，聆听江南第一钟钟声", "秋季欣赏千年银杏金黄美景"]},
                "LS-011": {"讲解重点": ["佛像高88米，含台基总高101.5米，耗铜725吨", "216级台阶寓意108烦恼与108愿望", "五方五佛理念，东方空缺由灵山大佛填补"], "特色体验": ["登顶俯瞰太湖全景", "抱佛脚祈福，感受佛光普照"]},
                "LS-012": {"讲解重点": ["三层结构，展示五方五佛与佛教四大名山", "三层万佛殿9999尊小佛像与室外大佛合成万尊"], "特色体验": ["体验智能导览深入了解佛教历史", "三层万佛殿打卡祈福"]},
                "LS-013": {"讲解重点": ["建筑面积7.2万平方米，穹顶天象图用100公斤纯金绘制", "东阳木雕、敦煌壁画、扬州漆器等非遗艺术汇聚", "世界佛教论坛永久会址"], "特色体验": ["仰望星空穹顶体验置身佛国", "观看《灵山吉祥颂》全息演出"]},
                "LS-014": {"讲解重点": ["五印代表五方五佛的五种手印", "藏式碉楼建筑风格，壁画纯手工绘制1500平方米"], "特色体验": ["顺时针转动转经筒祈福", "五层顶层俯瞰香水海与梵宫全景"]},
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
            "spot_order": ["LS-003", "LS-006", "LS-005", "LS-011", "LS-015", "LS-013"],
            "spot_details": {
                "LS-003": {"讲解重点": ["复刻佛祖释迦牟尼真身脚印", "足心刻有32种吉祥图案，象征佛足所至佛光普照"], "特色体验": ["瞻仰佛足，触摸足心吉祥图案寄托祈福", "解读32种吉祥瑞相的佛教寓意"]},
                "LS-006": {"讲解重点": ["总高27.2米，鎏金太子佛高7.2米", "九龙吐水为太子沐浴的诞生祥瑞场景"], "特色体验": ["观赏动态喷泉表演", "接取祈福圣水，欣赏七彩佛光"]},
                "LS-005": {"讲解重点": ["两侧印度菩提树，欣赏太湖与青龙山白虎山自然风貌", "感受前有照后有靠左右有抱的风水格局"], "特色体验": ["漫步林荫拱廊欣赏太湖风光", "感受佛教文化与自然环境的融合"]},
                "LS-011": {"讲解重点": ["大佛选址的地理优势", "俯瞰太湖马山半岛的绝佳视角"], "特色体验": ["登顶俯瞰太湖全景", "拍摄夕阳下的大佛，感受佛光普照"]},
                "LS-015": {"讲解重点": ["傣族佛教建筑风格，九塔组合象征九种智慧", "白色花岗岩材质与园林景观的和谐融合"], "特色体验": ["拍照打卡感受南传佛教异域美学", "对比汉传藏传南传三大语系建筑差异"]},
                "LS-013": {"讲解重点": ["五座莲花圣塔象征五方五佛", "莲花藏世界设计核心"], "特色体验": ["梵宫广场观赏建筑外观", "感受佛教艺术殿堂的恢弘气势"]},
            },
            "is_active": True,
        },
        {
            "id": "RT-003",
            "name": "亲子家庭路线",
            "route_type": "family",
            "duration": "4小时",
            "description": "轻松有趣的亲子游览路线。观赏九龙灌浴动态表演，摸天下第一掌沾福气，与百子戏弥勒互动拍照，在梵宫欣赏艺术作品，最后在五印坛城体验藏式文化。全程趣味性强，适合带小朋友的家庭。",
            "gradient": None,
            "spot_order": ["LS-006", "LS-009", "LS-013", "LS-014"],
            "spot_details": {
                "LS-006": {"讲解重点": ["用生动语言讲述释迦牟尼诞生故事", "九龙吐水传说与花开见佛的仪式感"], "特色体验": ["观赏动态喷泉表演", "接取祈福圣水，亲子互动"]},
                "LS-009": {"讲解重点": ["弥勒佛象征欢喜包容慈悲", "百子环绕寓意多子多福家庭和睦"], "特色体验": ["摸弥勒肚皮享一生福气", "寻找百名孩童不同姿态，亲子互动拍照"]},
                "LS-013": {"讲解重点": ["简化艺术术语，重点介绍色彩造型等直观元素", "穹顶天象图飞天形象与琉璃七彩光芒"], "特色体验": ["观看《吉祥颂》全息投影互动演出", "欣赏佛教艺术殿堂的精美工艺"]},
                "LS-014": {"讲解重点": ["用简单语言介绍藏传佛教文化", "转经筒的作用与唐卡艺术特色"], "特色体验": ["转动经筒祈福", "体验藏式文化，感受不同民族文化魅力"]},
            },
            "is_active": True,
        },
        {
            "id": "RT-004",
            "name": "拈花湾禅意休闲路线",
            "route_type": "nature",
            "duration": "4小时",
            "description": "漫步拈花湾禅意小镇，感受慢生活与禅意文化的融合。从拈花广场出发，穿越梵天花海，逛香月花街禅意商铺，在拈花堂静心禅坐，最后在五灯湖畔欣赏夜间灯光秀。",
            "gradient": None,
            "spot_order": ["NH-001", "NH-002", "NH-003", "NH-004", "NH-005"],
            "spot_details": {
                "NH-001": {"讲解重点": ["拈花微笑典故，象征顿悟成佛的禅理", "广场融合中式禅意与日式简约风格"], "特色体验": ["与拈花微笑雕塑打卡合影", "参与禅意开园仪式"]},
                "NH-002": {"讲解重点": ["总占地30000平方米，四季有花四季有景", "花伴禅心，一花一世界一叶一菩提"], "特色体验": ["四季观赏不同花卉定格花海瞬间", "景观凉亭静坐俯瞰花海全景"]},
                "NH-003": {"讲解重点": ["800米禅意商业街，白墙黛瓦飞檐翘角", "禅意生活慢享时光，拒绝过度商业化"], "特色体验": ["逛禅意商铺选购文创产品", "体验剪纸陶艺非遗手作，品尝素面禅茶"]},
                "NH-004": {"讲解重点": ["源自拈花悟禅典故，静心修身悟道", "禅坐区抄经区禅茶区三大体验空间"], "特色体验": ["禅坐冥想聆听禅乐", "抄写经文感悟禅理，品鉴禅茶体验禅茶一味"]},
                "NH-005": {"讲解重点": ["湖面约5000平方米，五灯象征五智", "灯映禅心湖光禅意，夜间灯光秀核心场地"], "特色体验": ["白天漫步木质栈道观赏湖景", "夜间观看《禅行》灯光秀"]},
            },
            "is_active": True,
        },
    ]


async def seed():
    base = os.path.dirname(os.path.dirname(__file__))
    docx_path = os.path.join(base, "docs", "灵山胜境 景点结构化数据集.docx")
    spots = parse_docx(docx_path)
    print(f"Parsed {len(spots)} spots from docx")

    routes = get_routes()
    print(f"Prepared {len(routes)} routes")

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        for s in spots:
            await session.merge(ScenicSpot(**s))
        for r in routes:
            await session.merge(TourRoute(**r))
        await session.commit()
    print(f"Seeded {len(spots)} spots + {len(routes)} routes into database")


if __name__ == "__main__":
    asyncio.run(seed())
