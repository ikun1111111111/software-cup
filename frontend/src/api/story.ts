import request from './request';

export interface StoryResult {
  spot_name: string;
  story: string;
  emotion: string;
  knowledge_chunks: { text: string; score: number }[];
}

/**
 * Get a storytelling narration for a scenic spot.
 */
export async function getStory(spotName: string): Promise<StoryResult> {
  const response = await request.get<StoryResult>(
    `/story/${encodeURIComponent(spotName)}`,
  );
  return (response as any).data;
}
