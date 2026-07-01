# Mobile Attractions VRM Stage Tracking

- Symptom: On `/attractions`, Xiaoling's VRM could appear detached from the hero stage and overlap the recommendation cards after scroll/layout movement.
- Root cause: The page uses the global `VRMStageProvider` overlay, but the attractions hero `VRMStageSlot` did not enable `trackMotion`, so its measured window rect could become stale while the scroll view moved.
- Fix: Added `trackMotion` to `software/mobile/app/attractions/index.tsx` for `id="attractions-hero-avatar"`.
- Regression test: Added `software/mobile/__tests__/attractionsVrmStageSlot.test.ts` to require motion tracking on the attractions hero slot.
- Verification: `npm test -- --runInBand __tests__/attractionsVrmStageSlot.test.ts __tests__/routesVrmStageSlot.test.ts __tests__/vrmStageRegistry.test.ts`, `npx tsc --noEmit`, and a Chrome headless screenshot at `tmp/attractions-vrm-fixed.png`.
