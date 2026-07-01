# Mobile VRM Action Frequency

## Symptom

The mobile VRM model spoke, but gestures were rarely visible. In practice it looked like actions were almost never triggered.

## Root Cause

There were three contributing issues:

1. Many real guide phrases did not match the action vocabulary. Common mobile copy such as "继续前往", "打开地图", "到达景点", "带路", and "路线" often fell back to `none` or a subtle `nod`.
2. `splitSentences()` splits on commas, so phrases like "好的，我们继续前往下一站" became a first timeline event of "好的，", which triggered only a small `nod` before the meaningful guide action.
3. The driver restarted timelines on TTS resync, but repeated actions with the same action name did not restart the VRM action timer. The visible gesture could also complete during native TTS fetch because the default gesture duration was only 800ms.

## Fix

- Expanded `textTimeline.analyzeSentence()` point-action vocabulary for common guide/navigation phrases.
- Added timeline-only merging for short acknowledgement prefixes such as "好的，" so action analysis sees the full guide phrase.
- Increased default action durations to 1200-1600ms for common visible gestures.
- Added `restartAction()` in `useDigitalHumanDriver` to pulse actions through `none` before replaying, so the same gesture can visibly trigger again after resync or repeated guide lines.
- Added regression coverage for real guide phrases and visible default action durations.

## Verification

- `npm test -- --runInBand __tests__/textTimeline.test.ts __tests__/digitalHumanDriverSpeechLoop.test.ts __tests__/digitalHumanDriverPerformance.test.ts __tests__/homeVrmGreetingAction.test.ts __tests__/vrmSpeechSync.test.ts`
- `npx tsc --noEmit`

## Status

DONE
