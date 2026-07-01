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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';
import { SectionHeader } from '@/components/scenic/SectionHeader';
import { useTour } from '@/context/TourContext';
import {
  generateMemories, polishMemory,
  generateSummary, createMemory,
  createCapsule, unlockCapsule,
  type TravelMemory, type JourneySummary,
  type Achievement, type UserProfile,
  type SessionStatsCandidate,
} from '@/api/memory';
import { recordMobileTourEvent } from '@/api/analytics';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import {
  getMemoriesWithFallback,
  getUserProfileWithFallback,
  getAchievementsWithFallback,
  getJourneySummaryWithFallback,
  getSessionStatsWithFallback,
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
import { MemoryImage, MemoryRouteImage, MEMORY_IMAGES } from '@/components/memory/MemoryVisual';
import { MemoryPageSkeleton } from '@/components/ui/SkeletonLoader';
import type { MemoryGraphCandidate } from '@/utils/memoryGraph';

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
type MemoryFeedback = { type: 'success' | 'info' | 'error'; text: string };

function sortMemoriesForTimeline(items: TravelMemory[]) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function mergeTimelineMemories(current: TravelMemory[], incoming: TravelMemory[]) {
  const map = new Map<number, TravelMemory>();
  [...incoming, ...current].forEach((item) => {
    map.set(item.id, item);
  });
  return sortMemoriesForTimeline(Array.from(map.values()));
}

function MemoryFinalePanel({
  routeName,
  progressText,
  eventCount,
  clueCount,
  narrationCount,
  questionCount,
  checkinCount,
  savedCount,
  canEnroll,
  onEnrollFirst,
  onGenerateSummary,
  onShare,
  summaryGenerating,
}: {
  routeName?: string;
  progressText: string;
  eventCount: number;
  clueCount: number;
  narrationCount: number;
  questionCount: number;
  checkinCount: number;
  savedCount: number;
  canEnroll: boolean;
  onEnrollFirst: () => void;
  onGenerateSummary: () => void;
  onShare: () => void;
  summaryGenerating: boolean;
}) {
  if (eventCount === 0 && savedCount === 0) return null;

  return (
    <View style={styles.finaleCard}>
      <View style={styles.finaleTop}>
        <View>
          <Text style={styles.finaleEyebrow}>AI TRAVEL ALBUM</Text>
          <Text style={styles.finaleTitle}>小灵手账生成台</Text>
        </View>
        <View style={styles.finaleBadge}>
          <Text style={styles.finaleBadgeText}>{clueCount} 条线索</Text>
        </View>
      </View>
      <Text style={styles.finaleDesc} numberOfLines={2}>
        {routeName
          ? `${routeName} · ${progressText}，小灵已把导览过程整理成可入册素材。`
          : `已沉淀 ${eventCount} 条互动事件，小灵可以把它们整理成旅行手账。`}
      </Text>

      <View style={styles.finaleStats}>
        <View style={styles.finaleStat}>
          <Text style={styles.finaleStatNum}>{narrationCount}</Text>
          <Text style={styles.finaleStatLabel}>讲解</Text>
        </View>
        <View style={styles.finaleStat}>
          <Text style={styles.finaleStatNum}>{checkinCount}</Text>
          <Text style={styles.finaleStatLabel}>打卡</Text>
        </View>
        <View style={styles.finaleStat}>
          <Text style={styles.finaleStatNum}>{questionCount}</Text>
          <Text style={styles.finaleStatLabel}>问答</Text>
        </View>
        <View style={styles.finaleStat}>
          <Text style={styles.finaleStatNum}>{savedCount}</Text>
          <Text style={styles.finaleStatLabel}>已入册</Text>
        </View>
      </View>

      <View style={styles.finaleActions}>
        <Pressable
          style={[styles.finalePrimary, !canEnroll && styles.finaleDisabled]}
          onPress={onEnrollFirst}
          disabled={!canEnroll}
          accessibilityRole="button"
          accessibilityLabel="将第一条旅程线索入册"
        >
          <Text style={styles.finalePrimaryText}>{canEnroll ? '一键入册' : '暂无线索'}</Text>
        </Pressable>
        <Pressable
          style={styles.finaleSecondary}
          onPress={onGenerateSummary}
          disabled={summaryGenerating}
          accessibilityRole="button"
          accessibilityLabel="生成旅行总结"
        >
          <Text style={styles.finaleSecondaryText}>{summaryGenerating ? '生成中' : '生成总结'}</Text>
        </Pressable>
        <Pressable
          style={styles.finaleSecondary}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="分享旅行手帐"
        >
          <Text style={styles.finaleSecondaryText}>分享手帐</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════
export default function MemoryPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; returnLabel?: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [tourState, tourActions] = useTour();
  const { spots } = useMapSpots();
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const returnLabel = typeof params.returnLabel === 'string' ? params.returnLabel : '返回';
  const showContextBack = Boolean(returnTo);

  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [sessionStats, setSessionStats] = useState<{
    eventCount: number;
    narrationCount: number;
    questionCount: number;
    checkinCount: number;
    candidates: MemoryGraphCandidate[];
  }>({ eventCount: 0, narrationCount: 0, questionCount: 0, checkinCount: 0, candidates: [] });
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
  const [feedback, setFeedback] = useState<MemoryFeedback | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        await refreshMemoryPageDataInBackground(SESSION_ID);
      }

      const [memoriesData, stats] = await Promise.all([
        getMemoriesWithFallback(SESSION_ID, {
          limit: VISIBLE_MEMORY_BATCH,
          offset: 0,
        }),
        getSessionStatsWithFallback(SESSION_ID),
      ]);
      setMemories(sortMemoriesForTimeline(memoriesData));
      setHasMoreMemories(memoriesData.length === VISIBLE_MEMORY_BATCH);
      setSessionStats({
        eventCount: stats.event_count,
        narrationCount: stats.narration_count,
        questionCount: stats.question_count,
        checkinCount: stats.checkin_count,
        candidates: stats.candidates as MemoryGraphCandidate[],
      });
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
          const [freshMemories, summaryRes, profileRes, achRes, freshStats] = await Promise.all([
            getMemoriesWithFallback(SESSION_ID, { limit: VISIBLE_MEMORY_BATCH, offset: 0 }),
            getJourneySummaryWithFallback(SESSION_ID),
            getUserProfileWithFallback(SESSION_ID),
            getAchievementsWithFallback(SESSION_ID),
            getSessionStatsWithFallback(SESSION_ID),
          ]);
          setMemories(sortMemoriesForTimeline(freshMemories));
          setHasMoreMemories(freshMemories.length === VISIBLE_MEMORY_BATCH);
          setSummary(summaryRes);
          setProfile(profileRes);
          setAchievements(achRes.achievements);
          setSessionStats({
            eventCount: freshStats.event_count,
            narrationCount: freshStats.narration_count,
            questionCount: freshStats.question_count,
            checkinCount: freshStats.checkin_count,
            candidates: freshStats.candidates as MemoryGraphCandidate[],
          });
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 4200);
    return () => clearTimeout(timer);
  }, [feedback]);

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
      const result = await generateMemories(SESSION_ID);
      if (Array.isArray(result.memories)) {
        const nextMemories = sortMemoriesForTimeline(result.memories);
        const visibleCount = Math.max(VISIBLE_MEMORY_BATCH, memories.length);
        setMemories(nextMemories.slice(0, visibleCount));
        setHasMoreMemories(nextMemories.length > visibleCount);
      }
      if (result.new_count > 0) {
        setFeedback({ type: 'success', text: `已从对话生成 ${result.new_count} 条记忆` });
        speakWithDigitalHuman('已从对话中提取旅行记忆', 'neutral');
      } else {
        setFeedback({ type: 'info', text: '暂时没有新的对话可入册，先和小灵聊聊景点或路线再试试' });
        speakWithDigitalHuman('暂时没有找到新的对话记忆，可以先和我聊聊今天的景点', 'neutral');
      }
      void loadData(true);
    } catch {
      setFeedback({ type: 'error', text: '对话生成失败，请稍后再试' });
      speakWithDigitalHuman('记忆生成失败，请稍后再试', 'sad');
    } finally {
      setGenerating(false);
    }
  }, [loadData, memories.length]);

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
      const created = await createMemory({
        session_id: SESSION_ID,
        ...data,
        spot_name: data.spot_name ?? selectedCandidate?.spotName,
        spot_id: selectedCandidate?.spotId,
        source_type: selectedCandidate?.sourceType,
        metadata_json: selectedCandidate ? {
          ...(selectedCandidate.metadata ?? {}),
          source_event_id: selectedCandidate.eventId,
          event_type: selectedCandidate.eventType,
          source_page: selectedCandidate.sourcePage,
          route_id: selectedCandidate.routeId,
          route_name: selectedCandidate.routeName,
          spot_id: selectedCandidate.spotId,
          spot_name: selectedCandidate.spotName,
        } : undefined,
      });
      setMemories((prev) => mergeTimelineMemories(prev, [created]));
      setHasMoreMemories((prev) => prev || memories.length + 1 > VISIBLE_MEMORY_BATCH);
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
      setFeedback({ type: 'success', text: '已写入一条新记忆' });
      void loadData(true);
      speakWithDigitalHuman('记忆已为你书写并保存', 'neutral');
    } catch {
      setFeedback({ type: 'error', text: '写入记忆失败，请稍后再试' });
      speakWithDigitalHuman('记忆生成失败，请稍后再试', 'sad');
    } finally {
      setCreateLoading(false);
    }
  }, [loadData, memories.length, recordMemoryCreated, selectedCandidate, tourState.pendingCheckin, tourActions.clearPendingCheckin]);

  const handleCreateCapsule = useCallback(async (data: {
    title: string;
    content: string;
    unlock_days: number;
  }) => {
    setCapsuleLoading(true);
    try {
      const created = await createCapsule({
        session_id: SESSION_ID,
        ...data,
      });
      setMemories((prev) => mergeTimelineMemories(prev, [created]));
      setHasMoreMemories((prev) => prev || memories.length + 1 > VISIBLE_MEMORY_BATCH);
      setShowCapsuleModal(false);
      setFeedback({ type: 'success', text: '胶囊已封存，会出现在记忆时光里' });
      void loadData(true);
      speakWithDigitalHuman('记忆胶囊已封存，时间到了我会提醒你', 'neutral');
    } catch {
      setFeedback({ type: 'error', text: '胶囊创建失败，请稍后再试' });
      speakWithDigitalHuman('胶囊创建失败，请稍后再试', 'sad');
    } finally {
      setCapsuleLoading(false);
    }
  }, [loadData, memories.length]);

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
  const memoryGraphCandidates = sessionStats.candidates;
  const memoryFinaleStats = useMemo(() => {
    return {
      eventCount: sessionStats.eventCount,
      narrationCount: sessionStats.narrationCount,
      questionCount: sessionStats.questionCount,
      checkinCount: sessionStats.checkinCount,
    };
  }, [sessionStats]);
  const routeProgressText = tourState.progress.total > 0
    ? `${tourState.progress.completed}/${tourState.progress.total} 景点`
    : '自由探索';
  const handleEnrollCandidate = useCallback((candidate: MemoryGraphCandidate) => {
    setSelectedCandidate(candidate);
    setShowCreateModal(true);
  }, []);
  const handleEnrollFirstCandidate = useCallback(() => {
    if (!memoryGraphCandidates[0]) return;
    handleEnrollCandidate(memoryGraphCandidates[0]);
  }, [handleEnrollCandidate, memoryGraphCandidates]);
  const handleContextBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace((returnTo || '/explore') as any);
  }, [returnTo, router]);
  const listMemories = viewMode === 'timeline' && !loading && memories.length > 0 ? memories : [];

  return (
    <View style={styles.root}>
      {showContextBack && (
        <Pressable
          style={[styles.contextBackBtn, { top: insets.top + 12 }]}
          onPress={handleContextBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={returnLabel}
        >
          <Text style={styles.contextBackText}>‹ {returnLabel}</Text>
        </Pressable>
      )}

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
            <MemoryFinalePanel
              routeName={tourState.currentRoute?.name}
              progressText={routeProgressText}
              eventCount={memoryFinaleStats.eventCount}
              clueCount={memoryGraphCandidates.length}
              narrationCount={memoryFinaleStats.narrationCount}
              questionCount={memoryFinaleStats.questionCount}
              checkinCount={memoryFinaleStats.checkinCount}
              savedCount={memories.length}
              canEnroll={memoryGraphCandidates.length > 0}
              onEnrollFirst={handleEnrollFirstCandidate}
              onGenerateSummary={handleGenerateSummary}
              onShare={() => setShowShareModal(true)}
              summaryGenerating={summaryGenerating}
            />

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
                <View style={styles.tourQuickTitleRow}>
                  <MemoryRouteImage width={44} height={32} radius={10} />
                  <Text style={styles.tourQuickTitle}>开始数字人导览</Text>
                </View>
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

            {feedback && (
              <View style={[
                styles.feedbackBanner,
                feedback.type === 'success' && styles.feedbackBannerSuccess,
                feedback.type === 'error' && styles.feedbackBannerError,
              ]}>
                <Text style={[
                  styles.feedbackText,
                  feedback.type === 'success' && styles.feedbackTextSuccess,
                  feedback.type === 'error' && styles.feedbackTextError,
                ]}>
                  {feedback.text}
                </Text>
              </View>
            )}

            {memories.length === 0 ? (
              <EmptyState
                onGenerate={handleGenerate}
                generating={generating}
                onCreatePress={() => setShowCreateModal(true)}
                candidateCount={memoryGraphCandidates.length}
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
                  candidateCount={memoryGraphCandidates.length}
                />

                <View style={styles.mapViewToggle}>
                  <Pressable
                    style={[
                      styles.mapViewToggleBtn,
                      viewMode === 'timeline' && styles.mapViewToggleBtnActive,
                    ]}
                    onPress={() => setViewMode('timeline')}
                  >
                    <MemoryImage source={MEMORY_IMAGES.write} size={24} radius={8} fit="contain" />
                    <Text style={[
                      styles.mapViewToggleText,
                      viewMode === 'timeline' && styles.mapViewToggleTextActive,
                    ]}>
                      时间线
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.mapViewToggleBtn,
                      viewMode === 'map' && styles.mapViewToggleBtnActive,
                    ]}
                    onPress={() => setViewMode('map')}
                  >
                    <MemoryImage source={MEMORY_IMAGES.map} size={24} radius={8} fit="cover" />
                    <Text style={[
                      styles.mapViewToggleText,
                      viewMode === 'map' && styles.mapViewToggleTextActive,
                    ]}>
                      地图
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
  feedbackBanner: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  feedbackBannerSuccess: {
    backgroundColor: 'rgba(106,156,137,0.12)',
    borderColor: 'rgba(106,156,137,0.26)',
  },
  feedbackBannerError: {
    backgroundColor: 'rgba(200,75,49,0.10)',
    borderColor: 'rgba(200,75,49,0.24)',
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.primary,
    fontWeight: '600',
  },
  feedbackTextSuccess: {
    color: Colors.success,
  },
  feedbackTextError: {
    color: Colors.error,
  },
  contextBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    elevation: 8,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,28,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  contextBackText: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '800',
  },

  // Loading
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 80 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 4, marginTop: 16 },

  // AI 手账生成台
  finaleCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  finaleTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  finaleEyebrow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.56)',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  finaleTitle: {
    fontSize: 19,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  finaleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(200,75,49,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.34)',
  },
  finaleBadgeText: {
    fontSize: 11,
    color: '#FFD8C8',
    fontWeight: '900',
  },
  finaleDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.74)',
    lineHeight: 18,
    marginBottom: 14,
  },
  finaleStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  finaleStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finaleStatNum: {
    fontSize: 19,
    color: '#fff',
    fontWeight: '900',
  },
  finaleStatLabel: {
    marginTop: 2,
    fontSize: 10,
    color: 'rgba(255,255,255,0.56)',
    fontWeight: '700',
  },
  finaleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  finalePrimary: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalePrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  finaleSecondary: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finaleSecondaryText: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    fontWeight: '800',
  },
  finaleDisabled: {
    opacity: 0.55,
  },

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
  tourQuickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tourQuickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    flex: 1,
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
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
