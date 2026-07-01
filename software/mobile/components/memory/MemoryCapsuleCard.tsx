import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type TravelMemory } from '@/api/memory';
import { MemoryImage, MEMORY_IMAGES } from './MemoryVisual';

export function MemoryCapsuleCard({ item, onUnlock }: {
  item: TravelMemory;
  onUnlock: (id: number) => Promise<void>;
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const lockScale = useSharedValue(1);
  const capsuleOpacity = useSharedValue(0);

  useEffect(() => {
    capsuleOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  const remainingDays = useMemo(() => {
    if (!item.capsule_unlock_at) return 0;
    const unlockDate = new Date(item.capsule_unlock_at);
    const now = new Date();
    const diff = unlockDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [item.capsule_unlock_at]);

  const isReady = remainingDays === 0;

  const handleUnlock = async () => {
    if (!isReady || unlocking) return;
    setUnlocking(true);

    lockScale.value = withSequence(
      withTiming(1.3, { duration: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onUnlock(item.id);
      setUnlocked(true);
      setTimeout(() => {
        setShowContent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 500);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUnlocking(false);
    }
  };

  const lockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));

  const capsuleAnimStyle = useAnimatedStyle(() => ({
    opacity: capsuleOpacity.value,
  }));

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={[styles.capsuleCard, capsuleAnimStyle]}>
      <View style={styles.capsuleBgDecor} />

      {!showContent ? (
        <>
          <View style={styles.capsuleLockArea}>
            <Animated.View style={[styles.capsuleLockIcon, lockAnimStyle]}>
              <MemoryImage source={MEMORY_IMAGES.capsule} size={78} radius={18} fit="contain">
                <View style={[styles.capsuleStateBadge, isReady && styles.capsuleStateBadgeReady]}>
                  <Text style={[styles.capsuleStateBadgeText, isReady && styles.capsuleStateBadgeTextReady]}>
                    {isReady ? '可开' : '封存'}
                  </Text>
                </View>
              </MemoryImage>
            </Animated.View>
            <Text style={styles.capsuleTitle}>{item.title}</Text>
            <Text style={styles.capsuleHint}>
              {isReady ? '可以打开了' : `还需等待 ${remainingDays} 天`}
            </Text>
          </View>

          {isReady && (
            <Pressable
              style={({ pressed }) => [
                styles.capsuleUnlockBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleUnlock}
              disabled={unlocking}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.capsuleUnlockBtnText}>打开胶囊</Text>
              )}
            </Pressable>
          )}
        </>
      ) : (
        <>
          <View style={styles.capsuleContentArea}>
            <View style={styles.capsuleContentTitleRow}>
              <MemoryImage source={MEMORY_IMAGES.capsule} size={30} radius={10} fit="contain" />
              <Text style={styles.capsuleContentTitle}>{item.title}</Text>
            </View>
            <Text style={styles.capsuleContent}>
              {item.capsule_content || item.original_content}
            </Text>
            <Text style={styles.capsuleDate}>
              封存于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
            </Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  capsuleCard: {
    backgroundColor: Colors.accentBg,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  capsuleBgDecor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accent,
    opacity: 0.03,
    borderRadius: Radius.lg,
  },
  capsuleLockArea: {
    alignItems: 'center',
    marginBottom: 16,
  },
  capsuleLockIcon: { marginBottom: 12 },
  capsuleStateBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(42,37,32,0.78)',
  },
  capsuleStateBadgeReady: {
    backgroundColor: Colors.accent,
  },
  capsuleStateBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
  },
  capsuleStateBadgeTextReady: {
    color: '#fff',
  },
  capsuleTitle: {
    fontSize: 18,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 8,
  },
  capsuleHint: {
    fontSize: 13,
    color: Colors.gray500,
    textAlign: 'center',
  },
  capsuleUnlockBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  capsuleUnlockBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  capsuleContentArea: { gap: 12 },
  capsuleContentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  capsuleContentTitle: {
    fontSize: 16,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 1,
  },
  capsuleContent: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 24,
  },
  capsuleDate: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'right',
  },
});
