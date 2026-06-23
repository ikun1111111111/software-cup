import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type Achievement, type UserProfile } from '@/api/memory';

export function AchievementBar({ profile, achievements }: {
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

const styles = StyleSheet.create({
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
});
