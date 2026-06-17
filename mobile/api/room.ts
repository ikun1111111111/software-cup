import { get, post, del } from './request';

export interface Room {
  room_id: string;
  creator: string;
  created_at: number;
  itinerary: Array<Record<string, any>>;
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
