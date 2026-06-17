/**
 * Costume ID → VRM model mapping.
 *
 * 6 festival costume styles (all festival-only, no daily).
 */

export type CostumeCategory = 'festival';

export interface CostumeDef {
  id: string;
  name: string;
  category: CostumeCategory;
  /** VRM model path */
  modelPath: string;
  /** Short description shown in UI */
  description: string;
  /** Festival month (1-12) for auto-detection. */
  festivalMonth: number | null;
  /** Festival day range [start, end]. Spans across months if end < start. */
  festivalDayRange: [number, number] | null;
}

export const COSTUMES: Record<string, CostumeDef> = {
  'festival-spring': {
    id: 'festival-spring',
    name: '锦绣红袍',
    category: 'festival',
    modelPath: '/models/8024308560058477433.vrm',
    description: '喜庆红色，春节氛围，默认导游装',
    festivalMonth: 1,
    festivalDayRange: [20, 10],
  },
  'festival-lantern': {
    id: 'festival-lantern',
    name: '灯彩华裳',
    category: 'festival',
    modelPath: '/models/4353238926149796085.vrm',
    description: '暖色调，元宵灯会',
    festivalMonth: 2,
    festivalDayRange: [14, 16],
  },
  'festival-qingming': {
    id: 'festival-qingming',
    name: '踏青轻衣',
    category: 'festival',
    modelPath: '/models/5186055420774500970.vrm',
    description: '青绿色调，春意盎然',
    festivalMonth: 4,
    festivalDayRange: [3, 6],
  },
  'festival-dragon': {
    id: 'festival-dragon',
    name: '龙舟竞渡',
    category: 'festival',
    modelPath: '/models/4104272907947728185.vrm',
    description: '蓝白配色，端午龙纹',
    festivalMonth: 6,
    festivalDayRange: [1, 10],
  },
  'festival-midautumn': {
    id: 'festival-midautumn',
    name: '月华裳',
    category: 'festival',
    modelPath: '/models/5784779633385764689.vrm',
    description: '桂花金+月白，中秋团圆',
    festivalMonth: 9,
    festivalDayRange: [10, 20],
  },
  'festival-national': {
    id: 'festival-national',
    name: '锦绣华章',
    category: 'festival',
    modelPath: '/models/8511002460770470367.vrm',
    description: '中国红+金，国庆庄严',
    festivalMonth: 10,
    festivalDayRange: [1, 7],
  },
};

/** All costume IDs in display order. */
export const ALL_COSTUME_IDS = Object.keys(COSTUMES);

/** Festival costume IDs (all costumes are festival-only now). */
export const FESTIVAL_COSTUME_IDS = ALL_COSTUME_IDS;

/** Daily costume IDs (empty — all costumes are festival-only). */
export const DAILY_COSTUME_IDS: string[] = [];

/** Get costume definition by ID. Falls back to festival-spring. */
export function getCostume(id: string): CostumeDef {
  return COSTUMES[id] ?? COSTUMES['festival-spring'];
}

/** Get VRM model path for a costume ID. */
export function getModelPath(costumeId: string): string {
  return COSTUMES[costumeId]?.modelPath || COSTUMES['festival-spring'].modelPath;
}
