# Mobile Solo Digital Human Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable P0 slice of the mobile solo-tour digital human flow.

**Architecture:** Keep route recommendation local and deterministic so the demo works without backend services. Add a focused solo-tour utility module, wire it into existing guide data, then update the home and explore entry points to start a solo-tour flow through the existing `TourContext`.

**Tech Stack:** React Native Expo, TypeScript, Jest/ts-jest, existing `useTourOrchestrator`, existing local Ling Shan route data.

---

## File Structure

- Create `software/mobile/utils/soloTour.ts`: pure local recommendation logic, intent mapping, energy estimation, and companion copy.
- Create `software/mobile/__tests__/soloTour.test.ts`: tests for default solo profile, route selection, quiet mode, and fallback behavior.
- Modify `software/mobile/types/guide.ts`: extend `UserGuideProfile` with optional solo companion fields.
- Modify `software/mobile/data/lingshanGuideData.ts`: make default profile solo-first and expose `getSoloRouteRecommendation`.
- Modify `software/mobile/app/(tabs)/index.tsx`: rename the entry from free exploration to solo tour and pass solo intent into the guide plan modal.
- Modify `software/mobile/app/(tabs)/explore.tsx`: use solo recommendation copy in the hero and start `startGuideRoute` with the selected solo intent.
- Optional modify `software/mobile/components/guide/GuidePlanModal.tsx`: adjust visible text if its existing solo card does not already communicate the new flow clearly.

---

### Task 1: Solo Recommendation Utility

**Files:**
- Create: `software/mobile/utils/soloTour.ts`
- Test: `software/mobile/__tests__/soloTour.test.ts`
- Modify: `software/mobile/types/guide.ts`
- Modify: `software/mobile/data/lingshanGuideData.ts`

- [ ] **Step 1: Write failing tests**

Create `software/mobile/__tests__/soloTour.test.ts`:

```ts
import {
  DEFAULT_USER_GUIDE_PROFILE,
  LINGSHAN_GUIDE_ROUTES,
  getDefaultGuideRoute,
  getSoloRouteRecommendation,
} from '../data/lingshanGuideData';

describe('soloTour recommendation', () => {
  test('uses a solo-first default guide profile', () => {
    expect(DEFAULT_USER_GUIDE_PROFILE.groupType).toBe('solo');
    expect(DEFAULT_USER_GUIDE_PROFILE.companionLevel).toBe('balanced');
    expect(DEFAULT_USER_GUIDE_PROFILE.safetyReminder).toBe(true);
    expect(DEFAULT_USER_GUIDE_PROFILE.interests).toContain('free_walk');
  });

  test('recommends the quiet nature route for free walk solo intent', () => {
    const recommendation = getSoloRouteRecommendation({
      ...DEFAULT_USER_GUIDE_PROFILE,
      interests: ['free_walk', 'quiet'],
      companionLevel: 'quiet',
    });

    expect(recommendation.route.id).toBe('lingshan-nature-five-hours');
    expect(recommendation.reason).toContain('少打扰');
    expect(recommendation.companionLine).toContain('安静');
  });

  test('recommends the culture route when the user wants deep explanation', () => {
    const recommendation = getSoloRouteRecommendation({
      ...DEFAULT_USER_GUIDE_PROFILE,
      interests: ['history', 'deep_explain'],
      narrationDepth: 'deep',
      companionLevel: 'active',
    });

    expect(recommendation.route.id).toBe('lingshan-history-six-hours');
    expect(recommendation.reason).toContain('文化');
    expect(recommendation.estimatedEnergy).toBe('high');
  });

  test('falls back to an existing guide route for unknown solo preferences', () => {
    const route = getDefaultGuideRoute('free_walk');

    expect(LINGSHAN_GUIDE_ROUTES.map((item) => item.id)).toContain(route.id);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd software/mobile
npx jest __tests__/soloTour.test.ts --runInBand
```

Expected: FAIL because `getSoloRouteRecommendation`, `companionLevel`, and `safetyReminder` are not implemented yet.

- [ ] **Step 3: Implement minimal types and utility**

Add optional fields to `UserGuideProfile` in `software/mobile/types/guide.ts`:

```ts
  companionLevel?: 'quiet' | 'balanced' | 'active';
  safetyReminder?: boolean;
```

Create `software/mobile/utils/soloTour.ts` with a pure scoring function:

```ts
import type { GuideIntent, GuideRoute, UserGuideProfile } from '@/types/guide';

export interface SoloRouteRecommendation {
  route: GuideRoute;
  reason: string;
  confidence: number;
  estimatedEnergy: 'low' | 'medium' | 'high';
  companionLine: string;
}

function estimateEnergy(route: GuideRoute): SoloRouteRecommendation['estimatedEnergy'] {
  if (route.durationMinutes >= 330) return 'high';
  if (route.durationMinutes >= 240) return 'medium';
  return 'low';
}

function scoreRoute(route: GuideRoute, profile: UserGuideProfile): number {
  const interests = new Set(profile.interests);
  let score = 0;
  for (const intent of route.suitableFor) {
    if (interests.has(intent)) score += 4;
  }
  if (profile.groupType === 'solo') score += route.suitableFor.includes('free_walk') ? 5 : 1;
  if (profile.companionLevel === 'quiet' && route.suitableFor.includes('quiet')) score += 5;
  if (profile.narrationDepth === 'deep' && route.suitableFor.includes('deep_explain')) score += 4;
  if (interests.has('photo') && route.suitableFor.includes('photo')) score += 3;
  if (profile.pace === 'slow' && route.durationMinutes > 300) score -= 3;
  if (profile.pace === 'fast' && route.durationMinutes < 240) score -= 1;
  return score;
}

function buildReason(route: GuideRoute, profile: UserGuideProfile): string {
  if (profile.companionLevel === 'quiet' || profile.interests.includes('quiet')) {
    return `${route.name}适合独自慢走和少打扰游览，路线节奏更安静。`;
  }
  if (profile.narrationDepth === 'deep' || profile.interests.includes('deep_explain')) {
    return `${route.name}文化信息更完整，适合一个人慢慢听讲解。`;
  }
  if (profile.interests.includes('photo')) {
    return `${route.name}包含适合拍照打卡的地标节点，小灵会提醒取景点。`;
  }
  return `${route.name}动线清晰，适合由小灵陪你独自完成。`;
}

function buildCompanionLine(profile: UserGuideProfile): string {
  if (profile.companionLevel === 'quiet') return '我会安静陪你走，关键节点再提醒。';
  if (profile.companionLevel === 'active') return '我会多讲一点背景，也会主动帮你安排下一站。';
  return '我会按适中的节奏陪你走，需要时随时叫我。';
}

export function recommendSoloRoute(
  routes: GuideRoute[],
  profile: UserGuideProfile,
): SoloRouteRecommendation {
  const ranked = [...routes].sort((a, b) => scoreRoute(b, profile) - scoreRoute(a, profile));
  const route = ranked[0] ?? routes[0];
  return {
    route,
    reason: buildReason(route, profile),
    confidence: Math.max(0.6, Math.min(0.96, scoreRoute(route, profile) / 16)),
    estimatedEnergy: estimateEnergy(route),
    companionLine: buildCompanionLine(profile),
  };
}

export function soloIntentToProfilePatch(intent: GuideIntent): Partial<UserGuideProfile> {
  if (intent === 'quiet' || intent === 'free_walk') {
    return { interests: ['free_walk', 'quiet'], companionLevel: 'quiet', narrationDepth: 'brief' };
  }
  if (intent === 'deep_explain' || intent === 'history') {
    return { interests: ['history', 'deep_explain'], companionLevel: 'active', narrationDepth: 'deep' };
  }
  if (intent === 'photo') {
    return { interests: ['photo', 'free_walk'], companionLevel: 'balanced', narrationDepth: 'standard' };
  }
  return { interests: [intent], companionLevel: 'balanced' };
}
```

Update `software/mobile/data/lingshanGuideData.ts`:

```ts
import { recommendSoloRoute, type SoloRouteRecommendation } from '@/utils/soloTour';
```

Set default profile to solo and export:

```ts
export function getSoloRouteRecommendation(profile: UserGuideProfile): SoloRouteRecommendation {
  return recommendSoloRoute(LINGSHAN_GUIDE_ROUTES, profile);
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
cd software/mobile
npx jest __tests__/soloTour.test.ts --runInBand
```

Expected: PASS.

---

### Task 2: Wire Solo Tour Entry Points

**Files:**
- Modify: `software/mobile/app/(tabs)/index.tsx`
- Modify: `software/mobile/app/(tabs)/explore.tsx`
- Optional modify: `software/mobile/components/guide/GuidePlanModal.tsx`

- [ ] **Step 1: Inspect existing handlers**

Read handlers named `handleFreeExplore`, `handleStartGuide`, and `recommendedGuideRoute`. Keep existing navigation and modal behavior.

- [ ] **Step 2: Update home entry copy and behavior**

Change the home entry labels:

```tsx
<Text style={styles.entryTitle}>独自游览</Text>
<Text style={styles.entryDesc}>小灵陪你一个人走完整条路线</Text>
<Text style={styles.entryCta}>开始独游</Text>
```

Update `handleFreeExplore` to speak solo-tour copy and open the guide plan:

```ts
const handleFreeExplore = useCallback(() => {
  speakWithDigitalHuman('好的，今天我陪你一个人逛。先选一个独游节奏，我来安排路线。', 'happy');
  setShowGuidePlan(true);
}, []);
```

- [ ] **Step 3: Update explore recommendation copy**

Use `getSoloRouteRecommendation` with `tourState.guideProfile` to derive `recommendedGuideRoute`, `recommendation.reason`, and `recommendation.companionLine`.

- [ ] **Step 4: Keep existing start route action**

Continue calling:

```ts
tourActions.startGuideRoute(recommendedGuideRoute, selectedIntent);
```

Speak:

```ts
VRMManager.speak(`${recommendation.companionLine}${recommendation.reason} 我们先从${firstStopName}开始。`, 'happy');
```

---

### Task 3: Verify and Report

**Files:**
- No new files unless fixes are needed.

- [ ] **Step 1: Run focused tests**

```bash
cd software/mobile
npx jest __tests__/soloTour.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run related mobile tests**

```bash
cd software/mobile
npx jest __tests__/tourProgress.test.ts __tests__/digitalHumanDriver.test.ts --runInBand
```

Expected: PASS, or report pre-existing failures clearly.

- [ ] **Step 3: Run TypeScript**

```bash
cd software/mobile
npx tsc --noEmit --pretty false
```

Expected: PASS, or report existing unrelated failures separately from this change.
