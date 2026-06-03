import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AudioSync from '../components/DigitalHuman/AudioSync';

// Mock Audio class
const mockAudioInstances: any[] = [];

class MockAudio {
  src = '';
  currentTime = 0;
  duration = 10;
  paused = true;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(src?: string) {
    this.src = src || '';
    mockAudioInstances.push(this);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  mockAudioInstances.length = 0;
  (global as any).Audio = MockAudio;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AudioSync', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<AudioSync />);
      expect(screen.getByTestId('audio-sync')).toBeDefined();
    });

    it('初始isPlaying应该是false', () => {
      render(<AudioSync />);
      expect(screen.getByTestId('is-playing').textContent).toBe('false');
    });

    it('初始currentTime应该是0', () => {
      render(<AudioSync />);
      expect(screen.getByTestId('current-time').textContent).toBe('0.00');
    });

    it('初始duration应该是0', () => {
      render(<AudioSync />);
      expect(screen.getByTestId('duration').textContent).toBe('0.00');
    });
  });

  describe('音频加载', () => {
    it('应该创建Audio实例', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" />);
      expect(mockAudioInstances.length).toBe(1);
      expect(mockAudioInstances[0].src).toContain('/audio/test.mp3');
    });

    it('无audioUrl时不应该创建Audio实例', () => {
      render(<AudioSync />);
      expect(mockAudioInstances.length).toBe(0);
    });

    it('audioUrl变化时应该创建新实例', () => {
      const { rerender } = render(<AudioSync audioUrl="/audio/test1.mp3" />);
      expect(mockAudioInstances.length).toBe(1);

      rerender(<AudioSync audioUrl="/audio/test2.mp3" />);
      expect(mockAudioInstances.length).toBe(2);
    });
  });

  describe('自动播放', () => {
    it('autoPlay为true时应该自动播放', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" autoPlay={true} />);
      expect(mockAudioInstances[0].play).toHaveBeenCalled();
    });

    it('autoPlay为false时不应该自动播放', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" autoPlay={false} />);
      expect(mockAudioInstances[0].play).not.toHaveBeenCalled();
    });
  });

  describe('事件回调', () => {
    it('应该注册play事件监听', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" onPlay={vi.fn()} />);
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith(
        'play',
        expect.any(Function)
      );
    });

    it('应该注册pause事件监听', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" onPause={vi.fn()} />);
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith(
        'pause',
        expect.any(Function)
      );
    });

    it('应该注册ended事件监听', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" onEnded={vi.fn()} />);
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith(
        'ended',
        expect.any(Function)
      );
    });

    it('应该注册timeupdate事件监听', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" onTimeUpdate={vi.fn()} />);
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith(
        'timeupdate',
        expect.any(Function)
      );
    });

    it('应该注册error事件监听', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" onError={vi.fn()} />);
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });
  });

  describe('组件卸载', () => {
    it('卸载时应该清理事件监听', () => {
      const { unmount } = render(<AudioSync audioUrl="/audio/test.mp3" />);
      unmount();

      // 应该调用removeEventListener清理
      expect(mockAudioInstances[0].removeEventListener).toHaveBeenCalled();
    });

    it('卸载时应该暂停音频', () => {
      const { unmount } = render(<AudioSync audioUrl="/audio/test.mp3" />);
      unmount();

      expect(mockAudioInstances[0].pause).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理play失败', () => {
      mockAudioInstances.length = 0;
      const originalAudio = global.Audio;
      (global as any).Audio = class {
        src = '';
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        play = vi.fn(() => Promise.reject(new Error('play failed')));
        pause = vi.fn();
        constructor(src?: string) { this.src = src || ''; }
      };

      const onError = vi.fn();
      render(<AudioSync audioUrl="/audio/test.mp3" onError={onError} />);

      // play被调用但不应该直接调用onError（需要catch）
      expect(screen.getByTestId('audio-sync')).toBeDefined();

      (global as any).Audio = originalAudio;
    });
  });
});
