import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { getRouteById, type TourRouteDetail } from '@/api/routes';
import { getSpotById, type SpotDetail } from '@/api/spots';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ROUTE_TYPE_META } from '@/constants/scenic';

export default function RouteDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);

  const [route, setRoute] = useState<TourRouteDetail | null>(null);
  const [spotDetails, setSpotDetails] = useState<Record<string, SpotDetail>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSpot, setExpandedSpot] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getRouteById(id)
      .then(async (res) => {
        const data = (res as any).data ?? res;
        setRoute(data);

        // Fetch spot details for each spot in the route
        const details: Record<string, SpotDetail> = {};
        const spotIds = data.spot_order || [];
        await Promise.all(
          spotIds.map(async (spotId: string) => {
            try {
              const spotRes = await getSpotById(spotId);
              details[spotId] = (spotRes as any).data ?? spotRes;
            } catch {}
          }),
        );
        setSpotDetails(details);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (route) {
      VRMManager.setPageContext('explore', { routeName: route.name });
      const t = setTimeout(() => {
        vrmRef.current?.speak(`${route.name}，全程约${route.duration}。${route.description}`, 'neutral');
      }, 800);
      return () => clearTimeout(t);
    }
  }, [route]);

  const handleSpotPress = useCallback((spotId: string) => {
    const spot = spotDetails[spotId];
    if (spot) {
      vrmRef.current?.speak(`${spot.name}，${spot.overview}`, 'neutral');
    }
    setExpandedSpot(expandedSpot === spotId ? null : spotId);
  }, [spotDetails, expandedSpot]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载路线...</Text>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>路线未找到</Text>
      </View>
    );
  }

  const meta = ROUTE_TYPE_META[route.route_type] || ROUTE_TYPE_META.nature;
  const spotOrder = route.spot_order || [];

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={[styles.heroBg, { backgroundColor: meta.color + '18' }]}>
            <Text style={[styles.heroIcon, { color: meta.color }]}>{meta.icon}</Text>
          </View>

          <Pressable
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.replace('/routes')}
          >
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>

          <View style={styles.heroContent}>
            <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={styles.heroTitle}>{route.name}</Text>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroDuration}>{route.duration}</Text>
              <Text style={styles.heroDot}>·</Text>
              <Text style={styles.heroSpotCount}>{spotOrder.length} 个景点</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descSection}>
          <Text style={styles.sectionTitle}>路线简介</Text>
          <View style={styles.sectionLine} />
          <Text style={styles.descText}>{route.description}</Text>
        </View>

        {/* Spot Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>游览顺序</Text>
          <View style={styles.sectionLine} />

          {spotOrder.map((spotId, idx) => {
            const spot = spotDetails[spotId];
            const isExpanded = expandedSpot === spotId;
            const spotMeta = route.spot_details?.[spotId];
            const isLast = idx === spotOrder.length - 1;

            return (
              <Animated.View key={spotId} entering={FadeInUp.delay(idx * 60).duration(350)}>
                <View style={styles.timelineItem}>
                  {/* Timeline line */}
                  {!isLast && <View style={styles.timelineLine} />}

                  {/* Number badge */}
                  <View style={[styles.timelineBadge, { backgroundColor: meta.color }]}>
                    <Text style={styles.timelineNum}>{idx + 1}</Text>
                  </View>

                  {/* Content */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.timelineContent,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => handleSpotPress(spotId)}
                  >
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineSpotName}>{spot?.name || spotId}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => spot && router.push(`/attractions/${spotId}`)}
                        style={({ pressed }) => [
                          styles.arrowBtn,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={styles.timelineArrow}>→</Text>
                      </Pressable>
                    </View>
                    {spot && (
                      <Text style={styles.timelineOverview} numberOfLines={isExpanded ? undefined : 2}>
                        {spot.overview}
                      </Text>
                    )}

                    {/* Expanded details */}
                    {isExpanded && spotMeta && (
                      <View style={styles.spotDetailBlock}>
                        {spotMeta['讲解重点'] && spotMeta['讲解重点'].length > 0 && (
                          <View style={styles.detailGroup}>
                            <Text style={styles.detailGroupTitle}>讲解重点</Text>
                            {spotMeta['讲解重点'].map((item, i) => (
                              <View key={i} style={styles.detailItem}>
                                <View style={[styles.detailDot, { backgroundColor: meta.color }]} />
                                <Text style={styles.detailText}>{item}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {spotMeta['特色体验'] && spotMeta['特色体验'].length > 0 && (
                          <View style={styles.detailGroup}>
                            <Text style={styles.detailGroupTitle}>特色体验</Text>
                            {spotMeta['特色体验'].map((item, i) => (
                              <View key={i} style={styles.detailItem}>
                                <View style={[styles.detailDot, { backgroundColor: Colors.accent }]} />
                                <Text style={styles.detailText}>{item}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.paper },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 3, marginTop: 16 },

  // Hero
  hero: { height: 200, position: 'relative', overflow: 'hidden' },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  heroIcon: { fontSize: 64, fontWeight: '900', opacity: 0.15 },
  backBtn: {
    position: 'absolute', left: 14,
    minWidth: 44, minHeight: 44, justifyContent: 'center', zIndex: 10,
  },
  backText: { fontSize: 14, color: Colors.ink, fontWeight: '500' },
  heroContent: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, marginBottom: 8,
  },
  typeText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: Colors.ink,
    letterSpacing: 2, marginBottom: 6,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroDuration: { fontSize: 13, color: Colors.gray500, fontWeight: '500' },
  heroDot: { fontSize: 13, color: Colors.gray400 },
  heroSpotCount: { fontSize: 13, color: Colors.gray500 },

  // Description
  descSection: { padding: 16 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.ink,
    letterSpacing: 2, marginBottom: 5,
  },
  sectionLine: {
    width: 20, height: 2, backgroundColor: Colors.accent,
    borderRadius: 1, marginBottom: 10, opacity: 0.6,
  },
  descText: { fontSize: 13, lineHeight: 22, color: Colors.gray600 },

  // Timeline
  timelineSection: { paddingHorizontal: 16, paddingBottom: 16 },
  timelineItem: {
    flexDirection: 'row', gap: 12,
    paddingLeft: 4, marginBottom: 0,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 19, top: 32, bottom: -8,
    width: 2, backgroundColor: Colors.borderLight,
  },
  timelineBadge: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  timelineNum: { fontSize: 13, fontWeight: '700', color: '#fff' },
  timelineContent: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: Radius.md, padding: 12,
    marginBottom: 10,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  timelineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  timelineSpotName: { fontSize: 14, fontWeight: '600', color: Colors.ink, flex: 1 },
  arrowBtn: { padding: 4 },
  timelineArrow: { fontSize: 14, color: Colors.gray400 },
  timelineOverview: { fontSize: 12, color: Colors.gray500, lineHeight: 18 },

  // Expanded detail
  spotDetailBlock: { marginTop: 10, gap: 8 },
  detailGroup: { gap: 4 },
  detailGroupTitle: {
    fontSize: 11, fontWeight: '600', color: Colors.gray400,
    letterSpacing: 1, marginBottom: 2,
  },
  detailItem: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  detailDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  detailText: { flex: 1, fontSize: 12, color: Colors.gray600, lineHeight: 18 },
});
