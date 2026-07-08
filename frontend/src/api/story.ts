import request from './request';
import type { Emotion } from '../components/DigitalHuman/EmotionController';

export interface StoryAct {
  id: string;
  title: string;
  narration: string;
  emotion: Emotion;
  act_image?: string;
  prompt_hint?: string;
}

export interface StoryResult {
  spot_id: string;
  spot_name: string;
  description: string;
  acts: StoryAct[];
}

export async function getStory(spotId: string, options?: { timeoutMs?: number }): Promise<StoryResult> {
  const response = await request.get<StoryResult>(
    `/story/${encodeURIComponent(spotId)}`,
    { timeout: options?.timeoutMs ?? 10000 },
  );
  return (response as any).data;
}
