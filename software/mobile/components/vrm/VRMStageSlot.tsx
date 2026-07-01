import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePathname } from 'expo-router';
import type { VRMStageTarget } from './VRMStageTypes';
import { useVRMStage } from './VRMStageProvider';

type VRMStageSlotProps = Omit<VRMStageTarget, 'rect'> & {
  style?: StyleProp<ViewStyle>;
  trackMotion?: boolean;
};

export function VRMStageSlot({
  style,
  trackMotion = false,
  ...target
}: VRMStageSlotProps) {
  const ref = useRef<View>(null);
  const pathname = usePathname();
  const { measureStageRect, registerTarget, unregisterTarget } = useVRMStage();
  const latestTargetRef = useRef(target);
  const lastRectRef = useRef<VRMStageTarget['rect'] | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMotionMeasureRef = useRef(0);
  latestTargetRef.current = target;

  const hasRectChanged = useCallback((nextRect: VRMStageTarget['rect']) => {
    const prevRect = lastRectRef.current;
    if (!prevRect) return true;
    return Math.abs(prevRect.x - nextRect.x) > 0.5
      || Math.abs(prevRect.y - nextRect.y) > 0.5
      || Math.abs(prevRect.width - nextRect.width) > 0.5
      || Math.abs(prevRect.height - nextRect.height) > 0.5;
  }, []);

  const registerMeasuredTarget = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    node.measureInWindow((x, y, width, height) => {
      measureStageRect({ x, y, width, height }, (rect) => {
        if (!hasRectChanged(rect)) return;
        lastRectRef.current = rect;
        registerTarget({
          ...latestTargetRef.current,
          rect,
        });
      });
    });
  }, [hasRectChanged, measureStageRect, registerTarget]);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {
    if (Platform.OS === 'web') {
      requestAnimationFrame(registerMeasuredTarget);
      return;
    }
    setTimeout(registerMeasuredTarget, 0);
  }, [registerMeasuredTarget]);

  useEffect(() => {
    registerMeasuredTarget();
  }, [pathname, registerMeasuredTarget]);

  useEffect(() => {
    if (!trackMotion) return undefined;
    let stopped = false;
    const tick = (time: number) => {
      if (stopped) return;
      if (time - lastMotionMeasureRef.current >= 32) {
        lastMotionMeasureRef.current = time;
        registerMeasuredTarget();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [registerMeasuredTarget, trackMotion]);

  useEffect(() => {
    if (!lastRectRef.current) return;
    registerTarget({
      ...target,
      rect: lastRectRef.current,
    });
  }, [
    registerTarget,
    target.action,
    target.actionDuration,
    target.borderRadius,
    target.costumeId,
    target.expression,
    target.framing?.cameraDistance,
    target.framing?.cameraY,
    target.framing?.offsetX,
    target.framing?.offsetY,
    target.framing?.offsetZ,
    target.framing?.targetHeight,
    target.headRotation?.x,
    target.headRotation?.y,
    target.id,
    target.mode,
    target.mouthOpen,
    target.speaking,
    trackMotion,
    target.visible,
    target.zIndex,
  ]);

  useEffect(() => () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    unregisterTarget(target.id);
  }, [target.id, unregisterTarget]);

  const composedStyle = useMemo(() => [styles.slot, style], [style]);

  return (
    <View
      ref={ref}
      style={composedStyle}
      onLayout={onLayout}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  slot: {
    backgroundColor: 'transparent',
  },
});
