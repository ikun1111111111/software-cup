# Mobile Chat Input And Repeat Reply Fix

## Symptom

On the mobile `/chat` page, the VRM guide could appear to repeat answers, and the free-form question input was not visible because the floating tab bar covered the bottom chat controls.

## Root Cause

- The chat layer was anchored to the bottom of the screen while the tab bar is also absolutely positioned there.
- `initialQuestion` auto-send was guarded only by a boolean ref, not by the actual question context.
- `sendMessage` relied on async streaming state, leaving a small window for repeated taps or auto-send effects to enqueue duplicates.

## Fix

- Raised the chat controls above the floating tab bar with a fixed tab-bar clearance plus safe-area bottom.
- Added a synchronous send lock that releases on local, streaming, done, and fallback completion paths.
- De-duplicated auto-sent initial questions by `spotId + spotName + question`.
- Added regression guards in `chatPressResponsiveness.test.ts`.

## Verification

- `npm test -- --runInBand __tests__/chatPressResponsiveness.test.ts __tests__/chatBubbleDisplay.test.ts`
- `npx tsc --noEmit`
