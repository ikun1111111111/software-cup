# Mobile Home VRM Expression/Action Trigger

## Symptom

The mobile home page VRM model appeared to speak, but visible expressions/actions were not obvious. The homepage greeting did not reliably show a gesture.

## Root Cause

Global page calls use `speakWithDigitalHuman()`, which dispatches through `VRMManager.speak()` or `replaceSpeech()`. After the previous speech-repeat fix, `useDigitalHumanDriver` no longer reacted to manager `speak` events to start its local expression/action timeline. That avoided duplicate speech, but it also meant service-originated speech could update audio/mouth state without driving `action` in the floating VRM layer.

## Fix

- `useDigitalHumanDriver` now listens to `VRMManager` `speak` events and starts only the local expression/action timeline.
- The listener respects `targetId`, so page-local and floating VRM speakers do not steal each other's timelines.
- `driver.speak()` no longer starts the timeline early; the timeline starts when `VRMManager` actually begins speech, which keeps queued speech aligned.
- External stops now reset the local expression/action timeline immediately.
- TTS duration resync preserves any forced action.
- The mobile home greeting explicitly sends `action: 'wave'` with `actionDuration: 1600`.

## Verification

- `npm test -- --runInBand __tests__/digitalHumanDriverSpeechLoop.test.ts __tests__/homeVrmGreetingAction.test.ts __tests__/vrmSpeechSync.test.ts`
- `npx tsc --noEmit`

## Status

DONE
