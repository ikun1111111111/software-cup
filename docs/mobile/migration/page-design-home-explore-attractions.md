# 移动端页面设计：首页 / 云游胜境 / 莲台宝地

> 三个核心页面的详细设计 + VRM 数字人讲解集成  
> **版本**: v1.0 | **日期**: 2026-06-08

---

## 一、首页（启扉）

### 1.1 整体结构

与 Web 版保持相似的纵向分区结构，针对移动端优化触摸交互，VRM 数字人浮窗贯穿全程。

```
┌──────────────────────────┐
│ StatusBar                │
├──────────────────────────┤
│                          │
│    Hero 全屏背景          │
│    灵山胜境               │
│    一步一景 · 一景一画     │
│                          │
│   [开启旅程] [对话导览]   │
│                          │
│        ↓ 向下探索         │
│                          │
├──────────────────────────┤
│                          │
│    关于灵山               │
│    简介文字（书札排版）    │
│                          │
├──────────────────────────┤
│                          │
│    探索灵山               │
│   ┌────┐ ┌────┐ ┌────┐  │
│   │对话│ │景点│ │导航│  │
│   │导览│ │探索│ │通幽│  │
│   └────┘ └────┘ └────┘  │
│   ┌────┐ ┌────┐ ┌────┐  │
│   │时空│ │记忆│ │3D │  │
│   │穿越│ │    │ │展示│  │
│   └────┘ └────┘ └────┘  │
│                          │
├──────────────────────────┤
│                          │
│    精选景点  [查看全部 →]  │
│  ┌─────────────────────┐ │
│  │ ◀ ████  ████  ████ ▶│ │
│  │   灵山   九龙  梵宫  │ │
│  │   大佛   灌浴       │ │
│  └─────────────────────┘ │
│                          │
├──────────────────────────┤
│                          │
│   ┌──────┐               │
│   │ VRM  │ 您的专属导览员 │
│   │ 小灵 │ 我是小灵...    │
│   │ 3D   │ [开始对话 →]  │
│   └──────┘               │
│                          │
├──────────────────────────┤
│  山景剪影 Footer          │
│  © 灵山胜境               │
├──────────────────────────┤
│ Tab Bar                  │
│ 启扉 │ 问讯 │ 云游 │ 甄选 │
└──────────────────────────┘

  ┌──────┐
  │ VRM  │  ← 右下角浮窗，始终跟随
  │ 小灵  │     进入页面时自动欢迎讲解
  └──────┘
```

### 1.2 VRM 数字人行为

| 时机 | 行为 | 表情 | 台词 |
|------|------|------|------|
| 页面加载完成 | 浮窗从小变大弹出 | neutral → happy | "欢迎来到灵山胜境，让我为您导览吧" |
| 用户停止滑动 3 秒 | 自动进入 idle（眨眼 + 呼吸） | neutral | — |
| 用户滑到"精选景点" | 主动推荐 | happy | "为您推荐灵山大佛，来灵山不可错过" |
| 用户点击浮窗 | 展开为半屏对话 | — | 跳转到对话页 |

### 1.3 完整代码

