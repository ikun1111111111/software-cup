import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import { Colors } from '@/constants/colors';

export function ScrollUnfurl() {
  const scaleX = useSharedValue(0);
  const inkOpacity = useSharedValue(0);

  useEffect(() => {
    scaleX.value = withDelay(300, withTiming(1, { duration: 1200 }));
    inkOpacity.value = withDelay(800, withTiming(0.15, { duration: 1000 }));
  }, []);

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  const inkStyle = useAnimatedStyle(() => ({
    opacity: inkOpacity.value,
  }));

  return (
    <View style={styles.unfurlContainer}>
      <Animated.View style={[styles.unfurlInk, inkStyle]} />
      <Animated.View style={[styles.unfurlScroll, scrollStyle]}>
        <Svg width={200} height={120} viewBox="0 0 200 120">
          <Rect x={10} y={10} width={180} height={100} rx={4} fill={Colors.paperWarm} stroke={Colors.borderDefault} strokeWidth={1} />
          <Rect x={6} y={6} width={8} height={108} rx={4} fill={Colors.ochre} opacity={0.6} />
          <Rect x={186} y={6} width={8} height={108} rx={4} fill={Colors.ochre} opacity={0.6} />
          <Line x1={30} y1={35} x2={170} y2={35} stroke={Colors.borderLight} strokeWidth={0.5} />
          <Line x1={30} y1={55} x2={170} y2={55} stroke={Colors.borderLight} strokeWidth={0.5} />
          <Line x1={30} y1={75} x2={170} y2={75} stroke={Colors.borderLight} strokeWidth={0.5} />
          <Line x1={30} y1={95} x2={170} y2={95} stroke={Colors.borderLight} strokeWidth={0.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  unfurlContainer: {
    width: 200,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  unfurlInk: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.ink,
    borderRadius: 100,
  },
  unfurlScroll: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
