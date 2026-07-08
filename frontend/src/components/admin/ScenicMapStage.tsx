import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TopQuestionItem } from '../../api/analytics';
import type { ConsumptionAnalysis, RoutePreference, SatisfactionAnalysis } from '../../api/behavior';
import type { Spot } from '../../api/spots';

export type MapLayer = 'traffic' | 'questions' | 'satisfaction' | 'route' | 'consumption';

const sceneBaseLayer: MapLayer = 'traffic';

interface ScenicMapStageProps {
  spots: Spot[];
  routePreference?: RoutePreference | null;
  satisfaction?: SatisfactionAnalysis | null;
  consumption?: ConsumptionAnalysis | null;
  topQuestions?: TopQuestionItem[];
  activeLayer: MapLayer;
  height?: React.CSSProperties['height'];
  minHeight?: React.CSSProperties['minHeight'];
  showHeader?: boolean;
  showLegend?: boolean;
  visualMode?: 'panel' | 'embedded';
}

interface MapPoint {
  id: string;
  name: string;
  shortName: string;
  x: number;
  y: number;
  heat: number;
  satisfaction: number;
  visits: number;
  questions: number;
  routeFlow: number;
  consumptionScore: number;
  level: 'core' | 'major' | 'minor';
}

type ThreeModule = typeof import('three');

const LINGSHAN_MODEL_URL = '/models/lingshan/lingshan-scene.glb';
let lingshanModelTemplatePromise: Promise<import('three').Object3D | null> | null = null;

const getAnchorName = (spotId: string) => `spot_${spotId.replace(/-/g, '_')}`;

const layerMeta: Record<MapLayer, { label: string; color: string; description: string; metric: string; scale: string }> = {
  traffic: {
    label: '游客热力',
    color: '#F05A28',
    description: '按服务人次与访问记录识别景区客流聚集区',
    metric: '访问人次',
    scale: '冷清 / 平稳 / 拥挤',
  },
  questions: {
    label: '问答热力',
    color: '#C84B31',
    description: '呈现游客高频咨询集中在景点、讲解与服务区域的位置',
    metric: '提问次数',
    scale: '低频 / 关注 / 高频',
  },
  satisfaction: {
    label: '满意度风险',
    color: '#D39A22',
    description: '满意度偏低的位置会以更强警示提示运营关注',
    metric: '满意评分',
    scale: '良好 / 关注 / 风险',
  },
  route: {
    label: '路线流向',
    color: '#6A9C89',
    description: '展示游客动线偏好与景点间流转趋势',
    metric: '流向节点',
    scale: '起点 / 中继 / 终点',
  },
  consumption: {
    label: '消费偏好',
    color: '#C9A96E',
    description: '叠加餐饮、文创与综合服务的潜在消费机会点',
    metric: '机会指数',
    scale: '弱 / 中 / 强',
  },
};

const defaultPositions: Record<string, { x: number; y: number; shortName: string; level: MapPoint['level'] }> = {
  'ling-shan-da-zhao-bi': { x: 18, y: 74, shortName: '照壁', level: 'minor' },
  'fo-shou-guang-chang': { x: 30, y: 60, shortName: '佛手广场', level: 'major' },
  'bai-zi-xi-mi-le': { x: 31, y: 79, shortName: '百子戏弥勒', level: 'major' },
  'xiang-fu-chan-si': { x: 39, y: 47, shortName: '祥符禅寺', level: 'major' },
  'fan-gong': { x: 43, y: 67, shortName: '梵宫', level: 'core' },
  'pu-ti-da-dao': { x: 49, y: 58, shortName: '菩提大道', level: 'minor' },
  'ling-shan-da-fo': { x: 51, y: 34, shortName: '灵山大佛', level: 'core' },
  'wu-yin-tan-cheng': { x: 58, y: 72, shortName: '五印坛城', level: 'core' },
  'jiu-long-guan-yu': { x: 64, y: 55, shortName: '九龙灌浴', level: 'core' },
  'san-sheng-dian': { x: 71, y: 48, shortName: '三圣殿', level: 'major' },
  'man-fei-long-ta': { x: 73, y: 63, shortName: '曼飞龙塔', level: 'major' },
  'ling-shan-jing-she': { x: 78, y: 78, shortName: '灵山精舍', level: 'major' },
};

const spotProfiles: Record<string, {
  keywords: string[];
  fallbackVisits: number;
  fallbackQuestions: number;
  fallbackSatisfaction: number;
  routeBias: number;
  consumptionBias: number;
}> = {
  'ling-shan-da-zhao-bi': {
    keywords: ['照壁', '入口', '入园', '门票', '停车', '开放时间', '检票'],
    fallbackVisits: 420,
    fallbackQuestions: 26,
    fallbackSatisfaction: 4.16,
    routeBias: 0.58,
    consumptionBias: 0.20,
  },
  'fo-shou-guang-chang': {
    keywords: ['佛手', '广场', '拍照', '祈福', '集合'],
    fallbackVisits: 680,
    fallbackQuestions: 34,
    fallbackSatisfaction: 4.28,
    routeBias: 0.72,
    consumptionBias: 0.46,
  },
  'bai-zi-xi-mi-le': {
    keywords: ['百子戏弥勒', '弥勒', '亲子', '拍照', '儿童'],
    fallbackVisits: 520,
    fallbackQuestions: 24,
    fallbackSatisfaction: 4.34,
    routeBias: 0.46,
    consumptionBias: 0.32,
  },
  'xiang-fu-chan-si': {
    keywords: ['祥符禅寺', '禅寺', '寺庙', '祈福', '香火', '礼佛'],
    fallbackVisits: 610,
    fallbackQuestions: 31,
    fallbackSatisfaction: 4.18,
    routeBias: 0.68,
    consumptionBias: 0.28,
  },
  'fan-gong': {
    keywords: ['梵宫', '吉祥颂', '演出', '宫殿', '室内', '文创'],
    fallbackVisits: 880,
    fallbackQuestions: 45,
    fallbackSatisfaction: 4.02,
    routeBias: 0.88,
    consumptionBias: 0.92,
  },
  'pu-ti-da-dao': {
    keywords: ['菩提大道', '路线', '步行', '主路', '动线'],
    fallbackVisits: 560,
    fallbackQuestions: 18,
    fallbackSatisfaction: 4.20,
    routeBias: 0.64,
    consumptionBias: 0.18,
  },
  'ling-shan-da-fo': {
    keywords: ['灵山大佛', '大佛', '佛像', '抱佛脚', '登顶', '台阶', '祈福'],
    fallbackVisits: 1080,
    fallbackQuestions: 58,
    fallbackSatisfaction: 4.30,
    routeBias: 1,
    consumptionBias: 0.38,
  },
  'wu-yin-tan-cheng': {
    keywords: ['五印坛城', '坛城', '藏传', '文化', '展馆', '文创'],
    fallbackVisits: 760,
    fallbackQuestions: 38,
    fallbackSatisfaction: 4.12,
    routeBias: 0.82,
    consumptionBias: 0.78,
  },
  'jiu-long-guan-yu': {
    keywords: ['九龙灌浴', '九龙', '灌浴', '喷泉', '演出', '时间', '表演'],
    fallbackVisits: 940,
    fallbackQuestions: 52,
    fallbackSatisfaction: 3.92,
    routeBias: 0.92,
    consumptionBias: 0.60,
  },
  'san-sheng-dian': {
    keywords: ['三圣殿', '殿堂', '礼佛', '文化'],
    fallbackVisits: 500,
    fallbackQuestions: 23,
    fallbackSatisfaction: 4.22,
    routeBias: 0.58,
    consumptionBias: 0.24,
  },
  'man-fei-long-ta': {
    keywords: ['曼飞龙塔', '塔', '拍照', '建筑'],
    fallbackVisits: 470,
    fallbackQuestions: 21,
    fallbackSatisfaction: 4.10,
    routeBias: 0.52,
    consumptionBias: 0.30,
  },
  'ling-shan-jing-she': {
    keywords: ['灵山精舍', '精舍', '餐饮', '住宿', '休息', '厕所', '服务'],
    fallbackVisits: 620,
    fallbackQuestions: 30,
    fallbackSatisfaction: 4.05,
    routeBias: 0.62,
    consumptionBias: 1,
  },
};

const consumptionRules: Array<{ keywords: string[]; weights: Record<string, number> }> = [
  {
    keywords: ['餐饮', '美食', '饮品', '素斋', '咖啡'],
    weights: { 'ling-shan-jing-she': 1, 'fan-gong': 0.62, 'jiu-long-guan-yu': 0.45, 'fo-shou-guang-chang': 0.32 },
  },
  {
    keywords: ['文创', '纪念品', '购物', '伴手礼', '香品'],
    weights: { 'fan-gong': 0.95, 'wu-yin-tan-cheng': 0.88, 'fo-shou-guang-chang': 0.56, 'ling-shan-da-zhao-bi': 0.42 },
  },
  {
    keywords: ['演出', '表演', '门票', '体验'],
    weights: { 'jiu-long-guan-yu': 1, 'fan-gong': 0.84, 'wu-yin-tan-cheng': 0.42 },
  },
  {
    keywords: ['住宿', '休闲', '服务', '停留'],
    weights: { 'ling-shan-jing-she': 1, 'bai-zi-xi-mi-le': 0.34, 'xiang-fu-chan-si': 0.28 },
  },
];

const fallbackSpots: Spot[] = [
  { id: 'ling-shan-da-zhao-bi', name: '灵山大照壁', category: '入口', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 18, display_y: 74, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'fo-shou-guang-chang', name: '佛手广场', category: '广场', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 30, display_y: 60, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'bai-zi-xi-mi-le', name: '百子戏弥勒', category: '景观', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 31, display_y: 79, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'xiang-fu-chan-si', name: '祥符禅寺', category: '寺院', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 39, display_y: 47, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'fan-gong', name: '梵宫', category: '建筑', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 43, display_y: 67, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'pu-ti-da-dao', name: '菩提大道', category: '路线', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 49, display_y: 58, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'ling-shan-da-fo', name: '灵山大佛', category: '核心景点', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 51, display_y: 34, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'wu-yin-tan-cheng', name: '五印坛城', category: '建筑', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 58, display_y: 72, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'jiu-long-guan-yu', name: '九龙灌浴', category: '演艺', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 64, display_y: 55, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'san-sheng-dian', name: '三圣殿', category: '殿堂', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 71, display_y: 48, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'man-fei-long-ta', name: '曼飞龙塔', category: '塔', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 73, display_y: 63, latitude: null, longitude: null, qa_json: null, story_acts: null },
  { id: 'ling-shan-jing-she', name: '灵山精舍', category: '服务', tags: null, overview: '', qr_code: null, thumbnail: null, duration: null, display_x: 78, display_y: 78, latitude: null, longitude: null, qa_json: null, story_acts: null },
];

const routeOrder = [
  'ling-shan-da-zhao-bi',
  'fo-shou-guang-chang',
  'pu-ti-da-dao',
  'xiang-fu-chan-si',
  'ling-shan-da-fo',
  'jiu-long-guan-yu',
  'fan-gong',
  'wu-yin-tan-cheng',
  'ling-shan-jing-she',
];

const normalize = (value: number, max: number) => {
  if (!max) return 0.18;
  return Math.max(0.10, Math.min(1, value / max));
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getOverlayX = (point: MapPoint) => clamp(point.x + 1, 7, 93);

const getOverlayY = (point: MapPoint) => clamp(19 + point.y * 0.58 + (point.level === 'core' ? -1.4 : 0), 24, 82);

interface ProjectedRoutePoint {
  x: number;
  y: number;
  visible: boolean;
}

const toSvgPercent = (value: number, size: number) => clamp((value / Math.max(size, 1)) * 100, 0, 100);

const formatSvgNumber = (value: number) => value.toFixed(2).replace(/\.?0+$/, '');

const createProjectedRoutePath = (projectedPoints: ProjectedRoutePoint[]) =>
  projectedPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`)
    .join(' ');

const createProjectedLinkPath = (source: ProjectedRoutePoint, target: ProjectedRoutePoint, strength: number) => {
  const controlX = (source.x + target.x) / 2;
  const controlY = Math.min(source.y, target.y) - 6 - strength * 7;
  return `M ${formatSvgNumber(source.x)} ${formatSvgNumber(source.y)} Q ${formatSvgNumber(controlX)} ${formatSvgNumber(controlY)} ${formatSvgNumber(target.x)} ${formatSvgNumber(target.y)}`;
};

type DataMarkerStyle = React.CSSProperties & {
  '--heat': string;
  '--risk': string;
  '--marker-size': string;
  '--bar-height': string;
};

const getDataMarkerStyle = (point: MapPoint, activeLayer: MapLayer): DataMarkerStyle => {
  const heat = clamp(point.heat, 0.08, 1);
  const risk = clamp((4.8 - point.satisfaction) / 1.8, 0.08, 1);
  const markerSize = activeLayer === 'traffic'
    ? 56 + heat * 118
    : activeLayer === 'route'
      ? 34 + heat * 54
      : 42 + heat * 78;
  return {
    '--heat': heat.toFixed(3),
    '--risk': risk.toFixed(3),
    '--marker-size': `${markerSize}px`,
    '--bar-height': `${30 + heat * 108}px`,
  };
};

const getDataMarkerGlyph = (activeLayer: MapLayer) => {
  if (activeLayer === 'questions') return '?';
  if (activeLayer === 'satisfaction') return '!';
  if (activeLayer === 'route') return '>';
  if (activeLayer === 'consumption') return '%';
  return '';
};

const formatNumber = (value: number, fractionDigits = 0) =>
  value.toLocaleString('zh-CN', { maximumFractionDigits: fractionDigits });

const getPointLayerBadge = (point: MapPoint, activeLayer: MapLayer) => {
  if (activeLayer === 'traffic') return `${formatNumber(point.visits)}人`;
  if (activeLayer === 'questions') return `${formatNumber(point.questions)}问`;
  if (activeLayer === 'satisfaction') return `${formatNumber(point.satisfaction, 1)}分`;
  if (activeLayer === 'route') return `${formatNumber(point.routeFlow)}流`;
  return `${formatNumber(point.consumptionScore * 100)}%`;
};

const getLayerStrengthText = (activeLayer: MapLayer) => {
  if (activeLayer === 'traffic') return '客流聚集越强，热圈越大';
  if (activeLayer === 'questions') return '提问越密集，脉冲越亮';
  if (activeLayer === 'satisfaction') return '分值越低，警示柱越高';
  if (activeLayer === 'route') return '流线展示游客动线偏好';
  return '金色节点表示消费机会强度';
};

const getSpotPosition = (spot: Spot, index: number) => {
  const mapped = defaultPositions[spot.id];
  if (mapped) return mapped;

  return {
    x: clamp(spot.display_x ?? (22 + (index % 4) * 17), 14, 86),
    y: clamp(spot.display_y ?? (42 + Math.floor(index / 4) * 12), 24, 82),
    shortName: spot.name.length > 5 ? spot.name.slice(0, 4) : spot.name,
    level: 'minor' as const,
  };
};

const normalizeLabel = (value?: string | null) =>
  (value ?? '').toLocaleLowerCase('zh-CN').replace(/[\s·・,，。！？!?、：:；;（）()《》“”"'`~\-_/]/g, '');

