# Digital Human Guide Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Xiaoling the single digital-human guide core while preserving quiet companion and proactive guide as intensity settings.

**Architecture:** Add a small pure guide runtime module, test it first, then wire `useTourOrchestrator` old entry points through the unified runtime. Keep old fields as compatibility shims during this phase so current screens continue to work.

**Tech Stack:** React Native + Expo, TypeScript, Jest/ts-jest, existing `TourContext` and `useTourOrchestrator`.

---

## File Structure

- Create `software/mobile/utils/guideRuntime.ts`: pure helpers and types for `guideRuntime`, `startGuide`, and mode switching.
- Create `software/mobile/__tests__/guideRuntime.test.ts`: TDD coverage for companion/proactive state mapping.
- Modify `software/mobile/hooks/useTourOrchestrator.ts`: add `guideRuntime` to `TourState`, route `startGuideRoute`, `startSoloTour`, `switchToFreeMode`, and `switchToTourMode` through unified runtime.
- Modify `software/mobile/app/attractions/[id].tsx`: read `guideRuntime.mode` instead of `preferences.mode` for first-pass behavior while keeping fallback compatibility.
- Modify `software/mobile/components/guide/GuidePlanModal.tsx`: update mode copy to Xiaoling-centered labels.

### Task 1: Pure Guide Runtime

**Files:**
- Create: `software/mobile/utils/guideRuntime.ts`
- Test: `software/mobile/__tests__/guideRuntime.test.ts`

- [ ] **Step 1: Write failing tests**

Test companion and proactive mappings:

```ts
import {
  createInitialGuideRuntime,
  createStartedGuideRuntime,
  setGuideRuntimeMode,
} from '../utils/guideRuntime';

const route = {
  id: 'route-a',
  name: 'Xiaoling Route',
  spots: [
    { id: 'spot-a', name: 'Spot A' },
    { id: 'spot-b', name: 'Spot B' },
  ],
};

describe('guide runtime', () => {
  test('starts proactive guide as active navigation', () => {
    const runtime = createStartedGuideRuntime({
      route,
      mode: 'proactive',
      sourcePage: 'routes',
    });

    expect(runtime.mode).toBe('proactive');
    expect(runtime.companionLevel).toBe('active');
    expect(runtime.status).toBe('navigating');
    expect(runtime.currentRoute).toBe(route);
    expect(runtime.currentSpot).toEqual(route.spots[0]);
    expect(runtime.nextSpot).toEqual(route.spots[1]);
  });

  test('starts quiet companion as free roam without losing route context', () => {
    const runtime = createStartedGuideRuntime({
      route,
      mode: 'companion',
      companionLevel: 'quiet',
      sourcePage: 'home',
    });

    expect(runtime.mode).toBe('companion');
    expect(runtime.companionLevel).toBe('quiet');
    expect(runtime.status).toBe('free_roam');
    expect(runtime.currentRoute).toBe(route);
    expect(runtime.currentSpot).toEqual(route.spots[0]);
  });

  test('switches intensity while preserving current route and spot', () => {
    const runtime = createStartedGuideRuntime({
      route,
      mode: 'proactive',
      sourcePage: 'routes',
    });

    const quiet = setGuideRuntimeMode(runtime, 'companion', 'quiet');

    expect(quiet.mode).toBe('companion');
    expect(quiet.companionLevel).toBe('quiet');
    expect(quiet.status).toBe('free_roam');
    expect(quiet.currentRoute).toBe(route);
    expect(quiet.currentSpot).toEqual(route.spots[0]);
  });

  test('creates idle runtime with balanced companion defaults', () => {
    const runtime = createInitialGuideRuntime();

    expect(runtime.mode).toBe('companion');
    expect(runtime.companionLevel).toBe('balanced');
    expect(runtime.status).toBe('idle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/guideRuntime.test.ts --runInBand`
Expected: fail because `../utils/guideRuntime` does not exist.

- [ ] **Step 3: Implement pure runtime helpers**

Create exported types and functions matching the tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/guideRuntime.test.ts --runInBand`
Expected: pass.

### Task 2: Orchestrator State Convergence

**Files:**
- Modify: `software/mobile/hooks/useTourOrchestrator.ts`
- Test: `software/mobile/__tests__/guideRuntime.test.ts`

- [ ] **Step 1: Add `guideRuntime` to `TourState` and initial state**
- [ ] **Step 2: Add `startGuide` action using `createStartedGuideRuntime`**
- [ ] **Step 3: Route `startGuideRoute` through `startGuide`**
- [ ] **Step 4: Route `startSoloTour` through `startGuide` with `mode: 'companion'`**
- [ ] **Step 5: Route mode switches through `setGuideRuntimeMode`**
- [ ] **Step 6: Run `npx tsc --noEmit`**

### Task 3: First UI Consumers

**Files:**
- Modify: `software/mobile/app/attractions/[id].tsx`
- Modify: `software/mobile/components/guide/GuidePlanModal.tsx`

- [ ] **Step 1: Replace detail-page mode checks with `guideRuntime.mode`**
- [ ] **Step 2: Keep compatibility fallback to `preferences.mode` during migration**
- [ ] **Step 3: Rename guide modal labels to "小灵安静陪伴" and "小灵主动带路"**
- [ ] **Step 4: Run `npx tsc --noEmit`**

## Self-Review

- Spec coverage: covers state convergence, old action routing, first UI terminology, and compatibility migration.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `guideRuntime`, `GuideMode`, and `CompanionLevel` names match the design document.
