"""Shared test fixtures for backend tests."""
import pytest
import asyncio
from app.core.config import get_settings


@pytest.fixture(scope="session")
def settings():
    """Provide application settings."""
    return get_settings()


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_text_cn():
    """Sample Chinese text for testing."""
    return (
        "灵山胜境位于江苏省无锡市滨湖区马山镇，是国家AAAAA级旅游景区。"
        "景区以灵山大佛闻名，灵山大佛高88米，是目前中国最高的青铜立佛。"
        "灵山胜境的主要景点包括灵山大佛、九龙灌浴、梵宫、五印坛城等。"
    )


@pytest.fixture
def sample_long_text():
    """A longer text for chunking tests."""
    paragraphs = []
    for i in range(20):
        paragraphs.append(
            f"这是第{i+1}段测试文本。灵山胜境位于江苏省无锡市，是一处集自然风光与佛教文化于一体的著名景区。"
            f"每年都有大量游客前来参观灵山大佛，感受佛教文化的庄严与祥和。"
            f"景区内的梵宫被誉为东方卢浮宫，汇集了众多珍贵的佛教艺术品。"
        )
    return "\n\n".join(paragraphs)


@pytest.fixture
def sample_faq_data():
    """Sample FAQ entries for testing."""
    return [
        {
            "question": "灵山胜境在哪里？",
            "answer": "灵山胜境位于江苏省无锡市滨湖区马山镇。",
            "keywords": "位置,地址,哪里",
            "category": "general",
        },
        {
            "question": "灵山大佛有多高？",
            "answer": "灵山大佛高88米，是中国最高的青铜立佛。",
            "keywords": "高度,多高,88米",
            "category": "spots",
        },
        {
            "question": "门票多少钱？",
            "answer": "成人票210元，优待票105元。",
            "keywords": "门票,票价,价格,多少钱",
            "category": "ticket",
        },
    ]
