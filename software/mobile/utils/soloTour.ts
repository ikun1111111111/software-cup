import type {
  GuideIntent,
  GuideMemoryEvent,
  GuideRoute,
  GuideStop,
  UserGuideProfile,
} from '@/types/guide';

export interface SoloRouteRecommendation {
  route: GuideRoute;
  reason: string;
  confidence: number;
  estimatedEnergy: 'low' | 'medium' | 'high';
  companionLine: string;
}

export type SoloDeviationAction =
  | 'continue_original_route'
  | 'explain_current_spot'
  | 'replan_from_here';

export interface SoloCompanionPromptInput {
  level: 'far' | 'near' | 'close' | 'arrived' | 'idle';
  spotName: string;
  distance?: number;
  companionLevel?: UserGuideProfile['companionLevel'];
}

export interface SoloCompanionPrompt {
  text: string;
  emotion: 'neutral' | 'happy' | 'relaxed' | 'surprised';
  delivery: 'voice' | 'subtitle';
  cooldownMs: number;
}

export interface SoloDeviationResult {
  currentSpotId: string;
  suggestedAction: SoloDeviationAction;
  message: string;
}

export interface SoloTourSummary {
  routeName: string;
  visitedSpotNames: string[];
  listenedNarrationCount: number;
  checkinCount: number;
  askedQuestionCount: number;
  dominantInterest: GuideIntent | null;
  nextRecommendation: GuideRoute | null;
}

function estimateEnergy(route: GuideRoute): SoloRouteRecommendation['estimatedEnergy'] {
  if (route.durationMinutes >= 330) return 'high';
  if (route.durationMinutes >= 240) return 'medium';
  return 'low';
}

function scoreRoute(route: GuideRoute, profile: UserGuideProfile): number {
  const interests = new Set(profile.interests);
  let score = 0;

  for (const intent of route.suitableFor) {
    if (interests.has(intent)) score += 4;
  }

  if (profile.groupType === 'solo') score += route.suitableFor.includes('free_walk') ? 5 : 1;
  if (profile.companionLevel === 'quiet' && route.suitableFor.includes('quiet')) score += 5;
  if (profile.narrationDepth === 'deep' && route.suitableFor.includes('deep_explain')) score += 4;
  if (interests.has('photo') && route.suitableFor.includes('photo')) score += 3;
  if (profile.pace === 'slow' && route.durationMinutes > 300) score -= 3;
  if (profile.pace === 'fast' && route.durationMinutes < 240) score -= 1;

  return score;
}

function buildReason(route: GuideRoute, profile: UserGuideProfile): string {
  if (profile.companionLevel === 'quiet' || profile.interests.includes('quiet')) {
    return `${route.name}适合独自慢走和少打扰游览，路线节奏更安静。`;
  }
  if (profile.narrationDepth === 'deep' || profile.interests.includes('deep_explain')) {
    return `${route.name}文化信息更完整，适合一个人慢慢听讲解。`;
  }
  if (profile.interests.includes('photo')) {
    return `${route.name}包含适合拍照打卡的地标节点，小灵会提醒取景点。`;
  }
  return `${route.name}动线清晰，适合由小灵陪你独自完成。`;
}

function buildCompanionLine(profile: UserGuideProfile): string {
  if (profile.companionLevel === 'quiet') return '我会安静陪你走，关键节点再提醒。';
  if (profile.companionLevel === 'active') return '我会多讲一点背景，也会主动帮你安排下一站。';
  return '我会按适中的节奏陪你走，需要时随时叫我。';
}

export function recommendSoloRoute(
  routes: GuideRoute[],
  profile: UserGuideProfile,
): SoloRouteRecommendation {
  const ranked = [...routes].sort((a, b) => scoreRoute(b, profile) - scoreRoute(a, profile));
  const route = ranked[0] ?? routes[0];

  return {
    route,
    reason: buildReason(route, profile),
    confidence: Math.max(0.6, Math.min(0.96, scoreRoute(route, profile) / 16)),
    estimatedEnergy: estimateEnergy(route),
    companionLine: buildCompanionLine(profile),
  };
}

export function soloIntentToProfilePatch(intent: GuideIntent): Partial<UserGuideProfile> {
  if (intent === 'quiet' || intent === 'free_walk') {
    return {
      interests: ['free_walk', 'quiet'],
      companionLevel: 'quiet',
      narrationDepth: 'brief',
    };
  }
  if (intent === 'deep_explain' || intent === 'history') {
    return {
      interests: ['history', 'deep_explain'],
      companionLevel: 'active',
      narrationDepth: 'deep',
    };
  }
  if (intent === 'photo') {
    return {
      interests: ['photo', 'free_walk'],
      companionLevel: 'balanced',
      narrationDepth: 'standard',
    };
  }
  return {
    interests: [intent],
    companionLevel: 'balanced',
  };
}

