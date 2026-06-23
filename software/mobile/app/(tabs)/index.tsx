import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
  withRepeat, withSequence, withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { setDigitalHumanPageContext, speakWithDigitalHuman } from '@/services/digitalHuman';

import { InkTransition } from '@/components/ui/InkTransition';
import { BrushDivider } from '@/components/ui/BrushDivider';
import { Colors } from '@/constants/colors';
import TourProgressIndicator from '@/components/guide/TourProgressIndicator';
import { GuidePlanModal, type RouteOption } from '@/components/guide/GuidePlanModal';
import { MemoryPrompt } from '@/components/guide/MemoryPrompt';
import { useTour } from '@/context/TourContext';
import { useUserStore } from '@/stores/userStore';
import type { Route } from '@/hooks/useTourOrchestrator';
import { useTourGeolocation } from '@/hooks/useTourGeolocation';
import { useTourGuide } from '@/hooks/useTourGuide';
import { enrichSpotsWithLocations } from '@/constants/spot-locations';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = 560;
const CAROUSEL_W = 230;

// ─── 景点图片映射 ───
const SPOT_IMAGES: Record<string, any> = {
  'ling-shan-da-fo': require('../../assets/images/bigfo.png'),
  'jiu-long-guan-yu': require('../../assets/images/nine-dragon.png'),
  'fan-gong': require('../../assets/images/fangong.png'),
  'wu-yin-tan-cheng': require('../../assets/images/wuyin.png'),
  'xiang-fu-chan-si': require('../../assets/images/xiangfu.png'),
  'fo-shou-guang-chang': require('../../assets/images/foshouguangchang.jpg'),
  'bai-zi-xi-mi-le': require('../../assets/images/baizi.png'),
  'man-fei-long-ta': require('../../assets/images/manfeilong.png'),
  'ling-shan-jing-she': require('../../assets/images/jingshe.jpg'),
  'ling-shan-da-zhao-bi': require('../../assets/images/dazhaobi.jpg'),
  'pu-ti-da-dao': require('../../assets/images/putidadao.jpg'),
  'wu-ming-qiao': require('../../assets/images/wumingqiao.jpg'),
  'fo-zu-tan': require('../../assets/images/fozutai.jpg'),
  'wu-zhi-men': require('../../assets/images/wuzhimen.jpg'),
  'xiang-mo-fu-diao': require('../../assets/images/fudiao.jpg'),
  'a-yu-wang-zhu': require('../../assets/images/yuzhu.png'),
  'fo-jiao-wen-hua-blan-guan': require('../../assets/images/wuming.jpg'),
  'san-sheng-dian': require('../../assets/images/sansheng.png'),
  'wu-jin-yi-zhai': require('../../assets/images/wujinyizhai.jpg'),
};

const FEATURES = [
  { to: '/chat', label: '对话导览', desc: '与数字人对话', icon: '话', color: '#6A9C89', bg: '#E8F2EE' },
  { to: '/attractions', label: '景点探索', desc: '浏览所有景点', icon: '景', color: '#C84B31', bg: '#FCECE9' },
  { to: '/map', label: '景区导航', desc: '实时导航', icon: '导', color: '#2A4D6E', bg: '#E8EEF4' },
  { to: '/explore', label: '路线导航', desc: '数字人带路', icon: '路', color: '#4A7C6E', bg: '#E8F2EE' },
  { to: '/history', label: '时空穿越', desc: '穿越千年', icon: '古', color: '#6BA292', bg: '#E8F2EE' },
  { to: '/memory', label: '旅行记忆', desc: '记录旅途', icon: '忆', color: '#C8A951', bg: '#FDF6E3' },
];

const SPOTS = [
  { id: 'ling-shan-da-fo', name: '灵山大佛', desc: '世界第一高青铜立佛，高88米', tag: '必游' },
  { id: 'jiu-long-guan-yu', name: '九龙灌浴', desc: '大型音乐动态群雕表演', tag: '热门' },
  { id: 'fan-gong', name: '梵宫', desc: '佛教文化艺术殿堂', tag: '推荐' },
  { id: 'wu-yin-tan-cheng', name: '五印坛城', desc: '藏传佛教文化景观', tag: '特色' },
  { id: 'man-fei-long-ta', name: '曼飞龙塔', desc: '南传佛教象征建筑', tag: '推荐' },
];

