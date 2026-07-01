# Mobile Attraction Detail Response Time

Date: 2026-06-23

## Scope

- `software/mobile/app/attractions/[id].tsx`
- `software/mobile/services/dataSync.ts`

## Change

- The attraction detail page now renders an in-app spot snapshot immediately when the spot is part of the bundled demo data.
- The page still refreshes from local SQLite/backend in the background and writes fresh data back into the memory cache.
- Local spot DB reads now go through the existing 1200ms cache timeout path before falling back.

## Expected Impact

- Known attraction detail pages avoid a cold skeleton wait.
- Slow network or slow SQLite initialization no longer blocks the first usable render for bundled scenic spots.
- Unknown dynamic spot IDs still fall back to the existing backend sync path.