const getSpotAliases = (spotId: string, spotName?: string, shortName?: string, category?: string, tags?: string[] | null) => {
  const profile = spotProfiles[spotId];
  return [spotName, shortName, category, ...(tags ?? []), ...(profile?.keywords ?? [])]
    .filter((item): item is string => Boolean(item))
    .map(normalizeLabel)
    .filter(Boolean);
};

const isSameBusinessName = (left?: string | null, right?: string | null) => {
  const leftKey = normalizeLabel(left);
  const rightKey = normalizeLabel(right);
  if (!leftKey || !rightKey) return false;
  return leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey);
};

const questionMatchesSpot = (question: TopQuestionItem, spot: Spot, position: ReturnType<typeof getSpotPosition>) => {
  const questionKey = normalizeLabel(question.question);
  return getSpotAliases(spot.id, spot.name, position.shortName, spot.category, spot.tags)
    .some((alias) => alias.length >= 2 && questionKey.includes(alias));
};

const findSpotValueByName = <T extends { name: string }>(
  items: T[] | undefined,
  spotName: string,
  getValue: (item: T) => number,
) => {
  const matched = items?.find((item) => isSameBusinessName(item.name, spotName));
  return matched ? getValue(matched) : undefined;
};

const findSpotIdByName = (spots: Spot[], name: string) => {
  const nameKey = normalizeLabel(name);
  return spots.find((spot) => {
    const position = getSpotPosition(spot, 0);
    return getSpotAliases(spot.id, spot.name, position.shortName, spot.category, spot.tags)
      .some((alias) => alias === nameKey || alias.includes(nameKey) || nameKey.includes(alias));
  })?.id ?? null;
};

const findPointByBusinessName = (points: MapPoint[], name: string) => {
  const nameKey = normalizeLabel(name);
  return points.find((point) => getSpotAliases(point.id, point.name, point.shortName)
    .some((alias) => alias === nameKey || alias.includes(nameKey) || nameKey.includes(alias))) ?? null;
};

const toWorld = (point: Pick<MapPoint, 'x' | 'y'>) => ({
  x: ((point.x - 50) / 50) * 7.4,
  z: ((point.y - 56) / 50) * 6.6,
});

const getLayerHeat = (
  spotId: string,
  activeLayer: MapLayer,
  baseHeat: number,
  questionHeat: number,
  satisfactionHeat: number,
  routeHeat: number,
  consumptionHeat: number,
) => {
  if (activeLayer === 'satisfaction') return satisfactionHeat;
  if (activeLayer === 'questions') return questionHeat;
  if (activeLayer === 'route') return routeHeat;
  if (activeLayer === 'consumption') return consumptionHeat;
  return baseHeat;
};

const createSpotPoints = (
  spots: Spot[],
  routePreference: RoutePreference | null | undefined,
  satisfaction: SatisfactionAnalysis | null | undefined,
  consumption: ConsumptionAnalysis | null | undefined,
  topQuestions: TopQuestionItem[],
  activeLayer: MapLayer,
) => {
  const sourceSpots = spots.length > 0 ? spots : fallbackSpots;
  const visitMap = new Map((routePreference?.topSpots ?? []).map((item) => [item.name, item.visits]));
  const satisfactionMap = new Map((satisfaction?.byAttraction ?? []).map((item) => [item.name, item.avgSatisfaction]));
  const maxVisits = Math.max(...(routePreference?.topSpots ?? []).map((item) => item.visits), 0);
  const routeFlowMap = new Map<string, number>();
  const addRouteFlow = (name: string, value: number, weight = 1) => {
    const spotId = findSpotIdByName(sourceSpots, name);
    if (!spotId) return;
    routeFlowMap.set(spotId, (routeFlowMap.get(spotId) ?? 0) + value * weight);
  };
  (routePreference?.nodes ?? []).forEach((node) => addRouteFlow(node.name, node.value, 0.74));
  (routePreference?.links ?? []).forEach((link) => {
    addRouteFlow(link.source, link.value, 0.62);
    addRouteFlow(link.target, link.value, 1);
  });
  const hasRouteFlowData = routeFlowMap.size > 0;
  const routeFlowScores = sourceSpots.map((spot) => (
    hasRouteFlowData
      ? routeFlowMap.get(spot.id) ?? 0
      : (spotProfiles[spot.id]?.fallbackVisits ?? 320) * (spotProfiles[spot.id]?.routeBias ?? 0.45)
  ));
  const maxRouteFlow = Math.max(...routeFlowScores, 1);

  const consumptionScores = sourceSpots.map((spot) => {
    const profile = spotProfiles[spot.id];
    let score = profile?.consumptionBias ?? (defaultPositions[spot.id]?.level === 'core' ? 0.56 : 0.28);
    (consumption?.breakdown ?? []).forEach((item) => {
      const text = normalizeLabel(`${item.field}${item.name}`);
      const ratio = item.ratio ?? 0;
      consumptionRules.forEach((rule) => {
        if (!rule.keywords.some((keyword) => text.includes(normalizeLabel(keyword)))) return;
        score += ratio * (rule.weights[spot.id] ?? 0);
      });
    });
    return score;
  });
  const maxConsumptionScore = Math.max(...consumptionScores, 1);
  const questionCounts = sourceSpots.map((spot) =>
    topQuestions.reduce((total, question) => {
      const position = getSpotPosition(spot, 0);
      return questionMatchesSpot(question, spot, position) ? total + question.count : total;
    }, 0),
  );
  const maxQuestionCount = Math.max(...questionCounts, 0);

  return sourceSpots.map((spot, index) => {
    const position = getSpotPosition(spot, index);
    const profile = spotProfiles[spot.id];
    const visits =
      visitMap.get(spot.name) ??
      findSpotValueByName(routePreference?.topSpots, spot.name, (item) => item.visits) ??
      profile?.fallbackVisits ??
      (position.level === 'core' ? 760 - index * 18 : 260 + index * 22);
    const avgSatisfaction =
      satisfactionMap.get(spot.name) ??
      findSpotValueByName(satisfaction?.byAttraction, spot.name, (item) => item.avgSatisfaction) ??
      profile?.fallbackSatisfaction ??
      (position.level === 'core' ? 4.42 : 4.08);
    const questionCount = topQuestions.length
      ? questionCounts[index]
      : profile?.fallbackQuestions ?? (position.level === 'core' ? 36 : 12);
    const routeFlow = routeFlowScores[index] ?? 0;
    const consumptionScore = normalize(consumptionScores[index] ?? 0, maxConsumptionScore);
    const baseHeat = maxVisits > 0 ? normalize(visits, maxVisits) : normalize(visits, 780);
    const questionHeat = maxQuestionCount > 0 ? normalize(questionCount, maxQuestionCount) : normalize(questionCount, 42);
    const riskHeat = clamp((5 - avgSatisfaction) / 2.4, 0.28, 1);
    const routeHeat = normalize(routeFlow, maxRouteFlow);

    return {
      id: spot.id,
      name: spot.name,
      shortName: position.shortName,
      x: position.x,
      y: position.y,
      heat: getLayerHeat(spot.id, activeLayer, baseHeat, questionHeat, riskHeat, routeHeat, consumptionScore),
      satisfaction: avgSatisfaction,
      visits,
      questions: questionCount,
      routeFlow,
      consumptionScore,
      level: position.level,
    };
  });
};

const isCachedModelObject = (object: import('three').Object3D) => {
  let cursor: import('three').Object3D | null = object;
  while (cursor) {
    if (cursor.name === 'lingshan-scene-glb') return true;
    cursor = cursor.parent;
  }
  return false;
};

const disposeObject = (THREE: ThreeModule, scene: import('three').Scene, keepCachedModelResources = false) => {
  scene.traverse((object) => {
    if (keepCachedModelResources && isCachedModelObject(object)) return;
    const mesh = object as import('three').Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => {
        (item as import('three').Material & { map?: import('three').Texture }).map?.dispose();
        item.dispose();
      });
    } else if (material) {
      (material as import('three').Material & { map?: import('three').Texture }).map?.dispose();
      material.dispose();
    }
  });
  if (!keepCachedModelResources) THREE.Cache.clear();
};

