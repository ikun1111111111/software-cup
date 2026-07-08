"""Semantic cache: reduces LLM calls by matching semantically similar questions.

Uses a lightweight sentence-transformer model (bge-small-zh-v1.5) to encode
questions into 384-dim vectors. Cached answers are stored in Redis and
retrieved via cosine-similarity scan.

Design trade-off: we scan the N most recent cache entries rather than using a
vector DB, because the cache size is small (< 1000 entries) and this avoids
adding another dependency.
"""
import json
import logging
import re
import time
from typing import TypedDict

import numpy as np

from app.core.redis_client import get_redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy-loaded encoder
_encoder = None
_encoder_load_failed = False

_CACHE_KEY_PREFIX = "semantic_cache"
# Configurable via Settings
_MAX_ENTRIES = getattr(settings, "semantic_cache_max_entries", 1000)
_SIMILARITY_THRESHOLD = getattr(settings, "semantic_cache_similarity_threshold", 0.97)
_CACHE_TTL = getattr(settings, "semantic_cache_ttl", 3600)  # 1h


class CacheEntry(TypedDict):
    question: str
    answer: str
    embedding: list[float]
    timestamp: int


def _get_encoder():
    """Lazy-load the lightweight semantic encoder."""
    global _encoder, _encoder_load_failed
    if _encoder_load_failed:
        raise RuntimeError("Semantic cache encoder previously failed to load")
    if _encoder is not None:
        return _encoder
    try:
        from sentence_transformers import SentenceTransformer
        model_name = getattr(settings, "semantic_cache_model", "BAAI/bge-small-zh-v1.5")
        logger.info("Loading semantic cache encoder: %s", model_name)
        _encoder = SentenceTransformer(model_name, device="cpu", local_files_only=True)
        logger.info("Semantic cache encoder loaded")
    except Exception as e:
        _encoder_load_failed = True
        logger.error("Failed to load semantic cache encoder: %s", e)
        raise RuntimeError(
            "sentence-transformers not available. "
            "Install it: pip install sentence-transformers"
        ) from e
    return _encoder


