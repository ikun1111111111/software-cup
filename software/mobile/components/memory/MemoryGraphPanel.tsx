import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import type { MemoryGraphCandidate } from '@/utils/memoryGraph';

const SOURCE_LABELS: Record<string, string> = {
  chat: '问答',
  guide: '导览',
  narration: '讲解',
  checkin: '打卡',
  route: '路线',
};

const SOURCE_COLORS: Record<string, string> = {
  chat: Colors.auxiliary,
  guide: Colors.primary,
  narration: Colors.ochre,
  checkin: Colors.accent,
  route: Colors.success,
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function MemoryGraphPanel({
  candidates,
  onEnroll,
}: {
  candidates: MemoryGraphCandidate[];
  onEnroll: (candidate: MemoryGraphCandidate) => void;
}) {
  if (candidates.length === 0) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TRAVEL MEMORY GRAPH</Text>
          <Text style={styles.title}>旅程线索</Text>
        </View>
        <Text style={styles.count}>{candidates.length} 条待入册</Text>
      </View>

      <View style={styles.timeline}>
        {candidates.map((item) => {
          const sourceColor = SOURCE_COLORS[item.sourceType] || Colors.primary;
          return (
            <View key={item.eventId} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: sourceColor }]} />
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={[styles.source, { color: sourceColor }]}>
                    {SOURCE_LABELS[item.sourceType] || '线索'}
                  </Text>
                  <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.spotName || item.routeName || '灵山旅程'}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.enrollBtn,
                      pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => onEnroll(item)}
                  >
                    <Text style={styles.enrollText}>入册</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  count: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.pill,
  },
  timeline: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 18,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  source: {
    fontSize: 11,
    fontWeight: '800',
  },
  time: {
    fontSize: 11,
    color: Colors.gray400,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 12,
    color: Colors.gray600,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  meta: {
    flex: 1,
    fontSize: 11,
    color: Colors.gray400,
  },
  enrollBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
  },
  enrollText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
