# 拍照识景 × 协同导览 × 推荐路线 一体化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三个已有但孤立的功能串联为真实可用的工作流：拍照识景 → 自动同步到协同房间 → 基于房间成员兴趣生成推荐路线 → 一键加入行程。

**Architecture:** 三个功能各自已有完整的基础设施（后端 API + 前端页面），当前问题是零交互、零串联。本次不改底层架构，只做三件事：(1) 拍照识景结果可一键推入协同房间行程；(2) 协同房间新增 LLM 智能导览问答 + 路线共享；(3) 推荐路线页接入动态推荐引擎并支持一键推送到协同房间。

**Tech Stack:** React 19 + TypeScript, FastAPI (Python), Redis (WebSocket rooms), Qwen-VL-Max / DeepSeek LLM, Ant Design 5, Live2D

---

## 文件总览

### 新增文件
| 文件 | 说明 |
|------|------|
| `backend/app/services/vision_room_sync.py` | 拍照识景结果同步到协同房间的服务层 |
| `backend/app/api/vision_room.py` | 拍照识景→协同房间 API 桥接端点 |
| `backend/tests/test_vision_room_sync.py` | 拍照识景同步服务测试 |
| `backend/tests/test_room_api.py` | 协同房间 API 测试 |
| `backend/tests/test_room_service.py` | 协同房间 service 测试 |
| `frontend/src/hooks/useVisionRoomSync.ts` | 前端拍照→房间同步 Hook |
| `frontend/src/components/Room/VisionSyncButton.tsx` | 同步按钮组件 |
| `frontend/src/components/Room/RoomChat.tsx` | 房间 LLM 问答组件 |
| `frontend/src/components/Room/RouteShareCard.tsx` | 路线共享卡片 |
| `frontend/src/components/Recommend/RecommendEngine.tsx` | 动态推荐引擎前端组件 |
| `frontend/src/components/Recommend/RoutePushButton.tsx` | 推荐路线→房间推送按钮 |

### 修改文件
| 文件 | 修改内容 |
|------|----------|
| `backend/app/main.py` | 注册 `vision_room.router` |
| `backend/app/services/room_service.py` | 新增 `add_spot_to_itinerary()` 函数 |
| `backend/app/api/room.py` | 新增 `POST /{room_id}/itinerary/add-spot` 端点 |
| `frontend/src/pages/tourist/VisionPage.tsx` | 增加"同步到协同房间"入口 |
| `frontend/src/pages/tourist/RoomPage.tsx` | 增加 LLM 问答面板 + 路线共享区 |
| `frontend/src/pages/tourist/RecommendPage.tsx` | 接入动态推荐引擎 + 房间推送 |
| `frontend/src/hooks/useRoomWebSocket.ts` | 新增 `spot_added` 消息处理 |
| `frontend/src/api/vision.ts` | 新增 `syncSpotToRoom()` API 函数 |
| `frontend/src/api/room.ts` | 新增 `addSpotToItinerary()` API 函数 |

---

## 阶段一：拍照识景 → 协同导览串联

### Task 1: 后端 — 拍照识景同步到协同房间

**Files:**
- Create: `backend/app/services/vision_room_sync.py`
- Modify: `backend/app/services/room_service.py` (~line 98-109, add function)
- Modify: `backend/app/api/room.py` (~line 83-98, add endpoint)
- Modify: `backend/app/main.py` (~line 64, register router)
- Create: `backend/app/api/vision_room.py`
- Test: `backend/tests/test_vision_room_sync.py`
- Test: `backend/tests/test_room_api.py`
- Test: `backend/tests/test_room_service.py`

- [ ] **Step 1: 新增 room_service 函数 — 添加景点到行程**

在 `backend/app/services/room_service.py` 末尾（`update_itinerary` 之后）添加：

```python
async def add_spot_to_itinerary(room_id: str, spot_name: str, spot_id: str | None = None, source: str = "vision") -> dict:
    """Add a scenic spot to the room's shared itinerary.

    Args:
        room_id: Room ID.
        spot_name: Display name of the spot.
        spot_id: Optional spot database ID.
        source: Source of the addition ("vision", "recommend", "manual").

    Returns:
        Updated room data.

    Raises:
        ValueError: If room doesn't exist.
    """
    redis = await get_redis()
    room_data = await redis.get(_room_key(room_id))
    if not room_data:
        raise ValueError("房间不存在或已过期")

    room = json.loads(room_data)
    itinerary = room.get("itinerary", [])

    # Avoid duplicates by spot_name
    if any(item.get("spot_name") == spot_name for item in itinerary):
        return room  # Already in itinerary, no-op

    itinerary.append({
        "spot_name": spot_name,
        "spot_id": spot_id,
        "source": source,
        "added_at": int(time.time()),
    })
    room["itinerary"] = itinerary
    await redis.set(_room_key(room_id), json.dumps(room, ensure_ascii=False), ex=ROOM_TTL)
    return room
```

