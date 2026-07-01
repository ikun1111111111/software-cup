import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInUp, FadeIn, FadeOut } from 'react-native-reanimated';
import { VRMManager } from '@/components/vrm/VRMManager';
import { useVRM } from '@/components/vrm/VRMProvider';
import { getTimeline, type TimelineEvent } from '@/api/history';
import { Colors } from '@/constants/colors';
import { TimelineEventCard } from '@/components/history/TimelineEventCard';
import { HistorySkeleton } from '@/components/ui/SkeletonLoader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HISTORY_IMAGES = {
  tangXuanzang: require('@/assets/images/history/event-tang-xuanzang.jpg'),
  tangTemple: require('@/assets/images/history/event-tang-temple.jpg'),
  songName: require('@/assets/images/history/event-song-name.jpg'),
  songCourt: require('@/assets/images/history/event-song-court.jpg'),
  songWar: require('@/assets/images/history/event-song-war.jpg'),
  yuanRebuild: require('@/assets/images/history/event-yuan-rebuild.jpg'),
  mingRebuild: require('@/assets/images/history/event-ming-rebuild.jpg'),
  qingRuins: require('@/assets/images/history/event-qing-ruins.jpg'),
  modernPlan: require('@/assets/images/history/event-modern-plan.jpg'),
  modernBigfo: require('@/assets/images/history/event-modern-bigfo.jpg'),
  modernFangong: require('@/assets/images/history/event-modern-fangong.jpg'),
  modernTown: require('@/assets/images/history/event-modern-town.jpg'),
  modernRitual: require('@/assets/images/history/era-modern.jpg'),
  highlightXuanzang: require('@/assets/images/history/highlight-xuanzang.jpg'),
  highlightSong: require('@/assets/images/history/highlight-song.jpg'),
  highlightBigfo: require('@/assets/images/history/highlight-bigfo.jpg'),
  highlightFangong: require('@/assets/images/history/highlight-fangong.jpg'),
  portalInk: require('@/assets/images/history/portal-ink.png'),
  texturePaper: require('@/assets/images/history/texture-paper.jpg'),
};

// ─── 朝代主题 ───
const ERA_THEMES: Record<string, { color: string; bg: string; label: string; char: string; years: string; mood: string }> = {
  '唐代': { color: '#A1622A', bg: 'rgba(161,98,42,0.08)', label: '盛唐', char: '唐', years: '618 - 907', mood: '玄奘以灵鹫胜境命名小灵山，窥基建庵，让太湖山水有了佛教源头。' },
  '北宋': { color: '#2F6F73', bg: 'rgba(47,111,115,0.08)', label: '大宋', char: '宋', years: '960 - 1127', mood: '大中祥符赐额之后，小灵山庵升为江南名刹，寺名与香火一起流传。' },
  '南宋': { color: '#7A5C8E', bg: 'rgba(122,92,142,0.08)', label: '南宋', char: '宋', years: '1127 - 1279', mood: '烟雨压低山色，兵燹让寺院兴废成为灵山记忆里最深的折痕。' },
  '元代': { color: '#4E7D5E', bg: 'rgba(78,125,94,0.08)', label: '重光', char: '元', years: '1271 - 1368', mood: '旧址再起殿宇，僧众与钟声重新聚拢，佛教文化在废墟上续脉。' },
  '明代': { color: '#B33A31', bg: 'rgba(179,58,49,0.08)', label: '大明', char: '明', years: '1368 - 1644', mood: '殿阁与法事进入鼎盛，祥符禅寺成为太湖之滨的重要佛教道场。' },
  '清末': { color: '#5E6775', bg: 'rgba(94,103,117,0.08)', label: '晚清', char: '清', years: '1840 - 1912', mood: '古井、银杏与残垣留在原地，替千年兴衰保住可触摸的证据。' },
  '现代': { color: '#2A5F8F', bg: 'rgba(42,95,143,0.08)', label: '现代', char: '今', years: '1949 - 至今', mood: '从修复古刹到大佛、九龙灌浴与梵宫，传统被转译为可游可感的现代文化场。' },
};

