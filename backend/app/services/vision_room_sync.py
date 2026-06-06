"""Vision-to-Room sync service — bridges photo recognition to collaborative rooms.

When a tourist identifies a scenic spot via photo, this service syncs the
result into a collaborative room's shared itinerary with confidence filtering.
"""
import logging

from app.services.room_service import add_spot_to_itinerary, get_room
from app.services.vision_service import identify_scenic_spot

logger = logging.getLogger(__name__)

# Minimum confidence threshold for auto-syncing vision results
MIN_CONFIDENCE = 0.4

# Known scenic spot names for validation
KNOWN_SPOT_NAMES = {
    "灵山大佛", "九龙灌浴", "灵山梵宫", "五印坛城", "祥符禅寺",
    "天下第一掌", "百子戏弥勒", "佛足广场", "阿育王柱", "降魔壁",
    "三圣殿", "佛手广场", "大雄宝殿", "藏经楼", "转经廊",
    "拈花湾", "梵天花海", "香月花街", "禅意花园", "鹿鸣谷",
    "半山衔日", "云门水镜", "妙音台",
}


async def sync_vision_to_room(
    room_id: str,
    spot_name: str,
    confidence: float,
    note: str = "",
) -> dict:
    """Sync a vision identification result to a collaborative room.

    Validates the confidence threshold, checks for duplicates, and adds
    the identified spot to the room's shared itinerary.

    Args:
        room_id: Target collaborative room ID.
        spot_name: Identified scenic spot name.
        confidence: Vision model confidence score (0-1).
        note: Optional context note (e.g., "从拍照识别添加").

    Returns:
        Dict with sync result: {status, spot_name, confidence, itinerary_count}

    Raises:
        ValueError: If confidence too low, room not found, or spot unknown.
    """
    # Validate inputs
    if not room_id or not room_id.strip():
        raise ValueError("房间号不能为空")

    room = await get_room(room_id)
    if not room:
        raise ValueError(f"房间 {room_id} 不存在或已过期")

    # Confidence gate
    if confidence < MIN_CONFIDENCE:
        raise ValueError(
            f"识别可信度过低 ({confidence:.0%})，最低要求 {MIN_CONFIDENCE:.0%}。"
            f"请重新拍摄清晰的照片。"
        )

    # Validate spot name — must be a known scenic spot
    if spot_name not in KNOWN_SPOT_NAMES:
        # Fuzzy match against known spots
        matched = _fuzzy_match_spot(spot_name)
        if matched:
            logger.info("Fuzzy matched '%s' → '%s'", spot_name, matched)
            spot_name = matched
        else:
            raise ValueError(
                f"景点 '{spot_name}' 不在灵山胜境景点列表中，无法同步"
            )

    # Build note if not provided
    if not note:
        note = f"拍照识别 ({confidence:.0%} 可信度)"

    # Add to itinerary
    updated_room = await add_spot_to_itinerary(
        room_id=room_id,
        spot_name=spot_name,
        source="vision",
        confidence=confidence,
        note=note,
    )

    return {
        "status": "ok",
        "room_id": room_id,
        "spot_name": spot_name,
        "confidence": confidence,
        "itinerary_count": len(updated_room.get("itinerary", [])),
    }


def _fuzzy_match_spot(name: str) -> str | None:
    """Try to fuzzy-match a name to known scenic spots.

    Returns the matched canonical name, or None if no match.
    """
    if not name:
        return None

    name_lower = name.strip().lower()

    # Direct substring match
    for known in KNOWN_SPOT_NAMES:
        if name_lower in known.lower() or known.lower() in name_lower:
            return known

    # Character overlap
    name_chars = set(name.strip())
    best_match = None
    best_score = 0

    for known in KNOWN_SPOT_NAMES:
        known_chars = set(known)
        overlap = len(name_chars & known_chars)
        score = overlap / max(len(name_chars), len(known_chars))
        if score > best_score and score > 0.5:
            best_score = score
            best_match = known

    return best_match


async def sync_vision_result_to_room(
    room_id: str,
    image_data: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Full pipeline: identify spot from image → sync to room.

    Convenience function that runs vision identification first,
    then syncs the result to the room.

    Args:
        room_id: Target room ID.
        image_data: Raw image bytes.
        mime_type: Image MIME type.

    Returns:
        Sync result dict with added identification info.
    """
    # Step 1: Identify
    identification = await identify_scenic_spot(image_data, mime_type)

    # Step 2: Sync
    sync_result = await sync_vision_to_room(
        room_id=room_id,
        spot_name=identification["spot_name"],
        confidence=identification["confidence"],
        note=f"拍照识别: {identification['description'][:50]}",
    )

    sync_result["identification"] = identification
    return sync_result
