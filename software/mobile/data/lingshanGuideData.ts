import { LINGSHAN_SPOTS, type LingshanSpot } from '@/data/lingshanSpots';
import { LINGSHAN_ROUTES } from '@/data/lingshanRoutes';
import type {
  GuideIntent,
  GuideNarrationScript,
  GuideRoute,
  GuideStop,
  UserGuideProfile,
} from '@/types/guide';
import { recommendSoloRoute, type SoloRouteRecommendation } from '@/utils/soloTour';

export const GUIDE_DATA_SOURCE_SUMMARY = {
  behaviorRows: 140447,
  touristCount: 50000,
  attractionCount: 152,
  averageSatisfaction: 3.72,
  medianStayHours: 3.7,
  sources: [
    'docs/景点景区旅游数据行为分析数据.xlsx',
    'docs/灵山胜境 景点结构化数据集.docx',
    'docs/灵山胜境：历史、文化、景点特色与个性化游览指南.docx',
  ],
};

export const DEFAULT_USER_GUIDE_PROFILE: UserGuideProfile = {
  interests: ['history', 'free_walk'],
  pace: 'normal',
  groupType: 'solo',
  budgetLevel: 'medium',
  narrationDepth: 'standard',
  autoNarrate: true,
  companionLevel: 'balanced',
  safetyReminder: true,
};

const GUIDE_STOP_OVERRIDES: Record<string, Partial<GuideStop>> = {
  'ling-shan-da-zhao-bi': {
    guideLine: '我们先在大照壁定一个起点，小灵会用这里帮你把灵山的空间顺序串起来。',
    recommendedStayMinutes: 12,
    checkinRequired: false,
  },
  'wu-zhi-men': {
    guideLine: '穿过五智门，游线会从“入园”切换到“礼佛”，这里很适合放慢脚步。',
    recommendedStayMinutes: 12,
    checkinRequired: false,
  },
  'jiu-long-guan-yu': {
    guideLine: '如果时间刚好，我们会在表演前 10 分钟到达，先占位再听故事。',
    recommendedStayMinutes: 30,
    narrationScriptId: 'script-jiu-long-guan-yu',
    checkinRequired: true,
  },
  'fo-shou-guang-chang': {
    guideLine: '这里适合拍一张“到灵山”的照片，也适合做一次轻打卡。',
    recommendedStayMinutes: 20,
    checkinRequired: true,
  },
  'ling-shan-da-fo': {
    guideLine: '这一站是整段导览的主峰，小灵会先讲造像，再带你看台阶和太湖视野。',
    recommendedStayMinutes: 55,
    narrationScriptId: 'script-ling-shan-da-fo',
    checkinRequired: true,
  },
  'xiang-fu-chan-si': {
    guideLine: '到了禅寺，我们把音量降下来，让讲解变成更安静的陪伴。',
    recommendedStayMinutes: 35,
    narrationScriptId: 'script-xiang-fu-chan-si',
    checkinRequired: false,
  },
  'fan-gong': {
    guideLine: '梵宫这一站我会带你看“建筑如何讲故事”，不是只看金色大厅。',
    recommendedStayMinutes: 65,
    narrationScriptId: 'script-fan-gong',
    checkinRequired: true,
  },
  'wu-yin-tan-cheng': {
    guideLine: '这一站我会把复杂的坛城讲成一张“可以走进去的宇宙地图”。',
    recommendedStayMinutes: 45,
    narrationScriptId: 'script-wu-yin-tan-cheng',
    checkinRequired: true,
  },
  'pu-ti-da-dao': {
    guideLine: '这里不用赶路，小灵会把讲解变短，把更多时间留给你看树影。',
    recommendedStayMinutes: 25,
    checkinRequired: false,
  },
  'bai-zi-xi-mi-le': {
    guideLine: '这站我会换成更轻松的讲法，让孩子也能听懂弥勒为什么总在笑。',
    recommendedStayMinutes: 20,
    checkinRequired: true,
  },
};

function toGuideStop(spot: LingshanSpot): GuideStop {
  const override = GUIDE_STOP_OVERRIDES[spot.id] ?? {};
  return {
    id: spot.id,
    name: spot.name,
    type: spot.category,
    overview: spot.overview,
    guideLine: override.guideLine ?? `${spot.name}到了，我会用这处景点串起灵山的故事。`,
    location: spot.latitude != null && spot.longitude != null
      ? { latitude: spot.latitude, longitude: spot.longitude }
      : undefined,
    recommendedStayMinutes: override.recommendedStayMinutes ?? (spot.category === '核心景点' ? 35 : 20),
    culturalTags: spot.tags ?? [],
    narrationScriptId: override.narrationScriptId,
    checkinRequired: override.checkinRequired ?? spot.category === '核心景点',
  };
}

export const LINGSHAN_GUIDE_STOPS: GuideStop[] = LINGSHAN_SPOTS.map(toGuideStop);

const byId = Object.fromEntries(LINGSHAN_GUIDE_STOPS.map((item) => [item.id, item]));

