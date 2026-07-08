export interface FoodPOI {
  id: number;
  name: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  business_hours?: string;
  price_level?: string;
  intro?: string;
  tags?: string[];
}

export interface FoodMapCard {
  type: 'food_map';
  center: { lat: number; lng: number };
  pois: FoodPOI[];
}

export interface RouteSpot {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  thumbnail?: string;
  narration?: string;
}

export interface RouteMapCard {
  type: 'route_map';
  route: {
    id: string;
    name: string;
    route_type: string;
    duration: string;
    description?: string;
    cover_image?: string;
    color?: string;
  };
  spots: RouteSpot[];
}

export interface SpotInfoCard {
  type: 'spot_info';
  spot: {
    id: string;
    name: string;
    category?: string;
    overview?: string;
    detail?: string;
    tags?: string[];
    latitude?: number;
    longitude?: number;
    ticket_info?: string;
    open_time?: string;
    must_see?: string;
    best_time?: string;
    narration?: string;
    thumbnail?: string;
    duration?: string;
  };
}

export interface TicketSpot {
  id: string;
  name: string;
  ticket_info?: string;
  open_time?: string;
  must_see?: string;
  thumbnail?: string;
}

export interface TicketInfoCard {
  type: 'ticket_info';
  spots: TicketSpot[];
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export interface HistoryTimelineCard {
  type: 'timeline';
  events: TimelineEvent[];
}

export interface CultureImageCard {
  type: 'culture_image';
  image?: string;
  title: string;
  description: string;
}

export type ThemeCard =
  | FoodMapCard
  | RouteMapCard
  | SpotInfoCard
  | TicketInfoCard
  | HistoryTimelineCard
  | CultureImageCard;

export type ThemeTopic =
  | 'general'
  | 'history'
  | 'culture'
  | 'route'
  | 'food'
  | 'ticket'
  | 'spot';

export const TOPIC_LABELS: Record<ThemeTopic, string> = {
  general: '随便聊聊',
  history: '历史文化',
  culture: '佛教文化',
  route: '路线推荐',
  food: '想吃点啥',
  ticket: '票务信息',
  spot: '景点介绍',
};

export const TOPIC_ICONS: Record<ThemeTopic, string> = {
  general: '💬',
  history: '📜',
  culture: '🪷',
  route: '🗺️',
  food: '🍜',
  ticket: '🎫',
  spot: '🗿',
};

export function isThemeCard(value: unknown): value is ThemeCard {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}
