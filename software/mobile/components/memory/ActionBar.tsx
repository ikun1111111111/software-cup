import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { MemoryImage, MEMORY_IMAGES } from './MemoryVisual';

export function ActionBar({
  onGenerate,
  generating,
  onCreatePress,
  onSharePress,
  onCapsulePress,
  candidateCount = 0,
}: {
  onGenerate: () => void;
  generating: boolean;
  onCreatePress: () => void;
  onSharePress: () => void;
  onCapsulePress: () => void;
  candidateCount?: number;
}) {
  const generateHint = candidateCount > 0 ? `可入册 ${candidateCount} 条` : '先聊景点再整理';

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.actionPanel}>
      <Pressable
        style={({ pressed }) => [
          styles.primaryCard,
          pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
        ]}
        onPress={onCreatePress}
        accessibilityRole="button"
        accessibilityLabel="写一条记忆"
      >
        <View style={styles.primaryImageWrap}>
          <MemoryImage source={MEMORY_IMAGES.write} size={56} radius={14} fit="contain" />
        </View>
        <View style={styles.primaryCopy}>
          <Text style={styles.primaryEyebrow}>NEW MEMORY</Text>
          <Text style={styles.primaryTitle}>写一条记忆</Text>
          <Text style={styles.primaryHint}>把此刻感受写成一张灵山手帐</Text>
        </View>
        <Text style={styles.primaryArrow}>›</Text>
      </Pressable>

      <View style={styles.toolGrid}>
        <Pressable
          style={({ pressed }) => [
            styles.toolBtn,
            styles.toolBtnChat,
            pressed && { opacity: 0.84, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onGenerate}
          disabled={generating}
          accessibilityRole="button"
          accessibilityLabel="整理小灵聊天"
        >
          <View style={styles.toolIconWrap}>
            {generating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <MemoryImage source={MEMORY_IMAGES.chat} size={34} radius={10} fit="cover" />
            )}
          </View>
          <Text style={styles.toolTitle}>整理聊天</Text>
          <Text style={styles.toolHint}>{generating ? '整理中' : generateHint}</Text>
          <View style={[
            styles.countBadge,
            candidateCount === 0 && styles.countBadgeEmpty,
          ]}>
            <Text style={[
              styles.countBadgeText,
              candidateCount === 0 && styles.countBadgeTextEmpty,
            ]}>
              {candidateCount}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.toolBtn,
            styles.toolBtnShare,
            pressed && { opacity: 0.84, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onSharePress}
          accessibilityRole="button"
          accessibilityLabel="生成分享图"
        >
          <View style={styles.toolIconWrap}>
            <MemoryImage source={MEMORY_IMAGES.share} size={34} radius={10} fit="contain" />
          </View>
          <Text style={styles.toolTitle}>分享图</Text>
          <Text style={styles.toolHint}>生成朋友圈卡片</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.toolBtn,
            styles.toolBtnCapsule,
            pressed && { opacity: 0.84, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onCapsulePress}
          accessibilityRole="button"
          accessibilityLabel="写给未来"
        >
          <View style={styles.toolIconWrap}>
            <MemoryImage source={MEMORY_IMAGES.capsule} size={34} radius={10} fit="contain" />
          </View>
          <Text style={styles.toolTitle}>写给未来</Text>
          <Text style={styles.toolHint}>封存一封信</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionPanel: {
    gap: 10,
    marginBottom: 20,
  },
  primaryCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.ink,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryImageWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  primaryEyebrow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.52)',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  primaryTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  primaryHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 18,
  },
  primaryArrow: {
    fontSize: 30,
    lineHeight: 32,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '300',
  },
  toolGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    position: 'relative',
  },
  toolBtnChat: {
    borderColor: Colors.primary + '32',
    backgroundColor: Colors.primaryBg,
  },
  toolBtnShare: {
    borderColor: Colors.accent + '28',
    backgroundColor: Colors.accentBg,
  },
  toolBtnCapsule: {
    borderColor: '#9B59B633',
    backgroundColor: '#F3EAFF',
  },
  toolIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  toolTitle: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '900',
    marginBottom: 4,
  },
  toolHint: {
    fontSize: 10,
    lineHeight: 14,
    color: Colors.gray500,
    fontWeight: '600',
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeEmpty: {
    backgroundColor: Colors.gray200,
  },
  countBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '900',
  },
  countBadgeTextEmpty: {
    color: Colors.gray500,
  },
});
