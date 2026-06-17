"""User context manager: maintains recent conversation history in Redis.

Each session stores up to N rounds of dialogue (user + assistant) in a Redis List.
TTL is 24 hours; old sessions auto-expire.
"""
import json
import logging
import time
from typing import TypedDict

from app.core.redis_client import get_redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Configurable via Settings (fallback to defaults)
_CONTEXT_KEY_PREFIX = "session"
_MAX_ROUNDS = getattr(settings, "context_max_rounds", 5)
_CONTEXT_TTL = getattr(settings, "context_ttl", 86400)  # 24h


class HistoryTurn(TypedDict):
    user: str
    assistant: str
    timestamp: int


async def save_turn(session_id: str, user_input: str, assistant_response: str) -> None:
    """Append a completed dialogue turn to the session history.

    Uses LPUSH so the most recent turn is at index 0.
    Trims the list to `_MAX_ROUNDS * 2` entries to bound memory.
    """
    if not session_id or not user_input:
        return

    try:
        redis = await get_redis()
        key = f"{_CONTEXT_KEY_PREFIX}:{session_id}"

        turn = HistoryTurn(
            user=user_input,
            assistant=assistant_response,
            timestamp=int(time.time()),
        )

        # LPUSH new turn, then trim to max rounds
        await redis.lpush(key, json.dumps(turn, ensure_ascii=False))
        await redis.ltrim(key, 0, _MAX_ROUNDS - 1)
        await redis.expire(key, _CONTEXT_TTL)

        logger.debug("Saved turn for session %s (total rounds capped at %d)", session_id, _MAX_ROUNDS)
    except Exception as e:
        logger.warning("Failed to save context turn: %s", e)


async def get_history(session_id: str, max_rounds: int | None = None) -> list[HistoryTurn]:
    """Retrieve recent dialogue turns for a session.

    Returns list ordered from oldest to newest (chronological),
    so it can be directly appended to an LLM prompt.
    """
    if not session_id:
        return []

    limit = max_rounds if max_rounds is not None else _MAX_ROUNDS

    try:
        redis = await get_redis()
        key = f"{_CONTEXT_KEY_PREFIX}:{session_id}"
        raw_list = await redis.lrange(key, 0, limit - 1)

        turns: list[HistoryTurn] = []
        for raw in raw_list:
            try:
                turn = json.loads(raw)
                turns.append(HistoryTurn(user=turn["user"], assistant=turn["assistant"], timestamp=turn.get("timestamp", 0)))
            except (json.JSONDecodeError, KeyError):
                continue

        # Reverse so oldest is first (chronological order for prompt)
        turns.reverse()
        return turns
    except Exception as e:
        logger.warning("Failed to get context history: %s", e)
        return []


async def clear_history(session_id: str) -> None:
    """Delete all history for a session."""
    if not session_id:
        return
    try:
        redis = await get_redis()
        key = f"{_CONTEXT_KEY_PREFIX}:{session_id}"
        await redis.delete(key)
    except Exception as e:
        logger.warning("Failed to clear context history: %s", e)
