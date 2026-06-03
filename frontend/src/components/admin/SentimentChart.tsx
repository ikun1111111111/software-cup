import React, { useCallback, useState } from 'react';
import { LineChartOutlined } from '@ant-design/icons';

export interface SentimentData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentChartProps {
  data?: SentimentData[];
  onDateChange?: (startDate: string, endDate: string) => void;
}

const MOCK_DATA: SentimentData[] = [
  { date: '2024-01-15', positive: 65, negative: 15, neutral: 20 },
  { date: '2024-01-16', positive: 70, negative: 10, neutral: 20 },
  { date: '2024-01-17', positive: 60, negative: 20, neutral: 20 },
  { date: '2024-01-18', positive: 75, negative: 10, neutral: 15 },
  { date: '2024-01-19', positive: 80, negative: 5, neutral: 15 },
  { date: '2024-01-20', positive: 72, negative: 12, neutral: 16 },
  { date: '2024-01-21', positive: 68, negative: 18, neutral: 14 },
];

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
          <LineChartOutlined style={{ color: 'var(--color-primary)' }} />
          情感趋势
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            data-testid="start-date"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value, endDate)}
            className="input-base"
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
          />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>至</span>
          <input
            data-testid="end-date"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange(startDate, e.target.value)}
            className="input-base"
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
          />
        </div>
      </div>

      <div data-testid="chart-container" style={{
        height: '300px',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        backgroundColor: 'var(--surface-elevated)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '16px' }}>
          {[
            { label: '正面', color: 'var(--color-success)' },
            { label: '中性', color: 'var(--color-warning)' },
            { label: '负面', color: 'var(--color-error)' },
          ].map((item) => (
            <span key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}>
              <span style={{ width: 10, height: 10, backgroundColor: item.color, borderRadius: '2px' }} />
              {item.label}
            </span>
          ))}
        </div>

        <div data-testid="chart-data" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          height: '200px',
        }}>
          {data.map((item, index) => (
            <div key={index} data-testid={`data-point-${index}`} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  width: '20px',
                  height: `${item.positive * 2}px`,
                  backgroundColor: 'var(--color-success)',
                  borderRadius: '3px 3px 0 0',
                }} />
                <div style={{
                  width: '20px',
                  height: `${item.neutral * 2}px`,
                  backgroundColor: 'var(--color-warning)',
                }} />
                <div style={{
                  width: '20px',
                  height: `${item.negative * 2}px`,
                  backgroundColor: 'var(--color-error)',
                  borderRadius: '0 0 3px 3px',
                }} />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;
