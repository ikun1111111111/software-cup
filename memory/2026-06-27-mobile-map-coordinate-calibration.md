# 2026-06-27 Mobile Map Coordinate Calibration

## Summary

Fixed the mobile guide map placing Lingshan scenic markers over Taihu water when geolocation is unavailable.

## Root Cause

The scenic spot dataset and backend schema use GCJ-02 coordinates for AMap, but the map renderer treated every coordinate as WGS-84 and applied `wgs84ToGcj02()` again. That second offset moved Lingshan static markers and the fallback scenic center away from their intended land positions.

## Fix

- Static scenic coordinates and `LINGSHAN_CENTER` now pass through to AMap as GCJ-02.
- Device GPS coordinates are explicitly marked as `wgs84` and converted before rendering.
- Route drawing supports mixed coordinate sources, so fallback scenic starts and real user locations can share one path.
- Added `toAmapPoint()` regression coverage.

## Verification

- `npm test -- --runInBand amapCoordinates.test.ts geoCoordinates.test.ts`
- `npx tsc --noEmit`
