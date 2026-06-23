import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

export function InkDropAnimation({ trigger }: { trigger: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      scale.value = withTiming(3, { duration: 800 });
      opacity.value = withSequence(
        withTiming(0.6, { duration: 400 }),
        withTiming(0, { duration: 400 })
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.inkDrop, style]} />
  );
}

const styles = StyleSheet.create({
  inkDrop: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    borderRadius: 50,
    backgroundColor: Colors.ink,
    zIndex: 10,
  },
});