// ─── 飘落粒子 ───
const PARTICLE_COLORS = [
  'rgba(200,169,81,0.35)',
  'rgba(106,156,137,0.35)',
  'rgba(200,75,49,0.2)',
  'rgba(255,255,255,0.25)',
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
  const particles = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({
      size: 3 + Math.random() * 5,
      x: 5 + Math.random() * 90,
      delay: Math.random() * 4000,
      duration: 8000 + Math.random() * 7000,
      sway: 8 + Math.random() * 15,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    })),
    [],
  );
  return (
    <View style={styles.particlesWrap} pointerEvents="none">
      {particles.map((p, i) => <Particle key={i} config={p} />)}
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
          source={require('../../assets/images/hero-bg.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
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

        <Text style={styles.heroTitle}>灵山数字导览人</Text>
        <Text style={styles.heroSubEn}>LINGSHAN DIGITAL GUIDE</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroPoem}>AI 数字人 · 全程智慧伴游</Text>

        {/* ─── 双入口卡片 ─── */}
        <View style={styles.entryCards}>
          {/* 独自游览 */}
          <Pressable
            style={({ pressed }) => [
              styles.entryCard,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            onPress={onFreeExplore}
            accessibilityRole="button"
            accessibilityLabel="开始独自游览"
          >
            <View style={styles.entryCardInner}>
              <View style={[styles.entryIconWrap, { backgroundColor: 'rgba(106,156,137,0.18)' }]}>
                <Text style={[styles.entryIconText, { color: '#6A9C89' }]}>游</Text>
              </View>
              <Text style={styles.entryTitle}>独自游览</Text>
              <Text style={styles.entryDesc}>小灵陪你一个人走完整条路线</Text>
              <View style={styles.entryCtaRow}>
                <Text style={styles.entryCta}>开始独游</Text>
                <Text style={[styles.entryCtaArrow, { color: '#6A9C89' }]}>→</Text>
              </View>
            </View>
          </Pressable>

          {/* 主动导览 */}
          <Pressable
            style={({ pressed }) => [
              styles.entryCard,
              styles.entryCardActive,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            onPress={onGuidedTour}
            accessibilityRole="button"
            accessibilityLabel="选择主动导览方案"
          >
            <View style={styles.entryCardInner}>
              <View style={[styles.entryIconWrap, { backgroundColor: 'rgba(200,75,49,0.15)' }]}>
                <Text style={[styles.entryIconText, { color: '#C84B31' }]}>导</Text>
              </View>
              <Text style={styles.entryTitle}>主动导览</Text>
              <Text style={styles.entryDesc}>数字人全程讲解带路</Text>
              <View style={styles.entryCtaRow}>
                <Text style={[styles.entryCta, { color: '#C84B31' }]}>选择方案</Text>
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
function FeatureCard({ feature, index, inView }: {
  feature: typeof FEATURES[0];
  index: number;
  inView: Animated.SharedValue<boolean>;
}) {
  const router = useRouter();
  const hovered = useSharedValue(false);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: inView.value ? withDelay(index * 80, withTiming(1, { duration: 400 })) : 0,
    transform: [
      { translateY: inView.value ? withDelay(index * 80, withTiming(0, { duration: 400 })) : 30 },
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
        <Animated.View style={[styles.featIcon, { backgroundColor: feature.bg, borderColor: feature.color + '30' }, iconStyle]}>
          <Text style={[styles.featChar, { color: feature.color }]}>{feature.icon}</Text>
        </Animated.View>
        <Text style={styles.featLabel}>{feature.label}</Text>
        <Text style={styles.featDesc}>{feature.desc}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── 探索灵山（功能入口） ───
function FeatureSection() {
  const inView = useSharedValue(false);
  const sectionRef = useRef<View>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      sectionRef.current?.measureInWindow((x, y, w, h) => {
        if (y < SCREEN_H * 0.8 && !inView.value) inView.value = true;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <View ref={sectionRef} style={styles.feat}>
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>探索灵山</Text>
        <Text style={styles.secSub}>EXPLORE</Text>
        <View style={styles.secLine} />
      </View>
      <View style={styles.featGrid}>
        {FEATURES.map((f, index) => (
          <FeatureCard key={f.to} feature={f} index={index} inView={inView} />
        ))}
      </View>
    </View>
  );
}

// ─── 关于灵山 ───
function IntroSection() {
  const inView = useSharedValue(false);
  const sectionRef = useRef<View>(null);
  const breath = useSharedValue(0.3);

  useEffect(() => {
    const timer = setInterval(() => {
      sectionRef.current?.measureInWindow((x, y, w, h) => {
        if (y < SCREEN_H * 0.8 && !inView.value) inView.value = true;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
  }, []);

  const text1Style = useAnimatedStyle(() => ({
    opacity: inView.value ? withTiming(1, { duration: 600 }) : 0,
    transform: [{ translateY: inView.value ? withTiming(0, { duration: 600 }) : 20 }],
  }));

  const text2Style = useAnimatedStyle(() => ({
    opacity: inView.value ? withDelay(200, withTiming(1, { duration: 600 })) : 0,
    transform: [{ translateY: inView.value ? withDelay(200, withTiming(0, { duration: 600 })) : 20 }],
  }));

  const cornerStyle = useAnimatedStyle(() => ({
    opacity: breath.value,
  }));

  return (
    <View ref={sectionRef} style={styles.intro}>
      <View style={styles.inkBlot1} />
      <View style={styles.inkBlot2} />
      <Animated.View style={[styles.cornerTL, cornerStyle]} />
      <Animated.View style={[styles.cornerTR, cornerStyle]} />
      <Animated.View style={[styles.cornerBL, cornerStyle]} />
      <Animated.View style={[styles.cornerBR, cornerStyle]} />
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>关于灵山</Text>
        <Text style={styles.secSub}>ABOUT LINGSHAN</Text>
        <View style={styles.secLine} />
      </View>
      <Animated.Text style={[styles.introTxt, text1Style]}>
        灵山胜境，坐落于太湖之滨，是中国著名的佛教文化圣地。高达88米的灵山大佛、九龙灌浴、梵宫、五印坛城等众多景点，蕴含深厚的佛教文化底蕴。
      </Animated.Text>
      <Animated.Text style={[styles.introTxt, text2Style]}>
        走进灵山，仿佛步入一幅流动的山水画卷。晨钟暮鼓，梵音缭绕，让心灵在这片净土中找到归宿。
      </Animated.Text>
    </View>
  );
}

// ─── 景点卡片（带悬浮效果） ───
function SpotCard({ spot, isActive, onPress }: {
  spot: typeof SPOTS[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isActive ? withTiming(-4) : withTiming(0) }],
    shadowOpacity: isActive ? withTiming(0.12) : 0.06,
    shadowRadius: isActive ? withTiming(12) : 8,
  }));

  return (
    <Animated.View style={[styles.spotCard, cardStyle]}>
      <Pressable
        style={({ pressed }) => [styles.spotCardInner, pressed && { opacity: 0.85 }]}
        onPress={onPress}
      >
        <View style={styles.spotImgWrap}>
          {SPOT_IMAGES[spot.id] ? (
            <Image source={SPOT_IMAGES[spot.id]} style={styles.spotImage} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6A9C89' }]} />
          )}
          <View style={styles.spotFade} />
          <View style={styles.spotTag}>
            <Text style={styles.spotTagTxt}>{spot.tag}</Text>
          </View>
        </View>
        <View style={styles.spotBody}>
          <Text style={styles.spotName}>{spot.name}</Text>
          <Text style={styles.spotDesc} numberOfLines={2}>{spot.desc}</Text>
          <Text style={styles.spotLink}>了解更多 →</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── 精选景点轮播 ───
function FeaturedSpots() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const ITEM_W = CAROUSEL_W + 12;

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIdx + 1) % SPOTS.length;
      scrollRef.current?.scrollTo({ x: next * ITEM_W, animated: true });
      setActiveIdx(next);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeIdx]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const onScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / ITEM_W);
    if (idx !== activeIdx) setActiveIdx(idx);
  }, [activeIdx]);

  return (
    <View style={styles.spots}>
      <View style={styles.spotsHead}>
        <View>
          <Text style={styles.secTitle}>精选景点</Text>
          <Text style={styles.secSub}>FEATURED SPOTS</Text>
        </View>
        <Pressable
          style={styles.seeAllBtn}
          onPress={() => InkTransition.trigger(() => router.push('/attractions'))}
        >
          <Text style={styles.seeAllText}>查看全部 →</Text>
        </Pressable>
      </View>

      {showHint && (
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>← 左右滑动探索更多 →</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spotsScroll}
        snapToInterval={ITEM_W}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SPOTS.map((s, i) => (
          <SpotCard
            key={s.id}
            spot={s}
            isActive={i === activeIdx}
            onPress={() => InkTransition.trigger(() => router.push(`/attractions/${s.id}`))}
          />
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SPOTS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIdx && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── 页脚 ───
function FooterSection() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerMountain}>
        <View style={styles.mountain1} />
        <View style={styles.mountain2} />
        <View style={styles.mountain3} />
      </View>
      <Text style={styles.footerTitle}>智慧灵山胜境 · 数字人导览系统</Text>
      <Text style={styles.footerCopyright}>© 2026 灵山胜境旅游发展有限公司</Text>
    </View>
  );
}

// ─── 主组件 ───
export default function HomePage() {
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const [indicatorCollapsed, setIndicatorCollapsed] = useState(false);
  const [showGuidePlan, setShowGuidePlan] = useState(false);
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [tourState, tourActions] = useTour();

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
    enabled: tourState.preferences.mode === 'tour' && !!tourState.currentRoute,
  });

  // ─── 到达景点 → 跳转到详情页 ───
  const hasNavigatedToSpotRef = useRef<string | null>(null);
  useEffect(() => {
    if (tourState.status === 'navigate' && tourState.currentSpot) {
      if (hasNavigatedToSpotRef.current === tourState.currentSpot.id) return;
      hasNavigatedToSpotRef.current = tourState.currentSpot.id;
      router.push(`/attractions/${tourState.currentSpot.id}`);
    }
  }, [tourState.status, tourState.currentSpot?.id, router]);

  // 打卡成功时重置
  useEffect(() => {
    if (tourState.checkinResult?.success) {
      setIndicatorCollapsed(false);
      hasNavigatedToSpotRef.current = null;
    }
  }, [tourState.checkinResult?.success]);

  // 首次加载：数字人欢迎
  useEffect(() => {
    setDigitalHumanPageContext('home');
    const t = setTimeout(() => {
      speakWithDigitalHuman('欢迎来到灵山胜境，我是您的数字导览员小灵', 'neutral');
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  // ─── 独自游览 ───
  const handleFreeExplore = useCallback(() => {
    speakWithDigitalHuman('好的，今天我陪你一个人逛。先选一个独游节奏，我来安排路线。', 'happy');
    setShowGuidePlan(true);
  }, []);

  // ─── 主动导览 → 打开方案弹窗 ───
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
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection
          scrollY={scrollY}
          onFreeExplore={handleFreeExplore}
          onGuidedTour={handleGuidedTour}
        />
        <FeatureSection />
        <BrushDivider />
        <IntroSection />
        <BrushDivider />
        <FeaturedSpots />
        <FooterSection />
      </ScrollView>

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
    zIndex: 2,
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
    padding: 16,
    alignItems: 'center',
    minHeight: 148,
  },
  entryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryIconText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'MaShanZheng',
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
    paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 5,
    minHeight: 112,
  },
  featIcon: {
    width: 42, height: 42, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  featChar: { fontSize: 20, fontWeight: '700', fontFamily: 'MaShanZheng' },
  featLabel: { fontSize: 12, fontWeight: '700', color: Colors.ink, letterSpacing: 1 },
  featDesc: { fontSize: 10, color: Colors.gray400, textAlign: 'center', lineHeight: 14 },

  // ═══════════════════════════════════════
  //  关于灵山
  // ═══════════════════════════════════════
  intro: {
    paddingHorizontal: 22, paddingTop: 28, paddingBottom: 28,
    backgroundColor: Colors.paper, position: 'relative', overflow: 'hidden',
  },
  inkBlot1: {
    position: 'absolute', top: -30, left: -20,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(107,162,146,0.06)',
  },
  inkBlot2: {
    position: 'absolute', bottom: -20, right: -30,
    width: 250, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(42,77,110,0.04)',
  },
  cornerTL: { position: 'absolute', top: 14, left: 14, width: 18, height: 18, borderTopWidth: 2, borderLeftWidth: 2, borderColor: Colors.primary },
  cornerTR: { position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderColor: Colors.primary },
  cornerBL: { position: 'absolute', bottom: 14, left: 14, width: 18, height: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: Colors.primary },
  cornerBR: { position: 'absolute', bottom: 14, right: 14, width: 18, height: 18, borderBottomWidth: 2, borderRightWidth: 2, borderColor: Colors.primary },
  introTxt: { fontSize: 13, lineHeight: 24, color: Colors.gray600, textAlign: 'justify', marginBottom: 14 },

  // ═══════════════════════════════════════
  //  精选景点轮播
  // ═══════════════════════════════════════
  spots: { paddingTop: 28, paddingBottom: 32, backgroundColor: Colors.paperWarm },
  spotsHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 18, marginBottom: 18,
  },
  seeAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(106,156,137,0.3)',
  },
  seeAllText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  spotsScroll: { gap: 12, paddingHorizontal: 18 },
  swipeHint: {
    alignItems: 'center', paddingVertical: 8, marginBottom: 10,
  },
  swipeHintText: {
    fontSize: 11, color: Colors.gray400, letterSpacing: 2,
  },
  spotCard: {
    width: CAROUSEL_W, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  spotCardInner: {},
  spotImgWrap: { height: 160, position: 'relative', overflow: 'hidden', backgroundColor: '#E8F2EE' },
  spotImage: { width: '100%', height: '100%' },
  spotFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  spotTag: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(200,75,49,0.85)', borderRadius: 3,
  },
  spotTagTxt: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  spotBody: { padding: 14 },
  spotName: { fontSize: 15, fontWeight: '700', color: Colors.ink, letterSpacing: 1, marginBottom: 6 },
  spotDesc: { fontSize: 12, color: Colors.gray500, lineHeight: 18, marginBottom: 8 },
  spotLink: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gray300 },
  dotActive: { width: 18, backgroundColor: Colors.primary },

  // ═══════════════════════════════════════
  //  页脚
  // ═══════════════════════════════════════
  footer: {
    paddingHorizontal: 20, paddingBottom: 100,
    backgroundColor: Colors.ink, alignItems: 'center',
  },
  footerMountain: {
    width: '100%', height: 40, marginBottom: 18,
    position: 'relative', overflow: 'hidden',
  },
  mountain1: {
    position: 'absolute', bottom: 0, left: '10%',
    width: 0, height: 0,
    borderLeftWidth: 55, borderRightWidth: 55, borderBottomWidth: 38,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(106,156,137,0.15)',
  },
  mountain2: {
    position: 'absolute', bottom: 0, left: '35%',
    width: 0, height: 0,
    borderLeftWidth: 70, borderRightWidth: 70, borderBottomWidth: 48,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(106,156,137,0.2)',
  },
  mountain3: {
    position: 'absolute', bottom: 0, right: '10%',
    width: 0, height: 0,
    borderLeftWidth: 45, borderRightWidth: 45, borderBottomWidth: 32,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(106,156,137,0.12)',
  },
  footerTitle: { fontSize: 12, color: Colors.gray300, letterSpacing: 3, marginBottom: 6 },
  footerCopyright: { fontSize: 10, color: 'rgba(168,161,152,0.5)' },
});
