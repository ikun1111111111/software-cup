# Mobile VRM Natural Lip-Sync Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile digital human's single, stepped jaw motion with deterministic speech timing, five visible VRM visemes, and frame-rate-independent smoothing.

**Architecture:** Add a small pure speech-envelope utility for TTS phonemes and fallback timing, then feed its scalar strength into the existing five-viseme calculator. Apply and smooth all five weights in both Three.js render loops while preserving the active idle emotion and the existing TTS/subtitle contracts.

**Tech Stack:** React Native, Expo, TypeScript, Three.js, `@pixiv/three-vrm`, Jest, ts-jest

---

## File Structure

- Create `software/mobile/utils/speechMouthMotion.ts`: deterministic scalar mouth targets for phoneme and no-phoneme speech.
- Create `software/mobile/__tests__/speechMouthMotion.test.ts`: pure timing and determinism tests.
- Modify `software/mobile/components/vrm/VRMIdleAnim.ts`: five-viseme application, delta-time smoothing, emotion restoration, and reset.
- Modify `software/mobile/__tests__/vrmLipSync.test.ts`: calculator, application, smoothing, reset, and render-wiring tests.
- Modify `software/mobile/components/vrm/VRMView.tsx`: pass elapsed time, frame delta, speaking state, and expression in both render paths.
- Modify `software/mobile/hooks/useVRMSync.ts`: remove random mouth sampling and use deterministic targets.
- Create `software/mobile/__tests__/vrmMouthDriver.test.ts`: source-level guard for the hook integration without touching the already-modified cleanup test.

`software/mobile/hooks/useVRMSync.ts` already contains uncommitted Web Audio unlock work. Preserve that block exactly. Do not stage or commit that file unless the pre-existing changes have first been separated or explicitly approved.

### Task 1: Build Deterministic Speech Mouth Envelopes

**Files:**
- Create: `software/mobile/utils/speechMouthMotion.ts`
- Create: `software/mobile/__tests__/speechMouthMotion.test.ts`

- [ ] **Step 1: Write the failing pure-function tests**

Create `software/mobile/__tests__/speechMouthMotion.test.ts`:

```ts
import {
  getFallbackSpeechMouthOpen,
  getPhonemeMouthOpen,
} from '../utils/speechMouthMotion';

describe('speech mouth motion', () => {
  test('produces deterministic fallback motion with visible closures', () => {
    const first = Array.from({ length: 70 }, (_, index) =>
      getFallbackSpeechMouthOpen(index * 10),
    );
    const second = Array.from({ length: 70 }, (_, index) =>
      getFallbackSpeechMouthOpen(index * 10),
    );

    expect(second).toEqual(first);
    expect(Math.min(...first)).toBeLessThan(0.05);
    expect(Math.max(...first)).toBeGreaterThan(0.65);
  });

  test('keeps fallback values finite and bounded', () => {
    for (const elapsedMs of [-20, 0, 85, 240, 620, Number.NaN]) {
      const value = getFallbackSpeechMouthOpen(elapsedMs);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  test('shapes phoneme attack and release around a phrase boundary', () => {
    const phonemes = [
      { char: '你', start_ms: 100, end_ms: 280, mouth_shape: 'open' as const },
      { char: '，', start_ms: 320, end_ms: 390, mouth_shape: 'closed' as const },
    ];

    expect(getPhonemeMouthOpen(phonemes, 100)).toBeLessThan(0.1);
    expect(getPhonemeMouthOpen(phonemes, 180)).toBeGreaterThan(0.7);
    expect(getPhonemeMouthOpen(phonemes, 275)).toBeLessThan(0.3);
    expect(getPhonemeMouthOpen(phonemes, 350)).toBe(0);
  });

  test('does not force a closure between adjacent voiced phonemes', () => {
    const phonemes = [
      { char: '灵', start_ms: 0, end_ms: 120, mouth_shape: 'half' as const },
      { char: '山', start_ms: 120, end_ms: 260, mouth_shape: 'open' as const },
    ];

    expect(getPhonemeMouthOpen(phonemes, 115)).toBeGreaterThan(0.3);
    expect(getPhonemeMouthOpen(phonemes, 125)).toBeGreaterThan(0.2);
  });
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/speechMouthMotion.test.ts
```

Expected: FAIL because `../utils/speechMouthMotion` does not exist.

- [ ] **Step 3: Implement the deterministic envelope utility**

Create `software/mobile/utils/speechMouthMotion.ts`:

