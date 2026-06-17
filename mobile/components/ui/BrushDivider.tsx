import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export function BrushDivider() {
  return (
    <View style={styles.wrap}>
      <View style={styles.stroke} />
      <View style={styles.dot1} />
      <View style={styles.dot2} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  stroke: {
    width: 120,
    height: 1.5,
    backgroundColor: Colors.ink,
    opacity: 0.12,
    borderRadius: 1,
  },
  dot1: {
    position: 'absolute',
    left: '38%',
    top: '50%',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.ink,
    opacity: 0.08,
  },
  dot2: {
    position: 'absolute',
    right: '35%',
    top: '55%',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.ink,
    opacity: 0.06,
  },
});