async def _encode_question(question: str) -> np.ndarray:
    """Encode a question into a normalized 384-dim vector."""
    encoder = _get_encoder()
    # BGE models benefit from a prefix for retrieval tasks
    text = f"Represent this sentence for searching relevant passages: {question}"
    loop = __import__('asyncio').get_running_loop()
    vec = await loop.run_in_executor(None, lambda: encoder.encode(text, normalize_embeddings=True))
    return vec


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two normalized vectors."""
    # Both are already normalized by encoder, so dot product = cosine similarity
    return float(np.dot(a, b))


def _embedding_to_b64(vec: np.ndarray) -> str:
    """Serialize numpy vector to base64 string for Redis storage."""
    import base64
    return base64.b64encode(vec.astype(np.float32).tobytes()).decode("ascii")


def _embedding_from_b64(b64: str) -> np.ndarray:
    """Deserialize base64 string back to numpy vector."""
    import base64
    raw = base64.b64decode(b64.encode("ascii"))
    return np.frombuffer(raw, dtype=np.float32)


async def set_cache(question: str, answer: str) -> None:
    """Store a Q&A pair in the semantic cache.

    The question is encoded and stored alongside the answer.
    Old entries are evicted when the cache exceeds `_MAX_ENTRIES`.
    """
    if not question or not answer:
        return

    try:
        vec = await _encode_question(question)
        entry = CacheEntry(
            question=question,
            answer=answer,
            embedding=_embedding_to_b64(vec),
            timestamp=int(time.time()),
        )

        redis = await get_redis()
        # Use a Redis Hash keyed by question hash for deduplication
        q_hash = _hash_question(question)
        hash_key = f"{_CACHE_KEY_PREFIX}:entries"

        await redis.hset(hash_key, q_hash, json.dumps(entry, ensure_ascii=False))
        await redis.expire(hash_key, _CACHE_TTL)

        # Maintain a sorted index by recency (ZSET: score=timestamp, member=q_hash)
        index_key = f"{_CACHE_KEY_PREFIX}:index"
        await redis.zadd(index_key, {q_hash: entry["timestamp"]})
        await redis.expire(index_key, _CACHE_TTL)

        # Evict oldest if over limit
        count = await redis.zcard(index_key)
        if count and count > _MAX_ENTRIES:
            oldest = await redis.zrange(index_key, 0, count - _MAX_ENTRIES - 1)
            if oldest:
                await redis.zrem(index_key, *oldest)
                await redis.hdel(hash_key, *oldest)
                logger.debug("Evicted %d old semantic cache entries", len(oldest))

        logger.debug("Semantic cache set: %s... -> %s...", question[:20], answer[:20])
    except Exception as e:
        logger.warning("Failed to set semantic cache: %s", e)


async def get_similar(question: str, threshold: float | None = None, max_scan: int = 100) -> str | None:
    """Find a semantically similar cached question and return its answer.

    Args:
        question: The new user question.
        threshold: Minimum cosine similarity to accept a match (default from config).
        max_scan: Maximum number of recent cache entries to scan.

    Returns:
        The cached answer if a match is found, else None.
    """
    if not question:
        return None

    # Skip cache for very short or generic greetings to avoid false hits
    stripped = question.strip()
    if len(stripped) <= 6:
        return None

    threshold = threshold if threshold is not None else _SIMILARITY_THRESHOLD

    try:
        vec = await _encode_question(question)
        redis = await get_redis()
        index_key = f"{_CACHE_KEY_PREFIX}:index"
        hash_key = f"{_CACHE_KEY_PREFIX}:entries"

        # Fetch the N most recent entries (by timestamp desc)
        q_hashes = await redis.zrevrange(index_key, 0, max_scan - 1)
        if not q_hashes:
            return None

        # Batch fetch entries
        raw_entries = await redis.hmget(hash_key, *q_hashes)

        best_score = -1.0
        best_answer: str | None = None

        for raw in raw_entries:
            if not raw:
                continue
            try:
                entry: CacheEntry = json.loads(raw)
                cached_vec = _embedding_from_b64(entry["embedding"])
                score = _cosine_similarity(vec, cached_vec)
                if score > best_score:
                    best_score = score
                    best_answer = entry["answer"]
            except (json.JSONDecodeError, KeyError, ValueError):
                continue

        # Guard against false hits on identical sentence patterns with different numbers
        # e.g. "灵山一日游" vs "灵山五日游" -> same embedding but different intent
        if best_score >= threshold and best_answer is not None:
            # We need the cached question for the best entry — re-scan to find it
            cached_question = ""
            for raw in raw_entries:
                if not raw:
                    continue
                try:
                    entry: CacheEntry = json.loads(raw)
                    cached_vec = _embedding_from_b64(entry["embedding"])
                    score = _cosine_similarity(vec, cached_vec)
                    if score == best_score:
                        cached_question = entry["question"]
                        break
                except (json.JSONDecodeError, KeyError, ValueError):
                    continue

            if cached_question and _has_critical_difference(question, cached_question):
                logger.info(
                    "Semantic cache blocked (score=%.3f): critical difference between '%s' and '%s'",
                    best_score, question[:30], cached_question[:30],
                )
                return None

            logger.info(
                "Semantic cache hit (score=%.3f, threshold=%.3f): %s...",
                best_score, threshold, question[:30],
            )
            return best_answer

        logger.debug("Semantic cache miss (best_score=%.3f < %.3f): %s...", best_score, threshold, question[:30])
        return None
    except Exception as e:
        logger.warning("Semantic cache lookup failed: %s", e)
        return None


def _hash_question(question: str) -> str:
    """Stable hash for a question string (used as Redis hash field)."""
    import hashlib
    return hashlib.md5(question.encode("utf-8")).hexdigest()[:16]


# --- Critical-difference guard ---
_NUMBER_PATTERN = re.compile(r"(\d+)")
_DAY_KEYWORDS = frozenset(["一日游", "两日游", "三日游", "四日游", "五日游", "六日游", "七日游", "半日游"])


def _has_critical_difference(q1: str, q2: str) -> bool:
    """Return True if q1 and q2 differ in key intent-bearing tokens (e.g., numbers, day-trip count)."""
    s1, s2 = q1.strip(), q2.strip()
    # Exact match should never happen here, but guard anyway
    if s1 == s2:
        return False

    # Check for differing numbers (integers)
    nums1 = _NUMBER_PATTERN.findall(s1)
    nums2 = _NUMBER_PATTERN.findall(s2)
    if nums1 != nums2:
        return True

    # Check for differing Chinese day-trip keywords
    for kw in _DAY_KEYWORDS:
        if (kw in s1) != (kw in s2):
            return True

    return False
