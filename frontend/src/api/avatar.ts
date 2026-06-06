import { get, post, put, del } from './request';

export interface AvatarConfig {
  id: string;
  name: string;
  description: string | null;
  modelPath: string | null;
  appearanceJson: Record<string, any> | null;
  voiceId: string | null;
  emotionPresets: Record<string, any> | null;
  welcomeMessage: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  previewUrl: string;
}

// ===== Backend raw types =====
interface RawAvatar {
  id: number;
  name: string;
  description: string | null;
  model_path: string | null;
  appearance_json: Record<string, any> | null;
  voice_id: string | null;
  emotion_presets: Record<string, any> | null;
  welcome_message: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// ===== Helpers =====
const rawToAvatar = (r: RawAvatar): AvatarConfig => ({
  id: String(r.id),
  name: r.name,
  description: r.description,
  modelPath: r.model_path,
  appearanceJson: r.appearance_json,
  voiceId: r.voice_id,
  emotionPresets: r.emotion_presets,
  welcomeMessage: r.welcome_message,
  isActive: r.is_active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ===== Avatar APIs =====
export const getAvatars = async (params?: { page?: number; pageSize?: number }): Promise<{ total: number; page: number; pageSize: number; data: AvatarConfig[] }> => {
  const resp = await get<{ total: number; page: number; page_size: number; items: RawAvatar[] }>('/avatar', params);
  return {
    total: resp.data.total,
    page: resp.data.page,
    pageSize: resp.data.page_size,
    data: resp.data.items.map(rawToAvatar),
  };
};

export const getAvatar = async (id: string): Promise<AvatarConfig> => {
  const resp = await get<RawAvatar>(`/avatar/${id}`);
  return rawToAvatar(resp.data);
};

export const getActiveAvatar = async (): Promise<AvatarConfig> => {
  const resp = await get<RawAvatar>('/avatar/active');
  return rawToAvatar(resp.data);
};

export const createAvatar = async (data: { name: string; description?: string; modelPath?: string; appearanceJson?: Record<string, any>; voiceId?: string; emotionPresets?: Record<string, any>; welcomeMessage?: string }): Promise<AvatarConfig> => {
  const payload: any = { name: data.name };
  if (data.description !== undefined) payload.description = data.description;
  if (data.modelPath !== undefined) payload.model_path = data.modelPath;
  if (data.appearanceJson !== undefined) payload.appearance_json = data.appearanceJson;
  if (data.voiceId !== undefined) payload.voice_id = data.voiceId;
  if (data.emotionPresets !== undefined) payload.emotion_presets = data.emotionPresets;
  if (data.welcomeMessage !== undefined) payload.welcome_message = data.welcomeMessage;

  const resp = await post<RawAvatar>('/avatar', payload);
  return rawToAvatar(resp.data);
};

export const updateAvatar = async (id: string, data: Partial<Omit<AvatarConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AvatarConfig> => {
  const payload: any = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.modelPath !== undefined) payload.model_path = data.modelPath;
  if (data.appearanceJson !== undefined) payload.appearance_json = data.appearanceJson;
  if (data.voiceId !== undefined) payload.voice_id = data.voiceId;
  if (data.emotionPresets !== undefined) payload.emotion_presets = data.emotionPresets;
  if (data.welcomeMessage !== undefined) payload.welcome_message = data.welcomeMessage;

  const resp = await put<RawAvatar>(`/avatar/${id}`, payload);
  return rawToAvatar(resp.data);
};

export const deleteAvatar = async (id: string): Promise<void> => {
  await del(`/avatar/${id}`);
};

export const activateAvatar = async (id: string): Promise<{ status: string; avatarId: number }> => {
  const resp = await post<{ status: string; avatar_id: number }>(`/avatar/${id}/activate`);
  return { status: resp.data.status, avatarId: resp.data.avatar_id };
};
