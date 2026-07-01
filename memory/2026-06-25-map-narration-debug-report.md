# Map Narration Debug Report

- Symptom: The map guide action "听小灵讲" only surfaced thin spot overview text, and the dock feedback exposed internal copy: "正文已切到这一站。"
- Root cause: `software/mobile/app/map.tsx` passed `activeGuideSpot.overview` into `tourActions.startNarration` and hard-coded a developer-state feedback string after starting narration.
- Fix: Added `software/mobile/utils/mapNarration.ts` to hydrate map narration from local spot detail, updated the map dock feedback to visitor-facing copy, removed prototype wording from map product copy, and preserved local narration when streamed backend text is empty.
- Evidence: `npm test -- --runTestsByPath __tests__/mapNarration.test.ts __tests__/digitalHumanProduct.test.ts` passed. `npx tsc --noEmit` passed.
- Regression test: `software/mobile/__tests__/mapNarration.test.ts` covers detail hydration and forbids the leaked feedback string; `software/mobile/__tests__/digitalHumanProduct.test.ts` covers the map copy contract.
- Status: DONE