- [ ] **Step 2: 创建 vision_room_sync 服务层**

```python
"""Bridge service: sync vision recognition results to a collaborative room."""
import logging

from app.services.room_service import add_spot_to_itinerary

logger = logging.getLogger(__name__)


async def sync_vision_to_room(room_id: str, spot_name: str, confidence: float, description: str, spot_id: str | None = None) -> dict:
    """Sync a vision recognition result to the room's shared itinerary.

    Args:
        room_id: Target room ID.
        spot_name: Identified spot name.
        confidence: Recognition confidence (0-1).
        description: Spot description from vision.
        spot_id: Optional database spot ID.

    Returns:
        Updated room data.

    Raises:
        ValueError: If room doesn't exist.
    """
    if confidence < 0.3 or spot_name in ("未知景点", "识别失败"):
        raise ValueError("识别结果可信度过低，无法同步")

    return await add_spot_to_itinerary(room_id, spot_name, spot_id, source="vision")
```

- [ ] **Step 3: 创建 vision_room API 桥接端点**

创建 `backend/app/api/vision_room.py`:

```python
"""API: Bridge between vision recognition and collaborative rooms."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.vision_room_sync import sync_vision_to_room

router = APIRouter(prefix="/api/vision", tags=["vision-room"])


class VisionSyncRequest(BaseModel):
    room_id: str
    spot_name: str
    confidence: float
    description: str = ""
    spot_id: str | None = None


class VisionSyncResponse(BaseModel):
    status: str
    room_id: str
    spot_name: str
    itinerary_count: int


@router.post("/sync-to-room", response_model=VisionSyncResponse)
async def sync_vision_result(request: VisionSyncRequest):
    """Sync a vision recognition result to a collaborative room itinerary."""
    try:
        room = await sync_vision_to_room(
            room_id=request.room_id,
            spot_name=request.spot_name,
            confidence=request.confidence,
            description=request.description,
            spot_id=request.spot_id,
        )
        return VisionSyncResponse(
            status="ok",
            room_id=request.room_id,
            spot_name=request.spot_name,
            itinerary_count=len(room.get("itinerary", [])),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"同步失败: {e}")
```

- [ ] **Step 4: 在 room.py 新增 add-spot 端点**

在 `backend/app/api/room.py` 的 `sync_itinerary` 端点之后、`_broadcast_to_room` 之前添加：

```python
class AddSpotRequest(BaseModel):
    spot_name: str
    spot_id: str | None = None
    source: str = "manual"


@router.post("/{room_id}/itinerary/add-spot")
async def add_spot_to_room(room_id: str, request: AddSpotRequest):
    """Add a single spot to the room itinerary and broadcast."""
    try:
        from app.services.room_service import add_spot_to_itinerary
        room = await add_spot_to_itinerary(room_id, request.spot_name, request.spot_id, request.source)
        await _broadcast_to_room(room_id, {
            "type": "spot_added",
            "spot_name": request.spot_name,
            "itinerary": room["itinerary"],
            "timestamp": int(time.time()),
        })
        return {"status": "ok", "itinerary": room["itinerary"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Add spot failed: %s", e)
        raise HTTPException(status_code=500, detail="添加景点失败")
```

- [ ] **Step 5: 注册 vision_room router**

在 `backend/app/main.py` 找到 vision router 注册位置，在其后添加：

```python
from app.api.vision_room import router as vision_room_router
app.include_router(vision_room_router)
```

- [ ] **Step 6: 编写 room_service 测试**

创建 `backend/tests/test_room_service.py`:

```python
"""Tests for room service functions."""
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.services.room_service import (
    add_spot_to_itinerary,
    _room_key,
    _members_key,
)


class TestAddSpotToItinerary:
    """Test adding spots to room itinerary."""

    @pytest.mark.asyncio
    async def test_add_spot_success(self):
        """Should add spot to empty itinerary."""
        room_data = json.dumps({"room_id": "123456", "itinerary": [], "creator": "test"})
        mock_redis = AsyncMock()
        mock_redis.get.return_value = room_data

        with patch("app.services.room_service.get_redis", return_value=mock_redis):
            result = await add_spot_to_itinerary("123456", "灵山大佛", source="vision")

        assert len(result["itinerary"]) == 1
        assert result["itinerary"][0]["spot_name"] == "灵山大佛"
        assert result["itinerary"][0]["source"] == "vision"

    @pytest.mark.asyncio
    async def test_add_duplicate_spot_noop(self):
        """Should not add duplicate spot by name."""
        itinerary = [{"spot_name": "灵山大佛", "source": "vision"}]
        room_data = json.dumps({"room_id": "123456", "itinerary": itinerary})
        mock_redis = AsyncMock()
        mock_redis.get.return_value = room_data

        with patch("app.services.room_service.get_redis", return_value=mock_redis):
            result = await add_spot_to_itinerary("123456", "灵山大佛", source="manual")

        assert len(result["itinerary"]) == 1  # Still 1, no duplicate

    @pytest.mark.asyncio
    async def test_add_spot_room_not_found(self):
        """Should raise ValueError for non-existent room."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None

        with patch("app.services.room_service.get_redis", return_value=mock_redis):
            with pytest.raises(ValueError, match="房间不存在"):
                await add_spot_to_itinerary("000000", "灵山大佛")

    @pytest.mark.asyncio
    async def test_add_multiple_spots(self):
        """Should accumulate multiple unique spots."""
        room_data = json.dumps({"room_id": "123456", "itinerary": []})
        mock_redis = AsyncMock()
        mock_redis.get.return_value = room_data

        with patch("app.services.room_service.get_redis", return_value=mock_redis):
            r1 = await add_spot_to_itinerary("123456", "灵山大佛", source="vision")
            r2 = await add_spot_to_itinerary("123456", "梵宫", source="recommend")

        assert len(r1["itinerary"]) == 1
        assert len(r2["itinerary"]) == 2
```

