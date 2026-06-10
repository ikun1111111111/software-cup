import React, { useEffect, useRef } from 'react';
import { useAMap } from './AMapContainer';
import type { GeolocationState } from '../../hooks/useGeolocation';

interface UserPositionProps {
  location: GeolocationState;
  onLocate?: () => void;
}

const UserPosition: React.FC<UserPositionProps> = ({ location, onLocate }) => {
  const { map, AMap } = useAMap();
  const markerRef = useRef<AMap.Marker | null>(null);

  useEffect(() => {
    if (!map || !AMap) return;

    if (location.latitude == null || location.longitude == null) return;

    const pos = new AMap.LngLat(location.longitude, location.latitude);

    if (!markerRef.current) {
      markerRef.current = new AMap.Marker({
        position: pos,
        content: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#1890FF;border:3px solid #fff;
          box-shadow:0 0 8px rgba(24,144,255,0.5);
        "></div>`,
        offset: new AMap.Pixel(-8, -8),
        zIndex: 200,
      });
      markerRef.current.setMap(map);
    } else {
      markerRef.current.setPosition(pos);
    }
  }, [map, AMap, location.latitude, location.longitude]);

  const handleLocate = () => {
    if (map && location.latitude != null && location.longitude != null) {
      map.setZoomAndCenter(17, [location.longitude, location.latitude]);
    }
    onLocate?.();
  };

  return (
    <button
      onClick={handleLocate}
      disabled={location.loading || !!location.error}
      style={{
        position: 'absolute',
        bottom: 140,
        right: 16,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: location.error ? '#ccc' : '#1890FF',
      }}
      title="我的位置"
    >
      ◎
    </button>
  );
};

export default UserPosition;
