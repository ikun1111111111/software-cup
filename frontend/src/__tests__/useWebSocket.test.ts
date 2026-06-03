import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1, // WebSocket.OPEN
};

vi.stubGlobal('WebSocket', vi.fn(() => mockWebSocket));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.send).toBe('function');
    });
  });

  describe('connect', () => {
    it('应该建立WebSocket连接', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onOpen }));

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
    });

    it('应该触发onOpen回调', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onOpen }));

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      // 模拟WebSocket连接打开
      act(() => {
        mockWebSocket.onopen?.();
      });

      expect(onOpen).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('应该断开WebSocket连接', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('send方法应该存在', () => {
      const { result } = renderHook(() => useWebSocket());
      expect(typeof result.current.send).toBe('function');
    });
  });

  describe('回调函数', () => {
    it('应该调用onMessage回调', () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onMessage }));

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      // 模拟接收消息
      act(() => {
        mockWebSocket.onmessage?.({ data: JSON.stringify({ type: 'text', content: 'hello' }) });
      });

      expect(onMessage).toHaveBeenCalledWith({ type: 'text', content: 'hello' });
    });

    it('应该调用onError回调', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onError }));

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      // 模拟错误
      const errorEvent = new Event('error');
      act(() => {
        mockWebSocket.onerror?.(errorEvent);
      });

      expect(onError).toHaveBeenCalled();
    });

    it('应该调用onClose回调', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onClose }));

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      // 模拟关闭
      act(() => {
        mockWebSocket.onclose?.();
      });

      expect(onClose).toHaveBeenCalled();
    });
  });
});
