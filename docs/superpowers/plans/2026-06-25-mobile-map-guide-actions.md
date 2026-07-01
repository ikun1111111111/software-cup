# Mobile Map Guide Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/map` guide buttons feel usable by adding immediate action state, local feedback, and map-ready tolerant routing.

**Architecture:** Add a pure `mapGuideActions` helper for button labels, cooldowns, messages, and pending route command decisions. Wire that helper into `software/mobile/app/map.tsx` without moving durable tour state out of `TourContext`.

**Tech Stack:** React Native Expo, TypeScript, Jest/ts-jest, existing `TourContext`, existing `AmapViewRef`.

---

### Task 1: Pure Action Helpers

**Files:**
- Create: `software/mobile/utils/mapGuideActions.ts`
- Test: `software/mobile/__tests__/mapGuideActions.test.ts`

- [x] Write failing tests for action state creation, cooldown, route labels, and blocked route messages.
- [x] Run `npm test -- mapGuideActions.test.ts --runInBand` in `software/mobile` and confirm RED.
- [x] Implement the pure helper functions.
- [x] Re-run the focused test and confirm GREEN.

### Task 2: Map Page Wiring

**Files:**
- Modify: `software/mobile/app/map.tsx`

- [x] Import the helpers and add local `mapAction` state.
- [x] Update listen, route, arrive, detail, ask, and route-select handlers to set visible state before heavy work.
- [x] Add pending route command replay in `handleMapReady`.
- [x] Update button labels, disabled states, and action result panel text.

### Task 3: Verification

**Files:**
- Test: `software/mobile/__tests__/mapGuideActions.test.ts`
- Existing tests: `mapNarration.test.ts`, `mapDock.test.ts`, `digitalHumanProduct.test.ts`

- [x] Run focused tests.
- [x] Run TypeScript checking if feasible.
- [x] Review diff to confirm changes stay inside the map action scope.
