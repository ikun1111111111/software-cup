# Map Recommendation Viewport Debug Report

- Symptom: Tapping different spots in "小灵推荐顺路看" on the map page appeared to jump to the same map position.
- Root cause: The parent map page called `setCenter` with the tapped spot, but `AmapView.web.tsx` re-ran marker rendering when `activeSpotId` changed and immediately called `setFitView` across all spots, overriding the selected-spot center. On WebView, changing `activeSpotId` also changed the generated HTML/source, risking a full map reload back to the initial fit view.
- Fix: Added `getSpotViewportSignature` and only auto-fit the map when the actual spot coordinate set changes. Memoized the native WebView HTML and source independently of `activeSpotId`, so selecting a recommendation no longer reloads the map.
- Verification: `npm test -- --runTestsByPath __tests__/mapViewport.test.ts __tests__/geoCoordinates.test.ts` and `npx tsc --noEmit --pretty false` passed in `software/mobile`.
