import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

// ─── Base Skeleton Block ───
function SkeletonBlock({ width, height, radius, style }: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1, true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        animStyle,
        {
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: radius ?? Radius.md,
        },
        style,
      ]}
    />
  );
}

// ─── Memory Page Skeleton ───
export function MemoryPageSkeleton() {
  return (
    <View style={styles.container}>
      {/* Hero area placeholder */}
      <View style={styles.heroArea}>
        <SkeletonBlock width={80} height={10} radius={5} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <SkeletonBlock width={140} height={22} radius={6} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <SkeletonBlock width="90%" height={60} radius={10} style={{ marginBottom: 12 }} />
        <View style={styles.statsRow}>
          <SkeletonBlock width={50} height={24} radius={6} />
          <SkeletonBlock width={50} height={24} radius={6} />
          <SkeletonBlock width={50} height={24} radius={6} />
        </View>
      </View>

      {/* Content area */}
      <View style={styles.contentArea}>
        {/* Summary card skeleton */}
        <SkeletonBlock width="100%" height={100} radius={Radius.lg} style={{ marginBottom: 16 }} />

        {/* Action buttons skeleton */}
        <View style={styles.actionRow}>
          <SkeletonBlock width="48%" height={44} radius={Radius.lg} />
          <SkeletonBlock width="48%" height={44} radius={Radius.lg} />
        </View>

        {/* Card skeletons */}
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.cardRow}>
            <SkeletonBlock width={32} height={16} radius={8} />
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <SkeletonBlock width="70%" height={18} radius={4} style={{ marginBottom: 8 }} />
              <SkeletonBlock width="100%" height={12} radius={4} style={{ marginBottom: 4 }} />
              <SkeletonBlock width="80%" height={12} radius={4} style={{ marginBottom: 4 }} />
              <SkeletonBlock width="60%" height={12} radius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Attraction Detail Skeleton ───
export function AttractionDetailSkeleton() {
  return (
    <View style={styles.container}>
      {/* Hero image area */}
      <SkeletonBlock width="100%" height={220} radius={0} />

      <View style={styles.contentArea}>
        <SkeletonBlock width="60%" height={24} radius={6} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="40%" height={14} radius={4} style={{ marginBottom: 16 }} />

        {/* Description lines */}
        <SkeletonBlock width="100%" height={12} radius={4} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="95%" height={12} radius={4} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="85%" height={12} radius={4} style={{ marginBottom: 20 }} />

        {/* Info cards */}
        <View style={styles.actionRow}>
          <SkeletonBlock width="30%" height={80} radius={Radius.lg} />
          <SkeletonBlock width="30%" height={80} radius={Radius.lg} />
          <SkeletonBlock width="30%" height={80} radius={Radius.lg} />
        </View>
      </View>
    </View>
  );
}

// ─── History Page Skeleton ───
export function HistorySkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <SkeletonBlock width="50%" height={22} radius={6} style={{ marginBottom: 16 }} />

        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.cardRow}>
            <SkeletonBlock width={40} height={40} radius={20} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <SkeletonBlock width="50%" height={16} radius={4} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="80%" height={12} radius={4} style={{ marginBottom: 4 }} />
              <SkeletonBlock width="60%" height={12} radius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Attraction List Skeleton ───
export function AttractionListSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <SkeletonBlock width="40%" height={20} radius={6} style={{ marginBottom: 16 }} />

        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.listItem}>
            <SkeletonBlock width={80} height={80} radius={Radius.md} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <SkeletonBlock width="60%" height={16} radius={4} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="90%" height={12} radius={4} style={{ marginBottom: 4 }} />
              <SkeletonBlock width="40%" height={12} radius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.gray200,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  heroArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  contentArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
