import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager, Platform } from 'react-native';
import * as Font from 'expo-font';
import { SplashScreen } from 'expo-router';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import PhoneFrame from '@/components/ui/PhoneFrame';
import { InkOverlay } from '@/components/ui/InkTransition';
import { SplashTransition } from '@/components/ui/SplashTransition';
import { TourProvider } from '@/context/TourContext';
import { VRMProvider } from '@/components/vrm/VRMProvider';
import { useAuth } from '@/hooks/useAuth';
import { authEvents } from '@/api/request';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const ProactiveStrategyEngine = lazy(() => import('@/components/guide/ProactiveStrategyEngine'));
const ROOT_DEFERRED_ENGINE_DELAY_MS = 2500;

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);
  const [showDeferred, setShowDeferred] = useState(false);
  const { restoreSession } = useAuth();
  const isCalibrationTool = Platform.OS === 'web'
    ? typeof window !== 'undefined' && window.location.pathname.includes('/map-calibration')
    : pathname.includes('/map-calibration');

  useEffect(() => {
    SplashScreen.hideAsync();
    const task = InteractionManager.runAfterInteractions(() => {
      Font.loadAsync({
        MaShanZheng: require('../assets/fonts/MaShanZheng-Regular.ttf'),
        LongCang: require('../assets/fonts/LongCang-Regular.ttf'),
      }).catch((err) => {
        console.warn('[RootLayout] font preload failed:', err);
      });
    });
    return () => task.cancel();
  }, []);

  // 延迟挂载非关键组件（SmartGuide / ProactiveStrategyEngine），避免抢占首屏渲染
  useEffect(() => {
    if (showSplash) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setShowDeferred(true), ROOT_DEFERRED_ENGINE_DELAY_MS);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [showSplash]);

  useEffect(() => {
    restoreSession();
    const handler = () => {
      // 401 — redirect to login
      router.replace('/auth/login');
    };
    authEvents.onUnauthorized(handler);
    return () => authEvents.offUnauthorized(handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <TourProvider>
          <VRMProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="attractions/index"
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="attractions/[id]"
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="routes/index"
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="routes/[id]"
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="history/index"
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="map"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="map-calibration"
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="guide-demo"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="vrm-performance-demo"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="auth/login"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="auth/register"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
            <InkOverlay />
            {showSplash && <SplashTransition onFinish={handleSplashFinish} />}
            {showDeferred && !isCalibrationTool && (
              <Suspense fallback={null}>
                <ProactiveStrategyEngine />
              </Suspense>
            )}
          </VRMProvider>
        </TourProvider>
      </PhoneFrame>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutInner />
    </ErrorBoundary>
  );
}
