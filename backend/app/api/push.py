"""Push API — proactive intelligent tour guide notifications."""
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.push_service import check_location_triggers, handle_push_action

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/push", tags=["push"])


class LocationCheckRequest(BaseModel):
    user_id: str
    lat: float
    lng: float


class PushActionRequest(BaseModel):
    spot_name: str
    action: str  # "listen", "navigate", "ignore"


@router.post("/check-location")
async def check_location(request: LocationCheckRequest):
    """Check if user's current location triggers a push notification."""
    if not request.user_id.strip():
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    try:
        notification = await check_location_triggers(
            request.user_id.strip(), request.lat, request.lng,
        )
    except Exception as e:
        logger.warning("Push location check failed: %s", e)
        return {"triggered": False}

    if notification:
        return {"triggered": True, "notification": notification}
    return {"triggered": False}


@router.post("/action")
async def push_action(request: PushActionRequest):
    """Handle user action on a push notification."""
    if not request.spot_name.strip():
        raise HTTPException(status_code=400, detail="spot_name 不能为空")
    if request.action not in ("listen", "navigate", "ignore"):
        raise HTTPException(status_code=400, detail="action 必须是 listen/navigate/ignore")

    try:
        return await handle_push_action(request.spot_name.strip(), request.action)
    except Exception as e:
        logger.error("Push action failed: %s", e)
        raise HTTPException(status_code=500, detail="处理失败")
