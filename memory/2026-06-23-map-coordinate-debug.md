# Map Coordinate Debug Report

- Symptom: AMap POI labels and app markers were misaligned; for example, the app marker for `a-yu-wang-zhu` appeared northwest of the AMap label.
- Root cause: App scenic spot coordinates and browser geolocation are WGS84/GPS coordinates, while AMap renders in GCJ-02. The map adapter passed WGS84 directly to AMap.
- Fix: Added WGS84 to GCJ-02 conversion in the mobile map adapter for map center, spot markers, user location, and route polylines on both web and WebView paths.
- Evidence: `wgs84ToGcj02(31.4263, 120.0961)` converts to approximately `31.424515, 120.101013`, matching the east/south correction direction seen in the screenshot.
- Verification: `npm test -- --runTestsByPath __tests__/geoCoordinates.test.ts` and `npx tsc --noEmit --pretty false` passed in `software/mobile`.
