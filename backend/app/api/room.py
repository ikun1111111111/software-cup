"""Room API — multi-person collaborative tour with WebSocket broadcast."""
import json
import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from app.core.database import async_session

from app.services.room_service import (
    create_room,
    join_room,
    get_room,
    get_members,
    update_itinerary,
    delete_room,
    refresh_room_ttl,
    add_spot_to_itinerary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/room", tags=["room"])

_active_connections: dict[str, dict[str, WebSocket]] = {}


class CreateRoomRequest(BaseModel):
    creator_name: str


class JoinRoomRequest(BaseModel):
    member_name: str


class ItineraryUpdateRequest(BaseModel):
    itinerary: list[dict]


class AddSpotRequest(BaseModel):
    spot_name: str
    source: str = "manual"
    confidence: float = 1.0
    note: str = ""


class AddSpotResponse(BaseModel):
    status: str
    spot_name: str
    itinerary_count: int
    itinerary: list[dict]


class RoomResponse(BaseModel):
    room_id: str
    creator: str
    created_at: int
    itinerary: list[dict]
    members: list[dict] = []


@router.post("/create", response_model=RoomResponse)
async def create_new_room(request: CreateRoomRequest):
    """Create a new collaborative tour room."""
    if not request.creator_name.strip():
        raise HTTPException(status_code=400, detail="创建者名称不能为空")
    try:
        room = await create_room(request.creator_name.strip())
        room["members"] = await get_members(room["room_id"])
        return RoomResponse(**room)
    except Exception as e:
        logger.error("Room creation failed: %s", e)
        raise HTTPException(status_code=500, detail="房间创建失败")


@router.post("/{room_id}/join", response_model=RoomResponse)
async def join_existing_room(room_id: str, request: JoinRoomRequest):
    """Join an existing room by room ID."""
    if not request.member_name.strip():
        raise HTTPException(status_code=400, detail="成员名称不能为空")
    try:
        room = await join_room(room_id, request.member_name.strip())
        return RoomResponse(**room)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Join room failed: %s", e)
        raise HTTPException(status_code=500, detail="加入房间失败")


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room_info(room_id: str):
    """Get room information."""
    room = await get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="房间不存在或已过期")
    return RoomResponse(**room)


@router.put("/{room_id}/itinerary")
async def sync_itinerary(room_id: str, request: ItineraryUpdateRequest):
    """Update shared itinerary for a room."""
    try:
        await update_itinerary(room_id, request.itinerary)
        await _broadcast_to_room(room_id, {
            "type": "itinerary_update",
            "itinerary": request.itinerary,
            "timestamp": int(time.time()),
        })
        return {"status": "ok", "itinerary": request.itinerary}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Itinerary update failed: %s", e)
        raise HTTPException(status_code=500, detail="行程更新失败")


