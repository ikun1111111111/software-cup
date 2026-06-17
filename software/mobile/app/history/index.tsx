import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { getTimeline, getTodayInHistory, type TimelineEvent, type TodayCard } from '@/api/history';
import { Colors } from '@/constants/colors';

const ERA_THEMES: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  '唐代': { color: '#B45309', bg: 'rgba(180,83,9,0.06)', icon: '️', label: '盛唐' },
  '北宋': { color: '#1E40AF', bg: 'rgba(30,64,175,0.06)', icon: '📜', label: '大宋' },
  '南宋': { color: '#7C3AED', bg: 'rgba(124,58,237,0.06)', icon: '🎋', label: '南宋' },
  '元代': { color: '#059669', bg: 'rgba(5,150,105,0.06)', icon: '🐎', label: '蒙元' },
  '明代': { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', icon: '⛩️', label: '大明' },
  '清末': { color: '#6B7280', bg: 'rgba(107,114,128,0.06)', icon: '🏮', label: '晚清' },
  '现代': { color: '#1A5FB4', bg: 'rgba(26,95,180,0.06)', icon: '🏙️', label: '现代' },
};

const getTheme = (era: string) =>
  ERA_THEMES[era] || { color: '#666', bg: 'rgba(0,0,0,0.04)', icon: '📍', label: era };

