# Mobile Chat Route Load Focus Guard

## Symptom

On mobile, `/chat` could show the Xiaoling fallback in "digital human loading" state for noticeably longer when reached from another page, while first entry was fast.

After the first focus-guard fix, some web/mobile-browser sessions could still show a blank digital-human area: the chat shell and input loaded, but neither the VRM nor the page fallback was visible.

After the fallback fix, `/chat` could still appear to load slowly after navigating from another page: the page-level Xiaoling fallback stayed visible even though the model had already been loaded elsewhere.

## Root Cause

`VRMView` instances from previous routes stayed mounted after navigation and only marked themselves inactive on unmount. In tab/stack navigation, an inactive page can keep its RAF loop and async VRM load alive. When that stale load completed, it could reattach the singleton VRM scene to the old route's Three.js scene, competing with the `/chat` full-screen VRM stage.

The remaining blank-state case came from a weaker readiness signal on Web: `renderer.render()` could complete without throwing even when the canvas was still transparent. That made `VRMView` report `ready=true`, so `/chat` hid its page-level fallback while the WebGL canvas had no visible model pixels.

The remaining slow-return case was scene ownership drift. The VRM model is a singleton object, and adding it to another page's Three.js scene removes it from `/chat`'s scene. `/chat` still had `modelLoadedRef=true`, so on refocus it skipped reattachment and kept rendering an empty scene behind the fallback.

## Fix

- `VRMView` now tracks React Navigation focus via `useIsFocused`.
- Inactive VRM views skip render/update work.
- Async load, retry, and manual reload paths check focus before attaching the shared VRM scene.
- Focused views that skipped an attachment while inactive retry a lightweight attach on refocus.
- Added `vrmViewFocusGuard.test.ts` to guard this behavior.
- `/chat` now owns a page-level static Xiaoling fallback that is independent of `VRMView` internals.
- `VRMView` reports render readiness through `onReadyChange`; `/chat` hides its page-level fallback only after the real VRM first frame is ready.
- The fallback includes a "reload digital human" action that remounts the chat VRM and requests a scoped manual reload.
- Added `chatVrmFallback.test.ts` to prevent the page from regressing to a blank VRM area.
- Web readiness now samples the WebGL drawing buffer after render and only reports ready once visible pixels exist.
- Web stale-load retry and manual reload paths wait for the animation loop's visible-frame check instead of marking ready immediately after attach.
- Focused VRM views now also verify that the singleton VRM scene is still attached to their local Three.js scene; if not, they perform a lightweight reattach without forcing model reload.
- Web visible-frame sampling stops after the first confirmed visible frame to avoid continuous `readPixels` GPU sync cost.

## Verification

- `npm test -- --runInBand __tests__/vrmViewFocusGuard.test.ts __tests__/vrmManagerLoadRace.test.ts __tests__/vrmRouteVisibility.test.ts __tests__/chatPressResponsiveness.test.ts`
- `npm test -- --runInBand __tests__/chatVrmFallback.test.ts __tests__/vrmViewFocusGuard.test.ts __tests__/vrmManagerLoadRace.test.ts __tests__/vrmRouteVisibility.test.ts __tests__/chatPressResponsiveness.test.ts`
- `npx tsc --noEmit`
- Started a clean Expo Web bundle with `npm run start -- --clear --web --port 8102`.
- Verified `http://localhost:8102/chat` by headless Chrome screenshot at `tmp/chat-8102-after-pixel-ready.png`; the VRM rendered visibly.
- Re-ran `npm test -- --runInBand __tests__/chatVrmFallback.test.ts __tests__/vrmViewFocusGuard.test.ts __tests__/vrmManagerLoadRace.test.ts __tests__/vrmRouteVisibility.test.ts __tests__/chatPressResponsiveness.test.ts`.
- Verified latest bundle by headless Chrome screenshot at `tmp/chat-8102-reattach-fix.png`.
