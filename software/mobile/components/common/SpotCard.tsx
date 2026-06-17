import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import type { Spot } from '@/api/spots';

const SPOT_COLORS: Record<string, string> = {
  '核心景点': Colors.accent,
  '特色景点': Colors.primary,
  '文化设施': Colors.auxiliary,
};

interface Props {
  spot: Spot;
  onPress: () => void;
}

export function SpotCard({ spot, onPress }: Props) {
  const tagColor = SPOT_COLORS[spot.category] || Colors.gray400;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{spot.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: tagColor + '15', borderColor: tagColor + '30' }]}>
            <Text style={[styles.categoryText, { color: tagColor }]}>{spot.category}</Text>
          </View>
        </View>

        <Text style={styles.overview} numberOfLines={2}>
          {spot.overview}
        </Text>

        {spot.tags && spot.tags.length > 0 && (
          <View style={styles.tags}>
            {spot.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  content: { padding: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
    flex: 1,
    marginRight: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryText: { fontSize: 11, fontWeight: '500' },
  overview: {
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: 8,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.gray100,
    borderRadius: 4,
  },
  tagText: { fontSize: 11, color: Colors.gray500 },
});
