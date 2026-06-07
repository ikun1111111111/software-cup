import request from './request';

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

export const listSpots = (category?: string) => {
  const params = category ? { category } : {};
  return request.get<Spot[]>('/spots', { params });
};

export const getSpotById = (id: string) => {
  return request.get<SpotDetail>(`/spots/${id}`);
};
