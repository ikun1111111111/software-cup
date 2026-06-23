import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

export interface TimelineEventData {
  era: string;
  year: string;
  event: string;
  description: string;
  spot?: string;
}

interface TimelineEventCardProps {
  event: TimelineEventData;
  eventId: string;
  index: number;
  isExpanded: boolean;
  image: any;
  imageLabel: string;
  themeColor: string;
  onToggle: (id: string) => void;
}

export const TimelineEventCard = React.memo(function TimelineEventCard({
  event, eventId, index, isExpanded, image, imageLabel, themeColor, onToggle,
}: TimelineEventCardProps) {
  const isHero = index === 0;

  if (isHero) {
    return (
      <Animated.View entering={FadeInUp.delay(index * 70).duration(350)}>
        <Pressable
          style={({ pressed }) => [styles.heroCard, pressed && { opacity: 0.92 }]}
          onPress={() => onToggle(eventId)}
        >
          <View style={styles.heroImageFrame}>
            <Image source={image} style={styles.heroImage} contentFit="cover" placeholder={{ backgroundColor: '#E8DFD2' }} />
            <View style={styles.heroImageShade} />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{event.year}</Text>
            </View>
            <Text style={styles.heroImageLabel}>{imageLabel}</Text>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{event.event}</Text>
            <Text style={styles.heroDesc} numberOfLines={isExpanded ? undefined : 2}>
              {event.description}
            </Text>
            <View style={styles.heroBottom}>
              {event.spot ? (
                <View style={styles.heroSpot}>
                  <Text style={styles.heroSpotText}>{event.spot}</Text>
                </View>
              ) : null}
              <Text style={styles.heroHint}>{isExpanded ? '收起' : '展开详情'}</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(index * 70).duration(320)}>
      <Pressable
        style={({ pressed }) => [
          styles.magCard,
          index % 2 === 0 && styles.magCardReverse,
          { borderLeftColor: themeColor, borderRightColor: themeColor },
          pressed && { opacity: 0.92 },
        ]}
        onPress={() => onToggle(eventId)}
      >
        <View style={styles.magImageWrap}>
          <Image source={image} style={styles.magImage} contentFit="cover" placeholder={{ backgroundColor: '#E8DFD2' }} />
          <View style={styles.magImageOverlay} />
          <Text style={styles.magImageYear}>{event.year}</Text>
          <Text style={styles.magImageLabel}>{imageLabel}</Text>
        </View>
        <View style={styles.magBody}>
          <Text style={styles.magTitle}>{event.event}</Text>
          <Text style={styles.magDesc} numberOfLines={isExpanded ? undefined : 2}>
            {event.description}
          </Text>
          <View style={styles.magFooter}>
            {event.spot ? (
              <Text style={styles.magSpot}>{event.spot}</Text>
            ) : null}
            <Text style={styles.magHint}>{isExpanded ? '收起' : '展开'}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Hero Card
  heroCard: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 14,
    backgroundColor: '#FFFCF6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,70,48,0.12)',
    position: 'relative',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroImageFrame: {
    height: 142, overflow: 'hidden', position: 'relative', backgroundColor: '#E8DFD2',
  },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,18,12,0.16)' },
  heroContent: { padding: 14 },
  heroBadge: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(255,252,246,0.84)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText: { fontSize: 12, color: Colors.ink, fontWeight: '800', letterSpacing: 1 },
  heroImageLabel: {
    position: 'absolute', right: 12, bottom: 10,
    fontSize: 11, color: '#FFF7EA', fontWeight: '800', letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.52)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: Colors.ink, letterSpacing: 1, marginBottom: 6 },
  heroDesc: { fontSize: 13, color: Colors.gray600, lineHeight: 20 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  heroSpot: { backgroundColor: 'rgba(106,156,137,0.14)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  heroSpotText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  heroHint: { fontSize: 11, color: Colors.gray400 },

  // Magazine Card
  magCard: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#fff', marginBottom: 12, borderLeftWidth: 3,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  magCardReverse: {
    flexDirection: 'row-reverse', borderLeftWidth: 0, borderRightWidth: 3,
  },
  magImageWrap: { width: 124, height: 140, overflow: 'hidden', position: 'relative' },
  magImage: { ...StyleSheet.absoluteFillObject },
  magImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  magImageYear: {
    position: 'absolute', bottom: 6, left: 8,
    fontSize: 11, color: '#fff', fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  magImageLabel: {
    position: 'absolute', top: 7, left: 8, right: 8,
    fontSize: 10, color: 'rgba(255,250,240,0.94)', fontWeight: '700', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  magBody: { flex: 1, padding: 12, justifyContent: 'center' },
  magTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink, lineHeight: 22, marginBottom: 4 },
  magDesc: { fontSize: 13, color: Colors.gray600, lineHeight: 20 },
  magFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  magSpot: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  magHint: { fontSize: 10, color: Colors.gray400 },
});
