"""Tests for prompt templates."""
from app.core.prompts import (
    SYSTEM_PROMPT_CHAT,
    SYSTEM_PROMPT_VERIFY,
    SYSTEM_PROMPT_SENTIMENT,
    build_chat_prompt,
)


class TestPrompts:
    """Test prompt template constants and builders."""

    def test_system_prompt_chat_content(self):
        """Chat system prompt should contain key instructions."""
        assert "小景" in SYSTEM_PROMPT_CHAT
        assert "不要编造信息" in SYSTEM_PROMPT_CHAT
        assert "200字以内" in SYSTEM_PROMPT_CHAT

    def test_system_prompt_verify_content(self):
        """Verify system prompt should contain judgment rules."""
        assert "YES" in SYSTEM_PROMPT_VERIFY
        assert "NO" in SYSTEM_PROMPT_VERIFY
        assert "UNCERTAIN" in SYSTEM_PROMPT_VERIFY

    def test_system_prompt_sentiment_json(self):
        """Sentiment prompt should require JSON output."""
        assert "JSON" in SYSTEM_PROMPT_SENTIMENT
        assert "positive|neutral|negative" in SYSTEM_PROMPT_SENTIMENT

    def test_build_chat_prompt_structure(self):
        """Should return list of message dicts with system + user roles."""
        chunks = [
            {"text": "灵山大佛高88米。"},
            {"text": "梵宫是灵山胜境的标志性建筑。"},
        ]
        messages = build_chat_prompt("灵山大佛多高？", chunks)

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "小景" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert "灵山大佛多高？" in messages[1]["content"]
        assert "灵山大佛高88米" in messages[1]["content"]

    def test_build_chat_prompt_empty_chunks(self):
        """Should handle empty chunks gracefully."""
        messages = build_chat_prompt("test", [])
        assert len(messages) == 2
        assert messages[1]["role"] == "user"
        assert "test" in messages[1]["content"]

    def test_build_chat_prompt_chunk_numbering(self):
        """Chunks should be numbered in the prompt."""
        chunks = [
            {"text": "片段一"},
            {"text": "片段二"},
            {"text": "片段三"},
        ]
        messages = build_chat_prompt("问", chunks)
        content = messages[1]["content"]
        assert "[资料片段 1]" in content
        assert "[资料片段 2]" in content
        assert "[资料片段 3]" in content
