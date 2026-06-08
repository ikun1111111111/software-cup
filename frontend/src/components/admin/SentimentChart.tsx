import React, { useCallback, useState } from 'react';
import { LineChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

export interface TrendsItem {
  date: string;
  interactions: number;
  avgSentiment: number;
  avgLatencyMs: number;
  faqHitRate: number;
  positiveRatio?: number;
  neutralRatio?: number;
  negativeRatio?: number;
}

export interface SentimentChartProps {
  data?: TrendsItem[];
  onDateChange?: (startDate: string, endDate: string) => void;
}

const MOCK_DATA: TrendsItem[] = [
  { date: '2024-01-15', interactions: 120, avgSentiment: 0.65, avgLatencyMs: 150, faqHitRate: 0.72, positiveRatio: 0.60, neutralRatio: 0.30, negativeRatio: 0.10 },
  { date: '2024-01-16', interactions: 135, avgSentiment: 0.70, avgLatencyMs: 142, faqHitRate: 0.75, positiveRatio: 0.65, neutralRatio: 0.25, negativeRatio: 0.10 },
  { date: '2024-01-17', interactions: 98, avgSentiment: 0.60, avgLatencyMs: 160, faqHitRate: 0.68, positiveRatio: 0.50, neutralRatio: 0.35, negativeRatio: 0.15 },
  { date: '2024-01-18', interactions: 145, avgSentiment: 0.75, avgLatencyMs: 130, faqHitRate: 0.78, positiveRatio: 0.70, neutralRatio: 0.20, negativeRatio: 0.10 },
  { date: '2024-01-19', interactions: 160, avgSentiment: 0.80, avgLatencyMs: 125, faqHitRate: 0.80, positiveRatio: 0.75, neutralRatio: 0.15, negativeRatio: 0.10 },
  { date: '2024-01-20', interactions: 130, avgSentiment: 0.72, avgLatencyMs: 140, faqHitRate: 0.74, positiveRatio: 0.68, neutralRatio: 0.22, negativeRatio: 0.10 },
  { date: '2024-01-21', interactions: 115, avgSentiment: 0.68, avgLatencyMs: 155, faqHitRate: 0.70, positiveRatio: 0.62, neutralRatio: 0.28, negativeRatio: 0.10 },
];

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

const SentimentChart: React.FC<SentimentChartProps> = ({
  data: propData,
  onDateChange,
}) => {
  const [startDate, setStartDate] = useState('2024-01-15');
  const [endDate, setEndDate] = useState('2024-01-21');
  const data = propData || MOCK_DATA;

  const handleDateChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    onDateChange?.(start, end);
  }, [onDateChange]);

  const accentColor = getCssVar('--accent', '#c9a96e');
  const textSecondary = getCssVar('--text-secondary', '#5c534a');
  const textTertiary = getCssVar('--text-tertiary', '#9a9085');

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['正面情感', '中性情感', '负面情感', '交互次数'],
      bottom: 0,
      textStyle: { color: textSecondary },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date.slice(5)),
      axisLine: { lineStyle: { color: textTertiary } },
      axisLabel: { color: textSecondary },
    },
    yAxis: [
      {
        type: 'value',
        name: '占比',
        min: 0,
        max: 1,
        axisLabel: { color: textSecondary, formatter: '{value}' },
        splitLine: { lineStyle: { color: 'rgba(128,128,128,0.15)' } },
      },
      {
        type: 'value',
        name: '交互次数',
        axisLabel: { color: textSecondary },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '正面情感',
        type: 'line',
        smooth: true,
        data: data.map((d) => d.positiveRatio ?? 0),
        itemStyle: { color: '#52c41a' },
        yAxisIndex: 0,
        animationDuration: 800,
        animationEasing: 'cubicOut',
      },
      {
        name: '中性情感',
        type: 'line',
        smooth: true,
        data: data.map((d) => d.neutralRatio ?? 0),
        itemStyle: { color: '#8c8c8c' },
        yAxisIndex: 0,
        animationDuration: 800,
        animationEasing: 'cubicOut',
      },
      {
        name: '负面情感',
        type: 'line',
        smooth: true,
        data: data.map((d) => d.negativeRatio ?? 0),
        itemStyle: { color: '#ff4d4f' },
        yAxisIndex: 0,
        animationDuration: 800,
        animationEasing: 'cubicOut',
      },
      {
        name: '交互次数',
        type: 'bar',
        data: data.map((d) => d.interactions),
        itemStyle: { color: accentColor, borderRadius: [4, 4, 0, 0], opacity: 0.4 },
        yAxisIndex: 1,
        animationDuration: 800,
        animationEasing: 'cubicOut',
      },
    ],
  };

  return (
    <div data-testid="sentiment-chart" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <LineChartOutlined style={{ color: 'var(--accent)' }} />
          情感趋势
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            data-testid="start-date"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value, endDate)}
            className="input-base"
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'var(--paper-texture)', border: '1px solid var(--border-ink)', color: 'var(--text-primary)', borderRadius: 6 }}
          />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>至</span>
          <input
            data-testid="end-date"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange(startDate, e.target.value)}
            className="input-base"
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'var(--paper-texture)', border: '1px solid var(--border-ink)', color: 'var(--text-primary)', borderRadius: 6 }}
          />
        </div>
      </div>

      <div data-testid="chart-container" style={{
        height: '320px',
      }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default SentimentChart;