```typescript
// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VRMFloating } from '../../components/vrm/VRMFloating';
import { VRMManager } from '../../components/vrm/VRMManager';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── 数据 ───
const FEATURES = [
  { to: '/chat', label: '对话导览', desc: '与AI数字人对话', color: '#6A9C89', bg: '#E8F2EE' },
  { to: '/attractions', label: '景点探索', desc: '浏览所有景点', color: '#C84B31', bg: '#FCECE9' },
  { to: '/navigate', label: '路线导航', desc: '数字人带路', color: '#2A4D6E', bg: '#E8EEF4' },
  { to: '/history', label: '时空穿越', desc: '穿越千年', color: '#6BA292', bg: '#E8F2EE' },
  { to: '/memory', label: '旅行记忆', desc: '记录旅途', color: '#C8A951', bg: '#FDF6E3' },
  { to: '/vrm', label: '3D展示', desc: 'VRM模型', color: '#8B5CF6', bg: '#F3EEFF' },
];

const SPOTS = [
  { id: 'LS-011', name: '灵山大佛', desc: '世界第一高青铜立佛', img: require('../../assets/images/bigfo.png'), tag: '必游' },
  { id: 'LS-006', name: '九龙灌浴', desc: '佛教文化主题表演', img: require('../../assets/images/nine-dragon.png'), tag: '热门' },
  { id: 'LS-013', name: '梵宫', desc: '佛教艺术殿堂', img: require('../../assets/images/fangong.png'), tag: '推荐' },
];

// ─── Hero 区域 ───
function HeroSection({ scrollY }: { scrollY: Animated.SharedValue<number> }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // 视差：背景图以 0.3x 速率移动
  const bgStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 500],
      [0, 150],
      { extrapolateRight: Extrapolation.CLAMP }
    );
    return { transform: [{ translateY }] };
  });

  // 标题渐隐
  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 300],
      [1, 0],
      { extrapolateRight: Extrapolation.CLAMP }
    );
    return { opacity };
  });

  return (
    <View style={styles.heroContainer}>
      {/* 背景图 — 视差 */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <Image
          source={require('../../assets/images/hero-bg.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </Animated.View>

      {/* 渐变遮罩 */}
      <View style={styles.heroOverlay} />

      {/* 内容 */}
      <Animated.View style={[styles.heroContent, titleStyle]}>
        {/* 印章 */}
        <View style={[styles.seal, loaded && styles.sealVisible]}>
          <Text style={styles.sealText}>灵</Text>
          <View style={styles.sealInner} />
        </View>

        <Text style={styles.heroTitle}>灵山胜境</Text>
        <Text style={styles.heroSubEn}>LINGSHAN SACRED LAND</Text>

        <View style={styles.heroDivider} />

        <Text style={styles.heroPoem}>一步一景 · 一景一画</Text>

        <View style={styles.heroBtns}>
          <Pressable
            style={({ pressed }) => [
              styles.heroBtnPrimary,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push('/attractions')}
          >
            <Text style={styles.heroBtnPrimaryText}>开启旅程</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.heroBtnSecondary,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => router.push('/chat')}
          >
            <Text style={styles.heroBtnSecondaryText}>对话导览</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* 向下提示 */}
      <View style={styles.scrollHint}>
        <Text style={styles.scrollHintText}>向下探索</Text>
        <Text style={styles.scrollHintArrow}>↓</Text>
      </View>
    </View>
  );
}

// ─── 简介区域 ───
function IntroSection() {
  return (
    <View style={styles.introSection}>
      <View style={styles.cornerTL} />
      <View style={styles.cornerTR} />
      <View style={styles.cornerBL} />
      <View style={styles.cornerBR} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>关于灵山</Text>
        <Text style={styles.sectionSub}>ABOUT LINGSHAN</Text>
        <View style={styles.titleUnderline} />
      </View>

      <Text style={styles.introText}>
        灵山胜境，坐落于太湖之滨，是中国著名的佛教文化圣地。
        这里不仅有高达88米的灵山大佛，还有九龙灌浴、梵宫、
        五印坛城等众多景点，每一处都蕴含着深厚的佛教文化底蕴。
      </Text>
      <Text style={styles.introText}>
        走进灵山，仿佛步入一幅流动的山水画卷。晨钟暮鼓，梵音缭绕，
        让心灵在这片净土中找到归宿。
      </Text>
    </View>
  );
}

// ─── 功能入口 ───
function FeatureSection() {
  const router = useRouter();

  return (
    <View style={styles.featureSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>探索灵山</Text>
        <Text style={styles.sectionSub}>EXPLORE</Text>
        <View style={styles.titleUnderline} />
      </View>

      <View style={styles.featureGrid}>
        {FEATURES.map((f) => (
          <Pressable
            key={f.to}
            style={({ pressed }) => [
              styles.featureCard,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push(f.to as any)}
          >
            <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
              <View style={[styles.featureIconDot, { backgroundColor: f.color }]} />
            </View>
            <Text style={styles.featureLabel}>{f.label}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── 精选景点（横向轮播）───
function FeaturedSpots() {
  const router = useRouter();

  return (
    <View style={styles.spotsSection}>
      <View style={styles.spotsHeader}>
        <View>
          <Text style={styles.sectionTitle}>精选景点</Text>
          <Text style={styles.sectionSub}>FEATURED SPOTS</Text>
        </View>
        <Pressable
          style={styles.seeAllBtn}
          onPress={() => router.push('/attractions')}
        >
          <Text style={styles.seeAllText}>查看全部 →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spotsScroll}
        snapToInterval={SCREEN_W * 0.72 + 16}
        decelerationRate="fast"
      >
        {SPOTS.map((spot) => (
          <Pressable
            key={spot.id}
            style={styles.spotCard}
            onPress={() => router.push(`/attractions/${spot.id}`)}
          >
            <View style={styles.spotImageWrap}>
              <Image source={spot.img} style={styles.spotImage} resizeMode="cover" />
              {/* 白色渐变遮罩 */}
              <View style={styles.spotImageFade} />
              {/* 标签 */}
              <View style={styles.spotTag}>
                <Text style={styles.spotTagText}>{spot.tag}</Text>
              </View>
            </View>
            <View style={styles.spotInfo}>
              <Text style={styles.spotName}>{spot.name}</Text>
              <Text style={styles.spotDesc}>{spot.desc}</Text>
              <Text style={styles.spotLink}>了解更多 →</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── 数字人展示区 ───
function DigitalHumanSection() {
  const router = useRouter();

  return (
    <View style={styles.dhSection}>
      <View style={styles.dhContent}>
        {/* VRM 3D 展示 */}
        <View style={styles.dhAvatarWrap}>
          <View style={styles.dhAvatarFrame}>
            <Image
              source={require('../../assets/images/avatar-placeholder.png')}
              style={styles.dhAvatarImg}
              resizeMode="cover"
            />
          </View>
          <View style={styles.dhBadge}>
            <Text style={styles.dhBadgeText}>小灵 · 数字导览员</Text>
          </View>
        </View>

        {/* 文案 */}
        <View style={styles.dhTextWrap}>
          <Text style={styles.dhTitle}>您的专属导览员</Text>
          <View style={styles.dhTitleLine} />
          <Text style={styles.dhDesc}>
            我是小灵，您的灵山胜境数字导览员。
            有任何问题都可以随时向我提问，
            无论是景点介绍、路线规划还是历史文化，
            我都能为您详细解答。
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.dhBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.push('/chat')}
          >
            <Text style={styles.dhBtnText}>开始对话 →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── 页脚 ───
function FooterSection() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerMountain} />
      <Text style={styles.footerTitle}>智慧灵山胜境 · 数字人导览系统</Text>
      <Text style={styles.footerCopyright}>
        © 2026 灵山胜境旅游发展有限公司
      </Text>
    </View>
  );
}

// ─── 主组件 ───
export default function HomePage() {
  const scrollY = useSharedValue(0);
  const vrmRef = useRef<VRMManager>();

  // 监听滚动，触发数字人讲解
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  useEffect(() => {
    // 进入页面 → 数字人欢迎
    const timer = setTimeout(() => {
      vrmRef.current?.speak(
        '欢迎来到灵山胜境，让我为您导览吧',
        'happy'
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection scrollY={scrollY} />
        <IntroSection />
        <FeatureSection />
        <FeaturedSpots />
        <DigitalHumanSection />
        <FooterSection />
      </ScrollView>

      {/* VRM 浮窗 — 右下角 */}
      <VRMFloating
        ref={vrmRef}
        position="bottom-right"
        onPress={() => {
          // 点击浮窗 → 跳转对话页
        }}
      />
    </View>
  );
}

// ─── 样式 ───
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F5F0' },
  scroll: { flex: 1 },

  // Hero
  heroContainer: { width: SCREEN_W, height: Dimensions.get('window').height, position: 'relative', overflow: 'hidden' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: 'linear-gradient(180deg, rgba(26,22,20,0.4) 0%, rgba(26,22,20,0.1) 35%, rgba(26,22,20,0.05) 50%, rgba(26,22,20,0.35) 80%, rgba(26,22,20,0.6) 100%)',
  },
  heroContent: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  seal: {
    width: 52, height: 52,
    borderWidth: 2, borderColor: 'rgba(200,75,49,0.7)',
    borderRadius: 4,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    opacity: 0, transform: [{ rotate: '-15deg' }, { scale: 1.5 }],
  },
  sealVisible: { opacity: 1, transform: [{ rotate: '-5deg' }, { scale: 1 }] },
  sealText: {
    fontSize: 24, color: 'rgba(200,75,49,0.9)',
    fontFamily: 'ZCOOLXiaoWei',
  },
  sealInner: {
    position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
    borderWidth: 1, borderColor: 'rgba(200,75,49,0.3)',
    borderRadius: 2,
  },
  heroTitle: {
    fontSize: 48, fontWeight: '900',
    color: '#fff', letterSpacing: 12,
    fontFamily: 'ZCOOLXiaoWei',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 40,
    marginBottom: 8,
  },
  heroSubEn: {
    fontSize: 11, letterSpacing: 6,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroDivider: {
    width: 180, height: 1,
    background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
    marginBottom: 20,
  },
  heroPoem: {
    fontSize: 18, letterSpacing: 8,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'NotoSerifSC',
    marginBottom: 48,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  heroBtns: { flexDirection: 'row', gap: 16 },
  heroBtnPrimary: {
    paddingHorizontal: 36, paddingVertical: 14,
    background: 'linear-gradient(135deg, #C84B31, #E85D3A)',
    borderRadius: 10,
    shadowColor: '#C84B31', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 20,
  },
  heroBtnPrimaryText: {
    color: '#fff', fontSize: 17, fontWeight: '600',
    fontFamily: 'ZCOOLXiaoWei', letterSpacing: 4,
  },
  heroBtnSecondary: {
    paddingHorizontal: 36, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroBtnSecondaryText: {
    color: '#fff', fontSize: 17, fontWeight: '500',
    fontFamily: 'ZCOOLXiaoWei', letterSpacing: 4,
  },
  scrollHint: {
    position: 'absolute', bottom: 40,
    left: 0, right: 0,
    alignItems: 'center', gap: 10,
  },
  scrollHintText: {
    fontSize: 11, letterSpacing: 6,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'NotoSerifSC',
  },
  scrollHintArrow: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },

  // Intro
  introSection: {
    padding: 60,
    backgroundColor: '#F7F5F0',
    position: 'relative',
  },
  cornerTL: { position: 'absolute', top: 40, left: 40, width: 24, height: 24, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#C0BBB6', opacity: 0.4 },
  cornerTR: { position: 'absolute', top: 40, right: 40, width: 24, height: 24, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#C0BBB6', opacity: 0.4 },
  cornerBL: { position: 'absolute', bottom: 40, left: 40, width: 24, height: 24, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#C0BBB6', opacity: 0.4 },
  cornerBR: { position: 'absolute', bottom: 40, right: 40, width: 24, height: 24, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#C0BBB6', opacity: 0.4 },
  introText: {
    fontSize: 16, lineHeight: 34,
    color: '#5C554C',
    fontFamily: 'NotoSerifSC',
    letterSpacing: 1,
    textAlign: 'justify',
    marginBottom: 20,
  },

  // Shared section header
  sectionHeader: { alignItems: 'center', marginBottom: 36 },
  sectionTitle: {
    fontSize: 28, fontWeight: '700',
    color: '#2A2520',
    fontFamily: 'ZCOOLXiaoWei',
    letterSpacing: 6,
  },
  sectionSub: {
    fontSize: 11, letterSpacing: 6,
    color: '#9E988E', marginTop: 8,
    fontFamily: 'NotoSerifSC',
  },
  titleUnderline: {
    width: 40, height: 3,
    backgroundColor: '#C84B31',
    borderRadius: 2,
    marginTop: 12, opacity: 0.6,
  },

  // Feature Grid
  featureSection: {
    padding: 60,
    backgroundColor: '#F7F5F0',
  },
  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    width: (SCREEN_W - 80 - 32) / 3,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20, alignItems: 'center',
    gap: 10,
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  featureIconDot: { width: 16, height: 16, borderRadius: 8 },
  featureLabel: {
    fontSize: 15, fontWeight: '700',
    fontFamily: 'ZCOOLXiaoWei',
    color: '#2A2520', letterSpacing: 2,
  },
  featureDesc: {
    fontSize: 11, color: '#9E988E',
    textAlign: 'center', lineHeight: 16,
  },

  // Featured Spots
  spotsSection: {
    padding: 60,
    backgroundColor: '#FDFBF7',
  },
  spotsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 24,
  },
  seeAllBtn: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.3)',
  },
  seeAllText: { fontSize: 13, color: '#6A9C89', fontWeight: '500' },
  spotsScroll: { gap: 16, paddingRight: 24 },
  spotCard: {
    width: SCREEN_W * 0.72,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 4,
  },
  spotImageWrap: { aspectRatio: 16 / 10, position: 'relative' },
  spotImage: { width: '100%', height: '100%' },
  spotImageFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '55%',
    background: 'linear-gradient(to top, #fff, transparent)',
  },
  spotTag: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(200,75,49,0.85)',
    borderRadius: 3,
  },
  spotTagText: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    fontFamily: 'NotoSerifSC', letterSpacing: 2,
  },
  spotInfo: { padding: 16 },
  spotName: {
    fontSize: 18, fontWeight: '700',
    fontFamily: 'ZCOOLXiaoWei',
    color: '#2A2520', letterSpacing: 2,
    marginBottom: 6,
  },
  spotDesc: { fontSize: 13, color: '#7A7268', lineHeight: 20 },
  spotLink: {
    fontSize: 12, color: '#6A9C89',
    fontWeight: '500', marginTop: 8,
  },

  // Digital Human
  dhSection: {
    padding: 60,
    backgroundColor: '#F7F5F0',
  },
  dhContent: {
    flexDirection: 'row', alignItems: 'center',
    gap: 32,
  },
  dhAvatarWrap: { position: 'relative' },
  dhAvatarFrame: {
    width: 200, height: 260,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(106,156,137,0.3)',
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12, shadowRadius: 40,
  },
  dhAvatarImg: { width: '100%', height: '100%' },
  dhBadge: {
    position: 'absolute', bottom: -12,
    left: '50%', transform: [{ translateX: -60 }],
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: 'rgba(106,156,137,0.9)',
    borderRadius: 20,
  },
  dhBadgeText: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    fontFamily: 'NotoSerifSC', letterSpacing: 2,
  },
  dhTextWrap: { flex: 1 },
  dhTitle: {
    fontSize: 24, fontWeight: '700',
    fontFamily: 'ZCOOLXiaoWei',
    color: '#2A2520', letterSpacing: 4,
    marginBottom: 8,
  },
  dhTitleLine: {
    width: 48, height: 3,
    backgroundColor: '#C84B31', borderRadius: 2,
    marginBottom: 16,
  },
  dhDesc: {
    fontSize: 14, lineHeight: 28,
    color: '#5C554C',
    fontFamily: 'NotoSerifSC',
    marginBottom: 24,
  },
  dhBtn: {
    paddingHorizontal: 28, paddingVertical: 12,
    background: 'linear-gradient(135deg, #6A9C89, #8CBFAD)',
    borderRadius: 10,
    shadowColor: '#6A9C89', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 16,
  },
  dhBtnText: {
    color: '#fff', fontSize: 16, fontWeight: '600',
    fontFamily: 'ZCOOLXiaoWei', letterSpacing: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24, paddingBottom: 32,
    backgroundColor: '#2A2520',
    alignItems: 'center',
  },
  footerMountain: { height: 60, width: '100%', marginBottom: 32 },
  footerTitle: {
    fontSize: 14, color: '#C0BBB6',
    fontFamily: 'ZCOOLXiaoWei',
    letterSpacing: 4, marginBottom: 8,
  },
  footerCopyright: { fontSize: 11, color: 'rgba(168,161,152,0.5)' },
});
```

