# Speech/Text Sync Debug Report

Date: 2026-06-26

## Symptom

Many mobile narration and digital human flows showed text faster than speech. Long narration text could finish displaying while the TTS audio was still playing.

## Root Cause

Speech timing came from inconsistent sources:

- Backend MP3 duration used a fixed bitrate file-size estimate, which can undercount real Edge TTS audio duration.
- Mobile fallback speech duration used different per-character rates in different layers.
- `NarrationSheet` rendered full narration text with a fixed 30 ms per character timer, independent of real or estimated speech duration.

## Fix

- Backend TTS duration now parses MP3 frame headers before falling back to conservative file-size estimation.
- Mobile speech duration estimation is centralized in `estimateSpeechDuration` with a slower default pace.
- `VRMManager`, `useVRMSync`, and `SmartGuide` now share the same speech duration estimate when no real audio duration is available.
- `NarrationSheet` text reveal now uses elapsed narration progress via `getTimedTextSlice` instead of a fixed typing interval.

## Evidence

- `npm test -- --runTestsByPath __tests__/textTimeline.test.ts --runInBand`
  - 30 tests passed.
- `npm test -- --runTestsByPath __tests__/digitalHumanDriver.test.ts __tests__/vrmSpeechCleanup.test.ts __tests__/vrmSpeechSync.test.ts --runInBand`
  - 11 tests passed.
- `python -m pytest backend/tests/test_tts.py -q`
  - 17 tests passed.

## Regression Tests

- `software/mobile/__tests__/textTimeline.test.ts`
  - Covers timed text reveal behavior.
- `software/mobile/__tests__/digitalHumanDriver.test.ts`
  - Covers the unified speech duration estimate.
- `backend/tests/test_tts.py`
  - Covers MP3 frame-header duration parsing.

## Status

DONE