const getTheme = (era: string) =>
  ERA_THEMES[era] || { color: '#666', bg: 'rgba(0,0,0,0.04)', label: era, char: '史', years: '', mood: '历史在山水之间层层展开。' };

const getEventArtwork = (event: TimelineEvent): { image: any; label: string } => {
  if (event.event.includes('玄奘')) return { image: HISTORY_IMAGES.tangXuanzang, label: '玄奘行迹' };
  if (event.event.includes('小灵山庵')) return { image: HISTORY_IMAGES.tangTemple, label: '开山道场' };
  if (event.event.includes('宋真宗')) return { image: HISTORY_IMAGES.songCourt, label: '朝仪赐额' };
  if (event.event.includes('赐额')) return { image: HISTORY_IMAGES.songName, label: '祥符赐额' };
  if (event.era === '南宋') return { image: HISTORY_IMAGES.songWar, label: '烟雨兵燹' };
  if (event.era === '元代') return { image: HISTORY_IMAGES.yuanRebuild, label: '寺院重建' };
  if (event.era === '明代') return { image: HISTORY_IMAGES.mingRebuild, label: '明代鼎盛' };
  if (event.era === '清末') return { image: HISTORY_IMAGES.qingRuins, label: '残塔遗稿' };
  if (event.event.includes('规划')) return { image: HISTORY_IMAGES.modernPlan, label: '新境启建' };
  if (event.event.includes('奠基')) return { image: HISTORY_IMAGES.modernPlan, label: '新境启建' };
  if (event.event.includes('大佛')) return { image: HISTORY_IMAGES.modernBigfo, label: '大佛新篇' };
  if (event.event.includes('九龙')) return { image: HISTORY_IMAGES.modernRitual, label: '花开见佛' };
  if (event.event.includes('三期')) return { image: HISTORY_IMAGES.modernFangong, label: '三期华彩' };
  if (event.event.includes('梵宫')) return { image: HISTORY_IMAGES.modernFangong, label: '梵宫华彩' };
  if (event.event.includes('拈花湾')) return { image: HISTORY_IMAGES.modernTown, label: '禅意新境' };
  if (event.era === '现代') return { image: HISTORY_IMAGES.modernPlan, label: '时代新章' };
  return { image: HISTORY_IMAGES.modernPlan, label: getTheme(event.era).label };
};

// ─── 那年今日轮播数据 ───
const HISTORY_HIGHLIGHTS = [
  { year: '贞观年间', title: '小灵山得名', desc: '玄奘见山形酷似印度灵鹫山，将"灵鹫胜境"之名赐予此地', era: '唐代', image: HISTORY_IMAGES.highlightXuanzang },
  { year: '1008年', title: '祥符赐额', desc: '宋真宗赐额"祥符禅寺"，小灵山庵由此成为江南名刹', era: '北宋', image: HISTORY_IMAGES.highlightSong },
  { year: '1997年', title: '大佛开光', desc: '88米露天青铜释迦牟尼立像落成，补上赵朴初"东方大佛"一笔', era: '现代', image: HISTORY_IMAGES.highlightBigfo },
  { year: '2003年', title: '九龙灌浴', desc: '二期工程以九龙灌浴为主体，让"花开见佛"成为可参与的祈福体验', era: '现代', image: HISTORY_IMAGES.modernRitual },
  { year: '2009年', title: '梵宫开放', desc: '灵山梵宫汇集木雕、壁画、漆器与景泰蓝，成为世界佛教论坛主会场', era: '现代', image: HISTORY_IMAGES.highlightFangong },
];

