import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  title: string;
  subtitle: string;
}

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  subtitle: { fontSize: 9, letterSpacing: 3, color: Colors.gray400, marginTop: 4 },
  line: { width: 24, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 8, opacity: 0.5 },
});
