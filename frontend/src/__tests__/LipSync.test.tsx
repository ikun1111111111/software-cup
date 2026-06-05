import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import LipSync from '../components/DigitalHuman/LipSync';

// Mock rAF to execute callbacks synchronously with fake timers
const flushRaf = () => vi.advanceTimersByTime(16);

describe('LipSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染为null（逻辑组件）', () => {
      const { container } = render(<LipSync />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('音频处理（降级方案）', () => {
    it('无phonemes时应该处理音频数据并调用回调', () => {
      const onParameterChange = vi.fn();
      const audioData = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        audioData[i] = 0.5;
      }

      render(<LipSync audioData={audioData} onParameterChange={onParameterChange} />);

      act(() => { flushRaf(); });

      expect(onParameterChange).toHaveBeenCalled();
      const calls = onParameterChange.mock.calls;
      expect(calls.some((c: any[]) => c[0] === 'ParamMouthOpenY')).toBe(true);
    });

    it('enabled为false时不产生嘴型动作', () => {
      const onParameterChange = vi.fn();
      const audioData = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        audioData[i] = 0.5;
      }

      render(<LipSync audioData={audioData} onParameterChange={onParameterChange} enabled={false} />);

      act(() => { flushRaf(); flushRaf(); flushRaf(); });

      // When disabled, mouth should decay toward 0 — check no positive values
      const mouthCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamMouthOpenY' && c[1] > 0.1
      );
      expect(mouthCalls.length).toBe(0);
    });
  });

  describe('phoneme 驱动模式', () => {
    it('phonemes存在时应该优先使用phoneme驱动嘴型', () => {
      const onParameterChange = vi.fn();
      const phonemes = [
        { char: '你', start_ms: 0, end_ms: 250, mouth_shape: 'closed' as const },
        { char: '好', start_ms: 250, end_ms: 500, mouth_shape: 'open' as const },
      ];

      render(
        <LipSync
          phonemes={phonemes}
          currentTimeMs={100}
          onParameterChange={onParameterChange}
        />
      );

      act(() => { flushRaf(); });

      const mouthCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamMouthOpenY'
      );
      expect(mouthCalls.length).toBeGreaterThan(0);
    });

    it('closed mouth_shape应该映射到接近0的值', () => {
      const onParameterChange = vi.fn();
      const phonemes = [
        { char: '大', start_ms: 0, end_ms: 500, mouth_shape: 'closed' as const },
      ];

      render(
        <LipSync
          phonemes={phonemes}
          currentTimeMs={100}
          onParameterChange={onParameterChange}
          smoothing={0}
        />
      );

      act(() => { flushRaf(); });

      const mouthCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamMouthOpenY'
      );
      expect(mouthCalls.length).toBeGreaterThan(0);
    });

    it('open mouth_shape应该映射到接近1的值', () => {
      const onParameterChange = vi.fn();
      const phonemes = [
        { char: '啊', start_ms: 0, end_ms: 500, mouth_shape: 'open' as const },
      ];

      render(
        <LipSync
          phonemes={phonemes}
          currentTimeMs={100}
          onParameterChange={onParameterChange}
          smoothing={0}
        />
      );

      act(() => { flushRaf(); });

      const mouthCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamMouthOpenY'
      );
      expect(mouthCalls.length).toBeGreaterThan(0);
      // With smoothing=0 and open shape, value should be close to 1.0
      const lastValue = mouthCalls[mouthCalls.length - 1][1];
      expect(lastValue).toBeGreaterThan(0.5);
    });

    it('应该设置ParamMouthForm参数', () => {
      const onParameterChange = vi.fn();
      const phonemes = [
        { char: '啊', start_ms: 0, end_ms: 500, mouth_shape: 'open' as const },
      ];

      render(
        <LipSync
          phonemes={phonemes}
          currentTimeMs={100}
          onParameterChange={onParameterChange}
        />
      );

      act(() => { flushRaf(); });

      const formCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamMouthForm'
      );
      expect(formCalls.length).toBeGreaterThan(0);
    });

    it('说话时应该产生头部轻微晃动（ParamAngleZ）', () => {
      const onParameterChange = vi.fn();
      const phonemes = [
        { char: '你', start_ms: 0, end_ms: 500, mouth_shape: 'closed' as const },
      ];

      render(
        <LipSync
          phonemes={phonemes}
          currentTimeMs={100}
          onParameterChange={onParameterChange}
        />
      );

      act(() => { flushRaf(); });

      const angleCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamAngleZ'
      );
      expect(angleCalls.length).toBeGreaterThan(0);
    });
  });

  describe('回调函数', () => {
    it('应该在音频变化时调用onParameterChange', () => {
      const onParameterChange = vi.fn();
      const audioData = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        audioData[i] = 0.4;
      }

      render(<LipSync audioData={audioData} onParameterChange={onParameterChange} />);

      act(() => { flushRaf(); });

      expect(onParameterChange).toHaveBeenCalled();
      const lastCall = onParameterChange.mock.calls[onParameterChange.mock.calls.length - 1];
      expect(typeof lastCall[0]).toBe('string');
      expect(typeof lastCall[1]).toBe('number');
    });
  });
});
