# Mobile VRM-First Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile app read as a VRM digital-human guide product, with Xiaoling as the first interaction surface and persistent product narrator.

**Architecture:** Keep the existing Expo Router, TourContext, VRMProvider, and guide runtime. Add a small product-positioning config for Xiaoling-first labels and defaults, then wire the tab bar, chat voice default, home hero copy, and VRM visibility tests through that single source. Avoid rebuilding route, map, knowledge, or memory modules in this phase.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, existing VRM components, existing `useTourOrchestrator`/`useDigitalHumanDriver`.

---

## Product Decision

The mobile app should present Xiaoling, the VRM digital human, as the product's main subject:

- First screen: "Xiaoling is here to guide me."
- Chat: "I ask Xiaoling by text or voice, then Xiaoling speaks, moves, and answers."
- Explore/routes/map/attractions: "Xiaoling chooses, explains, leads, and records."
- Memory: "Xiaoling helped me turn the visit into a travel memory."

This phase is not a full redesign. It changes the top-level product frame and demo-critical defaults while preserving the current pages and data flow.

## File Structure

- Create `software/mobile/utils/digitalHumanProduct.ts`: Xiaoling-first product labels, tab config, default voice mode, and home hero copy.
- Create `software/mobile/__tests__/digitalHumanProduct.test.ts`: regression tests for the Xiaoling-first product contract.
- Modify `software/mobile/app/(tabs)/_layout.tsx`: read tab labels/icons from the product config.
- Modify `software/mobile/app/(tabs)/chat.tsx`: default to TTS, sharpen Xiaoling-centered header/calls to action.
- Modify `software/mobile/app/(tabs)/index.tsx`: update home hero, quick actions, and Xiaoling welcome lines so the first viewport is clearly digital-human led.
- Modify `software/mobile/components/vrm/vrmRouteVisibility.ts`: keep the current no-duplicate rule, with tests documenting which pages use their own local VRM stage.
- Modify `software/mobile/__tests__/vrmRouteVisibility.test.ts`: clarify that hidden routes are hidden because they already own a page-local Xiaoling stage.

## Task 1: Product Contract

**Files:**
- Create: `software/mobile/utils/digitalHumanProduct.ts`
- Create: `software/mobile/__tests__/digitalHumanProduct.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
  HOME_DIGITAL_HUMAN_LINES,
  MOBILE_DIGITAL_HUMAN_TABS,
} from '../utils/digitalHumanProduct';

describe('mobile digital human product contract', () => {
  test('makes Xiaoling the primary tab subject', () => {
    expect(MOBILE_DIGITAL_HUMAN_TABS.map((tab) => tab.title)).toEqual([
      '小灵',
      '问小灵',
      '小灵带路',
      '回忆',
      '我的',
    ]);
  });

  test('defaults chat to audible digital human speech', () => {
    expect(DEFAULT_DIGITAL_HUMAN_VOICE_MODE).toBe('tts');
  });

  test('home welcome lines introduce Xiaoling as the VRM guide', () => {
    expect(HOME_DIGITAL_HUMAN_LINES[0].text).toContain('小灵');
    expect(HOME_DIGITAL_HUMAN_LINES[0].text).toContain('VRM');
    expect(HOME_DIGITAL_HUMAN_LINES[1].text).toContain('语音');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- digitalHumanProduct.test.ts --runInBand`

Expected: fail because `../utils/digitalHumanProduct` does not exist.

- [ ] **Step 3: Add the product config**

```ts
export type MobileDigitalHumanTabName = 'index' | 'chat' | 'explore' | 'memory' | 'profile';
export type MobileDigitalHumanVoiceMode = 'silent' | 'browser' | 'tts';

export interface MobileDigitalHumanTab {
  name: MobileDigitalHumanTabName;
  title: string;
  icon: string;
}

export const MOBILE_DIGITAL_HUMAN_TABS: MobileDigitalHumanTab[] = [
  { name: 'index', title: '小灵', icon: '灵' },
  { name: 'chat', title: '问小灵', icon: '问' },
  { name: 'explore', title: '小灵带路', icon: '路' },
  { name: 'memory', title: '回忆', icon: '忆' },
  { name: 'profile', title: '我的', icon: '我' },
];

export const DEFAULT_DIGITAL_HUMAN_VOICE_MODE: MobileDigitalHumanVoiceMode = 'tts';

export const HOME_DIGITAL_HUMAN_LINES = [
  {
    delay: 1000,
    text: '欢迎来到灵山胜境，我是你的 VRM 数字人导游小灵。今天由我陪你问、走、听、记。',
    emotion: 'happy',
    duration: 5800,
    action: 'wave',
    actionDuration: 2200,
  },
  {
    delay: 7000,
    text: '你可以直接语音问我，也可以让我主动规划路线、沿途讲解、提醒打卡并生成旅行回忆。',
    emotion: 'thinking',
    duration: 6400,
    action: 'point',
    actionDuration: 2400,
  },
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- digitalHumanProduct.test.ts --runInBand`