```ts
import type { Phoneme } from '../api/tts';

const SHAPE_STRENGTH: Record<Phoneme['mouth_shape'], number> = {
  closed: 0,
  half: 0.46,
  open: 0.88,
};

const FALLBACK_STEPS = [
  { durationMs: 65, value: 0 },
  { durationMs: 105, value: 0.72 },
  { durationMs: 85, value: 0.34 },
  { durationMs: 55, value: 0.02 },
  { durationMs: 115, value: 0.62 },
  { durationMs: 80, value: 0.28 },
  { durationMs: 90, value: 0.78 },
  { durationMs: 60, value: 0 },
] as const;

const FALLBACK_CYCLE_MS = FALLBACK_STEPS.reduce(
  (total, step) => total + step.durationMs,
  0,
);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothStep = (value: number) => value * value * (3 - 2 * value);

export function getFallbackSpeechMouthOpen(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;

  let cursor = elapsedMs % FALLBACK_CYCLE_MS;
  let stepIndex = 0;
  while (
    stepIndex < FALLBACK_STEPS.length - 1
    && cursor >= FALLBACK_STEPS[stepIndex].durationMs
  ) {
    cursor -= FALLBACK_STEPS[stepIndex].durationMs;
    stepIndex += 1;
  }

  const current = FALLBACK_STEPS[stepIndex];
  const next = FALLBACK_STEPS[(stepIndex + 1) % FALLBACK_STEPS.length];
  const progress = smoothStep(clamp01(cursor / current.durationMs));
  return clamp01(current.value + (next.value - current.value) * progress);
}

export function getPhonemeMouthOpen(
  phonemes: Phoneme[],
  elapsedMs: number,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || phonemes.length === 0) {
    return 0;
  }

  const index = phonemes.findIndex(
    (phoneme) => elapsedMs >= phoneme.start_ms && elapsedMs < phoneme.end_ms,
  );
  if (index < 0) return 0;

  const phoneme = phonemes[index];
  const strength = SHAPE_STRENGTH[phoneme.mouth_shape] ?? 0;
  if (strength === 0) return 0;

  const previous = phonemes[index - 1];
  const next = phonemes[index + 1];
  const durationMs = Math.max(1, phoneme.end_ms - phoneme.start_ms);
  const hasLeadingClosure = !previous
    || previous.mouth_shape === 'closed'
    || phoneme.start_ms - previous.end_ms > 24;
  const hasTrailingClosure = !next
    || next.mouth_shape === 'closed'
    || next.start_ms - phoneme.end_ms > 24;

  const attackMs = Math.min(45, durationMs * 0.32);
  const releaseMs = Math.min(55, durationMs * 0.34);
  const attack = hasLeadingClosure
    ? smoothStep(clamp01((elapsedMs - phoneme.start_ms) / Math.max(1, attackMs)))
    : 1;
  const releaseStart = phoneme.end_ms - releaseMs;
  const release = hasTrailingClosure
    ? 1 - smoothStep(clamp01((elapsedMs - releaseStart) / Math.max(1, releaseMs)))
    : 1;

  return clamp01(strength * attack * release);
}
```

- [ ] **Step 4: Run the utility tests and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/speechMouthMotion.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the isolated utility**

```bash
git add software/mobile/utils/speechMouthMotion.ts software/mobile/__tests__/speechMouthMotion.test.ts
git commit -m "feat(mobile): add deterministic speech mouth motion"
```

### Task 2: Apply and Smooth All Five VRM Visemes

**Files:**
- Modify: `software/mobile/components/vrm/VRMIdleAnim.ts:4-79,214-229`
- Modify: `software/mobile/__tests__/vrmLipSync.test.ts`

- [ ] **Step 1: Add failing five-viseme and smoothing tests**

Extend the import in `software/mobile/__tests__/vrmLipSync.test.ts`:

```ts
import {
  applyMouthOpen,
  getSpeechLipWeights,
  resetMouthState,
  smoothSpeechLipWeights,
  type SpeechLipWeights,
} from '../components/vrm/VRMIdleAnim';
```

Append these tests:

