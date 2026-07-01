import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ScrollUnfurl } from './ScrollUnfurl';
import { MemoryImage, MEMORY_IMAGES } from './MemoryVisual';

export function EmptyState({
  onGenerate,
  generating,
  onCreatePress,
  candidateCount = 0,
}: {
  onGenerate: () => void;
  generating: boolean;
  onCreatePress: () => void;
  candidateCount?: number;
}) {
  const router = useRouter();
  const titleOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    btnOpacity.value = withDelay(1600, withTiming(1, { duration: 500 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value }));

  return (
    <View style={styles.empty}>
      <ScrollUnfurl />

      <Animated.View style={[styles.emptyQuoteArea, titleStyle]}>
        <Text style={styles.emptyQuote}>「每一段旅程，都值得被铭记」</Text>
        <Text style={styles.emptyHint}>先写下第一笔，或让小灵把聊天整理成手帐</Text>
      </Animated.View>

      <Animated.View style={[styles.emptyBtns, btnStyle]}>
        <Pressable
          style={({ pressed }) => [
            styles.emptyBtn,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          onPress={onCreatePress}
        >
          <MemoryImage source={MEMORY_IMAGES.write} size={26} radius={8} fit="contain" />
          <Text style={styles.emptyBtnText}>写下第一笔</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.emptyBtnOutline,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          onPress={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MemoryImage source={MEMORY_IMAGES.chat} size={26} radius={8} fit="cover" />
          )}
          <View style={styles.emptyBtnCopy}>
            <Text style={styles.emptyBtnOutlineText}>整理小灵聊天</Text>
            <Text style={styles.emptyBtnHint}>
              {candidateCount > 0 ? `可入册 ${candidateCount} 条` : '没有内容时会给你提示'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.emptyBtnGhost,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => router.push({
            pathname: '/chat',
            params: { returnTo: '/memory', returnLabel: '返回记忆', fresh: '1' },
          })}
        >
          <MemoryImage source={MEMORY_IMAGES.chat} size={24} radius={8} fit="cover" />
          <Text style={styles.emptyBtnGhostText}>和小灵聊聊开始</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyQuoteArea: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  emptyQuote: {
    fontSize: 20,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 2,
    textAlign: 'center',
  },
  emptyHint: { fontSize: 13, color: Colors.gray400, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtns: { gap: 10, width: '100%' },
  emptyBtn: {
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  emptyBtnOutline: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  emptyBtnCopy: {
    alignItems: 'center',
  },
  emptyBtnOutlineText: { fontSize: 14, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
  emptyBtnHint: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '600',
  },
  emptyBtnGhost: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.pill,
  },
  emptyBtnGhostText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
