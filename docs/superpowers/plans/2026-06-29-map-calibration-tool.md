# Map Calibration Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Web-only `/map-calibration` page for visually adjusting Lingshan AMap marker coordinates and copying snippets back to `lingshanSpots.ts`.

**Architecture:** Keep calibration state in a standalone Expo Router page. Extend the existing Web AMap adapter with optional draggable-marker callbacks, leaving native WebView behavior unchanged. Put pure coordinate/snippet helpers in a small utility file for TDD coverage.

**Tech Stack:** React Native Web, Expo Router, TypeScript, AMap JS API, Jest.

---

### Task 1: Calibration Helpers

**Files:**
- Create: `software/mobile/utils/mapCalibration.ts`
- Test: `software/mobile/__tests__/mapCalibration.test.ts`

- [x] Write tests for merging working coordinates, formatting coordinate snippets, and copying changed spot snippets.
- [x] Run `npm test -- --runInBand mapCalibration.test.ts` and confirm RED.
- [x] Implement helper functions in `mapCalibration.ts`.
- [x] Run the same test and confirm GREEN.

### Task 2: Web AMap Drag Support

**Files:**
- Modify: `software/mobile/components/map/AmapView.shared.ts`
- Modify: `software/mobile/components/map/AmapView.web.tsx`
- Modify: `software/mobile/components/map/AmapView.native.tsx`

- [x] Add optional calibration props to shared types.
- [x] In Web AMap marker creation, enable `draggable` only in calibration mode.
- [x] On marker drag end, emit the marker's GCJ-02 coordinate through `onSpotCoordinateChange`.
- [x] Keep native adapter accepting the new props without behavior changes.

### Task 3: Calibration Page

**Files:**
- Create: `software/mobile/app/map-calibration.tsx`

- [x] Create a desktop-oriented two-column page.
- [x] Load `LINGSHAN_SPOTS`, maintain working coordinates in local state, and render merged spots.
- [x] Support spot selection, map centering, nudge controls, step switching, reset current, reset all, copy current snippet, and copy changed snippet.
- [x] Show snippets even when clipboard copy fails.

### Task 4: Verification

**Commands:**
- `npm test -- --runInBand mapCalibration.test.ts mapSpotsFallback.test.ts amapCoordinates.test.ts mapViewport.test.ts`
- `npx tsc --noEmit`
- Expo Web smoke check for `/map-calibration`.