---

## 二、云游胜境（探索页）

### 2.1 整体结构

将 Web 的四个模块（地图、拍照识景、扫码定位、协同导览）重新组织为移动端友好的纵向滚动布局，VRM 数字人全程导览。

```
┌──────────────────────────┐
│ StatusBar                │
├──────────────────────────┤
│  Header: 云游胜境 + 副标题│
│  ─────────────────────── │
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │ 🗺️ 景区导览        │  │  ← 水墨风 SVG 地图
│  │                    │  │     点击景点 → 数字人讲解
│  │   (水墨地图)       │  │
│  │   📍大佛  📍梵宫    │  │
│  │   📍九龙  📍坛城   │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ 📷 拍照识景        │  │  ← 调用相机
│  │                    │  │     数字人："这是灵山大佛..."
│  │  [点击拍照识别]    │  │
│  │                    │  │
│  │  识别结果:          │  │
│  │  ┌──────────────┐  │  │
│  │  │灵山大佛 📖   │  │  │
│  │  │高88米...     │  │  │
│  │  │[听讲解 🔊]   │  │  │
│  │  └──────────────┘  │  │
│  └────────────────────┘  │
│                          │
│  ┌──────────┐┌─────────┐ │
│  │ 📱扫码   ││ 👥协同  │ │
│  │  定位    ││  导览   │ │
│  │          ││         │ │
│  │[扫描QR]  ││[创建房间]│ │
│  └──────────┘└─────────┘ │
│                          │
├──────────────────────────┤
│ Tab Bar                  │
│ 启扉 │ 问讯 │ 云游 │ 甄选 │
└──────────────────────────┘

  ┌──────┐
  │ VRM  │  ← 右下角浮窗
  │ 小灵  │     进入页面："让我带您游览灵山"
  └──────┘     点击景点："灵山大佛，高88米..."
               拍照识别后："这是灵山大佛，让我为您讲解"
```

