/** MountainChart — ECharts 青绿山水主题配置 */

export const mountainTheme = {
  color: ['#4A7C6F', '#8FB8AA', '#C84B31', '#C9A96E', '#5C534A', '#B85C4F'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
    color: '#2A2520',
  },
  title: {
    textStyle: { color: '#2A2520', fontFamily: "'Noto Serif SC', serif" },
    subtextStyle: { color: '#5C534A' },
  },
  line: {
    smooth: 0.3, // slightly angular like mountain ridges
    symbol: 'none',
    lineStyle: { width: 2 },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#C9D5D1' } },
    axisTick: { show: false },
    axisLabel: { color: '#5C534A', fontSize: 12 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#5C534A', fontSize: 12 },
    splitLine: { lineStyle: { color: 'rgba(201, 213, 209, 0.5)', type: 'dashed' } },
  },
  tooltip: {
    backgroundColor: 'rgba(243, 239, 230, 0.95)',
    borderColor: '#C9D5D1',
    borderWidth: 1,
    textStyle: { color: '#2A2520' },
    padding: [10, 14],
  },
  legend: {
    textStyle: { color: '#5C534A' },
    bottom: 0,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '12%',
    top: '8%',
    containLabel: true,
  },
};

/** 水墨渐变面积 — 用于折线图 */
export function inkAreaStyle(color: string) {
  return {
    color: {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: color + '33' },
        { offset: 1, color: color + '05' },
      ],
    },
  };
}

/** 热力图配色 — 浅米 → 暖金 → 朱砂，更适合浅色背景 */
export const heatmapColors = ['#F3EFE6', '#E0D5C1', '#D4B896', '#D4896E', '#C84B31'];
