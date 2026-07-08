"""Theme-aware FAQ fact-coverage tests (≥50 cases across 6 topics).

Each case asks a question that should be answerable from the imported FAQ entries.
The test checks:
  1. Topic classification is correct.
  2. search_faq returns a non-None result.
  3. The returned answer contains at least one expected fact keyword.

Run:
    cd backend
    python -m pytest tests/test_faq_topic.py -v --tb=short
"""
import pytest

from app.core.topic_classifier import classify_topic
from app.core.faq_matcher import search_faq
from app.core.database import async_session


# Each tuple: (question, expected_topic, expected_keywords)
# The keywords are facts that MUST appear in the FAQ answer.
FAQ_TOPIC_CASES = [
    # ticket
    ("灵山胜境门票多少钱？", "ticket", ["210", "元", "门票"]),
    ("灵山胜境开放时间是什么时候？", "ticket", ["8:00", "17:00", "开放"]),
    ("灵山胜境有观光车吗？", "ticket", ["观光车", "40", "225"]),
    ("《灵山吉祥颂》演出时间是什么？", "ticket", ["10:35", "20", "吉祥颂"]),
    ("九龙灌浴演出时间是什么？", "ticket", ["10:00", "九龙灌浴", "15"]),
    ("灵山胜境半价票多少钱？", "ticket", ["105", "半价"]),
    ("灵山胜境哪些人免票？", "ticket", ["免票", "70", "儿童"]),
    ("灵山胜境门票加观光车联票多少钱？", "ticket", ["225", "联票", "观光车"]),
    ("灵山胜境儿童票多少钱？", "ticket", ["105", "儿童", "免票"]),
    ("灵山胜境老人票有优惠吗？", "ticket", ["60", "70", "半价", "免票"]),
    # food
    ("灵山胜境有什么特色美食？", "food", ["素斋", "素面", "50", "35"]),
    ("梵宫素斋自助多少钱？", "food", ["50", "素斋", "自助"]),
    ("灵山素面套餐多少钱？", "food", ["35", "素面"]),
    ("灵山精舍有素斋吗？", "food", ["有", "素斋", "精舍"]),
    ("灵山胜境附近有什么好吃的？", "food", ["素斋", "素面", "江南"]),
    # route
    ("推荐一条灵山胜境历史文化路线？", "route", ["南门", "梵宫", "大佛", "6"]),
    ("推荐一条灵山胜境亲子路线？", "route", ["九龙灌浴", "百子戏弥勒", "4"]),
    ("推荐一条灵山胜境自然风光路线？", "route", ["菩提大道", "曼飞龙塔", "5"]),
    ("游览灵山胜境大概需要多长时间？", "route", ["6", "5", "4", "小时"]),
    ("灵山胜境的最佳游览时间是什么时候？", "route", ["春秋", "3-5", "9-11"]),
    ("第一次去灵山胜境应该怎么游览？", "route", ["大佛", "九龙灌浴", "梵宫"]),
    ("灵山胜境一日游怎么安排？", "route", ["大佛", "梵宫", "九龙灌浴"]),
    # history
    ("小灵山这个名字是怎么来的？", "history", ["玄奘", "灵鹫山", "小灵山"]),
    ("祥符禅寺有什么历史？", "history", ["唐", "北宋", "祥符禅寺"]),
    ("灵山大佛是什么时候建成开光的？", "history", ["1997", "11月15日", "开光"]),
    ("灵山胜境和唐玄奘有什么关系？", "history", ["玄奘", "小灵山", "窥基"]),
    ("灵山胜境的建设历程是怎样的？", "history", ["1994", "1997", "2003", "梵宫"]),
    ("灵山胜境获得过什么荣誉？", "history", ["5A", "世界佛教论坛"]),
    ("灵山大佛有多高？", "general", ["88", "米", "青铜"]),
    ("灵山大佛铸造用了多少吨铜？", "general", ["725", "吨"]),
    ("灵山胜境的历史可以追溯到什么时候？", "history", ["唐代", "贞观", "1300"]),
    ("赵朴初和灵山胜境有什么关系？", "history", ["赵朴初", "五方五佛", "题写"]),
    # culture
    ("灵山梵宫有什么特色？", "culture", ["梵宫", "东方卢浮宫", "7.2"]),
    ("九龙灌浴表演内容是什么？", "culture", ["释迦牟尼", "花开见佛", "九龙"]),
    ("五印坛城有什么文化内涵？", "culture", ["五印", "藏传佛教", "曼陀罗"]),
    ("曼飞龙塔是什么？", "culture", ["南传佛教", "曼飞龙塔", "九塔"]),
    ("灵山胜境的佛教文化主要体现在哪些方面？", "culture", ["建筑", "梵宫", "九龙灌浴"]),
    ("灵山胜境有哪些祈福体验？", "culture", ["九龙灌浴", "天下第一掌", "抱佛脚"]),
    ("灵山梵宫有哪些非遗艺术？", "culture", ["东阳木雕", "琉璃", "景泰蓝"]),
    ("灵山胜境举办过什么重要活动？", "culture", ["世界佛教论坛"]),
    ("天下第一掌有什么寓意？", "culture", ["天下第一掌", "沾福气", "保平安"]),
    ("百子戏弥勒有什么寓意？", "culture", ["百子戏弥勒", "皆大欢喜"]),
    # general
    ("灵山胜境位于哪里？", "general", ["无锡", "太湖", "马山"]),
    ("灵山胜境有哪些主要景点？", "general", ["大佛", "梵宫", "九龙灌浴", "五印坛城"]),
    ("灵山大佛的佛手广场有什么特色？", "general", ["天下第一掌", "佛手"]),
    ("降魔浮雕表现的是什么故事？", "general", ["佛陀", "魔王", "成道"]),
    ("阿育王柱有什么文化内涵？", "culture", ["阿育王柱", "佛法", "狮子"]),
    ("祥符禅寺在哪里？", "general", ["灵山大佛", "基座", "中轴"]),
    ("五明桥代表什么？", "general", ["五明", "智慧", "声明", "因明"]),
    ("佛足坛有什么寓意？", "culture", ["佛足", "佛光普照", "圆满"]),
    ("灵山胜境的导游服务多少钱？", "ticket", ["300", "导游"]),
    ("灵山胜境可以带宠物吗？", "general", ["不可以", "宠物"]),
]


