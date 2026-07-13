import React, { Suspense, lazy } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';

const LazyPageVRMView = lazy(() =>
  import('./VRMView').then((module) => ({
    default: module.VRMView,
  })),
);

const DOCK_VISUAL_OFFSET_Y = 56;

export type PageDigitalHumanDockDriver = Pick<DigitalHumanDriver,
  'action' | 'actionDurationMs' | 'activate' | 'expression' | 'headRotation' | 'isSpeaking' | 'mouthOpen' | 'speak' | 'speechText' | 'subtitle'
>;

export interface PageDigitalHumanDockProps {
  digitalHuman: PageDigitalHumanDockDriver;
}

export function PageDigitalHumanDock({ digitalHuman }: PageDigitalHumanDockProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + (Platform.OS === 'web' ? 0 : 72);
  const displayText = digitalHuman.subtitle?.trim() || digitalHuman.speechText?.trim() || '';

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
      {displayText ? (
        <View style={styles.speechBubble} pointerEvents="none">
          <Text style={styles.speechLabel}>小灵</Text>
          <Text style={styles.speechText} numberOfLines={3}>{displayText}</Text>
          <View style={styles.speechArrow} />
        </View>
      ) : null}
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
  speechBubble: {
    position: 'absolute',
    right: 131,
    bottom: 220,
    width: 168,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(26,22,20,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 3,
  },
  speechLabel: { marginBottom: 4, color: '#D9B45B', fontSize: 11, fontWeight: '900' },
  speechText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18 },
  speechArrow: {
    position: 'absolute',
    right: -7,
    bottom: 12,
    width: 14,
    height: 14,
    backgroundColor: 'rgba(26,22,20,0.92)',
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '45deg' }],
  },
});
