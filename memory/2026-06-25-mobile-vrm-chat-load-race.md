# Mobile VRM Chat Load Race

## Symptom

On mobile, navigating to pages with an in-page VRM stage, especially `/chat`, could intermittently leave the VRM model unloaded.

## Root Cause

`VRMManager.preload()` and `VRMManager.getOrLoad()` shared mutable singleton fields (`currentModelFile`, `loadingPromise`, `vrm`) without guarding async completion order. A slow preload for the large default costume model could be superseded by another route requesting a different model. If the first promise resolved later, it still wrote back to `this.vrm`, corrupting the current page's active model state.

`/chat` is more visible because it hides the global floating VRM and relies on its own full-screen VRM stage, so there is no floating fallback when the page-local load loses this race.

## Fix

- Added a monotonically increasing VRM load request id.
- Only the active request can commit a loaded model into `VRMManager`.
- Superseded loads are disposed and rejected with `StaleVRMLoadError`.
- `dispose()` now invalidates pending loads.
- `VRMView` suppresses expected stale-load warnings while preserving real load warnings.

## Evidence

- Added `software/mobile/__tests__/vrmManagerLoadRace.test.ts` to simulate out-of-order model load completion.
- `npm test -- --runInBand __tests__/vrmManagerLoadRace.test.ts __tests__/vrmRouteVisibility.test.ts __tests__/vrmLayout.test.ts __tests__/vrmPageContext.test.ts __tests__/vrmSpeechSync.test.ts` passed.
- `npx tsc --noEmit` passed.
- `npm test -- --runInBand` passed: 27 suites, 116 tests.

## Status

DONE_WITH_CONCERNS: code-level race is fixed and covered. Real-device retest is still useful because Expo GL context behavior depends on hardware and navigation timing.
