import React, {
  forwardRef, useImperativeHandle, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { Colors } from '@/constants/colors';
import { VRMView, type VRMViewHandles } from './VRMView';
import { useVRMSync } from '@/hooks/useVRMSync';
import type { Emotion } from './VRMManager';
import type { Action } from './VRMIdleAnim';
import { ExpressionPlayer, textToTimeline } from '@/utils/textTimeline';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BTN_SIZE = 180;

export interface VRMFloatingRef {
  speak: (text: string, emotion?: string) => void;
  speakWithTimeline: (text: string, emotion?: Emotion) => void;
  setExpression: (name: Emotion) => void;
  setAction: (action: Action, duration?: number) => void;
}

interface Props {
  position?: 'bottom-right' | 'bottom-left';
  onPress?: () => void;
}

export const VRMFloating = forwardRef<VRMFloatingRef, Props>(
  ({ onPress }, ref) => {
    const {
      expression: syncExpression,
      mouthOpen,
      isSpeaking,
      subtitle,
      triggerSpeak,
      stopSpeaking,
    } = useVRMSync();

    const [displayExpression, setDisplayExpression] = useState<Emotion>('neutral');
    const [currentAction, setCurrentAction] = useState<Action>('none');
    const [currentActionDuration, setCurrentActionDuration] = useState(800);
    const [headRotation, setHeadRotation] = useState({ x: 0, y: 0 });
    const playerRef = React.useRef<ExpressionPlayer | null>(null);
    const threeRefs = useRef<VRMViewHandles>({ scene: null, camera: null });
    const avatarSizeRef = useRef({ width: 0, height: 0 });

    useEffect(() => {
      playerRef.current = new ExpressionPlayer();
      return () => playerRef.current?.stop();
    }, []);

    useEffect(() => {
      if (currentAction !== 'lookUp') {
        setHeadRotation({ x: 0, y: 0 });
        return;
      }
      const DURATION = 800;
      const start = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / DURATION, 1);
        const curve = progress < 0.2
          ? Math.pow(progress / 0.2, 2)
          : progress > 0.8
            ? Math.pow((1 - progress) / 0.2, 2)
            : 1;
        setHeadRotation({ x: -0.8 * curve, y: 0.6 * curve });
        if (progress >= 1) clearInterval(timer);
      }, 16);
      return () => clearInterval(timer);
    }, [currentAction]);

    const effectiveExpression = displayExpression !== 'neutral' ? displayExpression : syncExpression;

    const expandScale = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const touchStartRef = useRef({ x: 0, y: 0 });
    const enterY = useSharedValue(80);
    const enterOpacity = useSharedValue(0);

    const containerStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value + enterY.value },
        { scale: expandScale.value },
      ],
      opacity: enterOpacity.value,
    }));

    useEffect(() => {
      const t = setTimeout(() => {
        enterY.value = withSpring(0, { damping: 14, stiffness: 120 });
        enterOpacity.value = withTiming(1, { duration: 500 });
      }, 800);
      return () => clearTimeout(t);
    }, []);

    // 点击检测 — 射线检测是否命中 3D 模型
    const hitTest = useCallback((px: number, py: number): boolean => {
      const { scene, camera } = threeRefs.current;
      if (!scene || !camera) return true;
      const { width, height } = avatarSizeRef.current;
      if (width === 0 || height === 0) return true;
      const ndcX = (px / width) * 2 - 1;
      const ndcY = -(py / height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      return hits.length > 0;
    }, []);

    // 组合手势：拖动 + 点击
    const composedGesture = useMemo(() => {
      const pan = Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((e) => {
          const touch = e.changedTouches[0];
          if (touch) touchStartRef.current = { x: touch.x, y: touch.y };
        })
        .onStart(() => {
          startX.value = offsetX.value;
          startY.value = offsetY.value;
          isDragging.value = false;
        })
        .onTouchesMove((e, mgr) => {
          const touch = e.changedTouches[0];
          if (!touch) return;
          const dx = touch.x - touchStartRef.current.x;
          const dy = touch.y - touchStartRef.current.y;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            isDragging.value = true;
            mgr.activate();
          }
        })
        .onUpdate((e) => {
          const nextX = startX.value + e.translationX;
          const nextY = startY.value + e.translationY;
          offsetX.value = Math.max(-SCREEN_W + BTN_SIZE + 16, Math.min(SCREEN_W - BTN_SIZE - 16, nextX));
          offsetY.value = Math.max(-(SCREEN_H - 200), Math.min(SCREEN_H - BTN_SIZE - 120, nextY));
        })
        .onEnd(() => {});

      const tap = Gesture.Tap()
        .onEnd((e) => {
          if (!isDragging.value) {
            const hit = hitTest(e.x, e.y);
            if (hit) {
              onPress?.();
            }
            // 未命中模型 → 不响应，触摸自然穿透
          }
        });

      return Gesture.Race(pan, tap);
    }, [onPress, hitTest]);

    const speakWithTimeline = useCallback((text: string, emotion: Emotion = 'neutral') => {
      const durationMs = Math.max(3000, text.length * 150);
      const timeline = textToTimeline(text, durationMs);
      const first = timeline[0];
      if (first) {
        setDisplayExpression(first.expression);
        setCurrentAction(first.action || 'none');
        setCurrentActionDuration(first.durationMs ?? 800);
      }
      playerRef.current?.play(timeline, (expr, action, dur) => {
        setDisplayExpression(expr);
        setCurrentAction(action || 'none');
        setCurrentActionDuration(dur);
      });
      triggerSpeak(text, emotion);
      setTimeout(() => {
        playerRef.current?.stop();
        setDisplayExpression('neutral');
        setCurrentAction('none');
      }, durationMs);
    }, [triggerSpeak]);

    const speak = useCallback((text: string, emotion?: string) => {
      speakWithTimeline(text, (emotion as Emotion) || 'neutral');
    }, [speakWithTimeline]);

    const setAction = useCallback((action: Action, duration: number = 800) => {
      setCurrentAction(action);
      setCurrentActionDuration(duration);
    }, []);

    useImperativeHandle(ref, () => ({
      speak,
      speakWithTimeline,
      setExpression: setDisplayExpression,
      setAction,
    }));

    useEffect(() => {
      expandScale.value = withSpring(1, { damping: 12 });
    }, []);

    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View style={[styles.container, containerStyle]} pointerEvents="box-none">
          {isSpeaking && subtitle ? (
            <View style={styles.bubble} pointerEvents="none">
              <Text style={styles.bubbleText} numberOfLines={2}>
                {subtitle}
              </Text>
              <View style={styles.bubbleArrow} />
            </View>
          ) : null}

          <GestureDetector gesture={composedGesture}>
            <View
              style={styles.avatar}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                avatarSizeRef.current = { width, height };
              }}
            >
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <VRMView
                  mode="float"
                  expression={effectiveExpression}
                  mouthOpen={mouthOpen}
                  speaking={isSpeaking}
                  action={currentAction}
                  actionDuration={currentActionDuration}
                  headRotation={headRotation}
                  threeRefs={threeRefs}
                />
              </View>
            </View>
          </GestureDetector>

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
    bottom: 15,
    right: -10,
    zIndex: 100,
  },
  container: {},

  bubble: {
    position: 'absolute',
    top: -40,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    maxWidth: 180,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleText: {
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 18,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    transform: [{ rotate: '45deg' }],
  },

  avatar: {
    width: 220,
    height: 360,
    borderRadius: 20,
    overflow: 'hidden',
  },

  nameTag: {
    marginTop: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(106,156,137,0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  nameText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});
