const IDLE_DELAY_MIN_MS = 4_500;
const IDLE_DELAY_RANGE_MS = 4_000;

export class VRMIdleActionScheduler {
  private nextDueAtMs: number | null = null;

  constructor(private readonly random: () => number = Math.random) {}

  claim(nowMs: number): boolean {
    if (this.nextDueAtMs === null) {
      this.scheduleFrom(nowMs);
      return false;
    }
    if (nowMs < this.nextDueAtMs) return false;

    this.scheduleFrom(nowMs);
    return true;
  }

  postpone(nowMs: number): void {
    this.scheduleFrom(nowMs);
  }

  private scheduleFrom(nowMs: number): void {
    this.nextDueAtMs = nowMs + IDLE_DELAY_MIN_MS + this.random() * IDLE_DELAY_RANGE_MS;
  }
}

export const sharedVRMIdleActionScheduler = new VRMIdleActionScheduler();