### 2.2 VRM 数字人行为

| 时机 | 行为 | 表情 | 台词 |
|------|------|------|------|
| 进入页面 | 欢迎 | happy | "让我带您游览灵山胜境吧" |
| 点击地图景点 | 讲解 | happy | "{景点名}，{描述}。建议从南门进入..." |
| 拍照识别成功 | 识别讲解 | surprised → happy | "这是{景点名}，{讲解内容}" |
| 扫码成功 | 打卡确认 | happy | "恭喜您到达{景点名}，已记录足迹" |
| 闲置 10 秒 | 主动提示 | neutral | "试试拍照识别功能，或扫描景区二维码" |

### 2.3 完整代码

```typescript
// app/(tabs)/explore.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  Dimensions, Alert,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { VRMFloating } from '../../components/vrm/VRMFloating';
import { VRMManager } from '../../components/vrm/VRMManager';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── 水墨地图组件 ───
interface MapSpot {
  id: string;
  name: string;
  x: number; // 百分比
  y: number;
  description: string;
}

const MAP_SPOTS: MapSpot[] = [
  { id: 'LS-011', name: '灵山大佛', x: 50, y: 20, description: '高88米的青铜释迦牟尼立像' },
  { id: 'LS-013', name: '梵宫', x: 25, y: 45, description: '佛教文化艺术殿堂' },
  { id: 'LS-006', name: '九龙灌浴', x: 72, y: 35, description: '大型音乐动态群雕' },
  { id: 'LS-014', name: '五印坛城', x: 40, y: 65, description: '藏传佛教文化景观' },
  { id: 'LS-015', name: '曼飞龙塔', x: 75, y: 68, description: '南传佛教象征建筑' },
];

function InkMap({ onSpotTap }: { onSpotTap: (spot: MapSpot) => void }) {
  return (
    <View style={mapStyles.container}>
      {/* 水墨背景 */}
      <View style={mapStyles.bg}>
        {/* SVG 山峦纹理 */}
        <Image
          source={require('../../assets/images/ink-map-bg.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          opacity={0.15}
        />
      </View>

      {/* 景点标记 */}
      {MAP_SPOTS.map((spot) => (
        <Pressable
          key={spot.id}
          style={({ pressed }) => [
            mapStyles.marker,
            {
              left: `${spot.x}%`,
              top: `${spot.y}%`,
            },
            pressed && { transform: [{ scale: 1.2 }] },
          ]}
          onPress={() => onSpotTap(spot)}
        >
          <View style={mapStyles.markerDot} />
          <Text style={mapStyles.markerLabel} numberOfLines={1}>
            {spot.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    width: '100%', height: 260,
    borderRadius: 14, overflow: 'hidden',
    position: 'relative',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F0EDE7',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -30 }, { translateY: -20 }],
  },
  markerDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#C84B31',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#C84B31', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4,
  },
  markerLabel: {
    fontSize: 11, color: '#2A2520',
    fontFamily: 'NotoSerifSC',
    marginTop: 4, fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
});

// ─── 拍照识景 ───
function PhotoRecognition({
  onResult,
  vrmSpeak,
}: {
  onResult: (result: VisionResult | null) => void;
  vrmSpeak: (text: string, emotion?: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);

  const handleCapture = async () => {
    // 实际项目中调用拍照 + 后端识别
    // 这里模拟结果
    const mockResult: VisionResult = {
      spot_name: '灵山大佛',
      confidence: 0.96,
      explanation: '灵山大佛高达88米，是世界上最高的青铜佛像之一...',
    };
    setResult(mockResult);
    setHasResult(true);
    onResult(mockResult);

    // 数字人讲解
    vrmSpeak(
      `这是${mockResult.spot_name}，${mockResult.explanation}`,
      'happy'
    );
  };

  if (!permission?.granted) {
    return (
      <View style={photoStyles.container}>
        <Text style={photoStyles.placeholderText}>需要相机权限来拍照识景</Text>
        <Pressable style={photoStyles.btn} onPress={requestPermission}>
          <Text style={photoStyles.btnText}>授予权限</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={photoStyles.container}>
      {!hasResult ? (
        <Pressable
          style={({ pressed }) => [
            photoStyles.captureArea,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleCapture}
        >
          <Text style={photoStyles.captureIcon}>📷</Text>
          <Text style={photoStyles.captureText}>点击拍照识别景点</Text>
          <Text style={photoStyles.captureHint}>
            拍摄景点照片，AI 自动识别并讲解
          </Text>
        </Pressable>
      ) : (
        <Animated.View entering={FadeInUp.duration(400)} style={photoStyles.resultCard}>
          <View style={photoStyles.resultHeader}>
            <Text style={photoStyles.resultName}>{result?.spot_name}</Text>
            <Text style={photoStyles.resultConfidence}>
              置信度 {Math.round((result?.confidence ?? 0) * 100)}%
            </Text>
          </View>
          <Text style={photoStyles.resultExplanation}>
            {result?.explanation}
          </Text>
          <Pressable
            style={photoStyles.listenBtn}
            onPress={() => vrmSpeak(result?.explanation ?? '', 'happy')}
          >
            <Text style={photoStyles.listenBtnText}>🔊 听数字人讲解</Text>
          </Pressable>
          <Pressable
            style={photoStyles.retryBtn}
            onPress={() => { setHasResult(false); setResult(null); onResult(null); }}
          >
            <Text style={photoStyles.retryText}>重新拍照</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const photoStyles = StyleSheet.create({
  container: { width: '100%', minHeight: 300 },
  captureArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F3EF', borderRadius: 12,
    padding: 40, gap: 12,
    borderWidth: 2, borderColor: '#E0DCD6', borderStyle: 'dashed',
  },
  captureIcon: { fontSize: 48 },
  captureText: {
    fontSize: 16, fontWeight: '600', color: '#2A2520',
    fontFamily: 'ZCOOLXiaoWei',
  },
  captureHint: { fontSize: 13, color: '#9E988E', textAlign: 'center' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 20, gap: 12,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.2)',
  },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 20, fontWeight: '700', color: '#2A2520',
    fontFamily: 'ZCOOLXiaoWei',
  },
  resultConfidence: {
    fontSize: 12, color: '#6A9C89',
    backgroundColor: '#E8F2EE',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  resultExplanation: {
    fontSize: 14, color: '#5C554C',
    lineHeight: 22, fontFamily: 'NotoSerifSC',
  },
  listenBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#6A9C89', borderRadius: 20,
  },
  listenBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  retryBtn: { alignSelf: 'center', padding: 8 },
  retryText: { fontSize: 13, color: '#9E988E' },
});

// ─── 主组件 ───
interface VisionResult {
  spot_name: string;
  confidence: number;
  explanation: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const vrmRef = useRef<VRMManager>();

  const vrmSpeak = useCallback((text: string, emotion?: string) => {
    vrmRef.current?.speak(text, emotion);
  }, []);

  useEffect(() => {
    // 进入页面 → 数字人欢迎
    const t = setTimeout(() => {
      vrmSpeak('让我带您游览灵山胜境吧', 'happy');
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // 点击地图景点
  const handleMapSpotTap = useCallback((spot: MapSpot) => {
    vrmSpeak(
      `这是${spot.name}，${spot.description}。点击可查看详情`,
      'happy'
    );
    // 1.5 秒后跳转详情
    setTimeout(() => {
      router.push(`/attractions/${spot.id}`);
    }, 1500);
  }, [vrmSpeak, router]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>云游胜境</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerSub}>景区导览 · 智能识别</Text>
        </View>

        {/* 景区导览（水墨地图） */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#2A2520' }]}>
                <Text style={styles.cardIconText}>🗺️</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>景区导览</Text>
                <Text style={styles.cardSubtitle}>点击景点查看介绍</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <InkMap onSpotTap={handleMapSpotTap} />
            </View>
          </View>
        </Animated.View>

        {/* 拍照识景 */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#1A5FB4' }]}>
                <Text style={styles.cardIconText}>📷</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>拍照识景</Text>
                <Text style={styles.cardSubtitle}>拍摄景点，AI 自动识别</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <PhotoRecognition
                onResult={() => {}}
                vrmSpeak={vrmSpeak}
              />
            </View>
          </View>
        </Animated.View>

        {/* 底部双列：扫码 + 协同 */}
        <View style={styles.bottomRow}>
          {/* 扫码定位 */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.halfCard}>
            <View style={[styles.cardIcon, { backgroundColor: '#2D8B57' }]}>
              <Text style={styles.cardIconText}>📱</Text>
            </View>
            <Text style={styles.cardTitle}>扫码定位</Text>
            <Text style={styles.cardSubtitle}>扫描景区二维码</Text>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: '#2D8B57' },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                vrmSpeak('请对准景区二维码扫描', 'neutral');
              }}
            >
              <Text style={styles.actionBtnText}>开始扫描</Text>
            </Pressable>
          </Animated.View>

          {/* 协同导览 */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.halfCard}>
            <View style={[styles.cardIcon, { backgroundColor: '#C8882E' }]}>
              <Text style={styles.cardIconText}>👥</Text>
            </View>
            <Text style={styles.cardTitle}>协同导览</Text>
            <Text style={styles.cardSubtitle}>和朋友一起听讲解</Text>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: '#C8882E' },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                vrmSpeak('创建一个房间，邀请朋友加入吧', 'happy');
              }}
            >
              <Text style={styles.actionBtnText}>创建房间</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>

      {/* VRM 浮窗 */}
      <VRMFloating
        ref={vrmRef}
        position="bottom-right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F5F0' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 20, marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '700',
    color: '#2A2520',
    fontFamily: 'ZCOOLXiaoWei',
    letterSpacing: 6,
  },
  headerLine: {
    width: 40, height: 3,
    backgroundColor: '#C84B31',
    borderRadius: 2, marginTop: 10, opacity: 0.6,
  },
  headerSub: {
    fontSize: 13, color: '#9E988E',
    marginTop: 8, letterSpacing: 4,
    fontFamily: 'NotoSerifSC',
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(192,188,182,0.2)',
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardIconText: { fontSize: 20 },
  cardTitle: {
    fontSize: 17, fontWeight: '600', color: '#2A2520',
  },
  cardSubtitle: {
    fontSize: 13, color: '#9E988E', marginTop: 2,
  },
  cardBody: { padding: 16 },

  // Bottom row
  bottomRow: {
    flexDirection: 'row', gap: 14,
    marginBottom: 20,
  },
  halfCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 8,
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20,
  },
  actionBtnText: {
    color: '#fff', fontSize: 14, fontWeight: '600',
  },
});
```

