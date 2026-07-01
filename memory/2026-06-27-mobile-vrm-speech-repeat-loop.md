# Mobile VRM Speech Repeat Loop

## Symptom

On `/chat`, the assistant bubble appeared once, but the VRM subtitle and voice repeated the same answer.

## Root Cause

`useDigitalHumanDriver.speak()` called `VRMManager.speak()`. `VRMManager.startSpeech()` then emitted a global `speak` event. The same driver was also subscribed to that event and called `speak()` again with the same text. Because the manager was already speaking, the second call queued the same answer as `pendingSpeech`, so it played again after the first playback stopped.

## Fix

- Removed the driver's self-listener for `VRMManager.on('speak')`.
- The driver now starts its local expression/action timeline directly before submitting speech to `VRMManager`.
- Real TTS duration resync is still handled through the existing `resync` event.
- Added `digitalHumanDriverSpeechLoop.test.ts` to guard against reintroducing the self-subscription loop.

## Verification

- `npm test -- --runInBand __tests__/digitalHumanDriverSpeechLoop.test.ts __tests__/vrmSpeechSync.test.ts __tests__/vrmSpeechCleanup.test.ts __tests__/chatPressResponsiveness.test.ts`
- `npx tsc --noEmit`
