import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

export function ActionBar({ onGenerate, generating, onCreatePress, onSharePress, onCapsulePress }: {
  onGenerate: () => void;
  generating: boolean;
  onCreatePress: () => void;
  onSharePress: () => void;
  onCapsulePress: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.actionBar}>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnPrimary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onCreatePress}
      >
        <Text style={styles.actionBtnPrimaryText}>✨ 写一条记忆</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnSecondary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={styles.actionBtnSecondaryText}>从对话生成</Text>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnTertiary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onSharePress}
      >
        <Text style={styles.actionBtnTertiaryText}>📤 朋友圈</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnCapsule,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onCapsulePress}
      >
        <Text style={styles.actionBtnCapsuleText}>🔮 胶囊</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionBtnPrimary: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  actionBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  actionBtnSecondary: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
  actionBtnTertiary: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: Colors.accentBg, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.accent + '30',
  },
  actionBtnTertiaryText: { fontSize: 14, fontWeight: '600', color: Colors.accent, letterSpacing: 1 },
  actionBtnCapsule: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#F3EAFF', borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: '#9B59B6' + '30',
  },
  actionBtnCapsuleText: { fontSize: 14, fontWeight: '600', color: '#9B59B6', letterSpacing: 1 },
});
