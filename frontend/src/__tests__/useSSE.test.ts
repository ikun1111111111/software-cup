import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '../hooks/useSSE';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSSE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useSSE());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
    });
  });

  describe('connect', () => {
    it('应该调用fetch建立连接', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n') })
          .mockResolvedValueOnce({ done: true }),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValue(mockResponse);

      const onMessage = vi.fn();
      const { result } = renderHook(() => useSSE({ onMessage }));

      await act(async () => {
        await result.current.connect('/api/chat/stream');
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/chat/stream', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'text/event-stream',
        }),
      }));
    });

    it('应该支持POST请求', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: true }),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSSE());

      await act(async () => {
        await result.current.connect('/api/chat/stream', { message: 'test' });
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/chat/stream', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      }));
    });
  });

  describe('disconnect', () => {
    it('应该断开连接', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useSSE({ onClose }));

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('回调函数', () => {
    it('应该调用onOpen回调', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true }),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      mockFetch.mockResolvedValue(mockResponse);

      const onOpen = vi.fn();
      const { result } = renderHook(() => useSSE({ onOpen }));

      await act(async () => {
        await result.current.connect('/api/chat/stream');
      });

      expect(onOpen).toHaveBeenCalled();
    });

    it('应该调用onError回调', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      const onError = vi.fn();
      const { result } = renderHook(() => useSSE({ onError }));

      await act(async () => {
        await result.current.connect('/api/chat/stream');
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error).toBe(error);
    });
  });
});
