import type { TourRoute, TourRouteDetail } from '@/api/routes';
import type { Spot as ApiSpot } from '@/api/spots';
import {
  formatRouteDuration,
  getGuideRouteById,
  LINGSHAN_GUIDE_ROUTES,
  LINGSHAN_GUIDE_STOPS,
} from '@/data/lingshanGuideData';
import type { GuideRoute, GuideStop } from '@/types/guide';
import type { Route as OrchestratorRoute, Spot as OrchestratorSpot } from '@/hooks/useTourOrchestrator';

export const MOCK_GUIDE_SPOTS = LINGSHAN_GUIDE_STOPS;
export const MOCK_GUIDE_ROUTES = LINGSHAN_GUIDE_ROUTES;

export function toApiSpot(stop: GuideStop): ApiSpot {
  return {
    id: stop.id,
    name: stop.name,
    category: stop.type,
    tags: stop.culturalTags,
    overview: stop.overview,
    qr_code: `lingshan://${stop.id}`,
    latitude: stop.location?.latitude ?? null,
    longitude: stop.location?.longitude ?? null,
  };
}

export function toApiRoute(route: GuideRoute): TourRoute & {
  spot_order: string[];
  spot_names: Array<{ id: string; name: string }>;
  spot_details: Record<string, { name: string; 讲解重点: string[]; 特色体验: string[] }>;
} {
  return {
    id: route.id,
    name: route.name,
    route_type: route.theme,
    duration: formatRouteDuration(route.durationMinutes),
    description: route.description,
    gradient: null,
    spot_order: route.stops.map((item) => item.id),
    spot_names: route.stops.map((item) => ({ id: item.id, name: item.name })),
    spot_details: Object.fromEntries(
      route.stops.map((item) => [
        item.id,
        {
          name: item.name,
          讲解重点: item.culturalTags,
          特色体验: [
            item.checkinRequired ? '打卡留念' : '慢游讲解',
            `${item.recommendedStayMinutes}分钟节奏`,
          ],
        },
      ]),
    ),
  };
}

export function toApiRouteDetail(route: GuideRoute): TourRouteDetail {
  const apiRoute = toApiRoute(route);
  return {
    id: apiRoute.id,
    name: apiRoute.name,
    route_type: apiRoute.route_type,
    duration: apiRoute.duration,
    description: apiRoute.description,
    gradient: apiRoute.gradient,
    spot_order: apiRoute.spot_order,
    spot_names: apiRoute.spot_names,
    spot_details: apiRoute.spot_details,
  };
}

export function toTourSpot(stop: GuideStop): OrchestratorSpot {
  return {
    id: stop.id,
    name: stop.name,
    description: stop.guideLine,
    latitude: stop.location?.latitude,
    longitude: stop.location?.longitude,
  };
}

export function toTourRoute(route: GuideRoute): OrchestratorRoute {
  return {
    id: route.id,
    name: route.name,
    description: route.description,
    route_type: route.theme,
    duration: formatRouteDuration(route.durationMinutes),
    spots: route.stops.map(toTourSpot),
  };
}

export function getMockApiSpots(category?: string): ApiSpot[] {
  const spots = LINGSHAN_GUIDE_STOPS.map(toApiSpot);
  return category ? spots.filter((item) => item.category === category) : spots;
}

export function getMockApiRoutes(routeType?: string): TourRoute[] {
  const routes = LINGSHAN_GUIDE_ROUTES
    .filter((route) => !routeType || route.theme === routeType)
    .map(toApiRoute);
  return routes;
}

export function getMockApiRouteDetail(routeId: string): TourRouteDetail | null {
  const route = getGuideRouteById(routeId);
  return route ? toApiRouteDetail(route) : null;
}
