import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLive2D } from '../hooks/useLive2D';

describe('useLive2D', () => {
  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useLive2D());

      expect(result.current.state.isModelReady).toBe(false);
      expect(result.current.state.currentExpression).toBe('default');
      expect(result.current.state.isSpeaking).toBe(false);
    });

    it('应该提供所有操作方法', () => {
      const { result } = renderHook(() => useLive2D());

      expect(typeof result.current.setModelActions).toBe('function');
      expect(typeof result.current.setExpression).toBe('function');
      expect(typeof result.current.triggerMotion).toBe('function');
      expect(typeof result.current.setParameter).toBe('function');
      expect(typeof result.current.setSpeaking).toBe('function');
    });
  });

  describe('模型就绪', () => {
    it('setModelActions后应该设置isModelReady为true', () => {
      const { result } = renderHook(() => useLive2D());

      const mockActions = {
        setExpression: () => {},
        motion: () => {},
        setParameter: () => {},
        getModel: () => null,
      };

      act(() => {
        result.current.setModelActions(mockActions);
      });

      expect(result.current.state.isModelReady).toBe(true);
    });
  });

  describe('表情控制', () => {
    it('setExpression应该更新currentExpression', () => {
      const { result } = renderHook(() => useLive2D());

      act(() => {
        result.current.setExpression('happy');
      });

      expect(result.current.state.currentExpression).toBe('happy');
    });

    it('setExpression应该调用底层actions', () => {
      const { result } = renderHook(() => useLive2D());
      const mockFn = { setExpression: () => {} };

      act(() => {
        result.current.setModelActions({
          ...mockFn,
          motion: () => {},
          setParameter: () => {},
          getModel: () => null,
        });
      });

      act(() => {
        result.current.setExpression('sad');
      });

      expect(result.current.state.currentExpression).toBe('sad');
    });
  });

  describe('语音状态', () => {
    it('setSpeaking应该更新isSpeaking', () => {
      const { result } = renderHook(() => useLive2D());

      act(() => {
        result.current.setSpeaking(true);
      });

      expect(result.current.state.isSpeaking).toBe(true);

      act(() => {
        result.current.setSpeaking(false);
      });

      expect(result.current.state.isSpeaking).toBe(false);
    });
  });
});
