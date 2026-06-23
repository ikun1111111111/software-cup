import React, { Suspense, lazy, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  RefreshControl,
  type FlatListProps,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';
import { SectionHeader } from '@/components/scenic/SectionHeader';
import { useTour } from '@/context/TourContext';
import {
  generateMemories, polishMemory,
  generateSummary, createMemory,
  createCapsule, unlockCapsule,
  type TravelMemory, type JourneySummary,
  type Achievement, type UserProfile,
} from '@/api/memory';
import { recordMobileTourEvent } from '@/api/analytics';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import {
  getMemoriesWithFallback,
  getUserProfileWithFallback,
  getAchievementsWithFallback,
  getJourneySummaryWithFallback,
  refreshMemoryPageDataInBackground,
  SESSION_ID,
} from '@/services/dataSync';
import { trackMobileEvent, flushMobileEvents } from '@/services/mobileAnalytics';
import { useMapSpots } from '@/hooks/useMapSpots';
import { getSoloRouteRecommendation } from '@/data/lingshanGuideData';
import { buildSoloTourSummary } from '@/utils/soloTour';

// Extracted components
import { HeroHeader } from '@/components/memory/HeroHeader';
import { AchievementBar } from '@/components/memory/AchievementBar';
import { SummaryCard } from '@/components/memory/SummaryCard';
import { ActionBar } from '@/components/memory/ActionBar';
import { MemoryCapsuleCard } from '@/components/memory/MemoryCapsuleCard';
import { MemoryCard } from '@/components/memory/MemoryCard';
import { InkTimelineNode } from '@/components/memory/InkTimelineNode';
import { EmptyState } from '@/components/memory/EmptyState';
import { TodayReviewCard } from '@/components/memory/TodayReviewCard';
import { MemoryGraphPanel } from '@/components/memory/MemoryGraphPanel';
import { MemoryPageSkeleton } from '@/components/ui/SkeletonLoader';
import { buildMemoryGraphCandidates, type MemoryGraphCandidate } from '@/utils/memoryGraph';

const MemoryMapView = lazy(() =>
  import('@/components/memory/MemoryMapView').then((module) => ({
    default: module.MemoryMapView,
  })),
);
const ShareCardPreview = lazy(() =>
  import('@/components/memory/ShareCardPreview').then((module) => ({
    default: module.ShareCardPreview,
  })),
);
const CreateMemoryModal = lazy(() => import('@/components/memory/CreateMemoryModal'));
const CreateCapsuleModal = lazy(() => import('@/components/memory/CreateCapsuleModal'));

const VISIBLE_MEMORY_BATCH = 6;
const AnimatedMemoryList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<
  FlatListProps<TravelMemory> & { onScroll?: ReturnType<typeof useAnimatedScrollHandler> }
>;

// ═══════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════
export default function MemoryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [tourState, tourActions] = useTour();
  const { spots } = useMapSpots();

  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMemories, setHasMoreMemories] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [showShareModal, setShowShareModal] = useState(false);
  const [todayDismissed, setTodayDismissed] = useState(false);
  const [showCapsuleModal, setShowCapsuleModal] = useState(false);
  const [capsuleLoading, setCapsuleLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<MemoryGraphCandidate | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        await refreshMemoryPageDataInBackground(SESSION_ID);
      }

      const memoriesData = await getMemoriesWithFallback(SESSION_ID, {
        limit: VISIBLE_MEMORY_BATCH,
        offset: 0,
      });
      setMemories(memoriesData);
      setHasMoreMemories(memoriesData.length === VISIBLE_MEMORY_BATCH);
      setLoading(false);

      void Promise.all([
        getJourneySummaryWithFallback(SESSION_ID),
        getUserProfileWithFallback(SESSION_ID),
        getAchievementsWithFallback(SESSION_ID),
      ]).then(([summaryRes, profileRes, achRes]) => {
        setSummary(summaryRes);
        setProfile(profileRes);
        setAchievements(achRes.achievements);
      });

      if (!forceRefresh) {
        void refreshMemoryPageDataInBackground(SESSION_ID).then(async () => {
          const [freshMemories, summaryRes, profileRes, achRes] = await Promise.all([
            getMemoriesWithFallback(SESSION_ID, { limit: VISIBLE_MEMORY_BATCH, offset: 0 }),
            getJourneySummaryWithFallback(SESSION_ID),
            getUserProfileWithFallback(SESSION_ID),
            getAchievementsWithFallback(SESSION_ID),
          ]);
          setMemories(freshMemories);
          setHasMoreMemories(freshMemories.length === VISIBLE_MEMORY_BATCH);
          setSummary(summaryRes);
          setProfile(profileRes);
          setAchievements(achRes.achievements);
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── 打卡数据到达 → 自动弹出新建记忆 ───
  const checkinConsumedRef = useRef(false);
  useEffect(() => {
    if (checkinConsumedRef.current) return;
    if (!tourState.pendingCheckin) return;
    checkinConsumedRef.current = true;
    const t = setTimeout(() => {
      setShowCreateModal(true);
      speakWithDigitalHuman(`打卡了${tourState.pendingCheckin!.spotName}，来写一段记忆吧`, 'happy');
    }, 600);
    return () => clearTimeout(t);
  }, [tourState.pendingCheckin]);

  useEffect(() => {
    setDigitalHumanPageContext('memory');
    void flushMobileEvents();
    const timer = setTimeout(() => {
      const count = memories.length;
      if (tourState.currentRoute && tourState.progress.completed > 0) {
        speakWithDigitalHuman(
          `本次导览已完成${tourState.progress.completed}/${tourState.progress.total}个景点，${count > 0 ? `还记录了${count}条记忆` : '记得记录你的感受哦'}`,
          'happy',
        );
      } else if (count > 0) {
        speakWithDigitalHuman(
          `您已记录了${count}条旅行记忆`,
          'neutral',
        );
      } else {
        speakWithDigitalHuman('开始记录您的灵山之旅吧', 'neutral');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [memories.length, tourState.currentRoute, tourState.progress.completed, tourState.progress.total]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generateMemories(SESSION_ID);
      await loadData();
      speakWithDigitalHuman('已从对话中提取旅行记忆', 'neutral');
    } catch {
      speakWithDigitalHuman('记忆生成失败，请稍后再试', 'sad');
    } finally {
      setGenerating(false);
    }
  }, [loadData]);

  const handleGenerateSummary = useCallback(async () => {
    setSummaryGenerating(true);
    try {
      const result = await generateSummary(SESSION_ID);
      setSummary(result);
      speakWithDigitalHuman('旅程总结已生成', 'neutral');
    } catch {
      speakWithDigitalHuman('总结生成失败，请先生成更多记忆', 'sad');
    } finally {
      setSummaryGenerating(false);
    }
  }, []);

  const handlePolish = useCallback(async (memoryId: number) => {
    try {
      const updated = await polishMemory(memoryId);
      setMemories((prev) => prev.map((m) => m.id === memoryId ? updated : m));
      speakWithDigitalHuman('记忆已润色', 'neutral');
      return updated;
    } catch {
      speakWithDigitalHuman('润色失败，请稍后再试', 'sad');
      throw new Error('润色失败');
    }
  }, []);

  const isTourCompleted = !!tourState.currentRoute
    && tourState.progress.total > 0
    && tourState.progress.completed >= tourState.progress.total;

  const soloSummary = useMemo(() => {
    if (tourState.soloTour.summary) return tourState.soloTour.summary;
    if (!tourState.soloTour.enabled || !tourState.guideSession.currentRoute) return null;
    return buildSoloTourSummary({
      route: tourState.guideSession.currentRoute,
      memoryEvents: tourState.memoryEvents,
      nextRecommendation: getSoloRouteRecommendation(tourState.guideProfile).route,
    });
  }, [
    tourState.guideProfile,
    tourState.guideSession.currentRoute,
    tourState.memoryEvents,
    tourState.soloTour.enabled,
    tourState.soloTour.summary,
  ]);

  const recordMemoryCreated = useCallback((spotName?: string) => {
    recordMobileTourEvent({
      session_id: SESSION_ID,
      event_name: 'memory_created',
      route_id: tourState.currentRoute?.id ?? null,
      route_name: tourState.currentRoute?.name ?? null,
      spot_id: tourState.pendingCheckin?.spotId ?? tourState.currentSpot?.id ?? null,
      spot_name: spotName ?? tourState.pendingCheckin?.spotName ?? tourState.currentSpot?.name ?? null,
      source_page: 'memory',
      preferences: tourState.preferences,
      metadata: {
        route_completed: isTourCompleted,
        source: tourState.pendingCheckin ? tourState.pendingCheckin.type : 'manual',
      },
    }).catch(() => {});
  }, [isTourCompleted, tourState.currentRoute, tourState.currentSpot, tourState.pendingCheckin, tourState.preferences]);

  const handleCreateMemory = useCallback(async (data: {
    user_input: string;
    spot_name?: string;
    mood_tag?: string;
  }) => {
    setCreateLoading(true);
    try {
      await createMemory({
        session_id: SESSION_ID,
        ...data,
        spot_name: data.spot_name ?? selectedCandidate?.spotName,
        spot_id: selectedCandidate?.spotId,
        source_type: selectedCandidate?.sourceType,
        metadata_json: selectedCandidate ? {
          source_event_id: selectedCandidate.eventId,
          event_type: selectedCandidate.eventType,
          source_page: selectedCandidate.sourcePage,
          route_id: selectedCandidate.routeId,
          route_name: selectedCandidate.routeName,
          spot_id: selectedCandidate.spotId,
          spot_name: selectedCandidate.spotName,
        } : undefined,
      });
      void trackMobileEvent('memory_created', {
        spot_name: data.spot_name,
        source: tourState.pendingCheckin ? tourState.pendingCheckin.type : 'manual',
        mood: data.mood_tag,
        source_page: 'memory',
      }, SESSION_ID);
      void flushMobileEvents();
      recordMemoryCreated(data.spot_name ?? selectedCandidate?.spotName);
      setShowCreateModal(false);
      setSelectedCandidate(null);
      if (tourState.pendingCheckin) {
        tourActions.clearPendingCheckin();
      }
      await loadData();
      speakWithDigitalHuman('记忆已为你书写并保存', 'neutral');
    } catch {
      speakWithDigitalHuman('记忆生成失败，请稍后再试', 'sad');
    } finally {
      setCreateLoading(false);
    }
  }, [loadData, recordMemoryCreated, selectedCandidate, tourState.pendingCheckin, tourActions.clearPendingCheckin]);

  const handleCreateCapsule = useCallback(async (data: {
    title: string;
    content: string;
    unlock_days: number;
  }) => {
    setCapsuleLoading(true);
    try {
      await createCapsule({
        session_id: SESSION_ID,
        ...data,
      });
      setShowCapsuleModal(false);
      await loadData();
      speakWithDigitalHuman('记忆胶囊已封存，时间到了我会提醒你', 'neutral');
    } catch {
      speakWithDigitalHuman('胶囊创建失败，请稍后再试', 'sad');
    } finally {
      setCapsuleLoading(false);
    }
  }, [loadData]);

  const handleUnlockCapsule = useCallback(async (capsuleId: number) => {
    await unlockCapsule(capsuleId);
    await loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const handleLoadMoreMemories = useCallback(async () => {
    if (loadingMore || !hasMoreMemories || viewMode !== 'timeline') return;
    setLoadingMore(true);
    try {
      const nextPage = await getMemoriesWithFallback(SESSION_ID, {
        limit: VISIBLE_MEMORY_BATCH,
        offset: memories.length,
      });
      setMemories((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const additions = nextPage.filter((item) => !seen.has(item.id));
        return [...prev, ...additions];
      });
      setHasMoreMemories(nextPage.length === VISIBLE_MEMORY_BATCH);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreMemories, loadingMore, memories.length, viewMode]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const spotCount = useMemo(
    () => profile?.visited_count ?? new Set(memories.filter((m) => m.spot_name).map((m) => m.spot_name)).size,
    [memories, profile],
  );
  const memoryGraphCandidates = useMemo(
    () => buildMemoryGraphCandidates(tourState.memoryEvents, memories),
    [memories, tourState.memoryEvents],
  );
  const handleEnrollCandidate = useCallback((candidate: MemoryGraphCandidate) => {
    setSelectedCandidate(candidate);
    setShowCreateModal(true);
  }, []);
  const listMemories = viewMode === 'timeline' && !loading && memories.length > 0 ? memories : [];

  return (
    <View style={styles.root}>
      <AnimatedMemoryList
        style={styles.scroll}
        data={listMemories}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={4}
        windowSize={7}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={80}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <HeroHeader
              scrollY={scrollY}
              insets={insets}
              memoryCount={memories.length}
              spotCount={spotCount}
              memories={memories}
              spots={spots}
            />

            {loading ? (
              <MemoryPageSkeleton />
            ) : (
              <View style={styles.content}>
            {/* 导览进度回顾卡片 */}
            {tourState.currentRoute && tourState.progress.completed > 0 && (
              <View style={styles.tourReviewCard}>
                <View style={styles.tourReviewHeader}>
                  <View style={styles.tourReviewBadge}>
                    <Text style={styles.tourReviewBadgeText}>
                      {isTourCompleted ? '导览完成' : '导览回顾'}
                    </Text>
                  </View>
                  <Pressable onPress={tourActions.endTour} hitSlop={8}>
                    <Text style={styles.tourReviewClose}>✕</Text>
                  </Pressable>
                </View>
                <Text style={styles.tourReviewRoute}>{tourState.currentRoute.name}</Text>
                <View style={styles.tourReviewProgress}>
                  <View style={styles.tourReviewProgressBar}>
                    <View style={[styles.tourReviewProgressFill, { width: `${(tourState.progress.completed / Math.max(tourState.progress.total, 1)) * 100}%` }]} />
                  </View>
                  <Text style={styles.tourReviewProgressText}>
                    {tourState.progress.completed}/{tourState.progress.total} 景点
                  </Text>
                </View>
                {tourState.currentRoute.spots.slice(0, tourState.progress.completed).length > 0 && (
                  <View style={styles.tourReviewSpots}>
                    <Text style={styles.tourReviewSpotsLabel}>已游览：</Text>
                    <Text style={styles.tourReviewSpotsText} numberOfLines={1}>
                      {tourState.currentRoute.spots.slice(0, tourState.progress.completed).map(s => s.name).join(' → ')}
                    </Text>
                  </View>
                )}
                {isTourCompleted ? (
                  <View style={styles.tourReviewActionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.tourReviewResumeBtn,
                        styles.tourReviewActionBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={handleGenerateSummary}
                      disabled={summaryGenerating}
                    >
                      <Text style={styles.tourReviewResumeBtnText}>
                        {summaryGenerating ? '生成中...' : summary ? '刷新总结' : '生成总结'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.tourReviewShareBtn,
                        styles.tourReviewActionBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setShowShareModal(true)}
                    >
                      <Text style={styles.tourReviewShareBtnText}>分享手帐</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.tourReviewResumeBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      tourActions.resumeTour();
                      router.push('/map');
                    }}
                  >
                    <Text style={styles.tourReviewResumeBtnText}>继续导览 →</Text>
                  </Pressable>
                )}
              </View>
            )}

            {soloSummary && (
              <View style={styles.soloSummaryCard}>
                <View style={styles.soloSummaryHeader}>
                  <View>
                    <Text style={styles.soloSummaryEyebrow}>独自游览复盘</Text>
                    <Text style={styles.soloSummaryTitle}>小灵陪你独自游览</Text>
                  </View>
                  <Text style={styles.soloSummaryRoute} numberOfLines={1}>
                    {soloSummary.routeName}
                  </Text>
                </View>
                <View style={styles.soloSummaryStats}>
                  <View style={styles.soloSummaryStat}>
                    <Text style={styles.soloSummaryNumber}>{soloSummary.listenedNarrationCount}</Text>
                    <Text style={styles.soloSummaryLabel}>讲解</Text>
                  </View>
                  <View style={styles.soloSummaryStat}>
                    <Text style={styles.soloSummaryNumber}>{soloSummary.checkinCount}</Text>
                    <Text style={styles.soloSummaryLabel}>打卡</Text>
                  </View>
                  <View style={styles.soloSummaryStat}>
                    <Text style={styles.soloSummaryNumber}>{soloSummary.askedQuestionCount}</Text>
                    <Text style={styles.soloSummaryLabel}>提问</Text>
                  </View>
                </View>
                {soloSummary.visitedSpotNames.length > 0 && (
                  <Text style={styles.soloSummaryVisited} numberOfLines={2}>
                    已陪你看过：{soloSummary.visitedSpotNames.join('、')}
                  </Text>
                )}
                {soloSummary.nextRecommendation && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.soloSummaryNext,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => {
                      tourActions.startGuideRoute(
                        soloSummary.nextRecommendation!,
                        soloSummary.dominantInterest ?? 'free_walk',
                      );
                      router.push('/map');
                    }}
                  >
                    <Text style={styles.soloSummaryNextText}>
                      下一次可走：{soloSummary.nextRecommendation.name}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* 无导览时显示导览快捷入口 */}
            {!tourState.currentRoute && (
              <View style={styles.tourQuickCard}>
                <Text style={styles.tourQuickTitle}>🗺️ 开始数字人导览</Text>
                <Text style={styles.tourQuickDesc}>小灵全程语音讲解，智能导航，让游览更轻松</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.tourQuickBtn,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => router.push('/routes')}
                >
                  <Text style={styles.tourQuickBtnText}>选择路线，开始导览</Text>
                </Pressable>
              </View>
            )}

            <AchievementBar profile={profile} achievements={achievements} />

            {!todayDismissed && memories.length > 0 && (
              <TodayReviewCard
                memories={memories}
                onDismiss={() => setTodayDismissed(true)}
              />
            )}

            <MemoryGraphPanel
              candidates={memoryGraphCandidates}
              onEnroll={handleEnrollCandidate}
            />

            {memories.length === 0 ? (
              <EmptyState
                onGenerate={handleGenerate}
                generating={generating}
                onCreatePress={() => setShowCreateModal(true)}
              />
            ) : (
              <>
                <View style={styles.section}>
                  <SummaryCard
                    summary={summary}
                    onGenerate={handleGenerateSummary}
                    generating={summaryGenerating}
                  />
                </View>

                <ActionBar
                  onGenerate={handleGenerate}
                  generating={generating}
                  onCreatePress={() => setShowCreateModal(true)}
                  onSharePress={() => setShowShareModal(true)}
                  onCapsulePress={() => setShowCapsuleModal(true)}
                />

                <View style={styles.mapViewToggle}>
                  <Pressable
                    style={[
                      styles.mapViewToggleBtn,
                      viewMode === 'timeline' && styles.mapViewToggleBtnActive,
                    ]}
                    onPress={() => setViewMode('timeline')}
                  >
                    <Text style={[
                      styles.mapViewToggleText,
                      viewMode === 'timeline' && styles.mapViewToggleTextActive,
                    ]}>
                      📜 时间线
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.mapViewToggleBtn,
                      viewMode === 'map' && styles.mapViewToggleBtnActive,
                    ]}
                    onPress={() => setViewMode('map')}
                  >
                    <Text style={[
                      styles.mapViewToggleText,
                      viewMode === 'map' && styles.mapViewToggleTextActive,
                    ]}>
                      🗺️ 地图
                    </Text>
                  </Pressable>
                </View>

                {viewMode === 'timeline' ? (
                  <View style={styles.section}>
                    <SectionHeader title="记忆时光" subtitle="MEMORIES" />
                  </View>
                ) : (
                  <View style={styles.section}>
                    <SectionHeader title="记忆地图" subtitle="MEMORY MAP" />
                    <Suspense fallback={null}>
                      <MemoryMapView memories={memories} spots={spots} />
                    </Suspense>
                  </View>
                )}
              </>
            )}
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.content, styles.inkTimeline]}>
            <View style={styles.inkTimelineItem}>
              <InkTimelineNode
                index={index}
                total={listMemories.length}
                spotName={item.spot_name}
              />
              <View style={styles.inkTimelineContent}>
                {item.is_capsule ? (
                  <MemoryCapsuleCard
                    item={item}
                    onUnlock={handleUnlockCapsule}
                  />
                ) : (
                  <MemoryCard
                    item={item}
                    index={index}
                    onPolish={handlePolish}
                    achievements={achievements}
                  />
                )}
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.listFooter}>
            {viewMode === 'timeline' && memories.length > 0 && hasMoreMemories && (
              <Pressable
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  loadingMore && styles.loadMoreBtnDisabled,
                  pressed && !loadingMore && { opacity: 0.8 },
                ]}
                onPress={handleLoadMoreMemories}
                disabled={loadingMore}
              >
                <Text style={styles.loadMoreText}>
                  {loadingMore ? '加载中...' : `加载更多 ${VISIBLE_MEMORY_BATCH} 条`}
                </Text>
              </Pressable>
            )}
            <View style={{ height: 100 }} />
          </View>
        }
      />

      {showCreateModal && (
        <Suspense fallback={null}>
          <CreateMemoryModal
            visible={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedCandidate(null);
              if (tourState.pendingCheckin) {
                tourActions.clearPendingCheckin();
              }
            }}
            onSubmit={handleCreateMemory}
            spots={spots}
            loading={createLoading}
            initialSpotName={selectedCandidate?.spotName ?? tourState.pendingCheckin?.spotName}
            initialInput={selectedCandidate?.content}
          />
        </Suspense>
      )}

      {showShareModal && (
        <Suspense fallback={null}>
          <ShareCardPreview
            visible={showShareModal}
            onClose={() => setShowShareModal(false)}
            memories={memories}
            summary={summary}
          />
        </Suspense>
      )}

      {showCapsuleModal && (
        <Suspense fallback={null}>
          <CreateCapsuleModal
            visible={showCapsuleModal}
            onClose={() => setShowCapsuleModal(false)}
            onSubmit={handleCreateCapsule}
            loading={capsuleLoading}
          />
        </Suspense>
      )}
    </View>
  );
}

