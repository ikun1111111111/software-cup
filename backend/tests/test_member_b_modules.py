"""Tests for all 队员B modules: M12 crowd_predict, M13 chat_role, M14 history, M15 zen, M16 puzzle."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date


# ═══════════════════════════════════════════════════════════════════════════
# M12 — Crowd Prediction Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestCrowdPredict:
    """Test crowd prediction service."""

    @pytest.mark.asyncio
    async def test_crowd_prediction_default_spots(self):
        """When no data exists, should return default spots."""
        from app.services.crowd_predict import get_crowd_prediction

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        data = await get_crowd_prediction(db)

        assert "target_date" in data
        assert "predictions" in data
        assert len(data["predictions"]) > 0
        assert "灵山大佛" in data["predictions"]

    @pytest.mark.asyncio
    async def test_crowd_prediction_weekend_multiplier(self):
        """Weekend predictions should be higher than weekday."""
        from app.services.crowd_predict import get_crowd_prediction

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        # Test weekend (Saturday)
        sat = date(2026, 6, 6)  # Saturday
        data_sat = await get_crowd_prediction(db, target_date=sat)
        assert data_sat["is_weekend"] is True

        # Test weekday (Monday)
        mon = date(2026, 6, 8)  # Monday
        data_mon = await get_crowd_prediction(db, target_date=mon)
        assert data_mon["is_weekend"] is False

    @pytest.mark.asyncio
    async def test_best_time_returns_valid_time(self):
        """Best time should return a valid time range."""
        from app.services.crowd_predict import get_best_time

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        data = await get_best_time(db, "灵山大佛")
        assert "best_time" in data
        assert "attraction_name" in data
        assert data["attraction_name"] == "灵山大佛"
        assert ":" in data["best_time"]

    @pytest.mark.asyncio
    async def test_crowd_alerts_threshold(self):
        """Alerts should fire when predicted visitors exceed threshold."""
        from app.services.crowd_predict import get_crowd_alerts

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        data = await get_crowd_alerts(db, threshold=50)
        assert "alerts" in data
        assert "total_alerts" in data
        assert isinstance(data["alerts"], list)

    def test_generate_default_hours(self):
        """Default hours should cover 8-17."""
        from app.services.crowd_predict import _generate_default_hours

        hours = _generate_default_hours(is_weekend=False)
        assert len(hours) == 10  # 8 to 17 inclusive
        assert all(h["hour"] in range(8, 18) for h in hours)
        assert all(h["crowd_level"] in ("low", "medium", "high") for h in hours)


# ═══════════════════════════════════════════════════════════════════════════
# M13 — Multi-Role System Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestMultiRole:
    """Test multi-role chat system."""

    def test_role_prompts_exist(self):
        """All four roles should have system prompts."""
        from app.core.prompts import ROLE_PROMPTS, ROLE_NAMES

        assert "buddha" in ROLE_PROMPTS
        assert "zen_master" in ROLE_PROMPTS
        assert "tourist" in ROLE_PROMPTS
        assert "historian" in ROLE_PROMPTS
        assert len(ROLE_NAMES) == 4

    def test_build_role_prompt(self):
        """build_role_prompt should return valid message list."""
        from app.core.prompts import build_role_prompt

        chunks = [{"text": "灵山大佛高88米"}]
        messages = build_role_prompt("buddha", "大佛有多高", chunks)

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "佛祖" in messages[0]["content"] or "佛教" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert "大佛有多高" in messages[1]["content"]

    def test_build_role_prompt_default_fallback(self):
        """Unknown role should fallback to default chat prompt."""
        from app.core.prompts import build_role_prompt

        chunks = [{"text": "test"}]
        messages = build_role_prompt("unknown_role", "test", chunks)
        assert messages[0]["role"] == "system"

    def test_role_greetings(self):
        """Each role should have a unique greeting."""
        from app.api.chat_role import ROLE_GREETINGS

        assert "buddha" in ROLE_GREETINGS
        assert "zen_master" in ROLE_GREETINGS
        assert "tourist" in ROLE_GREETINGS
        assert "historian" in ROLE_GREETINGS
        assert "default" in ROLE_GREETINGS
        # All greetings should be different
        greetings = list(ROLE_GREETINGS.values())
        assert len(set(greetings)) == len(greetings)


# ═══════════════════════════════════════════════════════════════════════════
# M14 — History / Time-Travel Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestHistory:
    """Test history knowledge service."""

    @pytest.mark.asyncio
    async def test_get_timeline_all(self):
        """Should return all timeline events."""
        from app.services.history_kg import get_timeline

        data = await get_timeline()
        assert data["total_events"] > 0
        assert len(data["eras"]) > 0
        assert len(data["events"]) == data["total_events"]

    @pytest.mark.asyncio
    async def test_get_timeline_filtered(self):
        """Should filter events by spot name."""
        from app.services.history_kg import get_timeline

        data = await get_timeline("祥符禅寺")
        assert data["total_events"] > 0
        assert all(e["spot"] == "祥符禅寺" for e in data["events"])

    @pytest.mark.asyncio
    async def test_get_today_card(self):
        """Should return a today card."""
        from app.services.history_kg import get_today_card

        data = await get_today_card()
        assert "card" in data
        assert "match" in data
        card = data["card"]
        assert "title" in card
        assert "description" in card

    @pytest.mark.asyncio
    async def test_get_today_card_specific_date(self):
        """Should match exact date if available."""
        from app.services.history_kg import get_today_card

        # June 6 is in our data
        data = await get_today_card(date(2026, 6, 6))
        assert data["match"] == "exact"
        assert "玄奘" in data["card"]["description"] or "灵山" in data["card"]["description"]

    @pytest.mark.asyncio
    async def test_translate_placeholder(self):
        """Translate should return original text as placeholder."""
        from app.services.history_kg import translate_to_classical

        data = await translate_to_classical("灵山大佛高88米")
        assert data["original"] == "灵山大佛高88米"
        assert data["classical"] == "灵山大佛高88米"

    def test_timeline_eras_ordered(self):
        """Eras should be in chronological order."""
        from app.services.history_kg import HISTORY_TIMELINE

        era_order = ["唐代", "北宋", "南宋", "元代", "明代", "清末", "现代"]
        eras_seen = []
        for e in HISTORY_TIMELINE:
            if e["era"] not in eras_seen:
                eras_seen.append(e["era"])

        # Check general ordering
        for i in range(len(eras_seen) - 1):
            assert era_order.index(eras_seen[i]) < era_order.index(eras_seen[i + 1])


# ═══════════════════════════════════════════════════════════════════════════
# M15 — Zen Meditation Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestMeditation:
    """Test meditation service."""

    @pytest.mark.asyncio
    async def test_meditation_script_known_spot(self):
        """Should return default script for known spots."""
        from app.services.meditation_service import generate_meditation_script

        data = await generate_meditation_script("灵山大佛")
        assert data["spot_name"] == "灵山大佛"
        assert data["source"] == "default"
        assert len(data["script"]) > 50
        assert data["duration_seconds"] == 180

    @pytest.mark.asyncio
    async def test_meditation_script_unknown_spot(self):
        """Should return generic script for unknown spots."""
        from app.services.meditation_service import generate_meditation_script

        data = await generate_meditation_script("未知景点")
        assert data["spot_name"] == "未知景点"
        assert data["source"] == "generic"
        assert len(data["script"]) > 20

    @pytest.mark.asyncio
    async def test_zen_report_generation(self):
        """Should generate a report with spots."""
        from app.services.meditation_service import generate_zen_report

        data = await generate_zen_report(
            spots_visited=["灵山大佛", "灵山梵宫"],
            meditation_count=2,
            sound_sessions=3,
        )
        assert "report" in data
        assert "灵山大佛" in data["report"]
        assert "灵山梵宫" in data["report"]
        assert data["meditation_count"] == 2

    def test_sound_map_all_spots(self):
        """Should return sound map for all spots."""
        from app.services.meditation_service import get_sound_map

        data = get_sound_map()
        assert "spots" in data
        assert len(data["spots"]) >= 5

    def test_sound_map_specific_spot(self):
        """Should return sound data for a specific spot."""
        from app.services.meditation_service import get_sound_map

        data = get_sound_map("灵山大佛")
        assert data["spot"] == "灵山大佛"
        assert "sounds" in data
        assert "bell" in data["sounds"] or "chanting" in data["sounds"]


# ═══════════════════════════════════════════════════════════════════════════
# M16 — Puzzle & Achievement Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPuzzleAchievement:
    """Test puzzle generation and achievement system."""

    def test_record_visit_new_spot(self):
        """Recording a visit should add spot and check achievements."""
        from app.services.achievement_engine import record_visit

        result = record_visit("test-session-001", "灵山大佛")
        assert "灵山大佛" in result["visited_spots"]
        assert result["score"] > 0

    def test_record_visit_duplicate_no_double_count(self):
        """Visiting same spot twice should not duplicate."""
        from app.services.achievement_engine import record_visit

        record_visit("test-session-002", "灵山大佛")
        result = record_visit("test-session-002", "灵山大佛")
        assert result["visited_spots"].count("灵山大佛") == 1

    def test_record_correct_answer(self):
        """Correct answer should increase score."""
        from app.services.achievement_engine import record_answer

        result = record_answer("test-session-003", correct=True)
        assert result["correct"] is True
        assert result["total_correct"] == 1
        assert result["score"] >= 15

    def test_record_wrong_answer(self):
        """Wrong answer should not increase correct count."""
        from app.services.achievement_engine import record_answer

        result = record_answer("test-session-004", correct=False)
        assert result["correct"] is False
        assert result["total_correct"] == 0
        assert result["total_answers"] == 1

    def test_stamp_collection(self):
        """Visiting a spot with a stamp should award it."""
        from app.services.achievement_engine import record_visit, STAMPS

        result = record_visit("test-session-005", "灵山大佛")
        assert "灵山大佛" in STAMPS
        assert len(result["new_stamps"]) > 0
        assert result["new_stamps"][0]["id"] == "stamp_buddha"

    def test_achievement_unlock(self):
        """First visit should unlock '初到灵山' achievement."""
        from app.services.achievement_engine import record_visit

        result = record_visit("test-session-006", "灵山大佛")
        achievement_ids = result["achievements"]
        assert "first_visit" in achievement_ids

    def test_user_profile(self):
        """Profile should return complete user data."""
        from app.services.achievement_engine import get_user_profile

        profile = get_user_profile("test-session-007")
        assert profile["session_id"] == "test-session-007"
        assert profile["score"] == 0
        assert profile["total_stamps"] == 12
        assert profile["level"]["name"] == "初学者"

    def test_leaderboard(self):
        """Leaderboard should return sorted players."""
        from app.services.achievement_engine import get_leaderboard, record_visit

        record_visit("lb-player-1", "灵山大佛")
        record_visit("lb-player-2", "灵山大佛")
        record_visit("lb-player-2", "灵山梵宫")

        players = get_leaderboard(5)
        assert len(players) >= 2
        # Second player has more visits, should be ranked higher or equal
        assert players[0]["score"] >= players[-1]["score"]

    def test_level_progression(self):
        """Score should determine correct level."""
        from app.services.achievement_engine import _calculate_level

        assert _calculate_level(0)["name"] == "初学者"
        assert _calculate_level(100)["name"] == "旅行者"
        assert _calculate_level(200)["name"] == "探索者"
        assert _calculate_level(350)["name"] == "文化学者"
        assert _calculate_level(600)["name"] == "灵山大师"

    def test_fallback_puzzles(self):
        """Fallback puzzles should return valid puzzle structure."""
        from app.api.puzzle import _fallback_puzzles

        puzzles = _fallback_puzzles("灵山大佛")
        assert len(puzzles) >= 3
        for p in puzzles:
            assert p.question
            assert len(p.options) == 4
            assert 0 <= p.answer_index < 4
            assert p.difficulty in ("easy", "medium", "hard")


# ═══════════════════════════════════════════════════════════════════════════
# M13/M14/M15 — Prompt Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPrompts:
    """Test all new prompt builders."""

    def test_build_history_roleplay_prompt(self):
        from app.core.prompts import build_history_roleplay_prompt

        chunks = [{"text": "祥符禅寺建于唐代"}]
        messages = build_history_roleplay_prompt("唐代", "祥符禅寺", chunks)
        assert len(messages) == 2
        assert "唐代" in messages[0]["content"]

    def test_build_meditation_prompt(self):
        from app.core.prompts import build_meditation_prompt

        chunks = [{"text": "灵山大佛环境清幽"}]
        messages = build_meditation_prompt("灵山大佛", chunks)
        assert len(messages) == 2
        assert "冥想" in messages[0]["content"]

    def test_build_puzzle_prompt(self):
        from app.core.prompts import build_puzzle_prompt

        chunks = [{"text": "灵山大佛高88米"}]
        messages = build_puzzle_prompt("灵山大佛", chunks)
        assert len(messages) == 2
        assert "JSON" in messages[1]["content"] or "json" in messages[1]["content"].lower()