@pytest.mark.parametrize("question,expected_topic,keywords", FAQ_TOPIC_CASES)
def test_topic_classification(question, expected_topic, keywords):
    """Every FAQ question should be classified into the expected topic."""
    assert classify_topic(question) == expected_topic


@pytest.mark.asyncio
@pytest.mark.parametrize("question,expected_topic,keywords", FAQ_TOPIC_CASES)
async def test_faq_answer_contains_facts(question, expected_topic, keywords):
    """Every FAQ question should return an answer containing expected facts."""
    async with async_session() as db:
        result = await search_faq(question, db, topic=expected_topic)
    assert result is not None, f"FAQ not found: {question}"
    answer = result["answer"].lower()
    assert any(kw.lower() in answer for kw in keywords), (
        f"Answer for '{question}' missing expected facts {keywords}: {result['answer']}"
    )


@pytest.mark.asyncio
async def test_faq_fact_coverage():
    """Overall fact coverage across all FAQ_TOPIC_CASES must be ≥90%."""
    passed = 0
    failures = []
    async with async_session() as db:
        for question, expected_topic, keywords in FAQ_TOPIC_CASES:
            result = await search_faq(question, db, topic=expected_topic)
            if result is None:
                failures.append((question, keywords, "no faq hit"))
                continue
            answer = result["answer"].lower()
            if any(kw.lower() in answer for kw in keywords):
                passed += 1
            else:
                failures.append((question, keywords, result["answer"]))

    total = len(FAQ_TOPIC_CASES)
    coverage = passed / total if total else 0.0
    print(f"\nFAQ fact coverage: {passed}/{total} = {coverage:.1%}")
    for q, kws, actual in failures[:10]:
        print(f"  FAIL: {q} | expected {kws} | got {actual[:60]}...")
    assert coverage >= 0.90, f"FAQ fact coverage {coverage:.1%} below 90%"
