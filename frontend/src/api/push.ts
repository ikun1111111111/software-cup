import request from './request';

export interface PushNotification {
  spot_name: string;
  brief: string;
  action_hint: string;
  timestamp: number;
}

export interface PushActionResult {
  action: string;
  spot_name: string;
  narration?: string;
  emotion?: string;
  message?: string;
}

export async function checkLocation(userId: string, lat: number, lng: number): Promise<{ triggered: boolean; notification?: PushNotification }> {
  const response = await request.post('/push/check-location', {
    user_id: userId,
    lat,
    lng,
  }, { silent: true } as any);
  return (response as any).data;
}

export async function handlePushAction(spotName: string, action: 'listen' | 'navigate' | 'ignore'): Promise<PushActionResult> {
  const response = await request.post<PushActionResult>('/push/action', {
    spot_name: spotName,
    action,
  });
  return (response as any).data;
}
