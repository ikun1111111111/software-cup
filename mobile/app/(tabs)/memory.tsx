import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInUp, FadeIn, useSharedValue, useAnimatedStyle, useDerivedValue,
  interpolate, Extrapolation, withSpring, withTiming, withSequence,
  withDelay, withRepeat, runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Line, Ellipse, Rect, Defs, RadialGradient, Stop, Text as SvgText, G } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { SectionHeader } from '@/components/scenic/SectionHeader';
import {
  listMemories, generateMemories, polishMemory,
  getLatestSummary, generateSummary, createMemory,
  getAchievements, getUserProfile,
  createCapsule, unlockCapsule,
  type TravelMemory, type JourneySummary,
  type Achievement, type UserProfile,
} from '@/api/memory';
import { listSpots, type Spot } from '@/api/spots';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

const SESSION_ID = 'mobile-' + Date.now().toString(36);

const MOOD_META: Record<string, { emoji: string; color: string; label: string }> = {
  happy: { emoji: '😊', color: '#E8A838', label: '开心' },
  calm: { emoji: '😌', color: '#6A9C89', label: '平静' },
  excited: { emoji: '🤩', color: '#C84B31', label: '兴奋' },
  thoughtful: { emoji: '🤔', color: '#2A4D6E', label: '沉思' },
  peaceful: { emoji: '🧘', color: '#6BA292', label: '宁静' },
};

const MOOD_OPTIONS = ['happy', 'calm', 'excited', 'thoughtful', 'peaceful'];

