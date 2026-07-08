import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AudioSync from '../components/DigitalHuman/AudioSync';

// Mock Audio class
const mockAudioInstances: any[] = [];
let blobUrlCounter = 0;

class MockAudio {
  src = '';
  currentTime = 0;
  duration = 10;
  paused = true;
  ended = false;
  private _listeners: Record<string, Function[]> = {};

  addEventListener = vi.fn((event: string, cb: Function) => {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  });
  removeEventListener = vi.fn((event: string, cb: Function) => {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter((l) => l !== cb);
    }
  });
  play = vi.fn(() => {
    this.paused = false;
    this._listeners.play?.forEach((cb) => cb());
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  dispatchEvent = vi.fn((event: string) => {
    this._listeners[event]?.forEach((cb) => cb());
  });

  constructor(src?: string) {
    this.src = src || '';
    mockAudioInstances.push(this);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  mockAudioInstances.length = 0;
  blobUrlCounter = 0;
  (global as any).Audio = MockAudio;
  // Mock atob for base64 decoding in tests
  if (!(global as any).atob) {
    (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
  }
  // Mock URL.createObjectURL for blob handling
  if (!(global as any).URL) {
    (global as any).URL = {};
  }
  (global as any).URL.createObjectURL = vi.fn(() => {
    blobUrlCounter += 1;
    return `blob:mock-${blobUrlCounter}`;
  });
  (global as any).URL.revokeObjectURL = vi.fn();
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

    it('应该注册play/pause/ended/error事件监听（不再依赖timeupdate，改用polling）', () => {
      render(<AudioSync audioUrl="/audio/test.mp3" onTimeUpdate={vi.fn()} />);
      // Verify core events are registered
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockAudioInstances[0].addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
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

      expect(screen.getByTestId('audio-sync')).toBeDefined();

      (global as any).Audio = originalAudio;
    });
  });

  describe('流式音频chunks', () => {
    it('audioChunks为空时不应该创建Audio实例', () => {
      render(<AudioSync audioChunks={[]} />);
      const countBefore = mockAudioInstances.length;
      expect(countBefore).toBe(0);
    });

    it('audioChunks应该创建Audio实例', () => {
      const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // "RIFF"
      const b64 = btoa(String.fromCharCode(...bytes));

      render(<AudioSync audioChunks={[b64]} />);
      expect(mockAudioInstances.length).toBe(1);
    });

    it('audioChunks追加时不应该重建Audio实例', () => {
      const bytes1 = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      const b64_1 = btoa(String.fromCharCode(...bytes1));
      const bytes2 = new Uint8Array([0x49, 0x44, 0x33, 0x03]);
      const b64_2 = btoa(String.fromCharCode(...bytes2));

      const { rerender } = render(<AudioSync audioChunks={[b64_1]} />);
      expect(mockAudioInstances.length).toBe(1);
      const firstSrc = mockAudioInstances[0].src;

      rerender(<AudioSync audioChunks={[b64_1, b64_2]} />);
      expect(mockAudioInstances.length).toBe(1);
      expect(mockAudioInstances[0].src).not.toBe(firstSrc);
    });
  });

  describe('phonemes 转发', () => {
    it('有phonemes时应该调用onPhonemes回调', () => {
      const onPhonemes = vi.fn();
      const phonemes = [
        { char: '你', start_ms: 0, end_ms: 250, mouth_shape: 'closed' as const },
      ];

      render(<AudioSync phonemes={phonemes} onPhonemes={onPhonemes} />);
      expect(onPhonemes).toHaveBeenCalledWith(phonemes);
    });

    it('无phonemes时不应该调用onPhonemes', () => {
      const onPhonemes = vi.fn();
      render(<AudioSync onPhonemes={onPhonemes} />);
      expect(onPhonemes).not.toHaveBeenCalled();
    });
  });

  describe('时间毫秒回调', () => {
    it('audioUrl模式autoPlay时应该启动polling更新currentTime', () => {
      const onTimeUpdateMs = vi.fn();
      render(<AudioSync audioUrl="/audio/test.mp3" onTimeUpdateMs={onTimeUpdateMs} autoPlay />);
      const audio = mockAudioInstances[0];
      expect(audio.play).toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onTimeUpdateMs).toHaveBeenCalled();
    });
  });
});
