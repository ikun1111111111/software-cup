import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecord } from '../hooks/useVoiceRecord';

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as any,
  onstop: null as any,
};

vi.stubGlobal('MediaRecorder', vi.fn(() => mockMediaRecorder));

// Mock navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

describe('useVoiceRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
  });

  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useVoiceRecord());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
      expect(typeof result.current.getAudioBlob).toBe('function');
    });
  });

  describe('startRecording', () => {
    it('应该开始录音', async () => {
      const { result } = renderHook(() => useVoiceRecord());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockMediaRecorder.start).toHaveBeenCalled();
      expect(result.current.isRecording).toBe(true);
    });

    it('应该处理权限拒绝错误', async () => {
      const error = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValue(error);

      const { result } = renderHook(() => useVoiceRecord());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('Permission denied');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('stopRecording', () => {
    it('应该停止录音', async () => {
      const { result } = renderHook(() => useVoiceRecord());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(result.current.isRecording).toBe(false);
    });

    it('未录音时停止不应该报错', () => {
      const { result } = renderHook(() => useVoiceRecord());

      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('getAudioBlob', () => {
    it('没有录音数据时应该返回null', () => {
      const { result } = renderHook(() => useVoiceRecord());

      const blob = result.current.getAudioBlob();
      expect(blob).toBeNull();
    });

    it('应该返回音频Blob', async () => {
      const { result } = renderHook(() => useVoiceRecord());

      await act(async () => {
        await result.current.startRecording();
      });

      // 模拟录音数据
      act(() => {
        mockMediaRecorder.ondataavailable?.({ data: new Blob(['test'], { type: 'audio/webm' }) });
      });

      act(() => {
        result.current.stopRecording();
      });

      const blob = result.current.getAudioBlob();
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
