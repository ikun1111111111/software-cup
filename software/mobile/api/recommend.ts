import { get } from './request';
import { DEMO_MODE } from './config';

export interface ScenicRecommendItem {
  rank: number;
  spot_name: string;
  category: string;
  reason: string;
  suggested_duration: string;
  tags: string[];
  source: string;
}

export interface ScenicRecommendResponse {
  session_id: string;
  recommendations: ScenicRecommendItem[];
  strategy: string;
  cached?: boolean;
}

export async function getScenicSpotRecommendations(
  sessionId: string,
  limit = 5,
): Promise<ScenicRecommendResponse | null> {
  if (DEMO_MODE) return null;

  const resp = await get<ScenicRecommendResponse>(
    '/recommend',
    { session_id: sessionId, limit },
    { retries: 1, timeout: 5000 },
  );
  return resp.data;
}
