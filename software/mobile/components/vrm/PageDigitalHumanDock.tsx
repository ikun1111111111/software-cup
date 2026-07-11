import React, { Suspense, lazy } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';

const LazyPageVRMView = lazy(() =>
  import('./VRMView').then((module) => ({
    default: module.VRMView,
  })),
);

const DOCK_VISUAL_OFFSET_Y = 56;

export type PageDigitalHumanDockDriver = Pick<DigitalHumanDriver,
  'action' | 'actionDurationMs' | 'activate' | 'expression' | 'headRotation' | 'isSpeaking' | 'mouthOpen' | 'speak' | 'subtitle'
>;

export interface PageDigitalHumanDockProps {
  digitalHuman: PageDigitalHumanDockDriver;
}

export function PageDigitalHumanDock({ digitalHuman }: PageDigitalHumanDockProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + (Platform.OS === 'web' ? 0 : 72);

  return (
    <View style={[styles.dock, { bottom }]} pointerEvents="box-none">
      <View style={styles.canvas} pointerEvents="none">
        <Suspense fallback={null}>
          <LazyPageVRMView
            mode="float"
            expression={digitalHuman.expression}
            mouthOpen={digitalHuman.mouthOpen}
            speaking={digitalHuman.isSpeaking}
            action={digitalHuman.action}
            actionDuration={digitalHuman.actionDurationMs}
            headRotation={digitalHuman.headRotation}
            costumeId="festival-spring"
            framing={{
              cameraDistance: 4.3,
              cameraY: 0.35,
              targetHeight: 2.14,
              offsetY: -0.76,
            }}
          />
        </Suspense>
      </View>
    </View>
  );
}

export const PAGE_DIGITAL_HUMAN_DOCK_HEIGHT = 420;

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    right: -22,
    width: 188,
    height: PAGE_DIGITAL_HUMAN_DOCK_HEIGHT,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  canvas: {
    width: 175,
    height: 380,
    marginBottom: 15,
    overflow: 'hidden',
    transform: [{ translateY: DOCK_VISUAL_OFFSET_Y }],
    zIndex: 2,
  },
});
