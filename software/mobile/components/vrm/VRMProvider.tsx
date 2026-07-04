import React, {
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, Text, View, StyleSheet, InteractionManager, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import type { VRMAvoidanceInsets, VRMFloatingRef } from '@/components/vrm/VRMTypes';
import { getVRMFloatingMetrics, VRM_LAYER_Z_INDEX } from '@/components/vrm/vrmLayout';
import {
  normalizeVRMRoutePath,
  shouldHideFloatingVRM,
} from '@/components/vrm/vrmRouteVisibility';
import { getCostume } from '@/constants/costumeMap';
import { preloadDigitalHuman } from '@/services/digitalHuman';
import { VRMStageProvider } from '@/components/vrm/VRMStageProvider';
import { VRMManager } from '@/components/vrm/VRMManager';
export type { VRMFloatingRef } from '@/components/vrm/VRMTypes';

const LazyVRMFloating = lazy(() =>
  import('@/components/vrm/VRMFloating').then((module) => ({
    default: module.VRMFloating,
  })),
);
const DEFAULT_FLOATING_VRM_DELAY_MS = 1200;
const HOME_FLOATING_VRM_DELAY_MS = 3600;
const BACKGROUND_VRM_PRELOAD_DELAY_MS = 5200;

// ── Context ───
interface VRMContextValue {
  vrmRef: React.RefObject<VRMFloatingRef>;
  avoidance: VRMAvoidanceInsets;
}

const VRMContext = createContext<VRMContextValue | null>(null);
const EMPTY_AVOIDANCE: VRMAvoidanceInsets = {
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  visible: false,
};

export function useVRM(): VRMContextValue {
  const ctx = useContext(VRMContext);
  if (!ctx) throw new Error('useVRM must be used within VRMProvider');
  return ctx;
}

// Exact pages with page-local VRM hide the global floating layer.

// ─── Provider ───
export function VRMProvider({ children }: { children: ReactNode }) {
  const vrmRef = useRef<VRMFloatingRef>(null);
  const pathname = usePathname();
  const previousRoutePathRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const hideFloating = Platform.OS === 'web' || shouldHideFloatingVRM(pathname);
  // const showManualLoadButton = shouldShowManualVRMLoadButton(pathname);
  const showManualLoadButton = false;
  const routePath = normalizeVRMRoutePath(pathname);
  const [canMountFloating, setCanMountFloating] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const isHomeRoute = routePath === '/';
  const preloadModelFile = getCostume('festival-spring').modelFile;
  const floatingMetrics = useMemo(() => getVRMFloatingMetrics({
    pathname,
    safeAreaBottom: insets.bottom,
    screenWidth: dimensions.width,
    screenHeight: dimensions.height,
  }), [dimensions.height, dimensions.width, insets.bottom, pathname]);
  const contextValue = useMemo<VRMContextValue>(() => ({
    vrmRef,
    avoidance: hideFloating ? EMPTY_AVOIDANCE : floatingMetrics.avoidance,
  }), [floatingMetrics.avoidance, hideFloating]);

  useEffect(() => {
    if (hideFloating || Platform.OS === 'web') return undefined;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        void preloadDigitalHuman(preloadModelFile).catch((err) => {
          console.warn('[VRMProvider] preload failed:', err);
        });
      }, BACKGROUND_VRM_PRELOAD_DELAY_MS);
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [hideFloating, preloadModelFile]);

  useLayoutEffect(() => {
    if (previousRoutePathRef.current === null) {
      previousRoutePathRef.current = routePath;
      return;
    }
    if (previousRoutePathRef.current === routePath) return;

    previousRoutePathRef.current = routePath;
    VRMManager.stopSpeaking({ playQueued: false });
  }, [routePath]);

  useEffect(() => {
    if (hideFloating) {
      setCanMountFloating(false);
      return undefined;
    }
    if (canMountFloating) return undefined;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const delayMs = isHomeRoute ? HOME_FLOATING_VRM_DELAY_MS : DEFAULT_FLOATING_VRM_DELAY_MS;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setCanMountFloating(true), delayMs);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [canMountFloating, hideFloating, isHomeRoute]);

  const handleManualLoad = () => {
    setIsManualLoading(true);
    VRMManager.requestManualReload(undefined, routePath);
    setTimeout(() => setIsManualLoading(false), 1200);
  };

  return (
    <VRMContext.Provider value={contextValue}>
      <VRMStageProvider>
        {children}
        {showManualLoadButton && (
          <Pressable
            style={({ pressed }) => [
              styles.manualLoadButton,
              { top: Math.max(insets.top + 10, 18) },
              pressed && styles.manualLoadButtonPressed,
            ]}
            onPress={handleManualLoad}
            accessibilityRole="button"
            accessibilityLabel="手动加载VRM模型"
          >
            <Text style={styles.manualLoadIcon}>{isManualLoading ? '...' : 'VRM'}</Text>
          </Pressable>
        )}
      {/* 全局持久 VRM 层，跨页面导航不销毁 */}
      {canMountFloating && !hideFloating && (
        <View style={styles.layer} pointerEvents="box-none">
          <Suspense fallback={null}>
            <LazyVRMFloating ref={vrmRef} position="bottom-right" metrics={floatingMetrics} />
          </Suspense>
        </View>
        )}
      </VRMStageProvider>
    </VRMContext.Provider>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: VRM_LAYER_Z_INDEX,
    pointerEvents: 'box-none',
  },
  manualLoadButton: {
    position: 'absolute',
    right: 12,
    zIndex: VRM_LAYER_Z_INDEX + 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(42,37,32,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  manualLoadButtonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(106,156,137,0.62)',
  },
  manualLoadIcon: {
    color: 'rgba(253,251,247,0.72)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
