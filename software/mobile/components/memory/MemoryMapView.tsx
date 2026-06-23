import React, { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Rect, Defs, RadialGradient, Stop, Text as SvgText, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type TravelMemory } from '@/api/memory';
import { type Spot } from '@/api/spots';
import InlineModal from '@/components/ui/InlineModal';
import { MOOD_META, MAP_SPOTS } from './constants';

export function MemoryMapView({ memories, spots }: {
  memories: TravelMemory[];
  spots: Spot[];
}) {
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const bottomSheetRef = useRef<any>(null);

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

  return (
    <View style={styles.mapContainer}>
      <Svg width={280} height={260} viewBox="0 0 280 260">
        <Defs>
          <RadialGradient id="mapBg">
            <Stop offset="0%" stopColor={Colors.primaryBg} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={Colors.paper} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="280" height="260" fill="url(#mapBg)" />

        {MAP_SPOTS.map((spot, i) => {
          if (i === 0) return null;
          const prev = MAP_SPOTS[i - 1];
          return (
            <Line
              key={`line-${i}`}
              x1={prev.x} y1={prev.y}
              x2={spot.x} y2={spot.y}
              stroke={Colors.gray300} strokeWidth={1.5}
              strokeDasharray="4 4" opacity={0.5}
            />
          );
        })}

        {MAP_SPOTS.map((spot) => {
          const count = memoriesBySpot[spot.name]?.length || 0;
          const mood = spotMood[spot.name];
          const moodColor = mood ? MOOD_META[mood]?.color || Colors.gray400 : Colors.gray300;
          const radius = Math.max(20, Math.min(35, 20 + count * 3));
          const isSelected = selectedSpot === spot.name;

          return (
            <Pressable key={spot.name} onPress={() => handleSpotPress(spot.name)}>
              <G>
                {count > 0 && (
                  <Circle cx={spot.x} cy={spot.y} r={radius + 8} fill={moodColor} opacity={0.15} />
                )}
                <Circle
                  cx={spot.x} cy={spot.y} r={radius}
                  fill={count > 0 ? moodColor : Colors.gray200}
                  stroke={isSelected ? Colors.ink : Colors.gray400}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={count > 0 ? 0.85 : 0.4}
                />
                <SvgText x={spot.x} y={spot.y + 6} fontSize={18} textAnchor="middle">
                  {spot.icon}
                </SvgText>
                <SvgText x={spot.x} y={spot.y + radius + 16} fontSize={11} fontWeight="600" textAnchor="middle" fill={Colors.ink}>
                  {spot.name}
                </SvgText>
                {count > 0 && (
                  <SvgText x={spot.x + radius - 8} y={spot.y - radius + 12} fontSize={10} fontWeight="700" textAnchor="middle" fill="#fff">
                    {count}
                  </SvgText>
                )}
              </G>
            </Pressable>
          );
        })}
      </Svg>

      <InlineModal
        visible={!!selectedSpot}
        transparent
        animationType="slide"
        onClose={() => setSelectedSpot(null)}
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
                selectedMemories.map((m) => (
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
      </InlineModal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  mapSheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  mapSheetClose: { fontSize: 18, color: Colors.gray400, padding: 4 },
  mapSheetScroll: { padding: 16, gap: 12 },
  mapSheetEmpty: { fontSize: 14, color: Colors.gray400, textAlign: 'center', paddingVertical: 24 },
  mapSheetMemory: {
    backgroundColor: '#fff', borderRadius: Radius.md, padding: 14,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  mapSheetMemoryTitle: { fontSize: 14, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  mapSheetMemoryContent: {
    fontSize: 13, fontFamily: 'LongCang', color: Colors.gray600,
    lineHeight: 20, marginBottom: 6,
  },
  mapSheetMemoryDate: { fontSize: 11, color: Colors.gray400 },
});
