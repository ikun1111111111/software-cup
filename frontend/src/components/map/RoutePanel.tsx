import React, { useEffect, useRef } from 'react';
import { useAMap } from './AMapContainer';
import type { Spot } from '../../api/spots';

interface RoutePanelProps {
  from: { lat: number; lng: number } | null;
  to: Spot | null;
  onClose?: () => void;
}

const RoutePanel: React.FC<RoutePanelProps> = ({ from, to, onClose }) => {
  const { map, AMap } = useAMap();
  const walkingRef = useRef<AMap.Walking | null>(null);
  const polylineRef = useRef<AMap.Polyline | null>(null);

  useEffect(() => {
    if (!map || !AMap || !from || !to || to.latitude == null || to.longitude == null) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }

    const walking = new AMap.Walking({ map });
    walkingRef.current = walking;

    const fromLngLat = new AMap.LngLat(from.lng, from.lat);
    const toLngLat = new AMap.LngLat(to.longitude, to.latitude);

    walking.search(fromLngLat, toLngLat, (status, result) => {
      if (status === 'complete' && result.routes?.length > 0) {
        const route = result.routes[0];
        const path = route.steps?.flatMap((step: any) => step.path) || [];

        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }

        polylineRef.current = new AMap.Polyline({
          path,
          strokeColor: '#1890FF',
          strokeWeight: 6,
          strokeOpacity: 0.7,
          lineJoin: 'round',
          map,
        });

        map.setFitView([polylineRef.current], false, [60, 60, 180, 60]);
      }
    });

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [map, AMap, from, to]);

  if (!to) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderRadius: '12px 12px 0 0',
        padding: '16px 20px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
        zIndex: 20,
        fontFamily: 'var(--font-serif), serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1614' }}>
          → {to.name}
        </span>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            fontSize: 18,
            color: '#999',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ color: '#666', fontSize: 14 }}>正在规划路线...</div>
    </div>
  );
};

export default RoutePanel;
