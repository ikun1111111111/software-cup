import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRouteDetailWithFallback, getRoutesWithFallback } from '@/services/dataSync';
import type { TourRoute } from '@/api/routes';
import { Colors } from '@/constants/colors';
import { ROUTE_TYPE_META } from '@/constants/scenic';
import { enrichSpotsWithLocations } from '@/constants/spot-locations';
import { useTour } from '@/context/TourContext';
import type { Route as TourRouteType } from '@/hooks/useTourOrchestrator';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { VRMStageSlot } from '@/components/vrm/VRMStageSlot';

const FILTERS = [
  { key: '', label: '全部', helper: '智能推荐' },
  { key: 'history', label: '历史文化', helper: '深度讲解' },
  { key: 'nature', label: '自然风光', helper: '慢游观景' },
  { key: 'family', label: '亲子家庭', helper: '轻松互动' },
];

const ROUTE_IMAGE: Record<string, any> = {
  history: require('../../assets/images/dazhaobi.jpg'),
  nature: require('../../assets/images/putidadao.jpg'),
  family: require('../../assets/images/baizi.png'),
};

const TYPE_TONE: Record<string, { dark: string; soft: string; line: string }> = {
  history: { dark: '#2A2520', soft: '#F0E8DD', line: '#A56A43' },
  nature: { dark: Colors.primaryDark, soft: '#E1EFEA', line: '#5A9A86' },
  family: { dark: Colors.accent, soft: '#F8E6DF', line: '#C84B31' },
};

