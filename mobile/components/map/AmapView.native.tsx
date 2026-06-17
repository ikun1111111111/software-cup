import React, { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';
import { LINGSHAN_CENTER, buildHTML, type AmapViewRef, type AmapViewProps } from './AmapView.shared';

const NativeAmapView = forwardRef<AmapViewRef, AmapViewProps>(function NativeAmapView(
  { spots, center = LINGSHAN_CENTER, zoom = 15, height, onSpotTap, showUserLocation, userLocation, style },
  ref,
) {
  const webRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    setCenter(lat: number, lng: number, z?: number) {
      webRef.current?.injectJavaScript(`window.setCenter(${lat},${lng},${z || ''});`);
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

  const handleMessage = useCallback((e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'spotTap' && onSpotTap) {
        const spot = spots.find((s) => s.id === data.spotId);
        if (spot) onSpotTap(spot);
      }
    } catch {}
  }, [spots, onSpotTap]);

  const html = buildHTML(spots, center, zoom,
    'window.ReactNativeWebView.postMessage(JSON.stringify({type:"spotTap",spotId:s.id}))');

  return (
    <View style={[{ height: height ?? 280, overflow: 'hidden', borderRadius: 12 }, style]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={{ flex: 1 }}
        onMessage={handleMessage}
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
