import type { TourRoute, TourRouteDetail } from '../api/routes';
import { getDemoRouteById, getDemoRoutes } from '../utils/localDemoData';

export const OFFLINE_DEMO_NOTICE = '已切换灵山本地导览数据，核心导览流程可继续使用。';

export const OFFLINE_DEMO_ROUTES: TourRoute[] = getDemoRoutes() as unknown as TourRoute[];

export const OFFLINE_DEMO_ROUTE_DETAILS: Record<string, TourRouteDetail> = Object.fromEntries(
  OFFLINE_DEMO_ROUTES
    .map((route) => getDemoRouteById(route.id) as unknown as TourRouteDetail | null)
    .filter(Boolean)
    .map((detail) => [detail!.id, detail!]),
);

export function getOfflineDemoRoutes(routeType?: string): TourRoute[] {
  if (!routeType) return OFFLINE_DEMO_ROUTES;
  return OFFLINE_DEMO_ROUTES.filter((route) => route.route_type === routeType);
}

export function getOfflineDemoRouteDetail(routeId: string): TourRouteDetail | null {
  return OFFLINE_DEMO_ROUTE_DETAILS[routeId] ?? null;
}

export function isOfflineDemoRoute(routeId: string): boolean {
  return routeId in OFFLINE_DEMO_ROUTE_DETAILS;
}
