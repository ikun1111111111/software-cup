import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

export interface AMapContextValue {
  map: AMap.Map | null;
  AMap: typeof AMap | null;
  ready: boolean;
}

export const AMapContext = createContext<AMapContextValue>({
  map: null,
  AMap: null,
  ready: false,
});

export const useAMap = () => useContext(AMapContext);

interface AMapContainerProps {
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
}

const AMapContainer: React.FC<AMapContainerProps> = ({
  center = [120.355, 31.424],
  zoom = 16,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<AMapContextValue>({
    map: null,
    AMap: null,
    ready: false,
  });

  useEffect(() => {
    let mapInstance: AMap.Map | null = null;

    AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY || '',
      version: '2.0',
      plugins: ['AMap.Walking', 'AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation'],
    })
      .then((AMap) => {
        if (!containerRef.current) return;
        mapInstance = new AMap.Map(containerRef.current, {
          center,
          zoom,
          viewMode: '2D',
          resizeEnable: true,
        });
        setMapState({ map: mapInstance, AMap, ready: true });
      })
      .catch((err) => {
        console.error('AMap load failed:', err);
      });

    return () => {
      mapInstance?.destroy();
    };
  }, []);

  return (
    <AMapContext.Provider value={mapState}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        {mapState.ready && children}
      </div>
    </AMapContext.Provider>
  );
};

export default AMapContainer;