export function buildSoloCompanionPrompt(input: SoloCompanionPromptInput): SoloCompanionPrompt {
  const distanceText = input.distance != null ? `约${Math.round(input.distance)}米` : '不远';
  const quiet = input.companionLevel === 'quiet';

  if (input.level === 'arrived') {
    return {
      text: `到${input.spotName}了。你可以先自己看看，我也可以现在讲一段。`,
      emotion: 'happy',
      delivery: quiet ? 'subtitle' : 'voice',
      cooldownMs: 45000,
    };
  }

  if (input.level === 'close') {
    return {
      text: `马上到${input.spotName}，到了以后我先给你讲 20 秒重点。`,
      emotion: 'happy',
      delivery: quiet ? 'subtitle' : 'voice',
      cooldownMs: 30000,
    };
  }

  if (input.level === 'near') {
    return {
      text: `${input.spotName}就在前方${distanceText}，我们慢慢靠近。`,
      emotion: 'neutral',
      delivery: quiet ? 'subtitle' : 'voice',
      cooldownMs: 30000,
    };
  }

  if (input.level === 'far') {
    return {
      text: `现在去${input.spotName}，我会看着路线，关键岔口再提醒你。`,
      emotion: 'relaxed',
      delivery: quiet ? 'subtitle' : 'voice',
      cooldownMs: 60000,
    };
  }

  return {
    text: `我在这里陪你，需要路线、讲解或拍照建议时叫我。`,
    emotion: 'neutral',
    delivery: quiet ? 'subtitle' : 'voice',
    cooldownMs: 60000,
  };
}

export function detectSoloDeviation({
  route,
  completedStopIds,
  selectedSpotId,
}: {
  route: GuideRoute | null;
  completedStopIds: string[];
  selectedSpotId: string;
}): SoloDeviationResult | null {
  if (!route) return null;
  const routeStopIds = new Set(route.stops.map((stop) => stop.id));
  const completed = new Set(completedStopIds);
  if (routeStopIds.has(selectedSpotId) && !completed.has(selectedSpotId)) return null;

  return {
    currentSpotId: selectedSpotId,
    suggestedAction: 'explain_current_spot',
    message: '这样走也可以，我帮你把后面的路线顺一下。',
  };
}

export function replanSoloRouteFromSpot({
  route,
  selectedStop,
  completedStopIds,
  profile,
}: {
  route: GuideRoute;
  selectedStop: GuideStop;
  completedStopIds: string[];
  profile: UserGuideProfile;
}): GuideRoute {
  const completed = new Set(completedStopIds);
  const seen = new Set<string>([selectedStop.id]);
  const remainingStops = route.stops
    .filter((stop) => !completed.has(stop.id) && !seen.has(stop.id))
    .slice(0, profile.pace === 'slow' ? 2 : 3);
  const stops = [selectedStop, ...remainingStops];
  const durationMinutes = stops.reduce((sum, stop) => sum + stop.recommendedStayMinutes, 0);

  return {
    ...route,
    id: `${route.id}-solo-replan-${selectedStop.id}`,
    name: `小灵独游顺路线：${selectedStop.name}`,
    durationMinutes,
    description: `从${selectedStop.name}开始，保留你还没走过的重点节点。`,
    openingLine: `这样走也可以，我从${selectedStop.name}重新帮你顺路线。`,
    stops,
  };
}

export function buildSoloTourSummary({
  route,
  memoryEvents,
  nextRecommendation,
}: {
  route: GuideRoute | null;
  memoryEvents: GuideMemoryEvent[];
  nextRecommendation?: GuideRoute | null;
}): SoloTourSummary {
  const checkins = memoryEvents.filter((event) => event.type === 'checkin');
  const narrations = memoryEvents.filter((event) => event.type === 'narration');
  const questions = memoryEvents.filter((event) => event.type === 'ask');
  const stopNames = checkins
    .map((event) => event.title.replace(/打卡完成$/, ''))
    .filter(Boolean);
  const interestCounts = new Map<GuideIntent, number>();

  for (const intent of route?.suitableFor ?? []) {
    interestCounts.set(intent, (interestCounts.get(intent) ?? 0) + 1);
  }

  const dominantInterest = Array.from(interestCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    routeName: route?.name ?? '独自游览',
    visitedSpotNames: stopNames,
    listenedNarrationCount: narrations.length,
    checkinCount: checkins.length,
    askedQuestionCount: questions.length,
    dominantInterest,
    nextRecommendation: nextRecommendation ?? null,
  };
}
