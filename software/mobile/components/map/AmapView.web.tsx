import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LINGSHAN_CENTER, buildHTML, type AmapViewRef, type AmapViewProps } from './AmapView.shared';

const WebAmapView = forwardRef<AmapViewRef, AmapViewProps>(function WebAmapView(
  { spots, center = LINGSHAN_CENTER, zoom = 15, height, onSpotTap, showUserLocation, userLocation, style },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const html = buildHTML(spots, center, zoom,
    'window.parent.postMessage(JSON.stringify({type:"spotTap",spotId:s.id}),"*")');

  useImperativeHandle(ref, () => ({
    setCenter(lat: number, lng: number, z?: number) {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ cmd: 'setCenter', lat, lng, zoom: z }), '*',
      );
    },
    drawRoute(points) {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ cmd: 'drawRoute', points }), '*',
      );
    },
    clearRoute() {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ cmd: 'clearRoute' }), '*',
      );
    },
  }));

  useEffect(() => { setIframeKey((k) => k + 1); }, [spots]);

  const handleIframeLoad = useCallback(() => {
    const win = iframeRef.current?.contentWindow as any;
    if (win?.AMap && win?.initMap) {
      try { win.initMap(); } catch {}
    }
  }, []);

  // 向 iframe 发送用户位置
  const sendLocation = useCallback((lat: number, lng: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ cmd: 'setUserLocation', lat, lng }), '*',
    );
  }, []);

  // 单次定位
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        // 将地图中心移到用户位置
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ cmd: 'setCenter', lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 16 }), '*',
        );
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [sendLocation]);

  // 持续追踪
  const handleToggleTracking = useCallback(() => {
    if (tracking) {
      // 停止追踪
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTracking(false);
    } else {
      // 开始追踪
      if (!navigator.geolocation) return;
      setTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }
  }, [tracking, sendLocation]);

  // 外部传入位置时同步
  useEffect(() => {
    if (showUserLocation && userLocation) {
      sendLocation(userLocation.latitude, userLocation.longitude);
    }
  }, [showUserLocation, userLocation, sendLocation]);

  // 清理 watchPosition
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleMessage = useCallback((e: MessageEvent) => {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data.type === 'spotTap' && onSpotTap) {
        const spot = spots.find((s) => s.id === data.spotId);
        if (spot) onSpotTap(spot);
      }
    } catch {}
  }, [spots, onSpotTap]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <View style={[{ height: height ?? 280, overflow: 'hidden', borderRadius: 12 }, style]}>
      <iframe
        key={iframeKey}
        ref={iframeRef as any}
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
        onLoad={handleIframeLoad}
      />

      {/* 定位按钮组 */}
      <View style={locStyles.wrap}>
        {/* 单次定位 */}
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

        {/* 持续追踪 */}
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
