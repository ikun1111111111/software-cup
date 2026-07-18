import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import InlineModal from '@/components/ui/InlineModal';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VRMManager } from '@/components/vrm/VRMManager';
import { useVRM } from '@/components/vrm/VRMProvider';
import type { TourRouteDetail } from '@/api/routes';
import type { SpotDetail } from '@/api/spots';
import { getRouteDetailWithFallback, getSpotWithFallback } from '@/services/dataSync';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ROUTE_TYPE_META } from '@/constants/scenic';
import { useTour } from '@/context/TourContext';
import type { Route as TourRouteType } from '@/hooks/useTourOrchestrator';
import TourProgressIndicator from '@/components/guide/TourProgressIndicator';
import { XIAOLING_ROUTE_COPY } from '@/utils/digitalHumanProduct';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { PageDigitalHumanDock } from '@/components/vrm/PageDigitalHumanDock';

export default function RouteDetailPage() {
  const params = useLocalSearchParams<{ id: string; returnTo?: string; returnLabel?: string }>();
  const { id } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { avoidance } = useVRM();
  const routeDetailDigitalHuman = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE, {
    speakerId: 'route-detail-page',
  });
  const bottomSpacerHeight = Math.max(220, avoidance.bottom + 48);

  const [route, setRoute] = useState<TourRouteDetail | null>(null);
  const [spotDetails, setSpotDetails] = useState<Record<string, SpotDetail>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSpot, setExpandedSpot] = useState<string | null>(null);

  const [tourState, tourActions] = useTour();
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const returnLabel = typeof params.returnLabel === 'string' ? params.returnLabel : '返回';
  const showContextBack = Boolean(returnTo);
  const attractionReturnTo = returnTo ?? (id ? `/routes/${id}` : '/routes');
  const attractionReturnLabel = returnTo ? returnLabel : '返回路线';

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace((returnTo || '/routes') as any);
  }, [returnTo, router]);

  const openAttractionDetail = useCallback((spotId: string) => {
    router.push({
      pathname: '/attractions/[id]',
      params: {
        id: spotId,
        returnTo: attractionReturnTo,
        returnLabel: attractionReturnLabel,
      },
    });
  }, [attractionReturnLabel, attractionReturnTo, router]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setSpotDetails({});

    getRouteDetailWithFallback(id)
      .then((data) => {
        if (!mounted) return;
        if (!data) {
          setRoute(null);
          setLoading(false);
          return;
        }

        setRoute(data);
        const spotIds = data.spot_order || [];
        const inlineDetails: Record<string, SpotDetail> = {};

        spotIds.forEach((spotId: string) => {
          const namedSpot = data.spot_names?.find((spot) => spot.id === spotId);
          const routeMeta = data.spot_details?.[spotId] as Record<string, any> | undefined;
          if (namedSpot || routeMeta) {
            inlineDetails[spotId] = {
              id: spotId,
              name: namedSpot?.name || routeMeta?.name || spotId,
              overview: routeMeta?.overview || routeMeta?.description || '',
              detail: routeMeta?.detail || routeMeta?.description || '',
              category: routeMeta?.category || '',
              tags: [],
              latitude: null,
              longitude: null,
              qr_code: null,
            } as unknown as SpotDetail;
          }
        });
        setSpotDetails(inlineDetails);
        setLoading(false);

        Promise.all(
          spotIds.map(async (spotId: string) => {
            const spot = await getSpotWithFallback(spotId).catch(() => null);
            return [spotId, spot] as const;
          }),
        ).then((entries) => {
          if (!mounted) return;
          const details: Record<string, SpotDetail> = {};
          entries.forEach(([spotId, spot]) => {
            if (spot) details[spotId] = spot;
          });
          if (Object.keys(details).length > 0) {
            setSpotDetails((prev) => ({ ...prev, ...details }));
          }
        });
      })
      .catch(() => {
        if (!mounted) return;
        setRoute(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  // 进入路线详情，数字人介绍路线亮点
  useEffect(() => {
    if (!isFocused) return undefined;
    if (route) {
      VRMManager.setPageContext('route-detail', { routeName: route.name });

      if (tourState.preferences.mode === 'tour' && tourState.currentRoute?.id === route.id) {
        // 导览模式：介绍路线亮点和进度
        const t = setTimeout(() => {
          VRMManager.replaceSpeech(
            `${route.name}，全程约${route.duration}，包含${(route.spot_order || []).length}个景点。${route.description}`,
            'happy'
          );
        }, 800);
        return () => clearTimeout(t);
      } else {
        // 自由模式：简单介绍
        const t = setTimeout(() => {
          VRMManager.replaceSpeech(
            `${route.name}，${route.description}。你可以点沿途景点，让小灵先讲重点。`,
            'neutral'
          );
        }, 800);
        return () => clearTimeout(t);
      }
    }
  }, [isFocused, route, tourState.preferences.mode, tourState.currentRoute]);

  const handleSpotPress = useCallback((spotId: string) => {
    const spot = spotDetails[spotId];
    if (spot) {
      VRMManager.speak(`${spot.name}，${spot.overview}`, 'neutral');
    }
    setExpandedSpot(expandedSpot === spotId ? null : spotId);
  }, [spotDetails, expandedSpot]);

  // 开始导览
  const handleStartTour = useCallback(() => {
    if (!route) return;
    const tourRoute: TourRouteType = {
      id: route.id,
      name: route.name,
      description: route.description,
      spots: (route.spot_order || []).map((sid) => ({
        id: sid,
        name: spotDetails[sid]?.name || sid,
      })),
      duration: route.duration,
      route_type: route.route_type,
    };
    tourActions.startTour(tourRoute);
    VRMManager.speak(`好的，小灵带你开始${route.name}，现在前往第一个景点。`, 'happy');

    // 导航到第一个景点
    const firstSpot = route.spot_order?.[0];
    if (firstSpot) {
      setTimeout(() => {
        openAttractionDetail(firstSpot);
      }, 250);
    }
  }, [openAttractionDetail, route, spotDetails, tourActions.startTour]);

  // 继续导览（恢复已暂停的导览）
  const handleResumeTour = useCallback(() => {
    tourActions.resumeTour();
    VRMManager.speak('好的，小灵继续带路。', 'neutral');
  }, [tourActions.resumeTour]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>小灵正在加载路线...</Text>
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
  const isCurrentTour = tourState.currentRoute?.id === route.id;

  return (
    <View style={styles.root}>
      {/* 导览进度指示器 */}
      {isCurrentTour && tourState.progress.total > 0 && (
        <View style={styles.progressOverlay}>
          <TourProgressIndicator
            progress={tourState.progress}
            currentRoute={tourState.currentRoute}
            status={tourState.status}
            onResume={handleResumeTour}
            onEnd={tourActions.endTour}
          />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={[styles.heroBg, { backgroundColor: meta.color + '18' }]}>
            <Text style={[styles.heroIcon, { color: meta.color }]}>{meta.icon}</Text>
          </View>

          <Pressable
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={returnLabel}
          >
            <Text style={styles.backText}>← {showContextBack ? returnLabel : '返回'}</Text>
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

        {/* 导览模式下的操作按钮 */}
        {tourState.preferences.mode === 'tour' && (
          <View style={styles.tourActions}>
            {!isCurrentTour ? (
              <Pressable
                style={({ pressed }) => [
                  styles.tourActionBtn,
                  styles.startTourBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handleStartTour}
              >
                <Text style={styles.startTourBtnText}>{XIAOLING_ROUTE_COPY.primaryCta}</Text>
              </Pressable>
            ) : tourState.status === 'completed' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.tourActionBtn,
                  styles.resumeTourBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => router.push({
                  pathname: '/memory',
                  params: {
                    returnTo: returnTo ?? `/routes/${id}`,
                    returnLabel: returnTo ? returnLabel : '返回路线',
                  },
                })}
              >
                <Text style={styles.resumeTourBtnText}>查看小灵回忆</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.tourActionBtn,
                  styles.resumeTourBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handleResumeTour}
              >
                <Text style={styles.resumeTourBtnText}>继续跟小灵走</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Description */}
        <View style={styles.descSection}>
          <Text style={styles.sectionTitle}>小灵路线说明</Text>
          <View style={styles.sectionLine} />
          <Text style={styles.descText}>{route.description}</Text>
        </View>

        {/* Spot Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>小灵带路顺序</Text>
          <View style={styles.sectionLine} />

          {spotOrder.map((spotId, idx) => {
            const spot = spotDetails[spotId];
            const isExpanded = expandedSpot === spotId;
            const spotMeta = route.spot_details?.[spotId];
            const isLast = idx === spotOrder.length - 1;

            // 检查是否已完成
            const isCompleted = isCurrentTour && idx < tourState.progress.completed;
            const isCurrent = isCurrentTour && idx === tourState.progress.current - 1;

            return (
              <Animated.View key={spotId} entering={FadeInUp.delay(idx * 60).duration(350)}>
                <View style={styles.timelineItem}>
                  {/* Timeline line */}
                  {!isLast && (
                    <View style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineCompleted,
                    ]} />
                  )}

                  {/* Number badge */}
                  <View style={[
                    styles.timelineBadge,
                    { backgroundColor: isCompleted ? Colors.primary : isCurrent ? Colors.accent : meta.color },
                  ]}>
                    <Text style={styles.timelineNum}>
                      {isCompleted ? '✓' : idx + 1}
                    </Text>
                  </View>

                  {/* Content */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.timelineContent,
                      isCompleted && styles.timelineContentCompleted,
                      isCurrent && styles.timelineContentCurrent,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => handleSpotPress(spotId)}
                  >
                    <View style={styles.timelineHeader}>
                      <Text style={[
                        styles.timelineSpotName,
                        isCompleted && styles.timelineSpotNameCompleted,
                        isCurrent && styles.timelineSpotNameCurrent,
                      ]}>
                        {spot?.name || spotId}
                      </Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => spot && openAttractionDetail(spotId)}
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
                    {spotMeta?.['建议停留时间' as keyof typeof spotMeta] && (
                      <Text style={styles.suggestedTime}>⏱ {spotMeta['建议停留时间' as keyof typeof spotMeta]}</Text>
                    )}

                    {/* Expanded details */}
                    {isExpanded && spotMeta && (
                      <View style={styles.spotDetailBlock}>
                        {spotMeta['讲解重点'] && spotMeta['讲解重点'].length > 0 && (
                          <View style={styles.detailGroup}>
                            <Text style={styles.detailGroupTitle}>小灵讲解重点</Text>
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
                            <Text style={styles.detailGroupTitle}>小灵推荐体验</Text>
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

        <View style={{ height: bottomSpacerHeight }} />
    </ScrollView>

    <PageDigitalHumanDock digitalHuman={routeDetailDigitalHuman} />
  </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  // 导览进度覆盖层
  progressOverlay: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    zIndex: 50,
  },

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

  // 导览模式操作按钮
  tourActions: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(106,156,137,0.05)',
  },
  tourActionBtn: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  startTourBtn: {
    backgroundColor: Colors.primary,
  },
  startTourBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
  resumeTourBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  resumeTourBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

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
  timelineLineCompleted: {
    backgroundColor: Colors.primary,
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
  timelineContentCompleted: {
    backgroundColor: 'rgba(106,156,137,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.15)',
  },
  timelineContentCurrent: {
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  timelineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  timelineSpotName: { fontSize: 14, fontWeight: '600', color: Colors.ink, flex: 1 },
  timelineSpotNameCompleted: { color: Colors.primary, fontWeight: '500' },
  timelineSpotNameCurrent: { color: Colors.accent, fontWeight: '700' },
  arrowBtn: { padding: 4 },
  timelineArrow: { fontSize: 14, color: Colors.gray400 },
  timelineOverview: { fontSize: 12, color: Colors.gray500, lineHeight: 18 },
  suggestedTime: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 4,
  },

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
