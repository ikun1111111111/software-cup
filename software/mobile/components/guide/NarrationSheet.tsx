import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { VRMView } from '@/components/vrm/VRMView';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { SPOT_IMAGES } from '@/constants/scenic';
import { estimateNarrationDurationSeconds } from '@/utils/digitalHumanDriver';
import { getTimedTextSlice } from '@/utils/textTimeline';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_RADIUS = 24;
const BTN_RADIUS = 16;

export interface NarrationContent {
  spot: {
    id: string;
    name: string;
    image?: string;
    overview?: string;
  };
  text: string;
  audioUrl?: string;
  duration?: number;
}

interface Props {
  content: NarrationContent;
  onClose: () => void;
  onSkip: () => void;
  onQuestion: () => void;
}

/**
 * 沉浸式讲解 BottomSheet
 * 禅意设计风格 - 佛教文化主题
 */
export const NarrationSheet: React.FC<Props> = ({
  content,
  onClose,
  onSkip,
  onQuestion,
}) => {
  const insets = useSafeAreaInsets();
  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action,
    actionDurationMs,
    headRotation,
    speak: speakWithDigitalHuman,
    stop: stopDigitalHuman,
  } = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE, { speakerId: 'narration-sheet' });
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  const cursorAnim = useRef(new Animated.Value(1)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastProgressTickRef = useRef<number | null>(null);

  const duration = estimateNarrationDurationSeconds(content.text, content.duration);
  const progress = duration > 0 ? Math.min(elapsedSeconds / duration, 1) : 0;
  const displayDurationSeconds = Math.ceil(duration);
  const displayElapsedSeconds = progress >= 1
    ? displayDurationSeconds
    : Math.min(elapsedSeconds, displayDurationSeconds);
  const spotImage = SPOT_IMAGES[content.spot.id];
  const digitalHumanLine = isPlaying
    ? subtitle || '我在为你讲这一站的重点。'
    : '小灵已暂停，继续后接着讲。';

  // 入场动画
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 26,
      stiffness: 120,
    }).start();

    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // 声波动画
  useEffect(() => {
    if (isPlaying) {
      const loops = [
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim1, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim1, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim2, {
              toValue: 1,
              duration: 600,
              delay: 200,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim2, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim3, {
              toValue: 1,
              duration: 600,
              delay: 400,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim3, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
      ];
      loops.forEach((l) => l.start());
      return () => loops.forEach((l) => l.stop());
    }
  }, [isPlaying]);

  // 光标闪烁
  useEffect(() => {
    if (isPlaying && displayedText) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isPlaying, displayedText]);

  // 进度更新
  useEffect(() => {
    if (!isPlaying) return;
    lastProgressTickRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTick = lastProgressTickRef.current ?? now;
      lastProgressTickRef.current = now;

      setElapsedSeconds((prev) => {
        const next = Math.min(duration, prev + (now - lastTick) / 1000);
        if (next >= duration) {
          clearInterval(interval);
        }
        return next;
      });
    }, 250);

    return () => {
      lastProgressTickRef.current = null;
      clearInterval(interval);
    };
  }, [isPlaying, duration]);

  // 流式文字输出 - 按讲解进度同步显示
  useEffect(() => {
    const fullText = content.text;
    setCurrentText(fullText);
    setElapsedSeconds(0);
    setDisplayedText('');
  }, [content.text]);

  useEffect(() => {
    setDisplayedText(getTimedTextSlice(currentText, elapsedSeconds * 1000, duration * 1000));
  }, [currentText, duration, elapsedSeconds]);

  // 同步 VRM 说话
  useEffect(() => {
    if (!currentText) return undefined;

    if (!isPlaying) {
      stopDigitalHuman();
      return undefined;
    }

    const spokenText = currentText.length > 140
      ? `${currentText.slice(0, 140)}...`
      : currentText;

    speakWithDigitalHuman(spokenText, {
      emotion: 'neutral',
      durationMs: duration * 1000,
      action: 'point',
      actionDurationMs: 1200,
    });

    return () => {
      stopDigitalHuman();
    };
  }, [currentText, duration, isPlaying, speakWithDigitalHuman, stopDigitalHuman]);

  const handlePauseResume = () => {
    if (!isPlaying) {
      setElapsedSeconds(0);
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = useCallback(
    (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    },
    []
  );

  const getWaveStyle = (anim: Animated.Value) => ({
    transform: [
      {
        scaleY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
  });

  const heroImageOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const heroImageScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 1.1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* 顶部装饰线 */}
      <View style={styles.topAccent} pointerEvents="none" />

      {/* 景点 Hero 图片区域 */}
      <View style={styles.heroSection}>
        {spotImage ? (
          <Animated.View style={{ opacity: heroImageOpacity, transform: [{ scale: heroImageScale }] }}>
            <Image
              source={spotImage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]} />
        )}
        {/* 渐变遮罩 */}
        <View style={styles.heroGradient}>
          <View style={styles.heroGradientOverlay} />
        </View>
        {/* 景点名称覆盖 */}
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>景点讲解</Text>
          </View>
          <Text style={styles.heroTitle}>{content.spot.name}</Text>
          {content.spot.overview && (
            <Text style={styles.heroOverview} numberOfLines={2}>
              {content.spot.overview}
            </Text>
          )}
        </View>
      </View>

      {/* 可滚动内容 */}
      <Animated.ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* 进度条卡片 */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>讲解进度</Text>
            <View style={styles.progressTime}>
              <Text style={styles.progressTimeText}>
                {formatTime(displayElapsedSeconds)}
              </Text>
              <Text style={styles.progressTimeDivider}> / </Text>
              <Text style={styles.progressTimeTotal}>
                {formatTime(displayDurationSeconds)}
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressMilestones}>
            <View style={[styles.milestone, { opacity: progress > 0 ? 1 : 0.3 }]} />
            <View style={[styles.milestone, { opacity: progress > 0.25 ? 1 : 0.3 }]} />
            <View style={[styles.milestone, { opacity: progress > 0.5 ? 1 : 0.3 }]} />
            <View style={[styles.milestone, { opacity: progress > 0.75 ? 1 : 0.3 }]} />
            <View style={[styles.milestone, { opacity: progress >= 1 ? 1 : 0.3 }]} />
          </View>
        </View>

        {/* 数字人讲解员 */}
        <View style={styles.digitalHumanCard} pointerEvents="none">
          <View style={styles.digitalHumanCopy}>
            <View style={styles.digitalHumanStatus}>
              <View style={[styles.digitalHumanDot, !isPlaying && styles.digitalHumanDotPaused]} />
              <Text style={styles.digitalHumanStatusText}>
                {isPlaying ? '小灵正在讲' : '小灵已暂停'}
              </Text>
            </View>
            <Text style={styles.digitalHumanTitle}>数字人讲解员</Text>
            <Text style={styles.digitalHumanText} numberOfLines={2}>
              {digitalHumanLine}
            </Text>
          </View>
          <View style={styles.digitalHumanStage}>
            <View style={styles.digitalHumanGroundShadow} />
            <VRMView
              mode="float"
              expression={expression}
              mouthOpen={mouthOpen}
              speaking={isPlaying && isSpeaking}
              action={action}
              actionDuration={actionDurationMs}
              headRotation={headRotation}
              costumeId="festival-spring"
            />
          </View>
        </View>

        {/* 字幕区域 */}
        <View style={styles.subtitleCard}>
          <View style={styles.subtitleHeader}>
            <View style={styles.subtitleHeaderLine} />
            <View style={styles.subtitleHeaderIcon}>
              <Text style={styles.subtitleHeaderIconText}></Text>
            </View>
            <View style={styles.subtitleHeaderLine} />
          </View>

          <View style={styles.subtitleBody}>
            <Text style={styles.subtitleText}>
              {displayedText || (
                <Text style={styles.subtitlePlaceholder}>
                  正在准备讲解...
                </Text>
              )}
              {isPlaying && displayedText && (
                <Animated.Text
                  style={[styles.cursor, { opacity: cursorAnim }]}
                >
                  
                </Animated.Text>
              )}
            </Text>
          </View>
        </View>

        {/* 底部间距 */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* 顶部栏 */}
      <Animated.View style={[styles.header, { opacity: fadeInAnim }]}>
        <Pressable
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <View style={styles.closeIconWrap}>
            <Text style={styles.closeIcon}>×</Text>
          </View>
        </Pressable>

        {/* 声波指示器 */}
        <View style={styles.audioIndicator}>
          <View style={styles.waveContainer}>
            <Animated.View style={[styles.waveBar, getWaveStyle(waveAnim1)]} />
            <Animated.View style={[styles.waveBar, getWaveStyle(waveAnim2)]} />
            <Animated.View style={[styles.waveBar, getWaveStyle(waveAnim3)]} />
          </View>
          <Text style={styles.audioLabel}>
            {isPlaying ? '讲解中' : '已暂停'}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* 底部控制栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              styles.controlBtnSecondary,
              pressed && styles.btnPressed,
            ]}
            onPress={handlePauseResume}
            hitSlop={8}
          >
            <Text style={styles.controlBtnIcon}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
            <Text style={styles.controlBtnText}>
              {isPlaying ? '暂停' : '继续'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              styles.controlBtnPrimary,
              pressed && styles.btnPressedPrimary,
            ]}
            onPress={onSkip}
            hitSlop={8}
          >
            <Text style={styles.controlBtnIcon}></Text>
            <Text style={[styles.controlBtnText, styles.controlBtnPrimaryText]}>
              跳过
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              styles.controlBtnQuestion,
              pressed && styles.btnPressed,
            ]}
            onPress={onQuestion}
            hitSlop={8}
          >
            <Text style={styles.controlBtnIcon}></Text>
            <Text style={styles.controlBtnText}>提问</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_H * 0.92,
    backgroundColor: '#F7F5F0',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#1A1614',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 24,
    overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    zIndex: 10,
  },

  // Hero Section
  heroSection: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: 'rgba(106, 156, 137, 0.15)',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(247, 245, 240, 0.7)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  heroBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 3,
    marginBottom: 4,
  },
  heroOverview: {
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 20,
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.08)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.gray500,
    fontWeight: '500',
  },
  progressTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTimeText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressTimeDivider: {
    fontSize: 13,
    color: Colors.gray400,
    marginHorizontal: 4,
  },
  progressTimeTotal: {
    fontSize: 13,
    color: Colors.gray400,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(106, 156, 137, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestone: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  // Digital Human
  digitalHumanCard: {
    position: 'relative',
    flexDirection: 'row',
    minHeight: 168,
    backgroundColor: '#FAFCF8',
    borderRadius: 20,
    marginBottom: 20,
    paddingLeft: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.12)',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  digitalHumanCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
    zIndex: 2,
  },
  digitalHumanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  digitalHumanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  digitalHumanDotPaused: {
    backgroundColor: Colors.gray400,
  },
  digitalHumanStatusText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  digitalHumanTitle: {
    fontSize: 18,
    color: Colors.ink,
    fontWeight: '800',
    marginBottom: 8,
  },
  digitalHumanText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray500,
    fontWeight: '500',
  },
  digitalHumanStage: {
    width: 146,
    height: 204,
    marginTop: -18,
    marginRight: -4,
    marginBottom: -18,
    overflow: 'hidden',
    zIndex: 2,
  },
  digitalHumanGroundShadow: {
    position: 'absolute',
    right: 24,
    bottom: 10,
    width: 86,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(42, 37, 32, 0.08)',
  },

  // Subtitle Card
  subtitleCard: {
    backgroundColor: '#F9F7F4',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  subtitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  subtitleHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(106, 156, 137, 0.12)',
  },
  subtitleHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(106, 156, 137, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleHeaderIconText: {
    fontSize: 14,
  },
  subtitleBody: {
    paddingHorizontal: 4,
  },
  subtitleText: {
    fontSize: 17,
    lineHeight: 32,
    color: Colors.ink,
    textAlign: 'justify',
    fontWeight: '400',
  },
  subtitlePlaceholder: {
    fontSize: 15,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  cursor: {
    color: Colors.primary,
    fontWeight: 'bold',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    zIndex: 5,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  closeIcon: {
    fontSize: 20,
    color: Colors.gray500,
    fontWeight: '300',
    marginTop: -2,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
  },
  waveBar: {
    width: 3,
    height: 16,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  audioLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 44,
  },

  // VRM Container
  vrmContainer: {
    position: 'absolute',
    right: -18,
    bottom: 100,
    width: 184,
    height: 296,
    zIndex: 10,
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 156, 137, 0.08)',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
  },
  bottomBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BTN_RADIUS,
    minHeight: 52,
  },
  controlBtnSecondary: {
    backgroundColor: 'rgba(106, 156, 137, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.12)',
  },
  controlBtnPrimary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  controlBtnQuestion: {
    backgroundColor: 'rgba(200, 75, 49, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(200, 75, 49, 0.15)',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  btnPressedPrimary: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  controlBtnIcon: {
    fontSize: 18,
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray600,
    letterSpacing: 1,
  },
  controlBtnPrimaryText: {
    color: '#FFFFFF',
  },
});

export default NarrationSheet;
