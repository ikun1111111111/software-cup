import { LINGSHAN_SPOTS } from '@/data/lingshanSpots';
import {
  getRouteSpotDetails,
  getRouteSpotNames,
  LINGSHAN_ROUTES,
} from '@/data/lingshanRoutes';

export interface DemoSpotDetail {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  qr_code: string | null;
  latitude: number | null;
  longitude: number | null;
  detail: string;
  related_spots: string[] | null;
}

export interface DemoRouteDetail {
  id: string;
  name: string;
  route_type: string;
  duration: string;
  description: string;
  gradient: string | null;
  spot_order: string[];
  spot_names: Array<{ id: string; name: string }>;
  spot_details: Record<string, { name: string; 讲解重点: string[]; 特色体验: string[] }>;
}

const DEMO_SPOTS: DemoSpotDetail[] = LINGSHAN_SPOTS;

const DEMO_ROUTES: DemoRouteDetail[] = LINGSHAN_ROUTES.map((route) => ({
  id: route.id,
  name: route.name,
  route_type: route.route_type,
  duration: route.duration,
  description: route.description,
  gradient: route.gradient,
  spot_order: [...route.spot_order],
  spot_names: getRouteSpotNames(route.spot_order),
  spot_details: getRouteSpotDetails(route.spot_order),
}));

export function getDemoRoutes(routeType?: string): DemoRouteDetail[] {
  return DEMO_ROUTES
    .filter((route) => !routeType || route.route_type === routeType)
    .map((route) => ({ ...route, spot_order: [...route.spot_order], spot_names: [...route.spot_names], spot_details: { ...route.spot_details } }));
}

export function getDemoRouteById(id: string): DemoRouteDetail | null {
  return getDemoRoutes().find((route) => route.id === id) ?? null;
}

export function getDemoSpots(category?: string): DemoSpotDetail[] {
  return DEMO_SPOTS
    .filter((spot) => !category || spot.category === category)
    .map((spot) => ({ ...spot, tags: spot.tags ? [...spot.tags] : null, related_spots: spot.related_spots ? [...spot.related_spots] : null }));
}

export function getDemoSpotById(id: string): DemoSpotDetail | null {
  return getDemoSpots().find((spot) => spot.id === id) ?? null;
}
