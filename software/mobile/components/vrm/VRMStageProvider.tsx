import React, {
  Suspense,
  createContext,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { usePathname } from 'expo-router';
import { VRM_LAYER_Z_INDEX } from './vrmLayout';
import { normalizeVRMRoutePath } from './vrmRouteVisibility';
import type { VRMStageRect, VRMStageTarget, VRMStageTargetPatch } from './VRMStageTypes';
import { getActiveStageTarget, hasUsableStageRect } from './vrmStageRegistry';

const LazyVRMView = lazy(() =>
  import('./VRMView').then((module) => ({
    default: module.VRMView,
  })),
);

interface VRMStageContextValue {
  registerTarget: (target: VRMStageTarget) => void;
  updateTarget: (id: string, patch: VRMStageTargetPatch) => void;
  unregisterTarget: (id: string) => void;
  toStageRect: (windowRect: VRMStageRect) => VRMStageRect;
  refreshRootRect: () => void;
  measureStageRect: (windowRect: VRMStageRect, callback: (rect: VRMStageRect) => void) => void;
}

const VRMStageContext = createContext<VRMStageContextValue | null>(null);

export function useVRMStage(): VRMStageContextValue {
  const ctx = useContext(VRMStageContext);
  if (!ctx) throw new Error('useVRMStage must be used within VRMStageProvider');
  return ctx;
}

function now() {
  return Date.now();
}

const STAGE_ENABLED_PATHS = new Set(['/attractions', '/routes']);
const STAGE_ENABLED_PREFIXES: string[] = [];

export function VRMStageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<View>(null);
  const rootWindowRectRef = useRef<VRMStageRect>({ x: 0, y: 0, width: 0, height: 0 });
  const targetsRef = useRef<Map<string, VRMStageTarget>>(new Map());
  const [targetsVersion, setTargetsVersion] = useState(0);

  const publish = useCallback(() => {
    setTargetsVersion((version) => version + 1);
  }, []);

  const registerTarget = useCallback((target: VRMStageTarget) => {
    targetsRef.current.set(target.id, {
      ...target,
      updatedAt: target.updatedAt ?? now(),
    });
    publish();
  }, [publish]);

  const updateTarget = useCallback((id: string, patch: VRMStageTargetPatch) => {
    const current = targetsRef.current.get(id);
    if (!current) return;
    targetsRef.current.set(id, {
      ...current,
      ...patch,
      id,
      rect: patch.rect ?? current.rect,
      updatedAt: now(),
    });
    publish();
  }, [publish]);

  const unregisterTarget = useCallback((id: string) => {
    if (!targetsRef.current.delete(id)) return;
    publish();
  }, [publish]);

  const refreshRootRect = useCallback(() => {
    rootRef.current?.measureInWindow((x, y, width, height) => {
      rootWindowRectRef.current = { x, y, width, height };
    });
  }, []);

  const toStageRect = useCallback((windowRect: VRMStageRect): VRMStageRect => {
    const rootRect = rootWindowRectRef.current;
    return {
      x: windowRect.x - rootRect.x,
      y: windowRect.y - rootRect.y,
      width: windowRect.width,
      height: windowRect.height,
    };
  }, []);

  const measureStageRect = useCallback((
    windowRect: VRMStageRect,
    callback: (rect: VRMStageRect) => void,
  ) => {
    const root = rootRef.current;
    if (!root) {
      callback(toStageRect(windowRect));
      return;
    }
    root.measureInWindow((x, y, width, height) => {
      rootWindowRectRef.current = { x, y, width, height };
      callback({
        x: windowRect.x - x,
        y: windowRect.y - y,
        width: windowRect.width,
        height: windowRect.height,
      });
    });
  }, [toStageRect]);

  const onRootLayout = useCallback((_event: LayoutChangeEvent) => {
    refreshRootRect();
  }, [refreshRootRect]);

  useEffect(() => {
    refreshRootRect();
  }, [refreshRootRect]);

  const value = useMemo<VRMStageContextValue>(() => ({
    measureStageRect,
    registerTarget,
    refreshRootRect,
    toStageRect,
    updateTarget,
    unregisterTarget,
  }), [measureStageRect, refreshRootRect, registerTarget, toStageRect, unregisterTarget, updateTarget]);

  const activeTarget = useMemo(() => (
    getActiveStageTarget(Array.from(targetsRef.current.values()))
  ), [targetsVersion]);
  const routePath = normalizeVRMRoutePath(pathname);
  const stageEnabled = STAGE_ENABLED_PATHS.has(routePath)
    || STAGE_ENABLED_PREFIXES.some((prefix) => routePath.startsWith(prefix));
  const lastTargetRef = useRef<VRMStageTarget | null>(null);
  if (activeTarget) {
    lastTargetRef.current = activeTarget;
  }
  const renderTarget = activeTarget ?? lastTargetRef.current;
  const canRender = stageEnabled && hasUsableStageRect(activeTarget);

  return (
    <VRMStageContext.Provider value={value}>
      <View ref={rootRef} style={styles.root} onLayout={onRootLayout} pointerEvents="box-none">
        {children}
        {stageEnabled && renderTarget && (
          <View
            pointerEvents="none"
            style={[
              styles.layer,
              {
                left: renderTarget.rect.x,
                top: renderTarget.rect.y,
                width: renderTarget.rect.width,
                height: renderTarget.rect.height,
                borderRadius: renderTarget.borderRadius ?? 18,
                zIndex: renderTarget.zIndex ?? VRM_LAYER_Z_INDEX + 1,
                opacity: canRender ? 1 : 0,
              },
            ]}
          >
            <Suspense fallback={null}>
              <LazyVRMView
                mode={renderTarget.mode}
                focusMode="component"
                expression={renderTarget.expression}
                mouthOpen={renderTarget.mouthOpen}
                speaking={renderTarget.speaking}
                action={renderTarget.action}
                actionDuration={renderTarget.actionDuration}
                headRotation={renderTarget.headRotation}
                costumeId={renderTarget.costumeId}
                framing={renderTarget.framing}
              />
            </Suspense>
          </View>
        )}
      </View>
    </VRMStageContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    pointerEvents: 'box-none',
  },
  layer: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
});
