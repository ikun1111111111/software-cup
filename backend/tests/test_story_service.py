"""Tests for story service: multi-act storytelling generation."""
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

import pytest

from app.services.story_service import generate_story_acts, _cache_key


FRAMEWORKS_PATH = Path(__file__).resolve().parents[1] / "data" / "story_frameworks.json"


def _frameworks():
    with open(FRAMEWORKS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _mock_redis(cached_value=None):
    redis = AsyncMock()
    if cached_value is None:
        redis.get = AsyncMock(return_value=None)
    else:
        redis.get = AsyncMock(return_value=cached_value)
    redis.set = AsyncMock()
    return redis


class TestGenerateStoryActs:
    """Test generate_story_acts orchestration."""

    @pytest.mark.asyncio
    async def test_unknown_spot_id_raises_value_error(self):
        with patch("app.services.story_service._load_frameworks", AsyncMock(return_value={})), \
             pytest.raises(ValueError, match="Unknown spot_id"):
            await generate_story_acts("does-not-exist", use_cache=False)

    @pytest.mark.asyncio
    async def test_cache_hit_skips_llm(self):
        cached = {
            "spot_id": "ling-shan-da-fo",
            "spot_name": "灵山大佛",
            "description": "x",
            "acts": [{"id": "origin", "title": "缘起", "narration": "cached", "emotion": "think"}],
        }
        redis = _mock_redis(cached_value=json.dumps(cached, ensure_ascii=False))
        frameworks = {"ling-shan-da-fo": {"name": "test spot", "description": "", "acts": []}}
        with patch("app.services.story_service._load_frameworks", AsyncMock(return_value=frameworks)), \
             patch("app.services.story_service.get_redis", AsyncMock(return_value=redis)), \
             patch("app.services.story_service.route", new_callable=AsyncMock) as mock_route:
            result = await generate_story_acts("ling-shan-da-fo", use_cache=True)
            mock_route.assert_not_called()
        assert result["spot_id"] == "ling-shan-da-fo"
        assert result["acts"][0]["narration"] == "cached"

    @pytest.mark.asyncio
    async def test_generates_four_acts_with_correct_structure(self):
        redis = _mock_redis(cached_value=None)

        async def fake_route(task, messages):
            return "narration"

        with patch("app.services.story_service._load_frameworks", AsyncMock(return_value=_frameworks())), \
             patch("app.services.story_service.get_redis", AsyncMock(return_value=redis)), \
             patch("app.services.story_service.retrieve", AsyncMock(return_value=[])), \
             patch("app.services.story_service.route", side_effect=fake_route):
            result = await generate_story_acts("ling-shan-da-fo", use_cache=False)

        assert result["spot_id"] == "ling-shan-da-fo"
        assert result["spot_name"] == "灵山大佛"
        assert len(result["acts"]) == 4
        for act in result["acts"]:
            assert set(act.keys()) == {"id", "title", "narration", "emotion", "act_image", "prompt_hint"}
            assert act["narration"]
            assert act["emotion"] in {"think", "surprise", "smile", "sorry", "neutral"}

    @pytest.mark.asyncio
    async def test_llm_failure_falls_back_to_safe_text(self):
        redis = _mock_redis(cached_value=None)

        async def boom(task, messages):
            raise RuntimeError("llm down")

        with patch("app.services.story_service._load_frameworks", AsyncMock(return_value=_frameworks())), \
             patch("app.services.story_service.get_redis", AsyncMock(return_value=redis)), \
             patch("app.services.story_service.retrieve", AsyncMock(return_value=[])), \
             patch("app.services.story_service.route", side_effect=boom):
            result = await generate_story_acts("ling-shan-da-fo", use_cache=False)

        for act in result["acts"]:
            assert "小景暂时语塞" in act["narration"]

    @pytest.mark.asyncio
    async def test_cache_key_format(self):
        assert _cache_key("ling-shan-da-fo") == "story:acts:ling-shan-da-fo"


class TestActIdAssetAlignment:
    """Every act id must match an existing asset file so StoryPage imageUrl resolves."""

    @pytest.mark.parametrize("spot_id", list(_frameworks().keys()))
    def test_act_ids_match_asset_filenames(self, spot_id):
        fw = _frameworks()[spot_id]
        assets_dir = Path(__file__).resolve().parents[2] / "frontend" / "public" / "image" / "story" / spot_id
        for i, act in enumerate(fw["acts"], start=1):
            expected = assets_dir / f"act-{i}-{act['id']}.jpg"
            assert expected.exists(), (
                f"{spot_id} act {i} id={act['id']} → missing asset {expected.name}"
            )