// ═══════════════════════════════════════
//  Styles (only for main page layout)
// ═══════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  section: { marginBottom: 20 },

  // Loading
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 80 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 4, marginTop: 16 },

  // 导览回顾卡片
  tourReviewCard: {
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
    borderLeftColor: Colors.accent,
  },
  tourReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tourReviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.accentBg,
    borderRadius: Radius.sm,
  },
  tourReviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 1,
  },
  tourReviewClose: {
    fontSize: 16,
    color: Colors.gray400,
    padding: 4,
  },
  tourReviewRoute: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 10,
  },
  tourReviewProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  tourReviewProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tourReviewProgressFill: {
    height: 6,
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  tourReviewProgressText: {
    fontSize: 11,
    color: Colors.gray500,
    minWidth: 40,
    textAlign: 'right',
  },
  tourReviewSpots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tourReviewSpotsLabel: {
    fontSize: 12,
    color: Colors.gray400,
  },
  tourReviewSpotsText: {
    fontSize: 12,
    color: Colors.ink,
    fontWeight: '500',
    flex: 1,
  },
  tourReviewResumeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tourReviewActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tourReviewActionBtn: {
    flex: 1,
  },
  tourReviewResumeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tourReviewShareBtn: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: '#fff',
  },
  tourReviewShareBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },

  soloSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '24',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  soloSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  soloSummaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  soloSummaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  soloSummaryRoute: {
    flexShrink: 1,
    maxWidth: 140,
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'right',
    lineHeight: 18,
  },
  soloSummaryStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  soloSummaryStat: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloSummaryNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  soloSummaryLabel: {
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: '600',
  },
  soloSummaryVisited: {
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 18,
    marginBottom: 12,
  },
  soloSummaryNext: {
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.accentBg,
  },
  soloSummaryNextText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
  },

  // 导览快捷入口
  tourQuickCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Colors.primary + '20',
  },
  tourQuickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 6,
  },
  tourQuickDesc: {
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 18,
    marginBottom: 14,
  },
  tourQuickBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 11,
    alignItems: 'center',
  },
  tourQuickBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // View Mode Toggle
  mapViewToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: Radius.pill,
    padding: 3,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapViewToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  mapViewToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  mapViewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    letterSpacing: 1,
  },
  mapViewToggleTextActive: {
    color: '#fff',
  },

  // Ink Timeline
  inkTimeline: { gap: 0 },
  listFooter: {
    paddingHorizontal: 16,
  },
  inkTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inkTimelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 12,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  loadMoreBtnDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
});
