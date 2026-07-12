# Mobile VRM Natural Lip Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile VRM's single continuously-open `aa` mouth with a lightweight, animated five-viseme speaking pattern that closes cleanly when speech stops.

**Architecture:** Add a deterministic pure lip-weight calculator to the existing VRM animation module, then apply its five weights from both VRM render loops using the existing `mouthOpen`, elapsed time, speaking state, and emotion. Keep TTS, subtitle timing, React state, and backend contracts unchanged.

**Tech Stack:** React Native, TypeScript, Three.js, `@pixiv/three-vrm`, Jest

---

## File Structure

- Create `software/mobile/__tests__/vrmLipSync.test.ts`: behavioral tests for multi-viseme calculation, application, reset, and facial-expression preservation.
- Modify `software/mobile/components/vrm/VRMIdleAnim.ts`: define lip-weight types, calculate procedural visemes, smooth/apply all five mouth presets, and reset every speech preset.
- Modify `software/mobile/components/vrm/VRMView.tsx`: pass elapsed time, speaking state, and current emotion into the mouth renderer in both Web and Native loops.

### Task 1: Define Natural Multi-Viseme Behavior

**Files:**
- Create: `software/mobile/__tests__/vrmLipSync.test.ts`
- Modify: `software/mobile/components/vrm/VRMIdleAnim.ts`

- [ ] **Step 1: Write the failing pure-function tests**

Create `software/mobile/__tests__/vrmLipSync.test.ts` with:

```ts
import {
  getSpeechLipWeights,
  type SpeechLipWeights,
} from '../components/vrm/VRMIdleAnim';

const values = (weights: SpeechLipWeights) => Object.values(weights);

describe('VRM speech lip weights', () => {
  test('closes every speech viseme when not speaking', () => {
    expect(getSpeechLipWeights(0.9, 0.2, false)).toEqual({
      aa: 0,
      ih: 0,
      ou: 0,
      ee: 0,
      oh: 0,
    });
  });

  test('cycles through several dominant visemes while speaking', () => {
    const dominantShapes = [0.02, 0.14, 0.26, 0.38, 0.5, 0.62]
      .map((elapsed) => getSpeechLipWeights(0.85, elapsed, true))
      .map((weights) => Object.entries(weights)
        .sort(([, left], [, right]) => right - left)[0])
      .filter((entry) => entry[1] > 0.05)
      .map(([shape]) => shape);

    expect(new Set(dominantShapes).size).toBeGreaterThanOrEqual(3);
  });

  test('keeps every viseme finite and within the VRM expression range', () => {
    for (const elapsed of [0, 0.1, 0.25, 0.5, 0.9, 1.4]) {
      for (const weight of values(getSpeechLipWeights(2, elapsed, true))) {
        expect(Number.isFinite(weight)).toBe(true);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    }
  });

  test('contains a brief near-closed beat between syllable groups', () => {
    const samples = Array.from({ length: 80 }, (_, index) =>
      Math.max(...values(getSpeechLipWeights(0.8, index * 0.01, true))),
    );

    expect(Math.min(...samples)).toBeLessThan(0.08);
    expect(Math.max(...samples)).toBeGreaterThan(0.35);
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts
```

Expected: FAIL because `getSpeechLipWeights` and `SpeechLipWeights` do not exist.

- [ ] **Step 3: Implement the minimal deterministic lip calculator**

In `software/mobile/components/vrm/VRMIdleAnim.ts`, add:

