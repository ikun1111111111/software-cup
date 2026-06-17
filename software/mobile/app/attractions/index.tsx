import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { listSpots, type Spot } from '@/api/spots';
import { listRoutes, type TourRoute } from '@/api/routes';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES, CATEGORIES, CAT_COLORS } from '@/constants/scenic';

const PAGE_SIZE = 6;

// ─── Hero Section ───
function HeroHeader({ scrollY, insets, spotCount, routeCount }: {
  scrollY: Animated.SharedValue<number>;
  insets: any;
  spotCount: number;
  routeCount: number;
}) {
  const router = useRouter();

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(scrollY.value, [0, 300], [0, 80], { extrapolateRight: Extrapolation.CLAMP }),
    }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 200], [1, 0], { extrapolateRight: Extrapolation.CLAMP }),
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -30], { extrapolateRight: Extrapolation.CLAMP }) }],
  }));

  return (
    <View style={[heroStyles.wrap, { paddingTop: insets.top }]}>
      {/* Background with parallax */}
      <Animated.View style={[heroStyles.bgWrap, bgStyle]}>
        <Image
          source={require('../../assets/images/hero-bg-attractions.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </Animated.View>
      <View style={heroStyles.overlay} />
      <View style={heroStyles.overlayVignette} />

      {/* Back button */}
      <Pressable
        style={[heroStyles.backBtn, { top: insets.top + 4 }]}
        onPress={() => router.replace('/explore')}
        hitSlop={8}
      >
        <Text style={heroStyles.backText}>← 返回</Text>
      </Pressable>

      {/* Content */}
      <Animated.View style={[heroStyles.content, contentStyle]}>
        <View style={heroStyles.sealWrap}>
          <View style={heroStyles.seal}>
            <Text style={heroStyles.sealTxt}>景</Text>
          </View>
        </View>
        <Text style={heroStyles.title}>灵山胜境</Text>
        <Text style={heroStyles.subEn}>LINGSHAN SACRED LAND</Text>
        <View style={heroStyles.divider} />
        <Text style={heroStyles.poem}>探索景点 · 感受千年佛教文化</Text>
        <View style={heroStyles.statsRow}>
          <View style={heroStyles.statItem}>
            <Text style={heroStyles.statNum}>{spotCount}</Text>
            <Text style={heroStyles.statLabel}>景点</Text>
          </View>
          <View style={heroStyles.statDivider} />
          <View style={heroStyles.statItem}>
            <Text style={heroStyles.statNum}>{routeCount}</Text>
            <Text style={heroStyles.statLabel}>路线</Text>
          </View>
          <View style={heroStyles.statDivider} />
          <View style={heroStyles.statItem}>
            <Text style={heroStyles.statNum}>3</Text>
            <Text style={heroStyles.statLabel}>分类</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom curve */}
      <View style={heroStyles.curveWrap}>
        <View style={heroStyles.curve} />
      </View>
    </View>
  );
}