// ═══════════════════════════════════════
//  Animated Character (逐字动画)
// ═══════════════════════════════════════
function AnimatedChar({ char, trigger, delay }: {
  char: string;
  trigger: boolean;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (trigger) {
      setTimeout(() => {
        opacity.value = withTiming(1, { duration: 300 });
        translateY.value = withTiming(0, { duration: 300 });
      }, delay);
    } else {
      opacity.value = 0;
      translateY.value = 8;
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={[styles.animatedChar, style]}>{char}</Animated.Text>;
}

// ═══════════════════════════════════════
//  Animated Text (逐字动画容器)
// ═══════════════════════════════════════
function AnimatedText({ text, trigger, delay = 50 }: {
  text: string;
  trigger: boolean;
  delay?: number;
}) {
  const chars = text.split('');

  return (
    <View style={styles.animatedTextRow}>
      {chars.map((char, i) => (
        <AnimatedChar key={i} char={char} trigger={trigger} delay={i * delay} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════
//  Ink Drop Animation (墨滴扩散)
// ═══════════════════════════════════════
function InkDropAnimation({ trigger }: { trigger: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      scale.value = withTiming(3, { duration: 800 });
      opacity.value = withSequence(
        withTiming(0.6, { duration: 400 }),
        withTiming(0, { duration: 400 })
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.inkDrop, style]} />
  );
}

// ═══════════════════════════════════════
//  Floating Cloud
// ═══════════════════════════════════════
function FloatingCloud({ top, delay, size, opacity }: {
  top: number; delay: number; size: number; opacity: number;
}) {
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withDelay(delay, withTiming(Dimensions.get('window').width + 100, { duration: 25000 })),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.cloud, { top, width: size, height: size * 0.4, opacity }, style]}>
      <Svg width={size} height={size * 0.4} viewBox="0 0 120 48">
        <Defs>
          <RadialGradient id={`cg-${delay}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="60" cy="24" rx="55" ry="22" fill={`url(#cg-${delay})`} />
        <Ellipse cx="40" cy="28" rx="35" ry="18" fill={`url(#cg-${delay})`} />
        <Ellipse cx="80" cy="28" rx="35" ry="18" fill={`url(#cg-${delay})`} />
      </Svg>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Ink Route Map (SVG 水墨路线图)
// ═══════════════════════════════════════
const ROUTE_SPOTS = [
  { name: '祥符寺', short: '祥符' },
  { name: '灵山大佛', short: '大佛' },
  { name: '梵华宫', short: '梵宫' },
  { name: '九龙灌浴', short: '九龙' },
  { name: '拈花湾', short: '拈花' },
];

function InkRouteMap({ visitedSpotNames }: { visitedSpotNames: Set<string> }) {
  const nodeSpacing = 68;
  const totalWidth = (ROUTE_SPOTS.length - 1) * nodeSpacing + 40;
  const pathLength = (ROUTE_SPOTS.length - 1) * nodeSpacing;

  const drawProgress = useSharedValue(0);

  useEffect(() => {
    drawProgress.value = withTiming(1, { duration: 1500 });
  }, []);

  const animatedPathProps = useAnimatedStyle(() => {
    const progress = drawProgress.value;
    return {
      opacity: 1,
    };
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.routeMapScroll}
    >
      <View style={[styles.routeMapContainer, { width: totalWidth }]}>
        <Svg width={totalWidth} height={60} viewBox={`0 0 ${totalWidth} 60`}>
          {/* 墨迹路径 */}
          <Path
            d={`M 20,30 ${ROUTE_SPOTS.map((_, i) => i > 0 ? `L ${20 + i * nodeSpacing},30` : '').join(' ')}`}
            stroke={Colors.gray300}
            strokeWidth={2}
            fill="none"
            strokeDasharray={`${pathLength} ${pathLength}`}
            strokeDashoffset={pathLength * (1 - 1)}
            strokeLinecap="round"
          />
          {/* 已走过的路径 (深色) */}
          {(() => {
            let lastVisitedIdx = -1;
            ROUTE_SPOTS.forEach((s, i) => {
              if (visitedSpotNames.has(s.name)) lastVisitedIdx = i;
            });
            if (lastVisitedIdx <= 0) return null;
            const visitedLength = lastVisitedIdx * nodeSpacing;
            return (
              <Path
                d={`M 20,30 ${ROUTE_SPOTS.slice(1, lastVisitedIdx + 1).map((_, i) => `L ${20 + (i + 1) * nodeSpacing},30`).join(' ')}`}
                stroke={Colors.ink}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                opacity={0.7}
              />
            );
          })()}

          {/* 景点节点 */}
          {ROUTE_SPOTS.map((spot, i) => {
            const cx = 20 + i * nodeSpacing;
            const isVisited = visitedSpotNames.has(spot.name);
            return (
              <React.Fragment key={spot.name}>
                {isVisited && (
                  <Circle cx={cx} cy={30} r={10} fill={Colors.ink} opacity={0.08} />
                )}
                <Circle
                  cx={cx}
                  cy={30}
                  r={isVisited ? 6 : 5}
                  fill={isVisited ? Colors.ink : Colors.paperWarm}
                  stroke={isVisited ? Colors.ink : Colors.gray300}
                  strokeWidth={isVisited ? 2 : 1.5}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* 景点名称标签 */}
        <View style={styles.routeLabels}>
          {ROUTE_SPOTS.map((spot, i) => {
            const isVisited = visitedSpotNames.has(spot.name);
            return (
              <Text
                key={spot.name}
                style={[styles.routeLabel, {
                  left: 20 + i * nodeSpacing - 16,
                  color: isVisited ? Colors.ink : Colors.gray400,
                  fontWeight: isVisited ? '700' : '400',
                }]}
              >
                {spot.short}
              </Text>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
//  Hero Header (水墨山水)
// ═══════════════════════════════════════
function HeroHeader({ scrollY, insets, memoryCount, spotCount, memories, spots }: {
  scrollY: Animated.SharedValue<number>;
  insets: any;
  memoryCount: number;
  spotCount: number;
  memories: TravelMemory[];
  spots: Spot[];
}) {
  const headerAnim = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(scrollY.value, [0, 200], [0, -30], { extrapolateRight: Extrapolation.CLAMP }),
    }],
    opacity: interpolate(scrollY.value, [0, 150], [1, 0.6], { extrapolateRight: Extrapolation.CLAMP }),
  }));

  // 卷首语：从最近一条记忆提取
  const heroQuote = useMemo(() => {
    if (memories.length === 0) return '灵山胜境';
    const latest = memories[0];
    const title = latest.title || '';
    return title.length > 6 ? title.slice(0, 6) : title;
  }, [memories]);

  // 已访问景点
  const visitedSpotNames = useMemo(() => {
    return new Set(memories.filter((m) => m.spot_name).map((m) => m.spot_name!));
  }, [memories]);

  // 印章收集进度
  const stampRatio = spotCount > 0 ? Math.min(spotCount / ROUTE_SPOTS.length, 1) : 0;

  return (
    <Animated.View style={[styles.heroHeader, { paddingTop: insets.top }, headerAnim]}>
      {/* 墨晕渐变背景层 */}
      <View style={styles.heroGradientTop} />
      <View style={styles.heroGradientBottom} />

      {/* 浮动云层 */}
      <FloatingCloud top={20} delay={0} size={120} opacity={0.3} />
      <FloatingCloud top={50} delay={8000} size={90} opacity={0.2} />
      <FloatingCloud top={35} delay={15000} size={100} opacity={0.25} />

      {/* 标题区 */}
      <View style={styles.heroTitleArea}>
        <Text style={styles.heroSub}>TRAVEL MEMOIR</Text>
        <Text style={styles.heroTitle}>你的墨卷</Text>
        <View style={styles.heroQuoteWrap}>
          <Text style={styles.heroQuoteMark}>「</Text>
          <Text style={styles.heroQuote}>{heroQuote}</Text>
          <Text style={styles.heroQuoteMark}>」</Text>
        </View>
      </View>

      {/* 水墨路线图 */}
      <View style={styles.heroRouteArea}>
        <InkRouteMap visitedSpotNames={visitedSpotNames} />
      </View>

      {/* 统计数据 */}
      <View style={styles.heroStatsRow}>
        <View style={styles.heroStatStamp}>
          <Text style={styles.heroStatNum}>{memoryCount}</Text>
          <Text style={styles.heroStatLabel}>记忆</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatStamp}>
          <Text style={styles.heroStatNum}>{spotCount}</Text>
          <Text style={styles.heroStatLabel}>景点</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatStamp}>
          <Text style={styles.heroStatNum}>{Math.round(stampRatio * 100)}%</Text>
          <Text style={styles.heroStatLabel}>集印</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Achievement Bar
// ═══════════════════════════════════════
function AchievementBar({ profile, achievements }: {
  profile: UserProfile | null;
  achievements: Achievement[];
}) {
  if (!profile && achievements.length === 0) return null;

  const level = profile?.level;
  const unlockedAchs = achievements.filter((a) => a.unlocked);
  const allAchs = achievements.length > 0 ? achievements : [];
  const stamps = profile?.stamps || [];

  return (
    <Animated.View entering={FadeInUp.delay(50).duration(400)} style={styles.achieveSection}>
      {/* Level + Score */}
      {level && (
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelIcon}>{level.icon}</Text>
            <View>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelScore}>{profile!.score} 分</Text>
            </View>
          </View>
          <View style={styles.stampProgress}>
            <Text style={styles.stampProgressText}>
              印章 {profile!.collected_stamps}/{profile!.total_stamps}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${(profile!.collected_stamps / Math.max(profile!.total_stamps, 1)) * 100}%`,
              }]} />
            </View>
          </View>
        </View>
      )}

      {/* Stamps scroll */}
      {stamps.length > 0 && (
        <>
          <View style={styles.achieveHead}>
            <Text style={styles.achieveTitle}>印章收集</Text>
            <Text style={styles.achieveCount}>{profile!.collected_stamps}/{stamps.length}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achieveScroll}
          >
            {stamps.map((stamp) => (
              <View
                key={stamp.id}
                style={[styles.stampCard, !stamp.collected && styles.stampCardLocked]}
              >
                <Text style={[styles.stampSymbol, !stamp.collected && styles.stampSymbolLocked]}>
                  {stamp.symbol}
                </Text>
                <Text style={[styles.stampName, !stamp.collected && styles.stampNameLocked]} numberOfLines={1}>
                  {stamp.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Achievements scroll */}
      {allAchs.length > 0 && (
        <>
          <View style={styles.achieveHead}>
            <Text style={styles.achieveTitle}>成就</Text>
            <Text style={styles.achieveCount}>{unlockedAchs.length}/{allAchs.length}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achieveScroll}
          >
            {allAchs.map((ach) => (
              <View
                key={ach.id}
                style={[styles.achieveCard, !ach.unlocked && styles.achieveCardLocked]}
              >
                <Text style={[styles.achieveIcon, !ach.unlocked && styles.achieveIconLocked]}>
                  {ach.icon}
                </Text>
                <Text style={[styles.achieveName, !ach.unlocked && styles.achieveNameLocked]} numberOfLines={1}>
                  {ach.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Create Memory Modal
// ═══════════════════════════════════════
function CreateMemoryModal({ visible, onClose, onSubmit, spots, loading }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { user_input: string; spot_name?: string; mood_tag?: string }) => void;
  spots: Spot[];
  loading: boolean;
}) {
  const [input, setInput] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<string | undefined>();
  const [selectedMood, setSelectedMood] = useState<string | undefined>();

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSubmit({
      user_input: input.trim(),
      spot_name: selectedSpot,
      mood_tag: selectedMood,
    });
  };

  const handleClose = () => {
    setInput('');
    setSelectedSpot(undefined);
    setSelectedMood(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalHeader, { paddingTop: 48 }]}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={styles.modalCancel}>取消</Text>
          </Pressable>
          <Text style={styles.modalTitle}>写一条记忆</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* Input */}
          <Text style={styles.modalLabel}>描述你看到的、感受到的</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="比如：站在大佛脚下，仰望88米的青铜巨佛，内心无比震撼..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={input}
            onChangeText={setInput}
          />

          {/* Spot selection */}
          <Text style={styles.modalLabel}>关联景点（可选）</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spotScroll}>
            {spots.map((spot) => (
              <Pressable
                key={spot.id}
                style={({ pressed }) => [
                  styles.spotChip,
                  selectedSpot === spot.name && styles.spotChipActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedSpot(selectedSpot === spot.name ? undefined : spot.name)}
              >
                <Text style={[
                  styles.spotChipText,
                  selectedSpot === spot.name && styles.spotChipTextActive,
                ]} numberOfLines={1}>
                  {spot.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Mood selection */}
          <Text style={styles.modalLabel}>你的心情</Text>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((mood) => {
              const meta = MOOD_META[mood];
              return (
                <Pressable
                  key={mood}
                  style={({ pressed }) => [
                    styles.moodOption,
                    selectedMood === mood && styles.moodOptionActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedMood(selectedMood === mood ? undefined : mood)}
                >
                  <Text style={styles.moodOptionEmoji}>{meta.emoji}</Text>
                  <Text style={[
                    styles.moodOptionLabel,
                    selectedMood === mood && styles.moodOptionLabelActive,
                  ]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={styles.modalFooter}>
          <Pressable
            style={({ pressed }) => [
              styles.modalSubmitBtn,
              (!input.trim() || loading) && styles.modalSubmitBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSubmit}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.modalSubmitText}>✨ 数字人为你书写</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ═══════════════════════════════════════
//  Journey Summary Card
// ═══════════════════════════════════════
function SummaryCard({ summary, onGenerate, generating }: {
  summary: JourneySummary | null;
  onGenerate: () => void;
  generating: boolean;
}) {
  if (summary) {
    return (
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>旅程总结</Text>
          </View>
          <Text style={styles.summaryDate}>{summary.date_range}</Text>
        </View>
        <Text style={styles.summaryTitle}>{summary.title}</Text>
        <Text style={styles.summaryContent} numberOfLines={4}>{summary.content}</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNum}>{summary.spot_count}</Text>
            <Text style={styles.summaryStatLabel}>景点</Text>
          </View>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNum}>{summary.memory_count}</Text>
            <Text style={styles.summaryStatLabel}>记忆</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.summaryEmpty}>
      <Text style={styles.summaryEmptyIcon}>📖</Text>
      <Text style={styles.summaryEmptyTitle}>还没有旅程总结</Text>
      <Text style={styles.summaryEmptyHint}>生成记忆后，可一键总结整段旅程</Text>
      <Pressable
        style={({ pressed }) => [
          styles.summaryBtn,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.summaryBtnText}>生成旅程总结</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Action Bar
// ═══════════════════════════════════════
function ActionBar({ onGenerate, generating, onCreatePress, onSharePress, onCapsulePress }: {
  onGenerate: () => void;
  generating: boolean;
  onCreatePress: () => void;
  onSharePress: () => void;
  onCapsulePress: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.actionBar}>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnPrimary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onCreatePress}
      >
        <Text style={styles.actionBtnPrimaryText}>✨ 写一条记忆</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnSecondary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onGenerate}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={styles.actionBtnSecondaryText}>从对话生成</Text>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnTertiary,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onSharePress}
      >
        <Text style={styles.actionBtnTertiaryText}>📤 朋友圈</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.actionBtnCapsule,
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        onPress={onCapsulePress}
      >
        <Text style={styles.actionBtnCapsuleText}>🔮 胶囊</Text>
      </Pressable>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Memory Capsule Card (记忆胶囊卡片)
// ═══════════════════════════════════════
function MemoryCapsuleCard({ item, onUnlock }: {
  item: TravelMemory;
  onUnlock: (id: number) => Promise<void>;
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const lockScale = useSharedValue(1);
  const capsuleOpacity = useSharedValue(0);

  useEffect(() => {
    capsuleOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  // 计算剩余时间
  const remainingDays = useMemo(() => {
    if (!item.capsule_unlock_at) return 0;
    const unlockDate = new Date(item.capsule_unlock_at);
    const now = new Date();
    const diff = unlockDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [item.capsule_unlock_at]);

  const isReady = remainingDays === 0;

  const handleUnlock = async () => {
    if (!isReady || unlocking) return;
    setUnlocking(true);

    // 锁图标弹跳动画
    lockScale.value = withSequence(
      withTiming(1.3, { duration: 200 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onUnlock(item.id);
      setUnlocked(true);
      setTimeout(() => {
        setShowContent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 500);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUnlocking(false);
    }
  };

  const lockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));

  const capsuleAnimStyle = useAnimatedStyle(() => ({
    opacity: capsuleOpacity.value,
  }));

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={[styles.capsuleCard, capsuleAnimStyle]}>
      {/* 胶囊背景装饰 */}
      <View style={styles.capsuleBgDecor} />

      {!showContent ? (
        <>
          {/* 锁定状态 */}
          <View style={styles.capsuleLockArea}>
            <Animated.View style={[styles.capsuleLockIcon, lockAnimStyle]}>
              <Text style={styles.capsuleLockEmoji}>{isReady ? '🔓' : '🔒'}</Text>
            </Animated.View>
            <Text style={styles.capsuleTitle}>{item.title}</Text>
            <Text style={styles.capsuleHint}>
              {isReady ? '可以打开了' : `还需等待 ${remainingDays} 天`}
            </Text>
          </View>

          {isReady && (
            <Pressable
              style={({ pressed }) => [
                styles.capsuleUnlockBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleUnlock}
              disabled={unlocking}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.capsuleUnlockBtnText}>✨ 打开胶囊</Text>
              )}
            </Pressable>
          )}
        </>
      ) : (
        <>
          {/* 已解锁内容 */}
          <View style={styles.capsuleContentArea}>
            <Text style={styles.capsuleContentTitle}>💌 {item.title}</Text>
            <Text style={styles.capsuleContent}>
              {item.capsule_content || item.original_content}
            </Text>
            <Text style={styles.capsuleDate}>
              封存于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
            </Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Create Capsule Modal (创建胶囊弹窗)
// ═══════════════════════════════════════
function CreateCapsuleModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string; unlock_days: number }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState('给未来的自己');
  const [content, setContent] = useState('');
  const [unlockDays, setUnlockDays] = useState(30);

  const presetDays = [7, 30, 90, 365];

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({ title: title.trim() || '给未来的自己', content: content.trim(), unlock_days: unlockDays });
  };

  const handleClose = () => {
    setTitle('给未来的自己');
    setContent('');
    setUnlockDays(30);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalHeader, { paddingTop: 48 }]}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Text style={styles.modalCancel}>取消</Text>
          </Pressable>
          <Text style={styles.modalTitle}>🔮 记忆胶囊</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* 标题 */}
          <Text style={styles.modalLabel}>胶囊标题</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="给未来的自己..."
            placeholderTextColor={Colors.gray400}
            value={title}
            onChangeText={setTitle}
          />

          {/* 内容 */}
          <Text style={styles.modalLabel}>写给未来的话</Text>
          <TextInput
            style={[styles.modalInput, { minHeight: 150 }]}
            placeholder="亲爱的未来的自己，当你打开这封信时..."
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
          />

          {/* 解锁时间 */}
          <Text style={styles.modalLabel}>多久后打开？</Text>
          <View style={styles.capsuleDaysRow}>
            {presetDays.map((days) => (
              <Pressable
                key={days}
                style={({ pressed }) => [
                  styles.capsuleDayOption,
                  unlockDays === days && styles.capsuleDayOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setUnlockDays(days)}
              >
                <Text style={[
                  styles.capsuleDayText,
                  unlockDays === days && styles.capsuleDayTextActive,
                ]}>
                  {days < 30 ? `${days}天` : days < 365 ? `${days / 30}个月` : '1年'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.capsuleHintText}>
            💡 胶囊将在 {unlockDays} 天后解锁，届时你会收到提醒
          </Text>
        </ScrollView>

        {/* 提交按钮 */}
        <View style={styles.modalFooter}>
          <Pressable
            style={({ pressed }) => [
              styles.modalSubmitBtn,
              (!content.trim() || loading) && styles.modalSubmitBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSubmit}
            disabled={!content.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.modalSubmitText}>🔮 封存胶囊</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ═══════════════════════════════════════
//  Memory Card (手帐页风格)
// ═══════════════════════════════════════
function MemoryCard({ item, index, onPolish, achievements }: {
  item: TravelMemory;
  index: number;
  onPolish: (id: number) => Promise<TravelMemory>;
  achievements: Achievement[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInkDrop, setShowInkDrop] = useState(false);
  const [showAnimatedText, setShowAnimatedText] = useState(false);
  const [displayContent, setDisplayContent] = useState(item.polished_content || item.original_content);

  const mood = MOOD_META[item.mood_tag || ''] || { emoji: '📝', color: Colors.gray400, label: '' };
  const isLong = displayContent.length > 80;
  const hasPolished = !!item.polished_content;

  // 翻转动画
  const flipProgress = useSharedValue(0);

  // 印章动画
  const stampScale = useSharedValue(1);
  const stampOpacity = useSharedValue(1);

  const handleFlip = () => {
    if (!hasPolished) return;
    const newValue = isFlipped ? 0 : 1;
    flipProgress.value = withSpring(newValue, {
      damping: 15,
      stiffness: 120,
    });
    setIsFlipped(!isFlipped);
  };

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0.4, 0.6], [1, 0], Extrapolation.CLAMP),
    backfaceVisibility: 'hidden' as const,
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0.4, 0.6], [0, 1], Extrapolation.CLAMP),
    backfaceVisibility: 'hidden' as const,
  }));

  // 印章动画样式
  const stampAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: stampScale.value },
      { rotate: `${stampRotation}deg` },
    ],
    opacity: stampOpacity.value,
  }));

  const handlePolish = async () => {
    if (polishing) return;
    setPolishing(true);
    setShowInkDrop(true);
    setShowAnimatedText(false);

    // 触觉反馈 - 开始润色
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const updated = await onPolish(item.id);

      // 墨滴扩散完成后，开始逐字动画
      setTimeout(() => {
        setShowInkDrop(false);
        setShowAnimatedText(true);
        setDisplayContent(updated.polished_content || updated.original_content);

        // 触觉反馈 - 文字出现
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 印章盖下动画
        setTimeout(() => {
          stampScale.value = withSequence(
            withTiming(1.3, { duration: 150 }),
            withSpring(1, { damping: 8, stiffness: 200 })
          );
          // 触觉反馈 - 印章盖下
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 800);
      }, 800);
    } catch {
      setShowInkDrop(false);
    } finally {
      setPolishing(false);
    }
  };

  // 随机旋转角度模拟盖章效果
  const stampRotation = useMemo(() => Math.random() * 6 - 3, []);

  // 更新显示内容
  useEffect(() => {
    setDisplayContent(item.polished_content || item.original_content);
  }, [item.polished_content, item.original_content]);

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(350)}>
      <View style={styles.memoryCard}>
        {/* 宣纸纹理背景 */}
        <View style={styles.paperTexture} />

        {/* 墨滴扩散动画 */}
        {showInkDrop && <InkDropAnimation trigger={showInkDrop} />}

        {/* 正面：润色后的内容 */}
        <Animated.View style={[styles.cardFace, frontStyle]}>
          {/* 页眉：景点 + 日期 */}
          <View style={styles.cardHeader}>
            {item.spot_name && (
              <Text style={styles.cardSpotName}>📍 {item.spot_name}</Text>
            )}
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          {/* 分隔线 */}
          <View style={styles.cardDivider} />

          {/* 标题：书法字体 */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* 正文：楷体，支持逐字动画 */}
          {showAnimatedText ? (
            <AnimatedText text={displayContent} trigger={showAnimatedText} delay={30} />
          ) : (
            <Text
              style={styles.cardContent}
              numberOfLines={expanded ? undefined : 4}
            >
              {displayContent}
            </Text>
          )}

          {isLong && !showAnimatedText && (
            <Pressable onPress={() => setExpanded(!expanded)}>
              <Text style={styles.expandBtn}>{expanded ? '收起' : '展开全文'}</Text>
            </Pressable>
          )}

          {/* 情绪印章 */}
          <Animated.View style={[styles.moodStamp, stampAnimStyle, {
            borderColor: mood.color,
          }]}>
            <Text style={styles.moodStampEmoji}>{mood.emoji}</Text>
            <Text style={[styles.moodStampLabel, { color: mood.color }]}>
              {mood.label}
            </Text>
          </Animated.View>

          {/* 成就徽章 */}
          {achievements.filter(a => a.unlocked).length > 0 && (
            <View style={styles.cardAchievements}>
              {achievements.filter(a => a.unlocked).slice(0, 3).map((ach) => (
                <View key={ach.id} style={styles.cardAchievementBadge}>
                  <Text style={styles.cardAchievementIcon}>{ach.icon}</Text>
                  <Text style={styles.cardAchievementName} numberOfLines={1}>{ach.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 墨点虚线分隔 */}
          <View style={styles.inkDottedLine} />

          {/* 底部操作区 */}
          <View style={styles.cardFooter}>
            {hasPolished && (
              <Pressable
                style={({ pressed }) => [
                  styles.flipBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleFlip}
              >
                <Text style={styles.flipBtnText}>🖋 查看原文</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.polishBtn, pressed && { opacity: 0.7 }]}
              onPress={handlePolish}
              disabled={polishing}
            >
              {polishing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.polishBtnText}>
                  {hasPolished ? 'AI 再润色' : 'AI 润色'}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* 背面：原文内容 */}
        {hasPolished && (
          <Animated.View style={[styles.cardFace, styles.cardBack, backStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSpotName}>📜 原文</Text>
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <Text style={styles.cardContent} numberOfLines={expanded ? undefined : 6}>
              {item.original_content}
            </Text>
            {item.original_content.length > 120 && (
              <Pressable onPress={() => setExpanded(!expanded)}>
                <Text style={styles.expandBtn}>{expanded ? '收起' : '展开全文'}</Text>
              </Pressable>
            )}
            <View style={styles.inkDottedLine} />
            <Pressable
              style={({ pressed }) => [
                styles.flipBtn,
                styles.flipBtnBack,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleFlip}
            >
              <Text style={styles.flipBtnText}>↩ 返回润色版</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Ink Timeline Node (墨迹时间线节点)
// ═══════════════════════════════════════
function InkTimelineNode({ index, total, spotName }: {
  index: number;
  total: number;
  spotName: string | null;
}) {
  const nodeAnim = useSharedValue(0);

  useEffect(() => {
    nodeAnim.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nodeAnim.value }],
    opacity: nodeAnim.value,
  }));

  const isLast = index === total - 1;

  return (
    <View style={styles.inkNodeContainer}>
      {/* 墨迹连接线 */}
      {!isLast && (
        <View style={styles.inkLine} />
      )}
      {/* 墨点 */}
      <Animated.View style={[styles.inkDot, dotStyle]}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Circle cx={8} cy={8} r={7} fill={Colors.ink} opacity={0.12} />
          <Circle cx={8} cy={8} r={4} fill={Colors.ink} opacity={0.7} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════
//  Scroll Unfurl Animation (卷轴展开)
// ═══════════════════════════════════════
function ScrollUnfurl() {
  const scaleX = useSharedValue(0);
  const inkOpacity = useSharedValue(0);

  useEffect(() => {
    scaleX.value = withDelay(300, withTiming(1, { duration: 1200 }));
    inkOpacity.value = withDelay(800, withTiming(0.15, { duration: 1000 }));
  }, []);

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  const inkStyle = useAnimatedStyle(() => ({
    opacity: inkOpacity.value,
  }));

  return (
    <View style={styles.unfurlContainer}>
      {/* 墨晕背景 */}
      <Animated.View style={[styles.unfurlInk, inkStyle]} />
      {/* 卷轴 */}
      <Animated.View style={[styles.unfurlScroll, scrollStyle]}>
        <Svg width={200} height={120} viewBox="0 0 200 120">
          {/* 卷轴主体 */}
          <Rect x={10} y={10} width={180} height={100} rx={4} fill={Colors.paperWarm} stroke={Colors.borderDefault} strokeWidth={1} />
          {/* 卷轴轴心 */}
          <Rect x={6} y={6} width={8} height={108} rx={4} fill={Colors.ochre} opacity={0.6} />
          <Rect x={186} y={6} width={8} height={108} rx={4} fill={Colors.ochre} opacity={0.6} />
          {/* 空白宣纸纹理线 */}
          <Line x1={30} y1={35} x2={170} y2={35} stroke={Colors.borderLight} strokeWidth={0.5} />
          <Line x1={30} y1={55} x2={170} y2={55} stroke={Colors.borderLight} strokeWidth={0.5} />
          <Line x1={30} y1={75} x2={170} y2={75} stroke={Colors.borderLight} strokeWidth={0.5} />
          <Line x1={30} y1={95} x2={170} y2={95} stroke={Colors.borderLight} strokeWidth={0.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════
//  Empty State (开篇卷轴)
// ═══════════════════════════════════════
function EmptyState({ onGenerate, generating, onCreatePress }: {
  onGenerate: () => void;
  generating: boolean;
  onCreatePress: () => void;
}) {
  const router = useRouter();
  const titleOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    btnOpacity.value = withDelay(1600, withTiming(1, { duration: 500 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value }));

  return (
    <View style={styles.empty}>
      {/* 卷轴展开动画 */}
      <ScrollUnfurl />

      {/* 书法引言 */}
      <Animated.View style={[styles.emptyQuoteArea, titleStyle]}>
        <Text style={styles.emptyQuote}>「每一段旅程，都值得被铭记」</Text>
        <Text style={styles.emptyHint}>让小灵带你开始灵山之旅的第一笔</Text>
      </Animated.View>

      {/* 按钮 */}
      <Animated.View style={[styles.emptyBtns, btnStyle]}>
        <Pressable
          style={({ pressed }) => [
            styles.emptyBtn,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          onPress={onCreatePress}
        >
          <Text style={styles.emptyBtnIcon}>✒️</Text>
          <Text style={styles.emptyBtnText}>写下第一笔</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.emptyBtnOutline,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => router.push('/chat')}
        >
          <Text style={styles.emptyBtnOutlineText}>💬 和小灵聊聊开始</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════
//  Today Review Card (今日回顾)
// ═══════════════════════════════════════
function TodayReviewCard({ memories, onDismiss }: {
  memories: TravelMemory[];
  onDismiss: () => void;
}) {
  const today = new Date().toDateString();
  const todayMemories = useMemo(() => {
    return memories.filter((m) => new Date(m.created_at).toDateString() === today);
  }, [memories, today]);

  const [dismissed, setDismissed] = useState(false);
  const dismissX = useSharedValue(0);

  if (todayMemories.length === 0 || dismissed) return null;

  // 统计今日情绪
  const moodCounts: Record<string, number> = {};
  todayMemories.forEach((m) => {
    const mood = m.mood_tag || 'neutral';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  const moodMeta = MOOD_META[dominantMood] || { emoji: '📝', color: Colors.gray400, label: '平静' };

  // 统计今日景点
  const spotNames = Array.from(new Set(todayMemories.map((m) => m.spot_name).filter(Boolean)));

  // 生成摘要
  const summaryText = useMemo(() => {
    if (todayMemories.length === 1) {
      return `今天你在${spotNames[0]}留下了今日唯一一条记忆。`;
    }
    if (spotNames.length > 0) {
      return `今天你拜访了${spotNames.slice(0, 3).join('、')}，共记录了${todayMemories.length}条记忆。`;
    }
    return `今天你记录了${todayMemories.length}条旅行记忆。`;
  }, [todayMemories, spotNames]);

  const handleDismiss = () => {
    dismissX.value = withTiming(-400, { duration: 300 });
    setTimeout(() => setDismissed(true), 300);
    onDismiss();
  };

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dismissX.value }],
    opacity: interpolate(dismissX.value, [-400, 0], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={[styles.todayReviewCard, dismissStyle]}>
      <View style={styles.todayReviewHeader}>
        <View style={styles.todayReviewBadge}>
          <Text style={styles.todayReviewBadgeText}>📅 今日回顾</Text>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={8}>
          <Text style={styles.todayReviewClose}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.todayReviewSummary}>{summaryText}</Text>

      <View style={styles.todayReviewMeta}>
        <View style={styles.todayReviewMood}>
          <Text style={styles.todayReviewMoodEmoji}>{moodMeta.emoji}</Text>
          <Text style={[styles.todayReviewMoodLabel, { color: moodMeta.color }]}>
            {moodMeta.label}
          </Text>
        </View>
        {spotNames.length > 0 && (
          <View style={styles.todayReviewSpots}>
            <Text style={styles.todayReviewSpotsText} numberOfLines={1}>
              📍 {spotNames.slice(0, 3).join(' → ')}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.todayReviewDate}>
        {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
      </Text>
    </Animated.View>
  );
}

// ═══════════════════════════════════════
//  Memory Map View (记忆地图)
// ═══════════════════════════════════════
const MAP_SPOTS = [
  { name: '祥符寺', x: 60, y: 80, icon: '🏯' },
  { name: '灵山大佛', x: 140, y: 120, icon: '🗿' },
  { name: '梵华宫', x: 220, y: 90, icon: '🏛️' },
  { name: '九龙灌浴', x: 180, y: 180, icon: '⛲' },
  { name: '拈花湾', x: 100, y: 200, icon: '🌸' },
];

function MemoryMapView({ memories, spots }: {
  memories: TravelMemory[];
  spots: Spot[];
}) {
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const bottomSheetRef = useRef<any>(null);

  // 按景点分组记忆
  const memoriesBySpot = useMemo(() => {
    const grouped: Record<string, TravelMemory[]> = {};
    memories.forEach((m) => {
      if (m.spot_name) {
        if (!grouped[m.spot_name]) grouped[m.spot_name] = [];
        grouped[m.spot_name].push(m);
      }
    });
    return grouped;
  }, [memories]);

  // 计算每个景点的主情绪
  const spotMood = useMemo(() => {
    const moodMap: Record<string, Record<string, number>> = {};
    memories.forEach((m) => {
      if (m.spot_name && m.mood_tag) {
        if (!moodMap[m.spot_name]) moodMap[m.spot_name] = {};
        moodMap[m.spot_name][m.mood_tag] = (moodMap[m.spot_name][m.mood_tag] || 0) + 1;
      }
    });
    const result: Record<string, string> = {};
    Object.entries(moodMap).forEach(([spot, moods]) => {
      const dominant = Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0];
      result[spot] = dominant || 'neutral';
    });
    return result;
  }, [memories]);

  const handleSpotPress = (spotName: string) => {
    setSelectedSpot(spotName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectedMemories = selectedSpot ? (memoriesBySpot[selectedSpot] || []) : [];
  const selectedMood = selectedSpot ? spotMood[selectedSpot] : null;

  return (
    <View style={styles.mapContainer}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        {/* 背景装饰 */}
        <Defs>
          <RadialGradient id="mapBg">
            <Stop offset="0%" stopColor={Colors.primaryBg} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={Colors.paper} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="280" height="260" fill="url(#mapBg)" />

        {/* 连接线 */}
        {MAP_SPOTS.map((spot, i) => {
          if (i === 0) return null;
          const prev = MAP_SPOTS[i - 1];
          return (
            <Line
              key={`line-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={spot.x}
              y2={spot.y}
              stroke={Colors.gray300}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.5}
            />
          );
        })}

        {/* 景点气泡 */}
        {MAP_SPOTS.map((spot) => {
          const count = memoriesBySpot[spot.name]?.length || 0;
          const mood = spotMood[spot.name];
          const moodColor = mood ? MOOD_META[mood]?.color || Colors.gray400 : Colors.gray300;
          const radius = Math.max(20, Math.min(35, 20 + count * 3));
          const isSelected = selectedSpot === spot.name;

          return (
            <Pressable key={spot.name} onPress={() => handleSpotPress(spot.name)}>
              <G>
                {/* 光晕 */}
                {count > 0 && (
                  <Circle
                    cx={spot.x}
                    cy={spot.y}
                    r={radius + 8}
                    fill={moodColor}
                    opacity={0.15}
                  />
                )}
                {/* 主气泡 */}
                <Circle
                  cx={spot.x}
                  cy={spot.y}
                  r={radius}
                  fill={count > 0 ? moodColor : Colors.gray200}
                  stroke={isSelected ? Colors.ink : Colors.gray400}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={count > 0 ? 0.85 : 0.4}
                />
                {/* 图标 */}
                <SvgText
                  x={spot.x}
                  y={spot.y + 6}
                  fontSize={18}
                  textAnchor="middle"
                >
                  {spot.icon}
                </SvgText>
                {/* 景点名 */}
                <SvgText
                  x={spot.x}
                  y={spot.y + radius + 16}
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                  fill={Colors.ink}
                >
                  {spot.name}
                </SvgText>
                {/* 记忆数 */}
                {count > 0 && (
                  <SvgText
                    x={spot.x + radius - 8}
                    y={spot.y - radius + 12}
                    fontSize={10}
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#fff"
                  >
                    {count}
                  </SvgText>
                )}
              </G>
            </Pressable>
          );
        })}
      </Svg>

      {/* Bottom Sheet for selected spot */}
      <Modal
        visible={!!selectedSpot}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSpot(null)}
      >
        <Pressable
          style={styles.mapSheetBackdrop}
          onPress={() => setSelectedSpot(null)}
        >
          <View style={styles.mapSheetContent}>
            <View style={styles.mapSheetHeader}>
              <Text style={styles.mapSheetTitle}>
                {MAP_SPOTS.find((s) => s.name === selectedSpot)?.icon} {selectedSpot}
              </Text>
              <Pressable onPress={() => setSelectedSpot(null)}>
                <Text style={styles.mapSheetClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.mapSheetScroll} showsVerticalScrollIndicator={false}>
              {selectedMemories.length === 0 ? (
                <Text style={styles.mapSheetEmpty}>这里还没有记忆</Text>
              ) : (
                selectedMemories.map((m, idx) => (
                  <View key={m.id} style={styles.mapSheetMemory}>
                    <Text style={styles.mapSheetMemoryTitle}>{m.title}</Text>
                    <Text style={styles.mapSheetMemoryContent} numberOfLines={2}>
                      {m.polished_content || m.original_content}
                    </Text>
                    <Text style={styles.mapSheetMemoryDate}>
                      {new Date(m.created_at).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════
//  Share Card Generator (朋友圈分享卡片)
// ═══════════════════════════════════════
function ShareCardPreview({ visible, onClose, memories, summary }: {
  visible: boolean;
  onClose: () => void;
  memories: TravelMemory[];
  summary: JourneySummary | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<View>(null);

  // 生成 3-5 张卡片文案
  const cards = useMemo(() => {
    if (!summary && memories.length === 0) return [];

    const result: Array<{
      title: string;
      content: string;
      spotName: string | null;
      mood: string | null;
    }> = [];

    // 第一张：总览
    if (summary) {
      result.push({
        title: summary.title,
        content: summary.content.slice(0, 100),
        spotName: null,
        mood: null,
      });
    }

    // 后续：每条记忆
    memories.slice(0, 4).forEach((m) => {
      result.push({
        title: m.title,
        content: (m.polished_content || m.original_content).slice(0, 80),
        spotName: m.spot_name,
        mood: m.mood_tag,
      });
    });

    return result.slice(0, 5);
  }, [memories, summary]);

  const currentCard = cards[currentIndex];

  const handleSave = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1440,
      });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.createAssetAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1440,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '分享你的灵山墨卷',
      });
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!visible || !currentCard) return null;

  const moodMeta = currentCard.mood ? MOOD_META[currentCard.mood] : null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.shareModalRoot}>
        <View style={styles.shareModalHeader}>
          <Text style={styles.shareModalTitle}>朋友圈图文预览</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.shareModalClose}>✕</Text>
          </Pressable>
        </View>

        {/* 卡片预览 */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
            setCurrentIndex(idx);
          }}
          scrollEventThrottle={100}
        >
          {cards.map((card, idx) => {
            const cardMood = card.mood ? MOOD_META[card.mood] : null;
            return (
              <View key={idx} style={styles.shareCardContainer}>
                <View ref={idx === currentIndex ? cardRef : undefined} style={styles.shareCard}>
                  {/* 水墨背景 */}
                  <View style={styles.shareCardBg} />

                  {/* 标题 */}
                  <Text style={styles.shareCardTitle}>{card.title}</Text>

                  {/* 正文 */}
                  <Text style={styles.shareCardContent}>{card.content}</Text>

                  {/* 景点 + 情绪 */}
                  <View style={styles.shareCardMeta}>
                    {card.spotName && (
                      <Text style={styles.shareCardSpot}>📍 {card.spotName}</Text>
                    )}
                    {cardMood && (
                      <Text style={styles.shareCardMood}>
                        {cardMood.emoji} {cardMood.label}
                      </Text>
                    )}
                  </View>

                  {/* 底部标识 */}
                  <View style={styles.shareCardFooter}>
                    <Text style={styles.shareCardBrand}>灵山手帐 · 你的墨卷</Text>
                    <Text style={styles.shareCardPage}>{idx + 1} / {cards.length}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* 操作按钮 */}
        <View style={styles.shareModalActions}>
          <Pressable
            style={({ pressed }) => [
              styles.shareModalBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSave}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareModalBtnText}>💾 保存到相册</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.shareModalBtnOutline,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleShare}
            disabled={generating}
          >
            <Text style={styles.shareModalBtnOutlineText}>📤 分享</Text>
          </Pressable>
        </View>

        {/* 页码指示器 */}
        <View style={styles.shareModalDots}>
          {cards.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.shareModalDot,
                idx === currentIndex && styles.shareModalDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════
export default function MemoryPage() {
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);
  const scrollY = useSharedValue(0);

  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [showShareModal, setShowShareModal] = useState(false);
  const [todayDismissed, setTodayDismissed] = useState(false);
  const [showCapsuleModal, setShowCapsuleModal] = useState(false);
  const [capsuleLoading, setCapsuleLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [memoriesRes, summaryRes, profileRes, achRes, spotsRes] = await Promise.all([
        listMemories(SESSION_ID).catch(() => []),
        getLatestSummary(SESSION_ID).catch(() => null),
        getUserProfile(SESSION_ID).catch(() => null),
        getAchievements(SESSION_ID).catch(() => ({ achievements: [], unlocked_count: 0, total_count: 0 })),
        listSpots().catch(() => []),
      ]);
      const memData = (memoriesRes as any).data ?? memoriesRes;
      setMemories(Array.isArray(memData) ? memData : []);
      setSummary(summaryRes);
      setProfile(profileRes);
      setAchievements(achRes.achievements || []);
      const spotsData = (spotsRes as any).data ?? spotsRes;
      setSpots(Array.isArray(spotsData) ? spotsData : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    VRMManager.setPageContext('memory');
    const timer = setTimeout(() => {
      const count = memories.length;
      vrmRef.current?.speak(
        count > 0
          ? `您已记录了${count}条旅行记忆`
          : '开始记录您的灵山之旅吧',
        'neutral',
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [memories.length]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generateMemories(SESSION_ID);
      await loadData();
      vrmRef.current?.speak('已从对话中提取旅行记忆', 'neutral');
    } catch {
      vrmRef.current?.speak('记忆生成失败，请稍后再试', 'sad');
    } finally {
      setGenerating(false);
    }
  }, [loadData]);

  const handleGenerateSummary = useCallback(async () => {
    setSummaryGenerating(true);
    try {
      const result = await generateSummary(SESSION_ID);
      setSummary(result);
      vrmRef.current?.speak('旅程总结已生成', 'neutral');
    } catch {
      vrmRef.current?.speak('总结生成失败，请先生成更多记忆', 'sad');
    } finally {
      setSummaryGenerating(false);
    }
  }, []);

  const handlePolish = useCallback(async (memoryId: number) => {
    try {
      const updated = await polishMemory(memoryId);
      setMemories((prev) => prev.map((m) => m.id === memoryId ? updated : m));
      vrmRef.current?.speak('记忆已润色', 'neutral');
      return updated;
    } catch {
      vrmRef.current?.speak('润色失败，请稍后再试', 'sad');
      throw new Error('润色失败');
    }
  }, []);

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
      });
      setShowCreateModal(false);
      await loadData();
      vrmRef.current?.speak('记忆已为你书写并保存', 'neutral');
    } catch {
      vrmRef.current?.speak('记忆生成失败，请稍后再试', 'sad');
    } finally {
      setCreateLoading(false);
    }
  }, [loadData]);

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
      vrmRef.current?.speak('记忆胶囊已封存，时间到了我会提醒你', 'neutral');
    } catch {
      vrmRef.current?.speak('胶囊创建失败，请稍后再试', 'sad');
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
    loadData();
  }, [loadData]);

  const spotCount = new Set(memories.filter((m) => m.spot_name).map((m) => m.spot_name)).size;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <HeroHeader
          scrollY={scrollY}
          insets={insets}
          memoryCount={memories.length}
          spotCount={spotCount}
          memories={memories}
          spots={spots}
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>墨韵渐染...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Achievement Bar */}
            <AchievementBar profile={profile} achievements={achievements} />

            {/* Today Review Card */}
            {!todayDismissed && memories.length > 0 && (
              <TodayReviewCard
                memories={memories}
                onDismiss={() => setTodayDismissed(true)}
              />
            )}

            {memories.length === 0 ? (
              <EmptyState
                onGenerate={handleGenerate}
                generating={generating}
                onCreatePress={() => setShowCreateModal(true)}
              />
            ) : (
              <>
                {/* Summary */}
                <View style={styles.section}>
                  <SummaryCard
                    summary={summary}
                    onGenerate={handleGenerateSummary}
                    generating={summaryGenerating}
                  />
                </View>

                {/* Actions */}
                <ActionBar
                  onGenerate={handleGenerate}
                  generating={generating}
                  onCreatePress={() => setShowCreateModal(true)}
                  onSharePress={() => setShowShareModal(true)}
                  onCapsulePress={() => setShowCapsuleModal(true)}
                />

                {/* View Mode Toggle */}
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

                {/* Memory Timeline or Map View */}
                {viewMode === 'timeline' ? (
                  <View style={styles.section}>
                    <SectionHeader title="记忆时光" subtitle="MEMORIES" />
                    <View style={styles.inkTimeline}>
                      {memories.map((item, idx) => (
                        <View key={item.id} style={styles.inkTimelineItem}>
                          <InkTimelineNode
                            index={idx}
                            total={memories.length}
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
                                index={idx}
                                onPolish={handlePolish}
                                achievements={achievements}
                              />
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.section}>
                    <SectionHeader title="记忆地图" subtitle="MEMORY MAP" />
                    <MemoryMapView memories={memories} spots={spots} />
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <VRMFloating ref={vrmRef} position="bottom-right" />

      <CreateMemoryModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateMemory}
        spots={spots}
        loading={createLoading}
      />

      <ShareCardPreview
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        memories={memories}
        summary={summary}
      />

      <CreateCapsuleModal
        visible={showCapsuleModal}
        onClose={() => setShowCapsuleModal(false)}
        onSubmit={handleCreateCapsule}
        loading={capsuleLoading}
      />
    </View>
  );
}

// ═══════════════════════════════════════
//  Styles
// ═══════════════════════════════════════
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },

  // ═══ Hero Header (水墨山水) ═══
  heroHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginBottom: 4,
    overflow: 'hidden',
  },
  heroGradientTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.paper,
    opacity: 0.5,
  },
  heroGradientBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  heroTitleArea: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    zIndex: 2,
  },
  heroSub: {
    fontSize: 9,
    letterSpacing: 4,
    color: Colors.gray400,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 6,
  },
  heroQuoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: Radius.md,
  },
  heroQuoteMark: {
    fontSize: 16,
    fontFamily: 'MaShanZheng',
    color: Colors.accent,
    opacity: 0.6,
  },
  heroQuote: {
    fontSize: 14,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 2,
    marginHorizontal: 4,
  },
  heroRouteArea: {
    width: '100%',
    marginBottom: 12,
    zIndex: 2,
  },
  routeMapScroll: {
    paddingHorizontal: 8,
  },
  routeMapContainer: {
    height: 70,
    position: 'relative',
  },
  routeLabels: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    height: 20,
  },
  routeLabel: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'center',
    width: 32,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    zIndex: 2,
  },
  heroStatStamp: {
    alignItems: 'center',
    minWidth: 50,
  },
  heroStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  heroStatLabel: {
    fontSize: 10,
    color: Colors.gray400,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },
  cloud: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },

  // Content
  content: { paddingHorizontal: 16 },
  section: { marginBottom: 20 },

  // Loading
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 80 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 4, marginTop: 16 },

  // ═══ Achievement Bar ═══
  achieveSection: { marginBottom: 20 },
  levelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14,
    marginBottom: 12,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelIcon: { fontSize: 28 },
  levelName: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  levelScore: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  stampProgress: { alignItems: 'flex-end', gap: 4 },
  stampProgressText: { fontSize: 11, color: Colors.gray500 },
  progressBar: {
    width: 80, height: 4, backgroundColor: Colors.gray200, borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  achieveHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  achieveTitle: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  achieveCount: { fontSize: 11, color: Colors.gray400 },
  achieveScroll: { gap: 8 },
  achieveCard: {
    width: 72, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: Radius.md, padding: 10,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  achieveCardLocked: { opacity: 0.45 },
  achieveIcon: { fontSize: 24 },
  achieveIconLocked: { opacity: 0.4 },
  achieveName: { fontSize: 10, fontWeight: '500', color: Colors.ink, textAlign: 'center' },
  achieveNameLocked: { color: Colors.gray400 },

  // Stamps
  stampCard: {
    width: 64, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: Radius.md, padding: 8,
    borderWidth: 1.5, borderColor: Colors.gold + '60',
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  stampCardLocked: {
    borderColor: Colors.borderLight, shadowOpacity: 0, opacity: 0.4,
  },
  stampSymbol: { fontSize: 22 },
  stampSymbolLocked: { opacity: 0.3 },
  stampName: { fontSize: 9, fontWeight: '600', color: Colors.ink, textAlign: 'center' },
  stampNameLocked: { color: Colors.gray400 },

  // ═══ Summary Card ═══
  summaryCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 18,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  summaryBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.primaryBg, borderRadius: 4,
  },
  summaryBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
  summaryDate: { fontSize: 11, color: Colors.gray400 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink, letterSpacing: 1, marginBottom: 8 },
  summaryContent: { fontSize: 13, color: Colors.gray600, lineHeight: 20, marginBottom: 12 },
  summaryStats: {
    flexDirection: 'row', gap: 20,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  summaryStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryStatNum: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  summaryStatLabel: { fontSize: 12, color: Colors.gray400 },

  // Summary Empty
  summaryEmpty: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 24, alignItems: 'center',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryEmptyIcon: { fontSize: 40, marginBottom: 10 },
  summaryEmptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  summaryEmptyHint: { fontSize: 12, color: Colors.gray400, textAlign: 'center', marginBottom: 16 },
  summaryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
  },
  summaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 1 },

  // ═══ Action Bar ═══
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionBtnPrimary: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  actionBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  actionBtnSecondary: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },
  actionBtnTertiary: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: Colors.accentBg, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.accent + '30',
  },
  actionBtnTertiaryText: { fontSize: 14, fontWeight: '600', color: Colors.accent, letterSpacing: 1 },
  actionBtnCapsule: {
    flex: 1, minWidth: '45%', paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#F3EAFF', borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: '#9B59B6' + '30',
  },
  actionBtnCapsuleText: { fontSize: 14, fontWeight: '600', color: '#9B59B6', letterSpacing: 1 },

  // ═══ Ink Timeline (墨迹时间线) ═══
  inkTimeline: {
    gap: 0,
  },
  inkTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inkNodeContainer: {
    width: 32,
    alignItems: 'center',
    paddingTop: 24,
  },
  inkDot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inkLine: {
    width: 1.5,
    flex: 1,
    minHeight: 40,
    backgroundColor: Colors.gray300,
    opacity: 0.4,
    marginTop: 4,
  },
  inkTimelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 12,
  },

  // Memory Card (手帐页风格)
  memoryCard: {
    backgroundColor: Colors.paperWarm,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 180,
  },
  paperTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.paperWarm,
    opacity: 0.95,
  },
  cardFace: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.paperWarm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSpotName: {
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 11,
    color: Colors.gray400,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 1,
    marginBottom: 10,
    lineHeight: 26,
  },
  cardContent: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 24,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  expandBtn: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  moodStamp: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  moodStampEmoji: {
    fontSize: 20,
  },
  moodStampLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  cardAchievements: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  cardAchievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperWarm,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  cardAchievementIcon: {
    fontSize: 12,
  },
  cardAchievementName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.ink,
    maxWidth: 60,
  },
  inkDottedLine: {
    height: 1,
    borderStyle: 'dotted',
    borderWidth: 0.5,
    borderColor: Colors.gray300,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gray100,
  },
  flipBtnBack: {
    backgroundColor: Colors.primaryBg,
  },
  flipBtnText: {
    fontSize: 12,
    color: Colors.gray600,
    fontWeight: '500',
  },
  polishBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryBg,
    minWidth: 70,
    alignItems: 'center',
  },
  polishBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },

  // ═══ Animated Text Styles ═══
  animatedTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  animatedChar: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 24,
    letterSpacing: 0.5,
  },

  // ═══ Ink Drop Animation ═══
  inkDrop: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    borderRadius: 50,
    backgroundColor: Colors.ink,
    zIndex: 10,
  },

  // ═══ Scroll Unfurl Animation ═══
  unfurlContainer: {
    width: 200,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  unfurlInk: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.ink,
    borderRadius: 100,
  },
  unfurlScroll: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══ Empty State ═══
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyQuoteArea: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  emptyQuote: {
    fontSize: 20,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 2,
    textAlign: 'center',
  },
  emptyHint: { fontSize: 13, color: Colors.gray400, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtns: { gap: 10, width: '100%' },
  emptyBtn: {
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  emptyBtnIcon: { fontSize: 16 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  emptyBtnOutline: {
    paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  emptyBtnOutlineText: { fontSize: 14, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },

  // ═══ Create Memory Modal ═══
  modalRoot: { flex: 1, backgroundColor: Colors.paper },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalCancel: { fontSize: 14, color: Colors.gray500 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.ink },
  modalBody: { flex: 1, padding: 16 },
  modalLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.ink, marginBottom: 8, marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#fff', borderRadius: Radius.md, padding: 14,
    fontSize: 14, color: Colors.ink, lineHeight: 22, minHeight: 120,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  spotScroll: { gap: 8 },
  spotChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#fff', borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  spotChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  spotChipText: { fontSize: 12, color: Colors.gray600 },
  spotChipTextActive: { color: '#fff', fontWeight: '600' },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodOption: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  moodOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  moodOptionEmoji: { fontSize: 22 },
  moodOptionLabel: { fontSize: 10, color: Colors.gray500 },
  moodOptionLabelActive: { color: Colors.primary, fontWeight: '600' },
  modalFooter: {
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  modalSubmitBtn: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  modalSubmitBtnDisabled: { opacity: 0.5 },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 1 },

  // ═══ Today Review Card ═══
  todayReviewCard: {
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
    borderLeftColor: Colors.primary,
  },
  todayReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  todayReviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.sm,
  },
  todayReviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  todayReviewClose: {
    fontSize: 16,
    color: Colors.gray400,
    padding: 4,
  },
  todayReviewSummary: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: 12,
  },
  todayReviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  todayReviewMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayReviewMoodEmoji: { fontSize: 14 },
  todayReviewMoodLabel: { fontSize: 11, fontWeight: '600' },
  todayReviewSpots: { flex: 1 },
  todayReviewSpotsText: {
    fontSize: 11,
    color: Colors.gray500,
  },
  todayReviewDate: {
    fontSize: 10,
    color: Colors.gray400,
    textAlign: 'right',
  },

  // ═══ Memory Map View ═══
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
  mapContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mapSheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mapSheetContent: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '50%',
    paddingBottom: 32,
  },
  mapSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  mapSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  mapSheetClose: {
    fontSize: 18,
    color: Colors.gray400,
    padding: 4,
  },
  mapSheetScroll: {
    padding: 16,
    gap: 12,
  },
  mapSheetEmpty: {
    fontSize: 14,
    color: Colors.gray400,
    textAlign: 'center',
    paddingVertical: 24,
  },
  mapSheetMemory: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 14,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  mapSheetMemoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 4,
  },
  mapSheetMemoryContent: {
    fontSize: 13,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: 6,
  },
  mapSheetMemoryDate: {
    fontSize: 11,
    color: Colors.gray400,
  },

  // ═══ Share Card Preview ═══
  shareModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  shareModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  shareModalClose: {
    fontSize: 20,
    color: '#fff',
    padding: 4,
  },
  shareCardContainer: {
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  shareCard: {
    width: 320,
    height: 426,
    backgroundColor: Colors.paperWarm,
    borderRadius: Radius.xl,
    padding: 28,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  shareCardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.paperWarm,
    opacity: 0.95,
  },
  shareCardTitle: {
    fontSize: 22,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 16,
    lineHeight: 30,
    zIndex: 1,
  },
  shareCardContent: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 24,
    marginBottom: 20,
    zIndex: 1,
  },
  shareCardMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    zIndex: 1,
  },
  shareCardSpot: {
    fontSize: 12,
    color: Colors.gray500,
  },
  shareCardMood: {
    fontSize: 12,
    color: Colors.gray500,
  },
  shareCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    zIndex: 1,
  },
  shareCardBrand: {
    fontSize: 11,
    fontFamily: 'MaShanZheng',
    color: Colors.gray400,
    letterSpacing: 2,
  },
  shareCardPage: {
    fontSize: 10,
    color: Colors.gray400,
  },
  shareModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  shareModalBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
  },
  shareModalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  shareModalBtnOutline: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shareModalBtnOutlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  shareModalDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 24,
  },
  shareModalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  shareModalDotActive: {
    backgroundColor: '#fff',
    width: 16,
  },

  // ═══ Memory Capsule Styles ═══
  capsuleCard: {
    backgroundColor: Colors.accentBg,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  capsuleBgDecor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accent,
    opacity: 0.03,
    borderRadius: Radius.lg,
  },
  capsuleLockArea: {
    alignItems: 'center',
    marginBottom: 16,
  },
  capsuleLockIcon: {
    marginBottom: 12,
  },
  capsuleLockEmoji: {
    fontSize: 48,
  },
  capsuleTitle: {
    fontSize: 18,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 8,
  },
  capsuleHint: {
    fontSize: 13,
    color: Colors.gray500,
    textAlign: 'center',
  },
  capsuleUnlockBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  capsuleUnlockBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  capsuleContentArea: {
    gap: 12,
  },
  capsuleContentTitle: {
    fontSize: 16,
    fontFamily: 'MaShanZheng',
    color: Colors.ink,
    letterSpacing: 1,
  },
  capsuleContent: {
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.gray600,
    lineHeight: 24,
  },
  capsuleDate: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'right',
  },
  capsuleDaysRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  capsuleDayOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  capsuleDayOptionActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  capsuleDayText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '500',
  },
  capsuleDayTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  capsuleHintText: {
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 18,
    marginTop: 8,
  },
});
