# Map Calibration Tool Design

## Goal

Add a Web-only map calibration page so the user can adjust Lingshan scenic spot coordinates visually against the AMap base map, then copy corrected coordinates back into `software/mobile/data/lingshanSpots.ts`.

## Scope

- Add a standalone Expo Router page at `/map-calibration`.
- Reuse the existing mobile spot dataset from `LINGSHAN_SPOTS`.
- Reuse the existing Web AMap adapter instead of creating a separate HTML tool.
- Support selecting a spot, dragging its marker, nudging it with controls, and copying coordinate snippets.
- Keep native mobile behavior unchanged.
- Do not write source files from the browser.

## User Experience

The page is a desktop-oriented tool surface:

- Left side: a full-height AMap view with all scenic markers.
- Right side: a calibration panel with the spot list, selected spot details, nudge controls, coordinate fields, and copy actions.
- Selecting a spot from the list or marker highlights it and centers the map.
- Dragging the selected marker updates the working coordinate immediately.
- Nudge controls move the selected coordinate north, south, east, or west.
- Step size can switch between fine and coarse movement.
- Copy actions provide:
  - current spot snippet: `latitude: 31.xxxx, longitude: 120.xxxx`
  - full changed-spots snippet for all edited points

## Architecture

### `AmapView.web.tsx`

Add optional calibration props:

- `calibrationMode?: boolean`
- `onSpotCoordinateChange?: (spotId: string, point: { latitude: number; longitude: number }) => void`
- `calibratedCoordinates?: Record<string, { latitude: number; longitude: number }>`

When calibration mode is enabled:

- markers become draggable
- marker drag end reads the AMap GCJ-02 position directly
- drag changes are reported through `onSpotCoordinateChange`
- selected/active styling remains compatible with existing route highlighting

When calibration mode is disabled, behavior remains unchanged.

### `/map-calibration`

The page owns a local working coordinate map:

- initial values come from `LINGSHAN_SPOTS`
- changed coordinates are stored in component state only
- the rendered spots array merges source data with working coordinates
- no persistence happens automatically

The page exposes copy helpers for selected and changed coordinates. If clipboard access is unavailable, the snippets remain visible for manual selection.

## Data Rules

- Coordinates are treated as GCJ-02 because AMap consumes GCJ-02 directly in this project.
- Device GPS conversion logic is not involved in this tool.
- Output keeps existing numeric precision style: 4-6 decimal places, enough for meter-level adjustment.
- The tool only changes coordinates, not spot names, categories, descriptions, or route order.

## Error Handling

- If AMap fails to load, show the existing fallback/error state and keep the coordinate panel usable for viewing/copying existing values.
- If clipboard copy fails, show the snippet text and a short failure message.
- If no spot is selected, nudge and copy-current controls are disabled.

## Testing

- Unit test coordinate merge/copy helper behavior.
- Existing map coordinate tests should continue passing.
- Web smoke test should load `/map-calibration`, confirm the AMap container renders, select a spot, and verify the copy snippet text updates after a simulated coordinate change where practical.

## Non-Goals

- No direct file write-back from the browser.
- No backend API for saving calibration.
- No native mobile calibration UI.
- No automatic conversion between WGS-84 and GCJ-02 for scenic spots.
