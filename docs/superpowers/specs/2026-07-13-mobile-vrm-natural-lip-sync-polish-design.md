# Mobile VRM Natural Lip-Sync Polish Design

## Goal

Make the mobile digital human's speech animation feel fluid and alive without changing the TTS API, replacing the VRM model, or adding expensive audio analysis on native devices.

The improvement prioritizes perceived naturalness over phoneme-perfect accuracy. Speech should use several visible lip shapes, transition smoothly between them, include short closures between syllable groups, and close immediately when playback stops.

## Current Problem

The repository already contains a deterministic five-viseme calculator for `aa`, `ih`, `ou`, `ee`, and `oh`, but the two active render loops still call `applyMouthOpen(vrm, mouthOpen)` and only write the scalar value to `aa`.

The upstream speech driver also introduces visible stepping:

- TTS phonemes are reduced to `closed`, `half`, or `open` scalar values and updated every 50 ms.
- Browser, silent, and missing-phoneme fallbacks assign a new random mouth value every 100 ms.
- The render layer smooths only one `aa` value, so round and wide lip motion is absent.

The combination produces a repeated jaw-opening motion with abrupt target changes rather than continuous speech articulation.

## Selected Approach

Complete and refine the existing lightweight procedural approach:

1. Convert speech timing into a deterministic mouth-intensity target instead of random samples.
2. Use the existing five VRM speech expressions to vary lip shape during speech.
3. Smooth all five weights inside the Three.js render loop, where frame delta is available.
4. Preserve short near-closed beats at syllable and phrase boundaries.
5. Reset all speech visemes immediately when speech stops or the active VRM changes.

This avoids backend protocol work and keeps the same behavior across Expo Web and native mobile rendering.

## Architecture and Data Flow

### Speech driver

`useVRMSync` remains responsible for playback state, subtitles, and the scalar `mouthOpen` target.

For real TTS phoneme timing, the driver will shape each phoneme boundary with a short attack and release rather than switching directly between `closed`, `half`, and `open`. Adjacent phonemes will therefore blend instead of jumping at 50 ms timer boundaries.

When phoneme data is unavailable, the driver will use a deterministic speech envelope derived from elapsed speech time. The envelope will vary syllable strength and insert short closures, but it will not use `Math.random()`. Replaying the same timing will produce the same mouth motion, which makes behavior testable and avoids nervous-looking jitter.

The public hook state and TTS request/response contract remain unchanged.

### Lip-shape calculation

`VRMIdleAnim` will remain the home of the pure five-viseme calculator. The calculator will accept speech strength, elapsed time, and speaking state and return bounded weights for:

- `aa`: open jaw emphasis
- `ih`: narrow, lightly open mouth
- `ou`: rounded lips
- `ee`: wider lips
- `oh`: rounded open mouth

Only one or two neighboring shapes should dominate at a time. Rest segments must approach zero rather than cross-fading directly between two open shapes.

### Render-loop smoothing

Both Web and native render loops in `VRMView` will pass elapsed time, frame delta, speaking state, and expression context into the mouth application helper.

Smoothing will be frame-rate independent, using delta-time-based interpolation rather than a fixed per-frame percentage. Opening may respond slightly faster than closing, while phrase boundaries remain fast enough to be visible. All five current weights will be stored and reset together.

Facial expressions remain authoritative while idle. During speech, speech visemes temporarily control mouth expressions; when speech ends, the mouth returns to the active emotion's idle shape without leaving stale viseme weights.

## Scope

Expected implementation files:

- `software/mobile/components/vrm/VRMIdleAnim.ts`
- `software/mobile/components/vrm/VRMView.tsx`
- `software/mobile/hooks/useVRMSync.ts`
- `software/mobile/__tests__/vrmLipSync.test.ts`
- focused speech-sync tests only when required by the changed driver behavior

The existing uncommitted Web Audio unlock work in `useVRMSync.ts` must be preserved.

## Non-Goals

- No backend TTS schema changes.
- No Chinese phoneme-to-viseme linguistic model.
- No Web Audio frequency analyser as a required path.
- No VRM asset replacement or morph-target editing.
- No unrelated expression, gesture, subtitle, or audio-playback refactor.

## Error and Fallback Behavior

- Invalid or non-finite mouth values resolve to a closed mouth.
- Missing phonemes use the deterministic fallback envelope.
- Speech stop, route cleanup, model reload, and hook disposal clear all five visemes.
- If an avatar lacks one expression preset, optional VRM expression writes remain safe and the other presets continue to animate.

## Testing Strategy

Implementation follows red-green-refactor:

1. Pure-function tests prove deterministic output, multiple dominant visemes, bounded values, visible closures, and no dependence on randomness.
2. Application tests prove all five VRM expressions are written and reset, while idle emotion mouth shapes are restored.
3. Timing tests compare equivalent speech envelopes sampled at different frame intervals to prevent frame-rate-dependent motion.
4. Source-wiring tests prove both Web and native render loops pass the required timing and speaking context.
5. Focused speech tests prove phoneme transitions use shaped targets and missing-phoneme fallback is deterministic.
6. Run the full mobile Jest suite, TypeScript validation, and Expo Web export after focused tests pass.

## Acceptance Criteria

- Speech visibly uses at least three dominant visemes over a normal sentence.
- Mouth targets do not use `Math.random()` in any speech fallback.
- Consecutive render frames transition continuously rather than jumping between scalar states.
- Short near-closed beats occur between some syllable groups and at phrase pauses.
- Stopping speech closes all five speech visemes immediately.
- Idle emotional expressions are preserved after speech ends.
- Web and native render paths use the same lip-sync calculation.
- Existing audio playback, subtitles, route cleanup, and current Web Audio unlock changes continue to pass their regression tests.