---

## 三、莲台宝地（景点列表）

### 3.1 整体结构

移动端采用单列卡片流 + 搜索 + 分类筛选，VRM 数字人做景点推荐讲解。

```
┌──────────────────────────┐
│ StatusBar                │
├──────────────────────────┤
│                          │
│      灵山胜境             │
│      ────                │
│   探索景点，感受千年文化   │
│                          │
│  ┌────────────────────┐  │
│  │ 🔍 寻一处胜地...    │  │
│  └────────────────────┘  │
│                          │
│  [全部] [核心景点] [特色] │
│                          │
│  ┌────────────────────┐  │
│  │ 灵山大佛     核心   │  │
│  │ 世界第一高青铜立佛  │  │
│  │ 佛教造像 · 祈福     │  │
│  │                    │  │
│  │ ┌───────────────┐  │  │  ← 点击卡片
│  │ │   [景点图]    │  │  │    → 数字人：
│  │ └───────────────┘  │  │    "灵山大佛，高88米..."
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ 九龙灌浴     核心   │  │
│  │ 大型音乐动态群雕    │  │
│  │ 表演 · 拍照        │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ 梵宫         核心   │  │
│  │ 佛教艺术殿堂       │  │
│  │ 佛教艺术 · 历史     │  │
│  └────────────────────┘  │
│                          │
│      ··· 更多景点 ···    │
│                          │
├──────────────────────────┤
│ Tab Bar                  │
│ 启扉 │ 问讯 │ 云游 │ 甄选 │
└──────────────────────────┘

  ┌──────┐
  │ VRM  │  ← 右下角浮窗
  │ 小灵  │     进入页面："为您推荐灵山大佛..."
  └──────┘     切换分类：对应讲解
               长时间停留某卡片：主动推荐
```

