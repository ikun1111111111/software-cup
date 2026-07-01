# 2026-06-28 Profile Tab Regression

## Symptom
The mobile bottom tab bar on `/profile` showed large Chinese character glyphs such as `问`, `游`, `记`, and `档` instead of the original icon-like tab visuals.

## Root Cause
During the profile redesign, `software/mobile/app/(tabs)/_layout.tsx` was changed unnecessarily. The original `TAB_EMOJIS` mapping and tab bar styling were replaced with a `TAB_BY_NAME` mapping that used Chinese characters as icons.

## Fix
Restored `software/mobile/app/(tabs)/_layout.tsx` to its original tab implementation and kept the redesign scoped to `software/mobile/app/(tabs)/profile.tsx`.

## Evidence
- `git diff --name-only -- "software/mobile/app/(tabs)/_layout.tsx" "software/mobile/app/(tabs)/profile.tsx"` now lists only `profile.tsx`.
- `npx tsc --noEmit` passes in `software/mobile`.

## Status
DONE
