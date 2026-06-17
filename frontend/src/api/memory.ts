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

export interface GenerateResponse {
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

export async function generateMemories(sessionId: string): Promise<GenerateResponse> {
  const resp = await request.post<GenerateResponse>('/memory/generate', {
    session_id: sessionId,
  });
  return resp.data;
}

export async function polishMemory(memoryId: number): Promise<TravelMemory> {
  const resp = await request.post<TravelMemory>(`/memory/${memoryId}/polish`);
  return resp.data;
}

export async function generateSummary(sessionId: string): Promise<JourneySummary> {
  const resp = await request.post<JourneySummary>('/memory/summary/generate', {
    session_id: sessionId,
  });
  return resp.data;
}

export async function getLatestSummary(sessionId: string): Promise<JourneySummary | null> {
  const resp = await request.get<JourneySummary | null>('/memory/summary/latest', {
    params: { session_id: sessionId },
  });
  return resp.data;
}
