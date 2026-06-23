import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';

export function InkTimelineNode({ index, total, spotName }: {
  index: number;
  total: number;
  spotName: string | null;
}) {
  const nodeAnim = useSharedValue(0);

  useEffect(() => {
    nodeAnim.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nodeAnim.value }],
    opacity: nodeAnim.value,
  }));

  const isLast = index === total - 1;

  return (
    <View style={styles.inkNodeContainer}>
      {!isLast && (
        <View style={styles.inkLine} />
      )}
      <Animated.View style={[styles.inkDot, dotStyle]}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Circle cx={8} cy={8} r={7} fill={Colors.ink} opacity={0.12} />
          <Circle cx={8} cy={8} r={4} fill={Colors.ink} opacity={0.7} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  inkNodeContainer: {
    width: 32,
    alignItems: 'center',
    paddingTop: 24,
  },
  inkDot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inkLine: {
    width: 1.5,
    flex: 1,
    minHeight: 40,
    backgroundColor: Colors.gray300,
    opacity: 0.4,
    marginTop: 4,
  },
});
