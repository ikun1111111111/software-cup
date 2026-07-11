import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeInUp,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { type Spot, type SpotDetail } from '@/api/spots';
import { type TourRoute } from '@/api/routes';
import { getScenicSpotRecommendations, type ScenicRecommendItem } from '@/api/recommend';
import { VRMStageSlot } from '@/components/vrm/VRMStageSlot';
import VRMSettings, { type VoiceMode } from '@/components/vrm/VRMSettings';
import { AttractionListSkeleton } from '@/components/ui/SkeletonLoader';
import { setDigitalHumanPageContext } from '@/services/digitalHuman';
import { spotCacheService } from '@/services/spotCache';
import { memoryCache, CACHE_KEYS } from '@/services/memoryCache';
import { SESSION_ID } from '@/services/dataSync';
import * as localDb from '@/services/localDatabase';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { getDemoRoutes, getDemoSpotById, getDemoSpots } from '@/utils/localDemoData';
import { Colors } from '@/constants/colors';
import { CATEGORIES, CAT_COLORS, SPOT_IMAGES } from '@/constants/scenic';
import type { Emotion } from '@/components/vrm/VRMTypes';
import type { Action } from '@/utils/textTimeline';
import type { HeadRotation } from '@/utils/digitalHumanDriver';

const PAGE_SIZE = 6;
const FEATURED_LIMIT = 5;
const HERO_SPOT_PRIORITY = ['ling-shan-da-fo', 'fan-gong', 'jiu-long-guan-yu'];

const ConsoleColors = {
  obsidian: '#171411',
  obsidian2: '#211D18',
  cinnabar: '#C84B31',
  cinnabarSoft: '#FCECE9',
  pine: '#6A9C89',
  pineDeep: '#4A7A68',
  gold: '#C8A951',
  paper: '#F7F3EA',
  paperWarm: '#FFF8EA',
  line: 'rgba(200,169,81,0.24)',
};

const ROUTE_VISUALS: Record<string, { image: any; accent: string; label: string }> = {
  history: {
    image: require('../../assets/images/dazhaobi.jpg'),
    accent: '#C8A951',
    label: '古迹轴线',
  },
  nature: {
    image: require('../../assets/images/putidadao.jpg'),
    accent: '#6A9C89',
    label: '林荫慢行',
  },
  family: {
    image: require('../../assets/images/baizi.png'),
    accent: '#C84B31',
    label: '互动打卡',
  },
};

type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type SpotStoryMeta = {
  reason: string;
  duration: string;
  bestTime: string;
};

type SpotRecommendation = {
  spot: Spot | null;
  meta: SpotStoryMeta;
  basis: string;
  source: 'remote' | 'local';
  remoteItem?: ScenicRecommendItem;
};

type HeroGuideProps = {
  scrollY: SharedValue<number>;
  insets: Insets;
  spotCount: number;
  routeCount: number;
  featuredSpot: Spot | null;
  expression: Emotion;
  mouthOpen: number;
  isSpeaking: boolean;
  subtitle: string;
  action: Action;
  actionDurationMs: number;
  headRotation: HeadRotation;
  costumeId: string;
  recommendationBasis: string;
  onBack: () => void;
  onOpenSettings: () => void;
  onHearRecommendation: () => void;
  onStartRoute: () => void;
};

const SPOT_STORY_META: Record<string, SpotStoryMeta> = {
  'ling-shan-da-fo': {
    reason: '先看大佛高度与太湖天光，最能建立灵山的第一印象。',
    duration: '45 分钟',
    bestTime: '上午或夕照前',
  },
  'fan-gong': {
    reason: '金色穹顶、壁画与仪式空间集中，适合作为文化深读的核心站。',
    duration: '50 分钟',
    bestTime: '上午',
  },
  'jiu-long-guan-yu': {
    reason: '音乐、喷泉、动态群雕同时出现，适合用一场表演打开游览情绪。',
    duration: '25 分钟',
    bestTime: '表演前 10 分钟',
  },
  'wu-yin-tan-cheng': {
    reason: '从五方佛与坛城空间读懂藏传佛教的宇宙秩序。',
    duration: '35 分钟',
    bestTime: '午后',
  },
  'xiang-fu-chan-si': {
    reason: '古寺钟声与庭院节奏更慢，适合把脚步放轻。',
    duration: '30 分钟',
    bestTime: '清晨',
  },
  'fo-shou-guang-chang': {
    reason: '广场尺度开阔，适合拍照、集合，也适合作为游线转换点。',
    duration: '18 分钟',
    bestTime: '全天',
  },
  'ling-shan-da-zhao-bi': {
    reason: '照壁是进入胜境前的序章，小灵会从这里讲起灵山的仪式感。',
    duration: '15 分钟',
    bestTime: '入园后',
  },
};

function getSpotMeta(spot: Spot | null | undefined): SpotStoryMeta {
  if (!spot) {
    return {
      reason: '小灵会先帮你挑出最值得停留的一站。',
      duration: '自由探索',
      bestTime: '现在',
    };
  }
  if (SPOT_STORY_META[spot.id]) return SPOT_STORY_META[spot.id];
  if (spot.category === '核心景点') {
    return {
      reason: spot.overview || '这是灵山游览里最值得优先抵达的一站。',
      duration: '35 分钟',
      bestTime: '上午',
    };
  }
  if (spot.category === '文化设施') {
    return {
      reason: spot.overview || '这里适合听一段背景故事，再慢慢看细节。',
      duration: '30 分钟',
      bestTime: '午后',
    };
  }
  return {
    reason: spot.overview || '这一站适合边走边听讲解，轻松补全游览体验。',
    duration: '25 分钟',
    bestTime: '全天',
  };
}

