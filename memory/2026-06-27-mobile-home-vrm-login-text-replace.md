# Mobile VRM Page-Scoped Speech Debug Report

- Symptom: Speech triggered on the login page or another page could remain visible in the VRM bubble after navigating away, instead of disappearing and letting the destination page speak.
- Root cause: Mobile `VRMManager.speak()` queues new speech while another speech is active, and the persistent global VRM layer did not clear speech or bubble text on route changes. The floating bubble also kept the last full text visible briefly after stop.
- Fix: Added `VRMManager.replaceSpeech()` and `speakWithDigitalHuman(..., { replaceCurrent: true })` for entry greetings. `VRMProvider` now clears active and queued speech when `routePath` changes, and `VRMFloating` immediately hides its bubble when `pathname` changes.
- Evidence: `npm test -- --runInBand vrmSpeechSync.test.ts vrmRouteSpeechScope.test.ts vrmSpeechCleanup.test.ts vrmPageContext.test.ts` passed. `npx tsc --noEmit` passed.
- Regression test: `software/mobile/__tests__/vrmSpeechSync.test.ts` covers replacing active/queued speech and dropping page speech on leave. `software/mobile/__tests__/vrmRouteSpeechScope.test.ts` locks the route-scope cleanup contract.
- Status: DONE.