```ts
export type SpeechLipShape = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';
export type SpeechLipWeights = Record<SpeechLipShape, number>;

const SPEECH_LIP_SHAPES: SpeechLipShape[] = ['aa', 'ih', 'ou', 'ee', 'oh'];
const EMPTY_SPEECH_LIP_WEIGHTS: SpeechLipWeights = {
  aa: 0,
  ih: 0,
  ou: 0,
  ee: 0,
  oh: 0,
};

const SPEECH_LIP_SEQUENCE: Array<{
  shape: SpeechLipShape | null;
  duration: number;
  intensity: number;
}> = [
  { shape: 'aa', duration: 0.12, intensity: 1 },
  { shape: 'ih', duration: 0.09, intensity: 0.7 },
  { shape: 'ou', duration: 0.12, intensity: 0.82 },
  { shape: null, duration: 0.045, intensity: 0 },
  { shape: 'ee', duration: 0.1, intensity: 0.68 },
  { shape: 'oh', duration: 0.13, intensity: 0.86 },
  { shape: 'aa', duration: 0.08, intensity: 0.55 },
  { shape: null, duration: 0.055, intensity: 0 },
];

const SPEECH_LIP_CYCLE_DURATION = SPEECH_LIP_SEQUENCE.reduce(
  (total, step) => total + step.duration,
  0,
);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothStep = (value: number) => value * value * (3 - 2 * value);

export function getSpeechLipWeights(
  mouthOpen: number,
  elapsed: number,
  speaking: boolean,
): SpeechLipWeights {
  if (!speaking || !Number.isFinite(mouthOpen) || mouthOpen <= 0.01) {
    return { ...EMPTY_SPEECH_LIP_WEIGHTS };
  }

  const strength = clamp01(mouthOpen);
  const safeElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  let cursor = safeElapsed % SPEECH_LIP_CYCLE_DURATION;
  let stepIndex = 0;

  while (cursor >= SPEECH_LIP_SEQUENCE[stepIndex].duration) {
    cursor -= SPEECH_LIP_SEQUENCE[stepIndex].duration;
    stepIndex += 1;
  }

  const current = SPEECH_LIP_SEQUENCE[stepIndex];
  const next = SPEECH_LIP_SEQUENCE[(stepIndex + 1) % SPEECH_LIP_SEQUENCE.length];
  const progress = smoothStep(clamp01(cursor / current.duration));
  const weights = { ...EMPTY_SPEECH_LIP_WEIGHTS };

  if (current.shape) {
    weights[current.shape] += strength * current.intensity * (1 - progress);
  }
  if (next.shape) {
    weights[next.shape] += strength * next.intensity * progress;
  }

  SPEECH_LIP_SHAPES.forEach((shape) => {
    weights[shape] = clamp01(weights[shape]);
  });
  return weights;
}
```

If the near-closed test shows that interpolation across a rest is still too open, keep the same sequence and multiply transition progress around `shape: null` by a short zero envelope instead of changing the test threshold.

- [ ] **Step 4: Run the new test and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts
```

Expected: 4 tests PASS with no warnings.

- [ ] **Step 5: Commit the calculator and tests**

```bash
git add software/mobile/components/vrm/VRMIdleAnim.ts software/mobile/__tests__/vrmLipSync.test.ts
git commit -m "feat(mobile): add natural VRM lip weights"
```

### Task 2: Apply and Reset All Speech Visemes

**Files:**
- Modify: `software/mobile/__tests__/vrmLipSync.test.ts`
- Modify: `software/mobile/components/vrm/VRMIdleAnim.ts`

- [ ] **Step 1: Write failing application and reset tests**

Append:

```ts
import {
  applyMouthOpen,
  resetMouthState,
} from '../components/vrm/VRMIdleAnim';

test('applies all five speech visemes during speech', () => {
  const setValue = jest.fn();
  const vrm = { expressionManager: { setValue } } as any;

  applyMouthOpen(vrm, 0.8, 0.18, true, 'neutral');

  expect(new Set(setValue.mock.calls.map(([name]) => name))).toEqual(
    new Set(['aa', 'ih', 'ou', 'ee', 'oh']),
  );
});

test('restores the emotion mouth and clears other visemes when speech stops', () => {
  const setValue = jest.fn();
  const vrm = { expressionManager: { setValue } } as any;

  applyMouthOpen(vrm, 0, 0.2, false, 'surprised');

  expect(setValue).toHaveBeenCalledWith('aa', 0);
  expect(setValue).toHaveBeenCalledWith('ih', 0);
  expect(setValue).toHaveBeenCalledWith('ou', 0);
  expect(setValue).toHaveBeenCalledWith('ee', 0);
  expect(setValue).toHaveBeenCalledWith('oh', 0.82);
});

test('reset clears every speech viseme immediately', () => {
  const setValue = jest.fn();
  const vrm = { expressionManager: { setValue } } as any;

  resetMouthState(vrm);

  expect(setValue.mock.calls).toEqual([
    ['aa', 0],
    ['ih', 0],
    ['ou', 0],
    ['ee', 0],
    ['oh', 0],
  ]);
});
```

- [ ] **Step 2: Run application tests and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts
```

Expected: FAIL because the current implementation only sets or resets `aa` and accepts only two arguments.

- [ ] **Step 3: Replace scalar smoothing with five-viseme smoothing**

In `software/mobile/components/vrm/VRMIdleAnim.ts`, replace `currentMouthValue` with:

