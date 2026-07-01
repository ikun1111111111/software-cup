from unittest.mock import AsyncMock, patch

import pytest

from app.services.memory_service import create_memory_from_input


@pytest.mark.asyncio
async def test_create_memory_keeps_source_metadata():
    with patch(
        "app.services.memory_service.route",
        new=AsyncMock(return_value='{"title":"Question saved","content":"A useful answer"}'),
    ):
        memory = await create_memory_from_input(
            session_id="session-1",
            user_input="question and answer",
            spot_name="Nine Dragons",
            spot_id="spot-9",
            source_type="chat",
            metadata_json={
                "source_event_id": "ask-1",
                "event_type": "ask",
                "source_page": "chat",
            },
        )

    assert memory.spot_id == "spot-9"
    assert memory.source_type == "chat"
    assert memory.metadata_json["source_event_id"] == "ask-1"
    assert memory.metadata_json["event_type"] == "ask"
    assert memory.metadata_json["source_page"] == "chat"
    assert memory.metadata_json["source"] == "digital_human"
