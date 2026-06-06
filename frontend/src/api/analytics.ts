import { get, post } from './request';

export interface TrendsItem {
  date: string;
  interactions: number;
  avgSentiment: number;
  avgLatencyMs: number;
  faqHitRate: number;
  positiveRatio: number;
  neutralRatio: number;
  negativeRatio: number;
}

export interface TopQuestionItem {
  question: string;
  count: number;
  source: string;
}

export interface OverviewMetrics {
  totalInteractions: number;
  todayInteractions: number;
  faqHitRate: number;
  avgSentimentScore: number;
  avgLatencyMs: number;
  uniqueSessions: number;
  voiceRatio: number;
}

export interface ReportTriggerResult {
  taskId: string;
  status: string;
  message: string;
}

export interface ReportStatusResult {
  taskId: string;
  status: string;
  content: string | null;
  period: string | null;
  generatedAt: string | null;
}

export const getTrends = async (days?: number): Promise<TrendsItem[]> => {
  const resp = await get<{
    days: number;
    trends: Array<{
      date: string;
      interactions: number;
      avg_sentiment: number;
      avg_latency_ms: number;
      faq_hit_rate: number;
      positive_ratio: number;
      neutral_ratio: number;
      negative_ratio: number;
    }>;
  }>('/analytics/trends', { days });
  return resp.data.trends.map((t) => ({
    date: t.date,
    interactions: t.interactions,
    avgSentiment: t.avg_sentiment,
    avgLatencyMs: t.avg_latency_ms,
    faqHitRate: t.faq_hit_rate,
    positiveRatio: t.positive_ratio,
    neutralRatio: t.neutral_ratio,
    negativeRatio: t.negative_ratio,
  }));
};

export const getTopQuestions = async (limit?: number): Promise<TopQuestionItem[]> => {
  const resp = await get<{
    questions: Array<{ question: string; count: number; source: string }>;
  }>('/analytics/top_questions', { limit });
  return resp.data.questions.map((q) => ({
    question: q.question,
    count: q.count,
    source: q.source,
  }));
};

export const getOverview = async (params?: { startDate?: string; endDate?: string }): Promise<OverviewMetrics> => {
  const resp = await get<{
    total_interactions: number;
    today_interactions: number;
    faq_hit_rate: number;
    avg_sentiment_score: number;
    avg_latency_ms: number;
    unique_sessions: number;
    voice_ratio: number;
  }>('/analytics/overview', {
    start_date: params?.startDate,
    end_date: params?.endDate,
  });
  const d = resp.data;
  return {
    totalInteractions: d.total_interactions,
    todayInteractions: d.today_interactions,
    faqHitRate: d.faq_hit_rate,
    avgSentimentScore: d.avg_sentiment_score,
    avgLatencyMs: d.avg_latency_ms,
    uniqueSessions: d.unique_sessions,
    voiceRatio: d.voice_ratio,
  };
};

export const triggerReport = async (params?: { startDate?: string; endDate?: string; days?: number }): Promise<ReportTriggerResult> => {
  const resp = await post<{ task_id: string; status: string; message: string }>('/analytics/report', undefined, {
    params: {
      start_date: params?.startDate,
      end_date: params?.endDate,
      days: params?.days ?? 7,
    },
  });
  return {
    taskId: resp.data.task_id,
    status: resp.data.status,
    message: resp.data.message,
  };
};

export interface RealtimeLogItem {
  session_id: string;
  question: string;
  answer: string;
  input_type: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  source: string;
  latency_ms: number;
  created_at: string | null;
}

export interface HeatmapItem {
  day_of_week: number;
  hour: number;
  count: number;
}

export const getRealtime = async (limit?: number): Promise<RealtimeLogItem[]> => {
  const resp = await get<{
    recent: RealtimeLogItem[];
  }>('/analytics/realtime', { limit });
  return resp.data.recent;
};

export const getHeatmap = async (): Promise<HeatmapItem[]> => {
  const resp = await get<{
    data: HeatmapItem[];
  }>('/analytics/heatmap');
  return resp.data.data;
};

export const getReportStatus = async (taskId: string): Promise<ReportStatusResult> => {
  const resp = await get<{
    task_id: string;
    status: string;
    content: string | null;
    period: string | null;
    generated_at: string | null;
  }>(`/analytics/report/status/${taskId}`);
  const d = resp.data;
  return {
    taskId: d.task_id,
    status: d.status,
    content: d.content,
    period: d.period,
    generatedAt: d.generated_at,
  };
};
