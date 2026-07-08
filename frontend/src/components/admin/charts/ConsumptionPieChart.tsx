import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PieChartOutlined } from '@ant-design/icons';
import { mountainTheme } from '../MountainChart';
import ChartErrorBoundary from './ChartErrorBoundary';
import type { ConsumptionBreakdownItem } from '../../../api/behavior';

interface Props {
  data?: ConsumptionBreakdownItem[];
}

const ConsumptionPieChart: React.FC<Props> = ({ data = [] }) => {
  const option = useMemo(() => ({
    ...mountainTheme,
    tooltip: {
      ...mountainTheme.tooltip,
      trigger: 'item',
      formatter: '{b}<br/>¥{c} ({d}%)',
    },
    legend: {
      ...mountainTheme.legend,
      orient: 'vertical',
      right: 8,
      top: 'center',
    },
    series: [
      {
        name: '消费结构',
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['38%', '52%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#F7F5F0',
          borderWidth: 3,
        },
        label: {
          color: 'var(--text-secondary)',
          formatter: '{b}\n{d}%',
        },
        data: data.map((item) => ({ name: item.name, value: item.value })),
      },
    ],
  }), [data]);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text-primary)', display: 'flex', gap: 6 }}>
        <PieChartOutlined style={{ color: 'var(--vermilion)' }} />
        消费结构
      </h3>
      <div style={{ height: 320 }}>
        <ChartErrorBoundary fallbackLabel="消费结构图暂不可用，可重试">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </ChartErrorBoundary>
      </div>
    </div>
  );
};

export default ConsumptionPieChart;
