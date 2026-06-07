import React, { useMemo } from 'react';
import { FireOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { mountainTheme, heatmapColors } from './MountainChart';

export interface HeatmapItem {
  day_of_week: number;
  hour: number;
  count: number;
}

export interface HeatmapChartProps {
  data?: HeatmapItem[];
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}时`);

const HeatmapChart: React.FC<HeatmapChartProps> = ({ data: propData }) => {
  const chartData = useMemo(() => {
    if (!propData || propData.length === 0) {
      // Generate empty grid
      const empty: [number, number, number][] = [];
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          empty.push([d, h, 0]);
        }
      }
      return empty;
    }
    return propData.map((item) => [
      item.day_of_week,
      item.hour,
      item.count,
    ]) as [number, number, number][];
  }, [propData]);

  const maxCount = useMemo(() => {
    if (!chartData.length) return 1;
    return Math.max(...chartData.map((d) => d[2]), 1);
  }, [chartData]);

  const option = useMemo(() => {
    return {
      ...mountainTheme,
      tooltip: {
        ...mountainTheme.tooltip,
        position: 'top',
        formatter: (params: any) => {
          return `${DAYS[params.value[0]]} ${HOURS[params.value[1]]}<br/>交互次数: ${params.value[2]}`;
        },
      },
      grid: {
        top: '5%',
        bottom: '10%',
        left: '8%',
        right: '5%',
      },
      xAxis: {
        type: 'category',
        data: DAYS,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'var(--text-secondary)', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: HOURS,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'var(--text-secondary)', fontSize: 10 },
      },
      visualMap: {
        min: 0,
        max: maxCount,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: heatmapColors,
        },
        textStyle: { color: 'var(--text-secondary)' },
      },
      series: [
        {
          type: 'heatmap',
          data: chartData,
          label: { show: false },
          itemStyle: {
            borderRadius: 4,
            borderColor: 'var(--paper-texture)',
            borderWidth: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(27, 77, 62, 0.3)',
            },
          },
        },
      ],
    };
  }, [chartData, maxCount]);

  return (
    <div data-testid="heatmap-chart" style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 18px 0',
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <FireOutlined style={{ color: 'var(--vermilion)' }} />
        交互时段热力图
      </h3>
      <div data-testid="heatmap-container" style={{ height: '360px' }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default HeatmapChart;
