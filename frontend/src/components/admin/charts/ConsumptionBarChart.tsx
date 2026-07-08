import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarChartOutlined } from '@ant-design/icons';
import { mountainTheme } from '../MountainChart';
import ChartErrorBoundary from './ChartErrorBoundary';
import type { ConsumptionTrendItem } from '../../../api/behavior';

interface Props {
  data?: ConsumptionTrendItem[];
}

const ConsumptionBarChart: React.FC<Props> = ({ data = [] }) => {
  const option = useMemo(() => ({
    ...mountainTheme,
    tooltip: {
      ...mountainTheme.tooltip,
      trigger: 'axis',
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '10%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.month),
      axisLabel: { color: 'var(--text-secondary)' },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(92,83,74,0.22)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '总消费',
        axisLabel: { color: 'var(--text-secondary)' },
        splitLine: { lineStyle: { color: 'rgba(92,83,74,0.10)', type: 'dashed' } },
      },
      {
        type: 'value',
        name: '人均',
        axisLabel: { color: 'var(--text-secondary)' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '月度总消费',
        type: 'bar',
        data: data.map((item) => item.totalCost),
        barWidth: 18,
        itemStyle: {
          color: '#6A9C89',
          borderRadius: [7, 7, 0, 0],
        },
      },
      {
        name: '人均消费',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.map((item) => item.avgCost),
        lineStyle: { color: '#C84B31', width: 2 },
        itemStyle: { color: '#C84B31' },
      },
    ],
  }), [data]);

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text-primary)', display: 'flex', gap: 6 }}>
        <BarChartOutlined style={{ color: 'var(--accent)' }} />
        月度消费趋势
      </h3>
      <div style={{ height: 320 }}>
        <ChartErrorBoundary fallbackLabel="月度趋势图暂不可用，可重试">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </ChartErrorBoundary>
      </div>
    </div>
  );
};

export default ConsumptionBarChart;
