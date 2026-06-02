import request from './request';

export interface SentimentData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface DashboardMetrics {
  totalVisitors: number;
  activeSessions: number;
  avgSentiment: number;
  satisfactionRate: number;
}

export interface HotQuestion {
  id: string;
  question: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Report {
  id: string;
  title: string;
  date: string;
  summary: string;
  metrics: DashboardMetrics;
}

export const getSentimentData = (params?: { startDate?: string; endDate?: string }): Promise<SentimentData[]> => {
  return request.get('/api/analytics/sentiment', params);
};

export const getReport = (): Promise<Report> => {
  return request.get('/api/analytics/report');
};

export const getDashboardMetrics = (): Promise<DashboardMetrics> => {
  return request.get('/api/analytics/metrics');
};

export const getHotQuestions = (): Promise<HotQuestion[]> => {
  return request.get('/api/analytics/hot-questions');
};

export const subscribeRealtime = (callback: (data: DashboardMetrics) => void): (() => void) => {
  // 模拟实时数据订阅
  const interval = setInterval(() => {
    callback({
      totalVisitors: Math.floor(Math.random() * 1000),
      activeSessions: Math.floor(Math.random() * 100),
      avgSentiment: Math.random() * 5,
      satisfactionRate: 0.8 + Math.random() * 0.2,
    });
  }, 5000);

  return () => clearInterval(interval);
};
