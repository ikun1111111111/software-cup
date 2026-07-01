import request from './request';

export interface TravelMemory {
  id: number;
  session_id: string;
  title: string;
  original_content: string;
  polished_content: string | null;
  spot_name: string | null;
  spot_id: string | null;
  source_type: string;
  mood_tag: string | null;
  metadata_json: Record<string, any> | null;
  photo_url: string | null;
  voice_url: string | null;
  voice_duration: number | null;
  is_capsule: boolean;
  capsule_unlock_at: string | null;
  capsule_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneySummary {
  id: number;
  session_id: string;
  title: string;
  content: string;
  spot_count: number;
  memory_count: number;
  date_range: string;
  cover_image_url: string | null;
  created_at: string;
}

export interface GenerateMemoriesResult {
  new_count: number;
  total_count: number;
  memories: TravelMemory[];
}

export async function listMemories(sessionId: string): Promise<TravelMemory[]> {
  const resp = await request.get<TravelMemory[]>('/memory/list', {
    params: { session_id: sessionId },
  });
  return resp.data;
}

export async function generateMemories(sessionId: string): Promise<GenerateMemoriesResult> {
  const resp = await request.post<GenerateMemoriesResult>('/memory/generate', { session_id: sessionId });
  return resp.data;
}

export async function polishMemory(memoryId: number): Promise<TravelMemory> {
  const resp = await request.post<TravelMemory>(`/memory/${memoryId}/polish`);
  return resp.data;
}

export async function getLatestSummary(sessionId: string): Promise<JourneySummary | null> {
  const resp = await request.get<JourneySummary | null>('/memory/summary/latest', {
    params: { session_id: sessionId },
  });
  return resp.data;
}

export async function generateSummary(sessionId: string): Promise<JourneySummary> {
  const resp = await request.post<JourneySummary>('/memory/summary/generate', {
    session_id: sessionId,
  });
  return resp.data;
}

export async function createMemory(params: {
  session_id: string;
  user_input: string;
  spot_name?: string;
  spot_id?: string;
  source_type?: string;
  mood_tag?: string;
  metadata_json?: Record<string, any>;
  photo_url?: string;
  voice_url?: string;
  voice_duration?: number;
}): Promise<TravelMemory> {
  const resp = await request.post<TravelMemory>('/memory/create', params);
  return resp.data;
}

export async function createCapsule(params: {
  session_id: string;
  title: string;
  content: string;
  unlock_days: number;
  spot_name?: string;
  mood_tag?: string;
}): Promise<TravelMemory> {
  const resp = await request.post<TravelMemory>('/memory/capsule/create', params);
  return resp.data;
}

export async function unlockCapsule(capsuleId: number): Promise<{
  id: number;
  title: string;
  capsule_content: string;
  capsule_unlock_at: string;
  unlocked: boolean;
}> {
  const resp = await request.post(`/memory/capsule/${capsuleId}/unlock`);
  return resp.data;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface UserProfile {
  session_id: string;
  score: number;
  visited_count: number;
  correct_answers: number;
  total_answers: number;
  accuracy: number;
  collected_stamps: number;
  total_stamps: number;
  achievements: string[];
  level: { name: string; icon: string; min_score: number };
  stamps: Array<{
    id: string;
    name: string;
    color: string;
    symbol: string;
    collected: boolean;
    spot_name: string;
  }>;
}

export interface SessionStatsCandidate {
  eventId: string;
  eventType: string;
  title: string;
  content: string;
  spotName?: string | null;
  spotId?: string | null;
  createdAt: string;
  sourceType: string;
  sourcePage?: string | null;
  routeId?: string | null;
  routeName?: string | null;
  metadata?: Record<string, any> | null;
}

export interface SessionStats {
  session_id: string;
  event_count: number;
  narration_count: number;
  question_count: number;
  checkin_count: number;
  memory_count: number;
  candidates: SessionStatsCandidate[];
}

export async function getAchievements(sessionId: string): Promise<{
  achievements: Achievement[];
  unlocked_count: number;
  total_count: number;
}> {
  const resp = await request.get('/puzzle/achievements', {
    params: { session_id: sessionId },
  });
  return resp.data;
}

export async function getUserProfile(sessionId: string): Promise<UserProfile> {
  const resp = await request.get<UserProfile>('/puzzle/profile', {
    params: { session_id: sessionId },
  });
  return resp.data;
}

export async function getSessionStats(sessionId: string): Promise<SessionStats> {
  const resp = await request.get<SessionStats>('/memory/session-stats', {
    params: { session_id: sessionId },
  });
  return resp.data;
}
