import { get } from './request';

export interface Spot {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  qr_code: string | null;
}

export interface SpotDetail extends Spot {
  detail: string;
  related_spots: string[] | null;
}

export const listSpots = async (category?: string): Promise<Spot[]> => {
  const resp = await get<Spot[]>('/spots', category ? { category } : undefined);
  return resp.data;
};

export const getSpotById = async (id: string): Promise<SpotDetail> => {
  const resp = await get<SpotDetail>(`/spots/${id}`);
  return resp.data;
};
