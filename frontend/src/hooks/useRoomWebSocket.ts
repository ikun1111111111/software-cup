import { useCallback, useEffect, useRef, useState } from 'react';

export interface RoomMessage {
  type: string;
  [key: string]: any;
}

interface UseRoomWebSocketOptions {
  roomId: string;
  memberName: string;
  onMessage?: (msg: RoomMessage) => void;
  onMemberJoined?: (member: { name: string; joined_at: number }) => void;
  onMemberLeft?: (memberName: string) => void;
  onItineraryUpdate?: (itinerary: any[], from: string) => void;
  onSpotAdded?: (spot: {
    spot_name: string;
    source: string;
    confidence: number;
    note: string;
    itinerary: any[];
    timestamp: number;
  }) => void;
  onChatAnswer?: (answer: {
    from: string;
    question: string;
    answer: string;
    timestamp: number;
  }) => void;
  onChatBroadcast?: (chat: {
    from: string;
    question: string;
    timestamp: number;
  }) => void;
  onRoomState?: (state: { members: any[]; itinerary: any[] }) => void;
  onError?: (error: string) => void;
}

export function useRoomWebSocket(options: UseRoomWebSocketOptions) {
  const {
    roomId,
    memberName,
    onMessage,
    onMemberJoined,
    onMemberLeft,
    onItineraryUpdate,
    onSpotAdded,
    onChatAnswer,
    onChatBroadcast,
    onRoomState,
    onError,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/room/ws/${roomId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', member_name: memberName }));
      setConnected(true);

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as RoomMessage;
        onMessage?.(msg);

        switch (msg.type) {
          case 'room_state':
            setMembers(msg.members || []);
            setItinerary(msg.itinerary || []);
            onRoomState?.({ members: msg.members, itinerary: msg.itinerary });
            break;
          case 'member_joined':
            setMembers((prev) => [...prev, msg.member]);
            onMemberJoined?.(msg.member);
            break;
          case 'member_left':
            setMembers((prev) => prev.filter((m) => m.name !== msg.member_name));
            onMemberLeft?.(msg.member_name);
            break;
          case 'itinerary_update':
            setItinerary(msg.itinerary || []);
            onItineraryUpdate?.(msg.itinerary, msg.from);
            break;
          case 'spot_added':
            setItinerary(msg.itinerary || []);
            onSpotAdded?.({
              spot_name: msg.spot_name,
              source: msg.source,
              confidence: msg.confidence,
              note: msg.note,
              itinerary: msg.itinerary,
              timestamp: msg.timestamp,
            });
            break;
          case 'chat_answer':
            onChatAnswer?.({
              from: msg.from,
              question: msg.question,
              answer: msg.answer,
              timestamp: msg.timestamp,
            });
            break;
          case 'chat_broadcast':
            onChatBroadcast?.({
              from: msg.from,
              question: msg.question,
              timestamp: msg.timestamp,
            });
            break;
          case 'error':
            onError?.(msg.message);
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      clearInterval(pingIntervalRef.current);
    };

    ws.onerror = () => {
      onError?.('WebSocket 连接失败');
      setConnected(false);
    };
  }, [roomId, memberName, onMessage, onMemberJoined, onMemberLeft, onItineraryUpdate, onRoomState, onError]);

  const disconnect = useCallback(() => {
    clearInterval(pingIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendChat = useCallback((question: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', question }));
    }
  }, []);

  const sendItineraryUpdate = useCallback((newItinerary: any[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'itinerary_update', itinerary: newItinerary }));
    }
  }, []);

  // Auto-connect when roomId becomes available
  useEffect(() => {
    if (!roomId || !memberName) return;
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, memberName]);

  useEffect(() => {
    return () => {
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    connected,
    members,
    itinerary,
    connect,
    disconnect,
    sendChat,
    sendItineraryUpdate,
  };
}
