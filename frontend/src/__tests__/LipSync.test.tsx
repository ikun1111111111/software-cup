import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import LipSync from '../components/DigitalHuman/LipSync';

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

  describe('音频处理', () => {
    it('应该处理音频数据并调用回调', () => {
      const onParameterChange = vi.fn();
      const audioData = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        audioData[i] = 0.5;
      }

      render(<LipSync audioData={audioData} onParameterChange={onParameterChange} />);

      expect(onParameterChange).toHaveBeenCalled();
      // Should call with ParamMouthOpenY
      const calls = onParameterChange.mock.calls;
      expect(calls.some((c: any[]) => c[0] === 'ParamMouthOpenY')).toBe(true);
    });

    it('无audioData时应该调用回调关闭嘴巴', () => {
      const onParameterChange = vi.fn();
      render(<LipSync audioData={null} onParameterChange={onParameterChange} />);

      expect(onParameterChange).toHaveBeenCalled();
    });

    it('enabled为false时不处理音频数据', () => {
      const onParameterChange = vi.fn();
      const audioData = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        audioData[i] = 0.5;
      }

      render(<LipSync audioData={audioData} onParameterChange={onParameterChange} enabled={false} />);

      // When disabled, should not process audio data for mouth opening
      // (may still call for decay, but value should be low)
      const mouthCalls = onParameterChange.mock.calls.filter(
        (c: any[]) => c[0] === 'ParamMouthOpenY' && c[1] > 0.1
      );
      expect(mouthCalls.length).toBe(0);
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

      expect(onParameterChange).toHaveBeenCalled();
      const lastCall = onParameterChange.mock.calls[onParameterChange.mock.calls.length - 1];
      expect(typeof lastCall[0]).toBe('string');
      expect(typeof lastCall[1]).toBe('number');
    });
  });
});
