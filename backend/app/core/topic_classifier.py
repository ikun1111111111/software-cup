"""Rule-based topic classifier for tourist questions."""
import logging
import jieba

logger = logging.getLogger(__name__)

TOPICS = {
    "history": [
        "历史", "朝代", "建成", "建造", "建的", "修建", "始建", "起源", "由来",
        "古刹", "古寺", "玄奘", "唐僧", "唐朝", "宋代", "明朝", "清朝", "元代",
        "古代", "千年", "悠久", "变迁", "什么时候",
        "建设", "历程", "荣誉", "赵朴初", "开光", "小灵山", "名字",
    ],
    "culture": [
        "文化", "佛教", "佛法", "禅宗", "禅意", "艺术", "雕刻", "造像", "祈福",
        "宗教", "内涵", "传承", "底蕴", "莲花", "经文", "菩萨", "释迦牟尼",
        "梵宫", "表演内容", "曼飞龙塔", "非遗", "天下第一掌", "百子戏弥勒", "寓意",
        "举办",
    ],
    "route": [
        "路线", "行程", "攻略", "游览", "怎么逛", "先去", "推荐", "安排",
        "规划", "一日游", "两日游", "三日游", "游玩顺序", "怎么走", "路线推荐", "游玩攻略",
        "历史文化路线", "亲子路线", "自然风光路线", "最佳游览时间", "第一次",
    ],
    "food": [
        "美食", "餐饮", "吃饭", "餐厅", "吃什么", "推荐吃的", "素斋", "素面",
        "素食", "小吃", "周边美食", "附近吃的", "好吃的", "饭店", "餐馆", " dining",
        "food", "eat", "meal",
        "素斋自助", "素面套餐",
        "厕所", "洗手间", "卫生间", "卫生间在哪里", "洗手间在哪里", " restroom", "toilet", "wc",
        "服务区", "游客中心", "休息", "休息区", "母婴室", "医务室",
    ],
    "ticket": [
        "门票", "票价", "价格", "优惠", "购票", "多少钱", "开放时间", "怎么买",
        "预约", "订票", "票价多少", "儿童票", "老人票", "学生票", "免票",
        "营业时间", "几点开门", "几点关门",
        "演出时间", "联票", "观光车",
    ],
    "general": [],
}

# Topic order matters for tie-breaking: earlier topic wins when scores equal.
TOPIC_ORDER = ["ticket", "food", "route", "history", "culture", "general"]


def normalize_question(question: str) -> str:
    """Extract the tourist's actual question from kiosk context wrappers."""
    q = question.strip()
    marker = "游客问题："
    if marker in q:
        q = q.rsplit(marker, 1)[-1].strip()
    return q


def classify_topic(question: str) -> str:
    """Classify a user question into one of the predefined topics.

    Strategy:
        1. Keyword exact match (multi-character keywords get higher weight).
        2. Jieba token overlap for unknown words.
        3. Default to "general".

    Returns:
        One of: history, culture, route, food, ticket, general.
    """
    if not question:
        return "general"

    q = normalize_question(question).strip().lower()
    if not q:
        return "general"

    scores: dict[str, float] = {t: 0.0 for t in TOPIC_ORDER}

    # Step 1: weighted keyword matching
    for topic, keywords in TOPICS.items():
        for kw in keywords:
            kw_lower = kw.lower()
            if kw_lower in q:
                # Longer keywords are more specific -> higher weight
                weight = 1.0 + min(len(kw) * 0.05, 1.0)
                scores[topic] += weight

    # Step 2: jieba token overlap (fallback for paraphrases)
    tokens = set(t.strip().lower() for t in jieba.cut(q) if len(t.strip()) > 1)
    for topic, keywords in TOPICS.items():
        kw_set = set(k.lower() for k in keywords if len(k) > 1)
        if not kw_set:
            continue
        overlap = tokens & kw_set
        if overlap:
            scores[topic] += len(overlap) * 0.3

    # Pick best topic; tie-break by TOPIC_ORDER (more specific first)
    best_topic = "general"
    best_score = scores["general"]
    for topic in TOPIC_ORDER:
        if topic == "general":
            continue
        if scores[topic] > best_score:
            best_score = scores[topic]
            best_topic = topic

    logger.debug("[topic_classifier] question=%r topic=%s scores=%s", q, best_topic, scores)
    return best_topic
