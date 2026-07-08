import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { RadarChartOutlined } from '@ant-design/icons';
import { mountainTheme } from '../MountainChart';
import ChartErrorBoundary from './ChartErrorBoundary';
import type { SatisfactionAnalysis } from '../../../api/behavior';

interface Props {
  data?: SatisfactionAnalysis;
}

const SatisfactionRadarChart: React.FC<Props> = ({ data }) => {
  const attractionData = data?.byAttraction?.slice(0, 8) ?? [];
  const option = useMemo(() => ({
    ...mountainTheme,
    tooltip: mountainTheme.tooltip,
    radar: {
      radius: '68%',
      indicator: attractionData.map((item) => ({ name: item.name, max: 5 })),
      axisName: {
        color: 'var(--text-secondary)',
        fontSize: 11,
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(106,156,137,0.05)', 'rgba(201,169,110,0.05)'],
        },
      },
      axisLine: { lineStyle: { color: 'rgba(92,83,74,0.18)' } },
      splitLine: { lineStyle: { color: 'rgba(92,83,74,0.18)' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: attractionData.map((item) => item.avgSatisfaction),
            name: '满意度',
            areaStyle: { color: 'rgba(106,156,137,0.22)' },
            lineStyle: { color: '#6A9C89', width: 2 },
            itemStyle: { color: '#C84B31' },
          },
        ],
      },
    ],
  }), [attractionData]);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text-primary)', display: 'flex', gap: 6 }}>
        <RadarChartOutlined style={{ color: 'var(--gold-leaf)' }} />
        景点满意度
      </h3>
      <div style={{ height: 360 }}>
        {attractionData.length > 0 ? (
          <ChartErrorBoundary fallbackLabel="满意度雷达图暂不可用，可重试">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
          </ChartErrorBoundary>
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-subtle)', borderRadius: 12 }}>
            暂无满意度样本
          </div>
        )}
      </div>
    </div>
  );
};

export default SatisfactionRadarChart;
