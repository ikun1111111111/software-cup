import request from './request';

export interface RoomMember {
  name: string;
  role: string;
  joined_at: number;
}

export interface RoomData {
  room_id: string;
  creator: string;
  created_at: number;
  itinerary: ItineraryItem[];
  members: RoomMember[];
}

export interface ItineraryItem {
  spot_name: string;
  time?: string;
  note?: string;
}

export async function createRoom(creatorName: string): Promise<RoomData> {
  const response = await request.post<RoomData>('/room/create', {
    creator_name: creatorName,
  });
  return (response as any).data;
}

export async function joinRoom(roomId: string, memberName: string): Promise<RoomData> {
  const response = await request.post<RoomData>(`/room/${roomId}/join`, {
    member_name: memberName,
  });
  return (response as any).data;
}

export async function getRoomInfo(roomId: string): Promise<RoomData> {
  const response = await request.get<RoomData>(`/room/${roomId}`);
  return (response as any).data;
}

export async function updateItinerary(roomId: string, itinerary: ItineraryItem[]): Promise<void> {
  await request.put(`/room/${roomId}/itinerary`, { itinerary });
}
