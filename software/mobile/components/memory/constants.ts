export const MOOD_META: Record<string, { emoji: string; color: string; label: string }> = {
  happy: { emoji: '😊', color: '#E8A838', label: '开心' },
  calm: { emoji: '😌', color: '#6A9C89', label: '平静' },
  excited: { emoji: '🤩', color: '#C84B31', label: '兴奋' },
  thoughtful: { emoji: '🤔', color: '#2A4D6E', label: '沉思' },
  peaceful: { emoji: '🧘', color: '#6BA292', label: '宁静' },
};

export const MOOD_OPTIONS = ['happy', 'calm', 'excited', 'thoughtful', 'peaceful'];

export const ROUTE_SPOTS = [
  { name: '祥符寺', short: '祥符' },
  { name: '灵山大佛', short: '大佛' },
  { name: '梵华宫', short: '梵宫' },
  { name: '九龙灌浴', short: '九龙' },
  { name: '拈花湾', short: '拈花' },
];

export const MAP_SPOTS = [
  { name: '祥符寺', x: 60, y: 80, icon: '🏯' },
  { name: '灵山大佛', x: 140, y: 120, icon: '🗿' },
  { name: '梵华宫', x: 220, y: 90, icon: '🏛️' },
  { name: '九龙灌浴', x: 180, y: 180, icon: '⛲' },
  { name: '拈花湾', x: 100, y: 200, icon: '🌸' },
];