const ScenicMapStage: React.FC<ScenicMapStageProps> = ({
  spots,
  routePreference,
  satisfaction,
  consumption,
  topQuestions = [],
  activeLayer,
  height = 'calc(100vh - 124px)',
  minHeight = 690,
  showHeader = true,
  showLegend = true,
  visualMode = 'panel',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dataMarkerRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const routeSpineRef = useRef<SVGPathElement | null>(null);
  const routeFlowRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [renderError, setRenderError] = useState('');
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>('ling-shan-da-fo');
  const [sceneMode, setSceneMode] = useState<'model' | 'fallback'>('fallback');
  const [isLayerSwitching, setIsLayerSwitching] = useState(false);
  const didMountLayerRef = useRef(false);

  const points = useMemo(
    () => createSpotPoints(spots, routePreference, satisfaction, consumption, topQuestions, activeLayer),
    [activeLayer, consumption, routePreference, satisfaction, spots, topQuestions],
  );
  const scenePoints = useMemo(
    () => createSpotPoints(spots, routePreference, satisfaction, consumption, topQuestions, sceneBaseLayer),
    [consumption, routePreference, satisfaction, spots, topQuestions],
  );
  const meta = layerMeta[activeLayer];
  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedSpotId) ?? points.find((point) => point.level === 'core') ?? points[0],
    [points, selectedSpotId],
  );
  const primaryLayerPoint = useMemo(
    () => [...points].sort((left, right) => right.heat - left.heat)[0],
    [points],
  );
  const rankedPoints = useMemo(
    () => [...points].sort((left, right) => right.heat - left.heat).slice(0, 5),
    [points],
  );
  const rankedPointIds = useMemo(
    () => new Set(rankedPoints.slice(0, 3).map((point) => point.id)),
    [rankedPoints],
  );
  const rankedPointRanks = useMemo(
    () => new Map(rankedPoints.map((point, index) => [point.id, index + 1])),
    [rankedPoints],
  );
  const routeOverlayPoints = useMemo(
    () => routeOrder
      .map((id) => scenePoints.find((point) => point.id === id))
      .filter((point): point is MapPoint => Boolean(point)),
    [scenePoints],
  );
  const routeOverlayPath = useMemo(
    () => routeOverlayPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${getOverlayX(point)} ${getOverlayY(point)}`)
      .join(' '),
    [routeOverlayPoints],
  );
  const routeLinkPaths = useMemo(() => {
    if (!routePreference?.links?.length) return [];
    const max = Math.max(...routePreference.links.map((link) => link.value), 1);
    return routePreference.links
      .slice()
      .sort((left, right) => right.value - left.value)
      .slice(0, 5)
      .map((link, index) => {
        const source = findPointByBusinessName(scenePoints, link.source);
        const target = findPointByBusinessName(scenePoints, link.target);
        if (!source || !target) return null;
        const startX = getOverlayX(source);
        const startY = getOverlayY(source);
        const endX = getOverlayX(target);
        const endY = getOverlayY(target);
        const strength = clamp(link.value / max, 0.18, 1);
        return {
          key: `${link.source}-${link.target}-${index}`,
          sourceId: source.id,
          targetId: target.id,
          strength,
          d: `M ${startX} ${startY} Q ${(startX + endX) / 2} ${Math.min(startY, endY) - 9 - strength * 8} ${endX} ${endY}`,
        };
      })
      .filter((item): item is { key: string; sourceId: string; targetId: string; strength: number; d: string } => Boolean(item));
  }, [routePreference, scenePoints]);

  useEffect(() => {
    if (!didMountLayerRef.current) {
      didMountLayerRef.current = true;
      return undefined;
    }
    setIsLayerSwitching(true);
    const timer = window.setTimeout(() => setIsLayerSwitching(false), 260);
    return () => window.clearTimeout(timer);
  }, [activeLayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return undefined;

    const activeLayer = sceneBaseLayer as MapLayer;
    const points = scenePoints;
    let renderer: import('three').WebGLRenderer | null = null;
    let scene: import('three').Scene | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let frameId = 0;
    let disposed = false;
    let cleanupEvents: (() => void) | null = null;

    const init = async () => {
      try {
        const THREE = await import('three');
        if (disposed) return;

        const root = new THREE.Group();
        const modelRoot = new THREE.Group();
        const fallbackRoot = new THREE.Group();
        const overlayRoot = new THREE.Group();
        modelRoot.name = 'lingshan-model-root';
        fallbackRoot.name = 'lingshan-fallback-root';
        overlayRoot.name = 'lingshan-data-overlay-root';
        root.add(modelRoot, fallbackRoot, overlayRoot);
        const labelAnchors: Record<string, import('three').Object3D> = {};
        const clickableObjects: import('three').Object3D[] = [];
        const heatMaterials: import('three').MeshBasicMaterial[] = [];
        const routeDots: import('three').Mesh[] = [];
        const beaconMaterials: import('three').MeshBasicMaterial[] = [];
        const pointWorldOverrides = new Map<string, import('three').Vector3>();

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xf4ead5, 0.014);
        scene.add(root);

        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
        let cameraDistance = 11.65;
        const syncCamera = () => {
          camera.position.set(0, cameraDistance * 0.56, cameraDistance);
          camera.lookAt(0, 0.2, 0);
        };
        syncCamera();

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.72));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;

        const ambient = new THREE.HemisphereLight(0xfff2da, 0x365c5e, 1.76);
        scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffdfae, 2.55);
        sun.position.set(-4.5, 8, 5.4);
        scene.add(sun);

        const fill = new THREE.DirectionalLight(0x76e5df, 1.04);
        fill.position.set(5, 4, -5);
        scene.add(fill);

        const materialTerrain = new THREE.MeshStandardMaterial({
          color: 0xb8c895,
          roughness: 0.82,
          metalness: 0.02,
        });
        const materialTerrainSide = new THREE.MeshStandardMaterial({
          color: 0x8e7954,
          roughness: 0.9,
        });
        const materialStone = new THREE.MeshStandardMaterial({ color: 0xe8d6ad, roughness: 0.78 });
        const materialPath = new THREE.MeshBasicMaterial({ color: 0x7dfbff, transparent: true, opacity: 0.86 });
        const materialGold = new THREE.MeshStandardMaterial({ color: 0xd6a83f, roughness: 0.45, metalness: 0.25 });
        const materialCopper = new THREE.MeshStandardMaterial({ color: 0xb96132, roughness: 0.56, metalness: 0.04 });
        const materialRoof = new THREE.MeshStandardMaterial({ color: 0x7f3b2b, roughness: 0.62 });
        const materialJade = new THREE.MeshStandardMaterial({ color: 0x5e9a81, roughness: 0.7 });
        const materialWater = new THREE.MeshBasicMaterial({ color: 0x65c8bd, transparent: true, opacity: 0.38 });
        const materialInk = new THREE.MeshStandardMaterial({ color: 0x3a332d, roughness: 0.82 });
        const materialWhite = new THREE.MeshStandardMaterial({ color: 0xf8eed2, roughness: 0.72 });
        if (visualMode !== 'embedded') {
          const contactShadow = new THREE.Mesh(
            new THREE.CircleGeometry(4.9, 96),
            new THREE.MeshBasicMaterial({
              color: 0x8a6f4a,
              transparent: true,
              opacity: 0.065,
              depthWrite: false,
            }),
          );
          contactShadow.name = 'sandtable_contact_shadow';
          contactShadow.rotation.x = -Math.PI / 2;
          contactShadow.scale.set(1.18, 0.62, 1);
          contactShadow.position.y = -0.015;
          root.add(contactShadow);
        }

        const markSpot = (object: import('three').Object3D, spotId: string) => {
          object.userData.spotId = spotId;
          object.traverse((child) => {
            child.userData.spotId = spotId;
          });
          clickableObjects.push(object);
        };

        const inferSpotIdFromObjectName = (name: string) => {
          const normalized = name.toLowerCase();
          return points.find((point) => normalized.includes(point.id.replace(/-/g, '_')))?.id ?? null;
        };

        const normalizeImportedModel = (model: import('three').Object3D) => {
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.z, 1);
          const scale = 8.8 / maxSize;
          model.scale.setScalar(scale);
          model.updateMatrixWorld(true);

          const scaledBox = new THREE.Box3().setFromObject(model);
          const center = scaledBox.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.updateMatrixWorld(true);

          const groundedBox = new THREE.Box3().setFromObject(model);
          model.position.y -= groundedBox.min.y - 0.02;
          model.updateMatrixWorld(true);
        };

        const tryLoadLingshanModel = async () => {
          try {
            if (!lingshanModelTemplatePromise) {
              lingshanModelTemplatePromise = (async () => {
                const exists = await fetch(LINGSHAN_MODEL_URL, { method: 'HEAD' });
                if (!exists.ok) return null;

                const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                const loader = new GLTFLoader();
                const gltf = await loader.loadAsync(LINGSHAN_MODEL_URL);
                const templateScene = gltf.scene;
                templateScene.name = 'lingshan-scene-template';
                normalizeImportedModel(templateScene);
                templateScene.scale.y *= 0.78;
                templateScene.traverse((object) => {
                  const mesh = object as import('three').Mesh;
                  if (!mesh.material) return;
                  const softenMaterial = (material: import('three').Material) => {
                    const cloned = material.clone();
                    const basic = cloned as import('three').MeshStandardMaterial & {
                      color?: import('three').Color;
                      emissive?: import('three').Color;
                      emissiveIntensity?: number;
                      roughness?: number;
                      metalness?: number;
                    };
                    const objectName = object.name.toLowerCase();
                    const isTerrain = objectName.includes('terrain') || objectName.includes('district') || objectName.includes('plate');
                    const isWater = objectName.includes('water') || objectName.includes('lake');
                    const isCoreLandmark = objectName.includes('buddha') || objectName.includes('fan_gong') || objectName.includes('mandala') || objectName.includes('jiu_long');
                    const isGuideLine = objectName.includes('contour') || objectName.includes('outline') || objectName.includes('blueprint') || objectName.includes('hatch');
                    if (basic.color) {
                      basic.color.lerp(
                        new THREE.Color(isGuideLine ? 0x5ad9d3 : 0xf1dfbd),
                        isTerrain ? 0.05 : isCoreLandmark ? 0.10 : isWater ? 0.14 : isGuideLine ? 0.18 : 0.20,
                      );
                    }
                    basic.opacity = isTerrain
                      ? 0.96
                      : isWater
                        ? 0.42
                        : isCoreLandmark
                          ? 0.94
                          : isGuideLine
                            ? 0.58
                            : 0.78;
                    basic.transparent = basic.opacity < 0.98;
                    basic.depthWrite = !isWater && !isGuideLine;
                    basic.depthTest = true;
                    if (basic.emissive) {
                      basic.emissive.lerp(new THREE.Color(isCoreLandmark ? 0x7dfbff : 0x5ad9d3), isCoreLandmark ? 0.20 : 0.08);
                      basic.emissiveIntensity = isCoreLandmark ? 0.08 : isGuideLine ? 0.13 : 0.045;
                    }
                    if (typeof basic.roughness === 'number') basic.roughness = isCoreLandmark ? 0.58 : 0.78;
                    if (typeof basic.metalness === 'number') basic.metalness = isCoreLandmark ? 0.10 : 0.04;
                    return cloned;
                  };
                  mesh.material = Array.isArray(mesh.material)
                    ? mesh.material.map(softenMaterial)
                    : softenMaterial(mesh.material);
                });
                return templateScene;
              })();
            }

            const templateScene = await lingshanModelTemplatePromise;
            if (!templateScene) return false;

            const importedScene = templateScene.clone(true);
            importedScene.name = 'lingshan-scene-glb';
            modelRoot.add(importedScene);
            modelRoot.updateMatrixWorld(true);

            importedScene.traverse((object) => {
              const spotId = inferSpotIdFromObjectName(object.name);
              if (spotId) {
                object.userData.spotId = spotId;
                clickableObjects.push(object);
              }
            });

            points.forEach((point) => {
              const anchorObject = importedScene.getObjectByName(getAnchorName(point.id));
              if (!anchorObject) return;
              const labelAnchor = new THREE.Object3D();
              labelAnchor.position.set(0, point.level === 'core' ? 0.58 : 0.36, 0);
              anchorObject.add(labelAnchor);
              labelAnchors[point.id] = labelAnchor;

              const groundPosition = new THREE.Vector3();
              (anchorObject.parent ?? anchorObject).getWorldPosition(groundPosition);
              pointWorldOverrides.set(point.id, groundPosition);
            });

            fallbackRoot.visible = false;
            setSceneMode('model');
            return true;
          } catch {
            return false;
          }
        };

        const getPointWorld = (point: MapPoint) => {
          const overridden = pointWorldOverrides.get(point.id);
          if (overridden) return { x: overridden.x, y: Math.max(0.08, overridden.y), z: overridden.z };
          const world = toWorld(point);
          return { x: world.x, y: 0.1, z: world.z };
        };

        const hasImportedModel = await tryLoadLingshanModel();
        if (!hasImportedModel) {
          fallbackRoot.visible = true;
          setSceneMode('fallback');
        }

        const shape = new THREE.Shape([
          new THREE.Vector2(-4.8, -0.4),
          new THREE.Vector2(-4.2, -2.4),
          new THREE.Vector2(-2.1, -3.3),
          new THREE.Vector2(-0.5, -2.8),
          new THREE.Vector2(1.1, -3.35),
          new THREE.Vector2(3.2, -2.55),
          new THREE.Vector2(4.7, -1.1),
          new THREE.Vector2(4.45, 1.4),
          new THREE.Vector2(3.25, 2.8),
          new THREE.Vector2(1.5, 2.55),
          new THREE.Vector2(0.15, 3.28),
          new THREE.Vector2(-1.72, 2.72),
          new THREE.Vector2(-3.3, 1.72),
          new THREE.Vector2(-4.9, 0.72),
        ]);
        const terrainGeometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.42,
          bevelEnabled: true,
          bevelSize: 0.08,
          bevelThickness: 0.08,
          bevelSegments: 2,
        });
        terrainGeometry.rotateX(-Math.PI / 2);
        terrainGeometry.translate(0, -0.24, 0);
        const terrain = new THREE.Mesh(terrainGeometry, [materialTerrain, materialTerrainSide]);
        fallbackRoot.add(terrain);

        const createHill = (x: number, z: number, scale: [number, number, number], color: number) => {
          const hill = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1, 0),
            new THREE.MeshStandardMaterial({ color, roughness: 0.86, flatShading: true }),
          );
          hill.scale.set(...scale);
          hill.position.set(x, 0.12 + scale[1] * 0.28, z);
          fallbackRoot.add(hill);
        };

        createHill(-2.4, 1.45, [1.25, 0.44, 0.8], 0x93ad77);
        createHill(-0.45, 1.9, [1.05, 0.34, 0.64], 0xa8bd82);
        createHill(2.1, 1.34, [1.36, 0.42, 0.78], 0x86a36f);
        createHill(3.12, -1.54, [0.94, 0.28, 0.58], 0x9fb889);

        const water = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), materialWater);
        water.rotation.x = -Math.PI / 2;
        water.scale.set(1.48, 0.56, 1);
        water.position.set(1.74, 0.04, 1.64);
        fallbackRoot.add(water);

        const addBox = (
          parent: import('three').Object3D,
          size: [number, number, number],
          position: [number, number, number],
          material: import('three').Material,
        ) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
          mesh.position.set(...position);
          parent.add(mesh);
          return mesh;
        };

        const addCylinder = (
          parent: import('three').Object3D,
          radiusTop: number,
          radiusBottom: number,
          heightValue: number,
          position: [number, number, number],
          material: import('three').Material,
          segments = 24,
        ) => {
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, heightValue, segments), material);
          mesh.position.set(...position);
          parent.add(mesh);
          return mesh;
        };

        const addRoof = (
          parent: import('three').Object3D,
          radius: number,
          heightValue: number,
          position: [number, number, number],
          scaleZ = 0.66,
        ) => {
          const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.18, radius, heightValue, 4), materialRoof);
          roof.rotation.y = Math.PI / 4;
          roof.scale.z = scaleZ;
          roof.position.set(...position);
          parent.add(roof);
          return roof;
        };

        const createTemple = (point: MapPoint, scale = 1) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          addBox(group, [0.72 * scale, 0.28 * scale, 0.52 * scale], [0, 0.16 * scale, 0], materialWhite);
          addBox(group, [0.92 * scale, 0.12 * scale, 0.64 * scale], [0, 0.34 * scale, 0], materialCopper);
          addRoof(group, 0.62 * scale, 0.34 * scale, [0, 0.58 * scale, 0], 0.72);
          [-0.24, 0.24].forEach((x) => addCylinder(group, 0.025 * scale, 0.025 * scale, 0.28 * scale, [x * scale, 0.22 * scale, -0.24 * scale], materialGold, 10));
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const createTower = (point: MapPoint) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          for (let index = 0; index < 4; index += 1) {
            const levelScale = 1 - index * 0.14;
            addCylinder(group, 0.18 * levelScale, 0.22 * levelScale, 0.22, [0, 0.12 + index * 0.24, 0], materialWhite, 8);
            addRoof(group, 0.33 * levelScale, 0.12, [0, 0.26 + index * 0.24, 0], 1);
          }
          addCylinder(group, 0.03, 0.04, 0.22, [0, 1.13, 0], materialGold, 8);
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const createBuddha = (point: MapPoint) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          addCylinder(group, 0.46, 0.55, 0.24, [0, 0.13, 0], materialStone, 28);
          addCylinder(group, 0.28, 0.36, 0.7, [0, 0.58, 0], materialGold, 22);
          const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 14), materialGold);
          shoulders.scale.set(1, 0.58, 0.72);
          shoulders.position.set(0, 0.92, 0);
          group.add(shoulders);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 22, 16), materialGold);
          head.position.set(0, 1.23, 0);
          group.add(head);
          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.42, 0.025, 8, 48),
            new THREE.MeshBasicMaterial({ color: 0xf7d87a, transparent: true, opacity: 0.75 }),
          );
          halo.position.set(0, 1.12, -0.07);
          group.add(halo);
          addCylinder(group, 0.02, 0.02, 0.44, [-0.24, 0.87, 0], materialGold, 8).rotation.z = -0.42;
          addCylinder(group, 0.02, 0.02, 0.44, [0.24, 0.87, 0], materialGold, 8).rotation.z = 0.42;
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const createPalace = (point: MapPoint) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          addBox(group, [1.18, 0.32, 0.72], [0, 0.18, 0], materialWhite);
          addBox(group, [0.46, 0.25, 0.58], [-0.72, 0.14, 0.02], materialWhite);
          addBox(group, [0.46, 0.25, 0.58], [0.72, 0.14, 0.02], materialWhite);
          addRoof(group, 0.86, 0.28, [0, 0.46, 0], 0.62);
          addRoof(group, 0.42, 0.2, [-0.72, 0.36, 0.02], 0.7);
          addRoof(group, 0.42, 0.2, [0.72, 0.36, 0.02], 0.7);
          addCylinder(group, 0.13, 0.18, 0.52, [0, 0.72, 0], materialGold, 18);
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const createWaterShow = (point: MapPoint) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          const basin = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), materialWater);
          basin.rotation.x = -Math.PI / 2;
          basin.position.y = 0.03;
          group.add(basin);
          addCylinder(group, 0.18, 0.28, 0.18, [0, 0.12, 0], materialStone, 24);
          for (let index = 0; index < 5; index += 1) {
            const angle = (Math.PI * 2 * index) / 5;
            const x = Math.cos(angle) * 0.34;
            const z = Math.sin(angle) * 0.34;
            const dragon = addCylinder(group, 0.025, 0.035, 0.36, [x, 0.26, z], materialJade, 8);
            dragon.rotation.z = Math.cos(angle) * 0.25;
          }
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const createPlaza = (point: MapPoint) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          const plaza = new THREE.Mesh(new THREE.CircleGeometry(0.48, 48), new THREE.MeshBasicMaterial({ color: 0xefdbad, transparent: true, opacity: 0.72 }));
          plaza.rotation.x = -Math.PI / 2;
          group.add(plaza);
          addCylinder(group, 0.10, 0.16, 0.34, [0, 0.18, 0], materialGold, 16);
          for (let index = 0; index < 4; index += 1) {
            const angle = (Math.PI * 2 * index) / 4 + Math.PI / 4;
            addCylinder(group, 0.035, 0.045, 0.18, [Math.cos(angle) * 0.28, 0.1, Math.sin(angle) * 0.28], materialStone, 8);
          }
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const createGenericMarker = (point: MapPoint) => {
          const group = new THREE.Group();
          const world = toWorld(point);
          group.position.set(world.x, 0.1, world.z);
          addCylinder(group, 0.12, 0.16, 0.12, [0, 0.07, 0], materialStone, 16);
          addCylinder(group, 0.07, 0.09, 0.24, [0, 0.24, 0], point.level === 'major' ? materialCopper : materialInk, 12);
          markSpot(group, point.id);
          fallbackRoot.add(group);
          return group;
        };

        const layerColor = new THREE.Color(
          activeLayer === 'satisfaction' || activeLayer === 'consumption'
            ? 0xc9a96e
            : activeLayer === 'route'
              ? 0x68c5be
              : 0x5ad9d3,
        );
        const getLayerColor = (point: MapPoint) => {
          if (activeLayer === 'satisfaction') {
            return new THREE.Color(point.satisfaction < 3.8 ? 0xb97848 : 0x9cc4bd);
          }
          if (activeLayer === 'questions') return new THREE.Color(point.questions > 28 ? 0xc78652 : 0x5ad9d3);
          if (activeLayer === 'consumption') return new THREE.Color(point.heat > 0.72 ? 0xc9a96e : 0x75c9c4);
          if (activeLayer === 'route') return new THREE.Color(0x68c5be);
          return new THREE.Color(point.heat > 0.74 ? 0xd19a5a : 0x5ad9d3);
        };

        const createGlowMaterial = (color: import('three').Color, opacity: number) => new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const trackBeaconMaterial = (material: import('three').MeshBasicMaterial, maxOpacity = Math.max(0.16, material.opacity + 0.06)) => {
          material.userData.baseOpacity = material.opacity;
          material.userData.maxOpacity = maxOpacity;
          beaconMaterials.push(material);
        };

        const createSpotHeatTexture = () => {
          const heatCanvas = document.createElement('canvas');
          heatCanvas.width = 192;
          heatCanvas.height = 192;
          const context = heatCanvas.getContext('2d');
          if (!context) return null;
          const gradient = context.createRadialGradient(96, 96, 6, 96, 96, 92);
          if (activeLayer === 'satisfaction') {
            gradient.addColorStop(0, 'rgba(210, 116, 42, 0.54)');
            gradient.addColorStop(0.34, 'rgba(214, 154, 54, 0.30)');
            gradient.addColorStop(0.66, 'rgba(78, 206, 214, 0.12)');
          } else if (activeLayer === 'route') {
            gradient.addColorStop(0, 'rgba(96, 194, 190, 0.50)');
            gradient.addColorStop(0.38, 'rgba(82, 150, 156, 0.30)');
            gradient.addColorStop(0.72, 'rgba(64, 169, 190, 0.12)');
          } else if (activeLayer === 'consumption') {
            gradient.addColorStop(0, 'rgba(220, 178, 94, 0.52)');
            gradient.addColorStop(0.42, 'rgba(191, 155, 98, 0.28)');
            gradient.addColorStop(0.72, 'rgba(90, 217, 211, 0.10)');
          } else {
            gradient.addColorStop(0, 'rgba(216, 110, 48, 0.58)');
            gradient.addColorStop(0.28, 'rgba(218, 162, 72, 0.36)');
            gradient.addColorStop(0.58, 'rgba(74, 205, 214, 0.16)');
          }
          gradient.addColorStop(1, 'rgba(38, 226, 255, 0)');
          context.fillStyle = gradient;
          context.fillRect(0, 0, 192, 192);
          const texture = new THREE.CanvasTexture(heatCanvas);
          texture.needsUpdate = true;
          return texture;
        };

        const getHeatGradientStops = () => {
          if (activeLayer === 'satisfaction') {
            return [
              [0, 'rgba(190, 88, 46, 0.52)'],
              [0.26, 'rgba(217, 152, 65, 0.32)'],
              [0.56, 'rgba(86, 173, 178, 0.16)'],
              [0.80, 'rgba(90, 217, 211, 0.06)'],
              [1, 'rgba(90, 217, 211, 0)'],
            ] as const;
          }
          if (activeLayer === 'route') {
            return [
              [0, 'rgba(104, 197, 190, 0.46)'],
              [0.34, 'rgba(83, 156, 163, 0.30)'],
              [0.64, 'rgba(73, 178, 190, 0.14)'],
              [0.84, 'rgba(90, 217, 211, 0.06)'],
              [1, 'rgba(90, 217, 211, 0)'],
            ] as const;
          }
          if (activeLayer === 'consumption') {
            return [
              [0, 'rgba(221, 178, 94, 0.50)'],
              [0.34, 'rgba(193, 158, 101, 0.30)'],
              [0.64, 'rgba(88, 174, 180, 0.12)'],
              [0.86, 'rgba(90, 217, 211, 0.05)'],
              [1, 'rgba(90, 217, 211, 0)'],
            ] as const;
          }
          return [
            [0, 'rgba(218, 105, 50, 0.54)'],
            [0.28, 'rgba(222, 163, 76, 0.34)'],
            [0.56, 'rgba(82, 183, 190, 0.16)'],
            [0.78, 'rgba(90, 217, 211, 0.07)'],
            [1, 'rgba(90, 217, 211, 0)'],
          ] as const;
        };

        const createContinuousHeatTexture = () => {
          const heatCanvas = document.createElement('canvas');
          heatCanvas.width = 900;
          heatCanvas.height = 600;
          const context = heatCanvas.getContext('2d');
          if (!context) return null;
          const getCanvasPoint = (point: MapPoint) => ({
            x: clamp((point.x / 100) * heatCanvas.width, 0, heatCanvas.width),
            y: clamp(((point.y - 18) / 68) * heatCanvas.height, 0, heatCanvas.height),
          });
          context.clearRect(0, 0, heatCanvas.width, heatCanvas.height);
          context.globalCompositeOperation = 'lighter';
          const stops = getHeatGradientStops();
          [...points]
            .sort((left, right) => left.heat - right.heat)
            .forEach((point) => {
              const { x, y } = getCanvasPoint(point);
              const radius = (activeLayer === 'traffic' ? 110 : activeLayer === 'route' ? 82 : 92)
                + point.heat * (activeLayer === 'traffic' ? 150 : 116);
              const gradient = context.createRadialGradient(x, y, radius * 0.03, x, y, radius);
              stops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
              context.globalAlpha = clamp(0.12 + point.heat * 0.26, 0.08, 0.38);
              context.fillStyle = gradient;
              context.beginPath();
              context.arc(x, y, radius, 0, Math.PI * 2);
              context.fill();
            });
          const topPoints = [...points].sort((left, right) => right.heat - left.heat).slice(0, 5);
          topPoints.slice(0, 4).forEach((point, index) => {
            const { x, y } = getCanvasPoint(point);
            const outerRadius = 56 + point.heat * 74 - index * 5;
            context.save();
            context.globalCompositeOperation = 'source-over';
            context.globalAlpha = 0.16 + point.heat * 0.12;
            context.strokeStyle = index === 0 ? 'rgba(223, 145, 73, 0.54)' : 'rgba(90, 217, 211, 0.44)';
            context.lineWidth = Math.max(1.5, 4 - index * 0.5);
            context.setLineDash(index === 0 ? [] : [12, 8]);
            context.beginPath();
            context.ellipse(x, y, outerRadius * 1.18, outerRadius * 0.72, -0.18, 0, Math.PI * 2);
            context.stroke();
            context.globalAlpha = 0.30;
            context.strokeStyle = 'rgba(90, 217, 211, 0.54)';
            context.lineWidth = 1.5;
            context.setLineDash([5, 6]);
            context.beginPath();
            context.ellipse(x, y, outerRadius * 0.76, outerRadius * 0.46, -0.18, 0, Math.PI * 2);
            context.stroke();
            context.globalAlpha = 0.42;
            context.fillStyle = index === 0 ? 'rgba(228, 150, 77, 0.58)' : 'rgba(90, 217, 211, 0.44)';
            context.beginPath();
            context.arc(x, y, 6 + point.heat * 5, 0, Math.PI * 2);
            context.fill();
            context.restore();
          });
          if (topPoints.length > 1) {
            context.save();
            context.globalCompositeOperation = 'lighter';
            context.lineCap = 'round';
            topPoints.slice(0, 4).forEach((point, index) => {
              const next = topPoints[index + 1];
              if (!next) return;
              const start = getCanvasPoint(point);
              const end = getCanvasPoint(next);
              const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
              gradient.addColorStop(0, 'rgba(226, 150, 78, 0.24)');
              gradient.addColorStop(0.48, 'rgba(90, 217, 211, 0.16)');
              gradient.addColorStop(1, 'rgba(90, 217, 211, 0.08)');
              context.globalAlpha = 0.18;
              context.strokeStyle = gradient;
              context.lineWidth = 8 - index;
              context.beginPath();
              context.moveTo(start.x, start.y);
              context.quadraticCurveTo((start.x + end.x) / 2, Math.min(start.y, end.y) - 34, end.x, end.y);
              context.stroke();
            });
            context.restore();
          }
          context.globalCompositeOperation = 'source-over';
          context.globalAlpha = 0.20;
          context.strokeStyle = 'rgba(90, 217, 211, 0.22)';
          context.lineWidth = 1;
          for (let x = 30; x < heatCanvas.width; x += 54) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, heatCanvas.height);
            context.stroke();
          }
          for (let y = 30; y < heatCanvas.height; y += 54) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(heatCanvas.width, y);
            context.stroke();
          }
          const texture = new THREE.CanvasTexture(heatCanvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
          return texture;
        };

        const spotHeatTexture = createSpotHeatTexture();
        const continuousHeatTexture = createContinuousHeatTexture();

        if (continuousHeatTexture) {
          const fieldMaterial = new THREE.MeshBasicMaterial({
            map: continuousHeatTexture,
            transparent: true,
            opacity: activeLayer === 'traffic' ? 0.40 : 0.34,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NormalBlending,
          });
          fieldMaterial.userData.baseOpacity = fieldMaterial.opacity;
          fieldMaterial.userData.maxOpacity = activeLayer === 'traffic' ? 0.48 : 0.42;
          const field = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 6.9, 1, 1), fieldMaterial);
          field.name = `continuous_${activeLayer}_heat_field`;
          field.rotation.x = -Math.PI / 2;
          field.position.set(0.04, 0.34, 0.08);
          overlayRoot.add(field);
          heatMaterials.push(fieldMaterial);
        }

        const topHeatPoints = [...points].sort((left, right) => right.heat - left.heat).slice(0, 4);
        topHeatPoints.forEach((point, index) => {
          const world = getPointWorld(point);
          const heatColor = getLayerColor(point);
          const ridgeOpacity = 0.24 - index * 0.03;
          const outerBandMaterial = new THREE.MeshBasicMaterial({
            color: index === 0 ? 0xe0964f : heatColor,
            transparent: true,
            opacity: ridgeOpacity,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          });
          outerBandMaterial.userData.baseOpacity = ridgeOpacity;
          outerBandMaterial.userData.maxOpacity = 0.34;
          const radius = 0.48 + point.heat * 0.42 - index * 0.035;
          const band = new THREE.Mesh(
            new THREE.RingGeometry(radius, radius + 0.024, 96),
            outerBandMaterial,
          );
          band.name = `ranked_heat_isoline_${index + 1}_${point.id}`;
          band.rotation.x = -Math.PI / 2;
          band.scale.set(1.28, 0.72, 1);
          band.position.set(world.x, world.y + 0.28 + index * 0.012, world.z);
          overlayRoot.add(band);
          heatMaterials.push(outerBandMaterial);

          const finHeight = 0.32 + point.heat * 0.72;
          const finMaterial = createGlowMaterial(index === 0 ? new THREE.Color(0xe0964f) : new THREE.Color(0x5ad9d3), 0.05 + point.heat * 0.06);
          const fin = new THREE.Mesh(
            new THREE.BoxGeometry(0.016, finHeight * 0.74, 0.18 + point.heat * 0.06),
            finMaterial,
          );
          fin.name = `ranked_heat_data_fin_${index + 1}_${point.id}`;
          fin.position.set(world.x + 0.24 + index * 0.04, world.y + (finHeight * 0.74) / 2 + 0.14, world.z - 0.28);
          fin.rotation.y = -0.2;
          overlayRoot.add(fin);
            trackBeaconMaterial(finMaterial);

          const rankDotMaterial = createGlowMaterial(index === 0 ? new THREE.Color(0xe0964f) : new THREE.Color(0x5ad9d3), 0.18);
          const rankDot = new THREE.Mesh(new THREE.SphereGeometry(0.036 - index * 0.003, 12, 8), rankDotMaterial);
          rankDot.name = `ranked_heat_rank_dot_${index + 1}_${point.id}`;
          rankDot.position.set(world.x + 0.24 + index * 0.04, world.y + finHeight * 0.74 + 0.22, world.z - 0.28);
          overlayRoot.add(rankDot);
          trackBeaconMaterial(rankDotMaterial);
        });

        topHeatPoints.slice(0, 3).forEach((point, index) => {
          const next = topHeatPoints[index + 1];
          if (!next) return;
          const source = getPointWorld(point);
          const target = getPointWorld(next);
          const strength = clamp((point.heat + next.heat) / 2, 0.18, 1);
          const ridgeCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(source.x, source.y + 0.26, source.z),
            new THREE.Vector3((source.x + target.x) / 2, Math.max(source.y, target.y) + 0.48 + strength * 0.20, (source.z + target.z) / 2),
            new THREE.Vector3(target.x, target.y + 0.26, target.z),
          ], false, 'catmullrom', 0.28);
          const ridgeMaterial = new THREE.MeshBasicMaterial({
            color: index === 0 ? 0xe0964f : 0x5ad9d3,
            transparent: true,
            opacity: 0.06 + strength * 0.08,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          ridgeMaterial.userData.baseOpacity = ridgeMaterial.opacity;
          ridgeMaterial.userData.maxOpacity = 0.22;
          const ridge = new THREE.Mesh(
            new THREE.TubeGeometry(ridgeCurve, 72, 0.008 + strength * 0.010, 6, false),
            ridgeMaterial,
          );
          ridge.name = `ranked_heat_ridge_${index + 1}_${point.id}_${next.id}`;
          overlayRoot.add(ridge);
          heatMaterials.push(ridgeMaterial);
        });

        points.forEach((point, pointIndex) => {
          const world = getPointWorld(point);
          const heatRadius = activeLayer === 'traffic'
            ? 0.62 + point.heat * 1.86
            : activeLayer === 'route'
              ? 0.34 + point.heat * 0.88
              : 0.38 + point.heat * 1.04;
          const heatColor = getLayerColor(point);
          const heatScales = activeLayer === 'route'
            ? [0.30]
            : activeLayer === 'questions'
              ? [0.42, 0.22]
              : activeLayer === 'traffic'
                ? [0.38, 0.22]
                : [0.36, 0.20];
          const trafficHeatColors = [0x5ad9d3, 0xa7c9bb, 0xd19a5a];
          const trafficHeatOpacities = [0.045, 0.075, 0.10];

          heatScales.forEach((scale, index) => {
            const isTrafficHeat = activeLayer === 'traffic';
            const heatMaterial = new THREE.MeshBasicMaterial({
              color: isTrafficHeat ? trafficHeatColors[index] ?? heatColor : heatColor,
              transparent: true,
              opacity: isTrafficHeat
                ? (trafficHeatOpacities[index] ?? 0.06) * (0.58 + point.heat * 0.16)
                : activeLayer === 'route'
                  ? 0.04 + point.heat * 0.04
                  : index === 0
                    ? 0.025 + point.heat * 0.035
                    : 0.035 + point.heat * 0.04,
              depthWrite: false,
              depthTest: false,
              blending: isTrafficHeat && index === 2 ? THREE.NormalBlending : THREE.AdditiveBlending,
            });
            heatMaterial.userData.baseOpacity = heatMaterial.opacity;
            const heat = new THREE.Mesh(
              new THREE.CircleGeometry(heatRadius * scale, 64),
              heatMaterial,
            );
            heat.rotation.x = -Math.PI / 2;
            heat.position.set(world.x, world.y + 0.06 + index * 0.014, world.z);
            heat.userData.offset = Math.random() * Math.PI * 2;
            heatMaterials.push(heat.material as import('three').MeshBasicMaterial);
            overlayRoot.add(heat);
          });

          if (spotHeatTexture && point.heat > 0.66) {
            const spriteMaterial = new THREE.SpriteMaterial({
              map: spotHeatTexture,
              transparent: true,
              opacity: clamp(0.06 + point.heat * (activeLayer === 'traffic' ? 0.14 : 0.11), 0.06, 0.18),
              depthWrite: false,
              depthTest: false,
            });
            const heatSprite = new THREE.Sprite(spriteMaterial);
            heatSprite.name = `${activeLayer}_heat_sprite_${point.id}`;
            heatSprite.scale.set(heatRadius * 1.36, heatRadius * 0.82, 1);
            heatSprite.position.set(world.x, world.y + (activeLayer === 'route' ? 0.24 : 0.38), world.z);
            overlayRoot.add(heatSprite);
          }

          if (activeLayer === 'traffic') {
            const columnHeight = 0.14 + point.heat * (point.level === 'core' ? 0.58 : 0.36);
            const columnMaterial = createGlowMaterial(new THREE.Color(point.heat > 0.74 ? 0xd19a5a : 0x5ad9d3), 0.035 + point.heat * 0.055);
            const column = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06 + point.heat * 0.04, 0.16 + point.heat * 0.12, columnHeight, 24, 1, true),
              columnMaterial,
            );
            column.name = `traffic_density_column_${point.id}`;
            column.position.set(world.x, world.y + columnHeight / 2 + 0.04, world.z);
            overlayRoot.add(column);
            trackBeaconMaterial(columnMaterial);

            const dotCount = point.level === 'core' ? 7 : point.level === 'major' ? 4 : 2;
            const dotGeometry = new THREE.SphereGeometry(0.032 + point.heat * 0.015, 10, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({
              color: heatColor,
              transparent: true,
              opacity: 0.32,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            });
            for (let dotIndex = 0; dotIndex < dotCount; dotIndex += 1) {
              const angle = pointIndex * 0.9 + dotIndex * 1.38;
              const radius = 0.22 + (dotIndex % 3) * 0.13 + point.heat * 0.08;
              const dot = new THREE.Mesh(dotGeometry, dotMaterial);
              dot.position.set(world.x + Math.cos(angle) * radius, world.y + 0.08 + dotIndex * 0.006, world.z + Math.sin(angle) * radius * 0.72);
              overlayRoot.add(dot);
            }
            trackBeaconMaterial(dotMaterial, 0.34);
          }

          if (activeLayer === 'questions') {
            const pulseMaterial = createGlowMaterial(heatColor, 0.11 + point.heat * 0.09);
            const pulse = new THREE.Mesh(
              new THREE.TorusGeometry(0.22 + point.heat * 0.22, 0.01, 8, 48),
              pulseMaterial,
            );
            pulse.name = `question_pulse_${point.id}`;
            pulse.rotation.x = -Math.PI / 2;
            pulse.position.set(world.x, world.y + 0.16, world.z);
            overlayRoot.add(pulse);
            trackBeaconMaterial(pulseMaterial);

            const bubbleMaterial = createGlowMaterial(heatColor, 0.10 + point.heat * 0.10);
            const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.055 + point.heat * 0.035, 14, 10), bubbleMaterial);
            bubble.name = `question_bubble_${point.id}`;
            bubble.position.set(world.x, world.y + 0.58 + point.heat * 0.42, world.z);
            overlayRoot.add(bubble);
            const tail = new THREE.Mesh(
              new THREE.CylinderGeometry(0.012, 0.022, 0.38 + point.heat * 0.26, 8),
              bubbleMaterial,
            );
            tail.name = `question_tail_${point.id}`;
            tail.position.set(world.x, world.y + 0.34 + point.heat * 0.2, world.z);
            overlayRoot.add(tail);
            trackBeaconMaterial(bubbleMaterial);
          }

          if (activeLayer === 'satisfaction') {
            const risk = clamp((4.8 - point.satisfaction) / 1.7, 0.08, 1);
            const riskMaterial = createGlowMaterial(heatColor, 0.08 + risk * 0.14);
            const spikeHeight = 0.25 + risk * 1.3;
            const spike = new THREE.Mesh(
              new THREE.CylinderGeometry(0.035, 0.085, spikeHeight, 12, 1, true),
              riskMaterial,
            );
            spike.name = `risk_spike_${point.id}`;
            spike.position.set(world.x, world.y + spikeHeight / 2 + 0.08, world.z);
            overlayRoot.add(spike);
            const warning = new THREE.Mesh(
              new THREE.ConeGeometry(0.16 + risk * 0.12, 0.16 + risk * 0.08, 3),
              riskMaterial,
            );
            warning.name = `risk_warning_triangle_${point.id}`;
            warning.rotation.set(Math.PI / 2, 0, Math.PI / 6);
            warning.position.set(world.x, world.y + 0.055, world.z);
            overlayRoot.add(warning);
            trackBeaconMaterial(riskMaterial);
          }

          if (activeLayer === 'consumption') {
            const opportunityMaterial = createGlowMaterial(heatColor, 0.10 + point.heat * 0.12);
            const coin = new THREE.Mesh(
              new THREE.TorusGeometry(0.18 + point.heat * 0.2, 0.018, 8, 48),
              opportunityMaterial,
            );
            coin.name = `consumption_opportunity_${point.id}`;
            coin.rotation.x = -Math.PI / 2;
            coin.position.set(world.x, world.y + 0.18, world.z);
            overlayRoot.add(coin);
            const stackCount = point.heat > 0.74 ? 3 : point.heat > 0.50 ? 2 : 1;
            for (let stackIndex = 0; stackIndex < stackCount; stackIndex += 1) {
              const angle = pointIndex * 0.76 + stackIndex * 2.1;
              const stack = new THREE.Mesh(
                new THREE.CylinderGeometry(0.055, 0.055, 0.035, 18),
                opportunityMaterial,
              );
              stack.name = `consumption_stack_${point.id}_${stackIndex}`;
              stack.position.set(
                world.x + Math.cos(angle) * (0.16 + stackIndex * 0.055),
                world.y + 0.08 + stackIndex * 0.045,
                world.z + Math.sin(angle) * (0.12 + stackIndex * 0.045),
              );
              overlayRoot.add(stack);
            }
            trackBeaconMaterial(opportunityMaterial);
          }

          if (point.level !== 'minor') {
            const beaconHeight = point.level === 'core' ? 1.85 : 1.15;
            const beaconMaterial = new THREE.MeshBasicMaterial({
              color: point.level === 'core' ? heatColor : layerColor,
              transparent: true,
              opacity: activeLayer === 'route' ? 0.08 : point.level === 'core' ? 0.12 : 0.08,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            });
            const beacon = new THREE.Mesh(
              new THREE.CylinderGeometry(0.055, 0.12, beaconHeight, 18, 1, true),
              beaconMaterial,
            );
            beacon.name = `poi_beacon_${point.id}`;
            beacon.position.set(world.x, world.y + beaconHeight / 2, world.z);
            trackBeaconMaterial(beaconMaterial);
            overlayRoot.add(beacon);

            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.26 + point.heat * 0.22, 0.012, 8, 48),
              new THREE.MeshBasicMaterial({
                color: point.level === 'core' ? heatColor : layerColor,
                transparent: true,
                opacity: activeLayer === 'route' ? 0.28 : 0.18,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
              }),
            );
            ring.name = `poi_ground_ring_${point.id}`;
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(world.x, world.y + 0.02, world.z);
            overlayRoot.add(ring);
          }

          if (hasImportedModel && !labelAnchors[point.id]) {
            const anchor = new THREE.Object3D();
            anchor.position.set(world.x, world.y + (point.level === 'core' ? 1.15 : 0.72), world.z);
            overlayRoot.add(anchor);
            labelAnchors[point.id] = anchor;
          }

          if (!hasImportedModel) {
            let spotObject: import('three').Object3D;
            if (point.id === 'ling-shan-da-fo') spotObject = createBuddha(point);
            else if (point.id === 'fan-gong') spotObject = createPalace(point);
            else if (point.id === 'jiu-long-guan-yu') spotObject = createWaterShow(point);
            else if (point.id === 'wu-yin-tan-cheng' || point.id === 'man-fei-long-ta') spotObject = createTower(point);
            else if (point.id === 'xiang-fu-chan-si' || point.id === 'san-sheng-dian') spotObject = createTemple(point, point.id === 'xiang-fu-chan-si' ? 1.05 : 0.86);
            else if (point.id === 'fo-shou-guang-chang' || point.id === 'bai-zi-xi-mi-le') spotObject = createPlaza(point);
            else spotObject = createGenericMarker(point);

            const anchor = new THREE.Object3D();
            anchor.position.set(0, point.level === 'core' ? 1.55 : point.level === 'major' ? 0.9 : 0.54, 0);
            spotObject.add(anchor);
            labelAnchors[point.id] = anchor;
          }
        });

        const routePoints = routeOrder
          .map((id) => points.find((point) => point.id === id))
          .filter((point): point is MapPoint => Boolean(point))
          .map((point) => {
            const world = getPointWorld(point);
            return new THREE.Vector3(world.x, world.y + 0.05, world.z);
          });

        let routeCurve: import('three').CatmullRomCurve3 | null = null;
        if (routePoints.length > 1) {
          routeCurve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.24);
          const routeMaterial = materialPath.clone();
          routeMaterial.color.set(activeLayer === 'route' ? 0x6a9c89 : 0x7dfbff);
          routeMaterial.opacity = activeLayer === 'route' ? 0.26 : 0.14;
          const routeMesh = new THREE.Mesh(
            new THREE.TubeGeometry(routeCurve, 120, activeLayer === 'route' ? 0.034 : 0.026, 8, false),
            routeMaterial,
          );
          overlayRoot.add(routeMesh);

          const dotGeometry = new THREE.SphereGeometry(0.065, 12, 8);
          const dotMaterial = new THREE.MeshBasicMaterial({
            color: activeLayer === 'route' ? 0xc9a96e : 0x7dfbff,
            transparent: true,
            opacity: activeLayer === 'route' ? 0.42 : 0.12,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          for (let index = 0; index < 10; index += 1) {
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            dot.userData.offset = index / 10;
            routeDots.push(dot);
            overlayRoot.add(dot);
          }
        }

        if (activeLayer === 'route' && routePreference?.links?.length) {
          const linkMax = Math.max(...routePreference.links.map((link) => link.value), 1);
          routePreference.links
            .slice()
            .sort((left, right) => right.value - left.value)
            .slice(0, 7)
            .forEach((link, index) => {
              const sourcePoint = findPointByBusinessName(points, link.source);
              const targetPoint = findPointByBusinessName(points, link.target);
              if (!sourcePoint || !targetPoint) return;
              const source = getPointWorld(sourcePoint);
              const target = getPointWorld(targetPoint);
              const strength = clamp(link.value / linkMax, 0.18, 1);
              const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(source.x, source.y + 0.16, source.z),
                new THREE.Vector3((source.x + target.x) / 2, Math.max(source.y, target.y) + 0.36 + strength * 0.22, (source.z + target.z) / 2),
                new THREE.Vector3(target.x, target.y + 0.16, target.z),
              ], false, 'catmullrom', 0.32);
              const linkMaterial = new THREE.MeshBasicMaterial({
                color: index === 0 ? 0xc9a96e : 0x68c5be,
                transparent: true,
                opacity: 0.10 + strength * 0.20,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
              });
              const linkMesh = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 72, 0.018 + strength * 0.042, 8, false),
                linkMaterial,
              );
              linkMesh.name = `route_flow_${index + 1}_${sourcePoint.id}_${targetPoint.id}`;
              overlayRoot.add(linkMesh);
              trackBeaconMaterial(linkMaterial);

              const arrowMaterial = linkMaterial.clone();
              const arrow = new THREE.Mesh(
                new THREE.ConeGeometry(0.06 + strength * 0.06, 0.16 + strength * 0.10, 16),
                arrowMaterial,
              );
              arrow.name = `route_arrow_${index + 1}_${targetPoint.id}`;
              arrow.position.set(target.x, target.y + 0.28 + strength * 0.12, target.z);
              arrow.rotation.x = Math.PI;
              overlayRoot.add(arrow);
              trackBeaconMaterial(arrowMaterial);
            });
        }

        const resize = () => {
          if (!renderer) return;
          const width = Math.max(1, board.clientWidth);
          const heightValue = Math.max(1, board.clientHeight);
          renderer.setSize(width, heightValue, false);
          camera.aspect = width / heightValue;
          camera.updateProjectionMatrix();
        };
        resize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(board);

        const pointer = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();
        let isPointerDown = false;
        let startX = 0;
        let startY = 0;
        let moved = false;
        let yawAtStart = -0.06;
        let currentYaw = -0.06;
        const targetYaw = { current: -0.06 };

        const getSpotIdFromObject = (object: import('three').Object3D | null) => {
          let cursor = object;
          while (cursor) {
            if (typeof cursor.userData.spotId === 'string') return cursor.userData.spotId as string;
            cursor = cursor.parent;
          }
          return null;
        };

        const pickSpot = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects(clickableObjects, true)[0];
          return getSpotIdFromObject(hit?.object ?? null);
        };

        const handlePointerDown = (event: PointerEvent) => {
          isPointerDown = true;
          moved = false;
          startX = event.clientX;
          startY = event.clientY;
          yawAtStart = targetYaw.current;
          canvas.setPointerCapture?.(event.pointerId);
          canvas.style.cursor = 'grabbing';
        };

        const handlePointerMove = (event: PointerEvent) => {
          if (isPointerDown) {
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            moved = moved || Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4;
            targetYaw.current = yawAtStart + deltaX * 0.006;
            return;
          }
          const spotId = pickSpot(event);
          setHoveredSpotId(spotId);
          canvas.style.cursor = spotId ? 'pointer' : 'grab';
        };

        const handlePointerUp = (event: PointerEvent) => {
          isPointerDown = false;
          canvas.releasePointerCapture?.(event.pointerId);
          canvas.style.cursor = 'grab';
          if (!moved) {
            const spotId = pickSpot(event);
            if (spotId) setSelectedSpotId(spotId);
          }
        };

        const handleWheel = (event: WheelEvent) => {
          event.preventDefault();
          cameraDistance = clamp(cameraDistance + event.deltaY * 0.006, 9.2, 14.8);
          syncCamera();
          resize();
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.style.cursor = 'grab';
        cleanupEvents = () => {
          canvas.removeEventListener('pointerdown', handlePointerDown);
          canvas.removeEventListener('pointermove', handlePointerMove);
          canvas.removeEventListener('pointerup', handlePointerUp);
          canvas.removeEventListener('pointerleave', handlePointerUp);
          canvas.removeEventListener('wheel', handleWheel);
        };

        const clock = new THREE.Clock();
        const projected = new THREE.Vector3();
        const updateLabels = () => {
          const width = board.clientWidth;
          const heightValue = board.clientHeight;
          const projectedRoutePoints = new Map<string, ProjectedRoutePoint>();
          Object.entries(labelAnchors).forEach(([id, anchor]) => {
            const element = labelRefs.current[id];
            const markerElement = dataMarkerRefs.current[id];
            projected.setFromMatrixPosition(anchor.matrixWorld).project(camera);
            const visible = projected.z < 1 && projected.z > -1;
            const left = clamp((projected.x * 0.5 + 0.5) * width, 58, width - 58);
            const top = clamp((-projected.y * 0.5 + 0.5) * heightValue, 42, heightValue - 42);
            const markerOffset = typeof anchor.userData?.markerYOffset === 'number' ? anchor.userData.markerYOffset : 10;
            const markerTop = clamp(top + markerOffset, 36, heightValue - 32);
            projectedRoutePoints.set(id, {
              x: toSvgPercent(left, width),
              y: toSvgPercent(markerTop, heightValue),
              visible,
            });
            if (element) {
              element.style.transform = `translate3d(${left}px, ${top}px, 0) translate(-50%, -118%)`;
              element.style.opacity = visible ? '1' : '0';
              element.style.pointerEvents = visible ? 'auto' : 'none';
            }
            if (markerElement) {
              markerElement.style.transform = `translate3d(${left}px, ${markerTop}px, 0) translate(-50%, -50%)`;
              markerElement.style.opacity = visible ? '' : '0';
            }
          });

          const routePoints = routeOrder
            .map((id) => projectedRoutePoints.get(id))
            .filter((point): point is ProjectedRoutePoint => Boolean(point));
          if (routeSpineRef.current && routePoints.length > 1) {
            routeSpineRef.current.setAttribute('d', createProjectedRoutePath(routePoints));
            routeSpineRef.current.style.opacity = routePoints.some((point) => point.visible) ? '' : '0';
          }

          routeLinkPaths.forEach((link) => {
            const element = routeFlowRefs.current[link.key];
            const source = projectedRoutePoints.get(link.sourceId);
            const target = projectedRoutePoints.get(link.targetId);
            if (!element || !source || !target) return;
            element.setAttribute('d', createProjectedLinkPath(source, target, link.strength));
            element.style.opacity = source.visible || target.visible ? '' : '0';
          });
        };

        const animate = () => {
          if (disposed || !renderer || !scene) return;
          frameId = window.requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const idleYaw = isPointerDown ? 0 : Math.sin(elapsed * 0.18) * 0.03;
          currentYaw += (targetYaw.current + idleYaw - currentYaw) * 0.08;
          root.rotation.y = currentYaw;

          heatMaterials.forEach((material, index) => {
            const userData = (material as import('three').MeshBasicMaterial & { userData?: { baseOpacity?: number; maxOpacity?: number } }).userData;
            const baseOpacity = userData?.baseOpacity ?? 0.08;
            const maxOpacity = userData?.maxOpacity ?? 0.52;
            const pulse = Math.sin(elapsed * 1.15 + index * 0.7) * Math.min(0.018, baseOpacity * 0.32);
            material.opacity = clamp(baseOpacity + pulse, 0.012, maxOpacity);
          });

          beaconMaterials.forEach((material, index) => {
            const userData = (material as import('three').MeshBasicMaterial & { userData?: { baseOpacity?: number; maxOpacity?: number } }).userData;
            const baseOpacity = userData?.baseOpacity ?? material.opacity;
            const maxOpacity = userData?.maxOpacity ?? Math.max(0.14, baseOpacity + 0.06);
            material.opacity = clamp(baseOpacity + Math.sin(elapsed * 1.25 + index) * 0.018, 0.02, maxOpacity);
          });

          if (routeCurve) {
            routeDots.forEach((dot) => {
              const point = routeCurve!.getPoint((elapsed * 0.045 + dot.userData.offset) % 1);
              dot.position.copy(point);
              dot.position.y += 0.09 + Math.sin(elapsed * 2.2 + dot.userData.offset * 8) * 0.025;
            });
          }

          root.updateMatrixWorld();
          camera.updateMatrixWorld();
          updateLabels();
          renderer.render(scene, camera);
        };

        setRenderError('');
        animate();
      } catch (error) {
        setRenderError(error instanceof Error ? error.message : '当前浏览器无法初始化 WebGL 场景');
      }
    };

    init();

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      cleanupEvents?.();
      if (renderer && scene) {
        import('three').then((THREE) => {
          disposeObject(THREE, scene!, true);
          renderer?.dispose();
        }).catch(() => renderer?.dispose());
      } else {
        renderer?.dispose();
      }
    };
  }, [routeLinkPaths, scenePoints, visualMode]);

  return (
    <section
      className={`scenic-map-stage scenic-map-stage--three scenic-map-stage--${visualMode} scenic-map-stage--layer-${activeLayer}${isLayerSwitching ? ' scenic-map-stage--switching' : ''}`}
      style={{ minHeight, height }}
    >
      {showHeader && (
        <div className="scenic-map-stage__header">
          <div>LINGSHAN 3D OPERATIONS TWIN</div>
          <h1>灵山胜境智慧文旅三维沙盘</h1>
        </div>
      )}

      <div className="scenic-map-stage__board" ref={boardRef}>
        <canvas ref={canvasRef} className="scenic-map-stage__canvas" aria-label="灵山胜境三维运营沙盘" />
        <div className="scenic-map-stage__vignette" />

        <div
          key={activeLayer}
          className={`scenic-map-stage__data-layer scenic-map-stage__data-layer--${activeLayer}`}
          aria-hidden="true"
        >
          <svg className="scenic-map-stage__flow-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {activeLayer === 'route' && routeOverlayPath && (
              <path ref={routeSpineRef} className="scenic-map-stage__route-spine" d={routeOverlayPath} />
            )}
            {activeLayer === 'route' && routeLinkPaths.map((path) => (
              <path
                key={path.key}
                ref={(node) => {
                  routeFlowRefs.current[path.key] = node;
                }}
                className="scenic-map-stage__route-flow"
                d={path.d}
                style={{ '--flow-strength': path.strength.toFixed(3) } as React.CSSProperties & { '--flow-strength': string }}
              />
            ))}
          </svg>
          {points.map((point) => (
            <span
              key={`${activeLayer}-${point.id}`}
              ref={(node) => {
                dataMarkerRefs.current[point.id] = node;
              }}
              className={[
                'scenic-map-stage__data-marker',
                `scenic-map-stage__data-marker--${activeLayer}`,
                `scenic-map-stage__data-marker--${point.level}`,
                rankedPointIds.has(point.id) ? 'scenic-map-stage__data-marker--peak' : '',
                activeLayer === 'satisfaction' && point.satisfaction < 3.8 ? 'scenic-map-stage__data-marker--risk' : '',
              ].filter(Boolean).join(' ')}
              style={getDataMarkerStyle(point, activeLayer)}
            >
              <b>{getDataMarkerGlyph(activeLayer)}</b>
              <i />
            </span>
          ))}
        </div>

        <div className="scenic-map-stage__labels">
          {points.filter((point) => (
            point.level === 'core'
            || rankedPointIds.has(point.id)
            || selectedPoint?.id === point.id
            || hoveredSpotId === point.id
          )).map((point) => (
            <button
              type="button"
              key={point.id}
              ref={(node) => {
                labelRefs.current[point.id] = node;
              }}
              className={[
                'scenic-map-stage__label',
                `scenic-map-stage__label--${point.level}`,
                `scenic-map-stage__label--layer-${activeLayer}`,
                rankedPointIds.has(point.id) ? 'scenic-map-stage__label--peak' : '',
                selectedPoint?.id === point.id ? 'scenic-map-stage__label--active' : '',
                hoveredSpotId === point.id ? 'scenic-map-stage__label--hover' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedSpotId(point.id)}
            >
              {rankedPointRanks.has(point.id) && <em>#{rankedPointRanks.get(point.id)}</em>}
              <span>{point.shortName}</span>
              <i>{getPointLayerBadge(point, activeLayer)}</i>
            </button>
          ))}
        </div>

        {renderError && (
          <div className="scenic-map-stage__empty">
            WebGL 沙盘加载失败：{renderError}
          </div>
        )}
      </div>

      {visualMode === 'embedded' && (
        <div className="scenic-map-stage__layer-readout">
          <span>ACTIVE DATA LAYER</span>
          <strong>{meta.label}{primaryLayerPoint ? ` · ${primaryLayerPoint.shortName}` : ''}</strong>
          <small>
            {primaryLayerPoint
              ? `${meta.metric} ${getPointLayerBadge(primaryLayerPoint, activeLayer)} · ${getLayerStrengthText(activeLayer)}`
              : getLayerStrengthText(activeLayer)}
          </small>
          <div>
            <i />
            <b>{meta.scale}</b>
          </div>
        </div>
      )}

      <div className="scenic-map-stage__hud">
        <span>{sceneMode === 'model' ? 'GLB SCENE LOADED' : 'WEBGL FALLBACK MAP'}</span>
        <strong>{meta.label}</strong>
        <small>{sceneMode === 'model' ? '精模沙盘 · 数据叠加 · 点击景点聚焦' : '缺少 lingshan-scene.glb · 当前显示兜底沙盘'}</small>
      </div>

      {selectedPoint && (
        <div className="scenic-map-stage__focus-card">
          <span>当前聚焦</span>
          <strong>{selectedPoint.name}</strong>
          <div>
            <small>热力 {formatNumber(selectedPoint.heat * 100)}%</small>
            <small>访问 {formatNumber(selectedPoint.visits)}</small>
            <small>满意 {formatNumber(selectedPoint.satisfaction, 1)}</small>
          </div>
        </div>
      )}

      <div className="scenic-map-stage__caption">
        <strong>{meta.label}</strong>
        <span>{meta.description}</span>
      </div>

      {showLegend && (
        <div className="scenic-map-stage__legend">
          <span style={{ background: meta.color }} />
          <div>
            <strong>{meta.label}</strong>
            <small>{meta.description}</small>
          </div>
        </div>
      )}

      <style>
        {`
          .scenic-map-stage {
            position: relative;
            --stage-layer-color: #F05A28;
            --stage-layer-rgb: 240, 90, 40;
            border-radius: 30px;
            overflow: hidden;
            background:
              radial-gradient(circle at 50% 42%, rgba(32, 214, 255, 0.20), transparent 36%),
              radial-gradient(circle at 52% 56%, rgba(255, 133, 48, 0.10), transparent 24%),
              linear-gradient(180deg, rgba(5, 23, 41, 0.96), rgba(3, 13, 28, 0.94));
            border: 1px solid rgba(77, 244, 255, 0.24);
            box-shadow: 0 20px 58px rgba(1, 15, 28, 0.28), inset 0 0 42px rgba(77, 244, 255, 0.08);
            isolation: isolate;
          }

          .scenic-map-stage--layer-traffic {
            --stage-layer-color: #5AD9D3;
            --stage-layer-rgb: 90, 217, 211;
          }

          .scenic-map-stage--layer-questions {
            --stage-layer-color: #7BCDD2;
            --stage-layer-rgb: 123, 205, 210;
          }

          .scenic-map-stage--layer-satisfaction {
            --stage-layer-color: #C9A96E;
            --stage-layer-rgb: 201, 169, 110;
          }

          .scenic-map-stage--layer-route {
            --stage-layer-color: #6A9C89;
            --stage-layer-rgb: 106, 156, 137;
          }

          .scenic-map-stage--layer-consumption {
            --stage-layer-color: #C9A96E;
            --stage-layer-rgb: 201, 169, 110;
          }

          .scenic-map-stage--embedded {
            border-radius: 0;
            overflow: visible;
            background: transparent;
            border: 0;
            box-shadow: none;
            isolation: auto;
          }

          .scenic-map-stage::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(rgba(77, 244, 255, 0.10) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77, 244, 255, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, transparent 0 47%, rgba(255, 139, 61, 0.10) 48% 49%, transparent 50%);
            background-size: auto, 58px 58px, 58px 58px;
            mask-image: radial-gradient(circle at 50% 48%, black, transparent 76%);
          }

          .scenic-map-stage--embedded::before {
            inset: -7% -5% -4%;
            background:
              radial-gradient(ellipse at 50% 54%, rgba(77, 244, 255, 0.12), rgba(77, 244, 255, 0.045) 32%, transparent 66%),
              radial-gradient(ellipse at 50% 58%, rgba(201, 169, 110, 0.025), transparent 40%),
              repeating-radial-gradient(ellipse at 50% 58%, rgba(77, 244, 255, 0.14) 0 1px, transparent 1px 38px);
            background-size: auto;
            mask-image: radial-gradient(ellipse at 50% 56%, rgba(0,0,0,0.92), transparent 72%);
          }

          .scenic-map-stage__header {
            position: absolute;
            top: 20px;
            left: 50%;
            z-index: 12;
            transform: translateX(-50%);
            text-align: center;
            pointer-events: none;
          }

          .scenic-map-stage__header div {
            color: #C84B31;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.34em;
          }

          .scenic-map-stage__header h1 {
            margin: 5px 0 0;
            color: #2A2520;
            font-family: var(--font-serif);
            font-size: 24px;
            line-height: 1;
            letter-spacing: 0.16em;
          }

          .scenic-map-stage__board {
            position: absolute;
            inset: 0;
            overflow: hidden;
          }

          .scenic-map-stage__board::after {
            content: '';
            position: absolute;
            inset: 3% 8%;
            z-index: 9;
            pointer-events: none;
            opacity: 0;
            background:
              linear-gradient(90deg, transparent 0 18%, rgba(var(--stage-layer-rgb), 0.18) 48%, transparent 82%),
              radial-gradient(ellipse at 50% 54%, rgba(var(--stage-layer-rgb), 0.12), transparent 58%);
            filter: blur(0.4px);
            transform: translateX(-12%) skewX(-8deg);
            transition: opacity 180ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
            mix-blend-mode: screen;
          }

          .scenic-map-stage--embedded .scenic-map-stage__board {
            overflow: visible;
          }

          .scenic-map-stage__canvas {
            position: absolute;
            inset: 0;
            z-index: 2;
            width: 100%;
            height: 100%;
            display: block;
            touch-action: none;
            transition: opacity 180ms ease, filter 220ms ease;
            will-change: opacity, filter;
          }

          .scenic-map-stage--embedded .scenic-map-stage__canvas {
            filter: saturate(1.05) contrast(1.02);
          }

          .scenic-map-stage--switching .scenic-map-stage__canvas {
            opacity: 0.96;
            filter: saturate(1.02) contrast(1.01);
          }

          .scenic-map-stage--switching .scenic-map-stage__board::after {
            opacity: 1;
            transform: translateX(12%) skewX(-8deg);
          }

          .scenic-map-stage__vignette {
            position: absolute;
            inset: 0;
            z-index: 4;
            pointer-events: none;
            background:
              radial-gradient(circle at 50% 43%, transparent 35%, rgba(0, 12, 25, 0.36) 76%, rgba(0, 8, 18, 0.74) 100%),
              linear-gradient(180deg, rgba(77, 244, 255, 0.08), transparent 18%, transparent 76%, rgba(0, 12, 25, 0.58));
          }

          .scenic-map-stage--embedded .scenic-map-stage__vignette {
            background:
              radial-gradient(ellipse at 50% 48%, transparent 48%, rgba(255, 248, 229, 0.06) 70%, rgba(246, 237, 215, 0.34) 96%),
              linear-gradient(180deg, transparent, rgba(255, 248, 229, 0.10));
            mix-blend-mode: multiply;
          }

          .scenic-map-stage__data-layer {
            position: absolute;
            inset: 0;
            z-index: 6;
            pointer-events: none;
            contain: layout paint;
            animation: dataLayerIn 240ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .scenic-map-stage__flow-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
          }

          .scenic-map-stage__route-spine,
          .scenic-map-stage__route-flow {
            fill: none;
            vector-effect: non-scaling-stroke;
            stroke-linecap: round;
            stroke-linejoin: round;
          }

          .scenic-map-stage__route-spine {
            stroke: rgba(106, 156, 137, 0.44);
            stroke-width: 6;
            stroke-dasharray: 1 2;
            filter: drop-shadow(0 0 8px rgba(90, 217, 211, 0.30));
          }

          .scenic-map-stage__route-flow {
            stroke: rgba(201, 169, 110, calc(0.18 + var(--flow-strength) * 0.40));
            stroke-width: calc(3px + var(--flow-strength) * 8px);
            stroke-dasharray: 10 7;
            animation: routeFlowDash 900ms linear infinite;
            filter: drop-shadow(0 0 9px rgba(201, 169, 110, 0.34));
          }

          .scenic-map-stage__data-marker {
            position: absolute;
            left: 0;
            top: 0;
            width: var(--marker-size);
            height: calc(var(--marker-size) * 0.62);
            transform: translate(-50%, -50%);
            opacity: calc(0.32 + var(--heat) * 0.42);
            mix-blend-mode: multiply;
            will-change: transform, opacity;
          }

          .scenic-map-stage__data-marker::before,
          .scenic-map-stage__data-marker::after,
          .scenic-map-stage__data-marker b,
          .scenic-map-stage__data-marker i {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }

          .scenic-map-stage__data-marker::before,
          .scenic-map-stage__data-marker::after {
            content: '';
          }

          .scenic-map-stage__data-marker b {
            z-index: 3;
            display: grid;
            place-items: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            color: #fff;
            background: rgba(38, 126, 138, 0.70);
            box-shadow: 0 0 0 4px rgba(90, 217, 211, 0.14), 0 6px 14px rgba(42, 37, 32, 0.10);
            font-family: var(--font-mono);
            font-size: 11px;
            font-weight: 900;
          }

          .scenic-map-stage__data-marker--traffic::before {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background:
              radial-gradient(ellipse at center, rgba(223, 100, 45, 0.54), rgba(222, 164, 78, 0.30) 30%, rgba(90, 217, 211, 0.13) 58%, transparent 74%);
            box-shadow: inset 0 0 0 1px rgba(240, 90, 40, 0.22);
          }

          .scenic-map-stage__data-marker--traffic::after {
            width: calc(var(--marker-size) * 0.78);
            height: calc(var(--marker-size) * 0.46);
            border: 1px solid rgba(240, 90, 40, 0.38);
            border-radius: 50%;
            transform: translate(-50%, -50%) rotate(-8deg);
          }

          .scenic-map-stage__data-marker--traffic i {
            top: auto;
            bottom: 50%;
            width: 9px;
            height: var(--bar-height);
            border-radius: 999px 999px 0 0;
            transform: translate(-50%, 3px);
            background: linear-gradient(180deg, rgba(240, 90, 40, 0.48), rgba(90, 217, 211, 0.08));
            box-shadow: 0 0 14px rgba(240, 90, 40, 0.18);
          }

          .scenic-map-stage__data-marker--traffic b {
            display: none;
          }

          .scenic-map-stage__data-marker--questions::before {
            width: calc(var(--marker-size) * 0.72);
            height: calc(var(--marker-size) * 0.72);
            border-radius: 50%;
            border: 2px solid rgba(200, 75, 49, 0.34);
            background: radial-gradient(circle, rgba(200, 75, 49, 0.28), rgba(90, 217, 211, 0.10) 52%, transparent 74%);
            animation: questionPulse 1.25s ease-out infinite;
          }

          .scenic-map-stage__data-marker--questions::after {
            width: 2px;
            height: var(--bar-height);
            background: linear-gradient(180deg, rgba(200, 75, 49, 0.44), rgba(90, 217, 211, 0.08));
            transform: translate(-50%, -88%);
          }

          .scenic-map-stage__data-marker--questions b {
            background: rgba(200, 75, 49, 0.76);
          }

          .scenic-map-stage__data-marker--satisfaction {
            opacity: calc(0.30 + var(--risk) * 0.58);
          }

          .scenic-map-stage__data-marker--satisfaction::before {
            width: calc(30px + var(--risk) * 54px);
            height: calc(26px + var(--risk) * 48px);
            clip-path: polygon(50% 0, 100% 92%, 0 92%);
            background: linear-gradient(180deg, rgba(190, 88, 46, 0.54), rgba(211, 154, 34, 0.22));
            filter: drop-shadow(0 0 10px rgba(190, 88, 46, 0.20));
          }

          .scenic-map-stage__data-marker--satisfaction::after {
            width: calc(42px + var(--risk) * 82px);
            height: calc(24px + var(--risk) * 42px);
            border: 1px solid rgba(190, 88, 46, 0.30);
            border-radius: 50%;
            transform: translate(-50%, -18%) rotate(-8deg);
          }

          .scenic-map-stage__data-marker--satisfaction b {
            background: rgba(190, 88, 46, 0.76);
          }

          .scenic-map-stage__data-marker--satisfaction:not(.scenic-map-stage__data-marker--risk)::before {
            background: linear-gradient(180deg, rgba(106, 156, 137, 0.34), rgba(90, 217, 211, 0.10));
          }

          .scenic-map-stage__data-marker--route {
            width: calc(var(--marker-size) * 0.82);
            height: calc(var(--marker-size) * 0.54);
            opacity: calc(0.38 + var(--heat) * 0.48);
          }

          .scenic-map-stage__data-marker--route::before {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(106, 156, 137, 0.26);
            box-shadow: 0 0 0 calc(8px + var(--heat) * 12px) rgba(106, 156, 137, 0.10), 0 0 18px rgba(90, 217, 211, 0.20);
          }

          .scenic-map-stage__data-marker--route::after {
            width: calc(34px + var(--heat) * 38px);
            height: 2px;
            border-radius: 999px;
            background: linear-gradient(90deg, transparent, rgba(106, 156, 137, 0.58), rgba(201, 169, 110, 0.58));
            transform: translate(-18%, -50%) rotate(-12deg);
          }

          .scenic-map-stage__data-marker--route b {
            background: rgba(106, 156, 137, 0.76);
          }

          .scenic-map-stage__data-marker--consumption::before {
            width: calc(34px + var(--heat) * 58px);
            height: calc(34px + var(--heat) * 58px);
            border-radius: 50%;
            border: calc(3px + var(--heat) * 3px) solid rgba(201, 169, 110, 0.42);
            box-shadow: inset 0 0 0 8px rgba(201, 169, 110, 0.08), 0 0 18px rgba(201, 169, 110, 0.18);
          }

          .scenic-map-stage__data-marker--consumption::after {
            width: calc(16px + var(--heat) * 20px);
            height: calc(24px + var(--heat) * 42px);
            border-radius: 999px 999px 4px 4px;
            background:
              repeating-linear-gradient(180deg, rgba(255, 244, 202, 0.58) 0 4px, rgba(201, 169, 110, 0.42) 4px 7px);
            transform: translate(-50%, -78%);
            box-shadow: 0 0 14px rgba(201, 169, 110, 0.18);
          }

          .scenic-map-stage__data-marker--consumption b {
            color: #7A5628;
            background: rgba(255, 244, 202, 0.86);
            box-shadow: 0 0 0 4px rgba(201, 169, 110, 0.16), 0 6px 14px rgba(42, 37, 32, 0.10);
          }

          .scenic-map-stage__data-marker--peak {
            opacity: 0.92;
          }

          .scenic-map-stage__data-marker--core {
            z-index: 2;
          }

          @keyframes dataLayerIn {
            from { opacity: 0; transform: translateY(5px) scale(0.992); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes routeFlowDash {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -34; }
          }

          @keyframes questionPulse {
            0% { transform: translate(-50%, -50%) scale(0.72); opacity: 0.92; }
            100% { transform: translate(-50%, -50%) scale(1.24); opacity: 0.14; }
          }

          .scenic-map-stage__labels {
            position: absolute;
            inset: 0;
            z-index: 8;
            pointer-events: none;
          }

          .scenic-map-stage__label {
            position: absolute;
            left: 0;
            top: 0;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            min-width: 74px;
            min-height: 28px;
            padding: 5px 9px;
            border: 1px solid rgba(77, 244, 255, 0.36);
            border-radius: 999px;
            color: rgba(213, 252, 255, 0.92);
            background: rgba(4, 23, 42, 0.72);
            box-shadow: 0 8px 18px rgba(0, 10, 22, 0.20), inset 0 0 18px rgba(77, 244, 255, 0.08);
            font-size: 11px;
            line-height: 1;
            white-space: nowrap;
            transition: border-color 160ms ease, background 160ms ease, color 160ms ease, box-shadow 160ms ease;
            pointer-events: auto;
            cursor: pointer;
          }

          .scenic-map-stage__label::before {
            content: '';
            width: 6px;
            height: 6px;
            flex: 0 0 auto;
            border-radius: 50%;
            background: var(--stage-layer-color);
            box-shadow: 0 0 0 4px rgba(var(--stage-layer-rgb), 0.14), 0 0 12px rgba(var(--stage-layer-rgb), 0.36);
          }

          .scenic-map-stage--embedded .scenic-map-stage__label {
            min-width: 0;
            min-height: 21px;
            gap: 4px;
            padding: 3px 7px;
            border-color: rgba(var(--stage-layer-rgb), 0.20);
            border-radius: 2px;
            color: rgba(16, 76, 88, 0.92);
            background:
              linear-gradient(180deg, rgba(255, 253, 247, 0.44), rgba(245, 232, 200, 0.14)),
              linear-gradient(90deg, rgba(var(--stage-layer-rgb), 0.08), transparent 72%);
            box-shadow: 0 5px 10px rgba(42, 37, 32, 0.035);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            font-size: 10px;
          }

          .scenic-map-stage--embedded .scenic-map-stage__label i {
            display: inline;
            color: rgba(var(--stage-layer-rgb), 0.78);
            font-size: 9px;
          }

          .scenic-map-stage--embedded .scenic-map-stage__label--core {
            color: var(--stage-layer-color);
            border-color: rgba(var(--stage-layer-rgb), 0.46);
          }

          .scenic-map-stage--embedded .scenic-map-stage__label--peak {
            color: rgba(24, 100, 112, 0.96);
            border-color: rgba(var(--stage-layer-rgb), 0.46);
            background:
              linear-gradient(180deg, rgba(255, 253, 247, 0.52), rgba(245, 232, 200, 0.18)),
              linear-gradient(90deg, rgba(var(--stage-layer-rgb), 0.13), transparent 76%);
            box-shadow: 0 7px 14px rgba(42, 37, 32, 0.045), 0 0 0 3px rgba(var(--stage-layer-rgb), 0.035);
          }

          .scenic-map-stage--embedded .scenic-map-stage__label--peak i {
            color: rgba(var(--stage-layer-rgb), 0.82);
          }

          .scenic-map-stage--embedded .scenic-map-stage__label--active,
          .scenic-map-stage--embedded .scenic-map-stage__label--hover {
            color: #fff;
            border-color: rgba(var(--stage-layer-rgb), 0.62);
            background: linear-gradient(180deg, rgba(var(--stage-layer-rgb), 0.72), rgba(17, 103, 118, 0.62));
            box-shadow: 0 10px 22px rgba(var(--stage-layer-rgb), 0.13), 0 0 16px rgba(77, 244, 255, 0.10);
          }

          .scenic-map-stage--embedded .scenic-map-stage__hud,
          .scenic-map-stage--embedded .scenic-map-stage__focus-card,
          .scenic-map-stage--embedded .scenic-map-stage__caption {
            display: none;
          }

          .scenic-map-stage__label span {
            font-weight: 800;
          }

          .scenic-map-stage__label em {
            display: inline-grid;
            place-items: center;
            min-width: 22px;
            height: 17px;
            padding: 0 5px;
            border-radius: 999px;
            color: #fff;
            background: linear-gradient(180deg, rgba(var(--stage-layer-rgb), 0.74), rgba(16, 99, 112, 0.64));
            box-shadow: 0 0 10px rgba(var(--stage-layer-rgb), 0.14);
            font-family: var(--font-mono);
            font-size: 9px;
            font-style: normal;
            font-weight: 900;
          }

          .scenic-map-stage__label i {
            color: rgba(125, 251, 255, 0.62);
            font-family: var(--font-mono);
            font-size: 10px;
            font-style: normal;
          }

          .scenic-map-stage__label--core {
            color: #FFB066;
            border-color: rgba(255, 139, 61, 0.48);
            font-family: var(--font-serif);
            font-size: 12px;
          }

          .scenic-map-stage__label--active,
          .scenic-map-stage__label--hover {
            color: #fff;
            border-color: rgba(var(--stage-layer-rgb), 0.70);
            background: linear-gradient(180deg, rgba(var(--stage-layer-rgb), 0.74), rgba(17, 103, 118, 0.72));
            box-shadow: 0 12px 24px rgba(var(--stage-layer-rgb), 0.15), 0 0 16px rgba(77, 244, 255, 0.12);
          }

          .scenic-map-stage__label--active i,
          .scenic-map-stage__label--hover i {
            color: rgba(255, 255, 255, 0.72);
          }

          .scenic-map-stage__hud {
            position: absolute;
            left: 28px;
            top: 24px;
            z-index: 10;
            display: grid;
            gap: 4px;
            padding: 11px 13px;
            border: 1px solid rgba(201, 169, 110, 0.24);
            border-radius: 3px 16px 3px 16px;
            border-color: rgba(77, 244, 255, 0.28);
            background: rgba(4, 23, 42, 0.74);
            box-shadow: 0 10px 22px rgba(0, 10, 22, 0.26), inset 0 0 20px rgba(77, 244, 255, 0.08);
            pointer-events: none;
          }

          .scenic-map-stage__hud span {
            color: rgba(255, 139, 61, 0.82);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.28em;
          }

          .scenic-map-stage__hud strong {
            color: #D5FCFF;
            font-family: var(--font-serif);
            font-size: 15px;
          }

          .scenic-map-stage__hud small {
            color: rgba(213, 252, 255, 0.56);
            font-size: 11px;
          }

          .scenic-map-stage__focus-card {
            position: absolute;
            right: 26px;
            top: 24px;
            z-index: 10;
            display: grid;
            gap: 7px;
            min-width: 184px;
            padding: 12px 13px;
            border: 1px solid rgba(77, 244, 255, 0.24);
            border-radius: 3px 18px 3px 18px;
            background: rgba(4, 23, 42, 0.70);
            box-shadow: 0 12px 26px rgba(0, 10, 22, 0.24), inset 0 0 20px rgba(77, 244, 255, 0.08);
            pointer-events: none;
          }

          .scenic-map-stage__focus-card span {
            color: rgba(213, 252, 255, 0.48);
            font-size: 11px;
            letter-spacing: 0.18em;
          }

          .scenic-map-stage__focus-card strong {
            color: #FFB066;
            font-family: var(--font-serif);
            font-size: 20px;
            line-height: 1;
          }

          .scenic-map-stage__focus-card div {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .scenic-map-stage__focus-card small {
            padding: 4px 7px;
            border-radius: 999px;
            color: rgba(213, 252, 255, 0.70);
            background: rgba(77, 244, 255, 0.10);
            font-size: 10px;
          }

          .scenic-map-stage__caption {
            position: absolute;
            left: 28px;
            bottom: 24px;
            z-index: 10;
            display: grid;
            gap: 4px;
            max-width: 270px;
            padding: 10px 13px;
            border-radius: 16px;
            color: rgba(213, 252, 255, 0.62);
            background: rgba(4, 23, 42, 0.68);
            border: 1px solid rgba(77, 244, 255, 0.20);
            pointer-events: none;
          }

          .scenic-map-stage__caption strong {
            color: #D5FCFF;
            font-family: var(--font-serif);
            font-size: 13px;
          }

          .scenic-map-stage__caption span {
            font-size: 11px;
            line-height: 1.55;
          }

          .scenic-map-stage__empty {
            position: absolute;
            left: 50%;
            top: 50%;
            z-index: 14;
            max-width: min(460px, 80%);
            transform: translate(-50%, -50%);
            padding: 12px 18px;
            border-radius: 999px;
            color: rgba(42, 37, 32, 0.62);
            background: rgba(255, 248, 229, 0.88);
            border: 1px dashed rgba(201, 169, 110, 0.34);
            font-size: 13px;
            text-align: center;
          }

          .scenic-map-stage__legend {
            position: absolute;
            left: 50%;
            bottom: 24px;
            z-index: 12;
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(-50%);
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255, 248, 229, 0.88);
            border: 1px solid rgba(201, 169, 110, 0.28);
            box-shadow: 0 12px 24px rgba(42,37,32,0.10);
            pointer-events: none;
          }

          .scenic-map-stage__legend > span {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }

          .scenic-map-stage__legend strong,
          .scenic-map-stage__legend small {
            display: block;
          }

          .scenic-map-stage__legend strong {
            color: #2A2520;
            font-size: 13px;
          }

          .scenic-map-stage__legend small {
            color: rgba(42,37,32,0.52);
            font-size: 11px;
          }

          .scenic-map-stage__layer-readout {
            position: absolute;
            left: 52%;
            top: 10px;
            z-index: 14;
            display: grid;
            grid-template-columns: auto auto;
            grid-template-areas:
              "k scale"
              "title scale"
              "hint scale";
            column-gap: 18px;
            row-gap: 4px;
            min-width: 330px;
            padding: 7px 11px 8px 13px;
            transform: translateX(-50%);
            color: rgba(42, 37, 32, 0.58);
            background:
              linear-gradient(90deg, rgba(var(--stage-layer-rgb), 0.10), rgba(255, 253, 247, 0.38) 38%, rgba(255, 248, 229, 0.18)),
              rgba(255, 253, 247, 0.16);
            border-left: 2px solid var(--stage-layer-color);
            border-right: 1px solid rgba(var(--stage-layer-rgb), 0.18);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.54),
              inset 0 -1px 0 rgba(201, 169, 110, 0.14),
              0 10px 24px rgba(42, 37, 32, 0.045);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            pointer-events: none;
          }

          .scenic-map-stage__layer-readout span {
            grid-area: k;
            color: rgba(var(--stage-layer-rgb), 0.70);
            font-family: var(--font-mono);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.26em;
          }

          .scenic-map-stage__layer-readout strong {
            grid-area: title;
            color: #2A2520;
            font-family: var(--font-serif);
            font-size: 19px;
            line-height: 1;
            letter-spacing: 0.08em;
          }

          .scenic-map-stage__layer-readout small {
            grid-area: hint;
            max-width: 260px;
            overflow: hidden;
            color: rgba(42, 37, 32, 0.52);
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .scenic-map-stage__layer-readout div {
            grid-area: scale;
            align-self: center;
            display: grid;
            gap: 6px;
            min-width: 106px;
          }

          .scenic-map-stage__layer-readout div i {
            display: block;
            width: 112px;
            height: 7px;
            border-radius: 999px;
            background:
              linear-gradient(90deg, rgba(var(--stage-layer-rgb), 0.18), rgba(var(--stage-layer-rgb), 0.48), var(--stage-layer-color)),
              repeating-linear-gradient(90deg, transparent 0 31px, rgba(255,255,255,0.45) 31px 32px);
            box-shadow: 0 0 18px rgba(var(--stage-layer-rgb), 0.18);
          }

          .scenic-map-stage__layer-readout div b {
            color: rgba(42, 37, 32, 0.44);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            white-space: nowrap;
          }

          @media (max-height: 820px) {
            .scenic-map-stage__caption {
              display: none;
            }

            .scenic-map-stage__hud,
            .scenic-map-stage__focus-card {
              top: 14px;
            }

            .scenic-map-stage__layer-readout {
              top: 10px;
              transform: translateX(-50%) scale(0.92);
            }
          }

          @media (max-width: 1120px) {
            .scenic-map-stage__hud,
            .scenic-map-stage__focus-card {
              position: absolute;
              top: 16px;
            }

            .scenic-map-stage__hud {
              left: 16px;
            }

            .scenic-map-stage__focus-card {
              right: 16px;
            }
          }
        `}
      </style>
    </section>
  );
};

export default ScenicMapStage;
