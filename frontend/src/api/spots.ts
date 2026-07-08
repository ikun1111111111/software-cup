import { get, getCached } from './request';

export interface Spot {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  qr_code: string | null;
  thumbnail: string | null;
  duration: string | null;
  display_x: number | null;
  display_y: number | null;
  latitude: number | null;
  longitude: number | null;
  qa_json: { q: string; a: string }[] | null;
  story_acts: StoryAct[] | null;
}

export interface StoryAct {
  id: string;
  title: string;
  emotion: string;
  prompt_hint: string;
  act_image: string;
}

export interface SpotDetail extends Spot {
  detail: string;
  related_spots: string[] | null;
  detail_images: string[] | null;
  story_acts: StoryAct[] | null;
  qa_json: { q: string; a: string }[] | null;
}

export interface TourRoute {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
  cover_image: string | null;
  color: string | null;
  brush_image: string | null;
  opening_text: string | null;
  closing_text: string | null;
  spot_order: string[];
  spot_details: Record<string, unknown> | null;
  is_active: boolean;
}

export const listSpots = async (category?: string): Promise<Spot[]> => {
  const resp = await getCached<Spot[]>('/spots', category ? { category } : undefined, 60000);
  return resp.data;
};

export const getSpotById = async (id: string): Promise<SpotDetail> => {
  const resp = await get<SpotDetail>(`/spots/${id}`);
  return resp.data;
};

export const listRoutes = async (): Promise<TourRoute[]> => {
  const resp = await get<TourRoute[]>('/routes');
  return resp.data;
};

export const getRouteById = async (id: string): Promise<TourRoute> => {
  const resp = await get<TourRoute>(`/routes/${id}`);
  return resp.data;
};
