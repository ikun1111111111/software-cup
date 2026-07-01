"""情感标签映射：将用户输入/情感分析结果映射为 VRM 可用的表情标签。

支持的 VRM 表情标签：
- happy: 高兴、开心、满意、感谢
- surprised: 惊讶、惊喜、赞叹
- sad: 难过、失望、遗憾
- angry: 生气、愤怒、不满
- relaxed: 轻松、推测、不确定
- thinking: 思考、好奇、疑问
- grateful: 感谢、感恩
- neutral: 中性/默认
"""
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# 关键词 → 情感标签（按优先级排列）
EMOTION_KEYWORDS = {
    "happy": [
        "高兴", "开心", "愉快", "快乐", "棒", "厉害", "太好了", "真不错", "满意",
        "喜欢", "好玩", "有趣", "哈哈", "嘻嘻", "😄", "😊", "👍", "赞",
    ],
    "grateful": [
        "谢谢", "感谢", "感激", "多谢", "辛苦了", "感恩", "🙏",
    ],
    "surprised": [
        "惊讶", "惊喜", "没想到", "竟然", "哇", "天哪", "真的吗", "不可思议",
        "太神奇了", "😮", "😲", "😱",
    ],
    "sad": [
        "难过", "伤心", "遗憾", "失望", "可惜", "不开心", "想哭", "😔", "😢",
    ],
    "angry": [
        "生气", "愤怒", "讨厌", "烦", "气死", "气人", "无语", "不满", "抱怨",
        "不满", "恶心", "讨厌", "😡", "😠", "👎",
    ],
    "relaxed": [
        "也许", "可能", "大概", "或许", "应该", "估计", "想必", "大约",
        "差不多", "好像", "似乎", "仿佛", "无所谓", "随便", "😌",
    ],
    "thinking": [
        "为什么", "怎么", "是什么", "怎样", "如何", "介绍一下", "讲讲", "说说",
        "好奇", "疑问", "❓", "🤔",
    ],
}

# 否定词，用于检测情感反转
NEGATION_WORDS = ["不", "没", "别", "莫", "非", "无"]

# LLM 情感倾向 → VRM 表情
SENTIMENT_TO_EMOTION = {
    "positive": "happy",
    "negative": "sad",
    "neutral": "neutral",
}


def _check_negation(text: str, keyword: str) -> bool:
    """检查关键词前 4 个字内是否有否定词。"""
    idx = text.find(keyword)
    if idx <= 0:
        return False
    prefix = text[max(0, idx - 4):idx]
    return any(neg in prefix for neg in NEGATION_WORDS)


def detect_emotion(text: str, sentiment_label: str = "neutral") -> str:
    """根据文本关键词和 LLM 情感标签推断 VRM 表情。

    Args:
        text: 用户输入文本。
        sentiment_label: LLM 情感分析标签 (positive/neutral/negative)。

    Returns:
        VRM 表情标签字符串。
    """
    if not text:
        return SENTIMENT_TO_EMOTION.get(sentiment_label, "neutral")

    text_lower = text.lower()

    # 1. 关键词匹配（优先级：grateful > surprised > sad > happy > thinking）
    for emotion in ("grateful", "surprised", "sad", "angry", "happy", "relaxed", "thinking"):
        for keyword in EMOTION_KEYWORDS[emotion]:
            if keyword in text_lower:
                # 感恩一般不会被否定，其他情感检查否定
                if emotion == "grateful" or not _check_negation(text_lower, keyword):
                    return emotion

    # 2. 回退到 LLM 情感标签
    return SENTIMENT_TO_EMOTION.get(sentiment_label, "neutral")


def detect_emotion_from_answer(answer: str) -> str:
    """根据 AI 回复文本推断情感（用于直接命中 FAQ/缓存时）。"""
    if not answer:
        return "neutral"

    answer_lower = answer.lower()
    for emotion in ("grateful", "surprised", "sad", "angry", "happy", "relaxed"):
        for keyword in EMOTION_KEYWORDS[emotion]:
            if keyword in answer_lower:
                return emotion
    return "neutral"
