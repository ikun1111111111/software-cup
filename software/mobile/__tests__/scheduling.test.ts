import { runAfterNextPaint } from '../utils/scheduling';

describe('runAfterNextPaint', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('waits for an animation frame and a timer before running work', () => {
    const calls: string[] = [];
    const frameCallbacks: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    globalThis.cancelAnimationFrame = jest.fn();

    runAfterNextPaint(() => calls.push('task'));

    expect(calls).toEqual([]);
    jest.runOnlyPendingTimers();
    expect(calls).toEqual([]);

    expect(frameCallbacks).toHaveLength(1);
    frameCallbacks[0](16);
    expect(calls).toEqual([]);

    jest.runOnlyPendingTimers();
    expect(calls).toEqual(['task']);
  });

  test('can cancel scheduled work before it runs', () => {
    const calls: string[] = [];
    const frameCallbacks: FrameRequestCallback[] = [];
    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 7;
    });
    globalThis.cancelAnimationFrame = jest.fn();

    const cancel = runAfterNextPaint(() => calls.push('task'));
    cancel();
    expect(frameCallbacks).toHaveLength(1);
    frameCallbacks[0](16);
    jest.runOnlyPendingTimers();

    expect(calls).toEqual([]);
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(7);
  });
});
