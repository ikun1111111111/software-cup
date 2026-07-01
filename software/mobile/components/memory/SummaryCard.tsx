import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type JourneySummary } from '@/api/memory';
import { MemoryRouteImage } from './MemoryVisual';

export function SummaryCard({ summary, onGenerate, generating }: {
  summary: JourneySummary | null;
  onGenerate: () => void;
  generating: boolean;
}) {
  if (summary) {
    return (
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <MemoryRouteImage width={112} height={86} style={styles.summaryVisual} />
          <View style={styles.summaryMain}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>旅程总结</Text>
              </View>
              <Text style={styles.summaryDate}>{summary.date_range}</Text>
            </View>
            <Text style={styles.summaryTitle}>{summary.title}</Text>
            <Text style={styles.summaryContent} numberOfLines={3}>{summary.content}</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNum}>{summary.spot_count}</Text>
            <Text style={styles.summaryStatLabel}>景点</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNum}>{summary.memory_count}</Text>
            <Text style={styles.summaryStatLabel}>记忆</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.summaryEmpty}>
      <MemoryRouteImage width={138} height={86} style={styles.summaryEmptyVisual} />
      <Text style={styles.summaryEmptyTitle}>还没有旅程总结</Text>
      <Text style={styles.summaryEmptyHint}>生成记忆后，可一键总结整段旅程</Text>
      <Pressable
        style={({ pressed }) => [
          styles.summaryBtn,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.summaryBtnText}>生成旅程总结</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 18,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  summaryVisual: {
    flexShrink: 0,
  },
  summaryMain: {
    flex: 1,
    minWidth: 0,
  },
  summaryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    gap: 8,
  },
  summaryBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.primaryBg, borderRadius: 4,
  },
  summaryBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
  summaryDate: { fontSize: 11, color: Colors.gray400 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink, letterSpacing: 1, marginBottom: 8 },
  summaryContent: { fontSize: 13, color: Colors.gray600, lineHeight: 20, marginBottom: 12 },
  summaryStats: {
    flexDirection: 'row', gap: 20,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  summaryStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryStatNum: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  summaryStatLabel: { fontSize: 12, color: Colors.gray400 },
  summaryEmpty: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 24, alignItems: 'center',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryEmptyVisual: { marginBottom: 12 },
  summaryEmptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  summaryEmptyHint: { fontSize: 12, color: Colors.gray400, textAlign: 'center', marginBottom: 16 },
  summaryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
  },
  summaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
});