```ts
beforeEach(() => {
  resetMouthState();
});

test('applies all five speech visemes while speaking', () => {
  const setValue = jest.fn();
  const vrm = { expressionManager: { setValue } } as any;

  applyMouthOpen(vrm, 0.82, 0.18, 1 / 60, true, 'neutral');

  expect(new Set(setValue.mock.calls.map(([name]) => name))).toEqual(
    new Set(['aa', 'ih', 'ou', 'ee', 'oh']),
  );
});

test('restores the emotion mouth and clears other visemes when speech stops', () => {
  const setValue = jest.fn();
  const vrm = { expressionManager: { setValue } } as any;

  applyMouthOpen(vrm, 0, 0.2, 1 / 60, false, 'surprised');

  expect(setValue).toHaveBeenCalledWith('aa', 0);
  expect(setValue).toHaveBeenCalledWith('ih', 0);
  expect(setValue).toHaveBeenCalledWith('ou', 0);
  expect(setValue).toHaveBeenCalledWith('ee', 0);
  expect(setValue).toHaveBeenCalledWith('oh', 0.82);
});

test('smooths a constant target consistently at 30 and 60 fps', () => {
  const target: SpeechLipWeights = { aa: 0.8, ih: 0.2, ou: 0, ee: 0, oh: 0 };
  const run = (fps: number) => {
    let current: SpeechLipWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    for (let frame = 0; frame < fps / 2; frame += 1) {
      current = smoothSpeechLipWeights(current, target, 1 / fps);
    }
    return current;
  };

  const at30 = run(30);
  const at60 = run(60);
  expect(at30.aa).toBeCloseTo(at60.aa, 4);
  expect(at30.ih).toBeCloseTo(at60.ih, 4);
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

- [ ] **Step 2: Run the lip tests and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts
```

Expected: FAIL because `smoothSpeechLipWeights` does not exist and the current application writes only `aa`.

- [ ] **Step 3: Add frame-rate-independent weight smoothing**

In `software/mobile/components/vrm/VRMIdleAnim.ts`, after `getSpeechLipWeights`, add:

```ts
export function smoothSpeechLipWeights(
  current: SpeechLipWeights,
  target: SpeechLipWeights,
  deltaSeconds: number,
): SpeechLipWeights {
  const dt = Number.isFinite(deltaSeconds)
    ? Math.max(0, Math.min(0.1, deltaSeconds))
    : 1 / 60;
  const next = { ...EMPTY_SPEECH_LIP_WEIGHTS };

  SPEECH_LIP_SHAPES.forEach((shape) => {
    const response = target[shape] >= current[shape] ? 18 : 24;
    const alpha = 1 - Math.exp(-response * dt);
    next[shape] = clamp01(
      current[shape] + (target[shape] - current[shape]) * alpha,
    );
  });
  return next;
}
```

Replace the scalar mouth state and functions near the existing `currentMouthValue` with:

```ts
let currentMouthWeights: SpeechLipWeights = { ...EMPTY_SPEECH_LIP_WEIGHTS };

export function applyMouthOpen(
  vrm: VRM,
  value: number,
  elapsed: number = 0,
  deltaSeconds: number = 1 / 60,
  speaking: boolean = value > 0,
  emotion: Emotion = 'neutral',
): void {
  const speechTarget = getSpeechLipWeights(value, elapsed, speaking);
  const idleMouth = getExpressionWeights(emotion).oh;
  const target: SpeechLipWeights = speaking
    ? speechTarget
    : { ...EMPTY_SPEECH_LIP_WEIGHTS, oh: idleMouth };

  currentMouthWeights = speaking
    ? smoothSpeechLipWeights(currentMouthWeights, target, deltaSeconds)
    : target;

  SPEECH_LIP_SHAPES.forEach((shape) => {
    vrm.expressionManager?.setValue(shape, currentMouthWeights[shape]);
  });
}

export function resetMouthState(vrm?: VRM): void {
  currentMouthWeights = { ...EMPTY_SPEECH_LIP_WEIGHTS };
  if (vrm) {
    SPEECH_LIP_SHAPES.forEach((shape) => {
      vrm.expressionManager?.setValue(shape, 0);
    });
  }
}
```

- [ ] **Step 4: Run lip and facial-expression tests and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts __tests__/vrmFacialExpression.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit the renderer helper behavior**

```bash
git add software/mobile/components/vrm/VRMIdleAnim.ts software/mobile/__tests__/vrmLipSync.test.ts
git commit -m "feat(mobile): smooth five VRM speech visemes"
```

### Task 3: Connect Both VRM Render Loops

**Files:**
- Modify: `software/mobile/components/vrm/VRMView.tsx:269-278,431-436,653-662,804-809`
- Modify: `software/mobile/__tests__/vrmLipSync.test.ts`

- [ ] **Step 1: Add a failing render-wiring test**

Add these imports to `software/mobile/__tests__/vrmLipSync.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
```

