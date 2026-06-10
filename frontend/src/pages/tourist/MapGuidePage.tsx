import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import AMapContainer from '../../components/map/AMapContainer';
import SpotMarkers from '../../components/map/SpotMarkers';
import UserPosition from '../../components/map/UserPosition';
import RoutePanel from '../../components/map/RoutePanel';
import { useGeolocation } from '../../hooks/useGeolocation';
import { listSpots, type Spot } from '../../api/spots';

const MapGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [navigating, setNavigating] = useState(false);

  React.useEffect(() => {
    listSpots().then(setSpots).catch(() => setSpots([]));
  }, []);

  const handleSpotClick = useCallback((spot: Spot) => {
    setSelectedSpot(spot);
    setNavigating(false);
  }, []);

  const handleNavigate = useCallback(() => {
    setNavigating(true);
  }, []);

  const handleCloseRoute = useCallback(() => {
    setNavigating(false);
  }, []);

  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const spotDistance =
    selectedSpot && geo.latitude != null && geo.longitude != null &&
    selectedSpot.latitude != null && selectedSpot.longitude != null
      ? calcDistance(geo.latitude, geo.longitude, selectedSpot.latitude, selectedSpot.longitude)
      : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw', position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 16px', background: '#fff',
        borderBottom: '1px solid #f0f0f0', zIndex: 30,
        fontFamily: 'var(--font-serif), serif',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            border: 'none', background: 'none', fontSize: 18,
            cursor: 'pointer', color: '#333', padding: '4px 8px',
          }}
        >
          <ArrowLeftOutlined />
        </button>
        <span style={{
          flex: 1, textAlign: 'center', fontSize: 16,
          fontWeight: 700, color: '#1A1614', letterSpacing: 2,
        }}>
          灵山导览
        </span>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <AMapContainer>
          <SpotMarkers spots={spots} onSpotClick={handleSpotClick} />
          <UserPosition location={geo} />

          {selectedSpot && !navigating && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff', borderRadius: '12px 12px 0 0',
              padding: '16px 20px',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
              zIndex: 20,
              fontFamily: 'var(--font-serif), serif',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6,
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1614' }}>
                  {selectedSpot.name}
                </span>
                <button
                  onClick={() => setSelectedSpot(null)}
                  style={{
                    border: 'none', background: 'none', fontSize: 18,
                    color: '#999', cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                {selectedSpot.overview}
                {spotDistance != null && (
                  <span style={{ marginLeft: 12, color: '#C84B31' }}>
                    距你 {spotDistance >= 1000 ? `${(spotDistance / 1000).toFixed(1)}km` : `${Math.round(spotDistance)}m`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleNavigate}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: 'none', background: '#C84B31', color: '#fff',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  导航到这里
                </button>
                <button
                  onClick={() => navigate(`/attractions/${selectedSpot.id}`)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: '1px solid #d9d9d9', background: '#fff',
                    color: '#333', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  查看详情
                </button>
              </div>
            </div>
          )}

          <RoutePanel
            from={geo.latitude != null && geo.longitude != null ? { lat: geo.latitude, lng: geo.longitude } : null}
            to={navigating ? selectedSpot : null}
            onClose={handleCloseRoute}
          />

          {geo.error && (
            <div style={{
              position: 'absolute', top: 12, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.95)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, color: '#666',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 20,
            }}>
              {geo.error}
            </div>
          )}
        </AMapContainer>
      </div>
    </div>
  );
};

export default MapGuidePage;