function normalizeLocalSpot(s: Awaited<ReturnType<typeof localDb.getAllSpots>>[number]): Spot {
  return {
    id: s.id,
    name: s.name,
    overview: s.overview || '',
    category: s.category || '',
    tags: [],
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    qr_code: null,
  };
}

function sortByVisualPriority(spots: Spot[]): Spot[] {
  return [...spots].sort((a, b) => {
    const aPriority = HERO_SPOT_PRIORITY.indexOf(a.id);
    const bPriority = HERO_SPOT_PRIORITY.indexOf(b.id);
    if (aPriority !== -1 || bPriority !== -1) {
      return (aPriority === -1 ? 99 : aPriority) - (bPriority === -1 ? 99 : bPriority);
    }

    const aHasImage = !!SPOT_IMAGES[a.id];
    const bHasImage = !!SPOT_IMAGES[b.id];
    if (aHasImage && !bHasImage) return -1;
    if (!aHasImage && bHasImage) return 1;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
}

function getRouteSpotKeys(routes: TourRoute[]): Set<string> {
  const keys = new Set<string>();
  routes.forEach((route) => {
    const routeAny = route as any;
    const ids = Array.isArray(routeAny.spot_order) ? routeAny.spot_order : [];
    const names = Array.isArray(routeAny.spot_names) ? routeAny.spot_names : [];
    ids.forEach((id: string) => keys.add(id));
    names.forEach((item: { id?: string; name?: string } | string) => {
      if (typeof item === 'string') keys.add(item);
      else {
        if (item.id) keys.add(item.id);
        if (item.name) keys.add(item.name);
      }
    });
  });
  return keys;
}

function buildSpotRecommendation(
  spots: Spot[],
  routes: TourRoute[],
  searchText: string,
  activeCategory: string,
): SpotRecommendation {
  const fallbackMeta = getSpotMeta(null);
  if (spots.length === 0) {
    return {
      spot: null,
      meta: fallbackMeta,
      basis: '我会先根据当前筛选结果挑一站。',
      source: 'local',
    };
  }

  const routeSpotKeys = getRouteSpotKeys(routes);
  const query = searchText.trim().toLowerCase();
  const scored = spots.map((spot) => {
    let score = 0;
    const reasons: string[] = [];
    const priorityIndex = HERO_SPOT_PRIORITY.indexOf(spot.id);

    if (priorityIndex >= 0) {
      score += 80 - priorityIndex * 10;
      reasons.push('经典优先');
    }
    if (SPOT_IMAGES[spot.id]) {
      score += 18;
      reasons.push('图文信息完整');
    }
    if (routeSpotKeys.has(spot.id) || routeSpotKeys.has(spot.name)) {
      score += 28;
      reasons.push('路线覆盖');
    }
    if (activeCategory && spot.category === activeCategory) {
      score += 36;
      reasons.push('符合当前分类');
    }
    if (spot.category.includes('核心')) {
      score += 24;
      reasons.push('核心景点');
    } else if (spot.category.includes('文化')) {
      score += 16;
      reasons.push('文化讲解价值高');
    }
    if (query) {
      const text = `${spot.name} ${spot.overview} ${(spot.tags ?? []).join(' ')}`.toLowerCase();
      if (text.includes(query)) {
        score += 48;
        reasons.push('匹配你的搜索');
      }
    }

    return {
      spot,
      score,
      basis: reasons.slice(0, 2).join('、') || '适合作为第一站',
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return sortByVisualPriority([a.spot, b.spot])[0].id === a.spot.id ? -1 : 1;
  });

  const best = scored[0];
  return {
    spot: best.spot,
    meta: getSpotMeta(best.spot),
    basis: best.basis,
    source: 'local',
  };
}

function matchRemoteRecommendation(
  responseItems: ScenicRecommendItem[],
  spots: Spot[],
): SpotRecommendation | null {
  for (const item of responseItems) {
    const normalizedName = item.spot_name.trim();
    const spot = spots.find((candidate) =>
      candidate.name === normalizedName
      || normalizedName.includes(candidate.name)
      || candidate.name.includes(normalizedName),
    );
    if (!spot) continue;

    return {
      spot,
      meta: {
        reason: item.reason || getSpotMeta(spot).reason,
        duration: item.suggested_duration || getSpotMeta(spot).duration,
        bestTime: getSpotMeta(spot).bestTime,
      },
      basis: item.source === 'llm' || item.source === 'llm_enhanced'
        ? 'AI个性化推荐'
        : item.source === 'content' || item.source === 'content_match'
          ? '兴趣画像推荐'
          : item.source === 'keyword_match'
            ? '兴趣关键词匹配'
          : item.source === 'popular'
            ? '热门兜底推荐'
            : '后端推荐',
      source: 'remote',
      remoteItem: item,
    };
  }
  return null;
}

function DigitalHumanHero({
  scrollY,
  insets,
  spotCount,
  routeCount,
  featuredSpot,
  expression,
  mouthOpen,
  isSpeaking,
  subtitle,
  action,
  actionDurationMs,
  headRotation,
  costumeId,
  recommendationBasis,
  onBack,
  onOpenSettings,
  onHearRecommendation,
  onStartRoute,
}: HeroGuideProps) {
  const meta = getSpotMeta(featuredSpot);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(scrollY.value, [0, 320], [0, 34], Extrapolation.CLAMP),
    }],
    opacity: interpolate(scrollY.value, [0, 360], [1, 0.84], Extrapolation.CLAMP),
  }));

  return (
    <View style={[heroStyles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={heroStyles.skylineA} />
      <View style={heroStyles.skylineB} />
      <View style={heroStyles.gridLineOne} />
      <View style={heroStyles.gridLineTwo} />
      <View style={heroStyles.gridLineThree} />

      <Pressable style={heroStyles.backBtn} onPress={onBack} hitSlop={8}>
        <Text style={heroStyles.backGlyph}>‹</Text>
        <Text style={heroStyles.backText}>返回</Text>
      </Pressable>
      <Pressable
        style={heroStyles.voiceBtn}
        onPress={onOpenSettings}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="打开语音设置"
      >
        <Text style={heroStyles.voiceBtnText}>声</Text>
      </Pressable>

      <Animated.View style={[heroStyles.content, heroStyle]}>
        <View style={heroStyles.copyCol}>
          <Text style={heroStyles.kicker}>AI GUIDE CONSOLE</Text>
          <Text style={heroStyles.title}>小灵导览台</Text>
          <Text style={heroStyles.subtitle}>景点由小灵先讲，再由你决定去哪一站。</Text>

          <View style={heroStyles.statRow}>
            <View style={heroStyles.statBlock}>
              <Text style={heroStyles.statNum}>{spotCount || '--'}</Text>
              <Text style={heroStyles.statLabel}>景点</Text>
            </View>
            <View style={heroStyles.statBlock}>
              <Text style={heroStyles.statNum}>{routeCount || '--'}</Text>
              <Text style={heroStyles.statLabel}>路线</Text>
            </View>
            <View style={heroStyles.statBlock}>
              <Text style={heroStyles.statNum}>3</Text>
              <Text style={heroStyles.statLabel}>分类</Text>
            </View>
          </View>
        </View>

        <View style={heroStyles.stageCol}>
          <View style={heroStyles.avatarStage}>
            <View style={heroStyles.stageStripeTall} />
            <View style={heroStyles.stageStripeShort} />
            <VRMStageSlot
              id="attractions-hero-avatar"
              mode="float"
              expression={expression}
              mouthOpen={mouthOpen}
              speaking={isSpeaking}
              action={action}
              actionDuration={actionDurationMs}
              headRotation={headRotation}
              costumeId={costumeId}
              borderRadius={0}
              trackMotion
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={heroStyles.namePlate}>
            <Text style={heroStyles.namePlateText}>小灵 · 数字导览员</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).duration(420)} style={heroStyles.speechPanel}>
        <View style={heroStyles.speechHeader}>
          <Text style={heroStyles.speechLabel}>{isSpeaking ? '正在讲解' : '今日推荐'}</Text>
          <View style={heroStyles.signalBars}>
            <View style={[heroStyles.signalBar, isSpeaking && heroStyles.signalBarLive]} />
            <View style={[heroStyles.signalBar, heroStyles.signalBarMid, isSpeaking && heroStyles.signalBarLive]} />
            <View style={[heroStyles.signalBar, heroStyles.signalBarTall, isSpeaking && heroStyles.signalBarLive]} />
          </View>
        </View>
        <Text style={heroStyles.speechText} numberOfLines={3}>
          {subtitle || (featuredSpot ? `${featuredSpot.name}：${meta.reason}` : meta.reason)}
        </Text>
      </Animated.View>

      <View style={heroStyles.recommendCard}>
        <View style={heroStyles.recommendRule} />
        <View style={heroStyles.recommendContent}>
          <Text style={heroStyles.recommendKicker}>小灵优先带你看</Text>
          <Text style={heroStyles.recommendTitle} numberOfLines={1}>
            {featuredSpot?.name || '灵山大佛'}
          </Text>
          <Text style={heroStyles.recommendBody} numberOfLines={2}>{meta.reason}</Text>
          <View style={heroStyles.metaRow}>
            <Text style={heroStyles.metaPill}>{recommendationBasis}</Text>
            <Text style={heroStyles.metaPill}>{meta.duration}</Text>
            <Text style={heroStyles.metaPill}>{meta.bestTime}</Text>
          </View>
        </View>
      </View>

      <View style={heroStyles.actionRow}>
        <Pressable style={({ pressed }) => [heroStyles.primaryAction, pressed && styles.pressed]} onPress={onHearRecommendation}>
          <Text style={heroStyles.primaryActionText}>听小灵推荐</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [heroStyles.secondaryAction, pressed && styles.pressed]} onPress={onStartRoute}>
          <Text style={heroStyles.secondaryActionText}>开始路线</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SearchAndFilter({
  activeCategory,
  searchText,
  searchFocused,
  resultCount,
  onSearchChange,
  onFocusChange,
  onCategoryChange,
  onClear,
}: {
  activeCategory: string;
  searchText: string;
  searchFocused: boolean;
  resultCount: number;
  onSearchChange: (text: string) => void;
  onFocusChange: (focused: boolean) => void;
  onCategoryChange: (key: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.controlArea}>
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="想看大佛、梵宫还是亲子路线？"
          placeholderTextColor={Colors.gray400}
          value={searchText}
          onChangeText={onSearchChange}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <Pressable style={styles.clearBtn} onPress={onClear} hitSlop={8}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.filterHeader}>
        <Text style={styles.filterTitle}>小灵筛选</Text>
        <Text style={styles.filterCount}>当前 {resultCount} 处</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const active = cat.key === activeCategory;
          const color = cat.key ? (CAT_COLORS[cat.key] || ConsoleColors.pine) : ConsoleColors.obsidian;
          return (
            <Pressable
              key={cat.key}
              style={({ pressed }) => [
                styles.catChip,
                active && { backgroundColor: color, borderColor: color },
                pressed && styles.pressed,
              ]}
              onPress={() => onCategoryChange(cat.key)}
            >
              <Text style={[styles.catText, active && styles.catTextActive]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FeaturedRail({
  spots,
  onPress,
}: {
  spots: Spot[];
  onPress: (spot: Spot) => void;
}) {
  if (spots.length === 0) return null;

  return (
    <View style={styles.featuredSection}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionKicker}>XIAOLING PICKS</Text>
        <Text style={styles.sectionTitle}>先听这几站</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
        {spots.map((spot, index) => {
          const meta = getSpotMeta(spot);
          const image = SPOT_IMAGES[spot.id];
          return (
            <Animated.View key={spot.id} entering={FadeInUp.delay(index * 60).duration(380)}>
              <Pressable style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]} onPress={() => onPress(spot)}>
                <View style={styles.featuredImageWrap}>
                  {image ? (
                    <Image
                      source={image}
                      style={styles.featuredImage}
                      contentFit="cover"
                      transition={180}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.featuredFallback}>
                      <Text style={styles.featuredFallbackText}>{spot.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>{index === 0 ? '首推' : spot.category || '景点'}</Text>
                  </View>
                </View>
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredName} numberOfLines={1}>{spot.name}</Text>
                  <Text style={styles.featuredReason} numberOfLines={2}>{meta.reason}</Text>
                  <Text style={styles.featuredTime}>{meta.duration}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const SpotStoryCard = React.memo(function SpotStoryCard({
  spot,
  index,
  onPress,
}: {
  spot: Spot;
  index: number;
  onPress: () => void;
}) {
  const image = SPOT_IMAGES[spot.id];
  const meta = getSpotMeta(spot);
  const catColor = CAT_COLORS[spot.category] || ConsoleColors.pine;

  return (
    <Animated.View entering={FadeInUp.delay(index * 45).duration(340)}>
      <Pressable style={({ pressed }) => [cardStyles.card, pressed && styles.pressed]} onPress={onPress}>
        <View style={cardStyles.media}>
          {image ? (
            <Image
              source={image}
              style={cardStyles.image}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[cardStyles.fallback, { backgroundColor: catColor + '1F' }]}>
              <Text style={[cardStyles.fallbackText, { color: catColor }]}>{spot.name.charAt(0)}</Text>
            </View>
          )}
          <View style={[cardStyles.catMark, { backgroundColor: catColor }]}>
            <Text style={cardStyles.catMarkText}>{spot.category || '景点'}</Text>
          </View>
        </View>

        <View style={cardStyles.body}>
          <View style={cardStyles.titleRow}>
            <Text style={cardStyles.name} numberOfLines={1}>{spot.name}</Text>
            <Text style={cardStyles.arrow}>→</Text>
          </View>
          <Text style={cardStyles.guideLabel}>小灵推荐理由</Text>
          <Text style={cardStyles.reason} numberOfLines={2}>{meta.reason}</Text>
          <View style={cardStyles.metaRow}>
            <View style={cardStyles.metaItem}>
              <Text style={cardStyles.metaLabel}>停留</Text>
              <Text style={cardStyles.metaValue}>{meta.duration}</Text>
            </View>
            <View style={cardStyles.metaItem}>
              <Text style={cardStyles.metaLabel}>时段</Text>
              <Text style={cardStyles.metaValue}>{meta.bestTime}</Text>
            </View>
          </View>
          {spot.tags && spot.tags.length > 0 && (
            <View style={cardStyles.tags}>
              {spot.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={cardStyles.tag}>
                  <Text style={cardStyles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

function RouteSection({
  routes,
  onPress,
}: {
  routes: TourRoute[];
  onPress: (route: TourRoute) => void;
}) {
  if (routes.length === 0) return null;

  return (
    <View style={styles.routesSection}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionKicker}>GUIDED ROUTES</Text>
        <Text style={styles.sectionTitle}>顺路走，不绕路</Text>
      </View>
      <View style={styles.routesList}>
        {routes.map((route, idx) => {
          const visual = ROUTE_VISUALS[route.route_type] || ROUTE_VISUALS.history;
          const stopCount = ((route as any).spot_order || (route as any).spot_names || []).length;
          return (
            <Animated.View key={route.id} entering={FadeInUp.delay(idx * 50).duration(320)}>
              <Pressable style={({ pressed }) => [styles.routeCard, pressed && styles.pressed]} onPress={() => onPress(route)}>
                <View style={styles.routeCopy}>
                  <View style={styles.routeTop}>
                    <Text style={[styles.routeBadge, { backgroundColor: visual.accent }]}>
                      {route.route_type === 'history' ? '历史' : route.route_type === 'nature' ? '自然' : '亲子'}
                    </Text>
                    <Text style={styles.routeDuration}>{route.duration}</Text>
                  </View>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.routeDesc} numberOfLines={2}>{route.description}</Text>
                </View>
                <View style={styles.routeVisual}>
                  <Image
                    source={visual.image}
                    style={styles.routeImage}
                    contentFit="cover"
                    transition={180}
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.routeImageShade} />
                  <View style={[styles.routeImageRule, { backgroundColor: visual.accent }]} />
                  <View style={styles.routeImageMeta}>
                    <Text style={styles.routeImageLabel}>{visual.label}</Text>
                    <Text style={styles.routeImageStops}>{stopCount ? `${stopCount}站` : '精选'}</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export default function AttractionListPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(DEFAULT_DIGITAL_HUMAN_VOICE_MODE);
  const [selectedCostume, setSelectedCostume] = useState('festival-spring');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action,
    actionDurationMs,
    headRotation,
    speak,
    playAction,
  } = useDigitalHumanDriver(voiceMode);

  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(1);
  const [remoteRecommendation, setRemoteRecommendation] = useState<SpotRecommendation | null>(null);

  const preloadedDetailIds = useRef(new Set<string>());
  const routesRequestedRef = useRef(false);
  const welcomedRef = useRef(false);
  const lastSearchAnnouncementRef = useRef('');

  const loadRoutesDeferred = useCallback(() => {
    if (routesRequestedRef.current) return;
    routesRequestedRef.current = true;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        const fallbackRoutes = getDemoRoutes() as unknown as TourRoute[];
        setRoutes(fallbackRoutes);
      }, 450);
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setDigitalHumanPageContext('attractions');

    let cancelled = false;
    let cleanupRoutes: (() => void) | undefined;

    const commitSpots = (spots: Spot[]) => {
      if (cancelled) return;
      memoryCache.set(CACHE_KEYS.SPOTS_LIST, spots);
      setAllSpots(spots);
      setLoading(false);
      cleanupRoutes = loadRoutesDeferred();
    };

    const refreshSpotsDeferred = () => {
      const task = InteractionManager.runAfterInteractions(() => {
        localDb.getAllSpots()
          .then((dbSpots) => {
            if (cancelled || dbSpots.length === 0) return;
            const spots = dbSpots.map(normalizeLocalSpot);
            memoryCache.set(CACHE_KEYS.SPOTS_LIST, spots);
            setAllSpots(spots);
          })
          .catch(() => {});

      });
      return () => task.cancel();
    };

    const loadData = async () => {
      const cachedSpots = memoryCache.get<Spot[]>(CACHE_KEYS.SPOTS_LIST);
      if (cachedSpots && cachedSpots.length > 0) {
        commitSpots(cachedSpots);
        return;
      }

      const demoSpots = getDemoSpots() as unknown as Spot[];
      commitSpots(demoSpots);
      const cleanupRefresh = refreshSpotsDeferred();
      const cleanupDeferredRoutes = cleanupRoutes;
      cleanupRoutes = () => {
        cleanupDeferredRoutes?.();
        cleanupRefresh();
      };
    };

    loadData();

    return () => {
      cancelled = true;
      cleanupRoutes?.();
    };
  }, [loadRoutesDeferred]);

  const filteredSpots = useMemo(() => {
    let result = allSpots;
    if (activeCategory) {
      result = result.filter((spot) => spot.category === activeCategory);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (spot) =>
          spot.name.toLowerCase().includes(q) ||
          spot.overview.toLowerCase().includes(q) ||
          (spot.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [activeCategory, allSpots, searchText]);

  const sortedSpots = useMemo(() => sortByVisualPriority(filteredSpots), [filteredSpots]);
  const localRecommendation = useMemo(
    () => buildSpotRecommendation(sortedSpots, routes, searchText, activeCategory),
    [activeCategory, routes, searchText, sortedSpots],
  );
  const canUseRemoteRecommendation = Boolean(
    remoteRecommendation?.spot
    && sortedSpots.some((spot) => spot.id === remoteRecommendation.spot?.id),
  );
  const recommendation = canUseRemoteRecommendation && remoteRecommendation
    ? remoteRecommendation
    : localRecommendation;
  const featuredSpots = useMemo(() => {
    const spots = sortByVisualPriority(allSpots).slice(0, FEATURED_LIMIT);
    if (!recommendation.spot) return spots;
    return [
      recommendation.spot,
      ...spots.filter((spot) => spot.id !== recommendation.spot?.id),
    ].slice(0, FEATURED_LIMIT);
  }, [allSpots, recommendation.spot]);
  const heroSpot = recommendation.spot ?? featuredSpots[0] ?? sortedSpots[0] ?? null;
  const totalPages = Math.max(1, Math.ceil(sortedSpots.length / PAGE_SIZE));
  const visibleSpots = sortedSpots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchText]);

  useEffect(() => {
    if (allSpots.length === 0) return;
    let cancelled = false;

    getScenicSpotRecommendations(SESSION_ID, 5)
      .then((response) => {
        if (cancelled || !response?.recommendations?.length) return;
        const matched = matchRemoteRecommendation(response.recommendations, allSpots);
        if (matched) setRemoteRecommendation(matched);
      })
      .catch(() => {
        if (!cancelled) setRemoteRecommendation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [allSpots]);

  useEffect(() => {
    if (welcomedRef.current || loading) return;
    welcomedRef.current = true;

    const t = setTimeout(() => {
      const spotName = heroSpot?.name || '灵山大佛';
      const meta = recommendation.spot?.id === heroSpot?.id ? recommendation.meta : getSpotMeta(heroSpot);
      playAction('wave', 1200);
      speak(`欢迎来到小灵导览台。今天先推荐${spotName}，依据是${recommendation.basis}。${meta.reason}`, { emotion: 'happy' });
    }, 700);

    return () => clearTimeout(t);
  }, [heroSpot, loading, playAction, recommendation, speak]);

  useEffect(() => {
    if (searchText.trim().length < 2 || loading) return;
    const query = searchText.trim();
    const signature = `${query}:${sortedSpots.length}`;
    if (signature === lastSearchAnnouncementRef.current) return;

    const t = setTimeout(() => {
      lastSearchAnnouncementRef.current = signature;
      if (sortedSpots.length > 0) {
        speak(`找到${sortedSpots.length}处相关景点，我把更适合先看的放在前面。`, { emotion: 'happy' });
      } else {
        speak('没有找到匹配景点，换一个关键词试试。', { emotion: 'sad' });
      }
    }, 550);

    return () => clearTimeout(t);
  }, [loading, searchText, sortedSpots.length, speak]);

  useEffect(() => {
    if (visibleSpots.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        visibleSpots.forEach((spot) => {
          if (preloadedDetailIds.current.has(spot.id)) return;
          preloadedDetailIds.current.add(spot.id);
          const demoDetail = getDemoSpotById(spot.id) as unknown as SpotDetail | null;
          if (demoDetail) {
            spotCacheService.set(spot.id, demoDetail);
          }
        });
      }, 500);
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [visibleSpots]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/explore');
  }, [router]);

  const handleHearRecommendation = useCallback(() => {
    const spot = heroSpot;
    const meta = recommendation.spot?.id === spot?.id ? recommendation.meta : getSpotMeta(spot);
    playAction('showcase', 1100);
    speak(
      spot
        ? `我推荐${spot.name}，这是${recommendation.source === 'remote' ? '后端个性化推荐' : '本地规则推荐'}，依据是${recommendation.basis}。${meta.reason}建议停留${meta.duration}，最佳时段是${meta.bestTime}。`
        : '我会先帮你挑出最值得停留的一站。',
      { emotion: 'happy' },
    );
  }, [heroSpot, playAction, recommendation, speak]);

  const handleStartRoute = useCallback(() => {
    speak(
      routes[0]
        ? `我把路线放在页面下方了，先看${routes[0].name}这条。`
        : '路线正在整理，先往下看完整景点列表。',
      { emotion: routes[0] ? 'happy' : 'neutral' },
    );
    requestAnimationFrame(() => {
      (scrollRef.current as any)?.scrollToEnd?.({ animated: true });
    });
  }, [routes, speak]);

  const handleCategoryChange = useCallback((key: string) => {
    setActiveCategory(key);
    const label = CATEGORIES.find((cat) => cat.key === key)?.label ?? '全部';
    speak(`正在查看${label}景点。`, { emotion: 'neutral' });
  }, [speak]);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setActiveCategory('');
    speak('筛选已清除，我们重新看全部景点。', { emotion: 'neutral' });
  }, [speak]);

  const handleSpotPress = useCallback((spot: Spot) => {
    const meta = getSpotMeta(spot);
    playAction('showcase', 1200);
    speak(`${spot.name}，${meta.reason}`, { emotion: 'happy' });
    router.push(`/attractions/${spot.id}`);
  }, [playAction, router, speak]);

  const handleRoutePress = useCallback((route: TourRoute) => {
    speak(`${route.name}，全程约${route.duration}。`, { emotion: 'happy' });
    router.push(`/routes/${route.id}`);
  }, [router, speak]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <DigitalHumanHero
          scrollY={scrollY}
          insets={insets}
          spotCount={allSpots.length}
          routeCount={routes.length}
          featuredSpot={heroSpot}
          expression={expression}
          mouthOpen={mouthOpen}
          isSpeaking={isSpeaking}
          subtitle={subtitle}
          action={action}
          actionDurationMs={actionDurationMs}
          headRotation={headRotation}
          costumeId={selectedCostume}
          recommendationBasis={recommendation.basis}
          onBack={handleBack}
          onOpenSettings={() => setSettingsVisible(true)}
          onHearRecommendation={handleHearRecommendation}
          onStartRoute={handleStartRoute}
        />

        <SearchAndFilter
          activeCategory={activeCategory}
          searchText={searchText}
          searchFocused={searchFocused}
          resultCount={sortedSpots.length}
          onSearchChange={setSearchText}
          onFocusChange={setSearchFocused}
          onCategoryChange={handleCategoryChange}
          onClear={handleClearFilters}
        />

        {loading ? (
          <AttractionListSkeleton />
        ) : sortedSpots.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyMark}>⌕</Text>
            <Text style={styles.emptyTitle}>没有匹配的景点</Text>
            <Text style={styles.emptySub}>换个关键词，或者让小灵重新显示全部。</Text>
            <Pressable style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]} onPress={handleClearFilters}>
              <Text style={styles.emptyBtnText}>显示全部</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.content}>
            <FeaturedRail spots={featuredSpots} onPress={handleSpotPress} />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionKicker}>ALL ATTRACTIONS</Text>
              <Text style={styles.sectionTitle}>完整景点流</Text>
            </View>

            <View style={styles.cardList}>
              {visibleSpots.map((spot, index) => (
                <SpotStoryCard
                  key={spot.id}
                  spot={spot}
                  index={index}
                  onPress={() => handleSpotPress(spot)}
                />
              ))}
            </View>

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  style={({ pressed }) => [
                    styles.pageBtn,
                    page === 1 && styles.pageBtnDisabled,
                    pressed && page > 1 && styles.pressed,
                  ]}
                  onPress={() => page > 1 && setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>上一页</Text>
                </Pressable>
                <View style={styles.pageDots}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Pressable key={i} onPress={() => setPage(i + 1)} hitSlop={6}>
                      <View style={[styles.pageDot, page === i + 1 && styles.pageDotActive]} />
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.pageBtn,
                    page === totalPages && styles.pageBtnDisabled,
                    pressed && page < totalPages && styles.pressed,
                  ]}
                  onPress={() => page < totalPages && setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>下一页</Text>
                </Pressable>
              </View>
            )}

            <RouteSection routes={routes} onPress={handleRoutePress} />
          </View>
        )}

        <View style={{ height: insets.bottom + 88 }} />
      </Animated.ScrollView>
      <VRMSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        selectedCostume={selectedCostume}
        onCostumeChange={setSelectedCostume}
        voiceMode={voiceMode}
        onVoiceModeChange={setVoiceMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ConsoleColors.paper,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  controlArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFDF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    shadowColor: ConsoleColors.obsidian,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  searchBarFocused: {
    borderColor: ConsoleColors.gold,
    shadowOpacity: 0.12,
  },
  searchGlyph: {
    fontSize: 19,
    color: ConsoleColors.cinnabar,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    padding: 0,
    color: Colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
  },
  clearText: {
    color: Colors.gray500,
    fontSize: 18,
    lineHeight: 20,
  },
  filterHeader: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ConsoleColors.obsidian,
  },
  filterCount: {
    fontSize: 12,
    color: Colors.gray500,
  },
  categoryRow: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 6,
  },
  catChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.1)',
    backgroundColor: '#FFFDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catText: {
    fontSize: 12,
    color: Colors.gray600,
    fontWeight: '700',
  },
  catTextActive: {
    color: '#fff',
  },
  content: {
    paddingTop: 8,
  },
  featuredSection: {
    paddingTop: 12,
  },
  sectionHead: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionKicker: {
    fontSize: 9,
    letterSpacing: 2,
    color: ConsoleColors.cinnabar,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
    color: ConsoleColors.obsidian,
  },
  featuredRow: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  featuredCard: {
    width: 210,
    backgroundColor: '#FFFDF8',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    shadowColor: ConsoleColors.obsidian,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  featuredImageWrap: {
    height: 126,
    backgroundColor: '#E9E2D4',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ConsoleColors.cinnabarSoft,
  },
  featuredFallbackText: {
    fontSize: 44,
    fontWeight: '900',
    color: ConsoleColors.cinnabar,
  },
  featuredBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(23,20,17,0.78)',
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  featuredInfo: {
    padding: 12,
  },
  featuredName: {
    color: ConsoleColors.obsidian,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  featuredReason: {
    color: Colors.gray600,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
  },
  featuredTime: {
    marginTop: 8,
    color: ConsoleColors.pineDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  cardList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  empty: {
    margin: 16,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    paddingHorizontal: 24,
  },
  emptyMark: {
    fontSize: 46,
    color: ConsoleColors.cinnabar,
    marginBottom: 10,
  },
  emptyTitle: {
    color: ConsoleColors.obsidian,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.gray500,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: ConsoleColors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingTop: 18,
    paddingBottom: 8,
  },
  pageBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.26)',
    backgroundColor: '#FFFDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.borderLight,
  },
  pageBtnText: {
    fontSize: 13,
    color: ConsoleColors.pineDeep,
    fontWeight: '800',
  },
  pageBtnTextDisabled: {
    color: Colors.gray400,
  },
  pageDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.gray200,
  },
  pageDotActive: {
    width: 22,
    backgroundColor: ConsoleColors.cinnabar,
  },
  routesSection: {
    marginTop: 10,
    paddingBottom: 18,
  },
  routesList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  routeCard: {
    minHeight: 148,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: ConsoleColors.obsidian,
    borderWidth: 1,
    borderColor: ConsoleColors.line,
  },
  routeCopy: {
    flex: 1,
    padding: 14,
    paddingRight: 12,
  },
  routeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  routeBadge: {
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: ConsoleColors.cinnabar,
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  routeDuration: {
    color: ConsoleColors.gold,
    fontSize: 12,
    fontWeight: '800',
  },
  routeName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  routeDesc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 19,
  },
  routeVisual: {
    width: 118,
    alignSelf: 'stretch',
    position: 'relative',
    backgroundColor: ConsoleColors.obsidian2,
    overflow: 'hidden',
  },
  routeImage: {
    ...StyleSheet.absoluteFillObject,
  },
  routeImageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23,20,17,0.22)',
  },
  routeImageRule: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  routeImageMeta: {
    position: 'absolute',
    left: 12,
    right: 10,
    bottom: 10,
  },
  routeImageLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '900',
  },
  routeImageStops: {
    marginTop: 3,
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});

