# Explore VRM Debug Report

- Symptom: `/explore` hero stage showed the guide aura and name plate, but the VRM canvas appeared blank.
- Root cause: Web `VRMView` treated model load completion as display readiness. If WebGL renderer creation or first-frame rendering lagged/failed, a transparent canvas could remain visible while fallback was hidden.
- Fix: `VRMViewWeb` now marks the canvas ready only after a successful render frame, keeps the canvas hidden until then, shows the static fallback while loading, and catches WebGL renderer creation failures.
- Evidence: Expo Web `/explore` reproduced with local Chrome; after the fix the page rendered one `194x252` VRM canvas with opacity `1` and the avatar visible in `tmp/explore-vrm-inspect.png`.
- Verification: `npm test -- --runInBand __tests__/vrmManagerLoadRace.test.ts __tests__/vrmLayout.test.ts __tests__/vrmRouteVisibility.test.ts`; `npx tsc --noEmit`.
- Status: DONE.
