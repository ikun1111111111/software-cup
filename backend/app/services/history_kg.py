"""History knowledge service — time-travel experience (M14)."""
import logging
from datetime import date

logger = logging.getLogger(__name__)

# Historical timeline data for Lingshan scenic area
HISTORY_TIMELINE = [
    {
        "era": "唐代",
        "year": "627-649",
        "event": "玄奘命名小灵山",
        "description": "唐贞观年间，玄奘法师西行取经归来，途经马山，见此地'层峦丛翠，曲水净秀，山形酷似印度灵鹫山'，遂将所译《大般若经》中的'灵鹫胜境'之名赐予此地，命名为'小灵山'。",
        "spot": "祥符禅寺",
    },
    {
        "era": "唐代",
        "year": "650",
        "event": "窥基兴建小灵山庵",
        "description": "玄奘嘱咐大弟子窥基法师在此住持道场、兴建小灵山庵。寺院背靠灵山主峰，面朝太湖碧波，左右青龙、白虎二山环抱，奠定了灵山佛教文化的根基。",
        "spot": "祥符禅寺",
    },
    {
        "era": "北宋",
        "year": "1008-1016",
        "event": "祥符禅寺获赐额",
        "description": "北宋大中祥符年间，宋真宗赵恒赐额'祥符禅寺'。小灵山庵历经数百年发展后规模扩大，寺名正式写入朝廷记忆，也成为江南佛教香火的重要节点。",
        "spot": "祥符禅寺",
    },
    {
        "era": "南宋",
        "year": "1127-1279",
        "event": "兵燹毁坏",
        "description": "南宋时期，祥符禅寺曾遭兵燹毁坏，殿宇与经声一度沉寂。灵山的佛教传承没有消失，而是从鼎盛转入艰难存续。",
        "spot": "祥符禅寺",
    },
    {
        "era": "元代",
        "year": "1271-1368",
        "event": "旧址重建复兴",
        "description": "元代在旧址上重建祥符禅寺，殿宇、僧众与礼佛活动重新聚拢。小灵山的佛教文化由此再度复兴，延续唐宋留下的山寺脉络。",
        "spot": "祥符禅寺",
    },
    {
        "era": "明代",
        "year": "1368-1644",
        "event": "祥符禅寺香火鼎盛",
        "description": "明代祥符禅寺达到鼎盛，香火旺盛、法事频仍，成为太湖之滨重要的佛教道场。灵山从一处山寺，逐渐沉淀为江南佛教文化记忆。",
        "spot": "祥符禅寺",
    },
    {
        "era": "清末",
        "year": "1850-1912",
        "event": "古井银杏留存",
        "description": "清末民初，祥符禅寺再次毁于战火。千年银杏、六角古井与残垣断壁成为少数留存的历史证据，也让后来的修复有了可追溯的原点。",
        "spot": "祥符禅寺",
    },
    {
        "era": "现代",
        "year": "1994",
        "event": "修复古刹与大佛工程奠基",
        "description": "1994年，'修复祥符禅寺、建造灵山大佛'工程奠基。赵朴初提出'五方五佛'之论，认为东方空缺正待填补，现代灵山胜境由此起步。",
        "spot": "灵山大佛",
    },
    {
        "era": "现代",
        "year": "1997",
        "event": "灵山大佛落成开光",
        "description": "1997年11月15日，88米高露天青铜释迦牟尼立像落成开光，成为灵山胜境的标志性建筑，也让赵朴初'五方五佛'中的东方大佛理念落地。",
        "spot": "灵山大佛",
    },
    {
        "era": "现代",
        "year": "2003",
        "event": "九龙灌浴轴线开放",
        "description": "二期工程以九龙灌浴为主体建成开放，完成佛祖四相成道的轴线布局。莲花缓缓开启、九龙吐水沐浴太子佛像，'花开见佛'从典故变成游客可参与的祈福体验。",
        "spot": "九龙灌浴",
    },
    {
        "era": "现代",
        "year": "2006-2009",
        "event": "三期工程与梵宫开放",
        "description": "三期主体工程包括灵山梵宫、五印坛城、曼飞龙塔等空间。灵山梵宫于2009年1月1日开放，汇集东阳木雕、敦煌壁画、扬州漆器、景泰蓝等传统工艺，并成为世界佛教论坛主会场。",
        "spot": "灵山梵宫",
    },
    {
        "era": "现代",
        "year": "2015",
        "event": "拈花湾小镇开放",
        "description": "禅意小镇拈花湾开放，灵山的游览体验从朝圣礼佛延展到禅意度假、夜游演艺与慢行街巷，成为灵山胜境面向当代游客的另一种表达。",
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
        "description": "灵山梵宫于2009年元旦正式向公众开放，汇集东阳木雕、敦煌壁画、扬州漆器、景泰蓝等传统工艺，并成为世界佛教论坛主会场。",
    },
    {
        "month": 11,
        "day": 15,
        "title": "灵山大佛落成开光",
        "year_ago": "1997年",
        "description": "1997年11月15日，高88米的灵山大佛落成开光，成为灵山胜境标志性建筑，也让赵朴初'五方五佛'中的东方大佛理念落地。",
    },
    {
        "month": 6,
        "day": 6,
        "title": "玄奘命名小灵山",
        "year_ago": "约1370年前",
        "description": "唐贞观年间，玄奘法师见马山山形酷似印度灵鹫山，将'灵鹫胜境'之名赐予此地，命名为'小灵山'。",
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
