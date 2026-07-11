import React, {
  useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy,
} from 'react';
import {
  InteractionManager,
  Platform,
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
  withRepeat, withSequence, withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  setDigitalHumanPageContext,
  speakWithDigitalHuman,
  stopDigitalHumanSpeech,
} from '@/services/digitalHuman';

import { InkTransition } from '@/components/ui/InkTransition';
import { BrushDivider } from '@/components/ui/BrushDivider';
import { Colors } from '@/constants/colors';
import TourProgressIndicator from '@/components/guide/TourProgressIndicator';
import { GuidePlanModal, type RouteOption } from '@/components/guide/GuidePlanModal';
import { MemoryPrompt } from '@/components/guide/MemoryPrompt';
import { useTour } from '@/context/TourContext';
import { useUserStore } from '@/stores/userStore';
import type { Route } from '@/hooks/useTourOrchestrator';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import {
  PageDigitalHumanDock,
  type PageDigitalHumanDockDriver,
} from '@/components/vrm/PageDigitalHumanDock';
import { useTourGeolocation } from '@/hooks/useTourGeolocation';
import { useTourGuide } from '@/hooks/useTourGuide';
import { enrichSpotsWithLocations } from '@/constants/spot-locations';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';

const IntroSection = lazy(() => import('@/components/home/IntroSection'));
const FeaturedSpots = lazy(() => import('@/components/home/FeaturedSpots'));
const FooterSection = lazy(() => import('@/components/home/FooterSection'));

const HERO_H = 560;
const HOME_DIGITAL_HUMAN_GREETING_DELAY_MS = 3200;

const FEATURES = [
  { to: '/chat', label: '对话导览', desc: '与数字人对话', image: require('../../assets/images/home/feature-chat-guide.png'), tag: '问询', color: '#6A9C89' },
  { to: '/attractions', label: '景点探索', desc: '浏览所有景点', image: require('../../assets/images/home/feature-attractions.png'), tag: '景点', color: '#C84B31' },
  { to: '/map', label: '景区导航', desc: '实时导航', image: require('../../assets/images/home/feature-map-nav.png'), tag: '地图', color: '#2A4D6E' },
  { to: '/explore', label: '路线导航', desc: '数字人带路', image: require('../../assets/images/home/feature-route-guide.png'), tag: '路线', color: '#4A7C6E' },
  { to: '/history', label: '时空穿越', desc: '穿越千年', image: require('../../assets/images/home/feature-history.png'), tag: '历史', color: '#9A663A' },
  { to: '/memory', label: '旅行记忆', desc: '记录旅途', image: require('../../assets/images/home/feature-memory.png'), tag: '记忆', color: '#C8A951' },
];

// ─── 飘落粒子 ───
const PARTICLE_COLORS = [
  'rgba(200,169,81,0.35)',
  'rgba(106,156,137,0.35)',
  'rgba(200,75,49,0.2)',
  'rgba(255,255,255,0.25)',
];

const PARTICLE_PRESETS = [
  { size: 4, x: 12, delay: 0, duration: 9200, sway: 10, color: PARTICLE_COLORS[0] },
  { size: 5, x: 26, delay: 900, duration: 11800, sway: 16, color: PARTICLE_COLORS[1] },
  { size: 3, x: 44, delay: 1500, duration: 10500, sway: 12, color: PARTICLE_COLORS[2] },
  { size: 6, x: 63, delay: 500, duration: 13200, sway: 18, color: PARTICLE_COLORS[3] },
  { size: 4, x: 79, delay: 2100, duration: 11100, sway: 11, color: PARTICLE_COLORS[0] },
  { size: 3, x: 91, delay: 2800, duration: 12600, sway: 14, color: PARTICLE_COLORS[1] },
];

function Particle({ config }: { config: {
  size: number; x: number; delay: number; duration: number; sway: number; color: string;
}}) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(HERO_H + 20, { duration: config.duration, easing: Easing.linear }),
        ),
        -1,
      ),
    );
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.sway, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-config.sway, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(config.delay, withTiming(1, { duration: 600 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      {
        position: 'absolute',
        left: `${config.x}%`,
        top: 0,
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: config.color,
      },
      style,
    ]} />
  );
}