export default function HistoryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [eras, setEras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [todayCard, setTodayCard] = useState<TodayCard | null>(null);

  useEffect(() => {
    Promise.all([getTimeline(), getTodayInHistory()])
      .then(([tlRes, tcRes]) => {
        const tl = (tlRes as any).data ?? tlRes;
        const tc = (tcRes as any).data ?? tcRes;
        setEvents(tl.events || []);
        setEras(tl.eras || []);
        setTodayCard(tc.card || tc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('history');
    const timer = setTimeout(() => {
      vrmRef.current?.speak('让我们一起穿越千年时光，感受灵山的历史变迁', 'neutral');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleEraPress = useCallback((era: string) => {
    const newEra = era === selectedEra ? null : era;
    setSelectedEra(newEra);
    if (newEra) {
      vrmRef.current?.speak(`${newEra}时期的灵山`, 'neutral');
    }
  }, [selectedEra]);

  const filtered = selectedEra ? events.filter((e) => e.era === selectedEra) : events;

  const grouped = useMemo(() => {
    const g: { era: string; events: TimelineEvent[] }[] = [];
    let lastEra = '';
    filtered.forEach((ev) => {
      if (ev.era !== lastEra) {
        g.push({ era: ev.era, events: [ev] });
        lastEra = ev.era;
      } else {
        g[g.length - 1].events.push(ev);
      }
    });
    return g;
  }, [filtered]);

  return (
    <View style={styles.root}>
      {/* ═══ Header ═══ */}
      <View style={[styles.header, { paddingTop: insets.top + 36 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)')} hitSlop={8}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>时空穿越</Text>
          <Text style={styles.headerSub}>千年灵山，一脉相承</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>穿越中...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
              {/* Today Card */}
              {todayCard && (
                <Animated.View
                  entering={FadeInUp.duration(350)}
                  style={styles.todayCard}
                >
                  <View style={styles.todayHeader}>
                    <Text style={styles.todayLabel}>那年今日</Text>
                    <Text style={styles.todayDate}>{todayCard.month}/{todayCard.day}</Text>
                  </View>
                  <Text style={styles.todayTitle}>{todayCard.title}</Text>
                  <Text style={styles.todayDesc}>
                    <Text style={styles.todayYear}>{todayCard.year_ago}</Text>
                    {'  ·  '}{todayCard.description}
                  </Text>
                </Animated.View>
              )}

              {/* Era Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eraRow}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.eraChip,
                    !selectedEra && styles.eraChipActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedEra(null)}
                >
                  <Text style={[styles.eraChipText, !selectedEra && styles.eraChipTextActive]}>
                    全部
                  </Text>
                </Pressable>
                {eras.map((era) => {
                  const theme = getTheme(era);
                  const active = selectedEra === era;
                  return (
                    <Pressable
                      key={era}
                      style={({ pressed }) => [
                        styles.eraChip,
                        active && { backgroundColor: theme.color + '18', borderColor: theme.color },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleEraPress(era)}
                    >
                      <Text style={[styles.eraChipText, active && { color: theme.color, fontWeight: '600' }]}>
                        {era}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Timeline */}
              <View style={styles.timelineTrack}>
                {grouped.map((group, gIdx) => {
                  const theme = getTheme(group.era);
                  return (
                    <View key={group.era}>
                      {/* Era Section Header */}
                      <Animated.View
                        entering={FadeInUp.delay(gIdx * 60).duration(350)}
                        style={styles.eraSection}
                      >
                        <View style={[styles.eraDot, { backgroundColor: theme.color }]} />
                        <View style={[styles.eraSectionBar, { backgroundColor: theme.bg }]}>
                          <Text style={[styles.eraSectionLabel, { color: theme.color }]}>
                            {theme.label}
                          </Text>
                          <View style={[styles.eraSectionLine, { backgroundColor: theme.color + '30' }]} />
                        </View>
                      </Animated.View>

                      {/* Event Cards */}
                      {group.events.map((event, eIdx) => {
                        const idx = grouped.slice(0, gIdx).reduce((sum, g) => sum + g.events.length, 0) + eIdx;
                        return (
                          <Animated.View
                            key={`${event.era}-${event.year}-${eIdx}`}
                            entering={FadeInUp.delay(idx * 50).duration(300)}
                            style={styles.eventRow}
                          >
                            {/* Timeline rail */}
                            <View style={styles.rail}>
                              <View style={[styles.railDot, { backgroundColor: theme.color }]} />
                              {idx < filtered.length - 1 && <View style={styles.railLine} />}
                            </View>

                            {/* Card */}
                            <View style={styles.eventCard}>
                              <View style={styles.eventTop}>
                                <View style={[styles.eraTag, { backgroundColor: theme.color + '12' }]}>
                                  <Text style={[styles.eraTagText, { color: theme.color }]}>
                                    {event.era}
                                  </Text>
                                </View>
                                <Text style={styles.eventYear}>{event.year}</Text>
                              </View>
                              <Text style={styles.eventTitle}>{event.event}</Text>
                              <Text style={styles.eventDesc} numberOfLines={3}>
                                {event.description}
                              </Text>
                              {event.spot && (
                                <View style={styles.spotRow}>
                                  <Text style={styles.spotText}>{event.spot}</Text>
                                </View>
                              )}
                            </View>
                          </Animated.View>
                        );
                      })}
                    </View>
                  );
                })}

                {/* End Marker */}
                {filtered.length > 0 && (
                  <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.endRow}>
                    <View style={styles.rail}>
                      <View style={styles.endDot} />
                    </View>
                    <View style={styles.endCard}>
                      <Text style={styles.endText}>此刻，历史仍在书写...</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
        </ScrollView>
      )}

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  // ─── Header ───
  header: {
    alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    position: 'absolute', left: 16,
    minWidth: 44, minHeight: 44, justifyContent: 'center',
  },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: Colors.ink, letterSpacing: 4,
  },
  headerSub: {
    fontSize: 10, color: Colors.gray400, letterSpacing: 2, marginTop: 2,
  },

  // ─── Loading ──
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60,
  },
  loadingText: {
    fontSize: 14, color: Colors.gray400, letterSpacing: 4, marginTop: 16,
  },

  // ─── Content ───
  content: { paddingHorizontal: 16, paddingBottom: 120 },

  // ─── Today Card ───
  todayCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: '#C8882E',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    flexShrink: 1,
  },
  todayHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  todayLabel: {
    fontSize: 11, color: '#B45309', fontWeight: '600',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  todayDate: {
    fontSize: 12, color: Colors.gray400, fontWeight: '500',
  },
  todayTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.ink,
    marginBottom: 4, lineHeight: 22,
    flexShrink: 1,
  },
  todayDesc: {
    fontSize: 13, color: Colors.gray600, lineHeight: 20,
    flexShrink: 1,
  },
  todayYear: {
    fontWeight: '700', color: '#B45309',
  },

  // ─── Era Filter ───
  eraRow: {
    paddingRight: 16, marginBottom: 20,
  },
  eraChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1, borderColor: Colors.borderDefault,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  eraChipActive: {
    borderWidth: 0,
    backgroundColor: Colors.primary,
  },
  eraChipText: {
    fontSize: 12, color: Colors.gray600, fontWeight: '500',
  },
  eraChipTextActive: {
    color: '#fff', fontWeight: '600',
  },

  // ─── Timeline ───
  timelineTrack: {},

  eraDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  eraSection: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, marginTop: 8,
  },
  eraSectionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, gap: 10, flex: 1,
  },
  eraSectionLabel: {
    fontSize: 16, fontWeight: '800', letterSpacing: 2,
  },
  eraSectionLine: {
    flex: 1, height: 1,
  },

  eventRow: { flexDirection: 'row', marginBottom: 2 },
  rail: { width: 20, alignItems: 'center' },
  railDot: { width: 8, height: 8, borderRadius: 4, marginTop: 18 },
  railLine: { width: 1.5, flex: 1, backgroundColor: Colors.gray200, marginTop: 4 },

  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12, padding: 14,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  eventTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  eraTag: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  eraTagText: { fontSize: 11, fontWeight: '600' },
  eventYear: {
    fontSize: 13, color: Colors.gray400, fontWeight: '600',
  },
  eventTitle: {
    fontSize: 15, fontWeight: '600', color: Colors.ink,
    marginBottom: 4, lineHeight: 22,
    flexShrink: 1,
  },
  eventDesc: {
    fontSize: 13, color: Colors.gray600, lineHeight: 20,
    flexShrink: 1,
  },
  spotRow: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
  },
  spotText: {
    fontSize: 11, color: Colors.primary, fontWeight: '500',
  },

  // ─── End Marker ───
  endRow: { flexDirection: 'row', marginTop: 12 },
  endDot: { width: 10, height: 10, borderRadius: 5, marginTop: 18, backgroundColor: '#1A5FB4' },
  endCard: {
    flex: 1,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(26,95,180,0.06)',
    borderRadius: 8,
  },
  endText: {
    fontSize: 13, fontWeight: '600',
    color: '#1A5FB4', letterSpacing: 1,
    textAlign: 'center',
  },
});
