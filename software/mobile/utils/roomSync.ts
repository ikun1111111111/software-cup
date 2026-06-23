import type { Room, RoomActiveRoute } from '@/api/room';

export interface RoomSyncState {
  room: Room | null;
  members: Array<Record<string, any>>;
  itinerary: Array<Record<string, any>>;
  activeRoute: RoomActiveRoute | null;
  connected: boolean;
  error: string | null;
}

export type RoomSyncMessage =
  | { type: 'room_state'; room_id?: string; members?: any[]; itinerary?: any[]; active_route?: RoomActiveRoute | null }
  | { type: 'member_joined'; member: Record<string, any> }
  | { type: 'member_left'; member_name: string }
  | { type: 'route_updated'; active_route: RoomActiveRoute }
  | { type: 'itinerary_update'; itinerary: any[] }
  | { type: 'spot_added'; itinerary: any[] }
  | { type: 'error'; message: string }
  | Record<string, any>;

type RoomStateMessage = Extract<RoomSyncMessage, { type: 'room_state' }>;
type MemberJoinedMessage = Extract<RoomSyncMessage, { type: 'member_joined' }>;
type MemberLeftMessage = Extract<RoomSyncMessage, { type: 'member_left' }>;
type RouteUpdatedMessage = Extract<RoomSyncMessage, { type: 'route_updated' }>;
type ItineraryMessage = Extract<RoomSyncMessage, { type: 'itinerary_update' | 'spot_added' }>;
type ErrorMessage = Extract<RoomSyncMessage, { type: 'error' }>;

export const initialRoomSyncState: RoomSyncState = {
  room: null,
  members: [],
  itinerary: [],
  activeRoute: null,
  connected: false,
  error: null,
};

export function mergeRoomSnapshot(room: Room): RoomSyncState {
  return {
    room,
    members: room.members || [],
    itinerary: room.itinerary || [],
    activeRoute: room.active_route || null,
    connected: false,
    error: null,
  };
}

export function applyRoomSyncMessage(state: RoomSyncState, message: RoomSyncMessage): RoomSyncState {
  switch (message.type) {
    case 'room_state': {
      const msg = message as RoomStateMessage;
      return {
        ...state,
        members: msg.members || [],
        itinerary: msg.itinerary || [],
        activeRoute: msg.active_route || null,
        error: null,
      };
    }
    case 'member_joined': {
      const msg = message as MemberJoinedMessage;
      const memberName = msg.member?.name;
      const exists = memberName && state.members.some((member) => member.name === memberName);
      return {
        ...state,
        members: exists ? state.members : [...state.members, msg.member],
      };
    }
    case 'member_left': {
      const msg = message as MemberLeftMessage;
      return {
        ...state,
        members: state.members.filter((member) => member.name !== msg.member_name),
      };
    }
    case 'route_updated': {
      const msg = message as RouteUpdatedMessage;
      return {
        ...state,
        activeRoute: msg.active_route,
        room: state.room ? { ...state.room, active_route: msg.active_route } : state.room,
      };
    }
    case 'itinerary_update':
    case 'spot_added': {
      const msg = message as ItineraryMessage;
      return {
        ...state,
        itinerary: msg.itinerary || [],
        room: state.room ? { ...state.room, itinerary: msg.itinerary || [] } : state.room,
      };
    }
    case 'error': {
      const msg = message as ErrorMessage;
      return { ...state, error: msg.message || '房间同步异常' };
    }
    default:
      return state;
  }
}
