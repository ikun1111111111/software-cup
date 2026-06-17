import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { getSpotById, recordVisit, type SpotDetail } from '@/api/spots';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES } from '@/constants/scenic';
import { TRAVEL_TIPS } from '@/data/travelTips';

const SESSION_ID = 'mobile-' + Date.now().toString(36);

export default function AttractionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);

  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [newStamp, setNewStamp] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getSpotById(id)
      .then((res) => setSpot((res as any).data ?? res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (spot) {
      VRMManager.setPageContext('attraction-detail', { spotName: spot.name });
      const timer = setTimeout(() => {
        vrmRef.current?.speak(`${spot.name}，${spot.overview}。有什么想了解的吗？`, 'neutral');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [spot]);

  const vrmSpeak = useCallback((text: string) => {
    vrmRef.current?.speak(text, 'neutral');
  }, []);

  const handleCheckIn = useCallback(async () => {
    if (!spot || checkedIn || checkInLoading) return;
    setCheckInLoading(true);
    try {
      const result = await recordVisit(SESSION_ID, spot.name);
      setCheckedIn(true);
      if (result.new_stamps && result.new_stamps.length > 0) {
        const stamp = result.new_stamps[0];
        setNewStamp(stamp.name);
        vrmRef.current?.speak(`恭喜获得${stamp.name}！已打卡${spot.name}`, 'neutral');
      } else {
        vrmRef.current?.speak(`已打卡${spot.name}`, 'neutral');
      }
    } catch {
      vrmRef.current?.speak('打卡失败，请稍后再试', 'sad');
    } finally {
      setCheckInLoading(false);
    }
  }, [spot, checkedIn, checkInLoading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>景点未找到</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroInner, { paddingTop: insets.top }]}>
            {SPOT_IMAGES[spot.id] && (
              <Image source={SPOT_IMAGES[spot.id]} style={[styles.heroImage, { opacity: 0.7 }]} resizeMode="cover" />
            )}

            <Pressable
              style={styles.backBtn}
              onPress={() => router.replace('/attractions')}
            >
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>

            <View style={styles.heroContent}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{spot.category}</Text>
              </View>
              <Text style={styles.heroTitle}>{spot.name}</Text>
              <Text style={styles.heroOverview}>{spot.overview}</Text>
            </View>
          </View>
        </View>

        {/* Detail */}
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>详细介绍</Text>
          <View style={styles.detailLine} />
          <Text style={styles.detailText}>{spot.detail}</Text>
        </View>

        {/* Travel Tips */}
        {TRAVEL_TIPS[spot.id] && (
          <View style={styles.tipsSection}>
            <Text style={styles.detailTitle}>游览贴士</Text>
            <View style={styles.detailLine} />
            <View style={styles.tipsCard}>
              {TRAVEL_TIPS[spot.id].bestTime && (
                <View style={styles.tipRow}>
                  <Text style={styles.tipIcon}>⏰</Text>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipLabel}>最佳时间</Text>
                    <Text style={styles.tipValue}>{TRAVEL_TIPS[spot.id].bestTime}</Text>
                  </View>
                </View>
              )}
              {TRAVEL_TIPS[spot.id].duration && (
                <View style={styles.tipRow}>
                  <Text style={styles.tipIcon}>⏱</Text>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipLabel}>建议游览</Text>
                    <Text style={styles.tipValue}>{TRAVEL_TIPS[spot.id].duration}</Text>
                  </View>
                </View>
              )}
              {TRAVEL_TIPS[spot.id].tips && TRAVEL_TIPS[spot.id].tips!.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tags */}
        {spot.tags && spot.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.detailTitle}>标签</Text>
            <View style={styles.detailLine} />
            <View style={styles.tags}>
              {spot.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Questions */}
        <View style={styles.quickSection}>
          <Text style={styles.detailTitle}>向小灵提问</Text>
          <View style={styles.detailLine} />
          <View style={styles.quickGrid}>
            {[
              `讲一个${spot.name}的故事`,
              '这里有什么传说？',
              '最佳游览时间是什么时候？',
            ].map((q) => (
              <Pressable
                key={q}
                style={({ pressed }) => [
                  styles.quickBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => vrmSpeak(q)}
              >
                <Text style={styles.quickBtnText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Check-in Button */}
        <View style={styles.checkInSection}>
          {newStamp && (
            <View style={styles.stampToast}>
              <Text style={styles.stampToastText}>🎉 获得「{newStamp}」</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.checkInBtn,
              checkedIn && styles.checkInBtnDone,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleCheckIn}
            disabled={checkedIn || checkInLoading}
          >
            {checkInLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.checkInBtnText, checkedIn && styles.checkInBtnTextDone]}>
                {checkedIn ? '✓ 已打卡' : '📍 打卡此地'}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.paper,
  },
  loadingText: {
    fontSize: 15, color: Colors.gray400,
    letterSpacing: 4, marginTop: 16,
  },

  hero: {
    position: 'relative', overflow: 'hidden',
  },
  heroInner: {
    height: 220, position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.gray200,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
  },
  heroEmoji: { fontSize: 48, opacity: 0.3 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,20,0.4)',
  },
  backBtn: {
    position: 'absolute', left: 14, top: 8,
    minWidth: 44, minHeight: 44,
    justifyContent: 'center', zIndex: 10,
  },
  backText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  heroContent: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: 'rgba(200,75,49,0.85)',
    borderRadius: 3, marginBottom: 6,
  },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  heroTitle: {
    fontSize: 20, fontWeight: '900', color: '#fff',
    letterSpacing: 2, marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroOverview: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },

  detailSection: { padding: 14 },
  detailTitle: {
    fontSize: 16, fontWeight: '700',
    color: Colors.ink, letterSpacing: 2, marginBottom: 5,
  },
  detailLine: {
    width: 20, height: 2,
    backgroundColor: Colors.accent, borderRadius: 1, marginBottom: 10, opacity: 0.6,
  },
  detailText: {
    fontSize: 13, lineHeight: 22,
    color: Colors.gray600,
  },

  tagsSection: { paddingHorizontal: 14, marginBottom: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.primaryBg, borderRadius: 16,
  },
  tagText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },

  tipsSection: { paddingHorizontal: 14, marginBottom: 14 },
  tipsCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    gap: 10,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipIcon: { fontSize: 14, marginTop: 1 },
  tipContent: { flex: 1 },
  tipLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  tipValue: { fontSize: 13, color: Colors.ink, fontWeight: '500' },
  tipText: { fontSize: 13, color: Colors.gray600, flex: 1, lineHeight: 20 },

  quickSection: { paddingHorizontal: 14, marginBottom: 14 },
  quickGrid: { gap: 6 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
    minHeight: 40, justifyContent: 'center',
  },
  quickBtnText: { fontSize: 13, color: Colors.ink },

  // Check-in
  checkInSection: { paddingHorizontal: 14, marginBottom: 8, gap: 10 },
  stampToast: {
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: Colors.warningBg, borderRadius: Radius.md,
    alignItems: 'center',
  },
  stampToastText: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  checkInBtn: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  checkInBtnDone: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  checkInBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 2 },
  checkInBtnTextDone: { letterSpacing: 1 },
});
