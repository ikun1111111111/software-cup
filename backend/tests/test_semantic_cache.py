"""Tests for semantic_cache: semantic similarity caching."""
import pytest
import numpy as np
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.semantic_cache import (
    set_cache,
    get_similar,
    _cosine_similarity,
    _embedding_to_b64,
    _embedding_from_b64,
    _hash_question,
)


class TestEmbeddingSerialization:
    """Test vector serialization helpers."""

    def test_embedding_roundtrip(self):
        """Should serialize and deserialize vectors correctly."""
        vec = np.array([0.1, 0.2, 0.3, 0.4], dtype=np.float32)
        b64 = _embedding_to_b64(vec)
        restored = _embedding_from_b64(b64)
        np.testing.assert_array_almost_equal(vec, restored)

    def test_cosine_similarity_identical(self):
        """Cosine similarity of identical vectors should be 1.0."""
        vec = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        assert _cosine_similarity(vec, vec) == pytest.approx(1.0)

    def test_cosine_similarity_orthogonal(self):
        """Cosine similarity of orthogonal vectors should be 0.0."""
        a = np.array([1.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 1.0], dtype=np.float32)
        assert _cosine_similarity(a, b) == pytest.approx(0.0)

    def test_hash_question_stable(self):
        """Same question should produce same hash."""
        h1 = _hash_question("灵山大佛有多高？")
        h2 = _hash_question("灵山大佛有多高？")
        assert h1 == h2
        assert len(h1) == 16


class TestSetCache:
    """Test storing cache entries."""

    @pytest.mark.asyncio
    async def test_set_cache_basic(self):
        """Should store Q&A in Redis hash and zset."""
        mock_redis = MagicMock()
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()
        mock_redis.zadd = AsyncMock()
        mock_redis.zcard = AsyncMock(return_value=5)
        mock_redis.zrange = AsyncMock(return_value=[])
        mock_redis.zrem = AsyncMock()
        mock_redis.hdel = AsyncMock()

        with patch("app.core.semantic_cache.get_redis", return_value=mock_redis), \
             patch("app.core.semantic_cache._encode_question", return_value=np.array([0.1, 0.2], dtype=np.float32)):

            await set_cache("问题", "答案")

        mock_redis.hset.assert_called_once()
        mock_redis.zadd.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_cache_eviction(self):
        """Should evict oldest entries when over limit."""
        mock_redis = MagicMock()
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()
        mock_redis.zadd = AsyncMock()
        mock_redis.zcard = AsyncMock(return_value=1001)
        mock_redis.zrange = AsyncMock(return_value=["old1", "old2"])
        mock_redis.zrem = AsyncMock()
        mock_redis.hdel = AsyncMock()

        with patch("app.core.semantic_cache.get_redis", return_value=mock_redis), \
             patch("app.core.semantic_cache._encode_question", return_value=np.array([0.1, 0.2], dtype=np.float32)):

            await set_cache("问题", "答案")

        mock_redis.zrem.assert_called_once()
        mock_redis.hdel.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_cache_empty_input(self):
        """Should skip empty question or answer."""
        mock_redis = MagicMock()

        with patch("app.core.semantic_cache.get_redis", return_value=mock_redis):
            await set_cache("", "答案")
            await set_cache("问题", "")

        mock_redis.hset.assert_not_called()


class TestGetSimilar:
    """Test semantic cache retrieval."""

    @pytest.mark.asyncio
    async def test_get_similar_hit(self):
        """Should return cached answer for similar question."""
        import json, base64

        vec = np.array([0.1, 0.2], dtype=np.float32)
        b64_vec = base64.b64encode(vec.tobytes()).decode("ascii")

        entry = {
            "question": "灵山大佛高度是多少？",
            "answer": "88米",
            "embedding": b64_vec,
            "timestamp": 1000,
        }

        mock_redis = MagicMock()
        mock_redis.zrevrange = AsyncMock(return_value=["hash1"])
        mock_redis.hmget = AsyncMock(return_value=[json.dumps(entry)])

        with patch("app.core.semantic_cache.get_redis", return_value=mock_redis), \
             patch("app.core.semantic_cache._encode_question", return_value=vec):

            result = await get_similar("灵山大佛有多高？", threshold=0.9)

        assert result == "88米"

    @pytest.mark.asyncio
    async def test_get_similar_miss(self):
        """Should return None when no similar question exists."""
        import json, base64

        vec_a = np.array([1.0, 0.0], dtype=np.float32)
        vec_b = np.array([0.0, 1.0], dtype=np.float32)
        b64_vec = base64.b64encode(vec_b.tobytes()).decode("ascii")

        entry = {
            "question": "完全不同的问题",
            "answer": "答案",
            "embedding": b64_vec,
            "timestamp": 1000,
        }

        mock_redis = MagicMock()
        mock_redis.zrevrange = AsyncMock(return_value=["hash1"])
        mock_redis.hmget = AsyncMock(return_value=[json.dumps(entry)])

        with patch("app.core.semantic_cache.get_redis", return_value=mock_redis), \
             patch("app.core.semantic_cache._encode_question", return_value=vec_a):

            result = await get_similar("灵山大佛有多高？", threshold=0.9)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_similar_empty_cache(self):
        """Should return None when cache is empty."""
        mock_redis = MagicMock()
        mock_redis.zrevrange = AsyncMock(return_value=[])

        with patch("app.core.semantic_cache.get_redis", return_value=mock_redis):
            result = await get_similar("问题")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_similar_empty_question(self):
        """Should return None for empty question."""
        result = await get_similar("")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_similar_redis_failure(self):
        """Should return None on Redis failure."""
        with patch("app.core.semantic_cache.get_redis", side_effect=Exception("Redis down")):
            result = await get_similar("问题")
            assert result is None
