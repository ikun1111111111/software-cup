import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LINGSHAN_CENTER, AMAP_KEY, type AmapViewRef, type AmapViewProps } from './AmapView.shared';
import { CAT_COLORS } from '@/constants/scenic';
import { Colors } from '@/constants/colors';

declare global {
  interface Window {
    AMap: any;
  }
}

let amapLoaded = false;
let amapLoading = false;
const amapWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

function loadAmapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (amapLoaded) { resolve(); return; }
    amapWaiters.push({ resolve, reject });
    if (amapLoading) return;
    amapLoading = true;
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale,AMap.ToolBar`;
    script.onload = () => {
      amapLoaded = true;
      amapLoading = false;
      // Inject pulse animation keyframes
      const style = document.createElement('style');
      style.textContent = '@keyframes userPulse{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2);opacity:0}}';
      document.head.appendChild(style);
      amapWaiters.forEach((waiter) => waiter.resolve());
      amapWaiters.length = 0;
    };
    script.onerror = () => {
      amapLoading = false;
      const error = new Error('地图脚本加载失败');
      amapWaiters.forEach((waiter) => waiter.reject(error));
      amapWaiters.length = 0;
    };
    document.head.appendChild(script);
    window.setTimeout(() => {
      if (!amapLoaded && amapLoading) {
        amapLoading = false;
        const error = new Error('地图脚本加载超时');
        amapWaiters.forEach((waiter) => waiter.reject(error));
        amapWaiters.length = 0;
      }
    }, 7000);
  });
}

const WebAmapView = forwardRef<AmapViewRef, AmapViewProps>(function WebAmapView(
  {
    spots,
    center = LINGSHAN_CENTER,
    zoom = 15,
    height,
    onSpotTap,
    showUserLocation,
    userLocation,
    routeSpotIds = [],
    activeSpotId = null,
    style,
    onMapReady,
    onMapError,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Load Amap script and init map
  useEffect(() => {
    let disposed = false;
    setLoadError(null);
    loadAmapScript().then(() => {
      if (disposed || !containerRef.current || mapRef.current) return;
      try {
        const map = new window.AMap.Map(containerRef.current, {
          center: [center.longitude, center.latitude],
          zoom,
          zooms: [13, 18],
          resizeEnable: true,
          touchZoom: true,
          scrollWheel: true,
          viewMode: '2D',
          mapStyle: 'amap://styles/normal',
          showIndoorMap: false,
          features: ['bg', 'road', 'building', 'point'],
        });
        map.addControl(new window.AMap.Scale({ position: 'LB' }));
        map.on('complete', () => onMapReady?.());
        mapRef.current = map;
        setReady(true);
      } catch {
        const message = '地图初始化失败';
        setLoadError(message);
        onMapError?.(message);
      }
    }).catch((error) => {
      if (disposed) return;
      const message = error instanceof Error ? error.message : '地图服务暂时不可用';
      setLoadError(message);
      onMapError?.(message);
    });
    return () => { disposed = true; };
  }, [center.latitude, center.longitude, zoom, onMapReady, onMapError]);

  // Update markers when spots or map changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];
    const routeSet = new Set(routeSpotIds);

    spots.forEach((s, i) => {
      if (s.latitude == null || s.longitude == null) return;
      const color = CAT_COLORS[s.category || ''] || Colors.gray500 || '#999';
      const inRoute = routeSet.has(s.id);
      const active = activeSpotId === s.id;
      const dotSize = active ? 34 : inRoute ? 30 : 26;
      const dotRadius = dotSize / 2;
      const borderColor = active ? '#fff' : inRoute ? '#F7E3A0' : '#fff';
      const bg = active ? '#C8882E' : color;
      const shadow = active
        ? '0 0 0 5px rgba(200,136,46,0.28),0 4px 12px rgba(0,0,0,0.36)'
        : inRoute
          ? '0 0 0 4px rgba(200,136,46,0.2),0 2px 8px rgba(0,0,0,0.32)'
          : '0 2px 6px rgba(0,0,0,0.3)';
      const content = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
        <div style="width:${dotSize}px;height:${dotSize}px;border-radius:${dotRadius}px;background:${bg};border:2.5px solid ${borderColor};display:flex;align-items:center;justify-content:center;box-shadow:${shadow};font-size:10px;font-weight:700;color:#fff;font-family:-apple-system,sans-serif">${i + 1}</div>
        <div style="margin-top:2px;padding:2px 5px;background:rgba(255,255,255,0.92);border-radius:3px;font-size:10px;font-weight:500;color:#333;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;font-family:-apple-system,sans-serif">${s.name}</div>
      </div>`;
      const marker = new window.AMap.Marker({
        position: [s.longitude, s.latitude],
        content,
        offset: new window.AMap.Pixel(-dotRadius, -dotRadius),
        extData: s,
        zIndex: active ? 90 : inRoute ? 70 : 50,
      });
      marker.on('click', () => onSpotTap?.(s));
      map.add(marker);
      markersRef.current.push(marker);
    });

    if (spots.length > 0) {
      try { map.setFitView(null, false, [60, 60, 60, 60]); } catch {}
    }
  }, [spots, ready, onSpotTap, routeSpotIds, activeSpotId]);

  useImperativeHandle(ref, () => ({
    setCenter(lat: number, lng: number, z?: number) {
      const map = mapRef.current;
      if (!map) return;
      map.setCenter(new window.AMap.LngLat(lng, lat));
      if (z) map.setZoom(z);
    },
    drawRoute(points) {
      const map = mapRef.current;
      if (!map) return;
      if (routeLineRef.current) map.remove(routeLineRef.current);
      const path = points.map((p) => new window.AMap.LngLat(p.longitude, p.latitude));
      routeLineRef.current = new window.AMap.Polyline({
        path,
        strokeColor: '#6A9C89',
        strokeWeight: 4,
        strokeStyle: 'dashed',
        strokeDasharray: [8, 4],
      });
      map.add(routeLineRef.current);
      try { map.setFitView(routeLineRef.current, false, [60, 60, 60, 60]); } catch {}
    },
    clearRoute() {
      const map = mapRef.current;
      if (map && routeLineRef.current) {
        map.remove(routeLineRef.current);
        routeLineRef.current = null;
      }
    },
  }));

  // User location marker
  const sendLocation = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) map.remove(userMarkerRef.current);
    userMarkerRef.current = new window.AMap.Marker({
      position: [lng, lat],
      content: '<div style="position:relative"><div style="position:absolute;top:-8px;left:-8px;width:30px;height:30px;border-radius:15px;background:rgba(74,144,217,0.18);animation:userPulse 2s ease-out infinite"></div><div style="width:14px;height:14px;border-radius:7px;background:#4A90D9;border:2.5px solid #fff;box-shadow:0 0 8px rgba(74,144,217,0.5)"></div></div>',
      offset: new window.AMap.Pixel(-7, -7),
      zIndex: 100,
    });
    map.add(userMarkerRef.current);
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        const map = mapRef.current;
        if (map) {
          map.setCenter(new window.AMap.LngLat(pos.coords.longitude, pos.coords.latitude));
          map.setZoom(16);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [sendLocation]);

  const handleToggleTracking = useCallback(() => {
    if (tracking) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTracking(false);
    } else {
      if (!navigator.geolocation) return;
      setTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }
  }, [tracking, sendLocation]);

  useEffect(() => {
    if (showUserLocation && userLocation) {
      sendLocation(userLocation.latitude, userLocation.longitude);
    }
  }, [showUserLocation, userLocation, sendLocation]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <View style={[{
      height: style ? undefined : height ?? 280,
      flex: style && height == null ? 1 : undefined,
      overflow: 'hidden',
      borderRadius: 12,
    }, style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loadError && (
        <View style={fallbackStyles.wrap}>
          <View style={fallbackStyles.panel}>
            <Text style={fallbackStyles.title}>灵山导览地图</Text>
            <Text style={fallbackStyles.copy}>
              真实地图暂时没有连上，已切换离线导览底图。小灵仍可继续推荐路线和讲解景点。
            </Text>
            <View style={fallbackStyles.route}>
              <View style={[fallbackStyles.routeDot, { left: '8%', top: '58%', backgroundColor: Colors.primary }]} />
              <View style={[fallbackStyles.routeDot, { left: '36%', top: '36%', backgroundColor: Colors.ochre }]} />
              <View style={[fallbackStyles.routeDot, { left: '62%', top: '42%', backgroundColor: Colors.accent }]} />
              <View style={[fallbackStyles.routeDot, { left: '86%', top: '18%', backgroundColor: Colors.auxiliary }]} />
              <View style={fallbackStyles.routeLine} />
              <Text style={fallbackStyles.routeBadge}>离线可讲解</Text>
            </View>
          </View>
        </View>
      )}

      {/* 定位按钮组 */}
      <View style={locStyles.wrap}>
        <Pressable
          style={({ pressed }) => [locStyles.btn, pressed && locStyles.btnPressed]}
          onPress={handleLocate}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#6A9C89" />
          ) : (
            <Text style={locStyles.icon}>📍</Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            locStyles.btn,
            tracking && locStyles.btnActive,
            pressed && locStyles.btnPressed,
          ]}
          onPress={handleToggleTracking}
        >
          <Text style={[locStyles.icon, tracking && locStyles.iconActive]}>
            {tracking ? '🔵' : '⭕'}
          </Text>
        </Pressable>
      </View>

      {tracking && (
        <View style={locStyles.trackingBadge}>
          <View style={locStyles.pulseDot} />
          <Text style={locStyles.trackingText}>追踪中</Text>
        </View>
      )}
    </View>
  );
});

const fallbackStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EFE8',
    zIndex: 20,
  },
  panel: {
    width: '78%',
    maxWidth: 300,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.24)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    color: Colors.ink,
    fontWeight: '800',
    letterSpacing: 1,
  },
  copy: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 19,
    color: Colors.gray600,
  },
  route: {
    height: 96,
    marginTop: 18,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(247,245,240,0.86)',
  },
  routeLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '50%',
    height: 3,
    backgroundColor: Colors.accent,
    opacity: 0.72,
    transform: [{ rotate: '-14deg' }],
  },
  routeDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  routeBadge: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.accent,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

const locStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 6,
    zIndex: 10,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  btnActive: {
    backgroundColor: 'rgba(106,156,137,0.15)',
    borderWidth: 1.5,
    borderColor: '#6A9C89',
  },
  icon: {
    fontSize: 16,
  },
  iconActive: {
    fontSize: 14,
  },
  trackingBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(106,156,137,0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  trackingText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default WebAmapView;
export type { AmapViewRef, AmapViewProps } from './AmapView.shared';
