import { get, post } from './request';
import type { Route, Spot, TourProgress } from '@/hooks/useTourOrchestrator';

export interface StartTourRequest {
  session_id: string;
  route_id: string;
  preferences?: Record<string, any>;
}

export interface StartTourResponse {
  tour_id: string;
  route: Route;
  first_spot: Spot;
  narration?: {
    spot: Spot;
    text: string;
    audioUrl?: string;
    duration?: number;
  } | null;
  next_spots: Spot[];
}

export interface UpdateTourProgressResponse {
  next_spot?: Spot | null;
  is_complete: boolean;
}

export interface SessionTourProgressResponse {
  tour_id: string;
  status: string;
  current_spot?: Spot | null;
  progress: TourProgress;
  route_name: string;
}

export async function startTourSession(request: StartTourRequest): Promise<StartTourResponse> {
  const resp = await post<StartTourResponse>('/tour/start', request);
  return resp.data;
}

export async function updateTourProgress(params: {
  tour_id: string;
  current_spot_id: string;
  completed?: boolean;
}): Promise<UpdateTourProgressResponse> {
  const resp = await post<UpdateTourProgressResponse>('/tour/progress', {
    tour_id: params.tour_id,
    current_spot_id: params.current_spot_id,
    completed: params.completed ?? true,
  });
  return resp.data;
}

export async function getSessionTourProgress(sessionId: string): Promise<SessionTourProgressResponse> {
  const resp = await get<SessionTourProgressResponse>(`/tour/progress/${sessionId}`);
  return resp.data;
}
