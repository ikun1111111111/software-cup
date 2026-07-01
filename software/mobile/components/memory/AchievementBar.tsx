import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type Achievement, type UserProfile } from '@/api/memory';
import { MemoryImage, MemoryRouteImage, MemorySeal, getMemoryArtwork, getSpotImageByName } from './MemoryVisual';

export function AchievementBar({ profile, achievements }: {
  profile: UserProfile | null;
  achievements: Achievement[];
}) {
  if (!profile && achievements.length === 0) return null;

  const level = profile?.level;
  const unlockedAchs = achievements.filter((a) => a.unlocked);
  const allAchs = achievements.length > 0 ? achievements : [];
  const stamps = profile?.stamps || [];
  const collectedStampCount = profile?.collected_stamps ?? stamps.filter((stamp) => stamp.collected).length;
  const totalStampCount = profile?.total_stamps ?? stamps.length;

  return (
    <Animated.View entering={FadeInUp.delay(50).duration(400)} style={styles.achieveSection}>
      {level && (
        <View style={styles.levelRow}>
          <MemoryRouteImage width={132} height={82} radius={18} style={styles.levelRouteArt} />
          <View style={styles.levelBadge}>
            <View style={styles.levelSealWrap}>
              <MemorySeal size={42} />
            </View>
            <View>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelScore}>{profile!.score} 分 · {collectedStampCount} 枚印章</Text>
            </View>
          </View>
          <View style={styles.stampProgress}>
            <Text style={styles.stampProgressText}>
              印章 {collectedStampCount}/{totalStampCount}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${(collectedStampCount / Math.max(totalStampCount, 1)) * 100}%`,
              }]} />
            </View>
          </View>
        </View>
      )}

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
            {stamps.map((stamp, index) => {
              const spotImage = getSpotImageByName(stamp.name);
              return (
                <View
                  key={stamp.id}
                  style={[styles.stampCard, !stamp.collected && styles.stampCardLocked]}
                >
                  <View style={styles.stampVisual}>
                    <MemoryImage
                      source={spotImage ?? getMemoryArtwork(index + 3)}
                      width={58}
                      height={42}
                      radius={12}
                      fit={spotImage ? 'cover' : index % 3 === 0 ? 'cover' : 'contain'}
                      style={!stamp.collected && styles.stampSymbolLocked}
                    />
                    <MemorySeal size={26} style={styles.stampSealOverlay} />
                  </View>
                  <Text style={[styles.stampName, !stamp.collected && styles.stampNameLocked]} numberOfLines={1}>
                    {stamp.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

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
            {allAchs.map((ach, index) => {
              const spotImage = getSpotImageByName(ach.name);
              return (
                <View
                  key={ach.id}
                  style={[styles.achieveCard, !ach.unlocked && styles.achieveCardLocked]}
                >
                  <MemoryImage
                    source={spotImage ?? getMemoryArtwork(index)}
                    width={76}
                    height={54}
                    radius={12}
                    fit={spotImage ? 'cover' : index % 2 === 0 ? 'cover' : 'contain'}
                    style={!ach.unlocked && styles.achieveIconLocked}
                  />
                  <View style={[styles.achieveStatus, ach.unlocked && styles.achieveStatusUnlocked]}>
                    <Text style={[styles.achieveStatusText, ach.unlocked && styles.achieveStatusTextUnlocked]}>
                      {ach.unlocked ? '已获' : '待启'}
                    </Text>
                  </View>
                  <Text style={[styles.achieveName, !ach.unlocked && styles.achieveNameLocked]} numberOfLines={1}>
                    {ach.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  achieveSection: { marginBottom: 20 },
  levelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14,
    marginBottom: 12,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  levelRouteArt: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    opacity: 0.28,
  },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelSealWrap: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
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
  achieveScroll: { gap: 10, paddingRight: 4 },
  achieveCard: {
    width: 96, alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 9,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(212, 208, 200, 0.72)',
  },
  achieveCardLocked: { opacity: 0.45 },
  achieveIconLocked: { opacity: 0.4 },
  achieveStatus: {
    marginTop: -18,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(42,37,32,0.72)',
  },
  achieveStatusUnlocked: {
    backgroundColor: Colors.accent,
  },
  achieveStatusText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '800',
  },
  achieveStatusTextUnlocked: {
    color: '#fff',
  },
  achieveName: { fontSize: 10, fontWeight: '600', color: Colors.ink, textAlign: 'center', maxWidth: 78 },
  achieveNameLocked: { color: Colors.gray400 },
  stampCard: {
    width: 78, alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: 8,
    borderWidth: 1.5, borderColor: Colors.gold + '60',
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
  },
  stampCardLocked: {
    borderColor: Colors.borderLight, shadowOpacity: 0, opacity: 0.4,
  },
  stampVisual: {
    position: 'relative',
  },
  stampSealOverlay: {
    position: 'absolute',
    right: -5,
    bottom: -5,
  },
  stampSymbolLocked: { opacity: 0.3 },
  stampName: { fontSize: 9, fontWeight: '700', color: Colors.ink, textAlign: 'center', maxWidth: 62 },
  stampNameLocked: { color: Colors.gray400 },
});
