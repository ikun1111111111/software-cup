import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface DNARadarChartProps {
  scores: Record<string, number>;
  size?: number;
}

const DIM_LABELS: Record<string, string> = {
  culture: '文化深度',
  nature: '自然探索',
  food: '美食体验',
  social: '社交活跃',
  economy: '经济型',
  leisure: '休闲放松',
};

const DIM_ORDER = ['culture', 'nature', 'food', 'social', 'economy', 'leisure'];

const DNARadarChart: React.FC<DNARadarChartProps> = ({ scores, size = 280 }) => {
  const indicators = DIM_ORDER.map((key) => ({
    name: DIM_LABELS[key] || key,
    max: 1,
  }));

  const values = DIM_ORDER.map((key) => scores[key] ?? 0.5);

  const option = {
    radar: {
      indicator: indicators,
      radius: '65%',
      axisName: {
        color: '#5C554C',
        fontSize: 12,
      },
      splitArea: {
        areaStyle: {
          color: ['#FAFAF8', '#F5F3EF', '#FAFAF8', '#F5F3EF'],
        },
      },
      axisLine: {
        lineStyle: { color: '#D4D0C8' },
      },
      splitLine: {
        lineStyle: { color: '#D4D0C8' },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: 'DNA画像',
            areaStyle: {
              color: 'rgba(26, 95, 180, 0.2)',
            },
            lineStyle: {
              color: '#1A5FB4',
              width: 2,
            },
            itemStyle: {
              color: '#1A5FB4',
            },
          },
        ],
      },
    ],
    tooltip: {
      trigger: 'item',
    },
  };

  return (
    <div data-testid="dna-radar-chart" style={{ width: size, height: size }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default DNARadarChart;