function FloatingParticles() {
  return (
    <View style={styles.particlesWrap} pointerEvents="none">
      {PARTICLE_PRESETS.map((p, i) => <Particle key={i} config={p} />)}
    </View>
  );
}

// ─── Hero 大图 + 双入口卡片 + 数字人半露 ───
function HeroSection({
  scrollY,
  onFreeExplore,
  onGuidedTour,
}: {
  scrollY: Animated.SharedValue<number>;
  onFreeExplore: () => void;
  onGuidedTour: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  const { user } = useUserStore();

  // 印章摇动动画
  const sealRotation = useSharedValue(0);
  useEffect(() => {
    sealRotation.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // 背景视差
  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 500], [0, 100], { extrapolateRight: Extrapolation.CLAMP }) }],
  }));
  // 内容渐隐
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 350], [1, 0], { extrapolateRight: Extrapolation.CLAMP }),
    transform: [{ translateY: interpolate(scrollY.value, [0, 350], [0, -20], { extrapolateRight: Extrapolation.CLAMP }) }],
  }));
  // 印章摇动样式
  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sealRotation.value}deg` }],
  }));

  return (
    <View style={styles.heroWrap}>
      {/* 大背景图 + 视差 */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <Image
          source={require('../../assets/images/hero-bg-mobile.jpg')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
        />
      </Animated.View>

      {/* 深色渐变叠加 */}
      <View style={styles.heroOverlayDeep} />
      <View style={styles.heroOverlayVignette} />

      {/* 装饰性云纹 */}
      <View style={styles.heroCloud1} />
      <View style={styles.heroCloud2} />
      <View style={styles.heroCloud3} />

      {/* 飘落粒子层 */}
      <FloatingParticles />

      {/* Hero内容区 */}
      <Animated.View style={[styles.heroContent, { paddingTop: insets.top + 10 }, contentStyle]}>
        {/* 用户入口 */}
        <Pressable
          style={styles.userEntryBtn}
          onPress={() => router.push(user ? '/(tabs)/profile' : '/auth/login')}
          accessibilityRole="button"
          accessibilityLabel={user ? '打开个人中心' : '登录账号'}
        >
          <Text style={styles.userEntryIcon}>{user ? '🧘' : '👤'}</Text>
          <Text style={styles.userEntryText}>{user ? (user.nickname || user.username) : '登录'}</Text>
        </Pressable>
        {/* 印章 */}
        <Animated.View style={[styles.seal, loaded && styles.sealIn, sealStyle]}>
          <Text style={styles.sealTxt}>灵</Text>
          <View style={styles.sealInner} />
        </Animated.View>

        <Text style={styles.heroTitle}>小灵带你游灵山</Text>
        <Text style={styles.heroSubEn}>YOUR AI GUIDE TO LINGSHAN</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroPoem}>AI 数字导游 · 全程伴游</Text>

        {/* ─── 双入口卡片 ─── */}
        <View style={styles.entryCards}>
          {/* 地图自由探索 */}
          <Pressable
            style={({ pressed }) => [
              styles.entryCard,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            onPress={onFreeExplore}
            accessibilityRole="button"
            accessibilityLabel="打开地图自由探索"
          >
            <View style={styles.entryCardInner}>
              <View style={styles.entryImageWrap}>
                <Image
                  source={require('../../assets/images/home/home-free-explore.png')}
                  style={styles.entryImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
              <Text style={styles.entryTitle}>自由逛逛</Text>
              <Text style={styles.entryDesc}>自己看景点，我随时等你提问</Text>
              <View style={styles.entryCtaRow}>
                <Text style={styles.entryCta}>打开地图</Text>
                <Text style={[styles.entryCtaArrow, { color: '#6A9C89' }]}>→</Text>
              </View>
            </View>
          </Pressable>

          {/* 小灵路线导览 */}
          <Pressable
            style={({ pressed }) => [
              styles.entryCard,
              styles.entryCardActive,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            onPress={onGuidedTour}
            accessibilityRole="button"
            accessibilityLabel="选择小灵路线导览方案"
          >
            <View style={styles.entryCardInner}>
              <View style={styles.entryImageWrap}>
                <Image
                  source={require('../../assets/images/home/home-guided-tour.png')}
                  style={styles.entryImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
              <Text style={styles.entryTitle}>小灵带路</Text>
              <Text style={styles.entryDesc}>我帮你规划路线、到点讲解</Text>
              <View style={styles.entryCtaRow}>
                <Text style={[styles.entryCta, { color: '#C84B31' }]}>选择路线</Text>
                <Text style={[styles.entryCtaArrow, { color: '#C84B31' }]}>→</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </Animated.View>

      {/* 弧形过渡区域 */}
      <View style={styles.heroCurveWrap}>
        <View style={styles.heroCurve} />
      </View>
    </View>
  );
}

// ─── 功能卡片（带 stagger 入场 + 悬浮效果） ───
function FeatureCard({ feature, index }: {
  feature: typeof FEATURES[0];
  index: number;
}) {
  const router = useRouter();
  const hovered = useSharedValue(false);
  const entryOpacity = useSharedValue(0);
  const entryTranslateY = useSharedValue(30);

  useEffect(() => {
    const timer = setTimeout(() => {
      entryOpacity.value = withTiming(1, { duration: 400 });
      entryTranslateY.value = withTiming(0, { duration: 400 });
    }, 160 + index * 80);
    return () => clearTimeout(timer);
  }, [entryOpacity, entryTranslateY, index]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [
      { translateY: entryTranslateY.value },
      { scale: hovered.value ? withTiming(1.05) : 1 },
    ],
    shadowColor: hovered.value ? Colors.primary : Colors.ink,
    shadowOpacity: hovered.value ? withTiming(0.2) : 0.04,
    shadowRadius: hovered.value ? withTiming(16) : 4,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hovered.value ? withTiming(-2) : withTiming(0) }],
  }));

  return (
    <Animated.View style={[styles.featCard, cardStyle]}>
      <Pressable
        onHoverIn={() => { hovered.value = true; }}
        onHoverOut={() => { hovered.value = false; }}
        onPress={() => InkTransition.trigger(() => router.push(feature.to as any))}
        style={styles.featCardInner}
        accessibilityRole="button"
        accessibilityLabel={feature.label}
      >
        <Animated.View style={[styles.featImageWrap, iconStyle]}>
          <Image
            source={feature.image}
            style={styles.featImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={[styles.featTag, { backgroundColor: feature.color }]}>
            <Text style={styles.featTagText}>{feature.tag}</Text>
          </View>
        </Animated.View>
        <Text style={styles.featLabel}>{feature.label}</Text>
        <Text style={styles.featDesc}>{feature.desc}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── 探索灵山（功能入口） ───
function FeatureSection() {
  return (
    <View style={styles.feat}>
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>探索灵山</Text>
        <Text style={styles.secSub}>EXPLORE</Text>
        <View style={styles.secLine} />
      </View>
      <View style={styles.featGrid}>
        {FEATURES.map((f, index) => (
          <FeatureCard key={f.to} feature={f} index={index} />
        ))}
      </View>
    </View>
  );
}

export default function HomePage() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const scrollY = useSharedValue(0);
  const [indicatorCollapsed, setIndicatorCollapsed] = useState(false);
  const [showGuidePlan, setShowGuidePlan] = useState(false);
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [tourState, tourActions] = useTour();
  const homeDigitalHuman: PageDigitalHumanDockDriver = useDigitalHumanDriver(
    DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
    { speakerId: 'home-hero' },
  );

  const onScroll = useCallback((e: any) => {
    scrollY.value = e.nativeEvent.contentOffset.y;
  }, [scrollY]);

  // GPS定位
  const { distanceInfo } = useTourGeolocation(
    tourState.preferences.mode === 'tour' && tourState.currentSpot
      ? {
          id: tourState.currentSpot.id,
          name: tourState.currentSpot.name,
          latitude: tourState.currentSpot.latitude,
          longitude: tourState.currentSpot.longitude,
        }
      : null,
    { enabled: tourState.preferences.mode === 'tour' && !!tourState.currentRoute },
  );

  // 数字人GPS距离引导
  useTourGuide(distanceInfo, {
    vrmSpeak: speakWithDigitalHuman,
    enabled: isFocused && tourState.preferences.mode === 'tour' && !!tourState.currentRoute,
  });

  // ─── 到达景点 → 跳转到详情页 ───
  const hasNavigatedToSpotRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isFocused) return;
    if (tourState.status === 'navigate' && tourState.currentSpot) {
      if (hasNavigatedToSpotRef.current === tourState.currentSpot.id) return;
      hasNavigatedToSpotRef.current = tourState.currentSpot.id;
      router.push(`/attractions/${tourState.currentSpot.id}`);
    }
  }, [isFocused, tourState.status, tourState.currentSpot?.id, router]);

  // 打卡成功时重置
  useEffect(() => {
    if (tourState.checkinResult?.success) {
      setIndicatorCollapsed(false);
      hasNavigatedToSpotRef.current = null;
    }
  }, [tourState.checkinResult?.success]);

  // 首页获得焦点时：数字人欢迎
  useEffect(() => {
    if (!isFocused) return undefined;

    let timer: ReturnType<typeof setTimeout> | null = null;
    homeDigitalHuman.activate();
    stopDigitalHumanSpeech(false);
    setDigitalHumanPageContext('home');

    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        setDigitalHumanPageContext('home');
        speakWithDigitalHuman('欢迎来到灵山胜境，我是小灵，今天由我带你游灵山', 'happy', {
          action: 'wave',
          actionDuration: 1600,
          replaceCurrent: true,
        });
      }, HOME_DIGITAL_HUMAN_GREETING_DELAY_MS);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [isFocused]);

  // ─── 地图自由探索 ───
  const handleFreeExplore = useCallback(() => {
    speakWithDigitalHuman('好的，先打开地图自由逛。你看到感兴趣的景点，随时问我。', 'happy');
    router.push('/map');
  }, [router]);

  // ─── 小灵带路 → 打开方案弹窗 ───
  const handleGuidedTour = useCallback(() => {
    setShowGuidePlan(true);
  }, []);

  // ─── 方案弹窗: 协同导览 ───
  const handleCollabTour = useCallback(() => {
    setShowGuidePlan(false);
    router.push('/explore');
  }, [router]);

  // ─── 方案弹窗: 选择路线 ───
  const handleSelectRoute = useCallback((route: RouteOption) => {
    setShowGuidePlan(false);
    const tourRoute: Route = {
      id: route.id,
      name: route.name.replace(/^[^\s]+\s/, ''),
      description: route.description,
      spots: enrichSpotsWithLocations(route.spots.map(s => ({ ...s, description: '', latitude: 0, longitude: 0 }))),
      duration: route.duration,
      route_type: route.difficulty === 'easy' ? 'zen' : route.difficulty === 'medium' ? 'classic' : 'nature',
    };
    tourActions.startTour(tourRoute);
    speakWithDigitalHuman(`好的，我们选择${route.name}，全程约${route.duration}，现在出发！`, 'happy');
  }, [tourActions.startTour]);

  // ─── 方案弹窗: 关闭 ───
  const handleCloseGuidePlan = useCallback(() => {
    setShowGuidePlan(false);
  }, []);

  // ─── CheckinPanel: 拍照打卡 ───
  const handleCheckinPhoto = useCallback(() => {
    tourActions.setCheckinIntent('photo');
    if (tourState.currentSpot) {
      tourActions.setPendingCheckin({
        spotId: tourState.currentSpot.id,
        spotName: tourState.currentSpot.name,
        type: 'photo',
        timestamp: Date.now(),
      });
    }
    router.push('/explore');
  }, [tourActions, tourState.currentSpot, router]);

  // ─── CheckinPanel: 扫码打卡 ───
  const handleCheckinScan = useCallback(() => {
    tourActions.setCheckinIntent('scan');
    if (tourState.currentSpot) {
      tourActions.setPendingCheckin({
        spotId: tourState.currentSpot.id,
        spotName: tourState.currentSpot.name,
        type: 'scan',
        timestamp: Date.now(),
      });
    }
    router.push('/explore');
  }, [tourActions, tourState.currentSpot, router]);

  // ─── CheckinPanel: 直接打卡 ───
  const handleCheckinDirect = useCallback(async () => {
    if (tourState.currentSpot) {
      const result = await tourActions.completeSpot(tourState.currentSpot);
      if (result.success) {
        tourActions.setPendingCheckin({
          spotId: tourState.currentSpot.id,
          spotName: tourState.currentSpot.name,
          type: 'direct',
          timestamp: Date.now(),
        });
        setShowMemoryPrompt(true);
        speakWithDigitalHuman(`打卡成功！${tourState.currentSpot.name}已记录`, 'happy');
      }
    }
  }, [tourActions, tourState.currentSpot]);

  // ─── MemoryPrompt: 加入记忆 ───
  const handleAddMemory = useCallback(() => {
    setShowMemoryPrompt(false);
    router.push('/memory');
  }, [router]);

  // ─── MemoryPrompt: 跳过 ───
  const handleSkipMemory = useCallback(() => {
    setShowMemoryPrompt(false);
    tourActions.clearPendingCheckin();
  }, [tourActions.clearPendingCheckin]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection
          scrollY={scrollY}
          onFreeExplore={handleFreeExplore}
          onGuidedTour={handleGuidedTour}
        />
        <FeatureSection />
        <BrushDivider />
        <Suspense fallback={null}>
          <IntroSection />
        </Suspense>
        <BrushDivider />
        <Suspense fallback={null}>
          <FeaturedSpots />
        </Suspense>
        <Suspense fallback={null}>
          <FooterSection />
        </Suspense>
      </ScrollView>

      <PageDigitalHumanDock digitalHuman={homeDigitalHuman} />

      {/* 导览进度指示器 */}
      {tourState.currentRoute && tourState.progress.total > 0 && (
        <View style={styles.progressOverlay}>
          <TourProgressIndicator
            progress={tourState.progress}
            currentRoute={tourState.currentRoute}
            status={tourState.status}
            distance={distanceInfo?.distance}
            collapsed={indicatorCollapsed}
            onToggleCollapse={() => setIndicatorCollapsed(!indicatorCollapsed)}
            onResume={() => {
              if (tourState.status === 'paused') {
                tourActions.resumeTour();
              }
            }}
            onEnd={tourActions.endTour}
          />
        </View>
      )}

      {/* 导览方案选择弹窗 */}
      <GuidePlanModal
        visible={showGuidePlan}
        onSelectRoute={handleSelectRoute}
        onCollabTour={handleCollabTour}
        onClose={handleCloseGuidePlan}
      />

      {/* 记忆写入询问弹窗 */}
      {tourState.pendingCheckin && (
        <MemoryPrompt
          visible={showMemoryPrompt}
          spotName={tourState.pendingCheckin.spotName}
          photoUri={tourState.pendingCheckin.photoUri}
          onAddMemory={handleAddMemory}
          onSkip={handleSkipMemory}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },

  // 进度指示器覆盖层
  progressOverlay: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    zIndex: 50,
  },

  // ─────────────────────────────────────
  //  HERO 大图 + 弧形过渡 + 数字人半露
  // ─────────────────────────────────────
  heroWrap: {
    width: '100%', height: HERO_H, position: 'relative',
  },
  heroOverlayDeep: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,30,25,0.15)',
  },
  heroOverlayVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // 装饰性云层
  heroCloud1: {
    position: 'absolute', top: 60, right: -20,
    width: 120, height: 40, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '-8deg' }],
  },
  heroCloud2: {
    position: 'absolute', top: 100, right: 30,
    width: 80, height: 30, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ rotate: '-5deg' }],
  },
  heroCloud3: {
    position: 'absolute', bottom: 120, left: -30,
    width: 100, height: 35, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ rotate: '10deg' }],
  },

  // 飘落粒子层
  particlesWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },

  // Hero 内容
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
    zIndex: 3,
  },
  userEntryBtn: {
    position: 'absolute', top: 12, right: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    minHeight: 44,
  },
  userEntryIcon: { fontSize: 14 },
  userEntryText: { fontSize: 13, color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
  // 印章
  seal: {
    width: 52, height: 52,
    borderWidth: 2.5, borderColor: 'rgba(200,75,49,0.9)',
    borderRadius: 6, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    opacity: 0, transform: [{ rotate: '-15deg' }, { scale: 1.5 }],
    shadowColor: 'rgba(200,75,49,0.4)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12,
  },
  sealIn: { opacity: 1, transform: [{ rotate: '-5deg' }, { scale: 1 }] },
  sealTxt: { fontSize: 22, color: 'rgba(200,75,49,0.95)', fontWeight: '900' },
  sealInner: {
    position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1.5, borderColor: 'rgba(200,75,49,0.4)', borderRadius: 3,
  },
  heroTitle: {
    fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 20,
    textAlign: 'center',
  },
  heroSubEn: {
    fontSize: 11, letterSpacing: 6, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 14,
  },
  heroDivider: {
    width: 120, height: 1.5, marginBottom: 14,
    backgroundColor: 'rgba(200,75,49,0.6)',
  },
  heroPoem: {
    fontSize: 16, letterSpacing: 8, color: 'rgba(255,255,255,0.95)', marginBottom: 28,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },

  // ─── 双入口卡片 ───
  entryCards: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
  },
  entryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  entryCardActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#C84B31',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  entryCardInner: {
    padding: 12,
    alignItems: 'center',
    minHeight: 158,
  },
  entryImageWrap: {
    width: '100%',
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3E8D5',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
  },
  entryImage: {
    width: '100%',
    height: '100%',
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1614',
    letterSpacing: 2,
    marginBottom: 4,
  },
  entryDesc: {
    fontSize: 11,
    color: 'rgba(26,22,20,0.55)',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
  },
  entryCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryCta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A9C89',
    letterSpacing: 1,
  },
  entryCtaArrow: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ─── 弧形过渡区域 ───
  heroCurveWrap: {
    position: 'absolute', bottom: -30, left: 0, right: 0,
    height: 60, zIndex: 3,
    alignItems: 'center',
  },
  heroCurve: {
    width: '100%', height: 60,
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },

  // ═══════════════════════════════════════
  //  Shared Section Header
  // ═══════════════════════════════════════
  secHead: { alignItems: 'center', marginBottom: 20 },
  secTitle: { fontSize: 20, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  secSub: { fontSize: 9, letterSpacing: 3, color: Colors.gray400, marginTop: 5 },
  secLine: { width: 28, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 10, opacity: 0.6 },

  // ═══════════════════════════════════════
  //  探索灵山 3列
  // ═══════════════════════════════════════
  feat: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 28, backgroundColor: Colors.paper },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featCard: {
    width: '30.5%', backgroundColor: '#fff', borderRadius: 12,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    elevation: 2, overflow: 'hidden',
  },
  featCardInner: {
    paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 5,
    minHeight: 136,
  },
  featImageWrap: {
    width: '100%',
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3E8D5',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    marginBottom: 3,
  },
  featImage: {
    width: '100%',
    height: '100%',
  },
  featTag: {
    position: 'absolute',
    left: 5,
    top: 5,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
  },
  featTagText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0,
  },
  featLabel: { fontSize: 12, fontWeight: '700', color: Colors.ink, letterSpacing: 1 },
  featDesc: { fontSize: 10, color: Colors.gray400, textAlign: 'center', lineHeight: 14 },

});
