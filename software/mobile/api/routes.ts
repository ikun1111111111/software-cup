import { get, post } from './request';
import { DEMO_MODE } from './config';
import { getDemoRouteById, getDemoRoutes } from '@/utils/localDemoData';

export interface TourRoute {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
}

export interface SpotBrief {
  id: string;
  name: string;
}

export interface TourRouteDetail extends TourRoute {
  spot_order: string[];
  spot_names: SpotBrief[];
  spot_details: Record<string, { 讲解重点: string[]; 特色体验: string[] }> | null;
}

export const listRoutes = async (routeType?: string): Promise<TourRoute[]> => {
  if (DEMO_MODE) {
    return getDemoRoutes(routeType) as unknown as TourRoute[];
  }

  try {
    const resp = await get<TourRoute[]>('/routes', routeType ? { route_type: routeType } : undefined);
    return Array.isArray(resp.data) && resp.data.length > 0
      ? resp.data
      : getDemoRoutes(routeType) as unknown as TourRoute[];
  } catch {
    return getDemoRoutes(routeType) as unknown as TourRoute[];
  }
};

export const getRouteById = async (id: string): Promise<TourRouteDetail> => {
  const fallback = getDemoRouteById(id);
  if (DEMO_MODE && fallback) {
    return fallback as unknown as TourRouteDetail;
  }

  try {
    const resp = await get<TourRouteDetail>(`/routes/${id}`);
    return resp.data;
  } catch (error) {
    if (fallback) return fallback as unknown as TourRouteDetail;
    throw error;
  }
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
