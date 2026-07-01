import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export default function FooterSection() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerMountain}>
        <View style={styles.mountain1} />
        <View style={styles.mountain2} />
        <View style={styles.mountain3} />
      </View>
      <Text style={styles.footerTitle}>智慧灵山胜境 · 数字人导览系统</Text>
      <Text style={styles.footerCopyright}>© 2026 灵山胜境旅游发展有限公司</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 20, paddingBottom: 100,
    backgroundColor: Colors.ink, alignItems: 'center',
  },
  footerMountain: {
    width: '100%', height: 40, marginBottom: 18,
    position: 'relative', overflow: 'hidden',
  },
  mountain1: {
    position: 'absolute', bottom: 0, left: '10%',
    width: 0, height: 0,
    borderLeftWidth: 55, borderRightWidth: 55, borderBottomWidth: 38,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(106,156,137,0.15)',
  },
  mountain2: {
    position: 'absolute', bottom: 0, left: '35%',
    width: 0, height: 0,
    borderLeftWidth: 70, borderRightWidth: 70, borderBottomWidth: 48,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(106,156,137,0.2)',
  },
  mountain3: {
    position: 'absolute', bottom: 0, right: '10%',
    width: 0, height: 0,
    borderLeftWidth: 45, borderRightWidth: 45, borderBottomWidth: 32,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(106,156,137,0.12)',
  },
  footerTitle: { fontSize: 12, color: Colors.gray300, letterSpacing: 3, marginBottom: 6 },
  footerCopyright: { fontSize: 10, color: 'rgba(168,161,152,0.5)' },
});