### 3.2 VRM 数字人行为

| 时机 | 行为 | 表情 | 台词 |
|------|------|------|------|
| 进入页面 | 推荐 | happy | "为您推荐灵山大佛，来灵山不可错过" |
| 切换分类 | 配合 | neutral | "核心景点共X处，各有特色" |
| 点击卡片 | 景点讲解 | happy | "{景点名}，{概述}"，然后跳转详情 |
| 搜索结果 | 反馈 | happy | "找到X个结果" |
| 无结果 | 安慰 | sad | "没有找到匹配的景点，试试其他关键词" |

### 3.3 完整代码

```typescript
// app/attractions/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, Image,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VRMFloating } from '../../components/vrm/VRMFloating';
import { VRMManager } from '../../components/vrm/VRMManager';
import { listSpots, type Spot } from '../../api/spots';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: '核心景点', label: '核心景点' },
  { key: '特色景点', label: '特色景点' },
  { key: '文化设施', label: '文化设施' },
];

// 景点图片映射
const SPOT_IMAGES: Record<string, any> = {
  'LS-006': require('../../assets/images/nine-dragon.png'),
  'LS-009': require('../../assets/images/baizi.png'),
  'LS-010': require('../../assets/images/xiangfu.png'),
  'LS-011': require('../../assets/images/bigfo.png'),
  'LS-012': require('../../assets/images/sansheng.png'),
  'LS-013': require('../../assets/images/fangong.png'),
  'LS-014': require('../../assets/images/wuyin.png'),
  'LS-015': require('../../assets/images/manfeilong.png'),
};

// ─── 景点卡片 ───
function SpotCard({ spot, onPress }: { spot: Spot; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles.container,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      {/* 图片（如果有） */}
      {SPOT_IMAGES[spot.id] && (
        <View style={cardStyles.imageWrap}>
          <Image
            source={SPOT_IMAGES[spot.id]}
            style={cardStyles.image}
            resizeMode="cover"
          />
          <View style={cardStyles.imageFade} />
        </View>
      )}

      <View style={cardStyles.content}>
        {/* 标题 + 分类标签 */}
        <View style={cardStyles.header}>
          <Text style={cardStyles.name}>{spot.name}</Text>
          <View style={cardStyles.categoryBadge}>
            <Text style={cardStyles.categoryText}>{spot.category}</Text>
          </View>
        </View>

        {/* 概述 */}
        <Text style={cardStyles.overview} numberOfLines={2}>
          {spot.overview}
        </Text>

        {/* 标签 */}
        {spot.tags && spot.tags.length > 0 && (
          <View style={cardStyles.tags}>
            {spot.tags.slice(0, 4).map((tag: string) => (
              <View key={tag} style={cardStyles.tag}>
                <Text style={cardStyles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: {
    width: '100%', aspectRatio: 16 / 9,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '40%',
    background: 'linear-gradient(to top, #fff, transparent)',
  },
  content: { padding: 18 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  name: {
    fontSize: 18, fontWeight: '600', color: '#2A2520',
    fontFamily: 'NotoSerifSC', flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.2)',
  },
  categoryText: {
    fontSize: 12, color: '#6A9C89', fontWeight: '500',
    fontFamily: 'NotoSerifSC',
  },
  overview: {
    fontSize: 14, color: '#5C554C', lineHeight: 22,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#F7F5F0',
    borderRadius: 4,
  },
  tagText: { fontSize: 12, color: '#7A7268' },
});

// ─── 主组件 ───
export default function AttractionListPage() {
  const router = useRouter();
  const vrmRef = useRef<VRMManager>();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchText, setSearchText] = useState('');

  // 加载数据
  useEffect(() => {
    setLoading(true);
    listSpots(activeCategory || undefined)
      .then((res) => {
        const data = (res as any).data ?? res;
        setSpots(Array.isArray(data) ? data : []);
      })
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  // 搜索过滤
  const filtered = spots.filter(
    (s) =>
      !searchText ||
      s.name.includes(searchText) ||
      s.overview.includes(searchText) ||
      (s.tags ?? []).some((t: string) => t.includes(searchText))
  );

  const vrmSpeak = useCallback((text: string, emotion?: string) => {
    vrmRef.current?.speak(text, emotion);
  }, []);

  // 进入页面 → 推荐
  useEffect(() => {
    const t = setTimeout(() => {
      vrmSpeak('为您推荐灵山大佛，来灵山不可错过', 'happy');
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // 切换分类 → 数字人说明
  const handleCategoryChange = useCallback((key: string) => {
    setActiveCategory(key);
    const label = CATEGORIES.find(c => c.key === key)?.label ?? '全部';
    vrmSpeak(`正在查看${label}`, 'neutral');
  }, [vrmSpeak]);

  // 点击景点
  const handleSpotPress = useCallback((spot: Spot) => {
    // 数字人先讲解
    vrmSpeak(`${spot.name}，${spot.overview}`, 'happy');
    // 1秒后跳转
    setTimeout(() => {
      router.push(`/attractions/${spot.id}`);
    }, 1000);
  }, [vrmSpeak, router]);

  // 搜索变化
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (text.length > 1) {
      const count = spots.filter(
        s => s.name.includes(text) || s.overview.includes(text)
      ).length;
      if (count > 0) {
        vrmSpeak(`找到${count}个相关景点`, 'happy');
      } else {
        vrmSpeak('没有找到匹配的景点，试试其他关键词', 'sad');
      }
    }
  }, [spots, vrmSpeak]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>灵山胜境</Text>
        <View style={styles.titleLine} />
        <Text style={styles.subtitle}>探索景点，感受千年佛教文化</Text>
      </View>

      {/* 搜索框 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="寻一处胜地..."
          placeholderTextColor="#9E988E"
          value={searchText}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* 分类 Tab */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const active = cat.key === activeCategory;
          return (
            <Pressable
              key={cat.key}
              style={({ pressed }) => [
                styles.categoryBtn,
                active && styles.categoryBtnActive,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleCategoryChange(cat.key)}
            >
              <Text style={[
                styles.categoryText,
                active && styles.categoryTextActive,
              ]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 列表 */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6A9C89" />
          <Text style={styles.loadingText}>墨韵渐染...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>未找到匹配的景点</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 80).duration(400)}>
              <SpotCard
                spot={item}
                onPress={() => handleSpotPress(item)}
              />
            </Animated.View>
          )}
        />
      )}

      {/* VRM 浮窗 */}
      <VRMFloating
        ref={vrmRef}
        position="bottom-right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#F7F5F0',
  },

  // Header
  header: {
    alignItems: 'center', paddingVertical: 20,
  },
  title: {
    fontSize: 32, fontWeight: '700',
    color: '#2A2520',
    fontFamily: 'ZCOOLXiaoWei',
    letterSpacing: 6,
  },
  titleLine: {
    width: 40, height: 3,
    backgroundColor: '#C84B31',
    borderRadius: 2, marginTop: 12, opacity: 0.6,
  },
  subtitle: {
    fontSize: 14, color: '#9E988E',
    marginTop: 10,
    fontFamily: 'NotoSerifSC',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(192,188,182,0.3)',
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1, fontSize: 15, color: '#1A1614',
    padding: 0,
  },

  // Categories
  categoryRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 20,
  },
  categoryBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(192,188,182,0.4)',
    backgroundColor: '#fff',
  },
  categoryBtnActive: {
    backgroundColor: '#C84B31',
    borderColor: '#C84B31',
    shadowColor: '#C84B31', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  categoryText: {
    fontSize: 13, color: '#7A7268', fontWeight: '400',
  },
  categoryTextActive: {
    color: '#fff', fontWeight: '600',
  },

  // List
  list: {
    paddingHorizontal: 20, paddingBottom: 100,
  },

  // Loading
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    fontSize: 15, color: '#9E988E',
    fontFamily: 'NotoSerifSC', letterSpacing: 4,
    marginTop: 16,
  },

  // Empty
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontSize: 15, color: '#9E988E',
    fontFamily: 'NotoSerifSC',
  },
});
```

