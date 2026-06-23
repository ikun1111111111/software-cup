import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '@/api/config';
import { getRoomInfo, updateRoomRoute, type Room } from '@/api/room';
import {
  applyRoomSyncMessage,
  initialRoomSyncState,
  mergeRoomSnapshot,
  type RoomSyncMessage,
  type RoomSyncState,
} from '@/utils/roomSync';

function getRoomWebSocketUrl(roomId: string) {
  const wsBase = API_BASE_URL.replace(/^http/i, 'ws');
  return `${wsBase}/room/ws/${roomId}`;
}

export function useRoomSync(roomId: string | null, memberName: string | null) {
  const socketRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<RoomSyncState>(initialRoomSyncState);

  const hydrateRoom = useCallback(async (nextRoomId: string) => {
    const room = await getRoomInfo(nextRoomId);
    setState((prev) => ({ ...mergeRoomSnapshot(room), connected: prev.connected }));
    return room;
  }, []);

  useEffect(() => {
    socketRef.current?.close();
    socketRef.current = null;

    if (!roomId || !memberName?.trim()) {
      setState(initialRoomSyncState);
      return;
    }

    let cancelled = false;
    hydrateRoom(roomId).catch((error) => {
      if (!cancelled) {
        setState((prev) => ({ ...prev, error: error.message || '房间状态加载失败' }));
      }
    });

    const socket = new WebSocket(getRoomWebSocketUrl(roomId));
    socketRef.current = socket;

    socket.onopen = () => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, connected: true, error: null }));
      socket.send(JSON.stringify({ type: 'join', member_name: memberName.trim() }));
    };

    socket.onmessage = (event) => {
      if (cancelled) return;
      try {
        const message = JSON.parse(event.data) as RoomSyncMessage;
        setState((prev) => applyRoomSyncMessage(prev, message));
      } catch {
        setState((prev) => ({ ...prev, error: '房间消息解析失败' }));
      }
    };

    socket.onerror = () => {
      if (!cancelled) {
        setState((prev) => ({ ...prev, error: '房间实时连接异常' }));
      }
    };

    socket.onclose = () => {
      if (!cancelled) {
        setState((prev) => ({ ...prev, connected: false }));
      }
    };

    return () => {
      cancelled = true;
      socket.close();
    };
  }, [roomId, memberName, hydrateRoom]);

  const setRoom = useCallback((room: Room | null) => {
    setState(room ? mergeRoomSnapshot(room) : initialRoomSyncState);
  }, []);

  const syncRoute = useCallback(async (routeId: string) => {
    if (!roomId) throw new Error('请先创建或加入房间');
    const room = await updateRoomRoute(roomId, routeId);
    setState((prev) => ({ ...mergeRoomSnapshot(room), connected: prev.connected }));
    return room;
  }, [roomId]);

  return useMemo(() => ({
    ...state,
    setRoom,
    hydrateRoom,
    syncRoute,
  }), [state, setRoom, hydrateRoom, syncRoute]);
}
