import React, { useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';
import {
  LINGSHAN_CENTER,
  buildHTML,
  type AmapViewRef,
  type AmapViewProps,
  type CoordinateSource,
} from './AmapView.shared';

const NativeAmapView = forwardRef<AmapViewRef, AmapViewProps>(function NativeAmapView(
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
  const webRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    setCenter(lat: number, lng: number, z?: number, source?: CoordinateSource) {
      webRef.current?.injectJavaScript(
        `window.setCenter(${lat},${lng},${z || 'undefined'},${JSON.stringify(source)});`,
      );
    },
    drawRoute(points) {
      webRef.current?.injectJavaScript(`window.drawRoute(${JSON.stringify(points)});`);
    },
    clearRoute() {
      webRef.current?.injectJavaScript('window.clearRoute();');
    },
  }));

  useEffect(() => {
    if (showUserLocation && userLocation) {
      webRef.current?.injectJavaScript(
        `window.setUserLocation(${userLocation.latitude},${userLocation.longitude});`,
      );
    }
  }, [showUserLocation, userLocation]);

  const syncActiveSpot = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.setActiveSpot(${JSON.stringify(activeSpotId)});`,
    );
  }, [activeSpotId]);

  useEffect(() => {
    syncActiveSpot();
  }, [syncActiveSpot]);

  const handleMessage = useCallback((e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'spotTap' && onSpotTap) {
        const spot = spots.find((s) => s.id === data.spotId);
        if (spot) onSpotTap(spot);
      } else if (data.type === 'mapReady') {
        onMapReady?.();
      } else if (data.type === 'mapError') {
        onMapError?.(data.message || '地图服务暂时不可用');
      }
    } catch {}
  }, [spots, onSpotTap, onMapReady, onMapError]);

  const html = useMemo(
    () => buildHTML(
      spots,
      center,
      zoom,
      'window.ReactNativeWebView.postMessage(JSON.stringify({type:"spotTap",spotId:s.id}))',
      routeSpotIds,
    ),
    [center.latitude, center.longitude, routeSpotIds, spots, zoom],
  );
  const source = useMemo(() => ({ html }), [html]);

  return (
    <View style={[{
      height: style ? undefined : height ?? 280,
      flex: style && height == null ? 1 : undefined,
      overflow: 'hidden',
      borderRadius: 12,
    }, style]}>
      <WebView
        ref={webRef}
        source={source}
        style={{ flex: 1 }}
        onMessage={handleMessage}
        onLoadEnd={() => {
          syncActiveSpot();
          onMapReady?.();
        }}
        onError={() => onMapError?.('地图 WebView 加载失败')}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
});

export default NativeAmapView;
export type { AmapViewRef, AmapViewProps } from './AmapView.shared';
