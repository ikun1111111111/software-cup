import request from './request';

export interface TimelineEvent {
  era: string;
  year: string;
  event: string;
  description: string;
  spot: string;
}

export interface TimelineResponse {
  total_events: number;
  eras: string[];
  events: TimelineEvent[];
}

export interface TodayCard {
  month: number;
  day: number;
  title: string;
  year_ago: string;
  description: string;
}

export const getTimeline = (spotName?: string) => {
  const params = spotName ? { spot_name: spotName } : {};
  return request.get<TimelineResponse>('/history/timeline', { params });
};

export const getTodayInHistory = () => {
  return request.get<{ card: TodayCard; match: string }>('/history/today');
};

export const roleplay = (era: string, spotName: string, question?: string) => {
  return request.post('/history/roleplay', { era, spot_name: spotName, question: question || '' });
};

export const translateText = (text: string) => {
  return request.post<{ original: string; classical: string; note?: string }>('/history/translate', { text });
};
