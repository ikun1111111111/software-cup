import { get, post } from './request';
import { DEMO_MODE } from './config';
import { getDemoSpotById, getDemoSpots } from '@/utils/localDemoData';

export interface Spot {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  qr_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface SpotDetail extends Spot {
  detail: string;
  related_spots: string[] | null;
}

export const listSpots = async (category?: string): Promise<Spot[]> => {
  if (DEMO_MODE) {
    return getDemoSpots(category) as unknown as Spot[];
  }

  try {
    const resp = await get<Spot[]>('/spots', category ? { category } : undefined);
    return Array.isArray(resp.data) && resp.data.length > 0
      ? resp.data
      : getDemoSpots(category) as unknown as Spot[];
  } catch {
    return getDemoSpots(category) as unknown as Spot[];
  }
};

export const getSpotById = async (id: string): Promise<SpotDetail> => {
  const fallback = getDemoSpotById(id);
  if (DEMO_MODE && fallback) {
    return fallback as unknown as SpotDetail;
  }

  try {
    const resp = await get<SpotDetail>(`/spots/${id}`);
    return resp.data;
  } catch (error) {
    if (fallback) return fallback as unknown as SpotDetail;
    throw error;
  }
};

export interface VisitResult {
  session_id: string;
  visited_spots: string[];
  stamps: string[];
  achievements: string[];
  score: number;
  new_stamps: Array<{ id: string; name: string; color: string; symbol: string; spot_name: string }>;
  new_achievements: Array<{ id: string; name: string; description: string; icon: string }>;
}

export const recordVisit = async (sessionId: string, spotName: string): Promise<VisitResult> => {
  const resp = await post<VisitResult>('/puzzle/visit', undefined, {
    params: { session_id: sessionId, spot_name: spotName },
  });
  return resp.data;
};
