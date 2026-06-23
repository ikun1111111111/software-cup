import React, {
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View, StyleSheet, InteractionManager } from 'react-native';
import { usePathname } from 'expo-router';
import type { VRMFloatingRef } from '@/components/vrm/VRMTypes';
export type { VRMFloatingRef } from '@/components/vrm/VRMTypes';

const LazyVRMFloating = lazy(() =>
  import('@/components/vrm/VRMFloating').then((module) => ({
    default: module.VRMFloating,
  })),
);

// ── Context ───
interface VRMContextValue {
  vrmRef: React.RefObject<VRMFloatingRef>;
}

const VRMContext = createContext<VRMContextValue | null>(null);

export function useVRM(): VRMContextValue {
  const ctx = useContext(VRMContext);
  if (!ctx) throw new Error('useVRM must be used within VRMProvider');
  return ctx;
}

// 这些页面有自己的页面内 VRMView，不需要右下角全局浮窗
const PAGES_WITH_OWN_VRM = ['/chat', '/(tabs)/chat', '/explore', '/(tabs)/explore', '/attractions', '/map'];

// ─── Provider ───
export function VRMProvider({ children }: { children: ReactNode }) {
  const vrmRef = useRef<VRMFloatingRef>(null);
  const pathname = usePathname();
  const hideFloating = PAGES_WITH_OWN_VRM.some((p) => pathname.includes(p));
  const [canMountFloating, setCanMountFloating] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setCanMountFloating(true), 600);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <VRMContext.Provider value={{ vrmRef }}>
      {children}
      {/* 全局持久 VRM 层，跨页面导航不销毁 */}
      {canMountFloating && !hideFloating && (
        <View style={styles.layer} pointerEvents="box-none">
          <Suspense fallback={null}>
            <LazyVRMFloating ref={vrmRef} position="bottom-right" />
          </Suspense>
        </View>
      )}
    </VRMContext.Provider>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    pointerEvents: 'box-none',
  },
});
