import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type TravelMemory } from '@/api/memory';
import { MOOD_META } from './constants';

export function TodayReviewCard({ memories, onDismiss }: {
  memories: TravelMemory[];
  onDismiss: () => void;
}) {
  const today = new Date().toDateString();
  const todayMemories = useMemo(() => {
    return memories.filter((m) => new Date(m.created_at).toDateString() === today);
  }, [memories, today]);

  const [dismissed, setDismissed] = useState(false);
  const dismissX = useSharedValue(0);

  if (todayMemories.length === 0 || dismissed) return null;

  const moodCounts: Record<string, number> = {};
  todayMemories.forEach((m) => {
    const mood = m.mood_tag || 'neutral';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  const moodMeta = MOOD_META[dominantMood] || { emoji: '📝', color: Colors.gray400, label: '平静' };

  const spotNames = Array.from(new Set(todayMemories.map((m) => m.spot_name).filter(Boolean)));

  const summaryText = useMemo(() => {
    if (todayMemories.length === 1) {
      return `今天你在${spotNames[0]}留下了今日唯一一条记忆。`;
    }
    if (spotNames.length > 0) {
      return `今天你拜访了${spotNames.slice(0, 3).join('、')}，共记录了${todayMemories.length}条记忆。`;
    }
    return `今天你记录了${todayMemories.length}条旅行记忆。`;
  }, [todayMemories, spotNames]);

  const handleDismiss = () => {
    dismissX.value = withTiming(-400, { duration: 300 });
    setTimeout(() => setDismissed(true), 300);
    onDismiss();
  };

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dismissX.value }],
    opacity: interpolate(dismissX.value, [-400, 0], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={[styles.todayReviewCard, dismissStyle]}>
      <View style={styles.todayReviewHeader}>
        <View style={styles.todayReviewBadge}>
          <Text style={styles.todayReviewBadgeText}>📅 今日回顾</Text>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={8}>
          <Text style={styles.todayReviewClose}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.todayReviewSummary}>{summaryText}</Text>

      <View style={styles.todayReviewMeta}>
        <View style={styles.todayReviewMood}>
          <Text style={styles.todayReviewMoodEmoji}>{moodMeta.emoji}</Text>
          <Text style={[styles.todayReviewMoodLabel, { color: moodMeta.color }]}>
            {moodMeta.label}
          </Text>
        </View>
        {spotNames.length > 0 && (
          <View style={styles.todayReviewSpots}>
            <Text style={styles.todayReviewSpotsText} numberOfLines={1}>
              📍 {spotNames.slice(0, 3).join(' → ')}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.todayReviewDate}>
        {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  todayReviewCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  todayReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  todayReviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.sm,
  },
  todayReviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  todayReviewClose: {
    fontSize: 16,
    color: Colors.gray400,
    padding: 4,
  },
  todayReviewSummary: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: 12,
  },
  todayReviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  todayReviewMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayReviewMoodEmoji: { fontSize: 14 },
  todayReviewMoodLabel: { fontSize: 11, fontWeight: '600' },
  todayReviewSpots: { flex: 1 },
  todayReviewSpotsText: {
    fontSize: 11,
    color: Colors.gray500,
  },
  todayReviewDate: {
    fontSize: 10,
    color: Colors.gray400,
    textAlign: 'right',
  },
});