const heroStyles = StyleSheet.create({
  wrap: {
    minHeight: 560,
    paddingHorizontal: 16,
    paddingBottom: 18,
    backgroundColor: ConsoleColors.obsidian,
    overflow: 'hidden',
  },
  skylineA: {
    position: 'absolute',
    left: -30,
    right: 80,
    bottom: 120,
    height: 160,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(200,169,81,0.16)',
    transform: [{ skewY: '-12deg' }],
  },
  skylineB: {
    position: 'absolute',
    right: -60,
    top: 96,
    width: 180,
    height: 280,
    borderLeftWidth: 1,
    borderColor: 'rgba(106,156,137,0.2)',
    transform: [{ rotate: '18deg' }],
  },
  gridLineOne: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 116,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gridLineTwo: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 206,
    height: 1,
    backgroundColor: 'rgba(200,169,81,0.12)',
  },
  gridLineThree: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 5,
  },
  backGlyph: {
    fontSize: 28,
    lineHeight: 30,
    color: ConsoleColors.gold,
  },
  backText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  voiceBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.32)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  voiceBtnText: {
    color: ConsoleColors.gold,
    fontSize: 15,
    fontWeight: '900',
  },
  content: {
    marginTop: 4,
    minHeight: 270,
    flexDirection: 'row',
  },
  copyCol: {
    flex: 1.05,
    paddingTop: 24,
    paddingRight: 8,
  },
  kicker: {
    color: ConsoleColors.gold,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '900',
  },
  title: {
    marginTop: 10,
    color: '#fff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 10,
    maxWidth: 190,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 21,
  },
  statRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
  statBlock: {
    minWidth: 54,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  statNum: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 10,
  },
  stageCol: {
    width: 170,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarStage: {
    width: 166,
    height: 276,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.35)',
    backgroundColor: ConsoleColors.obsidian2,
  },
  stageStripeTall: {
    position: 'absolute',
    left: 18,
    top: -20,
    width: 26,
    height: 336,
    backgroundColor: 'rgba(200,169,81,0.08)',
    transform: [{ rotate: '12deg' }],
  },
  stageStripeShort: {
    position: 'absolute',
    right: 18,
    top: 40,
    width: 18,
    height: 190,
    backgroundColor: 'rgba(106,156,137,0.12)',
    transform: [{ rotate: '12deg' }],
  },
  namePlate: {
    marginTop: -18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: ConsoleColors.cinnabar,
  },
  namePlateText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  speechPanel: {
    marginTop: 10,
    padding: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.28)',
    backgroundColor: 'rgba(255,248,234,0.08)',
  },
  speechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  speechLabel: {
    color: ConsoleColors.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
  },
  signalBar: {
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  signalBarMid: {
    height: 10,
  },
  signalBarTall: {
    height: 14,
  },
  signalBarLive: {
    backgroundColor: ConsoleColors.cinnabar,
  },
  speechText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  recommendCard: {
    marginTop: 12,
    minHeight: 112,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: ConsoleColors.paperWarm,
  },
  recommendRule: {
    width: 5,
    backgroundColor: ConsoleColors.gold,
  },
  recommendContent: {
    flex: 1,
    padding: 13,
  },
  recommendKicker: {
    color: ConsoleColors.cinnabar,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  recommendTitle: {
    color: ConsoleColors.obsidian,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  recommendBody: {
    color: Colors.gray600,
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: ConsoleColors.cinnabarSoft,
    color: ConsoleColors.cinnabar,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  primaryAction: {
    flex: 1.16,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: ConsoleColors.cinnabar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.34)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: ConsoleColors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    minHeight: 164,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    backgroundColor: '#FFFDF8',
    shadowColor: ConsoleColors.obsidian,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  media: {
    width: 104,
    alignSelf: 'stretch',
    position: 'relative',
    backgroundColor: '#E9E2D4',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 42,
    fontWeight: '900',
  },
  catMark: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    maxWidth: 88,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  catMarkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    padding: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
    color: ConsoleColors.obsidian,
    fontWeight: '900',
  },
  arrow: {
    color: ConsoleColors.cinnabar,
    fontSize: 18,
    fontWeight: '900',
  },
  guideLabel: {
    marginTop: 7,
    color: ConsoleColors.gold,
    fontSize: 10,
    fontWeight: '900',
  },
  reason: {
    marginTop: 4,
    color: Colors.gray600,
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(200,169,81,0.45)',
    paddingLeft: 8,
  },
  metaLabel: {
    color: Colors.gray400,
    fontSize: 10,
    fontWeight: '800',
  },
  metaValue: {
    marginTop: 2,
    color: ConsoleColors.obsidian,
    fontSize: 11,
    fontWeight: '900',
  },
  tags: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tag: {
    borderRadius: 5,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    color: Colors.gray500,
    fontSize: 10,
    fontWeight: '700',
  },
});
