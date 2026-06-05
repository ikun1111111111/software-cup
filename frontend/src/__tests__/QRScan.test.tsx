import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRScan from '../pages/tourist/QRScan';
import * as spotsApi from '../api/spots';

// Mock html5-qrcode
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockSpots = [
  { id: '1', name: '灵山大佛', category: '佛像', tags: null, overview: '高88米铜佛像', qr_code: 'qr_1' },
  { id: '2', name: '梵宫', category: '建筑', tags: null, overview: '佛教文化殿堂', qr_code: 'qr_2' },
  { id: '3', name: '九龙灌浴', category: '景观', tags: null, overview: '音乐喷泉表演', qr_code: 'qr_3' },
];

describe('QRScan', () => {
  beforeEach(() => {
    vi.spyOn(spotsApi, 'listSpots').mockResolvedValue(mockSpots);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染扫描区域', () => {
      render(<QRScan />);
      expect(screen.getByTestId('scan-area')).toBeDefined();
    });

    it('应该渲染扫描卡片容器', () => {
      render(<QRScan />);
      expect(screen.getByTestId('qr-scan-card')).toBeDefined();
    });

    it('初始状态应该显示加载占位符', () => {
      render(<QRScan />);
      expect(screen.getByText('加载景点中...')).toBeDefined();
    });
  });

  describe('景点加载', () => {
    it('加载完成后应该显示景点列表', async () => {
      render(<QRScan />);
      await waitFor(() => {
        expect(screen.getByText('灵山大佛')).toBeDefined();
      });
      expect(screen.getByText('梵宫')).toBeDefined();
      expect(screen.getByText('九龙灌浴')).toBeDefined();
    });

    it('加载完成后标题变为"所有景点"', async () => {
      render(<QRScan />);
      await waitFor(() => {
        expect(screen.getByText('所有景点')).toBeDefined();
      });
    });
  });

  describe('点击景点卡片', () => {
    it('点击景点应该触发onScan回调', async () => {
      const onScan = vi.fn();
      render(<QRScan onScan={onScan} />);

      await waitFor(() => {
        expect(screen.getByText('灵山大佛')).toBeDefined();
      });

      fireEvent.click(screen.getByText('灵山大佛'));

      expect(onScan).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: '灵山大佛' })
      );
    });

    it('点击景点后应该显示景点名称和"重新扫描"按钮', async () => {
      render(<QRScan />);

      await waitFor(() => {
        expect(screen.getByText('灵山大佛')).toBeDefined();
      });

      fireEvent.click(screen.getByText('灵山大佛'));

      expect(screen.getByText('重新扫描')).toBeDefined();
    });

    it('点击景点后应该隐藏景点列表', async () => {
      render(<QRScan />);

      await waitFor(() => {
        expect(screen.getByText('灵山大佛')).toBeDefined();
      });

      fireEvent.click(screen.getByText('灵山大佛'));

      expect(screen.queryByText('所有景点')).toBeNull();
    });
  });

  describe('重新扫描', () => {
    it('点击重新扫描应该重新显示景点列表', async () => {
      render(<QRScan />);

      await waitFor(() => {
        expect(screen.getByText('灵山大佛')).toBeDefined();
      });

      fireEvent.click(screen.getByText('灵山大佛'));
      fireEvent.click(screen.getByText('重新扫描'));

      await waitFor(() => {
        expect(screen.getByText('所有景点')).toBeDefined();
      });
    });
  });
});
