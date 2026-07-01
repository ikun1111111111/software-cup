# Mobile Map Guide Actions Design

Date: 2026-06-25

## Decision

Turn the four action buttons in `/map` into a small guide control console, not plain triggers.

The current buttons already call handlers, but the visible result is too indirect: tapping a button may update TourContext, speak through VRM/TTS, inject JavaScript into the map WebView, request location, or navigate to another route. When any of those parts is slow, the user sees little immediate feedback and reads the experience as "stuck" or "useless".

The new design keeps the existing map page and guide architecture, but adds an explicit action state layer:

```ts
type MapGuideAction =
  | 'idle'
  | 'narrating'
  | 'routing'
  | 'arrived'
  | 'asking'
  | 'opening_detail'
  | 'selecting_route';
```

Every button must answer three questions immediately:

- What did I just ask Xiaoling to do?
- Is Xiaoling working, done, or blocked?
- What can I do next?

## Product Goal

The map should feel like "Xiaoling is guiding me now", not like a map with several decorative buttons.

Target experience:

- Button tap gives visual feedback within 100ms.
- The dock shows a concrete result or fallback within 3 seconds.
- Slow map loading, slow location permission, backend failure, or TTS delay must not block the UI.
- Demo mode remains usable without backend services and without precise GPS.

## Scope

This design covers the `/map` bottom dock actions in `software/mobile/app/map.tsx`:

- `我已到达`
- `开始讲解`
- `听小灵讲`
- `小灵指路`
- `问小灵`
- `景点详情`
- `选路线` / `继续路线`

It does not redesign the full map visual system, route data model, VRM renderer, or backend guide API.

## Current Implementation Surface

Primary files:

- `software/mobile/app/map.tsx`
  - `handleNavigateWithMap`
  - `handleStartNarration`
  - `handleDemoArrive`
  - `handleArrive`
  - `handleLocate`
  - `handleCancelNavigation`
- `software/mobile/hooks/useMapSpots.ts`
  - Local spot fallback
  - Selected spot state
  - Navigation state
  - Distance and route estimate
- `software/mobile/hooks/useTourOrchestrator.ts`
  - `startNarration`
  - `arriveAtStop`
  - `resumeTour`
  - `navigateToSpot`
- `software/mobile/components/map/AmapView.native.tsx`
- `software/mobile/components/map/AmapView.web.tsx`
- `software/mobile/components/map/AmapView.shared.ts`
- `software/mobile/utils/mapNarration.ts`
- `software/mobile/utils/digitalHumanProduct.ts`

Important existing behavior:

- `useMapSpots` now renders local fallback spots immediately, so the first screen should not wait for the online spots API.
- `startNarration` writes local narration text into TourContext, so the page can display narration even when the backend SSE path is unavailable.
- The map is still a heavy dependency because native uses WebView and high-level actions inject JavaScript into the map runtime.

## Interaction Model

### 1. Listen: `听小灵讲` / `开始讲解`

User intent: "Tell me about the current spot now."

On tap:

1. Immediately set action state to `narrating`.
2. Disable duplicate listen taps for a short cooldown.
3. Set selected spot to the active guide spot.
4. Generate local narration with `buildMapSpotNarration`.
5. Show the narration text in the dock as the primary visible result.
6. Call `tourActions.startNarration(toTourSpot(activeGuideSpot))`.
7. Start `VRMManager.speak` after the UI state has already updated.

Button states:

| State | Label | Behavior |
| --- | --- | --- |
| idle | 听小灵讲 | Starts local narration |
| narrating | 讲解中 | Disabled briefly or changes to replay |
| completed | 重播讲解 | Replays local narration |
| no active spot | 先选景点 | Disabled |

Fallbacks:

- If TTS/VRM is slow, keep the text visible and show "小灵正在朗读".
- If TTS fails, keep the text and show "文字讲解已准备好".
- If no spot exists, show "先点一个景点，我再讲给你听".

### 2. Route: `小灵指路`

User intent: "Show me how to get to this spot."

On tap:

1. Immediately set action state to `routing`.
2. Select the active guide spot.
3. Use `userLocation` if available, otherwise use `LINGSHAN_CENTER`.
4. Draw a local two-point route immediately if the map is ready.
5. If the map is not ready, store a pending route command and replay it on `mapReady`.
6. Center the map on the destination when possible.
7. Update the dock with origin, destination, and estimated walking time.

Button states:

| State | Label | Behavior |
| --- | --- | --- |
| idle | 小灵指路 | Draws route |
| routing | 结束指路 | Clears route |
| map loading | 路线已准备 | Keeps pending route until map ready |
| no coordinates | 暂无坐标 | Disabled with explanation |

Fallbacks:

- If location is unavailable, route from the scenic entrance and say this clearly.
- If the map WebView is not ready, show the route summary in the dock and draw later.
- If the spot lacks coordinates, keep the button disabled and surface the reason.

### 3. Arrive: `我已到达`

User intent: "Mark this spot as reached and move the tour forward."

On tap:

1. Immediately set action state to `arrived`.
2. Set selected spot to the active guide spot.
3. Stop current routing.
4. Call `tourActions.arriveAtStop(toTourSpot(activeGuideSpot))`.
5. Update progress, current spot, and next spot.
6. Change the next recommended action to "先听讲解" or "去下一站".

Button states:

| State | Label | Behavior |
| --- | --- | --- |
| idle/routing | 我已到达 | Marks arrival |
| arrived | 已到达 | Shows next-step actions |
| no active spot | 先选景点 | Disabled |

GPS policy:

- Demo mode: allow manual arrival even without GPS.
- Real-device mode: if location is available and distance is far, show a soft warning instead of blocking the action.
- Future strict mode can enforce a distance threshold, but this should not be the default for competition demos.

### 4. Ask: `问小灵`

User intent: "Ask about this spot or route."

Recommended behavior:

1. Open an inline ask sheet on the map first.
2. Pre-fill context with the active spot and current route.
3. Offer three quick questions:
   - "这里最值得看什么?"
   - "从这里下一站怎么走?"
   - "这个景点有什么历史?"
4. Provide a secondary entry to the full `/chat` page.

Rationale:

Directly navigating to `/chat` hides the map context and can feel slow. A small inline ask sheet gives immediate value and still allows deep chat when needed.

### 5. Detail: `景点详情`

User intent: "See full information for this spot."

Recommended behavior:

1. If an active spot exists, push `/attractions/[id]` as today.
2. Before navigation, set action state to `opening_detail`.
3. Show pressed/loading feedback on the button.
4. Pass `returnTo=/map` and `returnLabel=返回地图`.
5. Optionally prefetch spot detail if the router/runtime supports it later.

Fallbacks:

- If no spot exists, disable the button and show "先选一个景点".
- If detail navigation fails, keep the user on `/map` and surface a retry action.

### 6. Route Selection: `选路线` / `继续路线`

User intent: "Choose or resume a tour route."

Recommended behavior:

1. If a current route exists, keep `继续路线` as the primary mini action.
2. If no route exists, open a route selection sheet before pushing `/routes`.
3. The sheet should show route name, time, stop count, and Xiaoling's reason.
4. Full route list remains available as a secondary action.

Rationale:

`选路线` currently feels like a page jump. A local sheet turns it into a fast decision and keeps the user anchored in the map.

## UI Layout

Keep the current dock structure but clarify roles:

```text
Map
  Header
  Status beacon
  Bottom guide dock
    Current spot summary
    Xiaoling avatar and speech
    Metrics: position / walking estimate / route progress
    Result panel: current action output
    Primary action row: listen + route
    Secondary action row: ask + detail + route select/resume
    Route rail
```

The result panel becomes the source of truth for action feedback. Toast-like copy can still exist, but it should not be the only proof that something happened.

## State Design

Add a local UI state in `MapGuidePage`:

```ts
type MapActionStatus = 'idle' | 'pending' | 'success' | 'blocked' | 'error';

interface MapActionState {
  action: MapGuideAction;
  status: MapActionStatus;
  spotId?: string;
  message: string;
  updatedAt: number;
}
```

Use this state for:

- Button labels
- Button disabled/loading states
- Dock result text
- Short cooldown against accidental repeated taps
- Pending route replay after map readiness

Do not put this transient state in TourContext. TourContext should continue to store durable guide state such as current route, narration, arrival, progress, and memory events.

## Async Strategy

The key rule is "UI first, heavy work second".

For each action:

1. Validate the active spot.
2. Set local action state.
3. Update visible text.
4. Then call heavier work:
   - `VRMManager.speak`
   - map `drawRoute`
   - map `setCenter`
   - `router.push`
   - backend-synced TourContext actions

Recommended implementation details:

- Wrap heavy calls in `requestAnimationFrame` on web when available.
- On native, use `setTimeout(..., 0)` or `InteractionManager.runAfterInteractions` where appropriate.
- Add a per-action cooldown of about 800ms.
- Never await TTS, map script readiness, or router transition before showing local feedback.

## Map Readiness

Add a pending map command queue for route drawing and centering:

```ts
type PendingMapCommand =
  | { type: 'center'; spot: Spot; zoom: number }
  | { type: 'route'; origin: Coordinate; destination: Coordinate; spotId: string };
```

When `mapStatus !== 'ready'`:

- Store the command.
- Show a local result in the dock.
- Replay the command in `handleMapReady`.
- Clear the pending command when the route is cancelled or spot changes.

This makes the button useful even while the real map is still loading.

## Error Handling