const FALLBACK_EVENTS: TimelineEvent[] = [
  {
    era: '唐代',
    year: '627-649',
    event: '玄奘命名小灵山',
    description: '唐贞观年间，玄奘法师西行取经归来，途经马山，见此地"层峦丛翠，曲水净秀，山形酷似印度灵鹫山"，遂将所译《大般若经》中的"灵鹫胜境"之名赐予此地，命名为"小灵山"。',
    spot: '祥符禅寺',
  },
  {
    era: '唐代',
    year: '650',
    event: '窥基兴建小灵山庵',
    description: '玄奘嘱咐大弟子窥基法师在此住持道场、兴建小灵山庵。寺院背靠灵山主峰，面朝太湖碧波，左右青龙、白虎二山环抱，奠定了灵山佛教文化的根基。',
    spot: '祥符禅寺',
  },
  {
    era: '北宋',
    year: '1008-1016',
    event: '祥符禅寺获赐额',
    description: '北宋大中祥符年间，宋真宗赵恒赐额"祥符禅寺"。小灵山庵历经数百年发展后规模扩大，寺名正式写入朝廷记忆，也成为江南佛教香火的重要节点。',
    spot: '祥符禅寺',
  },
  {
    era: '南宋',
    year: '1127-1279',
    event: '兵燹毁坏',
    description: '南宋时期，祥符禅寺曾遭兵燹毁坏，殿宇与经声一度沉寂。灵山的佛教传承没有消失，而是从鼎盛转入艰难存续。',
    spot: '祥符禅寺',
  },
  {
    era: '元代',
    year: '1271-1368',
    event: '旧址重建复兴',
    description: '元代在旧址上重建祥符禅寺，殿宇、僧众与礼佛活动重新聚拢。小灵山的佛教文化由此再度复兴，延续唐宋留下的山寺脉络。',
    spot: '祥符禅寺',
  },
  {
    era: '明代',
    year: '1368-1644',
    event: '祥符禅寺香火鼎盛',
    description: '明代祥符禅寺达到鼎盛，香火旺盛、法事频仍，成为太湖之滨重要的佛教道场。灵山从一处山寺，逐渐沉淀为江南佛教文化记忆。',
    spot: '祥符禅寺',
  },
  {
    era: '清末',
    year: '1850-1912',
    event: '古井银杏留存',
    description: '清末民初，祥符禅寺再次毁于战火。千年银杏、六角古井与残垣断壁成为少数留存的历史证据，也让后来的修复有了可追溯的原点。',
    spot: '祥符禅寺',
  },
  {
    era: '现代',
    year: '1994',
    event: '修复古刹与大佛工程奠基',
    description: '1994年，"修复祥符禅寺、建造灵山大佛"工程奠基。赵朴初提出"五方五佛"之论，认为东方空缺正待填补，现代灵山胜境由此起步。',
    spot: '灵山大佛',
  },
  {
    era: '现代',
    year: '1997',
    event: '灵山大佛落成开光',
    description: '1997年11月15日，88米高露天青铜释迦牟尼立像落成开光，成为灵山胜境的标志性建筑，也让赵朴初"五方五佛"中的东方大佛理念落地。',
    spot: '灵山大佛',
  },
  {
    era: '现代',
    year: '2003',
    event: '九龙灌浴轴线开放',
    description: '二期工程以九龙灌浴为主体建成开放，完成佛祖四相成道的轴线布局。莲花缓缓开启、九龙吐水沐浴太子佛像，"花开见佛"从典故变成游客可参与的祈福体验。',
    spot: '九龙灌浴',
  },
  {
    era: '现代',
    year: '2006-2009',
    event: '三期工程与梵宫开放',
    description: '三期主体工程包括灵山梵宫、五印坛城、曼飞龙塔等空间。灵山梵宫于2009年1月1日开放，汇集东阳木雕、敦煌壁画、扬州漆器、景泰蓝等传统工艺，并成为世界佛教论坛主会场。',
    spot: '灵山梵宫',
  },
  {
    era: '现代',
    year: '2015',
    event: '拈花湾小镇开放',
    description: '禅意小镇拈花湾开放，灵山的游览体验从朝圣礼佛延展到禅意度假、夜游演艺与慢行街巷，成为灵山胜境面向当代游客的另一种表达。',
    spot: '拈花湾',
  },
];

const FALLBACK_ERAS = Array.from(new Set(FALLBACK_EVENTS.map((event) => event.era)));