---

## 四、VRMFloating 组件（共享）

三个页面共用的 VRM 浮窗组件：

```typescript
// components/vrm/VRMFloating.tsx
import React, {
  forwardRef, useImperativeHandle, useState, useCallback,
} from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay,
} from 'react-native-reanimated';

const SCREEN_W = Dimensions.get('window').width;

interface Props {
  position?: 'bottom-right' | 'bottom-left';
  onPress?: () => void;
}

export interface VRMFloatingRef {
  speak: (text: string, emotion?: string) => void;
  setExpression: (name: string) => void;
}

export const VRMFloating = forwardRef<VRMFloatingRef, Props>(
  ({ position = 'bottom-right', onPress }, ref) => {
    const [speaking, setSpeaking] = useState(false);
    const [subtitle, setSubtitle] = useState('');
    const [collapsed, setCollapsed] = useState(false);

    // 展开/收起动画
    const expandScale = useSharedValue(0);

    const containerStyle = useAnimatedStyle(() => ({
      transform: [{ scale: expandScale.value }],
    }));

    // 光环动画
    const ringScale = useSharedValue(1);
    const ringOpacity = useSharedValue(0.3);

    const ringStyle = useAnimatedStyle(() => ({
      transform: [{ scale: ringScale.value }],
      opacity: ringOpacity.value,
    }));

    const speak = useCallback((text: string, emotion?: string) => {
      setSubtitle(text);
      setSpeaking(true);

      // 光环动画
      ringScale.value = withTiming(1.4, { duration: 800 });
      ringOpacity.value = withTiming(0, { duration: 800 });

      // 根据文本长度估算时长
      const duration = Math.max(2000, text.length * 150);

      // 自动收起字幕
      setTimeout(() => {
        setSpeaking(false);
        setSubtitle('');
        // 重置光环
        ringScale.value = withTiming(1, { duration: 200 });
        ringOpacity.value = withTiming(0.3, { duration: 200 });
      }, duration);
    }, []);

    useImperativeHandle(ref, () => ({
      speak,
      setExpression: () => {}, // VRM 表情由全局管理器控制
    }));

    // 进入动画
    React.useEffect(() => {
      expandScale.value = withDelay(
        500,
        withSpring(1, { damping: 12 })
      );
    }, []);

    return (
      <Animated.View
        style={[
          styles.container,
          position === 'bottom-left' ? styles.bottomLeft : styles.bottomRight,
          containerStyle,
        ]}
      >
        {/* 对话气泡 */}
        {speaking && subtitle && (
          <Animated.View
            entering={withSpring(1)}
            style={styles.bubble}
          >
            <Text style={styles.bubbleText} numberOfLines={2}>
              {subtitle}
            </Text>
            <View style={styles.bubbleArrow} />
          </Animated.View>
        )}

        {/* VRM 头像区域 */}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.avatarWrap,
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          {/* 说话光环 */}
          {speaking && (
            <Animated.View style={[styles.ring, ringStyle]} />
          )}

          {/* 头像（实际项目中替换为 VRMView） */}
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🧑‍🦰</Text>
          </View>

          {/* 名字标签 */}
          <View style={styles.nameTag}>
            <Text style={styles.nameText}>小灵</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 100,
    zIndex: 100,
  },
  bottomRight: { right: 16 },
  bottomLeft: { left: 16 },

  // 气泡
  bubble: {
    position: 'absolute',
    bottom: 80, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12, maxWidth: 200,
    shadowColor: '#1A1614', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12,
    elevation: 5,
  },
  bubbleText: {
    fontSize: 13, color: '#2A2520',
    lineHeight: 20,
    fontFamily: 'NotoSerifSC',
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -6, right: 24,
    width: 12, height: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    transform: [{ rotate: '45deg' }],
  },

  // 头像
  avatarWrap: {
    width: 72, height: 72,
    justifyContent: 'center', alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(106,156,137,0.2)',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E8F2EE',
    borderWidth: 2, borderColor: '#6A9C89',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  nameTag: {
    position: 'absolute', bottom: -8,
    backgroundColor: 'rgba(106,156,137,0.9)',
    borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 2,
  },
  nameText: {
    fontSize: 10, color: '#fff', fontWeight: '600',
    fontFamily: 'NotoSerifSC',
  },
});
```