- [ ] **Step 7: 编写 vision_room_sync 测试**

创建 `backend/tests/test_vision_room_sync.py`:

```python
"""Tests for vision-to-room sync service."""
import json
import pytest
from unittest.mock import patch, AsyncMock

from app.services.vision_room_sync import sync_vision_to_room


class TestVisionRoomSync:
    """Test vision result sync to collaborative room."""

    @pytest.mark.asyncio
    async def test_sync_success(self):
        """Should add recognized spot to room itinerary."""
        room_data = json.dumps({"room_id": "123456", "itinerary": [], "creator": "test"})
        mock_redis = AsyncMock()
        mock_redis.get.return_value = room_data

        with patch("app.services.vision_room_sync.add_spot_to_itinerary", return_value={"itinerary": [{"spot_name": "灵山大佛"}]}):
            result = await sync_vision_to_room("123456", "灵山大佛", 0.95, "88米高青铜佛像")

        assert result["itinerary"][0]["spot_name"] == "灵山大佛"

    @pytest.mark.asyncio
    async def test_low_confidence_rejected(self):
        """Should reject spots with confidence below 0.3."""
        with pytest.raises(ValueError, match="可信度过低"):
            await sync_vision_to_room("123456", "未知景点", 0.1, "")

    @pytest.mark.asyncio
    async def test_unknown_spot_rejected(self):
        """Should reject '未知景点' regardless of confidence."""
        with pytest.raises(ValueError, match="可信度过低"):
            await sync_vision_to_room("123456", "未知景点", 0.9, "some description")

    @pytest.mark.asyncio
    async def test_failed_recognition_rejected(self):
        """Should reject '识别失败' regardless of confidence."""
        with pytest.raises(ValueError, match="可信度过低"):
            await sync_vision_to_room("123456", "识别失败", 0.8, "")
```

- [ ] **Step 8: 编写 room API 测试**

创建 `backend/tests/test_room_api.py`:

```python
"""Tests for room API endpoints."""
import json
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


class TestCreateRoom:
    """Test room creation endpoint."""

    def test_create_room_success(self):
        """Should create room with 6-digit code."""
        with patch("app.api.room.create_room", return_value={
            "room_id": "123456", "creator": "test", "created_at": 1234, "itinerary": []
        }), patch("app.api.room.get_members", return_value=[{"name": "test", "role": "creator"}]):
            resp = client.post("/api/room/create", json={"creator_name": "test"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["room_id"] == "123456"
        assert data["members"][0]["name"] == "test"

    def test_create_room_empty_name(self):
        """Should reject empty creator name."""
        resp = client.post("/api/room/create", json={"creator_name": ""})
        assert resp.status_code == 400


class TestAddSpotToRoom:
    """Test adding spots to room itinerary."""

    def test_add_spot_success(self):
        """Should add spot and return updated itinerary."""
        updated_room = {
            "room_id": "123456", "creator": "test", "created_at": 1234,
            "itinerary": [{"spot_name": "灵山大佛", "source": "manual"}],
        }
        with patch("app.api.room.get_room", return_value=updated_room), \
             patch("app.api.room._broadcast_to_room", return_value=None):
            from app.services.room_service import add_spot_to_itinerary
            with patch("app.api.room.add_spot_to_itinerary" if hasattr(__import__("app.api.room"), "add_spot_to_itinerary") else "app.services.room_service.add_spot_to_itinerary", return_value=updated_room):
                resp = client.post("/api/room/123456/itinerary/add-spot", json={
                    "spot_name": "灵山大佛", "source": "manual"
                })

        assert resp.status_code == 200

    def test_add_spot_room_not_found(self):
        """Should return 404 for non-existent room."""
        with patch("app.api.room.get_room", return_value=None):
            resp = client.post("/api/room/000000/itinerary/add-spot", json={
                "spot_name": "灵山大佛"
            })
        assert resp.status_code == 404


class TestVisionSync:
    """Test vision-to-room sync endpoint."""

    def test_sync_success(self):
        """Should sync vision result to room."""
        with patch("app.api.vision_room.sync_vision_to_room", return_value={
            "itinerary": [{"spot_name": "灵山大佛"}]
        }):
            resp = client.post("/api/vision/sync-to-room", json={
                "room_id": "123456",
                "spot_name": "灵山大佛",
                "confidence": 0.95,
                "description": "88米高青铜佛像",
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["spot_name"] == "灵山大佛"

    def test_sync_low_confidence(self):
        """Should reject low confidence results."""
        with patch("app.api.vision_room.sync_vision_to_room", side_effect=ValueError("识别结果可信度过低")):
            resp = client.post("/api/vision/sync-to-room", json={
                "room_id": "123456",
                "spot_name": "未知景点",
                "confidence": 0.1,
            })
        assert resp.status_code == 404
```

