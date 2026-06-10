import React, { useEffect, useRef } from 'react';
import { useAMap } from './AMapContainer';
import type { Spot } from '../../api/spots';

interface SpotMarkersProps {
  spots: Spot[];
  onSpotClick?: (spot: Spot) => void;
}

const SpotMarkers: React.FC<SpotMarkersProps> = ({ spots, onSpotClick }) => {
  const { map, AMap } = useAMap();
  const markersRef = useRef<AMap.Marker[]>([]);

  useEffect(() => {
    if (!map || !AMap || spots.length === 0) return;

    const markers = spots
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((spot) => {
        const marker = new AMap.Marker({
          position: new AMap.LngLat(spot.longitude!, spot.latitude!),
          title: spot.name,
          content: `<div style="
            display:flex;align-items:center;gap:4px;
            background:#fff;border:2px solid #C84B31;border-radius:16px;
            padding:4px 10px;font-size:12px;font-weight:600;color:#1A1614;
            box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;
            font-family:var(--font-serif),serif;
          ">
            <span style="color:#C84B31;font-size:14px;">●</span>
            ${spot.name}
          </div>`,
          offset: new AMap.Pixel(-40, -16),
        });

        marker.on('click', () => {
          onSpotClick?.(spot);
        });

        return marker;
      });

    markers.forEach((m) => m.setMap(map));
    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, AMap, spots, onSpotClick]);

  return null;
};

export default SpotMarkers;
