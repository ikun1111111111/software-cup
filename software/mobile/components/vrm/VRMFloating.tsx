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
import type { Emotion } from './VRMTypes';
import type { Action } from './VRMIdleAnim';
import type { VoiceMode } from '@/hooks/useVRMSync';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// 高度占屏幕 2/5，宽度 = 高度 × 0.618
const FLOAT_H = Math.min(Math.round(SCREEN_H * 0.4), 320);
const FLOAT_W = Math.round(FLOAT_H * 0.618);
const BTN_SIZE = FLOAT_H;

// 情绪表情映射
const EMOTION_ICONS: Record<Emotion, string> = {
  neutral: '😊',
  happy: '😄',
  sad: '😢',
  angry: '😠',
  relaxed: '😌',
  surprised: '😲',
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
  /** 服装ID，统一所有页面的VRM外观 */
  costumeId?: string;
  /** 语音模式：silent=静音, browser=浏览器TTS, tts=完整TTS */
  voiceMode?: VoiceMode;
}

export const VRMFloating = forwardRef<VRMFloatingRef, Props>(
  ({ onPress, costumeId = 'festival-spring', voiceMode = 'tts' }, ref) => {
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

    // 流式输出状态
    const [displayText, setDisplayText] = useState('');
    const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
    const [bubbleVisible, setBubbleVisible] = useState(false);
    const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fullTextRef = useRef('');
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const threeRefs = useRef<VRMViewHandles>({ scene: null, camera: null });
    const avatarSizeRef = useRef({ width: 0, height: 0 });

    // 流式输出文字
    const startStreaming = useCallback((text: string, emotion: Emotion = 'neutral') => {
      fullTextRef.current = text;
      setCurrentEmotion(emotion);
      setDisplayText('');
      setBubbleVisible(true);
      
      // 清除之前的隐藏定时器和流式定时器
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }

      let index = 0;
      const charsPerFrame = 2;
      const interval = 50;

      streamIntervalRef.current = setInterval(() => {
        if (index < text.length) {
          index += charsPerFrame;
          setDisplayText(text.substring(0, Math.min(index, text.length)));
        } else {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
          }
          // 流式完成后，显示完整文字并保持气泡可见
          setDisplayText(text);
        }
      }, interval);
    }, []);

    // 停止流式输出 - 讲完话后延迟隐藏气泡
    const stopStreaming = useCallback(() => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      // 显示完整文字
      setDisplayText(fullTextRef.current);
      setBubbleVisible(true);
      // 2秒后自动隐藏气泡
      hideTimerRef.current = setTimeout(() => {
        setBubbleVisible(false);
      }, 2000);
    }, []);

    // 监听speaking状态变化
    useEffect(() => {
      if (isSpeaking && subtitle) {
        // 清除隐藏定时器
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setBubbleVisible(true);
        startStreaming(subtitle, expression);
      } else if (!isSpeaking) {
        // speaking结束，停止流式
        stopStreaming();
      }
    }, [isSpeaking, subtitle, expression]);

    // 同步表情
    useEffect(() => {
      setCurrentEmotion(expression);
    }, [expression]);

    const expandScale = useSharedValue(1);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const touchStartRef = useRef({ x: 0, y: 0 });
    const enterY = useSharedValue(0);
    const enterOpacity = useSharedValue(1);
    const hasAnimatedRef = useRef(false);

    const containerStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value + enterY.value },
        { scale: expandScale.value },
      ],
      opacity: enterOpacity.value,
    }));

    // 仅在首次挂载时播放入场动画
    useEffect(() => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;
      expandScale.value = 0;
      enterY.value = 80;
      enterOpacity.value = 0;
      const t = setTimeout(() => {
        expandScale.value = withSpring(1, { damping: 12 });
        enterY.value = withSpring(0, { damping: 14, stiffness: 120 });
        enterOpacity.value = withTiming(1, { duration: 500 });
      }, 100);
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

    // 清理定时器
    useEffect(() => {
      return () => {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
        }
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
      };
    }, []);

    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View style={[styles.container, containerStyle]} pointerEvents="box-none">
          {/* 字幕气泡 - 修复闪烁问题，流式输出 */}
          {bubbleVisible && (
            <View style={styles.bubble} pointerEvents="none">
              {/* 情绪表情 */}
              <View style={styles.bubbleHeader}>
                <Text style={styles.emotionIcon}>{EMOTION_ICONS[currentEmotion]}</Text>
                <Text style={styles.bubbleLabel}>小灵</Text>
              </View>
              <Text style={styles.bubbleText} numberOfLines={3}>
                {displayText}
                {isSpeaking && <Text style={styles.cursor}>▊</Text>}
              </Text>
              <View style={styles.bubbleArrow} />
            </View>
          )}

          <GestureDetector gesture={composedGesture}>
            <View style={styles.avatar}>
              <View style={StyleSheet.absoluteFill}>
                <VRMView
                  mode="float"
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
    bottom: 10,
    right: -5,
    zIndex: 100,
  },
  container: {},

  bubble: {
    position: 'absolute',
    bottom: FLOAT_H + 8,
    left: (FLOAT_W - 220) / 2,
    width: 220,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
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
    fontSize: 11,
    fontWeight: '600',
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
    fontWeight: 'bold',
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
  avatar: {
    width: FLOAT_W,
    height: FLOAT_H,
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