Use user-facing messages that explain the next useful action.

| Failure | User-facing result |
| --- | --- |
| No active spot | "先点一个景点，小灵再帮你讲解或指路。" |
| Spot has no coordinates | "这个景点还没有坐标，暂时不能规划路线。" |
| Location unavailable | "定位不可用，已从景区入口为你规划。" |
| Map not ready | "路线已准备，地图加载后会自动显示。" |
| TTS unavailable | "文字讲解已准备好，语音稍后再试。" |
| Detail page navigation fails | "景点详情暂时打不开，可以继续在地图听讲解。" |

## Accessibility

Each button should expose:

- `accessibilityRole="button"`
- A label that includes the active state, for example "小灵指路，当前正在指路"
- Disabled state where the action cannot work

Avoid changing text width in a way that shifts the dock. Reserve stable button dimensions for the longest expected label.

## Performance Budget

| Interaction | Budget |
| --- | --- |
| Press visual feedback | <= 100ms |
| Dock text/result update | <= 300ms |
| Local narration text visible | <= 300ms |
| Route summary visible | <= 500ms |
| Map route drawn after map ready | <= 1000ms after ready |
| No main-thread freeze | No single synchronous action over 50ms |

If VRM or WebView work exceeds the budget, the UI must still remain responsive and show progress.

## Implementation Plan

### Step 1: Add action state helpers

In `software/mobile/app/map.tsx`:

- Add `MapGuideAction`, `MapActionStatus`, and `MapActionState`.
- Add `setActionResult(action, status, message, spotId?)`.
- Add per-action cooldown tracking.
- Replace loose `actionFeedback` updates with structured state.

### Step 2: Make listen action visible immediately

- Update `handleStartNarration`.
- Show generated narration text immediately.
- Keep `tourActions.startNarration` as durable state.
- Start `VRMManager.speak` after the visible state update.

### Step 3: Make route action map-ready tolerant

- Add pending map command state/ref.
- Update `handleNavigateWithMap`.
- Replay pending route in `handleMapReady`.
- Make `小灵指路` toggle to `结束指路` while navigating.

### Step 4: Make arrival a real guide transition

- Update `handleDemoArrive` naming and copy so it no longer feels like a fake demo-only action.
- Keep demo-friendly manual arrival.
- Clear routing and update next-step prompt.

### Step 5: Improve secondary actions

- Add an inline ask sheet or lightweight panel for `问小灵`.
- Add loading feedback for `景点详情`.
- Replace direct `选路线` jump with a route selection sheet if scope allows; otherwise add pressed/loading state and keep the route page jump.

### Step 6: Tests

Add or update tests:

- `mapGuideActions.test.ts` for button state derivation and fallback messages.
- `mapNarration.test.ts` for narration feedback copy.
- `mapDock.test.ts` remains responsible for dock snap behavior.
- Add a WebView readiness test if the existing test setup can mock `AmapViewRef`.

## Acceptance Criteria

- Tapping `听小灵讲` immediately changes the dock to narration mode and displays local narration text.
- Tapping `小灵指路` immediately shows a route summary even if the map is loading.
- If the map becomes ready after a route tap, the pending route is drawn automatically.
- Tapping `我已到达` updates progress and suggests the next useful action.
- `问小灵` keeps current spot context instead of feeling like a blind page jump.
- Buttons have visible pressed/loading/success/blocked states.
- No action depends on backend availability for its first visible result.
- No double tap can enqueue duplicate narration, duplicate route drawing, or repeated route navigation.
- Existing route progress, spot selection, and map marker behavior remain intact.

## Alternatives Considered

### A. Add only loading indicators and toasts

This is fastest, but it does not make the actions more useful. The user would still need to infer what changed from small text feedback, and map/TTS delay would still feel fragile.

### B. Rebuild the whole map dock as a new BottomSheet workflow

This gives the cleanest product surface, but it risks touching too much code at once: dock layout, map gestures, route selection, ask flow, and guide state would all change together.

### C. Add a local action state layer first

This is the recommended path. It keeps the current architecture, reduces perceived lag, and creates a stable place to add richer ask/detail/route-selection behavior later.

## Open Questions

- Should strict GPS arrival validation be a user setting, an environment flag, or a future real-scenic-mode feature?
- Should the inline ask sheet call the existing chat route under the hood, or should it stay local for the first version?
- Should route selection reuse the existing `/routes` data directly, or introduce a compact map-specific route card model?

## Follow-Up Documents

If implementation proceeds, create a focused implementation plan under:

```text
docs/superpowers/plans/2026-06-25-mobile-map-guide-actions.md
```

That plan should split work into small commits:

1. State and copy only.
2. Listen and arrival behavior.
3. Routing and pending map commands.
4. Ask/detail/route selection refinements.
5. Tests and verification.
