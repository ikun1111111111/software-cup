# 2026-06-29 Mobile Map POI Calibration

## DEBUG REPORT

- **Symptom:** Mobile guide map markers appeared scattered against the AMap base labels. The most visible mismatches were the core POIs: Brahma Palace, Nine Dragons Bathing, Xiangfu Temple, Lingshan Jingshe, and the Lingshan Buddha anchor.
- **Root cause:** `software/mobile/utils/mapSpotsFallback.ts` intentionally trusts local demo coordinates from `software/mobile/data/lingshanSpots.ts`, but several local coordinates were inherited from an older hand-authored dataset and did not match the current AMap POI layout.
- **Fix:** Updated the local trusted GCJ-02 coordinates for the visible AMap anchors in `software/mobile/data/lingshanSpots.ts`. Added regression coverage in `software/mobile/__tests__/mapSpotsFallback.test.ts` so fallback and remote-coordinate overrides keep these calibrated points.
- **Evidence:** `npm test -- --runInBand mapSpotsFallback.test.ts amapCoordinates.test.ts amapViewHtml.test.ts mapViewport.test.ts` passed. Expo Web visual probe loaded AMap and recorded the updated marker positions in `tmp/map-after-coordinate-source-fix.log`.
- **Regression test:** `software/mobile/__tests__/mapSpotsFallback.test.ts`
- **Status:** DONE_WITH_CONCERNS. The visible AMap anchors are corrected, but POIs not shown by AMap in the supplied screenshot may still benefit from field-level GPS confirmation.