- [ ] **Step 9: 运行测试验证**

```bash
cd backend
python -m pytest tests/test_room_service.py tests/test_vision_room_sync.py tests/test_room_api.py -v
```

Expected: All tests pass (no Redis required — tests mock Redis).

- [ ] **Step 10: 提交**

```bash
git add backend/app/services/vision_room_sync.py backend/app/services/room_service.py backend/app/api/room.py backend/app/api/vision_room.py backend/app/main.py backend/tests/test_room_service.py backend/tests/test_vision_room_sync.py backend/tests/test_room_api.py
git commit -m "feat: 拍照识景→协同导览串联后端 — 景点同步到房间行程 + API 测试"
```

---

### Task 2: 前端 — 拍照识景同步按钮 + 房间行程更新

**Files:**
- Create: `frontend/src/hooks/useVisionRoomSync.ts`
- Create: `frontend/src/components/Room/VisionSyncButton.tsx`
- Modify: `frontend/src/api/vision.ts` (新增 `syncSpotToRoom` 函数)
- Modify: `frontend/src/api/room.ts` (新增 `addSpotToItinerary` 函数)
- Modify: `frontend/src/pages/tourist/VisionPage.tsx` (~line 86-112, 添加同步按钮)
- Modify: `frontend/src/hooks/useRoomWebSocket.ts` (新增 `spot_added` 消息处理)

- [ ] **Step 1: 前端 API 函数扩展**

在 `frontend/src/api/vision.ts` 末尾添加：

```typescript
export const syncSpotToRoom = (params: {
  room_id: string;
  spot_name: string;
  confidence: number;
  description?: string;
  spot_id?: string;
}) => {
  return request.post<{ status: string; room_id: string; spot_name: string; itinerary_count: number }>(
    '/vision/sync-to-room',
    params,
  );
};
```

在 `frontend/src/api/room.ts` 末尾添加：

```typescript
export const addSpotToItinerary = (roomId: string, spotName: string, spotId?: string, source = 'manual') => {
  return request.put<{ status: string; itinerary: RoomData['itinerary'] }>(
    `/room/${roomId}/itinerary/add-spot`,
    { spot_name: spotName, spot_id: spotId, source },
  );
};
```

- [ ] **Step 2: useVisionRoomSync Hook**

创建 `frontend/src/hooks/useVisionRoomSync.ts`:

```typescript
import { useState, useCallback } from 'react';
import { message as antMsg } from 'antd';
import { syncSpotToRoom } from '../api/vision';

interface UseVisionRoomSyncOptions {
  roomId: string | null;
}

interface SyncState {
  syncing: boolean;
  synced: boolean;
}

export function useVisionRoomSync({ roomId }: UseVisionRoomSyncOptions) {
  const [state, setState] = useState<SyncState>({ syncing: false, synced: false });

  const sync = useCallback(async (spotName: string, confidence: number, description?: string, spotId?: string) => {
    if (!roomId) {
      antMsg.warning('请先加入协同房间');
      return;
    }
    setState({ syncing: true, synced: false });
    try {
      const res = await syncSpotToRoom({ room_id: roomId, spot_name: spotName, confidence, description, spot_id: spotId });
      setState({ syncing: false, synced: true });
      antMsg.success(`已将「${res.spot_name}」同步到房间行程`);
      return res;
    } catch {
      antMsg.error('同步失败');
      setState({ syncing: false, synced: false });
    }
  }, [roomId]);

  return { ...state, sync };
}
```

- [ ] **Step 3: VisionSyncButton 组件**

创建 `frontend/src/components/Room/VisionSyncButton.tsx`:

