import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import QRScan, { matchSpot } from '../pages/tourist/QRScan';
import * as spotsApi from '../api/spots';

// Mock Html5Qrcode
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn().mockResolvedValue(undefined);

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn(() => ({
    start: mockStart,
    stop: mockStop,
  })),
}));

const mockSpots = [
  { id: '1', name: '灵山大佛', category: '佛像', tags: null, overview: '高88米铜佛像', qr_code: 'qr_1' },
  { id: '2', name: '梵宫', category: '建筑', tags: null, overview: '佛教文化殿堂', qr_code: 'qr_2' },
  { id: '3', name: '九龙灌浴', category: '景观', tags: null, overview: '音乐喷泉表演', qr_code: 'qr_3' },
  { id: '10', name: '大佛脚', category: '景观', tags: null, overview: '大佛脚部景点', qr_code: 'qr_10' },
];

describe('QRScan', () => {
  let listSpotsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockStart.mockClear();
    mockStop.mockClear();
    listSpotsSpy = vi.spyOn(spotsApi, 'listSpots').mockResolvedValue({
      data: { code: 0, data: mockSpots.slice(0, 3), message: 'success' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  afterEach(() => {
    listSpotsSpy.mockRestore();
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

  describe('QR 扫描解码', () => {
    it('扫码成功匹配到景点应该显示景点名称', async () => {
      const onScan = vi.fn();
      render(<QRScan onScan={onScan} />);

      await waitFor(() => {
        expect(screen.getByText('所有景点')).toBeDefined();
      });

      // Start scanning
      await act(async () => {
        fireEvent.click(screen.getByTestId('scan-area'));
      });

      await waitFor(() => {
        expect(screen.getByText('正在扫描...')).toBeDefined();
      });

      // Simulate Html5Qrcode success callback with a matching spot ID
      const scanCallback = mockStart.mock.calls[0][2];
      expect(scanCallback).toBeDefined();
      scanCallback('1');

      // Should display the matched spot name
      await waitFor(() => {
        expect(screen.getByText('灵山大佛')).toBeDefined();
      });

      // Should have called onScan callback
      expect(onScan).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: '灵山大佛' })
      );
    });

    it('扫码未匹配到景点应该显示错误信息', async () => {
      render(<QRScan />);

      await waitFor(() => {
        expect(screen.getByText('所有景点')).toBeDefined();
      });

      // Start scanning
      await act(async () => {
        fireEvent.click(screen.getByTestId('scan-area'));
      });

      await waitFor(() => {
        expect(screen.getByText('正在扫描...')).toBeDefined();
      });

      // Simulate Html5Qrcode success callback with unknown QR text
      const scanCallback = mockStart.mock.calls[0][2];
      scanCallback('unknown_qr_text_xyz');

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/未识别的二维码/)).toBeDefined();
      });
    });

    it('扫码成功通过 QR code 匹配应该显示景点名称', async () => {
      const onScan = vi.fn();
      render(<QRScan onScan={onScan} />);

      await waitFor(() => {
        expect(screen.getByText('所有景点')).toBeDefined();
      });

      // Start scanning
      await act(async () => {
        fireEvent.click(screen.getByTestId('scan-area'));
      });

      await waitFor(() => {
        expect(screen.getByText('正在扫描...')).toBeDefined();
      });

      // Simulate Html5Qrcode success callback with qr_code value
      const scanCallback = mockStart.mock.calls[0][2];
      scanCallback('qr_2');

      // Should display the matched spot name
      await waitFor(() => {
        expect(screen.getByText('梵宫')).toBeDefined();
      });

      expect(onScan).toHaveBeenCalledWith(
        expect.objectContaining({ id: '2', name: '梵宫' })
      );
    });
  });
});

describe('matchSpot', () => {
  it('应该通过精确 ID 匹配找到景点', () => {
    const result = matchSpot('1', mockSpots);
    expect(result).toBeDefined();
    expect(result!.name).toBe('灵山大佛');
  });

  it('应该通过精确 QR code 匹配找到景点', () => {
    const result = matchSpot('qr_2', mockSpots);
    expect(result).toBeDefined();
    expect(result!.name).toBe('梵宫');
  });

  it('应该通过名称模糊匹配找到景点', () => {
    const result = matchSpot('欢迎来到灵山大佛景区', mockSpots);
    expect(result).toBeDefined();
    expect(result!.name).toBe('灵山大佛');
  });

  it('不应该发生 ID 误匹配（"1" 不应该匹配 "10"）', () => {
    const result = matchSpot('1', mockSpots);
    expect(result).toBeDefined();
    expect(result!.id).toBe('1');
    expect(result!.name).toBe('灵山大佛');
    expect(result!.id).not.toBe('10');
  });

  it('当 QR code 为 null 时不应该导致误匹配', () => {
    const spotsWithNullQr = [
      { id: '5', name: '测试景点', category: 'test', tags: null, overview: '测试', qr_code: null },
    ];
    // Empty string should not match any spot
    const result = matchSpot('', spotsWithNullQr);
    expect(result).toBeUndefined();
  });

  it('不匹配的 QR 文本应该返回 undefined', () => {
    const result = matchSpot('unknown_qr_code_xyz', mockSpots);
    expect(result).toBeUndefined();
  });

  it('ID 精确匹配优先于名称模糊匹配', () => {
    const spots = [
      { id: '1', name: '大佛', category: 'test', tags: null, overview: '', qr_code: 'qr_1' },
      { id: '2', name: '灵山大佛', category: 'test', tags: null, overview: '', qr_code: 'qr_2' },
    ];
    // "灵山大佛" contains "大佛" but exact ID "2" should match spot 2
    const result = matchSpot('2', spots);
    expect(result).toBeDefined();
    expect(result!.id).toBe('2');
  });

  it('空景点列表应该返回 undefined', () => {
    const result = matchSpot('any_text', []);
    expect(result).toBeUndefined();
  });
});