@router.post("/{room_id}/itinerary/add-spot", response_model=AddSpotResponse)
async def add_spot_to_room_itinerary(room_id: str, request: AddSpotRequest):
    """Add a single scenic spot to the room's shared itinerary.

    Automatically broadcasts `spot_added` to all room members via WebSocket.
    Sources: "vision" (photo recognition), "recommend" (AI recommendation), "manual".
    """
    try:
        room = await add_spot_to_itinerary(
            room_id=room_id,
            spot_name=request.spot_name,
            source=request.source,
            confidence=request.confidence,
            note=request.note,
        )
        itinerary = room.get("itinerary", [])

        # Broadcast to all room members
        await _broadcast_to_room(room_id, {
            "type": "spot_added",
            "spot_name": request.spot_name,
            "source": request.source,
            "confidence": request.confidence,
            "note": request.note,
            "itinerary": itinerary,
            "timestamp": int(time.time()),
        })

        return AddSpotResponse(
            status="ok",
            spot_name=request.spot_name,
            itinerary_count=len(itinerary),
            itinerary=itinerary,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Add spot to itinerary failed: %s", e)
        raise HTTPException(status_code=500, detail="添加景点失败")


@router.delete("/{room_id}")
async def remove_room(room_id: str):
    """Delete a room."""
    deleted = await delete_room(room_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="房间不存在")
    _active_connections.pop(room_id, None)
    return {"status": "ok"}


async def _broadcast_to_room(room_id: str, message: dict):
    """Broadcast a message to all WebSocket connections in a room."""
    connections = _active_connections.get(room_id, {})
    dead = []
    for name, ws in connections.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(name)
    for name in dead:
        connections.pop(name, None)


@router.websocket("/{room_id}/ws")
async def room_websocket(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for room real-time communication."""
    await websocket.accept()
    member_name = ""

    try:
        raw = await websocket.receive_text()
        data = json.loads(raw)

        if data.get("type") != "join" or not data.get("member_name"):
            await websocket.send_json({"type": "error", "message": "First message must be join with member_name"})
            await websocket.close()
            return

        member_name = data["member_name"]

        room = await get_room(room_id)
        if not room:
            await websocket.send_json({"type": "error", "message": "房间不存在或已过期"})
            await websocket.close()
            return

        if room_id not in _active_connections:
            _active_connections[room_id] = {}
        _active_connections[room_id][member_name] = websocket

        await _broadcast_to_room(room_id, {
            "type": "member_joined",
            "member": {"name": member_name, "joined_at": int(time.time())},
        })

        await websocket.send_json({
            "type": "room_state",
            "room_id": room_id,
            "members": room.get("members", []),
            "itinerary": room.get("itinerary", []),
        })

        await refresh_room_ttl(room_id)

        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type", "")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": int(time.time())})
                await refresh_room_ttl(room_id)

            elif msg_type == "chat":
                question = data.get("question", "").strip()
                if question:
                    # Broadcast the question to all members
                    await _broadcast_to_room(room_id, {
                        "type": "chat_broadcast",
                        "from": member_name,
                        "question": question,
                        "timestamp": int(time.time()),
                    })
                    # Process through LLM + RAG and broadcast answer
                    try:
                        from app.services.chat_service import process_chat
                        from app.core.database import async_session
                        async with async_session() as db_session:
                            chat_result = await process_chat(
                                question=question,
                                session_id=f"room_{room_id}",
                                db_session=db_session,
                                stream=False,
                            )
                        answer = chat_result.get("answer", "抱歉，暂时无法回答")
                        await _broadcast_to_room(room_id, {
                            "type": "chat_answer",
                            "from": "AI导游",
                            "question": question,
                            "answer": answer,
                            "source": chat_result.get("source", "rag"),
                            "timestamp": int(time.time()),
                        })
                    except Exception as e:
                        logger.error("Room LLM chat failed: %s", e)
                        await _broadcast_to_room(room_id, {
                            "type": "chat_answer",
                            "from": "AI导游",
                            "question": question,
                            "answer": "抱歉，暂时无法回答。请稍后重试。",
                            "source": "fallback",
                            "timestamp": int(time.time()),
                        })

            elif msg_type == "itinerary_update":
                itinerary = data.get("itinerary", [])
                try:
                    await update_itinerary(room_id, itinerary)
                    await _broadcast_to_room(room_id, {
                        "type": "itinerary_update",
                        "from": member_name,
                        "itinerary": itinerary,
                        "timestamp": int(time.time()),
                    })
                except ValueError:
                    await websocket.send_json({"type": "error", "message": "房间不存在"})

            elif msg_type == "leave":
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Room WS error for %s: %s", room_id, e)
    finally:
        if member_name and room_id in _active_connections:
            _active_connections[room_id].pop(member_name, None)
            if not _active_connections[room_id]:
                _active_connections.pop(room_id, None)
            await _broadcast_to_room(room_id, {
                "type": "member_left",
                "member_name": member_name,
            })
        try:
            await websocket.close()
        except Exception:
            pass
