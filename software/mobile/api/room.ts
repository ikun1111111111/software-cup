import { get, post, put, del } from './request';

export interface RoomActiveRoute {
  route_id: string;
  name: string;
  spot_order: string[];
  spot_names: Array<{ id: string; name: string }>;
  duration?: string | null;
  route_type?: string | null;
}

export interface Room {
  room_id: string;
  creator: string;
  created_at: number;
  itinerary: Array<Record<string, any>>;
  active_route?: RoomActiveRoute | null;
  members: Array<Record<string, any>>;
}

export const createRoom = async (creatorName: string): Promise<Room> => {
  const resp = await post<Room>('/room/create', { creator_name: creatorName });
  return resp.data;
};

export const joinRoom = async (roomId: string, memberName: string): Promise<Room> => {
  const resp = await post<Room>(`/room/${roomId}/join`, { member_name: memberName });
  return resp.data;
};

export const getRoomInfo = async (roomId: string): Promise<Room> => {
  const resp = await get<Room>(`/room/${roomId}`);
  return resp.data;
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await del(`/room/${roomId}`);
};

export const updateRoomRoute = async (roomId: string, routeId: string): Promise<Room> => {
  const resp = await put<Room>(`/room/${roomId}/route`, { route_id: routeId });
  return resp.data;
};
