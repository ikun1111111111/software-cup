import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, interpolate, Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type TravelMemory, type Achievement } from '@/api/memory';
import { MOOD_META } from './constants';
import { AnimatedText } from './AnimatedText';
import { InkDropAnimation } from './InkDropAnimation';
import { MemoryImage, getMemoryArtwork, getSpotImageByName, MEMORY_IMAGES } from './MemoryVisual';

const MemoryCard = React.memo(function MemoryCard({ item, index, onPolish, achievements }: {
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

  const mood = MOOD_META[item.mood_tag || ''] || { color: Colors.gray400, label: '', sealText: '记', emoji: '✨' };
  const moodEmoji = mood.emoji || '✨';
  const isLong = displayContent.length > 80;
  const hasPolished = !!item.polished_content;
  const unlockedAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked).slice(0, 3),
    [achievements],
  );
  const artworkSeed = item.id + index + (item.spot_name?.length ?? 0);
  const spotArtwork = getSpotImageByName(item.spot_name);
  const memoryArtwork = spotArtwork ?? getMemoryArtwork(artworkSeed);
  const memoryArtifact = getMemoryArtwork(artworkSeed + 2);

  const flipProgress = useSharedValue(0);
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

  const stampRotation = useMemo(() => Math.random() * 6 - 3, []);

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const updated = await onPolish(item.id);

      setTimeout(() => {
        setShowInkDrop(false);
        setShowAnimatedText(true);
        setDisplayContent(updated.polished_content || updated.original_content);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setTimeout(() => {
          stampScale.value = withSequence(
            withTiming(1.3, { duration: 150 }),
            withSpring(1, { damping: 8, stiffness: 200 })
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 800);
      }, 800);
    } catch {
      setShowInkDrop(false);
    } finally {
      setPolishing(false);
    }
  };

  useEffect(() => {
    setDisplayContent(item.polished_content || item.original_content);
  }, [item.polished_content, item.original_content]);

  return (
    <Animated.View entering={index < 6 ? FadeInUp.delay(index * 60).duration(350) : undefined}>
      <View style={styles.memoryCard}>
        <View style={styles.paperTexture} />

        {showInkDrop && <InkDropAnimation trigger={showInkDrop} />}

        <Animated.View style={[styles.cardFace, frontStyle]}>
          <View style={styles.cardHeader}>
            {item.spot_name && (
              <View style={styles.cardSpotName}>
                <MemoryImage source={spotArtwork ?? MEMORY_IMAGES.map} size={22} radius={8} fit="cover" />
                <Text style={styles.cardSpotText} numberOfLines={1}>{item.spot_name}</Text>
              </View>
            )}
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {item.photo_url ? (
            <View style={styles.cardPhoto}>
              <Image source={{ uri: item.photo_url }} style={styles.cardPhotoImage} resizeMode="cover" />
              <View style={styles.cardPhotoBadge}>
                <MemoryImage source={MEMORY_IMAGES.photo} size={24} radius={12} fit="cover" />
              </View>
              <View style={styles.cardPhotoArtifact}>
                <View style={[styles.moodMiniChip, { borderColor: mood.color }]}>
                  <Text style={styles.moodMiniEmoji}>{moodEmoji}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cardArtwork}>
              <MemoryImage
                source={memoryArtwork}
                height={130}
                radius={14}
                fit={spotArtwork ? 'cover' : artworkSeed % 3 === 0 ? 'cover' : 'contain'}
                style={styles.cardArtworkImage}
              >
                <View style={styles.cardArtworkWash} />
                <View style={styles.cardArtworkTag}>
                  <Text style={styles.cardArtworkTagText}>{mood.label || '灵山片段'}</Text>
                </View>
                <View style={styles.cardArtworkObjects}>
                  <MemoryImage source={memoryArtifact} size={34} radius={10} fit="contain" />
                  <View style={[styles.moodMiniChip, styles.moodObjectChip, { borderColor: mood.color }]}>
                    <Text style={styles.moodObjectEmoji}>{moodEmoji}</Text>
                  </View>
                </View>
              </MemoryImage>
            </View>
          )}

          {item.voice_url && (
            <View style={styles.cardVoice}>
              <View style={styles.cardVoiceIcon}>
                <MemoryImage source={MEMORY_IMAGES.chat} size={22} radius={11} fit="cover" />
              </View>
              <Text style={styles.cardVoiceText}>
                语音记录 · {Math.floor((item.voice_duration || 0) / 60)}:{((item.voice_duration || 0) % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {showAnimatedText ? (
            <AnimatedText text={displayContent} trigger={showAnimatedText} />
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

          <Animated.View style={[styles.moodStamp, stampAnimStyle, {
            borderColor: mood.color,
          }]}>
            <Text style={styles.moodStampEmoji}>{moodEmoji}</Text>
            <Text style={[styles.moodStampLabel, { color: mood.color }]}>
              {mood.label}
            </Text>
          </Animated.View>

          {unlockedAchievements.length > 0 && (
            <View style={styles.cardAchievements}>
              {unlockedAchievements.map((ach, achIndex) => (
                <View key={ach.id} style={styles.cardAchievementBadge}>
                  <MemoryImage source={getMemoryArtwork(achIndex + artworkSeed)} size={20} radius={8} fit="contain" />
                  <Text style={styles.cardAchievementName} numberOfLines={1}>{ach.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.inkDottedLine} />

          <View style={styles.cardFooter}>
            {hasPolished && (
              <Pressable
                style={({ pressed }) => [
                  styles.flipBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleFlip}
              >
                <Text style={styles.flipBtnText}>查看原文</Text>
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

        {hasPolished && (
          <Animated.View style={[styles.cardFace, styles.cardBack, backStyle]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardSpotName}>
                <MemoryImage source={MEMORY_IMAGES.write} size={22} radius={8} fit="contain" />
                <Text style={styles.cardSpotText}>原文</Text>
              </View>
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
              <Text style={styles.flipBtnText}>返回润色版</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
});

export { MemoryCard };

const styles = StyleSheet.create({
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
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.paperWarm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSpotName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  cardSpotText: { fontSize: 11, color: Colors.gray500, fontWeight: '600', flexShrink: 1 },
  cardDate: { fontSize: 11, color: Colors.gray400 },
  cardDivider: { height: 1, backgroundColor: Colors.borderLight, marginBottom: 12 },
  cardTitle: {
    fontSize: 18, fontFamily: 'MaShanZheng', color: Colors.ink,
    letterSpacing: 1, marginBottom: 10, lineHeight: 26,
  },
  cardContent: {
    fontSize: 14, fontFamily: 'LongCang', color: Colors.gray600,
    lineHeight: 24, marginBottom: 8, letterSpacing: 0.5,
  },
  expandBtn: { fontSize: 12, color: Colors.primary, fontWeight: '500', marginBottom: 8 },
  moodStamp: {
    position: 'absolute', top: 14, right: 14,
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  moodStampEmoji: { fontSize: 18, lineHeight: 20 },
  moodStampLabel: { fontSize: 9, fontWeight: '700', marginTop: 2 },
  cardAchievements: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  cardAchievementBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.paperWarm, borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderLight, gap: 4,
  },
  cardAchievementName: { fontSize: 10, fontWeight: '600', color: Colors.ink, maxWidth: 60 },
  inkDottedLine: {
    height: 1, borderStyle: 'dotted', borderWidth: 0.5,
    borderColor: Colors.gray300, marginVertical: 12,
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flipBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill, backgroundColor: Colors.gray100,
  },
  flipBtnBack: { backgroundColor: Colors.primaryBg },
  flipBtnText: { fontSize: 12, color: Colors.gray600, fontWeight: '500' },
  polishBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill, backgroundColor: Colors.primaryBg,
    minWidth: 70, alignItems: 'center',
  },
  polishBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cardPhoto: {
    width: '100%', height: 160, borderRadius: 10,
    overflow: 'hidden', marginVertical: 8, position: 'relative',
  },
  cardPhotoImage: { width: '100%', height: '100%' },
  cardPhotoBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  cardPhotoArtifact: {
    position: 'absolute',
    left: 8,
    bottom: 8,
  },
  moodMiniChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  moodMiniEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  cardArtwork: {
    marginVertical: 8,
  },
  cardArtworkImage: {
    width: '100%',
    backgroundColor: '#F2E7D6',
  },
  cardArtworkWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,37,32,0.06)',
  },
  cardArtworkTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  cardArtworkTagText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },
  cardArtworkObjects: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  moodObjectChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  moodObjectEmoji: {
    fontSize: 17,
    lineHeight: 20,
  },
  cardVoice: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(106,156,137,0.08)', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 10, marginVertical: 6, gap: 8,
  },
  cardVoiceIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(106,156,137,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardVoiceText: { fontSize: 12, color: Colors.gray500 },
});
