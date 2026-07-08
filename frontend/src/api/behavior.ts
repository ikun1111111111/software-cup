import { get, getCached, invalidateGetCache, post } from './request';

export interface BehaviorOverview {
  visits: number;
  tourists: number;
  totalCost: number;
  avgCost: number;
  avgSatisfaction: number;
  avgStayDuration: number;
}

export interface ConsumptionBreakdownItem {
  field: string;
  name: string;
  value: number;
  ratio: number;
}

export interface ConsumptionTrendItem {
  month: string;
  visits: number;
  totalCost: number;
  avgCost: number;
}

export interface ConsumptionAnalysis {
  totalCost: number;
  breakdown: ConsumptionBreakdownItem[];
  monthlyTrend: ConsumptionTrendItem[];
}

export interface RoutePreference {
  nodes: Array<{ name: string; value: number }>;
  links: Array<{ source: string; target: string; value: number }>;
  topSpots: Array<{ name: string; visits: number }>;
}

export interface SatisfactionAnalysis {
  distribution: Array<{ score: number; count: number }>;
  byAttraction: Array<{ name: string; visits: number; avgSatisfaction: number }>;
}

export interface MarketingAnalysis {
  persona: {
    label: string;
    avgCost: number;
    avgStayDuration: number;
    avgSatisfaction: number;
  };
  recommendedRoute: { source: string; target: string; value: number } | null;
  riskSpots: Array<{ name: string; visits: number; avgSatisfaction: number }>;
  suggestions: string[];
  report?: {
    content: string;
    period: string;
    generated_at?: string;
  };
  source?: {
    consumption?: ConsumptionAnalysis;
    routePreference?: RoutePreference;
    satisfaction?: SatisfactionAnalysis;
    overview?: BehaviorOverview;
  };
}

export interface BehaviorUploadResult {
  taskId: string;
  status: string;
  strategy: string;
}

export interface BehaviorUploadStatus {
  taskId: string;
  status: string;
  progress: number;
  totalRows?: number;
  inserted?: number;
  skipped?: number;
  errors?: number;
  error?: string;
}

const toOverview = (data: any): BehaviorOverview => ({
  visits: data.visits ?? 0,
  tourists: data.tourists ?? 0,
  totalCost: data.total_cost ?? 0,
  avgCost: data.avg_cost ?? 0,
  avgSatisfaction: data.avg_satisfaction ?? 0,
  avgStayDuration: data.avg_stay_duration ?? 0,
});

export const getBehaviorOverview = async (): Promise<BehaviorOverview> => {
  const resp = await getCached('/behavior/overview', undefined, 60000);
  return toOverview(resp.data);
};

export const getBehaviorConsumption = async (): Promise<ConsumptionAnalysis> => {
  const resp = await getCached('/behavior/consumption', undefined, 60000);
  return {
    totalCost: resp.data.total_cost ?? 0,
    breakdown: (resp.data.breakdown ?? []).map((item: any) => ({
      field: item.field,
      name: item.name,
      value: item.value,
      ratio: item.ratio,
    })),
    monthlyTrend: (resp.data.monthly_trend ?? []).map((item: any) => ({
      month: item.month,
      visits: item.visits,
      totalCost: item.total_cost,
      avgCost: item.avg_cost,
    })),
  };
};

export const getBehaviorRoutePreference = async (): Promise<RoutePreference> => {
  const resp = await getCached('/behavior/route-preference', undefined, 60000);
  return {
    nodes: resp.data.nodes ?? [],
    links: resp.data.links ?? [],
    topSpots: (resp.data.top_spots ?? []).map((item: any) => ({
      name: item.name,
      visits: item.visits,
    })),
  };
};

export const getBehaviorSatisfaction = async (): Promise<SatisfactionAnalysis> => {
  const resp = await getCached('/behavior/satisfaction', undefined, 60000);
  return {
    distribution: resp.data.distribution ?? [],
    byAttraction: (resp.data.by_attraction ?? []).map((item: any) => ({
      name: item.name,
      visits: item.visits,
      avgSatisfaction: item.avg_satisfaction,
    })),
  };
};

export const getBehaviorMarketing = async (): Promise<MarketingAnalysis> => {
  const resp = await getCached('/behavior/marketing', undefined, 60000);
  const data = resp.data;
  return {
    persona: {
      label: data.persona?.label ?? '样本观察中',
      avgCost: data.persona?.avg_cost ?? 0,
      avgStayDuration: data.persona?.avg_stay_duration ?? 0,
      avgSatisfaction: data.persona?.avg_satisfaction ?? 0,
    },
    recommendedRoute: data.recommended_route,
    riskSpots: (data.risk_spots ?? []).map((item: any) => ({
      name: item.name,
      visits: item.visits,
      avgSatisfaction: item.avg_satisfaction,
    })),
    suggestions: data.suggestions ?? [],
    report: data.report,
    source: data.source ? {
      consumption: data.source.consumption ? {
        totalCost: data.source.consumption.total_cost ?? 0,
        breakdown: (data.source.consumption.breakdown ?? []).map((item: any) => ({
          field: item.field,
          name: item.name,
          value: item.value,
          ratio: item.ratio,
        })),
        monthlyTrend: (data.source.consumption.monthly_trend ?? []).map((item: any) => ({
          month: item.month,
          visits: item.visits,
          totalCost: item.total_cost,
          avgCost: item.avg_cost,
        })),
      } : undefined,
      routePreference: data.source.route_preference ? {
        nodes: data.source.route_preference.nodes ?? [],
        links: data.source.route_preference.links ?? [],
        topSpots: (data.source.route_preference.top_spots ?? []).map((item: any) => ({
          name: item.name,
          visits: item.visits,
        })),
      } : undefined,
      satisfaction: data.source.satisfaction ? {
        distribution: data.source.satisfaction.distribution ?? [],
        byAttraction: (data.source.satisfaction.by_attraction ?? []).map((item: any) => ({
          name: item.name,
          visits: item.visits,
          avgSatisfaction: item.avg_satisfaction,
        })),
      } : undefined,
      overview: data.source.overview ? toOverview(data.source.overview) : undefined,
    } : undefined,
  };
};

export const uploadBehaviorData = async (file: File, strategy: 'append' | 'overwrite'): Promise<BehaviorUploadResult> => {
  invalidateGetCache((key) => key.includes('/behavior/'));
  const formData = new FormData();
  formData.append('file', file);
  const resp = await post<{ task_id: string; status: string; strategy: string }>('/behavior/upload', formData, {
    params: { strategy },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return {
    taskId: resp.data.task_id,
    status: resp.data.status,
    strategy: resp.data.strategy,
  };
};

export const getBehaviorUploadStatus = async (taskId: string): Promise<BehaviorUploadStatus> => {
  const resp = await get<any>(`/behavior/upload/status/${taskId}`);
  if (resp.data.status === 'done' || resp.data.status === 'failed') {
    invalidateGetCache((key) => key.includes('/behavior/'));
  }
  return {
    taskId: resp.data.task_id,
    status: resp.data.status,
    progress: resp.data.progress ?? 0,
    totalRows: resp.data.total_rows,
    inserted: resp.data.inserted,
    skipped: resp.data.skipped,
    errors: resp.data.errors,
    error: resp.data.error,
  };
};
