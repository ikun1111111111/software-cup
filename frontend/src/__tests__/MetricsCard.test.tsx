import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricsCard from '../components/admin/MetricsCard';

describe('MetricsCard', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<MetricsCard title="测试" value={100} />);
      expect(screen.getByTestId('metrics-card')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<MetricsCard title="今日访客" value={100} />);
      expect(screen.getByText('今日访客')).toBeDefined();
    });

    it('应该显示数值', () => {
      render(<MetricsCard title="测试" value={1234} />);
      expect(screen.getByText('1234')).toBeDefined();
    });

    it('应该显示图标', () => {
      render(<MetricsCard title="测试" value={100} icon="👥" />);
      expect(screen.getByText('👥')).toBeDefined();
    });
  });

  describe('趋势', () => {
    it('上升趋势应该显示向上箭头', () => {
      render(<MetricsCard title="测试" value={100} trend="up" trendValue="+10%" />);
      expect(screen.getByText('↑')).toBeDefined();
      expect(screen.getByText('+10%')).toBeDefined();
    });

    it('下降趋势应该显示向下箭头', () => {
      render(<MetricsCard title="测试" value={100} trend="down" trendValue="-5%" />);
      expect(screen.getByText('↓')).toBeDefined();
      expect(screen.getByText('-5%')).toBeDefined();
    });

    it('稳定趋势应该显示向右箭头', () => {
      render(<MetricsCard title="测试" value={100} trend="stable" trendValue="持平" />);
      expect(screen.getByText('→')).toBeDefined();
      expect(screen.getByText('持平')).toBeDefined();
    });

    it('没有趋势不应该显示', () => {
      render(<MetricsCard title="测试" value={100} />);
      expect(screen.queryByTestId('metrics-trend')).toBeNull();
    });
  });

  describe('样式', () => {
    it('应该支持自定义颜色', () => {
      render(<MetricsCard title="测试" value={100} color="#ff0000" />);
      const icon = screen.getByTestId('metrics-icon');
      // hex #ff000012 is normalized to rgba by jsdom
      expect(icon.style.backgroundColor).toMatch(/rgba?\(255.*0.*0/);
    });
  });
});
