import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import QRScan from '../pages/tourist/QRScan';

describe('QRScan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<QRScan />);
      expect(screen.getByTestId('qr-scan')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<QRScan />);
      expect(screen.getByText('扫码定位')).toBeDefined();
    });

    it('应该渲染扫描区域', () => {
      render(<QRScan />);
      expect(screen.getByTestId('scan-area')).toBeDefined();
    });

    it('应该显示扫描按钮', () => {
      render(<QRScan />);
      expect(screen.getByTestId('scan-btn')).toBeDefined();
    });

    it('应该显示占位符', () => {
      render(<QRScan />);
      expect(screen.getByTestId('scan-placeholder')).toBeDefined();
    });
  });

  describe('扫描功能', () => {
    it('点击扫描应该显示扫描中', () => {
      render(<QRScan />);

      fireEvent.click(screen.getByTestId('scan-btn'));

      const scanningTexts = screen.getAllByText('扫描中...');
      expect(scanningTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('扫描按钮应该禁用', () => {
      render(<QRScan />);

      fireEvent.click(screen.getByTestId('scan-btn'));

      expect(screen.getByTestId('scan-btn')).toBeDisabled();
    });

    it('2秒后应该显示扫描成功', () => {
      render(<QRScan />);

      fireEvent.click(screen.getByTestId('scan-btn'));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('扫描成功')).toBeDefined();
    });

    it('应该调用onScan回调', () => {
      const onScan = vi.fn();
      render(<QRScan onScan={onScan} />);

      fireEvent.click(screen.getByTestId('scan-btn'));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onScan).toHaveBeenCalledWith(expect.stringContaining('灵山大佛'));
    });

    it('扫描后应该恢复按钮', () => {
      render(<QRScan />);

      fireEvent.click(screen.getByTestId('scan-btn'));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId('scan-btn')).not.toBeDisabled();
      expect(screen.getByText('开始扫描')).toBeDefined();
    });
  });
});
