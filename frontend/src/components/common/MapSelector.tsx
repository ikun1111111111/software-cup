import React, { useCallback, useState } from 'react';
import { EnvironmentOutlined } from '@ant-design/icons';

export interface MapSelectorProps {
  onLocationSelect?: (location: { lat: number; lng: number; name: string }) => void;
  initialLocation?: { lat: number; lng: number };
}

const PRESET_LOCATIONS = [
  { lat: 31.425, lng: 120.355, name: '灵山大佛' },
  { lat: 31.428, lng: 120.358, name: '梵宫' },
  { lat: 31.422, lng: 120.352, name: '九龙灌浴' },
  { lat: 31.420, lng: 120.350, name: '五印坛城' },
  { lat: 31.426, lng: 120.360, name: '曼飞龙塔' },
];

const MapSelector: React.FC<MapSelectorProps> = ({
  onLocationSelect,
  initialLocation,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const handleLocationClick = useCallback((location: { lat: number; lng: number; name: string }) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
  }, [onLocationSelect]);

  return (
    <div data-testid="map-selector" style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 600, color: '#1A1614', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <EnvironmentOutlined style={{ color: '#1A5FB4' }} />
        地图选点
      </h3>

      <div
        data-testid="map-container"
        style={{
          width: '100%',
          height: '400px',
          border: '1px solid #E8E5DF',
          borderRadius: '14px',
          backgroundColor: '#E8F0FE',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 模拟地图 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#1A5FB4',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          灵山景区地图
        </div>

        {/* 预设位置标记 */}
        {PRESET_LOCATIONS.map((location) => (
          <div
            key={location.name}
            data-testid={`marker-${location.name}`}
            onClick={() => handleLocationClick(location)}
            style={{
              position: 'absolute',
              top: `${30 + (location.lat - 31.420) * 2000}%`,
              left: `${30 + (location.lng - 120.350) * 2000}%`,
              width: '14px',
              height: '14px',
              backgroundColor: selectedLocation?.name === location.name ? '#DC4444' : '#1A5FB4',
              borderRadius: '50%',
              cursor: 'pointer',
              transform: 'translate(-50%, -50%)',
              border: '2px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'all 200ms',
            }}
            title={location.name}
          />
        ))}
      </div>

      {/* 位置列表 */}
      <div data-testid="location-list" style={{ marginTop: '16px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 500, color: '#5C554C' }}>推荐位置</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PRESET_LOCATIONS.map((location) => {
            const isSelected = selectedLocation?.name === location.name;
            return (
              <button
                key={location.name}
                data-testid={`location-btn-${location.name}`}
                onClick={() => handleLocationClick(location)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: isSelected ? '#E8F0FE' : '#F8F6F2',
                  color: isSelected ? '#1A5FB4' : '#5C554C',
                  border: isSelected ? '1.5px solid #1A5FB4' : '1px solid #E8E5DF',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 200ms',
                }}
              >
                {location.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 选中位置信息 */}
      {selectedLocation && (
        <div data-testid="selected-info" style={{
          marginTop: '14px',
          padding: '12px 16px',
          backgroundColor: '#E8F0FE',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#1A5FB4',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <EnvironmentOutlined />
          <span style={{ fontWeight: 600 }}>已选位置: </span>
          <span>{selectedLocation.name}</span>
          <span style={{ color: '#A8A198', marginLeft: '8px', fontSize: '12px' }}>
            ({selectedLocation.lat.toFixed(3)}, {selectedLocation.lng.toFixed(3)})
          </span>
        </div>
      )}
    </div>
  );
};

export default MapSelector;
