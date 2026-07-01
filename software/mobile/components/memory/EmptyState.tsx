import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ScrollUnfurl } from './ScrollUnfurl';
import { MemoryImage, MEMORY_IMAGES } from './MemoryVisual';

export function EmptyState({ onGenerate, generating, onCreatePress }: {
  onGenerate: () => void;
  generating: boolean;
  onCreatePress: () => void;
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
        <Text style={styles.emptyHint}>让小灵带你开始灵山之旅的第一笔</Text>
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
          onPress={() => router.push({
            pathname: '/chat',
            params: { returnTo: '/memory', returnLabel: '返回记忆', fresh: '1' },
          })}
        >
          <MemoryImage source={MEMORY_IMAGES.chat} size={26} radius={8} fit="cover" />
          <Text style={styles.emptyBtnOutlineText}>和小灵聊聊开始</Text>
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
    paddingVertical: 13, alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff', borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  emptyBtnOutlineText: { fontSize: 14, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
});
