import { LINGSHAN_SPOTS } from './lingshanSpots';
import type { GuideIntent, GuideRouteTheme } from '@/types/guide';

export interface LingshanRoute {
  id: string;
  name: string;
  route_type: Exclude<GuideRouteTheme, 'free'>;
  theme: Exclude<GuideRouteTheme, 'free'>;
  duration: string;
  durationMinutes: number;
  description: string;
  gradient: string | null;
  spot_order: string[];
  suitableFor: GuideIntent[];
  openingLine: string;
}

export const LINGSHAN_ROUTES: LingshanRoute[] = [
  {
    id: 'lingshan-history-six-hours',
    name: '历史文化深度线',
    route_type: 'history',
    theme: 'history',
    duration: '约6小时',
    durationMinutes: 360,
    description: '从入口仪式到大佛主峰、梵宫与五印坛城，适合想完整理解灵山佛教文化脉络的游客。',
    gradient: '深度',
    suitableFor: ['history', 'deep_explain', 'photo'],
    openingLine: '这条线会把灵山讲成一部从入山、礼佛到艺术殿堂的完整故事。',
    spot_order: [
      'ling-shan-da-zhao-bi',
      'wu-zhi-men',
      'pu-ti-da-dao',
      'jiu-long-guan-yu',
      'xiang-mo-fu-diao',
      'a-yu-wang-zhu',
      'xiang-fu-chan-si',
      'ling-shan-da-fo',
      'fo-jiao-wen-hua-blan-guan',
      'fan-gong',
      'wu-yin-tan-cheng',
    ],
  },
  {
    id: 'lingshan-nature-five-hours',
    name: '自然舒缓观景线',
    route_type: 'nature',
    theme: 'nature',
    duration: '约5小时',
    durationMinutes: 300,
    description: '把佛足坛、菩提大道、大佛、曼飞龙塔和灵山精舍串成节奏更松的观景路线。',
    gradient: '适中',
    suitableFor: ['nature', 'quiet', 'photo', 'free_walk'],
    openingLine: '这条线不急着打满景点，我会把讲解留白，让你多看太湖和树影。',
    spot_order: [
      'fo-zu-tan',
      'jiu-long-guan-yu',
      'pu-ti-da-dao',
      'ling-shan-da-fo',
      'man-fei-long-ta',
      'ling-shan-jing-she',
      'fan-gong',
    ],
  },
  {
    id: 'lingshan-family-four-hours',
    name: '亲子轻松互动线',
    route_type: 'family',
    theme: 'family',
    duration: '约4小时',
    durationMinutes: 240,
    description: '优先选择表演、互动和可休息节点，让孩子也能跟上小灵讲解。',
    gradient: '轻松',
    suitableFor: ['family', 'budget', 'photo'],
    openingLine: '这条线会少讲术语，多讲故事，把每一站变成孩子能参与的发现任务。',
    spot_order: [
      'jiu-long-guan-yu',
      'fo-shou-guang-chang',
      'bai-zi-xi-mi-le',
      'ling-shan-da-fo',
      'fan-gong',
      'wu-yin-tan-cheng',
    ],
  },
];

export const LINGSHAN_ROUTE_IDS = LINGSHAN_ROUTES.map((route) => route.id);

export function getLingshanRouteById(id: string): LingshanRoute | undefined {
  return LINGSHAN_ROUTES.find((route) => route.id === id);
}

export function getLingshanRoutes(routeType?: string): LingshanRoute[] {
  return LINGSHAN_ROUTES.filter((route) => !routeType || route.route_type === routeType);
}

export function getRouteSpotNames(spotOrder: string[]): Array<{ id: string; name: string }> {
  return spotOrder.map((id) => ({
    id,
    name: LINGSHAN_SPOTS.find((spot) => spot.id === id)?.name ?? id,
  }));
}

export function getRouteSpotDetails(
  spotOrder: string[],
): Record<string, { name: string; 讲解重点: string[]; 特色体验: string[] }> {
  return Object.fromEntries(
    spotOrder.map((id) => {
      const spot = LINGSHAN_SPOTS.find((item) => item.id === id);
      return [
        id,
        {
          name: spot?.name ?? id,
          讲解重点: spot ? [spot.overview, spot.detail] : ['演示路线景点'],
          特色体验: spot?.tags ?? ['导览讲解'],
        },
      ];
    }),
  );
}
