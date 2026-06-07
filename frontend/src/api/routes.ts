import request from './request';

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

export const listRoutes = (routeType?: string) => {
  const params = routeType ? { route_type: routeType } : {};
  return request.get<TourRoute[]>('/routes', { params });
};

export const getRouteById = (id: string) => {
  return request.get<TourRouteDetail>(`/routes/${id}`);
};

export interface RecommendationResult {
  route_id: string;
  route_name: string;
  score: number;
  reason: string;
  matched_interests: string[];
}

export interface RecommendRequest {
  interests?: string[];
  session_id?: string;
  lat?: number;
  lng?: number;
}

/**
 * Get AI-powered personalized route recommendations.
 * Maps to backend GET /api/recommend?session_id=xxx&limit=N
 */
export const getRecommendations = (params?: RecommendRequest) => {
  const sessionId = params?.session_id || 'web-' + Date.now().toString(36);
  return request.get('/recommend', { params: { session_id: sessionId, limit: 5 } });
};

/**
 * Submit recommendation feedback for model improvement.
 * Maps to backend POST /api/recommend/feedback
 */
export const submitRecommendFeedback = (spotName: string, liked: boolean) => {
  return request.post('/recommend/feedback', {
    session_id: 'web-' + Date.now().toString(36),
    spot_name: spotName,
    feedback: liked ? 'like' : 'dislike',
  });
};