// ─── Spot Card (Image-rich) ───
function SpotCard({ spot, index, onPress }: {
  spot: Spot;
  index: number;
  onPress: () => void;
}) {
  const hasImage = !!SPOT_IMAGES[spot.id];
  const catColor = CAT_COLORS[spot.category] || Colors.gray400;

  if (hasImage) {
    // Large image card
    return (
      <Animated.View entering={FadeInUp.delay(index * 70).duration(400)}>
        <Pressable
          style={({ pressed }) => [
            cardStyles.imageCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onPress}
        >
          <View style={cardStyles.imageWrap}>
            <Image source={SPOT_IMAGES[spot.id]} style={cardStyles.image} resizeMode="cover" />
            <View style={cardStyles.imageOverlay} />
            {/* Category badge */}
            <View style={[cardStyles.catBadge, { backgroundColor: catColor + 'DD' }]}>
              <Text style={cardStyles.catBadgeText}>{spot.category}</Text>
            </View>
            {/* Content overlay */}
            <View style={cardStyles.imageContent}>
              <Text style={cardStyles.imageName}>{spot.name}</Text>
              <Text style={cardStyles.imageOverview} numberOfLines={2}>{spot.overview}</Text>
              {spot.tags && spot.tags.length > 0 && (
                <View style={cardStyles.imageTags}>
                  {spot.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={cardStyles.imageTag}>
                      <Text style={cardStyles.imageTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Text-only compact card
  return (
    <Animated.View entering={FadeInUp.delay(index * 70).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          cardStyles.compactCard,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={onPress}
      >
        <View style={cardStyles.compactLeft}>
          <View style={[cardStyles.compactIcon, { backgroundColor: catColor + '15' }]}>
            <Text style={[cardStyles.compactIconText, { color: catColor }]}>
              {spot.name.charAt(0)}
            </Text>
          </View>
        </View>
        <View style={cardStyles.compactContent}>
          <View style={cardStyles.compactHeader}>
            <Text style={cardStyles.compactName} numberOfLines={1}>{spot.name}</Text>
            <View style={[cardStyles.compactCatDot, { backgroundColor: catColor }]} />
          </View>
          <Text style={cardStyles.compactOverview} numberOfLines={2}>{spot.overview}</Text>
          {spot.tags && spot.tags.length > 0 && (
            <View style={cardStyles.compactTags}>
              {spot.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={cardStyles.compactTag}>
                  <Text style={cardStyles.compactTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════
export default function AttractionListPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);
  const scrollY = useSharedValue(0);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [allSpots, setAllSpots] = useState<Spot[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(1);

  // Load all spots and routes
  useEffect(() => {
    Promise.all([
      listSpots().catch(() => []),
      listRoutes().catch(() => []),
    ]).then(([spotsRes, routesRes]) => {
      const spotsData = (spotsRes as any).data ?? spotsRes;
      const spotsArr = Array.isArray(spotsData) ? spotsData : [];
      setAllSpots(spotsArr);
      setSpots(spotsArr);

      const routesData = (routesRes as any).data ?? routesRes;
      setRoutes(Array.isArray(routesData) ? routesData : []);
    }).finally(() => setLoading(false));
  }, []);

  // Filter locally
  useEffect(() => {
    let result = allSpots;
    if (activeCategory) {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.overview.toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    setSpots(result);
    setPage(1);
  }, [activeCategory, searchText, allSpots]);

  const vrmSpeak = useCallback((text: string, emotion?: string) => {
    vrmRef.current?.speak(text, emotion);
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('attractions');
    const t = setTimeout(() => {
      vrmSpeak('为您推荐灵山大佛，来灵山不可错过', 'neutral');
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const handleCategoryChange = useCallback((key: string) => {
    setActiveCategory(key);
    const label = CATEGORIES.find((c) => c.key === key)?.label ?? '全部';
    vrmSpeak(`正在查看${label}`, 'neutral');
  }, [vrmSpeak]);

  const handleSpotPress = useCallback((spot: Spot) => {
    vrmSpeak(`${spot.name}，${spot.overview}`, 'neutral');
    setTimeout(() => router.push(`/attractions/${spot.id}`), 1000);
  }, [vrmSpeak, router]);

  // Sort: spots with images first
  const sortedSpots = [...spots].sort((a, b) => {
    const aHas = !!SPOT_IMAGES[a.id];
    const bHas = !!SPOT_IMAGES[b.id];
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });
  const totalPages = Math.ceil(sortedSpots.length / PAGE_SIZE);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <HeroHeader
          scrollY={scrollY}
          insets={insets}
          spotCount={allSpots.length}
          routeCount={routes.length}
        />

        {/* Search & Filter area */}
        <View style={styles.controlArea}>
          {/* Search bar */}
          <View style={[
            styles.searchBar,
            searchFocused && styles.searchBarFocused,
          ]}>
            <View style={styles.searchIconWrap}>
              <Text style={styles.searchIconGlyph}>⌕</Text>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索景点名称、标签..."
              placeholderTextColor={Colors.gray400}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable
                onPress={() => setSearchText('')}
                hitSlop={8}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => {
              const active = cat.key === activeCategory;
              const color = cat.key ? (CAT_COLORS[cat.key] || Colors.gray500) : Colors.ink;
              return (
                <Pressable
                  key={cat.key}
                  style={({ pressed }) => [
                    styles.catChip,
                    active && { backgroundColor: color, borderColor: color },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
                  ]}
                  onPress={() => handleCategoryChange(cat.key)}
                >
                  <Text style={[
                    styles.catChipText,
                    active && styles.catChipTextActive,
                  ]}>
                    {cat.label}
                  </Text>
                  {active && (
                    <Text style={styles.catChipCount}>
                      {spots.length}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>墨韵渐染...</Text>
          </View>
        ) : sortedSpots.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>未找到匹配的景点</Text>
            <Text style={styles.emptySub}>试试其他关键词或切换分类</Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => { setSearchText(''); setActiveCategory(''); }}
            >
              <Text style={styles.emptyBtnText}>清除筛选</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContent}>
            {/* Result count */}
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                共 {sortedSpots.length} 个景点
              </Text>
            </View>

            {/* Spot cards */}
            <View style={styles.cardList}>
              {sortedSpots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((spot, idx) => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  index={idx}
                  onPress={() => handleSpotPress(spot)}
                />
              ))}
            </View>

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  style={({ pressed }) => [
                    styles.pageBtn,
                    page === 1 && styles.pageBtnDisabled,
                    pressed && page > 1 && { opacity: 0.7 },
                  ]}
                  onPress={() => page > 1 && setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>上一页</Text>
                </Pressable>

                <View style={styles.pageDots}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Pressable key={i} onPress={() => setPage(i + 1)}>
                      <View style={[styles.pageDot, page === i + 1 && styles.pageDotActive]} />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.pageBtn,
                    page === totalPages && styles.pageBtnDisabled,
                    pressed && page < totalPages && { opacity: 0.7 },
                  ]}
                  onPress={() => page < totalPages && setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>下一页</Text>
                </Pressable>
              </View>
            )}

            {/* Routes section */}
            {routes.length > 0 && (
              <View style={styles.routesSection}>
                <View style={styles.routesHeader}>
                  <Text style={styles.routesTitle}>推荐路线</Text>
                  <Text style={styles.routesSubtitle}>精选游览路线，深度体验灵山文化</Text>
                </View>
                <View style={styles.routesList}>
                  {routes.map((route, idx) => (
                    <Animated.View
                      key={route.id}
                      entering={FadeInUp.delay((sortedSpots.length + idx) * 70).duration(400)}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.routeCard,
                          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                        ]}
                        onPress={() => router.push(`/routes/${route.id}`)}
                      >
                        <View style={styles.routeTypeBadge}>
                          <Text style={styles.routeTypeText}>
                            {route.route_type === 'history' ? '历史' :
                             route.route_type === 'nature' ? '自然' : '亲子'}
                          </Text>
                        </View>
                        <Text style={styles.routeName}>{route.name}</Text>
                        <Text style={styles.routeDesc} numberOfLines={2}>{route.description}</Text>
                        <View style={styles.routeFooter}>
                          <View style={styles.routeDuration}>
                            <Text style={styles.routeDurationIcon}>⏱</Text>
                            <Text style={styles.routeDurationText}>{route.duration}</Text>
                          </View>
                          <Text style={styles.routeArrow}>→</Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

// ═══════════════════════════════════════
//  Styles
// ═══════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  controlArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  searchBarFocused: {
    borderColor: Colors.primary + '60',
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  searchIconWrap: { width: 20, alignItems: 'center' },
  searchIconGlyph: { fontSize: 16, color: Colors.gray400 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.ink, padding: 0 },
  clearBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray200 },
  clearBtnText: { fontSize: 10, color: Colors.gray500 },

  // Categories
  categoryRow: { gap: 8, paddingTop: 12, paddingBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  catChipText: { fontSize: 12, color: Colors.gray500, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  catChipCount: { fontSize: 10, color: '#fff', fontWeight: '600', opacity: 0.8 },

  // Results
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  resultCount: { marginBottom: 12 },
  resultCountText: { fontSize: 12, color: Colors.gray400, letterSpacing: 1 },
  cardList: { gap: 12, paddingBottom: 20 },

  // Loading / Empty
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 80 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 4, marginTop: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 40, color: Colors.gray300, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.gray500, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.gray400, marginBottom: 16 },
  emptyBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryBg,
  },
  emptyBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Routes section
  routesSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  routesHeader: {
    marginBottom: 14,
  },
  routesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 4,
  },
  routesSubtitle: {
    fontSize: 12,
    color: Colors.gray400,
  },
  routesList: {
    gap: 12,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  routeTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primaryBg,
    borderRadius: 4,
    marginBottom: 10,
  },
  routeTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 1,
    marginBottom: 8,
  },
  routeDesc: {
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 20,
    marginBottom: 12,
  },
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDurationIcon: {
    fontSize: 12,
  },
  routeDurationText: {
    fontSize: 12,
    color: Colors.gray400,
  },
  routeArrow: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  pageBtnDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.borderLight,
  },
  pageBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  pageBtnTextDisabled: {
    color: Colors.gray400,
  },
  pageDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray200,
  },
  pageDotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
});

// Hero styles
const heroStyles = StyleSheet.create({
  wrap: { height: 300, position: 'relative', overflow: 'hidden' },
  bgWrap: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,30,25,0.35)',
  },
  overlayVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backBtn: {
    position: 'absolute', left: 14, zIndex: 10,
    minWidth: 44, minHeight: 44, justifyContent: 'center',
  },
  backText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, zIndex: 2,
  },
  sealWrap: { marginBottom: 14 },
  seal: {
    width: 44, height: 44,
    borderWidth: 2, borderColor: 'rgba(200,75,49,0.85)',
    borderRadius: 6, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(200,75,49,0.08)',
  },
  sealTxt: { fontSize: 20, color: 'rgba(200,75,49,0.95)', fontWeight: '800' },
  title: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    letterSpacing: 10, marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subEn: {
    fontSize: 9, letterSpacing: 5, color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase', marginBottom: 12,
  },
  divider: {
    width: 80, height: 1.5, marginBottom: 12,
    backgroundColor: 'rgba(200,75,49,0.5)',
  },
  poem: {
    fontSize: 13, letterSpacing: 4, color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginTop: 20,
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  curveWrap: {
    position: 'absolute', bottom: -1, left: 0, right: 0, height: 24, zIndex: 3,
  },
  curve: {
    width: '100%', height: 24,
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
});

// Card styles
const cardStyles = StyleSheet.create({
  // Image card (for spots with images)
  imageCard: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  imageWrap: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E8F2EE',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  catBadge: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
  },
  catBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  imageContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  imageName: {
    fontSize: 18, fontWeight: '800', color: '#fff',
    letterSpacing: 2, marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  imageOverview: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    lineHeight: 18, marginBottom: 6,
  },
  imageTags: { flexDirection: 'row', gap: 4 },
  imageTag: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  imageTagText: { fontSize: 10, color: 'rgba(255,255,255,0.9)' },

  // Compact card (for spots without images)
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 14,
    gap: 12,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  compactLeft: { justifyContent: 'center' },
  compactIcon: {
    width: 44, height: 44, borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  compactIconText: { fontSize: 18, fontWeight: '700' },
  compactContent: { flex: 1 },
  compactHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  compactName: { fontSize: 15, fontWeight: '600', color: Colors.ink, flex: 1 },
  compactCatDot: { width: 6, height: 6, borderRadius: 3 },
  compactOverview: { fontSize: 12, color: Colors.gray500, lineHeight: 18, marginBottom: 6 },
  compactTags: { flexDirection: 'row', gap: 4 },
  compactTag: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: Colors.gray100,
    borderRadius: 4,
  },
  compactTagText: { fontSize: 10, color: Colors.gray500 },
});