export default function RoutesListPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; returnLabel?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tourState, tourActions] = useTour();
  const { startTour, suggestRoute } = tourActions;
  const digitalHuman = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE);
  const {
    action,
    actionDurationMs,
    expression,
    headRotation,
    isSpeaking,
    mouthOpen,
    setPageContext,
    speak,
  } = digitalHuman;

  const [allRoutes, setAllRoutes] = useState<TourRoute[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const returnLabel = typeof params.returnLabel === 'string' ? params.returnLabel : '返回';
  const showContextBack = Boolean(returnTo);

  const compact = width < 390;
  const activeMeta = FILTERS.find((item) => item.key === activeFilter) ?? FILTERS[0];
  const heroRoute = routes[0] ?? allRoutes[0];
  const heroTone = TYPE_TONE[heroRoute?.route_type || 'history'] || TYPE_TONE.history;
  const totalStops = useMemo(() => {
    const route = heroRoute as any;
    return route?.spot_order?.length || route?.spot_names?.length || route?.spots?.length || 0;
  }, [heroRoute]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getRoutesWithFallback()
      .then((data) => {
        if (!mounted) return;
        const nextRoutes = activeFilter
          ? data.filter((route) => route.route_type === activeFilter)
          : data;
        setAllRoutes(data);
        setRoutes(nextRoutes);
      })
      .catch(() => {
        if (!mounted) return;
        setAllRoutes([]);
        setRoutes([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeFilter]);

  useEffect(() => {
    setPageContext('routes');
    const timer = setTimeout(() => {
      if (tourState.preferences.mode === 'tour') {
        speak(
          '我先按你的游览节奏挑路线。看上哪条，点一下我就带你进入导览。',
          { emotion: 'happy' },
        );
        suggestRoute();
        return;
      }

      speak(
        '这里是小灵路线台。我会先给你一条主推荐，再把不同风格的路线排好。',
        { emotion: 'neutral' },
      );
    }, 650);

    return () => clearTimeout(timer);
  }, [setPageContext, speak, suggestRoute, tourState.preferences.mode]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace((returnTo || '/explore') as any);
  }, [returnTo, router]);

  const openRouteDetail = useCallback((routeId: string) => {
    if (returnTo) {
      router.push({
        pathname: '/routes/[id]',
        params: { id: routeId, returnTo, returnLabel },
      });
      return;
    }
    router.push(`/routes/${routeId}`);
  }, [returnLabel, returnTo, router]);

  const handleRoutePress = useCallback(async (route: TourRoute) => {
    const routeAny = route as any;
    const routeSpotNames = Array.isArray(routeAny.spot_names) ? routeAny.spot_names : [];
    const routeSpotOrder = Array.isArray(routeAny.spot_order) ? routeAny.spot_order : [];
    const detail = routeSpotNames.length || routeSpotOrder.length
      ? null
      : await getRouteDetailWithFallback(route.id);
    const orderedSpots: Array<{ id: string; name: string }> = detail?.spot_names?.length
      ? detail.spot_names
      : routeSpotNames.length
        ? routeSpotNames
        : (detail?.spot_order || routeSpotOrder || []).map((sid: string) => ({
          id: sid,
          name: ((detail as any)?.spot_details?.[sid]?.name)
            || routeAny.spot_details?.[sid]?.name
            || sid,
        }));

    const tourRoute: TourRouteType = {
      id: route.id,
      name: route.name,
      description: route.description,
      spots: enrichSpotsWithLocations(orderedSpots.map((spot) => ({
        id: spot.id,
        name: spot.name,
      }))),
      duration: route.duration,
      route_type: route.route_type,
    };

    if (tourState.preferences.mode === 'tour') {
      speak(`${route.name}，全程约${route.duration}。我会按站点节奏带你走。`, {
        emotion: 'happy',
      });
      startTour(tourRoute);
      openRouteDetail(route.id);
      if (!detail) {
        getRouteDetailWithFallback(route.id).catch(() => {});
      }
      return;
    }

    speak(`${route.name}，${route.description}`, { emotion: 'neutral' });
    openRouteDetail(route.id);
  }, [openRouteDetail, speak, startTour, tourState.preferences.mode]);

  const handleFilterChange = useCallback((key: string) => {
    setActiveFilter(key);
    const next = FILTERS.find((item) => item.key === key) ?? FILTERS[0];
    speak(`我把路线切到${next.label}，先看最适合你的那条。`, { emotion: 'thinking' });
  }, [speak]);

  const handleAskXiaoling = useCallback(() => {
    const name = heroRoute?.name || '精选路线';
    speak(
      `我建议先看${name}。它的节奏更稳，适合作为今天的主路线。`,
      { emotion: 'happy' },
    );
  }, [heroRoute, speak]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 18) + 10 }]}
      >
        <Animated.View entering={FadeInDown.duration(420)} style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={returnLabel}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>{showContextBack ? returnLabel : '返回'}</Text>
          </Pressable>
          <View style={styles.topTitleGroup}>
            <Text style={styles.kicker}>AI ROUTE GUIDE</Text>
            <Text style={styles.pageTitle}>小灵路线台</Text>
          </View>
          <View style={styles.modePill}>
            <Text style={styles.modePillText}>数字人</Text>
          </View>
        </Animated.View>

        {tourState.currentRoute && tourState.progress.total > 0 && (
          <Animated.View entering={FadeInUp.duration(420)} style={styles.progressCard}>
            <View style={styles.progressMark}>
              <Text style={styles.progressMarkText}>行</Text>
            </View>
            <View style={styles.progressCopy}>
              <Text style={styles.progressLabel}>正在导览</Text>
              <Text style={styles.progressRoute} numberOfLines={1}>{tourState.currentRoute.name}</Text>
            </View>
            <Text style={styles.progressCount}>
              {tourState.progress.completed}/{tourState.progress.total}
            </Text>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInUp.delay(80).duration(500)}
          style={[styles.hero, compact && styles.heroCompact]}
        >
          <View style={styles.heroBackdrop} />
          <View style={[styles.heroGlow, { backgroundColor: heroTone.soft }]} />
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>小灵正在为你排路线</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {heroRoute?.name || '选择一条路线，让数字人带你出发'}
            </Text>
            <Text style={styles.heroDesc} numberOfLines={3}>
              {heroRoute?.description || '小灵会根据历史、自然、亲子等偏好，把路线拆成更容易跟随的导览节奏。'}
            </Text>

            <View style={styles.heroMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{heroRoute?.duration || '--'}</Text>
                <Text style={styles.metricLabel}>预计时长</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{totalStops || routes.length || '--'}</Text>
                <Text style={styles.metricLabel}>{totalStops ? '沿途站点' : '可选路线'}</Text>
              </View>
            </View>

            <View style={styles.heroActions}>
              <Pressable
                style={styles.primaryAction}
                onPress={() => (heroRoute ? handleRoutePress(heroRoute) : handleAskXiaoling())}
                accessibilityRole="button"
              >
                <Text style={styles.primaryActionText}>{tourState.preferences.mode === 'tour' ? '开始导览' : '查看推荐'}</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryAction}
                onPress={handleAskXiaoling}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryActionText}>问小灵</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.avatarStage}>
            <View style={styles.avatarRing} />
            <View style={styles.avatarHalo} />
            <View style={styles.avatarGround} />
            <View style={styles.avatarCanvas}>
              <VRMStageSlot
                id="routes-hero-avatar"
                mode="float"
                expression={expression}
                mouthOpen={mouthOpen}
                speaking={isSpeaking}
                action={action}
                actionDuration={actionDurationMs}
                headRotation={headRotation}
                costumeId="festival-spring"
                borderRadius={0}
                framing={{
                  cameraDistance: 5.45,
                  cameraY: 0.82,
                  targetHeight: 2.25,
                  offsetY: -0.72,
                }}
                trackMotion
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.namePlate}>
              <Text style={styles.namePlateText}>小灵</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(150).duration(420)} style={styles.filterPanel}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionKicker}>ROUTE MOOD</Text>
              <Text style={styles.sectionTitle}>按小灵的讲解风格筛选</Text>
            </View>
            <Text style={styles.activeFilterLabel}>{activeMeta.label}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((filter) => {
              const active = filter.key === activeFilter;
              const tone = TYPE_TONE[filter.key || 'history'] || TYPE_TONE.history;
              return (
                <Pressable
                  key={filter.key}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active && [styles.filterChipActive, { borderColor: tone.line }],
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleFilterChange(filter.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.filterLabel, active && { color: tone.dark }]}>
                    {filter.label}
                  </Text>
                  <Text style={[styles.filterHelper, active && { color: tone.line }]}>
                    {filter.helper}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>小灵正在整理路线...</Text>
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>这一类暂时没有路线</Text>
            <Text style={styles.emptyText}>换个风格试试，或者让小灵先给你推荐全部路线。</Text>
          </View>
        ) : (
          <View style={styles.routeList}>
            {routes.map((route, index) => {
              const meta = ROUTE_TYPE_META[route.route_type] || ROUTE_TYPE_META.nature;
              const tone = TYPE_TONE[route.route_type] || TYPE_TONE.nature;
              const isCurrentTour = tourState.currentRoute?.id === route.id;
              const image = ROUTE_IMAGE[route.route_type] || ROUTE_IMAGE.nature;

              return (
                <Animated.View
                  key={route.id}
                  entering={FadeInUp.delay(index * 80 + 180).duration(420)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.routeCard,
                      isCurrentTour && styles.routeCardActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleRoutePress(route)}
                    accessibilityRole="button"
                    accessibilityLabel={`${route.name}，${route.duration}`}
                  >
                    <ImageBackground
                      source={image}
                      resizeMode="cover"
                      imageStyle={styles.routeImage}
                      style={styles.routeMedia}
                    >
                      <View style={styles.routeShade} />
                      <View style={[styles.routeBadge, { backgroundColor: tone.soft }]}>
                        <Text style={[styles.routeBadgeIcon, { color: tone.dark }]}>{meta.icon}</Text>
                        <Text style={[styles.routeBadgeText, { color: tone.dark }]}>{meta.label}</Text>
                      </View>
                    </ImageBackground>

                    <View style={styles.routeBody}>
                      <View style={styles.routeHeader}>
                        <Text style={styles.routeName} numberOfLines={2}>{route.name}</Text>
                        {isCurrentTour && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>导览中</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.routeDesc} numberOfLines={2}>{route.description}</Text>
                      <View style={styles.routeFooter}>
                        <Text style={styles.routeDuration}>{route.duration}</Text>
                        <Text style={[styles.routeCta, { color: tone.line }]}>
                          {isCurrentTour ? '继续路线' : '听小灵讲'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3EFE7',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 34,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 70,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 30,
    color: Colors.primaryDark,
    marginRight: 2,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  topTitleGroup: {
    alignItems: 'center',
  },
  kicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  pageTitle: {
    marginTop: 2,
    fontSize: 20,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
  },
  modePill: {
    minWidth: 64,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#2A2520',
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.paperWarm,
  },
  progressCard: {
    marginTop: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: Colors.paperWarm,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
  },
  progressMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: Colors.primary,
  },
  progressMarkText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  progressCopy: {
    flex: 1,
    marginLeft: 10,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.accent,
  },
  progressRoute: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.ink,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gray500,
  },
  hero: {
    minHeight: 306,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: Colors.paperWarm,
    borderWidth: 1,
    borderColor: 'rgba(92,72,48,0.12)',
  },
  heroCompact: {
    minHeight: 318,
  },
  heroBackdrop: {
    position: 'absolute',
    top: -72,
    left: -86,
    width: 244,
    height: 244,
    borderRadius: 122,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
  },
  heroGlow: {
    position: 'absolute',
    right: -38,
    bottom: 16,
    width: 176,
    height: 176,
    borderRadius: 88,
    opacity: 0.72,
  },
  heroText: {
    width: '60%',
    paddingTop: 24,
    paddingLeft: 20,
    paddingRight: 4,
    paddingBottom: 18,
    zIndex: 3,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.accent,
  },
  heroTitle: {
    marginTop: 9,
    fontSize: 23,
    lineHeight: 29,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
  },
  heroDesc: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray600,
  },
  heroMetrics: {
    width: '94%',
    maxWidth: 204,
    minHeight: 58,
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  metricItem: {
    flex: 1,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.ink,
  },
  metricLabel: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.gray500,
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 8,
    backgroundColor: 'rgba(42,37,32,0.1)',
  },
  heroActions: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryAction: {
    height: 40,
    minWidth: 94,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  secondaryAction: {
    height: 40,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.16)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.ink,
  },
  avatarStage: {
    position: 'absolute',
    right: 10,
    bottom: 14,
    width: 152,
    height: 246,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  avatarRing: {
    position: 'absolute',
    bottom: 28,
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.24)',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  avatarHalo: {
    position: 'absolute',
    bottom: 36,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(106,156,137,0.16)',
  },
  avatarGround: {
    position: 'absolute',
    bottom: 5,
    width: 112,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    backgroundColor: 'rgba(42,37,32,0.08)',
    transform: [{ scaleX: 1.16 }],
  },
  avatarCanvas: {
    width: 140,
    height: 232,
    overflow: 'hidden',
    zIndex: 2,
  },
  namePlate: {
    position: 'absolute',
    right: 6,
    bottom: 7,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(42,37,32,0.86)',
    zIndex: 3,
  },
  namePlateText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  filterPanel: {
    marginTop: 16,
  },
  sectionTitleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionKicker: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: Colors.primaryDark,
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '900',
    color: Colors.ink,
  },
  activeFilterLabel: {
    marginTop: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2520',
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
  filterRow: {
    paddingTop: 10,
    paddingBottom: 2,
    gap: 10,
  },
  filterChip: {
    width: 96,
    minHeight: 62,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    backgroundColor: Colors.paperWarm,
  },
  filterChipActive: {
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.gray700,
  },
  filterHelper: {
    marginTop: 5,
    fontSize: 10,
    color: Colors.gray400,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: Colors.gray500,
  },
  empty: {
    minHeight: 180,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.paperWarm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.ink,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray500,
  },
  routeList: {
    marginTop: 14,
    gap: 14,
  },
  routeCard: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    backgroundColor: '#fff',
  },
  routeCardActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  routeMedia: {
    width: '100%',
    height: 118,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  routeImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  routeShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,20,0.18)',
  },
  routeBadge: {
    margin: 12,
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  routeBadgeIcon: {
    fontSize: 14,
    fontWeight: '900',
    marginRight: 6,
  },
  routeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  routeBody: {
    padding: 14,
  },
  routeHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  routeName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: Colors.ink,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  routeDesc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray600,
  },
  routeFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42,37,32,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeDuration: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.gray500,
  },
  routeCta: {
    fontSize: 13,
    fontWeight: '900',
  },
});
