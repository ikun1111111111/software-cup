# Mobile Home Load Performance

## Symptom

Mobile home entry felt slow, especially around the first transition into the home page.

## Root Cause

The home path was doing too much near first paint: a large `hero-bg.png` asset was decoded on the hero, global VRM mounting could initialize Three/GL shortly after entry, root layout preloaded a near-20MB VRM model after 1.2s, and the home welcome speech loaded the digital human manager immediately.

Follow-up investigation found an earlier startup blocker: root layout waited for two Chinese font files before rendering anything. Those TTF files are about 11MB total. The custom splash background was also still a 3.5MB PNG and the in-app splash had a fixed 1.5s display time.

## Fix

- Added a compressed home hero image, `software/mobile/assets/images/hero-bg-mobile.jpg`, and switched the home hero to it.
- Deferred lower home sections until after initial interactions.
- Deferred home digital-human welcome speech until after the home shell has had time to settle.
- Delayed root VRM preload from 1.2s to 6.5s.
- Delayed global floating VRM mount on `/` from 600ms to 4.2s while keeping the shorter delay on other eligible routes.
- Changed root font loading to run in the background after initial interactions instead of blocking first render.
- Removed custom font usage from the home screen styles that can render before fonts finish loading.
- Added `software/mobile/image/map-bg-mobile.jpg`, switched the in-app splash to it, and shortened the fixed splash display from 1.5s to 650ms.

## Evidence

- `npx tsc --noEmit` passed in `software/mobile`.
- `npm test -- --runInBand __tests__/vrmRouteVisibility.test.ts __tests__/digitalHumanProduct.test.ts` passed.
- Expo Web at `http://localhost:8099` returned 200.
- Headless Chrome smoke test confirmed the home page loaded `hero-bg-mobile.jpg`, showed the core entry content, and produced no page errors.
- Follow-up Headless Chrome smoke test confirmed the page loaded `hero-bg-mobile.jpg` and `map-bg-mobile.jpg`, showed the home entry content within the 3s check window, and produced no page or console errors.
- Product wording was later adjusted to hide the implementation term `VRM` from home/product copy. The home floating model mount delay was reduced from 4.2s to 0.8s after font loading was made non-blocking. A browser smoke test confirmed `assets/models/8024308560058477433.vrm` is requested from the home page with no page or console errors.
- Follow-up root cause for "home page has no model": `/` was still listed in `OWN_VRM_PATHS`, so `shouldHideFloatingVRM('/')` returned true and the home page explicitly hid the global digital human. Removed `/` from the hidden-route set, updated the route visibility test, made home floating mount immediate, and moved root model preload to 0.8s. Browser smoke test confirmed one canvas is present and `8024308560058477433.vrm` is requested from the home page.

## Status

DONE_WITH_CONCERNS: improved first-entry load path; real-device timing should still be checked because VRM/GL cost depends heavily on hardware.
