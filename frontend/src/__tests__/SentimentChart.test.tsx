import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SentimentChart from '../components/admin/SentimentChart';

describe('SentimentChart', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<SentimentChart />);
      expect(screen.getByTestId('sentiment-chart')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<SentimentChart />);
      expect(screen.getByText('情感趋势')).toBeDefined();
    });

    it('应该渲染图表容器', () => {
      render(<SentimentChart />);
      expect(screen.getByTestId('chart-container')).toBeDefined();
    });

    it('应该渲染日期选择器', () => {
      render(<SentimentChart />);
      expect(screen.getByTestId('start-date')).toBeDefined();
      expect(screen.getByTestId('end-date')).toBeDefined();
    });
  });

  describe('日期筛选', () => {
    it('修改开始日期应该调用回调', () => {
      const onDateChange = vi.fn();
      render(<SentimentChart onDateChange={onDateChange} />);
      fireEvent.change(screen.getByTestId('start-date'), { target: { value: '2024-01-10' } });
      expect(onDateChange).toHaveBeenCalledWith('2024-01-10', '2024-01-21');
    });

    it('修改结束日期应该调用回调', () => {
      const onDateChange = vi.fn();
      render(<SentimentChart onDateChange={onDateChange} />);
      fireEvent.change(screen.getByTestId('end-date'), { target: { value: '2024-01-25' } });
      expect(onDateChange).toHaveBeenCalledWith('2024-01-15', '2024-01-25');
    });
  });
});
