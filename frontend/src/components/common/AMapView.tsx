import React, { useEffect, useRef, useState } from 'react';
import { loadAMap } from '../../lib/amapLoader';

export interface AMapMarker {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  active?: boolean;
  description?: string;
}

interface AMapViewProps {
  markers: AMapMarker[];
  pathOrder?: string[];                          // marker id 顺序，连线
  activeMarkerId?: string | null;
  onMarkerClick?: (id: string) => void;
  center?: [number, number];                     // [lng, lat]
  zoom?: number;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_CENTER: [number, number] = [120.1015, 31.4738];   // 灵山胜境九龙灌浴附近
const DEFAULT_ZOOM = 16;

const AMapView: React.FC<AMapViewProps> = ({
  markers,
  pathOrder,
  activeMarkerId,
  onMarkerClick,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = '100%',
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerObjsRef = useRef<Map<string, any>>(new Map());
  const polylineRef = useRef<any>(null);
  const onClickRef = useRef(onMarkerClick);
  onClickRef.current = onMarkerClick;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 1. 初始化地图（只跑一次）
  useEffect(() => {
    let cancelled = false;
    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new AMap.Map(containerRef.current, {
          center,
          zoom,
          viewMode: '2D',
          mapStyle: 'amap://styles/whitesmoke',
          features: ['bg', 'road', 'building', 'point'],
        });
        mapRef.current.addControl(new AMap.Scale({ position: 'LB' }));
        mapRef.current.addControl(new AMap.ToolBar({ position: 'RB', ruler: false, locate: false }));
        setReady(true);
      })
      .catch((err) => {
        console.error('[AMapView] load failed', err);
        setError(err.message || '地图加载失败');
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markerObjsRef.current.clear();
      polylineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 标点 / 路线 / 高亮 — 每次依赖变化重建
  useEffect(() => {
    if (!ready || !mapRef.current || !window.AMap) return;
    const AMap = window.AMap;
    const map = mapRef.current;

    // 清理旧 marker
    markerObjsRef.current.forEach((m) => map.remove(m));
    markerObjsRef.current.clear();
    if (polylineRef.current) {
      map.remove(polylineRef.current);
      polylineRef.current = null;
    }

    // 添加标点
    markers.forEach((mk, idx) => {
      const isActive = mk.id === activeMarkerId || mk.active;
      const labelHtml = `
        <div style="
          display:flex;flex-direction:column;align-items:center;
          transform:translate(-50%,-100%);cursor:pointer;
          font-family:'Noto Serif SC',serif;
        ">
          <div style="
            background:${isActive ? 'rgba(195, 87, 62, 0.95)' : 'rgba(42, 37, 32, 0.88)'};
            color:#F5F0E8;padding:4px 10px;border-radius:14px;
            font-size:12px;white-space:nowrap;
            border:1px solid ${isActive ? '#E8B98C' : 'rgba(245,240,232,0.3)'};
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
          ">${idx + 1}. ${mk.name}</div>
          <div style="
            width:0;height:0;
            border-left:6px solid transparent;border-right:6px solid transparent;
            border-top:8px solid ${isActive ? 'rgba(195, 87, 62, 0.95)' : 'rgba(42, 37, 32, 0.88)'};
          "></div>
        </div>`;

      const marker = new AMap.Marker({
        position: [mk.longitude, mk.latitude],
        content: labelHtml,
        anchor: 'bottom-center',
        zIndex: isActive ? 200 : 100,
      });
      marker.on('click', () => onClickRef.current?.(mk.id));
      map.add(marker);
      markerObjsRef.current.set(mk.id, marker);
    });

    // 路线连线
    if (pathOrder && pathOrder.length >= 2) {
      const path = pathOrder
        .map((id) => markers.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => [m!.longitude, m!.latitude] as [number, number]);
      if (path.length >= 2) {
        polylineRef.current = new AMap.Polyline({
          path,
          strokeColor: '#C3573E',
          strokeWeight: 4,
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
        });
        map.add(polylineRef.current);
      }
    }

    // 自适应视野
    if (markers.length > 0) {
      map.setFitView(
        [...markerObjsRef.current.values(), ...(polylineRef.current ? [polylineRef.current] : [])],
        false,
        [60, 60, 60, 60]
      );
    }
  }, [ready, markers, pathOrder, activeMarkerId]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height,
        ...style,
      }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}
      />
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(247,245,240,0.9)',
            color: '#7a3535',
            fontSize: 13,
            padding: 16,
            textAlign: 'center',
          }}
        >
          地图加载失败：{error}
          <br />
          请检查高德 key 与安全密钥配置
        </div>
      )}
    </div>
  );
};

export default AMapView;
