import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, InteractionManager } from 'react-native';
import Animated, {
  useAnimatedStyle, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type TravelMemory } from '@/api/memory';
import { type Spot } from '@/api/spots';
import { ROUTE_SPOTS } from './constants';
import { FloatingCloud } from './FloatingCloud';
import { InkRouteMap } from './InkRouteMap';
import { XIAOLING_MEMORY_COPY } from '@/utils/digitalHumanProduct';

export function HeroHeader({ scrollY, insets, memoryCount, spotCount, memories, spots }: {
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

  const heroQuote = useMemo(() => {
    if (memories.length === 0) return '灵山胜境';
    const latest = memories[0];
    const title = latest.title || '';
    return title.length > 6 ? title.slice(0, 6) : title;
  }, [memories]);

  const visitedSpotNames = useMemo(() => {
    return new Set(memories.filter((m) => m.spot_name).map((m) => m.spot_name!));
  }, [memories]);

  const stampRatio = spotCount > 0 ? Math.min(spotCount / ROUTE_SPOTS.length, 1) : 0;

  const [showDecorations, setShowDecorations] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setShowDecorations(true);
    });
    return () => task.cancel();
  }, []);

  return (
    <Animated.View style={[styles.heroHeader, { paddingTop: insets.top }, headerAnim]}>
      <View style={styles.heroGradientTop} />
      <View style={styles.heroGradientBottom} />

      {showDecorations && (
        <>
          <FloatingCloud top={20} delay={0} size={120} opacity={0.3} />
          <FloatingCloud top={50} delay={8000} size={90} opacity={0.2} />
          <FloatingCloud top={35} delay={15000} size={100} opacity={0.25} />
        </>
      )}

      <View style={styles.heroTitleArea}>
        <Text style={styles.heroSub}>{XIAOLING_MEMORY_COPY.heroSub}</Text>
        <Text style={styles.heroTitle}>{XIAOLING_MEMORY_COPY.heroTitle}</Text>
        <View style={styles.heroQuoteWrap}>
          <Text style={styles.heroQuoteMark}>「</Text>
          <Text style={styles.heroQuote}>{heroQuote}</Text>
          <Text style={styles.heroQuoteMark}>」</Text>
        </View>
      </View>

      <View style={styles.heroRouteArea}>
        <InkRouteMap visitedSpotNames={visitedSpotNames} />
      </View>

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

const styles = StyleSheet.create({
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
});
