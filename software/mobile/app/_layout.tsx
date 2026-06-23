import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager } from 'react-native';
import { useFonts } from 'expo-font';
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
import { preloadDigitalHuman } from '@/services/digitalHuman';

const ProactiveStrategyEngine = lazy(() => import('@/components/guide/ProactiveStrategyEngine'));

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'MaShanZheng': require('../assets/fonts/MaShanZheng-Regular.ttf'),
    'LongCang': require('../assets/fonts/LongCang-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showDeferred, setShowDeferred] = useState(false);
  const { restoreSession } = useAuth();

  // 延迟挂载非关键组件（SmartGuide / ProactiveStrategyEngine），避免抢占首屏渲染
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setShowDeferred(true), 800);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // 字体加载完成后，后台预加载 VRM 模型和常用数据（不阻塞入场动画）
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      let timer: ReturnType<typeof setTimeout> | null = null;
      const task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(() => {
          preloadDigitalHuman('8024308560058477433.vrm').catch((err) => {
            console.warn('[RootLayout] VRM preload failed:', err);
          });
        }, 1200);
      });
      return () => {
        task.cancel();
        if (timer) clearTimeout(timer);
      };
    }
  }, [fontsLoaded]);

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

  if (!fontsLoaded) {
    return null;
  }

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
                name="guide-demo"
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
            {showDeferred && (
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
