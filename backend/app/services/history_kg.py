"""History knowledge service — time-travel experience (M14)."""
import logging
from datetime import date

logger = logging.getLogger(__name__)

# Historical timeline data for Lingshan scenic area
HISTORY_TIMELINE = [
    {
        "era": "唐代",
        "year": "627-649",
        "event": "玄奘法师西行取经归来",
        "description": "玄奘法师见此地'层峦丛翠，曲水净秀，山形酷似印度灵鹫山'，命名为'小灵山'，嘱咐大弟子窥基法师在此住持道场。",
        "spot": "祥符禅寺",
    },
    {
        "era": "唐代",
        "year": "650",
        "event": "小灵山庵建立",
        "description": "窥基法师遵师命在此建立小灵山庵，开启灵山千年佛教传承。",
        "spot": "祥符禅寺",
    },
    {
        "era": "北宋",
        "year": "1008-1016",
        "event": "宋真宗赐额'祥符禅寺'",
        "description": "大中祥符年间，宋真宗赐额'祥符禅寺'，寺院进入鼎盛时期。",
        "spot": "祥符禅寺",
    },
    {
        "era": "南宋",
        "year": "1127-1279",
        "event": "兵燹毁坏",
        "description": "南宋时期，祥符禅寺遭兵燹毁坏，佛教传承受到重创。",
        "spot": "祥符禅寺",
    },
    {
        "era": "元代",
        "year": "1271-1368",
        "event": "寺院重建",
        "description": "元代重建祥符禅寺，佛教文化在此地再度复兴。",
        "spot": "祥符禅寺",
    },
    {
        "era": "明代",
        "year": "1368-1644",
        "event": "鼎盛时期",
        "description": "明代祥符禅寺达到鼎盛，香火旺盛，成为江南重要佛教道场。",
        "spot": "祥符禅寺",
    },
    {
        "era": "清末",
        "year": "1850-1912",
        "event": "战火毁坏",
        "description": "清末民初再次毁于战火，仅存千年银杏、六角古井和残垣断壁。",
        "spot": "祥符禅寺",
    },
    {
        "era": "现代",
        "year": "1994",
        "event": "景区规划建设",
        "description": "无锡市政府决定在小灵山建设灵山大佛景区，开启现代佛教文化旅游新篇章。",
        "spot": "灵山大佛",
    },
    {
        "era": "现代",
        "year": "1997",
        "event": "灵山大佛落成开光",
        "description": "11月15日，88米高露天青铜释迦牟尼立像落成开光，赵朴初'五方五佛'理念实现。",
        "spot": "灵山大佛",
    },
    {
        "era": "现代",
        "year": "2009",
        "event": "灵山梵宫开放",
        "description": "1月1日灵山梵宫正式开放，被誉为'佛教艺术的卢浮宫'，汇集多种传统工艺。",
        "spot": "灵山梵宫",
    },
    {
        "era": "现代",
        "year": "2015",
        "event": "拈花湾小镇开放",
        "description": "禅意小镇拈花湾开放，成为灵山胜境的重要组成部分。",
        "spot": "拈花湾",
    },
]


# "On this day in history" cards
HISTORY_TODAY_CARDS = [
    {
        "month": 1,
        "day": 1,
        "title": "梵宫正式开放",
        "year_ago": "2009年",
        "description": "灵山梵宫于2009年元旦正式向公众开放，这座被誉为'佛教艺术的卢浮宫'的建筑，从此成为灵山胜境的璀璨明珠。",
    },
    {
        "month": 11,
        "day": 15,
        "title": "灵山大佛落成开光",
        "year_ago": "1997年",
        "description": "1997年11月15日，高88米的灵山大佛落成开光，成为世界最高露天青铜释迦牟尼立像。至今已巍然屹立近30年。",
    },
    {
        "month": 6,
        "day": 6,
        "title": "玄奘命名小灵山",
        "year_ago": "约1370年前",
        "description": "据传唐代贞观年间，玄奘法师游历至此，见山形酷似印度灵鹫山，命名为'小灵山'，开启了此地的佛教传承。",
    },
]


async def get_timeline(spot_name: str | None = None) -> dict:
    """Get historical timeline, optionally filtered by spot."""
    events = HISTORY_TIMELINE
    if spot_name:
        events = [e for e in events if e["spot"] == spot_name]

    eras = {}
    for e in events:
        eras.setdefault(e["era"], []).append(e)

    return {
        "total_events": len(events),
        "eras": list(eras.keys()),
        "events": events,
    }


async def get_today_card(target_date: date | None = None) -> dict:
    """Get 'On this day in history' card."""
    if target_date is None:
        target_date = date.today()

    # Find matching card or return a random one
    for card in HISTORY_TODAY_CARDS:
        if card["month"] == target_date.month and card["day"] == target_date.day:
            return {"card": card, "match": "exact"}

    # No exact match — return based on day of month
    idx = target_date.day % len(HISTORY_TODAY_CARDS)
    return {"card": HISTORY_TODAY_CARDS[idx], "match": "random"}


async def translate_to_classical(text: str) -> dict:
    """Placeholder for classical Chinese translation (requires LLM)."""
    return {
        "original": text,
        "classical": text,
        "note": "文言文转换需要LLM服务，当前返回原文",
    }
