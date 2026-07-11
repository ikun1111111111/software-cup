import React, { Suspense, lazy, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';

const LazyPageVRMView = lazy(() =>
  import('./VRMView').then((module) => ({
    default: module.VRMView,
  })),
);

const SPEECH_BUBBLE_VISIBLE_MS = 3000;
const DOCK_VISUAL_OFFSET_Y = 56;

export type PageDigitalHumanDockDriver = Pick<DigitalHumanDriver,
  'action' | 'actionDurationMs' | 'activate' | 'expression' | 'headRotation' | 'isSpeaking' | 'mouthOpen' | 'speak' | 'speechText' | 'subtitle'
>;

export interface PageDigitalHumanDockProps {
  digitalHuman: PageDigitalHumanDockDriver;
  idleText?: string;
}

export function PageDigitalHumanDock({
  digitalHuman,
  idleText = '我是小灵，随时为你讲解',
}: PageDigitalHumanDockProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + (Platform.OS === 'web' ? 0 : 72);
  const displayText = digitalHuman.speechText?.trim() || digitalHuman.subtitle?.trim() || idleText;
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(true);

  useEffect(() => {
    setSpeechBubbleVisible(true);

    if (digitalHuman.isSpeaking) {
      return;
    }

    const hideTimer = setTimeout(() => {
      setSpeechBubbleVisible(false);
    }, SPEECH_BUBBLE_VISIBLE_MS);

    return () => clearTimeout(hideTimer);
  }, [displayText, digitalHuman.isSpeaking]);

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
      {speechBubbleVisible && (
        <View style={styles.speechBubble} pointerEvents="box-none">
          <View style={styles.speechHeader}>
            <Text style={styles.speechLabel}>小灵</Text>
            <Pressable
              style={({ pressed }) => [styles.speakButton, pressed && styles.speakButtonPressed]}
              onPress={() => digitalHuman.speak(displayText, { emotion: 'neutral' })}
              disabled={digitalHuman.isSpeaking}
              accessibilityRole="button"
              accessibilityLabel="朗读小灵提示"
              hitSlop={8}
            >
              <Text style={styles.speakButtonText}>{digitalHuman.isSpeaking ? '播报中' : '朗读'}</Text>
            </Pressable>
          </View>
          <Text style={styles.speechText} numberOfLines={2}>{displayText}</Text>
          <View style={styles.speechArrow} />
        </View>
      )}
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
    right: 136,
    bottom: 220,
    width: 156,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(26,22,20,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 3,
  },
  speechLabel: {
    color: '#D9B45B',
    fontSize: 11,
    fontWeight: '900',
  },
  speechHeader: {
    minHeight: 28,
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speakButton: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: 'rgba(217,180,91,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(217,180,91,0.44)',
  },
  speakButtonPressed: {
    backgroundColor: 'rgba(217,180,91,0.28)',
  },
  speakButtonText: {
    color: '#F4D784',
    fontSize: 10,
    fontWeight: '800',
  },
  speechText: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
  },
  speechArrow: {
    position: 'absolute',
    right: -7,
    bottom: 12,
    width: 14,
    height: 14,
    backgroundColor: 'rgba(26,22,20,0.9)',
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '45deg' }],
  },
});
