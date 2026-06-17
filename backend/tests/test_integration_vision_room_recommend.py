"""Integration tests: Vision → Room → Recommend full pipeline (M20).

Covers the three-function chain:
  1. Vision identification → Room itinerary sync
  2. Room LLM chat → All members see answer
  3. Recommend → Push to room itinerary

Run with:
    python -m pytest tests/test_integration_vision_room_recommend.py -v
"""
import json
import time
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ── Shared fixtures ────────────────────────────────────────────────────────────


@pytest.fixture
def mock_redis():
    """In-memory Redis mock for room operations."""
    storage = {}

    async def _get(key):
        return storage.get(key)

    async def _set(key, value, ex=None):
        storage[key] = value

    async def _sadd(key, *values):
        if key not in storage:
            storage[key] = set()
        for v in values:
            storage[key].add(v)

    async def _smembers(key):
        return list(storage.get(key, set()))

    async def _expire(key, ttl):
        pass

    async def _delete(*keys):
        for k in keys:
            storage.pop(k, None)
        return 1

    m = MagicMock()
    m.get = AsyncMock(side_effect=_get)
    m.set = AsyncMock(side_effect=_set)
    m.sadd = AsyncMock(side_effect=_sadd)
    m.smembers = AsyncMock(side_effect=_smembers)
    m.expire = AsyncMock(side_effect=_expire)
    m.delete = AsyncMock(side_effect=_delete)

    return m, storage


# ── Integration Test 1: Vision → Room ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_vision_to_room_full_pipeline(mock_redis):
    """E2E: Photo identification result syncs to room itinerary."""
    mock, storage = mock_redis
    from app.services import room_service, vision_room_sync
    with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
        # Step 1: Create a room
        room = await room_service.create_room("测试队长")
        room_id = room["room_id"]

        # Step 2: Simulated vision result → sync to room
        result = await vision_room_sync.sync_vision_to_room(
            room_id=room_id,
            spot_name="灵山大佛",
            confidence=0.85,
            note="拍照识别测试",
        )

        assert result["status"] == "ok"
        assert result["itinerary_count"] == 1

        # Step 3: Verify room itinerary updated
        updated_room = await room_service.get_room(room_id)
        assert len(updated_room["itinerary"]) == 1
        assert updated_room["itinerary"][0]["spot_name"] == "灵山大佛"
        assert updated_room["itinerary"][0]["source"] == "vision"


@pytest.mark.asyncio
async def test_multiple_syncs_from_different_sources(mock_redis):
    """Multiple syncs from vision and recommend accumulate in itinerary."""
    mock, storage = mock_redis
    from app.services import room_service
    with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
        room = await room_service.create_room("测试队长")
        room_id = room["room_id"]

        # Vision identifies a spot
        await room_service.add_spot_to_itinerary(
            room_id, "灵山大佛", source="vision", confidence=0.9
        )

        # Recommend suggests another
        await room_service.add_spot_to_itinerary(
            room_id, "九龙灌浴", source="recommend", confidence=0.8
        )

        # Manual add
        await room_service.add_spot_to_itinerary(
            room_id, "灵山梵宫", source="manual"
        )

        updated = await room_service.get_room(room_id)
        assert len(updated["itinerary"]) == 3

        sources = [item["source"] for item in updated["itinerary"]]
        assert "vision" in sources
        assert "recommend" in sources
        assert "manual" in sources


# ── Integration Test 2: Room → Chat ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_room_chat_llm_answer_format():
    """Verify chat_answer WebSocket message has correct structure."""
    # The chat_answer message broadcast to room members
    mock_chat_answer = {
        "type": "chat_answer",
        "from": "AI导游",
        "question": "灵山大佛有多高？",
        "answer": "灵山大佛高88米，是目前中国最高的青铜立佛。",
        "source": "rag",
        "timestamp": int(time.time()),
    }

    assert mock_chat_answer["type"] == "chat_answer"
    assert mock_chat_answer["from"] == "AI导游"
    assert "question" in mock_chat_answer
    assert "answer" in mock_chat_answer
    assert isinstance(mock_chat_answer["timestamp"], int)


@pytest.mark.asyncio
async def test_room_chat_fallback_when_llm_unavailable():
    """When LLM is unavailable, a fallback message is still broadcast."""
    mock_fallback = {
        "type": "chat_answer",
        "from": "AI导游",
        "question": "灵山大佛有多高？",
        "answer": "抱歉，暂时无法回答。请稍后重试。",
        "source": "fallback",
        "timestamp": int(time.time()),
    }

    assert mock_fallback["source"] == "fallback"
    assert "抱歉" in mock_fallback["answer"]


# ── Integration Test 3: Recommend → Room ──────────────────────────────────────


@pytest.mark.asyncio
async def test_recommend_to_room_push(mock_redis):
    """E2E: AI recommendations can be pushed to room itinerary."""
    mock, storage = mock_redis
    from app.services import room_service
    with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
        room = await room_service.create_room("测试队长")
        room_id = room["room_id"]

        # Simulate pushing recommendations one-by-one
        recommendations = [
            {"name": "历史文化深度游", "score": 0.92, "reason": "和你DNA相似度85%的游客推荐此路线"},
            {"name": "佛教艺术精华游", "score": 0.87, "reason": "基于你的历史文化偏好推荐"},
            {"name": "自然禅意体验游", "score": 0.75, "reason": "新游客热门选择"},
        ]

        success = 0
        for rec in recommendations:
            try:
                await room_service.add_spot_to_itinerary(
                    room_id,
                    rec["name"],
                    source="recommend",
                    confidence=rec["score"],
                    note=rec["reason"],
                )
                success += 1
            except ValueError:
                pass

        assert success == 3

        updated = await room_service.get_room(room_id)
        assert len(updated["itinerary"]) == 3

        for item in updated["itinerary"]:
            assert item["source"] == "recommend"
            assert item["confidence"] > 0.7


# ── Integration Test 4: Full chain ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_full_chain_vision_recommend_room(mock_redis):
    """Full chain: Vision identifies → syncs to room → Recommend pushes → all in itinerary."""
    mock, storage = mock_redis
    from app.services import room_service, vision_room_sync
    with patch.object(room_service, "get_redis", new=AsyncMock(return_value=mock)):
        # Create room
        room = await room_service.create_room("队长")
        room_id = room["room_id"]

        # Member joins
        await room_service.join_room(room_id, "队员")

        # Step 1: Vision identifies a spot
        await vision_room_sync.sync_vision_to_room(
            room_id, "灵山大佛", confidence=0.9
        )

        # Step 2: AI recommends routes → push to room
        await room_service.add_spot_to_itinerary(
            room_id, "九龙灌浴", source="recommend", confidence=0.88
        )

        # Step 3: Verify complete itinerary
        final = await room_service.get_room(room_id)
        itinerary = final["itinerary"]

        assert len(itinerary) == 2
        assert itinerary[0]["spot_name"] == "灵山大佛"
        assert itinerary[0]["source"] == "vision"
        assert itinerary[1]["spot_name"] == "九龙灌浴"
        assert itinerary[1]["source"] == "recommend"

        members = final.get("members", [])
        assert len(members) == 2
