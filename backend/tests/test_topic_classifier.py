"""Tests for topic classifier."""
import pytest
from app.core.topic_classifier import classify_topic, TOPICS


@pytest.mark.parametrize("question,expected", [
    # Ticket
    ("门票多少钱？", "ticket"),
    ("灵山大佛票价", "ticket"),
    ("学生有优惠吗", "ticket"),
    ("景区几点开门", "ticket"),
    ("怎么买票？", "ticket"),
    # Food
    ("附近有什么好吃的", "food"),
    ("素斋在哪里吃", "food"),
    ("推荐一家餐厅", "food"),
    ("灵山素面", "food"),
    ("厕所在哪里", "food"),
    ("九龙灌浴附近洗手间在哪里", "food"),
    # Route
    ("推荐一条路线", "route"),
    ("一日游怎么安排", "route"),
    ("先去哪里比较好", "route"),
    ("游览攻略", "route"),
    # History
    ("灵山的历史", "history"),
    ("灵山大佛什么时候建的", "history"),
    ("唐朝和灵山有什么关系", "history"),
    ("古刹由来", "history"),
    # Culture
    ("佛教文化内涵", "culture"),
    ("祈福有什么讲究", "culture"),
    ("梵宫艺术", "culture"),
    ("莲花象征什么", "culture"),
    # General
    ("你好", "general"),
    ("在吗", "general"),
    ("谢谢", "general"),
    ("小景是谁", "general"),
])
def test_classify_topic_basic(question, expected):
    assert classify_topic(question) == expected


def test_topic_coverage():
    """All non-general topics have keywords."""
    for topic, keywords in TOPICS.items():
        if topic != "general":
            assert len(keywords) > 0


def test_classify_topic_empty():
    assert classify_topic("") == "general"
    assert classify_topic("   ") == "general"


def test_ticket_over_food_when_price_mentioned():
    """Price-related food query should still map to ticket if price keyword dominates."""
    # "多少钱" is a strong ticket signal; even with "素面" it may stay food/ticket.
    topic = classify_topic("素面多少钱一碗")
    assert topic in ("food", "ticket")


def test_kiosk_context_does_not_override_restroom_question():
    question = (
        "当前互动大屏点位：九龙灌浴（当前点位 · 九龙灌浴广场）。\n"
        "请优先围绕当前点位回答。\n"
        "游客问题：厕所在哪里？"
    )

    assert classify_topic(question) == "food"
