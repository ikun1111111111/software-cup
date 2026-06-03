"""Tests for avatar configuration API."""
import pytest
from unittest.mock import AsyncMock

from app.models.avatar import AvatarConfig


class MockAvatarRow:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def _make_avatar(
    id=1,
    name="小景",
    description=None,
    model_path="/models/xiaojing",
    appearance_json=None,
    voice_id="xiaojing-v1",
    emotion_presets=None,
    welcome_message="欢迎来到灵山胜境！",
    is_active=False,
):
    return MockAvatarRow(
        id=id,
        name=name,
        description=description,
        model_path=model_path,
        appearance_json=appearance_json or {},
        voice_id=voice_id,
        emotion_presets=emotion_presets or {},
        welcome_message=welcome_message,
        is_active=is_active,
        created_at=None,
        updated_at=None,
    )


# ── Model / serialization tests ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_serialize_avatar():
    from app.api.avatar import _serialize_avatar
    avatar = _make_avatar(id=1, name="Test", is_active=True)
    out = _serialize_avatar(avatar)
    assert out.id == 1
    assert out.name == "Test"
    assert out.is_active is True


@pytest.mark.asyncio
async def test_avatar_create_request_model():
    from app.api.avatar import AvatarCreate
    req = AvatarCreate(name="小景", voice_id="v1")
    assert req.name == "小景"
    assert req.voice_id == "v1"


@pytest.mark.asyncio
async def test_avatar_update_request_model():
    from app.api.avatar import AvatarUpdate
    req = AvatarUpdate(voice_id="v2")
    assert req.voice_id == "v2"
    assert req.name is None


# ── Business logic tests (no DB / no router) ─────────────────────────────────


@pytest.mark.asyncio
async def test_avatar_out_model():
    from app.api.avatar import AvatarOut
    out = AvatarOut(
        id=1,
        name="小景",
        description=None,
        model_path="/models/test",
        appearance_json={"hair": "black"},
        voice_id="v1",
        emotion_presets=None,
        welcome_message="你好",
        is_active=True,
        created_at=None,
        updated_at=None,
    )
    assert out.is_active is True
    assert out.appearance_json == {"hair": "black"}
