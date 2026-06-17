import { API_BASE_URL } from './config';

export interface VisionResult {
  spot_name: string;
  confidence: number;
  description: string;
  knowledge_chunks: Array<Record<string, any>>;
  explanation: string;
  latency_ms: number;
}

export const identifySpot = async (imageUri: string, mimeType: string = 'image/jpeg'): Promise<VisionResult> => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: mimeType,
    name: 'photo.jpg',
  } as any);

  const resp = await fetch(`${API_BASE_URL}/api/vision/identify`, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: '识别失败' }));
    throw new Error(err.detail || '识别失败');
  }

  return resp.json();
};