```typescript
import React from 'react';
import { SyncOutlined } from '@ant-design/icons';
import { useVisionRoomSync } from '../../hooks/useVisionRoomSync';

interface VisionSyncButtonProps {
  roomId: string | null;
  spotName: string;
  confidence: number;
  description?: string;
  spotId?: string;
}

const VisionSyncButton: React.FC<VisionSyncButtonProps> = ({ roomId, spotName, confidence, description, spotId }) => {
  const { syncing, synced, sync } = useVisionRoomSync({ roomId });

  if (!roomId) return null;

  return (
    <button
      onClick={() => sync(spotName, confidence, description, spotId)}
      disabled={syncing || synced}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '8px 16px',
        border: 'none', borderRadius: 'var(--radius-md)',
        background: synced
          ? 'var(--color-success)'
          : 'linear-gradient(135deg, #C8882E, #E8A838)',
        color: '#fff', fontSize: '14px', fontWeight: 600,
        cursor: syncing || synced ? 'not-allowed' : 'pointer',
        opacity: syncing ? 0.7 : 1,
        transition: 'all 200ms ease',
      }}
    >
      <SyncOutlined spin={syncing} />
      {syncing ? '同步中...' : synced ? '已同步' : '同步到协同房间'}
    </button>
  );
};

export default VisionSyncButton;
```

- [ ] **Step 4: 修改 VisionPage 添加同步按钮**

在 `frontend/src/pages/tourist/VisionPage.tsx` 的 `lastResult &&` 区域（约 line 86-112）修改底部栏，将单按钮改为双按钮布局：

```typescript
import VisionSyncButton from '../../components/Room/VisionSyncButton';
// ... existing imports

// In the bottom bar (replacing the existing lastResult block):
{lastResult && (
  <div style={{
    padding: isMobile ? '12px 16px' : '12px 24px',
    borderTop: '1px solid var(--border-light)',
    backgroundColor: 'var(--surface-card)',
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexShrink: 0,
  }}>
    <VisionSyncButton
      roomId={localStorage.getItem('current_room_id')}
      spotName={lastResult.spot_name}
      confidence={lastResult.confidence}
      description={lastResult.explanation}
    />
    <Button
      type="primary"
      icon={<MessageOutlined />}
      onClick={handleGoToChat}
      style={{
        borderRadius: 'var(--radius-xl)',
        height: 44,
        paddingLeft: '24px',
        paddingRight: '24px',
        background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
        border: 'none',
        boxShadow: '0 2px 8px rgba(26, 95, 180, 0.3)',
      }}
    >
      去对话页听数字人讲解
    </Button>
  </div>
)}
```

- [ ] **Step 5: useRoomWebSocket 新增 spot_added 消息处理**

在 `frontend/src/hooks/useRoomWebSocket.ts` 的消息处理 switch 中，新增 `spot_added` case：

```typescript
case 'spot_added': {
  const { itinerary } = data;
  if (itinerary) {
    setItinerary(itinerary);
  }
  break;
}
```

- [ ] **Step 6: 前端验证**

```bash
cd frontend
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: 提交**

```bash
git add frontend/src/hooks/useVisionRoomSync.ts frontend/src/components/Room/VisionSyncButton.tsx frontend/src/api/vision.ts frontend/src/api/room.ts frontend/src/pages/tourist/VisionPage.tsx frontend/src/hooks/useRoomWebSocket.ts
git commit -m "feat: 拍照识景同步按钮 — 一键推送识别结果到协同房间行程"
```

---

## 阶段二：协同导览 — LLM 智能问答 + 路线共享

### Task 3: 后端 — 协同房间 LLM 问答

**Files:**
- Modify: `backend/app/api/room.py` (~line 174-182, 增强 chat 消息处理)
- Modify: `backend/app/services/room_service.py` (无修改，已有功能足够)

- [ ] **Step 1: 增强 room WebSocket chat 消息 — 接入 LLM 回答**

在 `backend/app/api/room.py` 的 `msg_type == "chat"` 处理中（约 line 174-182），替换为：

```python
elif msg_type == "chat":
    question = data.get("question", "").strip()
    if question:
        # Broadcast the question to all room members
        await _broadcast_to_room(room_id, {
            "type": "chat_broadcast",
            "from": member_name,
            "question": question,
            "timestamp": int(time.time()),
        })

        # Try to answer via LLM + RAG
        try:
            from app.services.chat_service import handle_chat_message
            answer = await handle_chat_message(question, session_id=f"room_{room_id}")
            await websocket.send_json({
                "type": "chat_answer",
                "question": question,
                "answer": answer,
                "timestamp": int(time.time()),
            })
        except Exception as e:
            logger.warning("Room LLM answer failed: %s", e)
            await websocket.send_json({
                "type": "chat_answer",
                "question": question,
                "answer": "抱歉，暂时无法回答该问题。",
                "timestamp": int(time.time()),
            })
```

- [ ] **Step 2: 确认 chat_service 接口可用性**

检查 `backend/app/services/chat_service.py` 中 `handle_chat_message` 函数签名。如果该函数不存在或签名不匹配，使用已有的 LLM 调用路径：

```python
# Fallback if handle_chat_message doesn't exist:
from app.core.llm_router import call_llm
from app.core.rag import retrieve