function routeStops(ids: string[]): GuideStop[] {
  return ids.map((id) => byId[id]).filter(Boolean);
}

export const LINGSHAN_GUIDE_ROUTES: GuideRoute[] = [
  ...LINGSHAN_ROUTES.map((route) => ({
    id: route.id,
    name: route.name,
    theme: route.theme,
    durationMinutes: route.durationMinutes,
    description: route.description,
    suitableFor: route.suitableFor,
    openingLine: route.openingLine,
    stops: routeStops(route.spot_order),
  })),
];

export const GUIDE_NARRATION_SCRIPTS: GuideNarrationScript[] = [
  {
    id: 'script-ling-shan-da-fo',
    stopId: 'ling-shan-da-fo',
    title: '88米大佛与灵山主峰',
    brief: '灵山大佛高 88 米，是景区最核心的视觉地标，也是礼佛动线的高潮。',
    deepDive: '从九龙灌浴到佛手广场，再到大佛脚下，空间节奏逐步抬升。大佛不只是一个拍照点，它把太湖山水、现代造像和礼佛仪式组织成一次完整抵达。',
    familyVersion: '你可以把大佛想成灵山最高的“守护者”。我们一路走到这里，就是来和这位大朋友打招呼。',
    source: '灵山胜境结构化数据与个性化游览指南',
  },
  {
    id: 'script-fan-gong',
    stopId: 'fan-gong',
    title: '梵宫里的佛教艺术',
    brief: '梵宫是佛教艺术综合建筑，适合观察穹顶、木雕、壁画和空间仪式感。',
    deepDive: '梵宫的看点不只在“金碧辉煌”，而在多种传统工艺如何协作：木雕给空间以纹理，壁画给故事以时间，穹顶则把视线引向更高处。',
    familyVersion: '梵宫像一座会发光的故事宫殿。我们进去后可以找一找：墙上、屋顶上、柱子上分别藏着什么图案。',
    source: '灵山胜境结构化数据与个性化游览指南',
  },
  {
    id: 'script-jiu-long-guan-yu',
    stopId: 'jiu-long-guan-yu',
    title: '九龙灌浴与佛陀诞生',
    brief: '九龙灌浴用动态群雕和音乐喷泉讲述释迦牟尼诞生传说。',
    deepDive: '这里适合在表演开始前先讲故事，再让游客看水、音乐和雕塑如何一起完成叙事。它也是亲子游客满意度较高的互动型节点。',
    familyVersion: '一会儿你会看到九龙喷水，就像九条龙在欢迎小王子出生。看完表演，我们可以聊聊为什么大家会把水和祝福放在一起。',
    source: '灵山胜境结构化数据与行为数据洞察',
  },
  {
    id: 'script-wu-yin-tan-cheng',
    stopId: 'wu-yin-tan-cheng',
    title: '走进坛城宇宙观',
    brief: '五印坛城体现藏传佛教空间观念，可以从五方佛和转经体验切入。',
    deepDive: '坛城不是普通建筑平面，而是一种象征性的宇宙秩序。游客沿空间行走时，也是在按某种精神地图移动。',
    familyVersion: '我们可以把坛城想成一张立起来的地图，每一层、每一个方向都有自己的含义。',
    source: '灵山胜境结构化数据集',
  },
  {
    id: 'script-xiang-fu-chan-si',
    stopId: 'xiang-fu-chan-si',
    title: '祥符禅寺的安静段落',
    brief: '祥符禅寺适合放慢节奏，讲寺院礼仪和灵山历史文脉。',
    deepDive: '在整条游线中，禅寺承担“收声”的作用。它不是最热闹的节点，却能让游客从观赏切换到体会。',
    familyVersion: '到寺院里我们要把声音放小一点，像进入图书馆一样，用安静来表示尊重。',
    source: '灵山胜境历史文化指南',
  },
];

export function getGuideStopById(id: string): GuideStop | undefined {
  return byId[id];
}

export function getGuideRouteById(id: string): GuideRoute | undefined {
  return LINGSHAN_GUIDE_ROUTES.find((route) => route.id === id);
}

export function getNarrationScriptByStopId(stopId: string): GuideNarrationScript | undefined {
  return GUIDE_NARRATION_SCRIPTS.find((script) => script.stopId === stopId);
}

export function getDefaultGuideRoute(intent?: GuideIntent): GuideRoute {
  if (intent === 'family') return LINGSHAN_GUIDE_ROUTES[2];
  if (intent === 'nature' || intent === 'quiet' || intent === 'free_walk') return LINGSHAN_GUIDE_ROUTES[1];
  return LINGSHAN_GUIDE_ROUTES[0];
}

export function getSoloRouteRecommendation(profile: UserGuideProfile): SoloRouteRecommendation {
  return recommendSoloRoute(LINGSHAN_GUIDE_ROUTES, profile);
}

export function formatRouteDuration(minutes: number): string {
  if (minutes < 60) return `约${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `约${hours}小时${rest}分钟` : `约${hours}小时`;
}
