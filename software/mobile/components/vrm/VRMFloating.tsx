import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { Colors } from '@/constants/colors';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import type { VoiceMode } from '@/hooks/useVRMSync';
import { VRMView, type VRMViewHandles } from './VRMView';
import type { Action } from './VRMIdleAnim';
import type { Emotion } from './VRMTypes';
import { getVRMFloatingMetrics, type VRMFloatingMetrics } from './vrmLayout';
import { getCostume } from '@/constants/costumeMap';
import { preloadDigitalHuman } from '@/services/digitalHuman';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';

const BUBBLE_W = 220;

const EMOTION_ICONS: Record<Emotion, string> = {
  neutral: '',
  happy: '',
  sad: '',
  angry: '',
  relaxed: '',
  surprised: '',
  thinking: '',
  grateful: '',
};

export interface VRMFloatingRef {
  speak: (text: string, emotion?: string) => void;
  speakWithTimeline: (text: string, emotion?: Emotion) => void;
  setExpression: (name: Emotion) => void;
  setAction: (action: Action, duration?: number) => void;
}

interface Props {
  position?: 'bottom-right' | 'bottom-left';
  onPress?: () => void;
  costumeId?: string;
  voiceMode?: VoiceMode;
  metrics?: VRMFloatingMetrics;
}

