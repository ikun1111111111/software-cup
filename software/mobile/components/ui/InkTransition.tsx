import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const CIRCLE_SIZE = Math.max(W, H) * 2.5;

// ─── 简单全局事件 ───
type TriggerCb = () => void;
let _listener: TriggerCb | null = null;

export const InkTransition = {
  /** 在导航前调用，墨滴扩散后回调 */
  trigger(onMid?: () => void) {
    if (_listener) _listener();
    if (onMid) setTimeout(onMid, 120);
  },
};

export function InkOverlay() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    _listener = () => {
      scale.value = withTiming(0, { duration: 0 });
      opacity.value = withTiming(1, { duration: 0 });
      scale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          scale.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) });
          opacity.value = withTiming(0, { duration: 180 });
        }
      });
    };
    return () => { _listener = null; };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.ink, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ink: {
    position: 'absolute',
    top: H / 2 - CIRCLE_SIZE / 2,
    left: W / 2 - CIRCLE_SIZE / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(44,36,32,0.92)',
  },
});