Append:

```ts
test('passes animation timing and speech context in both render loops', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
    'utf8',
  );
  const calls = source.match(
    /applyMouthOpen\(\s*vrm,\s*mouthOpenRef\.current,\s*elapsed,\s*dt,\s*speakingRef\.current,\s*expressionRef\.current,?\s*\);/g,
  ) || [];

  expect(calls).toHaveLength(2);
  expect(source.match(/resetMouthState\(VRMManager\.getVRM\(\) \?\? undefined\);/g) || [])
    .toHaveLength(2);
  expect(source).toMatch(
    /const vrm = await VRMManager\.getOrLoad\(modelFile\);[\s\S]*?resetMouthState\(vrm\);[\s\S]*?scene\.add\(vrm\.scene\);/,
  );
});
```

- [ ] **Step 2: Run the wiring test and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts
```

Expected: FAIL because both render loops still pass only `vrm` and `mouthOpen`, and stop/model-load paths do not clear all active VRM presets.

- [ ] **Step 3: Update Web and native render calls**

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
  dt,
  speakingRef.current,
  expressionRef.current,
);
```

In both `speaking` effects, replace:

```ts
if (!speaking) {
  resetMouthState();
}
```

with:

```ts
if (!speaking) {
  resetMouthState(VRMManager.getVRM() ?? undefined);
}
```

In the shared `loadAndAttachVRM` helper, insert the reset after the stale-load guard and before attaching the scene:

```ts
const vrm = await VRMManager.getOrLoad(modelFile);
if (shouldAttach && !shouldAttach()) return false;

resetMouthState(vrm);
if (vrm.scene.parent) {
  vrm.scene.parent.remove(vrm.scene);
}
scene.add(vrm.scene);
```

Because Web and native both use this helper, initial load, costume switch, retry, and manual reload all start with zero speech visemes.

- [ ] **Step 4: Run focused render tests and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmLipSync.test.ts __tests__/vrmFacialExpression.test.ts __tests__/vrmViewFocusGuard.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit render-loop integration**

```bash
git add software/mobile/components/vrm/VRMView.tsx software/mobile/__tests__/vrmLipSync.test.ts
git commit -m "feat(mobile): connect natural VRM lip sync"
```

### Task 4: Replace Random Hook Targets Without Disturbing Audio Unlock Work

**Files:**
- Modify: `software/mobile/hooks/useVRMSync.ts:6-52,220-227,542-569`
- Create: `software/mobile/__tests__/vrmMouthDriver.test.ts`

- [ ] **Step 1: Write the failing integration guard**

Create `software/mobile/__tests__/vrmMouthDriver.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

describe('VRM mouth driver integration', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../hooks/useVRMSync.ts'),
    'utf8',
  );

  test('uses deterministic mouth target helpers', () => {
    expect(source).toMatch(
      /import \{\s*getFallbackSpeechMouthOpen,\s*getPhonemeMouthOpen,?\s*\} from '\.\.\/utils\/speechMouthMotion';/,
    );
    expect(source).toContain('getFallbackSpeechMouthOpen(elapsed)');
    expect(source).toContain('getPhonemeMouthOpen(result.phonemes, elapsed)');
  });

  test('does not use random values for speech mouth motion', () => {
    expect(source).not.toContain('Math.random()');
    expect(source).not.toContain('MOUTH_SHAPE_VALUES');
  });

  test('preserves the existing web audio unlock path', () => {
    expect(source).toContain(
      "import { primeWebAudioPlayback } from '../utils/webAudioUnlock';",
    );
    expect(source).toContain(
      "window.addEventListener('pointerdown', unlockWebAudio, { capture: true });",
    );
  });
});
```