export default function HistoryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { avoidance } = useVRM();
  const contentBottomPadding = Math.max(120, avoidance.bottom + 40);

  const [events, setEvents] = useState<TimelineEvent[]>(FALLBACK_EVENTS);
  const [eras, setEras] = useState<string[]>(FALLBACK_ERAS);
  const [selectedEra, setSelectedEra] = useState<string>(FALLBACK_ERAS[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getTimeline(undefined, { timeout: 1200, retries: 0 })
      .then((tlRes) => {
        if (!mounted) return;
        const tl = (tlRes as any).data ?? tlRes;
        const nextEvents = Array.isArray(tl.events) && tl.events.length > 0 ? tl.events : FALLBACK_EVENTS;
        const nextEras = Array.isArray(tl.eras) && tl.eras.length > 0 ? tl.eras : FALLBACK_ERAS;
        setEvents(nextEvents);
        setEras(nextEras);
        setSelectedEra((prev) => (nextEras.includes(prev) ? prev : nextEras[0] || FALLBACK_ERAS[0]));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('history');
    const timer = setTimeout(() => {
      VRMManager.speak('让我们一起穿越千年时光，感受灵山的历史变迁', 'neutral');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ─── 那年今日轮播 ───
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIdx((prev) => (prev + 1) % HISTORY_HIGHLIGHTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleEraPress = useCallback((era: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedEra(era);
    setExpandedId(null);
    VRMManager.speak(`${era}时期的灵山`, 'neutral');
  }, []);

  const selectedEraIndex = Math.max(eras.indexOf(selectedEra), 0);
  const currentEra = eras[selectedEraIndex] || selectedEra || FALLBACK_ERAS[0];
  const currentTheme = getTheme(currentEra);

  const currentEvents = useMemo(
    () => events.filter((event) => event.era === currentEra),
    [events, currentEra],
  );

  const goEra = useCallback((step: number) => {
    if (eras.length === 0) return;
    const currentIndex = Math.max(eras.indexOf(currentEra), 0);
    const nextIndex = (currentIndex + step + eras.length) % eras.length;
    handleEraPress(eras[nextIndex]);
  }, [currentEra, eras, handleEraPress]);

  if (loading) {
    return (
      <View style={styles.root}>
        <Image source={HISTORY_IMAGES.texturePaper} style={styles.paperTexture} contentFit="cover" />
        <View style={[styles.header, { paddingTop: insets.top + 36 }]}>
          <Pressable style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={8}>
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>时空穿越</Text>
            <Text style={styles.headerSub}>千年灵山，一脉相承</Text>
          </View>
        </View>
        <HistorySkeleton />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={HISTORY_IMAGES.texturePaper} style={styles.paperTexture} contentFit="cover" />
      {/* ═══ Header ═══ */}
      <View style={[styles.header, { paddingTop: insets.top + 36 }]}>
        <Pressable style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={8}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>时空穿越</Text>
          <Text style={styles.headerSub}>千年灵山，一脉相承</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          <Animated.View entering={FadeInUp.duration(420)} style={styles.portalWrap}>
            <Image source={HISTORY_IMAGES.portalInk} style={styles.portalInk} contentFit="contain" placeholder={{ backgroundColor: 'rgba(48,37,27,0.5)' }} />
            <View style={styles.portalTextBlock}>
              <Text style={styles.portalEyebrow}>Lingshan Chronicle</Text>
              <Text style={styles.portalTitle}>灵山纪年</Text>
              <Text style={styles.portalDesc}>唐风入山，宋雨落寺，明光重起，今朝再开一境。</Text>
            </View>
          </Animated.View>

          {/* ─── 那年今日轮播 ─── */}
          <View style={styles.todayWrap}>
            <Animated.View
              key={carouselIdx}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.todayCard}
            >
              <Image
                source={HISTORY_HIGHLIGHTS[carouselIdx].image}
                style={styles.todayImage}
                contentFit="cover"
                placeholder={{ backgroundColor: '#2A2520' }}
              />
              <View style={styles.todayOverlay} />
              <View style={styles.todayHeader}>
                <Text style={styles.todayLabel}>那年今日</Text>
                <Text style={styles.todayDate}>{HISTORY_HIGHLIGHTS[carouselIdx].year}</Text>
              </View>
              <Text style={styles.todayTitle}>{HISTORY_HIGHLIGHTS[carouselIdx].title}</Text>
              <Text style={styles.todayDesc}>{HISTORY_HIGHLIGHTS[carouselIdx].desc}</Text>
            </Animated.View>
            <View style={styles.todayDots}>
              {HISTORY_HIGHLIGHTS.map((_, i) => (
                <View key={i} style={[styles.todayDot, i === carouselIdx && styles.todayDotActive]} />
              ))}
            </View>
          </View>

          {/* ─── 朝代分页 ─── */}
          <View style={styles.eraPager}>
            <Pressable
              style={({ pressed }) => [styles.eraPageButton, pressed && { opacity: 0.75 }]}
              onPress={() => goEra(-1)}
            >
              <Text style={styles.eraPageButtonText}>‹</Text>
            </Pressable>
            <View style={styles.eraPageCenter}>
              <Text style={[styles.eraPageTitle, { color: currentTheme.color }]}>{currentTheme.label}</Text>
              <Text style={styles.eraPageMeta}>{selectedEraIndex + 1} / {Math.max(eras.length, 1)} · {currentEra}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.eraPageButton, pressed && { opacity: 0.75 }]}
              onPress={() => goEra(1)}
            >
              <Text style={styles.eraPageButtonText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.eraGrid}>
            {eras.map((era) => {
              const theme = getTheme(era);
              const active = selectedEra === era;
              return (
                <Pressable
                  key={era}
                  style={({ pressed }) => [
                    styles.eraChip,
                    active && { backgroundColor: theme.color + '18', borderColor: theme.color },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => handleEraPress(era)}
                >
                  <Text style={[styles.eraChipText, active && { color: theme.color, fontWeight: '600' }]}>{era}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* ═══ 图文时间线 ═══ */}
          <View style={styles.timeline}>
            <Animated.View key={`era-${currentEra}`} entering={FadeInUp.duration(300)}>
              <View style={[styles.eraBanner, { backgroundColor: currentTheme.bg, borderColor: currentTheme.color + '28' }]}>
                <Text style={[styles.eraBannerWatermark, { color: currentTheme.color + '14' }]}>{currentTheme.char}</Text>
                <View style={styles.eraBannerContent}>
                  <Text style={[styles.eraBannerChar, { color: currentTheme.color, borderColor: currentTheme.color + '55', backgroundColor: currentTheme.color + '12' }]}>
                    {currentTheme.char}
                  </Text>
                  <View style={styles.eraBannerInfo}>
                    <Text style={[styles.eraBannerLabel, { color: currentTheme.color }]}>
                      {currentTheme.label}
                    </Text>
                    {currentTheme.years ? (
                      <Text style={styles.eraBannerYears}>{currentTheme.years}</Text>
                    ) : null}
                    <Text style={styles.eraBannerMood} numberOfLines={2}>{currentTheme.mood}</Text>
                  </View>
                </View>
                <View style={[styles.eraBannerLine, { backgroundColor: currentTheme.color + '70' }]} />
              </View>
            </Animated.View>

            <View style={styles.eventDeck}>
              {currentEvents.map((event, eIdx) => {
                const eventId = `${event.era}-${event.year}-${eIdx}`;
                const artwork = getEventArtwork(event);
                return (
                  <TimelineEventCard
                    key={eventId}
                    event={event}
                    eventId={eventId}
                    index={eIdx}
                    isExpanded={expandedId === eventId}
                    image={artwork.image}
                    imageLabel={artwork.label}
                    themeColor={currentTheme.color}
                    onToggle={toggleExpand}
                  />
                );
              })}
            </View>

            <View style={styles.bottomPager}>
              <Pressable
                style={({ pressed }) => [styles.bottomPageButton, pressed && { opacity: 0.75 }]}
                onPress={() => goEra(-1)}
              >
                <Text style={styles.bottomPageButtonText}>上一朝</Text>
              </Pressable>
              <View style={styles.bottomPageCenter}>
                <Text style={[styles.bottomPageEra, { color: currentTheme.color }]}>{currentEra}</Text>
                <Text style={styles.bottomPageMeta}>{currentEvents.length} 个节点</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.bottomPageButton, pressed && { opacity: 0.75 }]}
                onPress={() => goEra(1)}
              >
                <Text style={styles.bottomPageButtonText}>下一朝</Text>
              </Pressable>
            </View>
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE6' },
  paperTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.36,
  },

  // ─── Header ───
  header: {
    alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(122,96,64,0.16)',
    backgroundColor: 'rgba(244,239,230,0.9)',
  },
  backBtn: { position: 'absolute', left: 16, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  headerSub: { fontSize: 10, color: Colors.gray400, letterSpacing: 2, marginTop: 2 },

  // ─── Content ───
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },

  // ─── Portal ───
  portalWrap: {
    height: 122,
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(48,37,27,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,242,218,0.18)',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  portalInk: {
    position: 'absolute',
    right: -62,
    top: -96,
    width: 248,
    height: 248,
    opacity: 0.52,
  },
  portalTextBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 18,
    paddingRight: 128,
  },
  portalEyebrow: {
    fontSize: 10,
    color: 'rgba(246,222,168,0.72)',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  portalTitle: {
    fontFamily: 'MaShanZheng',
    fontSize: 32,
    color: '#FFF5DE',
    lineHeight: 38,
    letterSpacing: 3,
  },
  portalDesc: {
    fontSize: 12,
    color: 'rgba(255,248,232,0.78)',
    lineHeight: 18,
    marginTop: 5,
  },

  // ─── Today Card ───
  todayWrap: { marginBottom: 18, minHeight: 184 },
  todayCard: {
    height: 164,
    backgroundColor: '#2A2520', borderRadius: 18, padding: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 14, elevation: 5,
  },
  todayImage: {
    ...StyleSheet.absoluteFillObject,
  },
  todayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,16,12,0.46)',
  },
  todayDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gray200 },
  todayDotActive: { backgroundColor: '#C8882E', width: 16, borderRadius: 3 },
  todayHeader: { position: 'relative', zIndex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  todayLabel: { fontSize: 11, color: '#F4D58D', fontWeight: '700', letterSpacing: 1 },
  todayDate: { fontSize: 12, color: 'rgba(255,250,240,0.78)', fontWeight: '600' },
  todayTitle: { position: 'relative', zIndex: 1, fontSize: 19, fontWeight: '800', color: '#FFF7EA', marginBottom: 5, lineHeight: 25, letterSpacing: 1 },
  todayDesc: { position: 'relative', zIndex: 1, fontSize: 13, color: 'rgba(255,250,240,0.84)', lineHeight: 20 },

  // ─── Era Filter ───
  eraPager: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,252,246,0.84)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122,96,64,0.18)',
  },
  eraPageButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2520',
  },
  eraPageButtonText: {
    color: '#FFF7EA',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  eraPageCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraPageTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  eraPageMeta: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 2,
    fontWeight: '600',
  },
  eraGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  eraChip: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: '#fff',
  },
  eraChipActive: { borderWidth: 0, backgroundColor: Colors.primary },
  eraChipText: { fontSize: 12, color: Colors.gray600, fontWeight: '500' },
  eraChipTextActive: { color: '#fff', fontWeight: '600' },

  // ─── Timeline ───
  timeline: {},
  eventDeck: {
    minHeight: 246,
  },

  // ─── Era Banner ───
  eraBanner: {
    borderRadius: 18, marginBottom: 14, marginTop: 8,
    overflow: 'hidden', minHeight: 138,
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(42,37,32,0.12)',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  eraBannerWatermark: {
    position: 'absolute',
    right: -4,
    bottom: -26,
    fontFamily: 'MaShanZheng',
    fontSize: 116,
    lineHeight: 132,
  },
  eraBannerContent: {
    position: 'relative',
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 18,
    minHeight: 126,
  },
  eraBannerChar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 35,
    fontFamily: 'MaShanZheng',
    lineHeight: 62,
    marginRight: 14,
    borderWidth: 1,
  },
  eraBannerInfo: { flex: 1 },
  eraBannerLabel: { fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  eraBannerYears: { fontSize: 12, color: Colors.gray600, marginTop: 3, letterSpacing: 1, fontWeight: '700' },
  eraBannerMood: { fontSize: 12, color: Colors.gray600, lineHeight: 18, marginTop: 8 },
  eraBannerLine: { position: 'absolute', left: 18, right: 18, bottom: 12, height: 1 },

  // ─── Hero Card (大图 + 叠加文字) ───
  heroCard: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 14,
    backgroundColor: '#FFFCF6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,70,48,0.12)',
    position: 'relative',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroCardOffset: {
    marginLeft: 14,
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
  },
  heroCardSlim: {
    marginRight: 18,
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroImageFrame: {
    height: 142,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E8DFD2',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,18,12,0.16)',
  },
  heroContent: {
    padding: 14,
  },
  heroBadge: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(255,252,246,0.84)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText: { fontSize: 12, color: Colors.ink, fontWeight: '800', letterSpacing: 1 },
  heroImageLabel: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    fontSize: 11,
    color: '#FFF7EA',
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.52)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitle: {
    fontSize: 18, fontWeight: '800', color: Colors.ink, letterSpacing: 1,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13, color: Colors.gray600, lineHeight: 20,
  },
  heroBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  heroSpot: {
    backgroundColor: 'rgba(106,156,137,0.14)', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  heroSpotText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  heroHint: { fontSize: 11, color: Colors.gray400 },

  // ─── Magazine Card (左图右文) ───
  magCard: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#fff', marginBottom: 12,
    borderLeftWidth: 3,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  magCardReverse: {
    flexDirection: 'row-reverse',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  magCardTall: {
    minHeight: 162,
    backgroundColor: '#FFFCF6',
  },
  magImageWrap: {
    width: 124, height: 140, overflow: 'hidden',
    position: 'relative',
  },
  magImageWrapTall: {
    width: 136,
    height: 162,
  },
  magImage: {
    ...StyleSheet.absoluteFillObject,
  },
  magImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  magImageYear: {
    position: 'absolute', bottom: 6, left: 8,
    fontSize: 11, color: '#fff', fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  magImageLabel: {
    position: 'absolute',
    top: 7,
    left: 8,
    right: 8,
    fontSize: 10,
    color: 'rgba(255,250,240,0.94)',
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  magNoImage: {
    width: 124, height: 140, justifyContent: 'center', alignItems: 'center',
  },
  magNoImageChar: {
    fontSize: 44, fontFamily: 'MaShanZheng', lineHeight: 48,
  },
  magNoImageYear: {
    fontSize: 11, color: Colors.gray400, marginTop: 4, fontWeight: '500',
  },
  magBody: { flex: 1, padding: 12, justifyContent: 'center' },
  magYearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  magEraPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  magEraPillText: { fontSize: 10, fontWeight: '600' },
  magYearText: { fontSize: 12, color: Colors.gray400, fontWeight: '500' },
  magTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.ink,
    lineHeight: 22, marginBottom: 4,
  },
  magDesc: { fontSize: 13, color: Colors.gray600, lineHeight: 20 },
  magFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
  },
  magSpot: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  magHint: { fontSize: 10, color: Colors.gray400 },

  // ─── End ───
  bottomPager: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,252,246,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122,96,64,0.18)',
  },
  bottomPageButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#2A2520',
  },
  bottomPageButtonText: {
    color: '#FFF7EA',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomPageCenter: {
    flex: 1,
    alignItems: 'center',
  },
  bottomPageEra: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bottomPageMeta: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 2,
  },
  endWrap: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  endLine: { width: 40, height: 2, backgroundColor: Colors.gray200, borderRadius: 1, marginBottom: 12 },
  endText: { fontSize: 13, fontWeight: '600', color: '#1A5FB4', letterSpacing: 1 },
});
