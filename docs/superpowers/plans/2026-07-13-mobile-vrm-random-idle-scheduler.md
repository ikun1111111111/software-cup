# Mobile VRM Random Idle Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop mobile VRM waiting animations from firing immediately on every page entry and preserve one random idle schedule across page-local `VRMView` instances.

**Architecture:** Add a small pure scheduler module that owns one absolute-time deadline and exposes an atomic `claim` operation plus an explicit `postpone` operation. `VRMDemoActionPlayer` keeps responsibility for GLB playback, but delegates idle timing to the shared scheduler so page mounts do not reset the countdown.

**Tech Stack:** TypeScript, Expo React Native, Three.js, Jest with ts-jest

---

## File Structure

- Create `software/mobile/components/vrm/vrmIdleActionScheduler.ts`: pure deadline scheduling and the shared application-level scheduler instance.
- Create `software/mobile/__tests__/vrmIdleActionScheduler.test.ts`: deterministic behavioral tests using injected random values.
- Modify `software/mobile/components/vrm/vrmDemoActionPlayer.ts`: replace instance-local `idleDueAt` with the shared scheduler and use absolute time.
- Modify `software/mobile/__tests__/vrmDemoActions.test.ts`: update integration assertions for the shared scheduler wiring while preserving existing GLB asset checks.

### Task 1: Build the deterministic shared idle scheduler

**Files:**
- Create: `software/mobile/components/vrm/vrmIdleActionScheduler.ts`
- Create: `software/mobile/__tests__/vrmIdleActionScheduler.test.ts`

- [ ] **Step 1: Write the failing scheduler tests**

Create `software/mobile/__tests__/vrmIdleActionScheduler.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the scheduler test to verify RED**

Run:

```bash
cd software/mobile
npx jest __tests__/vrmIdleActionScheduler.test.ts --runInBand
```

Expected: FAIL because `vrmIdleActionScheduler.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure scheduler**

Create `software/mobile/components/vrm/vrmIdleActionScheduler.ts`:

```ts
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
```

- [ ] **Step 4: Run the scheduler tests to verify GREEN**

Run:

```bash
cd software/mobile
npx jest __tests__/vrmIdleActionScheduler.test.ts --runInBand
```

Expected: PASS, 4 tests passing.

- [ ] **Step 5: Commit the scheduler unit**

```bash
git add software/mobile/components/vrm/vrmIdleActionScheduler.ts software/mobile/__tests__/vrmIdleActionScheduler.test.ts
git commit -m "feat(mobile): add shared VRM idle scheduler"
```

### Task 2: Integrate the shared schedule with the GLB action player

**Files:**
- Modify: `software/mobile/components/vrm/vrmDemoActionPlayer.ts:1-260`
- Modify: `software/mobile/__tests__/vrmDemoActions.test.ts:1-45`

- [ ] **Step 1: Replace the obsolete integration assertion with failing shared-scheduler assertions**

In `software/mobile/__tests__/vrmDemoActions.test.ts`, keep the existing asset and retargeting tests, then replace the current random-waiting tests with:

```ts
test('uses the shared absolute-time scheduler instead of a page-local zero deadline', () => {
  expect(playerSource).toContain("import { sharedVRMIdleActionScheduler } from './vrmIdleActionScheduler'");
  expect(playerSource).toContain('sharedVRMIdleActionScheduler.claim(nowMs)');
  expect(playerSource).not.toContain('private idleDueAt = 0');
  expect(playerSource).not.toContain('elapsed >= this.idleDueAt');
});

test('postpones random waiting actions around speech and explicit actions', () => {
  expect(playerSource).toContain('sharedVRMIdleActionScheduler.postpone(nowMs)');
  expect(playerSource).toContain('idleEligible !== this.wasIdleEligible');
  expect(playerSource).toMatch(/normalized === 'none' && speaking[\s\S]*?stopActive\(\)/);
});

test('lets a started speech GLB finish when React releases the action', () => {
  expect(playerSource).toContain("this.activeAction?.startsWith('waiting')");
  expect(playerSource).toMatch(/normalized === 'none'[\s\S]*?activeAction[\s\S]*?stopActive/);
  expect(playerSource).not.toMatch(/normalized === 'none' && speaking\)[\s\S]*?this\.stopActive\(\)/);
});
```