---

## 五、三个页面的数字人交互总览

```
┌─────────────────────────────────────────────────────────────┐
│                    数字人讲解触发矩阵                        │
├──────────┬─────────────────┬──────────┬────────────────────┤
│   页面    │     触发时机     │   表情   │      台词          │
├──────────┼─────────────────┼──────────┼────────────────────┤
│ 首页     │ 进入页面         │ happy    │ "欢迎来到灵山..."   │
│          │ 滑到精选景点     │ happy    │ "为您推荐..."       │
│          │ 点击浮窗         │ —        │ 跳转对话页          │
├──────────┼─────────────────┼──────────┼────────────────────┤
│ 云游胜境 │ 进入页面         │ happy    │ "让我带您游览..."   │
│          │ 点击地图景点     │ happy    │ "这是{景点}，..."   │
│          │ 拍照识别成功     │ surprised│ "这是{景点}..."     │
│          │ 扫码成功         │ happy    │ "恭喜到达..."       │
│          │ 闲置 10 秒       │ neutral  │ "试试拍照识别..."   │
├──────────┼─────────────────┼──────────┼────────────────────┤
│ 莲台宝地 │ 进入页面         │ happy    │ "为您推荐..."       │
│          │ 切换分类         │ neutral  │ "正在查看..."       │
│          │ 点击景点卡片     │ happy    │ "{景点}，{概述}"   │
│          │ 搜索有结果       │ happy    │ "找到X个..."        │
│          │ 搜索无结果       │ sad      │ "没有找到..."       │
└──────────┴─────────────────┴──────────┴────────────────────┘
```

**设计原则**：
1. **不干扰用户** — 数字人讲解最多 1 行气泡，不遮挡内容
2. **自动触发** — 关键节点自动讲解，不需要用户点击
3. **配合内容** — 表情根据场景切换（happy/neutral/sad/surprised）
4. **可点击跳转** — 浮窗点击可进入全屏对话页
5. **语音同步** — 气泡出现时同步播放 TTS 语音

---

**文档版本**：v1.0  
**创建日期**：2026-06-08