- [ ] **Step 2: Run the guard and verify RED**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmMouthDriver.test.ts
```

Expected: FAIL because `useVRMSync.ts` still contains `Math.random()` and `MOUTH_SHAPE_VALUES`.

- [ ] **Step 3: Replace scalar constants and random fallback updates**

In `software/mobile/hooks/useVRMSync.ts`, add:

```ts
import {
  getFallbackSpeechMouthOpen,
  getPhonemeMouthOpen,
} from '../utils/speechMouthMotion';
```

Delete:

```ts
const MOUTH_SHAPE_VALUES: Record<string, number> = {
  closed: 0.0,
  half: 0.4,
  open: 1.0,
};
```

Replace `startMouthSimulation` with:

```ts
const startMouthSimulation = useCallback(() => {
  clearMouthTimers();
  const startedAt = Date.now();
  const updateMouth = () => {
    if (!mountedRef.current) return;
    const elapsed = Date.now() - startedAt;
    const value = getFallbackSpeechMouthOpen(elapsed);
    setState((prev) => ({ ...prev, mouthOpen: value }));
  };
  updateMouth();
  mouthSimRef.current = setInterval(updateMouth, 50);
}, [clearMouthTimers]);
```

Inside the real-phoneme interval, replace the `targetMouth` declaration, per-phoneme mouth-shape assignment, and final state update with:

```ts
const targetMouth = getPhonemeMouthOpen(result.phonemes, elapsed);
let activeBoundaryIndex = -1;
for (let i = 0; i < result.phonemes.length; i++) {
  if (subtitleElapsed >= result.phonemes[i].start_ms) {
    activeBoundaryIndex = i;
  }
}
if (activeBoundaryIndex >= 0) {
  syncSubtitleToSpeechBoundary(
    subtitleBoundaries[activeBoundaryIndex]?.charIndex ?? 0,
  );
}
setState((prev) => ({ ...prev, mouthOpen: targetMouth }));
```

Replace the missing-phoneme interval with:

```ts
const startedAt = Date.now();
phonemeTimerRef.current = setInterval(() => {
  if (!mountedRef.current) return;
  const elapsed = Date.now() - startedAt;
  const value = getFallbackSpeechMouthOpen(elapsed);
  setState((prev) => ({ ...prev, mouthOpen: value }));
}, 50);
```

- [ ] **Step 4: Run driver, timing, and cleanup tests and verify GREEN**

Run:

```bash
cd software/mobile
npm test -- --runInBand __tests__/vrmMouthDriver.test.ts __tests__/speechMouthMotion.test.ts __tests__/vrmSpeechCleanup.test.ts __tests__/vrmSpeechSync.test.ts
```

Expected: all selected tests PASS, including the pre-existing Web Audio unlock assertions.

- [ ] **Step 5: Inspect the overlapping file instead of committing unrelated changes**

Run:

```bash
git diff -- software/mobile/hooks/useVRMSync.ts software/mobile/__tests__/vrmMouthDriver.test.ts
```

Expected: `useVRMSync.ts` contains both the pre-existing Web Audio unlock work and the new deterministic mouth changes. Do not stage or commit `useVRMSync.ts` as a whole in this task. Leave it for the user to combine with the existing work, or separate the hunks only after explicit approval.

### Task 5: Full Verification and Diff Audit

**Files:**
- Verify all files changed in Tasks 1-4.

- [ ] **Step 1: Run focused natural lip-sync tests**

```bash
cd software/mobile
npm test -- --runInBand __tests__/speechMouthMotion.test.ts __tests__/vrmLipSync.test.ts __tests__/vrmMouthDriver.test.ts __tests__/vrmFacialExpression.test.ts __tests__/vrmSpeechCleanup.test.ts __tests__/vrmSpeechSync.test.ts
```

Expected: all selected suites PASS with zero failures.

- [ ] **Step 2: Run the full mobile Jest suite**

```bash
cd software/mobile
npm test -- --runInBand
```

Expected: all mobile test suites PASS.

- [ ] **Step 3: Run TypeScript validation**

```bash
cd software/mobile
npx tsc --noEmit
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 4: Run the Expo Web production export**

```bash
cd software/mobile
npx expo export --platform web
```

Expected: export completes successfully with no bundling errors.

- [ ] **Step 5: Confirm no debug or random speech code remains**

```bash
rg -n "Math\.random|DEBUG-|MOUTH_SHAPE_VALUES" software/mobile/hooks/useVRMSync.ts software/mobile/components/vrm/VRMIdleAnim.ts software/mobile/utils/speechMouthMotion.ts
```

Expected: no matches.

- [ ] **Step 6: Audit the final scoped diff**

```bash
git diff -- software/mobile/utils/speechMouthMotion.ts software/mobile/__tests__/speechMouthMotion.test.ts software/mobile/components/vrm/VRMIdleAnim.ts software/mobile/__tests__/vrmLipSync.test.ts software/mobile/components/vrm/VRMView.tsx software/mobile/hooks/useVRMSync.ts software/mobile/__tests__/vrmMouthDriver.test.ts
```

Expected: every changed line traces to deterministic speech timing, five-viseme application, render-loop wiring, tests, or preservation of the existing audio-unlock behavior. No backend, model asset, subtitle contract, or unrelated expression changes are present.
