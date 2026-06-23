import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

export function FloatingCloud({ top, delay, size, opacity }: {
  top: number; delay: number; size: number; opacity: number;
}) {
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withDelay(delay, withTiming(Dimensions.get('window').width + 100, { duration: 25000 })),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.cloud, { top, width: size, height: size * 0.4, opacity }, style]}>
      <Svg width={size} height={size * 0.4} viewBox="0 0 120 48">
        <Defs>
          <RadialGradient id={`cg-${delay}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="60" cy="24" rx="55" ry="22" fill={`url(#cg-${delay})`} />
        <Ellipse cx="40" cy="28" rx="35" ry="18" fill={`url(#cg-${delay})`} />
        <Ellipse cx="80" cy="28" rx="35" ry="18" fill={`url(#cg-${delay})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
});
