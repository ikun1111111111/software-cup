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

export interface AddSpotParams {
  spot_name: string;
  source?: string;
  confidence?: number;
  note?: string;
}

export interface AddSpotResult {
  status: string;
  spot_name: string;
  itinerary_count: number;
  itinerary: ItineraryItem[];
}

/**
 * Add a single scenic spot to a room's shared itinerary.
 * Automatically broadcasts to all room members via WebSocket.
 */
export async function addSpotToItinerary(
  roomId: string,
  params: AddSpotParams,
): Promise<AddSpotResult> {
  const response = await request.post<AddSpotResult>(
    `/room/${roomId}/itinerary/add-spot`,
    {
      spot_name: params.spot_name,
      source: params.source || 'manual',
      confidence: params.confidence ?? 1.0,
      note: params.note || '',
    },
  );
  return (response as any).data;
}
