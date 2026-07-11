/**
 * Costume ID → VRM model / costume mapping.
 *
 * Each costume resolves to a VRM model file for the admin preview
 * (via `modelFile`) and keeps texture/expression/filter metadata used by
 * other renderers (e.g. tourist Live2D stage).
 *
 * Costume types:
 * - daily:    3 sets rotated by day of week
 * - festival: 6 sets tied to Chinese holidays (auto-detected)
 */

export type CostumeCategory = 'daily' | 'festival';

export interface CostumeDef {
  id: string;
  name: string;
  category: CostumeCategory;
  /** VRM model file name under public/models/ */
  modelFile?: string;
  /** Texture PNG path under public/models/haru/textures/ (used by Live2D stage) */
  texturePath: string;
  /** Expression name to pair with this costume (used by Live2D stage) */
  expression: string;
  /** CSS filter applied to the renderer canvas for visual costume variation */
  cssFilter: string;
  /** Short description shown in UI */
  description: string;
  /** Festival month (1-12) for auto-detection. null for daily costumes. */
  festivalMonth: number | null;
  /** Festival day range [start, end]. Spans across months if end < start. */
  festivalDayRange: [number, number] | null;
}

export const COSTUMES: Record<string, CostumeDef> = {
  // ── Daily costume ────────────────────────────────────────────────────────
  'daily-artistic': {
    id: 'daily-artistic',
    name: '日常服装',
    category: 'daily',
    texturePath: '/models/haru/textures/daily_artistic.png',
    modelFile: '488366049787804013.vrm',
    expression: 'f02',
    cssFilter: 'brightness(1.02) contrast(1.05)',
    description: '水墨雅服，简约日常',
    festivalMonth: null,
    festivalDayRange: null,
  },

  // ── Festival costumes (6 sets) ───────────────────────────────────────────
  'festival-spring': {
    id: 'festival-spring',
    name: '春节 · 锦绣红袍',
    category: 'festival',
    texturePath: '/models/haru/textures/festival_spring.png',
    modelFile: '8024308560058477433.vrm',
    expression: 'f03',
    cssFilter: 'hue-rotate(-30deg) saturate(1.5) brightness(1.05)',
    description: '1 月 20 日 – 2 月 10 日，红色旗袍/汉服，金线刺绣',
    festivalMonth: 1,
    festivalDayRange: [20, 10], // Jan 20 – Feb 10 (cross-month)
  },
  'festival-lantern': {
    id: 'festival-lantern',
    name: '元宵 · 灯彩华裳',
    category: 'festival',
    texturePath: '/models/haru/textures/festival_lantern.png',
    modelFile: '4353238926149796085.vrm',
    expression: 'f04',
    cssFilter: 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-15deg)',
    description: '2 月 14 日 – 16 日，彩灯元素，暖色调',
    festivalMonth: 2,
    festivalDayRange: [14, 16],
  },
  'festival-qingming': {
    id: 'festival-qingming',
    name: '清明 · 踏青轻衣',
    category: 'festival',
    texturePath: '/models/haru/textures/festival_qingming.png',
    modelFile: '5186055420774500970.vrm',
    expression: 'f05',
    cssFilter: 'hue-rotate(20deg) saturate(1.1) brightness(1.05)',
    description: '4 月 3 日 – 6 日，青绿色，春意盎然',
    festivalMonth: 4,
    festivalDayRange: [3, 6],
  },
  'festival-dragon': {
    id: 'festival-dragon',
    name: '端午 · 龙舟竞渡',
    category: 'festival',
    texturePath: '/models/haru/textures/festival_dragon.png',
    modelFile: 'avatar.vrm',
    expression: 'f06',
    cssFilter: 'hue-rotate(30deg) saturate(1.2) brightness(1.05) contrast(1.05)',
    description: '6 月 1 日 – 10 日，蓝白配色，龙纹点缀',
    festivalMonth: 6,
    festivalDayRange: [1, 10],
  },
  'festival-midautumn': {
    id: 'festival-midautumn',
    name: '中秋 · 月华裳',
    category: 'festival',
    texturePath: '/models/haru/textures/festival_midautumn.png',
    modelFile: '5784779633385764689.vrm',
    expression: 'f07',
    cssFilter: 'sepia(0.15) hue-rotate(20deg) saturate(1.2) brightness(1.12)',
    description: '9 月 10 日 – 20 日，桂花金+月白，桂花元素',
    festivalMonth: 9,
    festivalDayRange: [10, 20],
  },
  'festival-national': {
    id: 'festival-national',
    name: '国庆 · 锦绣华章',
    category: 'festival',
    texturePath: '/models/haru/textures/festival_national.png',
    modelFile: '8511002460770470367.vrm',
    expression: 'f03',
    cssFilter: 'hue-rotate(-20deg) saturate(1.6) brightness(1.08) contrast(1.05)',
    description: '10 月 1 日 – 7 日，中国红+金，庄重大气',
    festivalMonth: 10,
    festivalDayRange: [1, 7],
  },
};

/** All costume IDs in display order. */
export const ALL_COSTUME_IDS = Object.keys(COSTUMES);

/** Daily costume IDs only. */
export const DAILY_COSTUME_IDS = ALL_COSTUME_IDS.filter(
  (id) => COSTUMES[id].category === 'daily',
);

/** Festival costume IDs only. */
export const FESTIVAL_COSTUME_IDS = ALL_COSTUME_IDS.filter(
  (id) => COSTUMES[id].category === 'festival',
);

/** Get costume definition by ID. Falls back to daily-artistic. */
export function getCostume(id: string): CostumeDef {
  return COSTUMES[id] ?? COSTUMES['daily-artistic'];
}
