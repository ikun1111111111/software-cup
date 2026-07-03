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
  reportId?: number | null;
  status: string;
  message: string;
}

export interface ReportStatusResult {
  taskId: string;
  reportId?: number | null;
  status: string;
  content: string | null;
  period: string | null;
  generatedAt: string | null;
}

export type ReportType = 'sentiment' | 'marketing';
export type ReportArchiveStatus = 'queued' | 'running' | 'done' | 'failed';

export interface ReportArchive {
  id: number;
  taskId: string | null;
  reportType: ReportType;
  title: string;
  content: string | null;
  stats: Record<string, any> | null;
  periodStart: string | null;
  periodEnd: string | null;
  periodText: string | null;
  status: ReportArchiveStatus;
  triggerSource: 'manual' | 'scheduled' | string;
  scheduleDate: string | null;
  errorMessage: string | null;
  generatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReportArchiveListResult {
  total: number;
  page: number;
  pageSize: number;
  items: ReportArchive[];
}

export interface ReportArchiveGenerateResult {
  reportId: number;
  taskId: string;
  status: ReportArchiveStatus;
  message: string;
}

const mapReportArchive = (item: any): ReportArchive => ({
  id: item.id,
  taskId: item.task_id ?? null,
  reportType: item.report_type,
  title: item.title,
  content: item.content ?? null,
  stats: item.stats ?? null,
  periodStart: item.period_start ?? null,
  periodEnd: item.period_end ?? null,
  periodText: item.period_text ?? null,
  status: item.status,
  triggerSource: item.trigger_source,
  scheduleDate: item.schedule_date ?? null,
  errorMessage: item.error_message ?? null,
  generatedAt: item.generated_at ?? null,
  startedAt: item.started_at ?? null,
  completedAt: item.completed_at ?? null,
  createdAt: item.created_at ?? null,
  updatedAt: item.updated_at ?? null,
});

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
  const resp = await post<{ task_id: string; report_id?: number | null; status: string; message: string }>('/analytics/report', undefined, {
    params: {
      start_date: params?.startDate,
      end_date: params?.endDate,
      days: params?.days ?? 7,
      report_type: 'sentiment',
    },
  });
  return {
    taskId: resp.data.task_id,
    reportId: resp.data.report_id ?? null,
    status: resp.data.status,
    message: resp.data.message,
  };
};

export const generateReportArchive = async (params?: {
  reportType?: ReportType;
  startDate?: string;
  endDate?: string;
  days?: number;
}): Promise<ReportArchiveGenerateResult> => {
  const resp = await post<{
    report_id: number;
    task_id: string;
    status: ReportArchiveStatus;
    message: string;
  }>('/analytics/reports/generate', undefined, {
    params: {
      report_type: params?.reportType ?? 'sentiment',
      start_date: params?.startDate,
      end_date: params?.endDate,
      days: params?.days ?? 7,
    },
  });
  return {
    reportId: resp.data.report_id,
    taskId: resp.data.task_id,
    status: resp.data.status,
    message: resp.data.message,
  };
};

export const getLatestReportArchive = async (reportType: ReportType): Promise<ReportArchive | null> => {
  const resp = await get<{ report: any | null }>('/analytics/reports/latest', { report_type: reportType });
  return resp.data.report ? mapReportArchive(resp.data.report) : null;
};

export const listReportArchives = async (params?: {
  reportType?: ReportType;
  status?: ReportArchiveStatus;
  page?: number;
  pageSize?: number;
}): Promise<ReportArchiveListResult> => {
  const resp = await get<{
    total: number;
    page: number;
    page_size: number;
    items: any[];
  }>('/analytics/reports', {
    report_type: params?.reportType,
    status: params?.status,
    page: params?.page ?? 1,
    page_size: params?.pageSize ?? 20,
  });
  return {
    total: resp.data.total,
    page: resp.data.page,
    pageSize: resp.data.page_size,
    items: resp.data.items.map(mapReportArchive),
  };
};

export const getReportArchive = async (reportId: number): Promise<ReportArchive> => {
  const resp = await get<{ report: any }>(`/analytics/reports/${reportId}`);
  return mapReportArchive(resp.data.report);
};

export const getReportArchiveStatus = async (reportId: number): Promise<ReportArchive> => {
  const resp = await get<{ report: any }>(`/analytics/reports/${reportId}/status`);
  return mapReportArchive(resp.data.report);
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
    report_id?: number | null;
    status: string;
    content: string | null;
    period: string | null;
    generated_at: string | null;
  }>(`/analytics/report/status/${taskId}`);
  const d = resp.data;
  return {
    taskId: d.task_id,
    reportId: d.report_id ?? null,
    status: d.status,
    content: d.content,
    period: d.period,
    generatedAt: d.generated_at,
  };
};