Expected: pass.

## Task 2: Xiaoling-First Tabs

**Files:**
- Modify: `software/mobile/app/(tabs)/_layout.tsx`
- Test: `software/mobile/__tests__/digitalHumanProduct.test.ts`

- [ ] **Step 1: Replace hard-coded tab labels with `MOBILE_DIGITAL_HUMAN_TABS`**

Use `MOBILE_DIGITAL_HUMAN_TABS.find((tab) => tab.name === name)` for each `Tabs.Screen`.

- [ ] **Step 2: Use text glyphs instead of generic emoji icons**

Render the config `icon` inside the existing animated tab icon. Keep the current motion and haptics.

- [ ] **Step 3: Run tests**

Run: `npm test -- digitalHumanProduct.test.ts --runInBand`

Expected: pass.

## Task 3: Chat Defaults To Speaking Xiaoling

**Files:**
- Modify: `software/mobile/app/(tabs)/chat.tsx`
- Test: `software/mobile/__tests__/digitalHumanProduct.test.ts`

- [ ] **Step 1: Use `DEFAULT_DIGITAL_HUMAN_VOICE_MODE`**

Change initial chat voice mode from `'silent'` to the product default.

- [ ] **Step 2: Update chat page copy**

Change the header to:

- title: `和小灵对话`
- subtitle: `语音或文字提问，小灵会说话、做表情并回答`
- route CTA: `让小灵规划路线`

- [ ] **Step 3: Run focused tests**

Run: `npm test -- digitalHumanProduct.test.ts --runInBand`

Expected: pass.

## Task 4: Home First View Reframes The Product

**Files:**
- Modify: `software/mobile/app/(tabs)/index.tsx`
- Test: `software/mobile/__tests__/digitalHumanProduct.test.ts`

- [ ] **Step 1: Import `HOME_DIGITAL_HUMAN_LINES`**

Replace the local `HOME_VRM_LINES` array with the shared product copy.

- [ ] **Step 2: Change first-screen hero text**

Use:

- title: `小灵 VRM 数字人导游`
- subline: `XIAOLING VRM GUIDE`
- poem/caption: `语音问答 · 表情互动 · 全程带路`

- [ ] **Step 3: Change entry cards**

Use:

- quiet card title: `问小灵`
- quiet card description: `先和 VRM 数字人聊聊，再自由逛`
- quiet CTA: `开始对话`
- proactive card title: `小灵带路`
- proactive card description: `让小灵规划路线、讲解并提醒打卡`
- proactive CTA: `选择路线`

- [ ] **Step 4: Run focused tests**

Run: `npm test -- digitalHumanProduct.test.ts --runInBand`

Expected: pass.

## Task 5: VRM Visibility Rule Documentation

**Files:**
- Modify: `software/mobile/__tests__/vrmRouteVisibility.test.ts`
- Optionally modify: `software/mobile/components/vrm/vrmRouteVisibility.ts`

- [ ] **Step 1: Update test names**

Clarify that exact routes hide the global floating VRM only because those pages already own a local Xiaoling stage.

- [ ] **Step 2: Keep detail/content pages visible**

Ensure tests still assert that `/`, attraction detail, route detail, history, and memory keep the floating Xiaoling entry.

- [ ] **Step 3: Run route visibility tests**

Run: `npm test -- vrmRouteVisibility.test.ts --runInBand`

Expected: pass.

## Task 6: Verification

**Files:**
- No code files expected.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- digitalHumanProduct.test.ts vrmRouteVisibility.test.ts --runInBand
```

Expected: both suites pass.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: no new type errors from the changed files.

- [ ] **Step 3: Review changed files**

Run:

```bash
git diff -- software/mobile docs/superpowers/plans/2026-06-24-mobile-vrm-first-guide.md
```

Expected: changes are limited to the mobile Xiaoling-first framing and this plan.

## Self-Review

- Spec coverage: covers mobile-only scope, Xiaoling as primary subject, default multimodal speech, tab/product framing, home first viewport, and VRM visibility.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `DEFAULT_DIGITAL_HUMAN_VOICE_MODE`, `HOME_DIGITAL_HUMAN_LINES`, and `MOBILE_DIGITAL_HUMAN_TABS` are defined before use.
