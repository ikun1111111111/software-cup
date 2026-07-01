import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { MemoryImage, MEMORY_IMAGES } from './MemoryVisual';

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
          styles.actionBtn,
          styles.actionBtnPrimary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onCreatePress}
      >
        <MemoryImage source={MEMORY_IMAGES.write} size={42} radius={12} fit="contain" />
        <View style={styles.actionCopy}>
          <Text style={styles.actionBtnPrimaryText}>写一条记忆</Text>
          <Text style={styles.actionBtnPrimaryHint}>手写卷轴</Text>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.actionBtnSecondary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <>
            <MemoryImage source={MEMORY_IMAGES.chat} size={42} radius={12} fit="cover" />
            <View style={styles.actionCopy}>
              <Text style={styles.actionBtnSecondaryText}>从对话生成</Text>
              <Text style={styles.actionBtnSecondaryHint}>小灵聊过</Text>
            </View>
          </>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.actionBtnTertiary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onSharePress}
      >
        <MemoryImage source={MEMORY_IMAGES.share} size={42} radius={12} fit="contain" />
        <View style={styles.actionCopy}>
          <Text style={styles.actionBtnTertiaryText}>朋友圈</Text>
          <Text style={styles.actionBtnTertiaryHint}>诗笺分享</Text>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.actionBtnCapsule,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onCapsulePress}
      >
        <MemoryImage source={MEMORY_IMAGES.capsule} size={42} radius={12} fit="contain" />
        <View style={styles.actionCopy}>
          <Text style={styles.actionBtnCapsuleText}>胶囊</Text>
          <Text style={styles.actionBtnCapsuleHint}>封存信件</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: Radius.lg,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  actionBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  actionBtnPrimaryHint: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 3 },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
  actionBtnSecondaryHint: { fontSize: 10, color: Colors.gray400, marginTop: 3 },
  actionBtnTertiary: {
    backgroundColor: Colors.accentBg,
    borderWidth: 1.5, borderColor: Colors.accent + '30',
  },
  actionBtnTertiaryText: { fontSize: 14, fontWeight: '600', color: Colors.accent, letterSpacing: 1 },
  actionBtnTertiaryHint: { fontSize: 10, color: Colors.gray500, marginTop: 3 },
  actionBtnCapsule: {
    backgroundColor: '#F3EAFF',
    borderWidth: 1.5, borderColor: '#9B59B6' + '30',
  },
  actionBtnCapsuleText: { fontSize: 14, fontWeight: '600', color: '#9B59B6', letterSpacing: 1 },
  actionBtnCapsuleHint: { fontSize: 10, color: Colors.gray500, marginTop: 3 },
});
