import request from './request';

export interface TourRoute {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
}

export interface TourRouteDetail extends TourRoute {
  spot_order: string[];
  spot_details: Record<string, { 讲解重点: string[]; 特色体验: string[] }> | null;
}

export const listRoutes = (routeType?: string) => {
  const params = routeType ? { route_type: routeType } : {};
  return request.get<TourRoute[]>('/routes', params);
};

export const getRouteById = (id: string) => {
  return request.get<TourRouteDetail>(`/routes/${id}`);
};
