import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Image,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler, useSharedValue, useAnimatedStyle,
} from 'react-native-reanimated';
import InlineModal from '@/components/ui/InlineModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSpotById, recordVisit, type SpotDetail } from '@/api/spots';
import { spotCacheService } from '@/services/spotCache';
import { getSpotWithFallback } from '@/services/dataSync';
import { SESSION_ID } from '@/services/dataSync';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES } from '@/constants/scenic';
import { TRAVEL_TIPS } from '@/data/travelTips';
import type { NarrationContent } from '@/components/guide/NarrationSheet';
import TourProgressIndicator from '@/components/guide/TourProgressIndicator';
import { useTour } from '@/context/TourContext';
import { useTourGeolocation } from '@/hooks/useTourGeolocation';
import { useTourGuide } from '@/hooks/useTourGuide';
import type { TourCheckinResult } from '@/hooks/useTourOrchestrator';
import type { MomentResult } from '@/components/memory/MomentModal';
import { createMemory } from '@/api/memory';
import { recordMobileTourEvent } from '@/api/analytics';
import { AttractionDetailSkeleton } from '@/components/ui/SkeletonLoader';

const NarrationSheet = lazy(() => import('@/components/guide/NarrationSheet'));
const CheckinPanel = lazy(() => import('@/components/guide/CheckinPanel'));
const MemoryMomentModal = lazy(() => import('@/components/memory/MomentModal'));

const HERO_H = 280;

function hasTourCheckinTarget(result: unknown): result is TourCheckinResult {
  return typeof result === 'object' && result !== null && 'nextTargetSpot' in result;
}

