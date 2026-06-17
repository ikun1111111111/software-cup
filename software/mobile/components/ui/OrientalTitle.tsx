import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  title: string;
  subtitle?: string;
}

export function OrientalTitle({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.underline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 24 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 6,
    letterSpacing: 4,
  },
  underline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
    marginTop: 10,
    opacity: 0.6,
  },
});