export const VRMFloating = forwardRef<VRMFloatingRef, Props>(
  (
    {
      position = 'bottom-right',
      onPress,
      costumeId = 'festival-spring',
      voiceMode = DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
      metrics: metricsProp,
    },
    ref,
  ) => {
    const driver = useDigitalHumanDriver(voiceMode);
    const {
      expression,
      mouthOpen,
      isSpeaking,
      subtitle,
      action: currentAction,
      actionDurationMs: currentActionDuration,
      headRotation,
    } = driver;

    const dimensions = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const computedMetrics = useMemo(() => getVRMFloatingMetrics({
      pathname,
      safeAreaBottom: insets.bottom,
      screenWidth: dimensions.width,
      screenHeight: dimensions.height,
    }), [dimensions.height, dimensions.width, insets.bottom, pathname]);
    const metrics = metricsProp ?? computedMetrics;

    const wrapperDockStyle = useMemo(() => (
      position === 'bottom-left'
        ? { bottom: metrics.bottom, left: metrics.right }
        : { bottom: metrics.bottom, right: metrics.right }
    ), [metrics.bottom, metrics.right, position]);
    const bubbleDockStyle = useMemo(() => ({
      bottom: metrics.height + 8,
      left: Math.max(-24, (metrics.width - BUBBLE_W) / 2),
    }), [metrics.height, metrics.width]);
    const stageStyle = useMemo(() => ({
      width: metrics.width,
      height: metrics.height,
    }), [metrics.height, metrics.width]);
    const hotZoneStyle = useMemo(() => ({
      left: metrics.hotZone.left,
      top: metrics.hotZone.top,
      width: metrics.hotZone.width,
      height: metrics.hotZone.height,
    }), [metrics.hotZone.height, metrics.hotZone.left, metrics.hotZone.top, metrics.hotZone.width]);

    const [displayText, setDisplayText] = useState('');
    const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
    const [bubbleVisible, setBubbleVisible] = useState(false);
    const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fullTextRef = useRef('');
    const expressionRef = useRef<Emotion>('neutral');
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const threeRefs = useRef<VRMViewHandles>({ scene: null, camera: null });
    const avatarSizeRef = useRef({ width: metrics.width, height: metrics.height });

    useEffect(() => {
      void preloadDigitalHuman(getCostume(costumeId)?.modelFile || 'avatar.vrm').catch((err) => {
        console.warn('[VRMFloating] model preload failed:', err);
      });
    }, [costumeId]);

    const expandScale = useSharedValue(1);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const enterY = useSharedValue(0);
    const enterOpacity = useSharedValue(1);
    const touchStartRef = useRef({ x: 0, y: 0 });
    const hasAnimatedRef = useRef(false);

    useEffect(() => {
      avatarSizeRef.current = { width: metrics.width, height: metrics.height };
    }, [metrics.height, metrics.width]);

    const clearBubbleTimers = useCallback(() => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }, []);

    const hideBubbleImmediately = useCallback(() => {
      clearBubbleTimers();
      fullTextRef.current = '';
      setDisplayText('');
      setBubbleVisible(false);
    }, [clearBubbleTimers]);

    useLayoutEffect(() => {
      hideBubbleImmediately();
    }, [hideBubbleImmediately, pathname]);

    const startStreaming = useCallback((text: string, emotion: Emotion = 'neutral') => {
      fullTextRef.current = text;
      setCurrentEmotion(emotion);
      setDisplayText('');
      setBubbleVisible(true);
      clearBubbleTimers();

      let index = 0;
      streamIntervalRef.current = setInterval(() => {
        if (index < text.length) {
          index += 2;
          setDisplayText(text.substring(0, Math.min(index, text.length)));
          return;
        }
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        setDisplayText(text);
      }, 50);
    }, [clearBubbleTimers]);

    const stopStreaming = useCallback(() => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      if (!fullTextRef.current) {
        setBubbleVisible(false);
        return;
      }
      setDisplayText(fullTextRef.current);
      setBubbleVisible(true);
      hideTimerRef.current = setTimeout(() => {
        setBubbleVisible(false);
      }, 2000);
    }, []);

    useEffect(() => {
      if (isSpeaking && subtitle) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        startStreaming(subtitle, expressionRef.current);
      } else if (!isSpeaking) {
        stopStreaming();
      }
    }, [isSpeaking, startStreaming, stopStreaming, subtitle]);

    useEffect(() => {
      expressionRef.current = expression;
      setCurrentEmotion(expression);
    }, [expression]);

    useEffect(() => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;
      // Use withTiming(0) wrappers so shared values always hold valid animation objects.
      // Direct assignment (e.g. expandScale.value = 0) causes "previousAnimation.onFrame is not a function"
      // when the subsequent withSpring/withTiming animation interrupts.
      expandScale.value = withTiming(0, { duration: 0 });
      enterY.value = withTiming(80, { duration: 0 });
      enterOpacity.value = withTiming(0, { duration: 0 });
      const timer = setTimeout(() => {
        expandScale.value = withSpring(1, { damping: 12 });
        enterY.value = withSpring(0, { damping: 14, stiffness: 120 });
        enterOpacity.value = withTiming(1, { duration: 500 });
      }, 100);
      return () => clearTimeout(timer);
    }, [enterOpacity, enterY, expandScale]);

    useEffect(() => {
      return () => {
        clearBubbleTimers();
      };
    }, [clearBubbleTimers]);

    const containerStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value + enterY.value },
        { scale: expandScale.value },
      ],
      opacity: enterOpacity.value,
    }));

    const hitTest = useCallback((px: number, py: number): boolean => {
      const { scene, camera } = threeRefs.current;
      if (!scene || !camera) return true;
      const { width, height } = avatarSizeRef.current;
      if (width === 0 || height === 0) return true;
      const ndcX = (px / width) * 2 - 1;
      const ndcY = -(py / height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      return raycaster.intersectObjects(scene.children, true).length > 0;
    }, []);

    const composedGesture = useMemo(() => {
      const pan = Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((event) => {
          const touch = event.changedTouches[0];
          if (touch) touchStartRef.current = { x: touch.x, y: touch.y };
        })
        .onStart(() => {
          startX.value = offsetX.value;
          startY.value = offsetY.value;
          isDragging.value = false;
        })
        .onTouchesMove((event, manager) => {
          const touch = event.changedTouches[0];
          if (!touch) return;
          const dx = touch.x - touchStartRef.current.x;
          const dy = touch.y - touchStartRef.current.y;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            isDragging.value = true;
            manager.activate();
          }
        })
        .onUpdate((event) => {
          const nextX = startX.value + event.translationX;
          const nextY = startY.value + event.translationY;
          offsetX.value = Math.max(
            -dimensions.width + metrics.height + 16,
            Math.min(dimensions.width - metrics.height - 16, nextX),
          );
          offsetY.value = Math.max(
            -(dimensions.height - 200),
            Math.min(dimensions.height - metrics.height - 120, nextY),
          );
        });

      const tap = Gesture.Tap()
        .onEnd((event) => {
          if (isDragging.value) return;
          const hit = hitTest(event.x + metrics.hotZone.left, event.y + metrics.hotZone.top);
          if (hit) onPress?.();
        });

      return Gesture.Race(pan, tap);
    }, [
      dimensions.height,
      dimensions.width,
      hitTest,
      isDragging,
      metrics.height,
      metrics.hotZone.left,
      metrics.hotZone.top,
      offsetX,
      offsetY,
      onPress,
      startX,
      startY,
    ]);

    const speakWithTimeline = useCallback((text: string, emotion: Emotion = 'neutral') => {
      driver.speak(text, { emotion });
    }, [driver]);

    const speak = useCallback((text: string, emotion?: string) => {
      speakWithTimeline(text, (emotion as Emotion) || 'neutral');
    }, [speakWithTimeline]);

    const setAction = useCallback((action: Action, duration: number = 800) => {
      driver.playAction(action, duration);
    }, [driver]);

    useImperativeHandle(ref, () => ({
      speak,
      speakWithTimeline,
      setExpression: driver.setExpression,
      setAction,
    }));

    return (
      <View style={[styles.wrapper, wrapperDockStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.container, containerStyle]} pointerEvents="box-none">
          {bubbleVisible && (
            <View style={[styles.bubble, bubbleDockStyle]} pointerEvents="none">
              <View style={styles.bubbleHeader}>
                <Text style={styles.emotionIcon}>{EMOTION_ICONS[currentEmotion]}</Text>
                <Text style={styles.bubbleLabel}>XIAOLING</Text>
              </View>
              <Text style={styles.bubbleText} numberOfLines={3}>
                {displayText}
                {isSpeaking && <Text style={styles.cursor}>|</Text>}
              </Text>
              <View style={styles.bubbleArrow} />
            </View>
          )}

          <View style={[styles.stage, stageStyle]} pointerEvents="box-none">
            <View style={styles.avatar} pointerEvents="none">
              <View style={StyleSheet.absoluteFill}>
                <VRMView
                  mode="float"
                  focusMode="component"
                  expression={expression}
                  mouthOpen={mouthOpen}
                  speaking={isSpeaking}
                  action={currentAction}
                  actionDuration={currentActionDuration}
                  headRotation={headRotation}
                  threeRefs={threeRefs}
                  costumeId={costumeId}
                />
              </View>
            </View>
            <GestureDetector gesture={composedGesture}>
              <View style={[styles.avatarHotZone, hotZoneStyle]} />
            </GestureDetector>
          </View>

          <Pressable style={styles.nameTag} onPress={onPress}>
            <Text style={styles.nameText}>小灵</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  container: {},
  bubble: {
    position: 'absolute',
    width: BUBBLE_W,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    padding: 10,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.2)',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  emotionIcon: {
    fontSize: 16,
  },
  bubbleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  bubbleText: {
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  cursor: {
    color: Colors.primary,
    fontWeight: '700',
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.2)',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    transform: [{ rotate: '45deg' }],
  },
  stage: {
    position: 'relative',
  },
  avatar: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarHotZone: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  nameTag: {
    marginTop: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(106,156,137,0.92)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  nameText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
});

export default VRMFloating;