- [ ] **Step 2: Run the integration test to verify RED**

Run:

```bash
cd software/mobile
npx jest __tests__/vrmDemoActions.test.ts --runInBand
```

Expected: FAIL because the player still owns `idleDueAt` and does not import the shared scheduler.

- [ ] **Step 3: Replace page-local timing with the shared scheduler**

In `software/mobile/components/vrm/vrmDemoActionPlayer.ts`:

1. Add the import:

```ts
import { sharedVRMIdleActionScheduler } from './vrmIdleActionScheduler';
```

2. Replace `private idleDueAt = 0;` with:

```ts
private wasIdleEligible: boolean | null = null;
```

3. At the start of `update`, after normalizing the requested action, calculate absolute time and eligibility:

```ts
const nowMs = Date.now();
const idleEligible = normalized === 'none' && !speaking;
if (this.wasIdleEligible !== null && idleEligible !== this.wasIdleEligible) {
  sharedVRMIdleActionScheduler.postpone(nowMs);
}
this.wasIdleEligible = idleEligible;
```

4. Remove the `this.resetIdleTimer(elapsed)` calls from requested-action changes and speech interruption. The eligibility transition above already postpones the shared schedule when speech or an explicit action starts or ends, so keeping those calls would reschedule twice.

5. When an active animation reaches its duration, replace its `this.resetIdleTimer(elapsed)` call with:

```ts
sharedVRMIdleActionScheduler.postpone(nowMs);
```

6. Replace the idle trigger condition with:

```ts
if (idleEligible && sharedVRMIdleActionScheduler.claim(nowMs)) {
  const idleAction = IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)];
  void this.start(idleAction, vrm);
}
```

7. Delete `resetIdleTimer`. In `dispose()`, reset only `wasIdleEligible` and local playback state; do not reset the shared scheduler.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
cd software/mobile
npx jest __tests__/vrmIdleActionScheduler.test.ts __tests__/vrmDemoActions.test.ts --runInBand
```

Expected: PASS, with both suites green.

- [ ] **Step 5: Commit the player integration**

```bash
git add software/mobile/components/vrm/vrmDemoActionPlayer.ts software/mobile/__tests__/vrmDemoActions.test.ts
git commit -m "fix(mobile): randomize VRM idle actions across pages"
```

### Task 3: Verify regression safety and document the completed behavior

**Files:**
- Modify only if necessary: `README.md`

- [ ] **Step 1: Run all mobile tests**

Run:

```bash
cd software/mobile
npm test -- --runInBand
```

Expected: all Jest suites pass with zero failures.

- [ ] **Step 2: Run TypeScript validation**

Run:

```bash
cd software/mobile
npx tsc --noEmit
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Review the final scoped diff**

Run:

```bash
git diff HEAD~2 -- software/mobile/components/vrm/vrmIdleActionScheduler.ts software/mobile/components/vrm/vrmDemoActionPlayer.ts software/mobile/__tests__/vrmIdleActionScheduler.test.ts software/mobile/__tests__/vrmDemoActions.test.ts
```

Verify:

- no first-frame waiting action;
- one shared absolute-time deadline;
- speech and explicit actions postpone waiting;
- only `waiting1`, `waiting2`, and `waiting3` are randomly selected;
- unrelated working-tree changes remain untouched.

- [ ] **Step 4: Update project documentation only if the existing README documents VRM behavior**

If `README.md` contains a mobile VRM behavior section, add this exact bullet under it:

```markdown
- 移动端数字人的 waiting 待机动作采用跨页面共享的 4.5–8.5 秒随机调度，页面切换不会立即触发或重置倒计时。
```

If no such section exists, make no README change because the committed design document already records the behavior.

- [ ] **Step 5: Commit any necessary documentation change**

If Step 4 changed `README.md`:

```bash
git add README.md
git commit -m "docs: record mobile VRM idle scheduling"
```

If Step 4 made no change, do not create an empty commit.
