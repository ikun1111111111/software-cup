/**
 * Costume ID → Live2D texture/expression mapping.
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
  /** Texture PNG paths (2 files: texture_00 and texture_01) */
  texturePaths: [string, string];
  /** Live2D expression to pair with this costume */
  expression: string;
  /** CSS filter (unused — textures contain the actual costume graphics) */
  cssFilter: string;
  /** Short description shown in UI */
  description: string;
  /** Festival month (1-12) for auto-detection. null for daily costumes. */
  festivalMonth: number | null;
  /** Festival day range [start, end]. Spans across months if end < start. */
  festivalDayRange: [number, number] | null;
}

export const COSTUMES: Record<string, CostumeDef> = {
  // ── Daily costumes (3 sets) ──────────────────────────────────────────────
  'daily-classic': {
    id: 'daily-classic',
    name: '素雅禅衣',
    category: 'daily',
    texturePaths: [
      '/models/haru/textures/daily_classic_00.png',
      '/models/haru/textures/daily_classic_01.png',
    ],
    expression: 'f00',
    cssFilter: 'none',
    description: '米白浅灰汉服，简约禅意',
    festivalMonth: null,
    festivalDayRange: null,
  },
  'daily-modern': {
    id: 'daily-modern',
    name: '新中式便装',
    category: 'daily',
    texturePaths: [
      '/models/haru/textures/daily_modern_00.png',
      '/models/haru/textures/daily_modern_01.png',
    ],
    expression: 'f01',
    cssFilter: 'sepia(0.15) saturate(1.1)',
    description: '改良旗袍元素，现代感',
    festivalMonth: null,
    festivalDayRange: null,
  },
  'daily-artistic': {
    id: 'daily-artistic',
    name: '水墨雅服',
    category: 'daily',
    texturePaths: [
      '/models/haru/textures/daily_artistic_00.png',
      '/models/haru/textures/daily_artistic_01.png',
    ],
    expression: 'f02',
    cssFilter: 'sepia(0.35) brightness(0.92)',
    description: '水墨风印花，飘逸感',
    festivalMonth: null,
    festivalDayRange: null,
  },

  // ─ Festival costumes (6 sets) ───────────────────────────────────────────
  'festival-spring': {
    id: 'festival-spring',
    name: '锦绣红袍',
    category: 'festival',
    texturePaths: [
      '/models/haru/textures/festival_spring_00.png',
      '/models/haru/textures/festival_spring_01.png',
    ],
    expression: 'f03',
    cssFilter: 'sepia(0.2) saturate(1.6) hue-rotate(-10deg)',
    description: '红色旗袍/汉服，金线刺绣',
    festivalMonth: 1,
    festivalDayRange: [20, 10], // Jan 20 – Feb 10 (cross-month)
  },
  'festival-lantern': {
    id: 'festival-lantern',
    name: '灯彩华裳',
    category: 'festival',
    texturePaths: [
      '/models/haru/textures/festival_lantern_00.png',
      '/models/haru/textures/festival_lantern_01.png',
    ],
    expression: 'f04',
    cssFilter: 'sepia(0.1) brightness(1.05) saturate(1.2)',
    description: '彩灯元素，暖色调',
    festivalMonth: 2,
    festivalDayRange: [14, 16],
  },
  'festival-qingming': {
    id: 'festival-qingming',
    name: '踏青轻衣',
    category: 'festival',
    texturePaths: [
      '/models/haru/textures/festival_qingming_00.png',
      '/models/haru/textures/festival_qingming_01.png',
    ],
    expression: 'f05',
    cssFilter: 'sepia(0.25) saturate(0.8) hue-rotate(80deg)',
    description: '青绿色，春意盎然',
    festivalMonth: 4,
    festivalDayRange: [3, 6],
  },
  'festival-dragon': {
    id: 'festival-dragon',
    name: '龙舟竞渡',
    category: 'festival',
    texturePaths: [
      '/models/haru/textures/festival_dragon_00.png',
      '/models/haru/textures/festival_dragon_01.png',
    ],
    expression: 'f06',
    cssFilter: 'none',
    description: '蓝白配色，龙纹点缀',
    festivalMonth: 6,
    festivalDayRange: [1, 10],
  },
  'festival-midautumn': {
    id: 'festival-midautumn',
    name: '月华裳',
    category: 'festival',
    texturePaths: [
      '/models/haru/textures/festival_midautumn_00.png',
      '/models/haru/textures/festival_midautumn_01.png',
    ],
    expression: 'f07',
    cssFilter: 'none',
    description: '桂花金+月白，桂花元素',
    festivalMonth: 9,
    festivalDayRange: [10, 20],
  },
  'festival-national': {
    id: 'festival-national',
    name: '锦绣华章',
    category: 'festival',
    texturePaths: [
      '/models/haru/textures/festival_national_00.png',
      '/models/haru/textures/festival_national_01.png',
    ],
    expression: 'f03',
    cssFilter: 'none',
    description: '中国红+金，庄重大气',
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

/** Get costume definition by ID. Falls back to daily-classic. */
export function getCostume(id: string): CostumeDef {
  return COSTUMES[id] ?? COSTUMES['daily-classic'];
}
