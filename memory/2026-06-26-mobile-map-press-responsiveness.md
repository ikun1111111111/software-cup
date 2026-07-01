# 2026-06-26 Mobile Map Press Responsiveness

## Symptom

On `/map`, action buttons could appear stuck after starting narration. The page state changed, but Xiaoling's speech bubble and voice feedback could remain on the previous long narration, so later taps felt unresponsive.

## Root Cause

- `VRMManager.speak()` queues new speech while `isSpeaking` is true.
- Map actions used `VRMManager.speak()` directly, so a long spot narration could block later action feedback such as route guidance.
- Web speech synthesis did not have a backup visual stop timer. If the browser failed to fire `end` or `error`, the global speaking state could stay active and keep future speech queued.

## Fix

- Map action side effects now run through `runAfterNextPaint()` so visual button feedback paints first.
- User-initiated map speech now calls `VRMManager.stopSpeaking({ playQueued: false })` before speaking the latest action feedback.
- Web TTS now schedules a fallback stop timer and catches synchronous `speechSynthesis.speak()` failures.
- Avatar speech subtitles now use timed subtitle cues, so the small bubble advances sentence by sentence instead of staying on the first two lines of a long narration.

## Evidence

- `npm test -- --runInBand mapPressResponsiveness.test.ts vrmSpeechCleanup.test.ts` passed.
- `npx tsc --noEmit` passed.
- `npm test -- --runInBand` passed: 36 suites, 139 tests.
- Chrome probe on `http://localhost:8099/map`: after tapping "Start narration" then "Xiaoling guide route", Xiaoling's bubble switched to route feedback instead of staying on the long narration.
- After the subtitle fix, Chrome probe on `http://localhost:8099/map` showed the avatar bubble advancing from "灵山大照壁。" to later narration cues such as "以照壁开启灵山空间叙事。".

## Regression Tests

- `software/mobile/__tests__/mapPressResponsiveness.test.ts`
- `software/mobile/__tests__/vrmSpeechCleanup.test.ts`
- `software/mobile/__tests__/textTimeline.test.ts`

## Status

DONE