async def answer_room_question(question: str) -> str:
    """Answer a question for a collaborative room."""
    # RAG retrieval first
    chunks = await retrieve(question)
    context = "\n".join(c.get("content", "") for c in chunks[:3]) if chunks else ""

    if context:
        prompt = f"基于以下景区知识回答问题：\n{context}\n\n问题：{question}"
    else:
        prompt = f"作为灵山景区导游，回答以下问题：{question}"

    return await call_llm(prompt)
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/api/room.py
git commit -m "feat: 协同房间 LLM 智能问答 — 房间内提问由 AI 导游实时回答"
```

---

### Task 4: 前端 — 协同房间 LLM 问答面板 + 路线共享

**Files:**
- Create: `frontend/src/components/Room/RoomChat.tsx`
- Create: `frontend/src/components/Room/RouteShareCard.tsx`
- Modify: `frontend/src/pages/tourist/RoomPage.tsx` (整合 RoomChat + RouteShareCard)
- Modify: `frontend/src/hooks/useRoomWebSocket.ts` (新增 `chat_answer` 消息处理)

- [ ] **Step 1: RoomChat 组件**

创建 `frontend/src/components/Room/RoomChat.tsx`:

```typescript
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input, message as antMsg } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';

interface ChatMessage {
  from: string;
  question?: string;
  answer?: string;
  timestamp: number;
}

interface RoomChatProps {
  connected: boolean;
  memberName: string;
  onSendChat: (question: string) => void;
  messages: ChatMessage[];
}

const RoomChat: React.FC<RoomChatProps> = ({ connected, memberName, onSendChat, messages }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSendChat(input.trim());
    setInput('');
  }, [input, onSendChat]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', maxHeight: 400,
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: 'var(--surface-card)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border-light)',
        fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <RobotOutlined style={{ color: 'var(--color-primary)' }} />
        AI 导游问答
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px' }}>
            向 AI 导游提问灵山景区相关知识
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ animation: 'fadeInUp 200ms ease-out both' }}>
            {/* Question */}
            {msg.question && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff', borderRadius: 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)',
                  fontSize: '13px',
                }}>
                  {msg.question}
                </div>
                <UserOutlined style={{ color: 'var(--text-tertiary)', fontSize: '16px', marginTop: '4px' }} />
              </div>
            )}
            {/* Answer */}
            {msg.answer && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <RobotOutlined style={{ color: 'var(--color-primary)', fontSize: '16px', marginTop: '4px' }} />
                <div style={{
                  maxWidth: '85%', padding: '8px 12px',
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '4px var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                  fontSize: '13px', lineHeight: 1.6,
                  color: 'var(--text-primary)',
                }}>
                  {msg.answer}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border-light)',
        display: 'flex', gap: '8px',
      }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder={connected ? '提问灵山景区知识...' : '未连接，无法提问'}
          disabled={!connected}
          style={{ flex: 1, fontSize: '13px' }}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !input.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-md)',
            background: connected && input.trim() ? 'var(--color-primary)' : 'var(--border-light)',
            color: '#fff', cursor: connected && input.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <SendOutlined />
        </button>
      </div>
    </div>
  );
};

export default RoomChat;
```

- [ ] **Step 2: RouteShareCard 组件**

创建 `frontend/src/components/Room/RouteShareCard.tsx`:

```typescript
import React from 'react';
import { ShareAltOutlined } from '@ant-design/icons';

interface RouteShareCardProps {
  routeName: string;
  duration: string;
  spotCount: number;
  onShare: () => void;
}

const RouteShareCard: React.FC<RouteShareCardProps> = ({ routeName, duration, spotCount, onShare }) => (
  <div style={{
    padding: '10px 14px',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--surface-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: '13px',
  }}>
    <div>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{routeName}</div>
      <div style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>
        {duration} · {spotCount} 个景点
      </div>
    </div>
    <button
      onClick={onShare}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '5px 12px', border: '1px solid var(--color-primary)',
        borderRadius: 'var(--radius-pill)', background: 'transparent',
        color: 'var(--color-primary)', fontSize: '12px', cursor: 'pointer',
      }}
    >
      <ShareAltOutlined /> 推送到房间
    </button>
  </div>
);

export default RouteShareCard;
```

- [ ] **Step 3: useRoomWebSocket 新增 chat_answer 处理**

在 `frontend/src/hooks/useRoomWebSocket.ts` 中新增：

```typescript
// Add to the hook's state or return:
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

// In the message handler switch:
case 'chat_answer': {
  setChatMessages(prev => [...prev, {
    from: 'ai',
    question: data.question,
    answer: data.answer,
    timestamp: data.timestamp,
  }]);
  break;
}
```

- [ ] **Step 4: 修改 RoomPage 整合新组件**

在 `frontend/src/pages/tourist/RoomPage.tsx` 的 room 视图中，在行程时间线之后添加：

```typescript
import RoomChat from '../../components/Room/RoomChat';
// ...