export default function AttractionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const heroFade = useSharedValue(1);
  const headerOpacity = useSharedValue(0);

  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [newStamp, setNewStamp] = useState<string | null>(null);
  const [showNarration, setShowNarration] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [autoNavigating, setAutoNavigating] = useState(false);
  const [showCheckinPanel, setShowCheckinPanel] = useState(false);

  // 使用全局 TourContext
  const [tourState, tourActions] = useTour();

  // GPS定位 - 当导览模式下追踪目标景点
  const targetSpot = tourState.currentRoute?.spots.find(s => s.id === id) ?? null;
  const { distanceInfo } = useTourGeolocation(
    tourState.preferences.mode === 'tour' ? targetSpot : null,
    { enabled: tourState.preferences.mode === 'tour' },
  );

  // 记录已导航过的景点ID，防止重复导航
  const navigatedSpotsRef = useRef<Set<string>>(new Set());

  // 打卡成功后，立即跳转到下一个景点
  const navigateToNextSpot = useCallback(async (completedSpotId?: string, explicitNextSpot?: { id: string; name: string } | null) => {
    if (!tourState.currentRoute) return;

    const routeSpots = tourState.currentRoute.spots || [];
    const completedIndex = completedSpotId
      ? routeSpots.findIndex((routeSpot) => routeSpot.id === completedSpotId)
      : tourState.progress.completed - 1;
    const nextSpot = explicitNextSpot ?? routeSpots[completedIndex + 1] ?? null;

    if (!nextSpot) {
      speakWithDigitalHuman('恭喜您完成了所有景点的打卡！我已整理好本次路线，可以生成灵山手帐了。', 'happy');
      setTimeout(() => {
        router.replace('/memory');
      }, 2000);
      return;
    }

    if (!navigatedSpotsRef.current.has(nextSpot.id)) {
      navigatedSpotsRef.current.add(nextSpot.id);
      // 后台预热，不阻塞当前跳转
      spotCacheService.preload(nextSpot.id, getSpotById).catch(() => {});
      // 后台预加载下下个景点（不阻塞当前跳转）
      const nextIndex = routeSpots.findIndex((routeSpot) => routeSpot.id === nextSpot.id);
      const afterNext = routeSpots[nextIndex + 1];
      if (afterNext) {
        spotCacheService.preload(afterNext.id, getSpotById).catch(() => {});
      }
      router.replace(`/attractions/${nextSpot.id}`);
    }
  }, [tourState.currentRoute, tourState.progress.completed, tourActions, router]);

  // 用ref追踪最新的navigateToNextSpot，避免handleCheckIn闭包中的stale closure问题
  const navigateToNextSpotRef = useRef(navigateToNextSpot);
  useEffect(() => {
    navigateToNextSpotRef.current = navigateToNextSpot;
  }, [navigateToNextSpot]);

  // 加载景点数据 - 优先使用本地数据库，其次内存缓存，最后网络请求
  useEffect(() => {
    if (!id) return;

    // 先检查内存缓存
    const cached = spotCacheService.get(id);
    if (cached) {
      setSpot(cached);
      setLoading(false);
      return;
    }

    // 使用本地数据库优先策略
    setLoading(true);
    getSpotWithFallback(id)
      .then((data) => {
        if (data) {
          setSpot(data);
          spotCacheService.set(id, data); // 同时写入内存缓存
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // 到达景点时，数字人主动介绍
  useEffect(() => {
    if (spot) {
      setDigitalHumanPageContext('attraction-detail', { spotName: spot.name });

      if (tourState.preferences.mode === 'tour' && !autoNavigating) {
        // 主动导览模式：数字人主动介绍
        const timer = setTimeout(() => {
          const soloIntro = tourState.soloTour.enabled
            ? `到${spot.name}了。你可以先自己看一眼，我在旁边陪你；想听重点时点讲解就好。${spot.overview}`
            : `${spot.name}，${spot.overview}。要听听详细讲解吗？`;
          speakWithDigitalHuman(soloIntro, 'neutral');
        }, 800);
        return () => clearTimeout(timer);
      } else if (tourState.preferences.mode === 'free') {
        // 自由模式：仅简单欢迎
        const timer = setTimeout(() => {
          speakWithDigitalHuman(`${spot.name}，${spot.overview}。有什么想了解的吗？`, 'neutral');
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [spot, tourState.preferences.mode, tourState.soloTour.enabled]);

  // 数字人GPS距离引导
  useTourGuide(distanceInfo, {
    vrmSpeak: speakWithDigitalHuman,
    enabled: tourState.preferences.mode === 'tour' && !!targetSpot && !autoNavigating,
  });

  // Animated styles - MUST be before early returns
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - scrollY.value * 0.0003 }],
    opacity: heroFade.value,
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerOpacity.value * -10 }],
  }));

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      heroFade.value = Math.max(0, 1 - y / (HERO_H * 0.6));
      headerOpacity.value = Math.min(1, y / (HERO_H * 0.4));
    },
  });

  // 打开打卡面板
  const handleOpenCheckinPanel = useCallback(() => {
    if (!spot || checkedIn) return;
    setShowCheckinPanel(true);
  }, [spot, checkedIn]);

  // 执行打卡 - 即时反馈，后台异步记录
  const handleCheckIn = useCallback(async () => {
    if (!spot || checkedIn || checkInLoading) return;
    setCheckInLoading(true);
    try {
      const result = await tourActions.completeSpot({
        id: spot.id,
        name: spot.name,
        latitude: spot.latitude ?? undefined,
        longitude: spot.longitude ?? undefined,
      });

      if (!result.success) {
        speakWithDigitalHuman(result.message, 'neutral');
        setCheckInLoading(false);
        return;
      }

      // 即时反馈，不等待recordVisit
      setCheckedIn(true);
      setJustCheckedIn(true);
      setCheckInLoading(false);

      speakWithDigitalHuman(`${spot.name}打卡成功！`, 'happy');

      // 后台异步记录（不阻塞UI）
      recordVisit(SESSION_ID, spot.name)
        .then((visitResult) => {
          if (visitResult.new_stamps && visitResult.new_stamps.length > 0) {
            const stamp = visitResult.new_stamps[0];
            setNewStamp(stamp.name);
          }
        })
        .catch(() => {}); // 静默失败

      // 3秒后移除打卡成功状态
      setTimeout(() => setJustCheckedIn(false), 3000);

      // 立即跳转到下一个景点（无延迟）
      navigateToNextSpotRef.current(spot.id, hasTourCheckinTarget(result) ? result.nextTargetSpot : null);
    } catch (e) {
      speakWithDigitalHuman('打卡失败，请稍后再试', 'sad');
      setCheckInLoading(false);
    }
  }, [spot, checkedIn, checkInLoading, tourActions.completeSpot]);

  // ─── CheckinPanel: 拍照打卡 ───
  const handleCheckinPhoto = useCallback(() => {
    setShowCheckinPanel(false);
    tourActions.setCheckinIntent('photo');
    if (spot) {
      tourActions.setPendingCheckin({
        spotId: spot.id,
        spotName: spot.name,
        type: 'photo',
        timestamp: Date.now(),
      });
    }
    router.push('/explore');
  }, [spot, tourActions, router]);

  // ─── CheckinPanel: 扫码打卡 ───
  const handleCheckinScan = useCallback(() => {
    setShowCheckinPanel(false);
    tourActions.setCheckinIntent('scan');
    if (spot) {
      tourActions.setPendingCheckin({
        spotId: spot.id,
        spotName: spot.name,
        type: 'scan',
        timestamp: Date.now(),
      });
    }
    router.push('/explore');
  }, [spot, tourActions, router]);

  // ─── CheckinPanel: 直接打卡 ───
  const handleCheckinDirect = useCallback(async () => {
    setShowCheckinPanel(false);
    await handleCheckIn();
  }, [handleCheckIn]);

  // ─── CheckinPanel: 取消 ───
  const handleCheckinCancel = useCallback(() => {
    setShowCheckinPanel(false);
  }, []);

  // 开始讲解
  const handleStartNarration = useCallback(() => {
    if (!spot) return;
    const content: NarrationContent = {
      spot: {
        id: spot.id,
        name: spot.name,
        image: undefined,
        overview: spot.overview,
      },
      text: spot.detail || spot.overview || `${spot.name}是灵山胜境的重要景点之一。`,
      duration: Math.max(30, (spot.detail?.length || 100) / 5),
    };
    setShowNarration(true);
    tourActions.startNarration({
      id: spot.id,
      name: spot.name,
      description: spot.overview,
    });
  }, [spot, tourActions.startNarration]);

  // 继续导览到下一个景点
  const handleContinueTour = useCallback(async () => {
    if (!spot) return;

    if (tourState.currentRoute && tourState.currentSpot?.id === spot.id) {
      const result = await tourActions.completeSpot({
        id: spot.id,
        name: spot.name,
        latitude: spot.latitude ?? undefined,
        longitude: spot.longitude ?? undefined,
      });

      if (!result.success) {
        speakWithDigitalHuman(result.message, 'neutral');
        return;
      }

      const nextTargetSpot = hasTourCheckinTarget(result) ? result.nextTargetSpot : null;
      if (nextTargetSpot) {
        speakWithDigitalHuman(`好的，我们继续前往${nextTargetSpot.name}`);
        router.push(`/attractions/${nextTargetSpot.id}`);
      } else {
        speakWithDigitalHuman('恭喜您完成了所有景点！去旅行记忆里生成本次手帐吧。', 'happy');
        router.push('/memory');
      }
      return;
    }

    if (tourState.currentSpot) {
      speakWithDigitalHuman(`好的，我们继续前往${tourState.currentSpot.name}`);
      router.push(`/attractions/${tourState.currentSpot.id}`);
      return;
    }

    speakWithDigitalHuman('恭喜您完成了所有景点！去旅行记忆里生成本次手帐吧。', 'happy');
    router.push('/memory');
  }, [spot, tourActions, tourState.currentRoute, tourState.currentSpot, router]);

  // 结束导览确认弹窗
  const [showEndTourModal, setShowEndTourModal] = useState(false);
  const [showMomentModal, setShowMomentModal] = useState(false);
  const [momentLoading, setMomentLoading] = useState(false);

  const handleEndTour = useCallback(() => {
    setShowEndTourModal(true);
  }, []);

  const confirmEndTour = useCallback(() => {
    setShowEndTourModal(false);
    tourActions.endTour();
    router.replace('/');
  }, [tourActions.endTour, router]);

  const cancelEndTour = useCallback(() => {
    setShowEndTourModal(false);
  }, []);

  // 打开记忆瞬间弹窗
  const handleOpenMomentModal = useCallback(() => {
    if (!spot) return;
    setShowMomentModal(true);
  }, [spot]);

  // 提交记忆瞬间
  const handleSubmitMoment = useCallback(async (result: MomentResult) => {
    if (!spot) return;
    setMomentLoading(true);
    try {
      await createMemory({
        session_id: SESSION_ID,
        user_input: result.text,
        spot_name: spot.name,
        mood_tag: result.mood,
        photo_url: result.photoUri,
        voice_url: result.voiceUri,
        voice_duration: result.voiceDuration,
      });
      recordMobileTourEvent({
        session_id: SESSION_ID,
        event_name: 'memory_created',
        route_id: tourState.currentRoute?.id ?? null,
        route_name: tourState.currentRoute?.name ?? null,
        spot_id: spot.id,
        spot_name: spot.name,
        source_page: 'attraction',
        preferences: tourState.preferences,
        metadata: {
          mood: result.mood,
          route_completed: tourState.progress.total > 0 && tourState.progress.completed >= tourState.progress.total,
        },
      }).catch(() => {});
      setShowMomentModal(false);
      speakWithDigitalHuman('记忆已保存', 'happy');
    } catch (error) {
      console.error('Failed to save moment:', error);
      speakWithDigitalHuman('保存失败，请重试', 'sad');
    } finally {
      setMomentLoading(false);
    }
  }, [spot, tourState.currentRoute, tourState.preferences, tourState.progress.completed, tourState.progress.total]);

  if (loading) {
    return <AttractionDetailSkeleton />;
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
      {/* 导览进度指示器 */}
      {tourState.currentRoute && tourState.progress.total > 0 && (
        <View style={[styles.progressOverlay, { paddingTop: insets.top + 10 }]}>
          <TourProgressIndicator
            progress={tourState.progress}
            currentRoute={tourState.currentRoute}
            status={tourState.status}
            distance={distanceInfo?.distance}
            collapsed={tourState.status === 'narrating'}
            onResume={tourActions.resumeTour}
            onEnd={handleEndTour}
            justCheckedIn={justCheckedIn}
            showControls={false}
            simplified={true}
          />
        </View>
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Animated.View style={[styles.heroInner, heroStyle, { paddingTop: insets.top }]}>
            {SPOT_IMAGES[spot.id] && (
              <Image source={SPOT_IMAGES[spot.id]} style={styles.heroImage} resizeMode="cover" />
            )}
            <View style={styles.heroGradient} />

            <Pressable
              style={styles.backBtn}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/attractions'))}
              hitSlop={12}
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
          </Animated.View>
        </View>

        {/* 固定头部（滚动时显示） */}
        <Animated.View style={[styles.fixedHeader, headerStyle, { top: insets.top }]}>
          <Pressable style={styles.backBtnFixed} onPress={() => (router.canGoBack() ? router.back() : router.replace('/attractions'))} hitSlop={8}>
            <Text style={styles.backTextFixed}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{spot.name}</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        {/* 主动导览模式下的操作按钮 */}
        {tourState.preferences.mode === 'tour' && !autoNavigating && (
          <View style={styles.tourActions}>
            <Pressable
              style={({ pressed }) => [
                styles.tourActionBtn,
                styles.narrateBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleStartNarration}
            >
              <Text style={styles.narrateBtnIcon}>🎤</Text>
              <Text style={styles.narrateBtnText}>讲解</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tourActionBtn,
                styles.momentBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleOpenMomentModal}
            >
              <Text style={styles.momentBtnIcon}>📝</Text>
              <Text style={styles.momentBtnText}>记忆</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tourActionBtn,
                styles.continueBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleContinueTour}
            >
              <Text style={styles.continueBtnIcon}>→</Text>
              <Text style={styles.continueBtnText}>
                {tourState.nextSpot ? tourState.nextSpot.name : '完成'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 自由模式下的操作按钮 */}
        {tourState.preferences.mode !== 'tour' && !autoNavigating && (
          <View style={styles.tourActions}>
            <Pressable
              style={({ pressed }) => [
                styles.tourActionBtn,
                styles.narrateBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleStartNarration}
            >
              <Text style={styles.narrateBtnIcon}>🎤</Text>
              <Text style={styles.narrateBtnText}>讲解</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tourActionBtn,
                styles.momentBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleOpenMomentModal}
            >
              <Text style={styles.momentBtnIcon}>📝</Text>
              <Text style={styles.momentBtnText}>记忆</Text>
            </Pressable>
          </View>
        )}

        {/* 自动导航提示 */}
        {autoNavigating && (
          <View style={styles.autoNavSection}>
            <View style={styles.autoNavCard}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.autoNavText}>
                正在前往{tourState.nextSpot?.name || '下一个景点'}...
              </Text>
            </View>
          </View>
        )}

        {/* Detail */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>详细介绍</Text>
            <View style={styles.sectionLine} />
          </View>
          <Text style={styles.detailText}>{spot.detail}</Text>
        </View>

        {/* Tags */}
        {spot.tags && spot.tags.length > 0 && (
          <View style={[styles.section, styles.tagsSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>标签</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.tags}>
              {spot.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Travel Tips */}
        {TRAVEL_TIPS[spot.id] && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>游览贴士</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.tipsCard}>
              {TRAVEL_TIPS[spot.id].bestTime && (
                <View style={styles.tipRow}>
                  <View style={styles.tipIconWrap}>
                    <Text style={styles.tipIcon}>⏰</Text>
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipLabel}>最佳时间</Text>
                    <Text style={styles.tipValue}>{TRAVEL_TIPS[spot.id].bestTime}</Text>
                  </View>
                </View>
              )}
              {TRAVEL_TIPS[spot.id].duration && (
                <View style={styles.tipRow}>
                  <View style={styles.tipIconWrap}>
                    <Text style={styles.tipIcon}>⏱</Text>
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipLabel}>建议游览</Text>
                    <Text style={styles.tipValue}>{TRAVEL_TIPS[spot.id].duration}</Text>
                  </View>
                </View>
              )}
              {TRAVEL_TIPS[spot.id].tips && TRAVEL_TIPS[spot.id].tips!.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipIconWrap}>
                    <Text style={styles.tipIcon}></Text>
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Questions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>向小灵提问</Text>
            <View style={styles.sectionLine} />
          </View>
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
                  pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => speakWithDigitalHuman(q, 'thinking')}
              >
                <Text style={styles.quickBtnIcon}>💬</Text>
                <Text style={styles.quickBtnText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Check-in */}
        {!autoNavigating && (
          <View style={styles.checkInSection}>
            {newStamp && (
              <RNAnimated.View
                style={styles.stampToast}
              >
                <Text style={styles.stampIcon}></Text>
                <Text style={styles.stampToastText}>获得「{newStamp}」</Text>
              </RNAnimated.View>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.checkInBtn,
                checkedIn && styles.checkInBtnDone,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleOpenCheckinPanel}
              disabled={checkedIn || checkInLoading}
            >
              {checkInLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.checkInContent}>
                  <Text style={styles.checkInIcon}>{checkedIn ? '✓' : ''}</Text>
                  <Text style={[styles.checkInBtnText, checkedIn && styles.checkInBtnTextDone]}>
                    {checkedIn ? '已打卡' : '打卡此地'}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* 导览控制按钮 - 在打卡按钮下方 */}
            {tourState.preferences.mode === 'tour' && (
              <View style={styles.tourControlRow}>
                {tourState.status !== 'completed' && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.tourControlBtn,
                      styles.tourControlResumeBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={handleContinueTour}
                  >
                    <Text style={styles.tourControlResumeText}>继续导览</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.tourControlBtn,
                    styles.tourControlEndBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleEndTour}
                >
                  <Text style={styles.tourControlEndText}>结束导览</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 160 }} />
      </Animated.ScrollView>

      {showNarration && (
        <InlineModal
          visible={showNarration}
          animationType="slide"
          onClose={() => setShowNarration(false)}
        >
          {spot && (
            <Suspense fallback={null}>
              <NarrationSheet
                content={{
                  spot: {
                    id: spot.id,
                    name: spot.name,
                    image: undefined,
                    overview: spot.overview,
                  },
                  text: spot.detail || spot.overview || `${spot.name}是灵山胜境的重要景点之一。`,
                  duration: Math.max(30, (spot.detail?.length || 100) / 5),
                }}
                onClose={() => {
                  setShowNarration(false);
                  tourActions.endNarration();
                }}
                onSkip={() => {
                  setShowNarration(false);
                  tourActions.endNarration();
                  handleContinueTour();
                }}
                onQuestion={() => {
                  tourActions.startConversation();
                  router.push('/chat');
                }}
              />
            </Suspense>
          )}
        </InlineModal>
      )}

      {/* 打卡面板 */}
      {showCheckinPanel && spot && (
        <Suspense fallback={null}>
          <CheckinPanel
            visible={showCheckinPanel}
            spotName={spot.name}
            onPhoto={handleCheckinPhoto}
            onScan={handleCheckinScan}
            onDirect={handleCheckinDirect}
            onCancel={handleCheckinCancel}
          />
        </Suspense>
      )}

      {/* 结束导览确认弹窗 */}
      {showEndTourModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}></Text>
            <Text style={styles.modalTitle}>结束导览</Text>
            <Text style={styles.modalMessage}>
              确定要结束当前导览吗？{'\n'}
              结束后将返回首页。
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnCancel,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={cancelEndTour}
              >
                <Text style={styles.modalBtnCancelText}>继续导览</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnConfirm,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={confirmEndTour}
              >
                <Text style={styles.modalBtnConfirmText}>结束并返回</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 记忆瞬间弹窗 */}
      {showMomentModal && spot && (
        <Suspense fallback={null}>
          <MemoryMomentModal
            visible={showMomentModal}
            spotName={spot.name}
            spotId={spot.id}
            onClose={() => setShowMomentModal(false)}
            onSubmit={handleSubmitMoment}
            loading={momentLoading}
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  // 进度指示器覆盖层
  progressOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
  },

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
    height: HERO_H, position: 'relative', overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backBtn: {
    position: 'absolute', left: 16, top: 12,
    minWidth: 44, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  backText: { fontSize: 14, color: '#fff', fontWeight: '600', letterSpacing: 1 },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: 'rgba(200,75,49,0.8)',
    borderRadius: 4, marginBottom: 8,
  },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  heroTitle: {
    fontSize: 24, fontWeight: '900', color: '#fff',
    letterSpacing: 2, marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroOverview: {
    fontSize: 13, color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },

  // 固定头部
  fixedHeader: {
    position: 'absolute',
    left: 0, right: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(253,251,247,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 40,
  },
  backBtnFixed: {
    width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  backTextFixed: { fontSize: 20, color: Colors.ink, fontWeight: '600' },
  headerTitle: {
    fontSize: 16, fontWeight: '700',
    color: Colors.ink, letterSpacing: 2,
  },

  // 自动导航提示
  autoNavSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  autoNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: Colors.primaryBg, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.2)',
  },
  autoNavText: {
    fontSize: 14, color: Colors.primary, fontWeight: '600',
  },

  // Section
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: Colors.ink, letterSpacing: 2,
  },
  sectionLine: {
    flex: 1, height: 1,
    backgroundColor: Colors.borderLight,
  },

  // 主动导览模式操作按钮
  tourActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tourActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  narrateBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  narrateBtnIcon: { fontSize: 14 },
  narrateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  momentBtn: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  momentBtnIcon: { fontSize: 14 },
  momentBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  continueBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  continueBtnIcon: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  continueBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },

  detailText: {
    fontSize: 14, lineHeight: 24,
    color: Colors.gray600,
  },

  tagsSection: {},
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.primaryBg, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.15)',
  },
  tagText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },

  tipsSection: {},
  tipsCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    gap: 12,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIconWrap: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  tipIcon: { fontSize: 14 },
  tipContent: { flex: 1 },
  tipLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2, letterSpacing: 1 },
  tipValue: { fontSize: 13, color: Colors.ink, fontWeight: '500' },
  tipText: { fontSize: 13, color: Colors.gray600, flex: 1, lineHeight: 20 },

  quickSection: {},
  quickGrid: { gap: 8 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#fff', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderLight,
    minHeight: 44,
  },
  quickBtnIcon: { fontSize: 14 },
  quickBtnText: { fontSize: 13, color: Colors.ink, fontWeight: '500' },

  // Check-in
  checkInSection: { paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  stampToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: Colors.warningBg, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(192,136,46,0.2)',
  },
  stampIcon: { fontSize: 16 },
  stampToastText: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  checkInBtn: {
    paddingVertical: 16, alignItems: 'center',
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
    elevation: 4,
  },
  checkInBtnDone: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkInIcon: { fontSize: 18 },
  checkInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  checkInBtnTextDone: { letterSpacing: 1 },

  // 导览控制按钮行（在打卡按钮下方）
  tourControlRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  tourControlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  tourControlResumeBtn: {
    backgroundColor: Colors.primary,
  },
  tourControlResumeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tourControlEndBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(192, 57, 43, 0.3)',
    backgroundColor: 'transparent',
  },
  tourControlEndText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // 结束导览确认弹窗
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIcon: { fontSize: 40, marginBottom: 12 },
  modalTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.ink,
    marginBottom: 12, letterSpacing: 2,
  },
  modalMessage: {
    fontSize: 14, color: Colors.gray500, textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row', gap: 12, width: '100%',
  },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.3)',
  },
  modalBtnCancelText: {
    fontSize: 14, fontWeight: '600', color: Colors.primary,
  },
  modalBtnConfirm: {
    backgroundColor: '#c0392b',
  },
  modalBtnConfirmText: {
    fontSize: 14, fontWeight: '600', color: '#fff',
  },
});
