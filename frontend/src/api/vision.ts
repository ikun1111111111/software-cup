import request from './request';

export interface VisionResult {
  spot_name: string;
  confidence: number;
  description: string;
  knowledge_chunks: { text: string; score: number }[];
  explanation: string;
  latency_ms: number;
}

export interface IdentifyOnlyResult {
  spot_name: string;
  confidence: number;
  description: string;
  raw_response: string;
  latency_ms: number;
}

/**
 * Upload an image for full scenic spot identification + RAG explanation.
 */
export async function identifySpot(imageFile: File): Promise<VisionResult> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await request.post<VisionResult>('/vision/identify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // Vision API may take longer
  });

  return (response as any).data;
}

/**
 * Upload an image for identification only (no RAG lookup).
 */
export async function identifySpotOnly(imageFile: File): Promise<IdentifyOnlyResult> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await request.post<IdentifyOnlyResult>('/vision/identify-only', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });

  return (response as any).data;
}