{/* AI Chat Panel */}
<RoomChat
  connected={connected}
  memberName={nickName}
  onSendChat={sendChat}
  messages={chatMessages}
/>
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/Room/RoomChat.tsx frontend/src/components/Room/RouteShareCard.tsx frontend/src/pages/tourist/RoomPage.tsx frontend/src/hooks/useRoomWebSocket.ts
git commit -m "feat: 协同房间 AI 问答面板 + 路线共享卡片"
```

---

## 阶段三：推荐路线 — 动态推荐引擎 + 房间推送

### Task 5: 前端 — 推荐路线页接入动态推荐引擎

**Files:**
- Create: `frontend/src/components/Recommend/RecommendEngine.tsx`
- Create: `frontend/src/components/Recommend/RoutePushButton.tsx`
- Modify: `frontend/src/api/routes.ts` (新增 recommend API 函数)
- Modify: `frontend/src/pages/tourist/RecommendPage.tsx` (整合动态推荐)

- [ ] **Step 1: 前端 recommend API**

在 `frontend/src/api/routes.ts` 末尾添加（或新建 `frontend/src/api/recommend.ts`）：

```typescript
export interface Recommendation {
  spot_name: string;
  score: number;
  reason: string;
  tags: string[];
  duration: string;
}

export interface RecommendResponse {
  session_id: string;
  recommendations: Recommendation[];
  strategy: 'cold_start' | 'personalized' | 'popular';
  cached: boolean;
}

export const getRecommendations = (sessionId?: string, limit = 5) => {
  const params: Record<string, string> = { limit: String(limit) };
  if (sessionId) params.session_id = sessionId;
  return request.get<RecommendResponse>('/recommend', params);
};

export const submitFeedback = (spotName: string, feedback: 'like' | 'dislike', sessionId?: string) => {
  return request.post('/recommend/feedback', {
    spot_name: spotName,
    feedback,
    session_id: sessionId,
  });
};
```

- [ ] **Step 2: RecommendEngine 组件**

创建 `frontend/src/components/Recommend/RecommendEngine.tsx`:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { getRecommendations, type RecommendResponse, type Recommendation } from '../../api/recommend';
import RouteShareCard from '../Room/RouteShareCard';

interface RecommendEngineProps {
  roomId: string | null;
  onItineraryPush: (spots: { spot_name: string }[]) => void;
}

const RecommendEngine: React.FC<RecommendEngineProps> = ({ roomId, onItineraryPush }) => {
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem('recommend_session_id') || undefined;
  });

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecommendations(sessionId, 5);
      setData(res);
      if (res.session_id) {
        setSessionId(res.session_id);
        localStorage.setItem('recommend_session_id', res.session_id);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  const handlePushAll = useCallback(() => {
    if (!data?.recommendations.length) return;
    onItineraryPush(data.recommendations.map(r => ({ spot_name: r.spot_name })));
  }, [data, onItineraryPush]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>AI 正在为你推荐...</div>;
  }

  if (!data?.recommendations.length) {
    return <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>暂无个性化推荐</div>;
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '12px',
      }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
          AI 个性化推荐
          <span style={{
            marginLeft: '8px', fontSize: '12px', fontWeight: 400,
            color: 'var(--text-tertiary)',
          }}>
            {data.strategy === 'personalized' ? '个性化' : data.strategy === 'cold_start' ? '新游客' : '热门'}
          </span>
        </h3>
        {roomId && (
          <button
            onClick={handlePushAll}
            style={{
              padding: '5px 12px', border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-pill)', background: 'transparent',
              color: 'var(--color-primary)', fontSize: '12px', cursor: 'pointer',
            }}
          >
            全部推送到房间
          </button>
        )}
      </div>

      {data.recommendations.map((rec, i) => (
        <div
          key={rec.spot_name}
          style={{
            padding: '12px', marginBottom: '8px',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-card)',
            animation: `fadeInUp 250ms ease-out ${i * 50}ms both`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{rec.spot_name}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{rec.duration}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {rec.reason}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {rec.tags.map(tag => (
              <span key={tag} style={{
                padding: '2px 8px', fontSize: '11px',
                backgroundColor: 'var(--color-primary-bg)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-pill)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendEngine;
```

- [ ] **Step 3: RoutePushButton 组件**

创建 `frontend/src/components/Recommend/RoutePushButton.tsx`:

```typescript
import React, { useState } from 'react';
import { ShareAltOutlined, CheckOutlined } from '@ant-design/icons';
import { addSpotToItinerary } from '../../api/room';
import { message as antMsg } from 'antd';

interface RoutePushButtonProps {
  roomId: string;
  spots: Array<{ spot_name: string; spot_id?: string }>;
  label?: string;
}

const RoutePushButton: React.FC<RoutePushButtonProps> = ({ roomId, spots, label = '推送到协同房间' }) => {
  const [pushing, setPushing] = useState(false);
  const [done, setDone] = useState(false);

  const handlePush = async () => {
    setPushing(true);
    try {
      await Promise.all(
        spots.map(s => addSpotToItinerary(roomId, s.spot_name, s.spot_id, 'recommend'))
      );
      setDone(true);
      antMsg.success(`已将 ${spots.length} 个景点推送到房间行程`);
      setTimeout(() => setDone(false), 2000);
    } catch {
      antMsg.error('推送失败');
    } finally {
      setPushing(false);
    }
  };

  return (
    <button
      onClick={handlePush}
      disabled={pushing || done}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '5px 12px',
        border: '1px solid var(--color-primary)',
        borderRadius: 'var(--radius-pill)',
        background: done ? 'var(--color-success)' : 'transparent',
        color: done ? '#fff' : 'var(--color-primary)',
        fontSize: '12px', cursor: pushing || done ? 'not-allowed' : 'pointer',
      }}
    >
      {done ? <CheckOutlined /> : <ShareAltOutlined />}
      {done ? '已推送' : label}
    </button>
  );
};

export default RoutePushButton;
```

- [ ] **Step 4: 修改 RecommendPage 整合动态推荐**

在 `frontend/src/pages/tourist/RecommendPage.tsx` 的兴趣标签和路线列表之间，插入 `RecommendEngine` 组件：

```typescript
import RecommendEngine from '../../components/Recommend/RecommendEngine';
import { addSpotToItinerary } from '../../api/room';

// Add state for roomId (from localStorage or context):
const [roomId, setRoomId] = useState<string | null>(() => {
  return localStorage.getItem('current_room_id');
});

// Add handler:
const handleItineraryPush = useCallback(async (spots: { spot_name: string }[]) => {
  if (!roomId) return;
  for (const s of spots) {
    await addSpotToItinerary(roomId, s.spot_name, undefined, 'recommend');
  }
  antMsg.success(`已推送 ${spots.length} 个推荐景点到房间`);
}, [roomId]);

// In the JSX, after interest tags and before route list:
{roomId && (
  <div style={{ marginBottom: '20px' }}>
    <RecommendEngine roomId={roomId} onItineraryPush={handleItineraryPush} />
  </div>
)}
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/Recommend/RecommendEngine.tsx frontend/src/components/Recommend/RoutePushButton.tsx frontend/src/api/routes.ts frontend/src/pages/tourist/RecommendPage.tsx
git commit -m "feat: 推荐路线页接入动态推荐引擎 + 一键推送到协同房间"
```

---

## 阶段四：联调验收

### Task 6: 端到端联调

**Files:** 无新文件，全链路验证

- [ ] **Step 1: 验证拍照识景 → 协同房间流程**

1. 启动后端: `cd backend && python run.py`
2. 启动前端: `cd frontend && npm run dev`
3. 打开两个浏览器窗口：
   - 窗口 A: 创建协同房间，记下房间号
   - 窗口 B: 加入同一房间
4. 在任一窗口进入拍照识景页面
5. 拍照/上传图片 → 识别成功后点击"同步到协同房间"
6. 验证：两个窗口的行程时间线同时出现新景点

- [ ] **Step 2: 验证协同房间 LLM 问答**

1. 在房间页面底部 AI 问答面板输入问题（如"灵山大佛多高"）
2. 验证：AI 返回回答，且房间其他成员也能看到

- [ ] **Step 3: 验证推荐路线 → 协同房间推送**

1. 进入推荐路线页面
2. 验证：显示 AI 个性化推荐列表（非仅预定义路线）
3. 点击"全部推送到房间"
4. 切换到房间页面，验证行程时间线新增推荐景点

- [ ] **Step 4: 运行后端测试全量验证**

```bash
cd backend
python -m pytest tests/ -v --tb=short -x
```

Expected: 206+ tests pass.

- [ ] **Step 5: 运行前端测试**

```bash
cd frontend
npm test
```

Expected: All tests pass.

- [ ] **Step 6: 提交**

```bash
git commit --allow-empty -m "chore: 三功能联调验收通过 — 拍照识景→协同导览→推荐路线全链路可用"
```

---

## 依赖图

```
Task 1: 后端同步服务 (vision_room_sync + room_service add_spot)
  └── Task 2: 前端同步按钮 (VisionSyncButton + VisionPage 修改)
        └── Task 6: 联调验证

Task 3: 后端房间 LLM 问答
  └── Task 4: 前端问答面板 (RoomChat + RoomPage 修改)
        └── Task 6: 联调验证

Task 5: 推荐引擎前端 (RecommendEngine + RoutePushButton)
  └── Task 6: 联调验证
```
