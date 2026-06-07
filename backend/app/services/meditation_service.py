"""Meditation service — zen meditation script generation (M15)."""
import logging

logger = logging.getLogger(__name__)

# Spot-to-sound mapping for sound map
SPOT_SOUND_MAP: dict[str, dict] = {
    "灵山大佛": {
        "sounds": ["bell", "chanting"],
        "description": "钟声与诵经声交织，感受佛光普照的庄严",
        "ambient": "deep_temple",
    },
    "灵山梵宫": {
        "sounds": ["chanting", "bell"],
        "description": "梵音缭绕，沉浸在佛教艺术的神圣氛围中",
        "ambient": "sacred_hall",
    },
    "九龙灌浴": {
        "sounds": ["water", "bell"],
        "description": "水声潺潺，如佛陀诞生时九龙吐水的圣境",
        "ambient": "fountain",
    },
    "五印坛城": {
        "sounds": ["chanting", "wind"],
        "description": "经幡飘动，转经筒声声入耳",
        "ambient": "tibetan",
    },
    "祥符禅寺": {
        "sounds": ["bell", "birds", "wind"],
        "description": "古刹钟声，鸟鸣山幽，千年禅意",
        "ambient": "ancient_temple",
    },
    "拈花湾": {
        "sounds": ["water", "birds", "wind"],
        "description": "流水花语，禅意小镇的宁静时光",
        "ambient": "zen_garden",
    },
    "菩提大道": {
        "sounds": ["birds", "wind"],
        "description": "鸟鸣林间，微风拂面，漫步菩提之路",
        "ambient": "forest_path",
    },
    "佛手广场": {
        "sounds": ["bell", "wind"],
        "description": "清风送福，钟声悠远，感受天下第一掌的庇佑",
        "ambient": "open_plaza",
    },
}

# Default meditation scripts for spots without LLM
DEFAULT_MEDITATION_SCRIPTS: dict[str, str] = {
    "灵山大佛": (
        "请找一个舒适的姿势站好或坐下...慢慢地闭上双眼...\n\n"
        "深呼吸...吸气...感受清新的空气充满胸腔...呼气...让所有的紧张随气息散去...\n\n"
        "想象你正站在灵山大佛脚下...抬头仰望88米高的青铜大佛...阳光洒在佛像上...金色的光芒温暖而柔和...\n\n"
        "感受大佛的慈悲与庄严...让这份宁静流入你的心中...每一个呼吸都让你更加平静...\n\n"
        "当你准备好时...缓缓睁开双眼...带着这份平和继续你的旅程..."
    ),
    "灵山梵宫": (
        "请放松肩膀...让双手自然垂放...闭上眼睛...\n\n"
        "深呼吸...感受灵山梵宫的庄严气息...想象你正站在那座佛教艺术的殿堂中...\n\n"
        "东阳木雕的纹理...敦煌壁画的色彩...琉璃的七彩光芒...都在你的心中绽放...\n\n"
        "让艺术之美净化你的心灵...让千年的智慧在你的呼吸间流淌...\n\n"
        "慢慢回到当下...带着美的感悟...睁开眼睛..."
    ),
    "祥符禅寺": (
        "调整呼吸...让每一次呼吸都更深更慢...\n\n"
        "想象你走在千年古刹的石板路上...身旁是那棵见证了1300年风雨的银杏树...\n\n"
        "听...远处的钟声响起...12.8吨的江南第一钟...声波穿越千年的时光...\n\n"
        "让钟声洗涤你的心灵...让千年的智慧沉淀在你的心中...\n\n"
        "吸气...感受历史的厚重...呼气...放下所有的烦恼...缓缓睁开双眼..."
    ),
}

# Zen report template
ZEN_REPORT_TEMPLATE = """
🧘 灵山禅修报告

📅 日期：{date}
🏞️ 景点：{spots_visited}

🎵 今日声音疗愈：
{sound_sessions}

🧘 冥想记录：
{meditation_sessions}

💭 禅修感悟：
{insights}

🌸 寄语：愿你在灵山的每一刻，都是修行；每一步，都是菩提。
"""


async def generate_meditation_script(spot_name: str, context_chunks: list[dict] | None = None) -> dict:
    """Generate meditation script for a scenic spot.

    Falls back to default scripts if LLM is not available.
    """
    if spot_name in DEFAULT_MEDITATION_SCRIPTS:
        return {
            "spot_name": spot_name,
            "script": DEFAULT_MEDITATION_SCRIPTS[spot_name],
            "source": "default",
            "duration_seconds": 180,
        }

    # Generic script for unknown spots
    return {
        "spot_name": spot_name,
        "script": (
            "请找一个舒适的姿势...闭上眼睛...深呼吸...\n\n"
            f"想象你正身处{spot_name}...感受这里独特的气息和氛围...\n\n"
            "让自然的宁静流入你的心中...每一个呼吸都让你更加放松...\n\n"
            "当你准备好时...缓缓睁开双眼...带着平和继续你的旅程..."
        ),
        "source": "generic",
        "duration_seconds": 120,
    }


async def generate_zen_report(
    spots_visited: list[str],
    meditation_count: int = 0,
    sound_sessions: int = 0,
) -> dict:
    """Generate a zen retreat report."""
    from datetime import date

    return {
        "report": ZEN_REPORT_TEMPLATE.format(
            date=date.today().isoformat(),
            spots_visited="、".join(spots_visited) if spots_visited else "未记录",
            sound_sessions=f"共 {sound_sessions} 次声音疗愈体验",
            meditation_sessions=f"共 {meditation_count} 次冥想练习",
            insights="在灵山的禅修之旅中，感受了自然与文化的和谐统一。",
        ),
        "spots_visited": spots_visited,
        "meditation_count": meditation_count,
        "sound_sessions": sound_sessions,
    }


def get_sound_map(spot_name: str | None = None) -> dict:
    """Get sound map data for spots."""
    if spot_name and spot_name in SPOT_SOUND_MAP:
        return {"spot": spot_name, **SPOT_SOUND_MAP[spot_name]}
    return {"spots": SPOT_SOUND_MAP}
