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

export interface RecommendRequest {
  interests?: string[];
  session_id?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

export const getRecommendations = async (params?: RecommendRequest): Promise<RecommendationResult[]> => {
  const sessionId = params?.session_id || 'web-' + Date.now().toString(36);
  const resp = await get<any>('/recommend', { ...params, session_id: sessionId, limit: params?.limit || 5 });
  return resp.data;
};

export const submitRecommendFeedback = async (routeId: string, rating: number): Promise<void> => {
  await post('/recommend/feedback', { route_id: routeId, rating });
};

// ===== DNA Recommendation APIs =====

export interface DNAProfile {
  session_id: string;
  dna_type: string;
  dna_scores: Record<string, number>;
}

export interface DNARecommendItem {
  rank: number;
  spot_name: string;
  category: string;
  reason: string;
  suggested_duration: string;
  tags: string[];
  source: string;
  dna_similarity?: number;
}

export interface DNARecommendResponse {
  session_id: string;
  dna_type: string;
  dna_scores: Record<string, number>;
  recommendations: DNARecommendItem[];
  cf_attractions: Array<{ attraction: string; score: number }>;
  strategy: string;
}

export const getDNAProfile = async (sessionId: string): Promise<DNAProfile> => {
  const resp = await get<DNAProfile>('/recommend/dna/profile', { session_id: sessionId });
  return resp.data;
};

export const getDNARecommendations = async (sessionId: string, limit?: number): Promise<DNARecommendResponse> => {
  const resp = await get<DNARecommendResponse>('/recommend/dna', { session_id: sessionId, limit });
  return resp.data;
};
