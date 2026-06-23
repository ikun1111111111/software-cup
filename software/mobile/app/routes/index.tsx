import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VRMManager } from '@/components/vrm/VRMManager';
import { SectionHeader } from '@/components/scenic/SectionHeader';
import type { TourRoute } from '@/api/routes';
import { getRouteDetailWithFallback, getRoutesWithFallback } from '@/services/dataSync';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ROUTE_TYPE_META } from '@/constants/scenic';
import { useTour } from '@/context/TourContext';
import type { Route as TourRouteType } from '@/hooks/useTourOrchestrator';
import { OFFLINE_DEMO_NOTICE, isOfflineDemoRoute } from '@/constants/offline-demo';
import { enrichSpotsWithLocations } from '@/constants/spot-locations';

export default function RoutesListPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const [tourState, tourActions] = useTour();

  const filters = [
    { key: '', label: '全部' },
    { key: 'history', label: '历史文化' },
    { key: 'nature', label: '自然风光' },
    { key: 'family', label: '亲子家庭' },
  ];

  useEffect(() => {
    setLoading(true);
    getRoutesWithFallback()
      .then((data) => {
        const nextRoutes = activeFilter
          ? data.filter((route) => route.route_type === activeFilter)
          : data;
        setRoutes(nextRoutes);
        setDemoMode(data.some((route) => isOfflineDemoRoute(route.id)));
      })
      .catch(() => {
        setRoutes([]);
        setDemoMode(false);
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  // 进入路线页，数字人推荐最佳路线
  useEffect(() => {
    VRMManager.setPageContext('routes');
    const t = setTimeout(() => {
      if (tourState.preferences.mode === 'tour') {
        VRMManager.speak('为您推荐几条精选游览路线，选择一条开始导览吧', 'happy');
        tourActions.suggestRoute();
      } else {
        VRMManager.speak('这里有几条精选路线，您可以自由选择', 'neutral');
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [tourState.preferences.mode]);

  const handleRoutePress = useCallback(async (route: TourRoute) => {
    const detail = await getRouteDetailWithFallback(route.id);
    const orderedSpots: Array<{ id: string; name: string }> = detail?.spot_names?.length
      ? detail.spot_names
      : (detail?.spot_order || (route as any).spot_order || []).map((sid: string) => ({
          id: sid,
          name: ((detail as any)?.spot_details?.[sid]?.name) || ((route as any).spot_details?.[sid]?.name) || sid,
        }));

    // 转换为 TourRouteType 并保存选择
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
      // 导览模式：询问是否开始导览
      VRMManager.speak(`${route.name}，全程约${route.duration}，现在开始导览吗？`, 'neutral');
      setTimeout(() => {
        tourActions.startTour(tourRoute);
        router.push(`/routes/${route.id}`);
      }, 1200);
    } else {
      // 自由模式：直接查看详情
      VRMManager.speak(`${route.name}，${route.description}`, 'neutral');
      setTimeout(() => router.push(`/routes/${route.id}`), 1000);
    }
  }, [tourState.preferences.mode, router, tourActions.startTour]);

  const handleFilterChange = useCallback((key: string) => {
    setActiveFilter(key);
    const label = filters.find((f) => f.key === key)?.label ?? '全部';
    if (tourState.preferences.mode === 'tour') {
      VRMManager.speak(`正在查看${label}路线`, 'neutral');
    }
  }, [tourState.preferences.mode]);

  return (
    <View style={styles.root}>
      {/* 导览进度指示器 */}
      {tourState.currentRoute && tourState.progress.total > 0 && (
        <View style={styles.progressOverlay}>
          <Pressable
            style={styles.progressTap}
            onPress={() => router.push(`/routes/${tourState.currentRoute!.id}`)}
          >
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>导览中</Text>
            </View>
            <Text style={styles.progressRoute}>{tourState.currentRoute.name}</Text>
            <Text style={styles.progressCount}>
              {tourState.progress.completed}/{tourState.progress.total}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>游览路线</Text>
        <View style={styles.headerLine} />
        <Text style={styles.headerSub}>精选路线 · 深度体验</Text>
      </View>

      {demoMode && (
        <View style={styles.demoBanner} accessible accessibilityRole="text">
          <Text style={styles.demoBannerTitle}>演示数据模式</Text>
          <Text style={styles.demoBannerText}>{OFFLINE_DEMO_NOTICE}</Text>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => {
          const active = f.key === activeFilter;
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleFilterChange(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`筛选${f.label}路线`}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>加载路线...</Text>
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>暂无路线</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {routes.map((route, idx) => {
            const meta = ROUTE_TYPE_META[route.route_type] || ROUTE_TYPE_META.nature;
            const isCurrentTour = tourState.currentRoute?.id === route.id;

            return (
              <Animated.View key={route.id} entering={FadeInUp.delay(idx * 80).duration(400)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.routeCard,
                    isCurrentTour && styles.routeCardActive,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => handleRoutePress(route)}
                  accessibilityRole="button"
                  accessibilityLabel={`${route.name}，${route.duration}，${isCurrentTour ? '继续导览' : '查看详情'}`}
                >
                  <View style={styles.routeTop}>
                    <View style={[styles.routeTypeBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.routeTypeIcon, { color: meta.color }]}>{meta.icon}</Text>
                    </View>
                    <View style={styles.routeInfo}>
                      <View style={styles.routeNameRow}>
                        <Text style={styles.routeName}>{route.name}</Text>
                        {isCurrentTour && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>导览中</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.routeMetaRow}>
                        <View style={[styles.routeMetaTag, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.routeMetaText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        <Text style={styles.routeDuration}>{route.duration}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.routeDesc} numberOfLines={2}>{route.description}</Text>
                  <View style={styles.routeFooter}>
                    <Text style={styles.routeCta}>
                      {isCurrentTour ? '继续导览 →' : '查看详情 →'}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
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
  progressTap: {
    backgroundColor: 'rgba(253, 251, 247, 0.98)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  progressBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  progressRoute: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  progressCount: {
    fontSize: 13,
    color: Colors.gray500,
  },

  header: { alignItems: 'center', paddingVertical: 10 },
  backBtn: { position: 'absolute', left: 14, top: 10, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, letterSpacing: 3 },
  headerLine: { width: 20, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 5, opacity: 0.6 },
  headerSub: { fontSize: 10, color: Colors.gray400, marginTop: 3 },

  demoBanner: {
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(200,169,81,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.35)',
  },
  demoBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 2,
  },
  demoBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.gray600,
  },

  filterRow: { paddingHorizontal: 14, marginBottom: 14, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, minHeight: 36,
    borderWidth: 1, borderColor: 'rgba(192,188,182,0.4)',
    backgroundColor: '#fff', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 12, color: Colors.gray500 },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  list: { paddingHorizontal: 14, paddingBottom: 100 },

  routeCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg,
    padding: 16, marginBottom: 14,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  routeCardActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(106,156,137,0.04)',
  },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  routeTypeBadge: {
    width: 44, height: 44, borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  routeTypeIcon: { fontSize: 20, fontWeight: '700' },
  routeInfo: { flex: 1 },
  routeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeName: { fontSize: 15, fontWeight: '600', color: Colors.ink, letterSpacing: 1 },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  currentBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  routeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  routeMetaTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  routeMetaText: { fontSize: 10, fontWeight: '500' },
  routeDuration: { fontSize: 11, color: Colors.gray400 },
  routeDesc: { fontSize: 13, color: Colors.gray500, lineHeight: 20, marginBottom: 10 },
  routeFooter: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8, alignItems: 'flex-end' },
  routeCta: { fontSize: 12, color: Colors.primary, fontWeight: '500' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 3, marginTop: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: Colors.gray400 },
});
