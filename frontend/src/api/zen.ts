import request from './request';

export interface MeditationScript {
  spot_name: string;
  script: string;
  source: string;
  duration_seconds: number;
}

export interface SoundMapSpot {
  sounds: string[];
  description: string;
  ambient: string;
}

export const getMeditationScript = (spotName: string) => {
  return request.post<MeditationScript>('/zen/meditation-script', { spot_name: spotName });
};

export const getZenReport = (spots: string[], meditationCount = 0, soundSessions = 0) => {
  return request.get('/zen/report', {
    params: {
      spots: spots.join(','),
      meditation_count: meditationCount,
      sound_sessions: soundSessions,
    },
  });
};

export const getSoundMap = (spotName?: string) => {
  const params = spotName ? { spot_name: spotName } : {};
  return request.get('/zen/sound-map', { params });
};
