import request from './request';

export interface AvatarConfig {
  id: string;
  name: string;
  appearance: {
    model: string;
    skin: string;
    hair: string;
    outfit: string;
    accessories: string[];
  };
  voice: {
    id: string;
    name: string;
    language: string;
    gender: string;
  };
  welcomeMessage: string;
  personality: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  previewUrl: string;
}

export const getConfig = (): Promise<AvatarConfig> => {
  return request.get('/api/avatar/config');
};

export const updateConfig = (data: Partial<AvatarConfig>): Promise<AvatarConfig> => {
  return request.put('/api/avatar/config', data);
};

export const getVoices = (): Promise<Voice[]> => {
  return request.get('/api/avatar/voices');
};

export const previewVoice = (voiceId: string): Promise<{ audioUrl: string }> => {
  return request.post(`/api/avatar/voices/${voiceId}/preview`);
};
