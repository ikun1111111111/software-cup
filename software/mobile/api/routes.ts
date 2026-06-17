import { get, post } from './request';

export interface TourRoute {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
}

export interface TourRouteDetail extends TourRoute {
  spot_order: string[];
  spot_details: Record<string, { 讲解重点: string[]; 特色体验: string[] }> | null;
}

export const listRoutes = async (routeType?: string): Promise<TourRoute[]> => {
  const resp = await get<TourRoute[]>('/routes', routeType ? { route_type: routeType } : undefined);
  return resp.data;
};

export const getRouteById = async (id: string): Promise<TourRouteDetail> => {
  const resp = await get<TourRouteDetail>(`/routes/${id}`);
  return resp.data;
};

export interface RecommendationResult {
  route_id: string;
  route_name: string;
  score: number;
  reason: string;
  matched_interests: string[];
}

export const getRecommendations = async (params?: {
  interests?: string[];
  session_id?: string;
  limit?: number;
}): Promise<RecommendationResult[]> => {
  const sessionId = params?.session_id || 'mobile-' + Date.now().toString(36);
  const resp = await get<any>('/recommend', {
    ...params,
    session_id: sessionId,
    limit: params?.limit || 5,
  });
  return resp.data;
};
