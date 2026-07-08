import { get, getCached, invalidateGetCache, post } from './request';

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

export interface MobileEventCount {
  eventName: string;
  count: number;
}

export interface MobileRouteCount {
  routeId: string | null;
  routeName: string | null;
  count: number;
}

export interface MobileSpotCount {
  spotId: string | null;
  spotName: string | null;
  count: number;
}

export interface MobileTourSummary {
  days: number;
  totalEvents: number;
  eventCounts: MobileEventCount[];
  topRoutes: MobileRouteCount[];
  topSpots: MobileSpotCount[];
}

export interface MobileRecentEvent {
  id: number;
  sessionId: string;
  eventName: string;
  routeId: string | null;
  routeName: string | null;
  spotId: string | null;
  spotName: string | null;
  sourcePage: string | null;
  durationMs: number | null;
  latencyMs: number | null;
  completed: boolean;
  createdAt: string | null;
}

export interface MobileTourEventPayload {
  sessionId?: string;
  eventName: string;
  routeId?: string | null;
  routeName?: string | null;
  spotId?: string | null;
  spotName?: string | null;
  sourcePage?: string;
  durationMs?: number | null;
  completed?: boolean;
  metadata?: Record<string, any>;
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
  const resp = await getCached<{
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
  }>('/analytics/trends', { days }, 30000);
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
  const resp = await getCached<{
    questions: Array<{ question: string; count: number; source: string }>;
  }>('/analytics/top_questions', { limit }, 30000);
  return resp.data.questions.map((q) => ({
    question: q.question,
    count: q.count,
    source: q.source,
  }));
};

export const getOverview = async (params?: { startDate?: string; endDate?: string }): Promise<OverviewMetrics> => {
  const resp = await getCached<{
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
  }, 15000);
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

export const triggerReport = async (params?: { startDate?: string; endDate?: string; days?: number; reportType?: ReportType }): Promise<ReportTriggerResult> => {
  const resp = await post<{ task_id: string; report_id?: number | null; status: string; message: string }>('/analytics/report', undefined, {
    params: {
      start_date: params?.startDate,
      end_date: params?.endDate,
      days: params?.days ?? 7,
      report_type: params?.reportType ?? 'sentiment',
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
  invalidateGetCache((key) => key.includes('/analytics/reports'));
  return {
    reportId: resp.data.report_id,
    taskId: resp.data.task_id,
    status: resp.data.status,
    message: resp.data.message,
  };
};

export const getLatestReportArchive = async (reportType: ReportType): Promise<ReportArchive | null> => {
  const resp = await getCached<{ report: any | null }>(
    '/analytics/reports/latest',
    { report_type: reportType },
    15000,
  );
  return resp.data.report ? mapReportArchive(resp.data.report) : null;
};

export const listReportArchives = async (params?: {
  reportType?: ReportType;
  status?: ReportArchiveStatus;
  page?: number;
  pageSize?: number;
}): Promise<ReportArchiveListResult> => {
  const resp = await getCached<{
    total: number;
    page: number;
    page_size: number;
    items: any[];
  }>('/analytics/reports', {
    report_type: params?.reportType,
    status: params?.status,
    page: params?.page ?? 1,
    page_size: params?.pageSize ?? 20,
  }, 10000);
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
  const resp = await getCached<{
    recent: RealtimeLogItem[];
  }>('/analytics/realtime', { limit }, 10000);
  return resp.data.recent;
};

export const getHeatmap = async (): Promise<HeatmapItem[]> => {
  const resp = await getCached<{
    data: HeatmapItem[];
  }>('/analytics/heatmap', undefined, 60000);
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

export const getMobileTourSummary = async (days = 7): Promise<MobileTourSummary> => {
  const resp = await getCached<{
    days: number;
    total_events: number;
    event_counts: Array<{ event_name: string; count: number }>;
    top_routes: Array<{ route_id: string | null; route_name: string | null; count: number }>;
    top_spots: Array<{ spot_id: string | null; spot_name: string | null; count: number }>;
  }>('/analytics/mobile-tour-summary', { days }, 15000);
  return {
    days: resp.data.days,
    totalEvents: resp.data.total_events,
    eventCounts: resp.data.event_counts.map((item) => ({
      eventName: item.event_name,
      count: item.count,
    })),
    topRoutes: resp.data.top_routes.map((item) => ({
      routeId: item.route_id,
      routeName: item.route_name,
      count: item.count,
    })),
    topSpots: resp.data.top_spots.map((item) => ({
      spotId: item.spot_id,
      spotName: item.spot_name,
      count: item.count,
    })),
  };
};

export const recordMobileTourEvent = async (payload: MobileTourEventPayload): Promise<void> => {
  await post('/analytics/mobile-events', {
    session_id: payload.sessionId,
    event_name: payload.eventName,
    route_id: payload.routeId,
    route_name: payload.routeName,
    spot_id: payload.spotId,
    spot_name: payload.spotName,
    source_page: payload.sourcePage,
    duration_ms: payload.durationMs,
    completed: payload.completed,
    metadata: payload.metadata,
  });
  invalidateGetCache((key) => key.includes('/analytics/mobile-'));
};

export const getRecentMobileEvents = async (limit = 20): Promise<MobileRecentEvent[]> => {
  const resp = await getCached<{
    recent: Array<{
      id: number;
      session_id: string;
      event_name: string;
      route_id: string | null;
      route_name: string | null;
      spot_id: string | null;
      spot_name: string | null;
      source_page: string | null;
      duration_ms: number | null;
      latency_ms: number | null;
      completed: boolean;
      created_at: string | null;
    }>;
  }>('/analytics/mobile-events/recent', { limit }, 10000);
  return resp.data.recent.map((item) => ({
    id: item.id,
    sessionId: item.session_id,
    eventName: item.event_name,
    routeId: item.route_id,
    routeName: item.route_name,
    spotId: item.spot_id,
    spotName: item.spot_name,
    sourcePage: item.source_page,
    durationMs: item.duration_ms,
    latencyMs: item.latency_ms,
    completed: item.completed,
    createdAt: item.created_at,
  }));
};
