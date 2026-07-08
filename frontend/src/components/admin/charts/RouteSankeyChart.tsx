import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DeploymentUnitOutlined } from '@ant-design/icons';
import { mountainTheme } from '../MountainChart';
import ChartErrorBoundary from './ChartErrorBoundary';
import type { RoutePreference } from '../../../api/behavior';

interface Props {
  data?: RoutePreference;
}

const RouteSankeyChart: React.FC<Props> = ({ data }) => {
  const option = useMemo(() => ({
    ...mountainTheme,
    tooltip: {
      ...mountainTheme.tooltip,
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        type: 'sankey',
        left: 12,
        right: 80,
        top: 16,
        bottom: 24,
        nodeWidth: 14,
        nodeGap: 10,
        layoutIterations: 24,
        data: data?.nodes ?? [],
        links: data?.links ?? [],
        label: {
          color: 'var(--text-secondary)',
          fontSize: 12,
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.45,
          opacity: 0.36,
        },
        itemStyle: {
          color: '#6A9C89',
          borderColor: '#F7F5F0',
        },
      },
    ],
  }), [data]);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text-primary)', display: 'flex', gap: 6 }}>
        <DeploymentUnitOutlined style={{ color: 'var(--mountain-mid)' }} />
        路线流转偏好
      </h3>
      <div style={{ height: 360 }}>
        <ChartErrorBoundary fallbackLabel="路线流转图暂不可用，可重试">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </ChartErrorBoundary>
      </div>
    </div>
  );
};

export default RouteSankeyChart;
