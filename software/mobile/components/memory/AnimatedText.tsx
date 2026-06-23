import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

export function AnimatedText({ text, trigger }: {
  text: string;
  trigger: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    if (trigger) {
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400 });
    } else {
      opacity.value = 0;
      translateY.value = 10;
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.animatedTextRow, style]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  animatedTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
});
