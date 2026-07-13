import { VRMIdleActionScheduler } from '../components/vrm/vrmIdleActionScheduler';

describe('VRMIdleActionScheduler', () => {
  test('schedules the first idle action instead of triggering immediately', () => {
    const scheduler = new VRMIdleActionScheduler(() => 0);

    expect(scheduler.claim(1_000)).toBe(false);
    expect(scheduler.claim(5_499)).toBe(false);
    expect(scheduler.claim(5_500)).toBe(true);
  });

  test('allows only one player to claim a due idle action', () => {
    const scheduler = new VRMIdleActionScheduler(() => 0);

    expect(scheduler.claim(0)).toBe(false);
    expect(scheduler.claim(4_500)).toBe(true);
    expect(scheduler.claim(4_500)).toBe(false);
  });

  test('keeps the same deadline when another page checks the scheduler', () => {
    const scheduler = new VRMIdleActionScheduler(() => 0.5);

    expect(scheduler.claim(10_000)).toBe(false);
    expect(scheduler.claim(12_000)).toBe(false);
    expect(scheduler.claim(16_499)).toBe(false);
    expect(scheduler.claim(16_500)).toBe(true);
  });

  test('postpones the next idle action after speech or an explicit action', () => {
    const scheduler = new VRMIdleActionScheduler(() => 0);

    expect(scheduler.claim(0)).toBe(false);
    scheduler.postpone(4_000);

    expect(scheduler.claim(8_499)).toBe(false);
    expect(scheduler.claim(8_500)).toBe(true);
  });
});