```ts
let currentMouthWeights: SpeechLipWeights = { ...EMPTY_SPEECH_LIP_WEIGHTS };
const MOUTH_SMOOTHING = 0.3;
```

Replace `applyMouthOpen` with:

```ts
export function applyMouthOpen(
  vrm: VRM,
  value: number,
  elapsed: number = 0,
  speaking: boolean = value > 0,
  emotion: Emotion = 'neutral',
): void {
  const target = getSpeechLipWeights(value, elapsed, speaking);
  const baseOh = speaking ? 0 : getExpressionWeights(emotion).oh;

  SPEECH_LIP_SHAPES.forEach((shape) => {
    const targetValue = shape === 'oh' && !speaking ? baseOh : target[shape];
    currentMouthWeights[shape] = speaking
      ? currentMouthWeights[shape] * MOUTH_SMOOTHING
        + targetValue * (1 - MOUTH_SMOOTHING)
      : targetValue;
    vrm.expressionManager?.setValue(shape, clamp01(currentMouthWeights[shape]));
  });
}
```

Replace `resetMouthState` with:

```ts
export function resetMouthState(vrm?: VRM): void {
  currentMouthWeights = { ...EMPTY_SPEECH_LIP_WEIGHTS };
  if (vrm) {
    SPEECH_LIP_SHAPES.forEach((shape) => {
      vrm.expressionManager?.setValue(shape, 0);
    });
  }
}
```

- [ ] **Step 4: Run application tests and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts __tests__/vrmFacialExpression.test.ts
```

Expected: all lip-sync and facial-expression tests PASS.

- [ ] **Step 5: Commit the renderer helper behavior**

```bash
git add software/mobile/components/vrm/VRMIdleAnim.ts software/mobile/__tests__/vrmLipSync.test.ts
git commit -m "feat(mobile): animate VRM speech visemes"
```

### Task 3: Connect Both VRM Render Loops

**Files:**
- Modify: `software/mobile/components/vrm/VRMView.tsx:435`
- Modify: `software/mobile/components/vrm/VRMView.tsx:808`
- Modify: `software/mobile/__tests__/vrmLipSync.test.ts`

- [ ] **Step 1: Write a failing source-wiring regression test**

Append:

```ts
import fs from 'fs';
import path from 'path';

test('passes animation time and speaking context in both render loops', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
    'utf8',
  );
  const calls = source.match(
    /applyMouthOpen\(vrm, mouthOpenRef\.current, elapsed, speakingRef\.current, expressionRef\.current\);/g,
  ) || [];

  expect(calls).toHaveLength(2);
});
```

- [ ] **Step 2: Run the wiring test and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts
```

Expected: FAIL because both render loops still pass only `vrm` and `mouthOpen`.

- [ ] **Step 3: Update Web and Native render calls**

In both render loops in `software/mobile/components/vrm/VRMView.tsx`, replace:

```ts
applyMouthOpen(vrm, mouthOpenRef.current);
```

with:

```ts
applyMouthOpen(
  vrm,
  mouthOpenRef.current,
  elapsed,
  speakingRef.current,
  expressionRef.current,
);
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts __tests__/vrmFacialExpression.test.ts __tests__/vrmSpeechCleanup.test.ts
```

Expected: all selected suites PASS.

- [ ] **Step 5: Commit render-loop integration**

```bash
git add software/mobile/components/vrm/VRMView.tsx software/mobile/__tests__/vrmLipSync.test.ts
git commit -m "feat(mobile): connect VRM visemes to speech rendering"
```

### Task 4: Full Verification

**Files:**
- Verify: `software/mobile/components/vrm/VRMIdleAnim.ts`
- Verify: `software/mobile/components/vrm/VRMView.tsx`
- Verify: `software/mobile/__tests__/vrmLipSync.test.ts`

- [ ] **Step 1: Run the full mobile test suite**

```bash
cd software/mobile
npm test -- --runInBand
```

Expected: all Jest suites PASS with zero failures.

- [ ] **Step 2: Run TypeScript validation**

```bash
cd software/mobile
npx tsc --noEmit
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Run the production export/build**

```bash
cd software/mobile
npx expo export --platform web
```

Expected: exit code 0 and a completed export without bundling errors.

- [ ] **Step 4: Inspect the final diff**

```bash
git diff HEAD~3 -- software/mobile/components/vrm/VRMIdleAnim.ts software/mobile/components/vrm/VRMView.tsx software/mobile/__tests__/vrmLipSync.test.ts
```

Expected: only the approved lip-sync calculation, render wiring, and regression tests are present.
