import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { InkTransition } from '@/components/ui/InkTransition';

const CAROUSEL_W = 230;

const SPOT_IMAGES: Record<string, any> = {
  'ling-shan-da-fo': require('../../assets/images/bigfo.png'),
  'jiu-long-guan-yu': require('../../assets/images/nine-dragon.png'),
  'fan-gong': require('../../assets/images/fangong.png'),
  'wu-yin-tan-cheng': require('../../assets/images/wuyin.png'),
  'man-fei-long-ta': require('../../assets/images/manfeilong.png'),
};

const SPOTS = [
  { id: 'ling-shan-da-fo', name: '灵山大佛', desc: '世界第一高青铜立佛，高88米', tag: '必游' },
  { id: 'jiu-long-guan-yu', name: '九龙灌浴', desc: '大型音乐动态群雕表演', tag: '热门' },
  { id: 'fan-gong', name: '梵宫', desc: '佛教文化艺术殿堂', tag: '推荐' },
  { id: 'wu-yin-tan-cheng', name: '五印坛城', desc: '藏传佛教文化景观', tag: '特色' },
  { id: 'man-fei-long-ta', name: '曼飞龙塔', desc: '南传佛教象征建筑', tag: '推荐' },
];

function SpotCard({ spot, isActive, onPress }: {
  spot: typeof SPOTS[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isActive ? withTiming(-4) : withTiming(0) }],
    shadowOpacity: isActive ? withTiming(0.12) : 0.06,
    shadowRadius: isActive ? withTiming(12) : 8,
  }));

  return (
    <Animated.View style={[styles.spotCard, cardStyle]}>
      <Pressable
        style={({ pressed }) => [styles.spotCardInner, pressed && { opacity: 0.85 }]}
        onPress={onPress}
      >
        <View style={styles.spotImgWrap}>
          {SPOT_IMAGES[spot.id] ? (
            <Image
              source={SPOT_IMAGES[spot.id]}
              style={styles.spotImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={120}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6A9C89' }]} />
          )}
          <View style={styles.spotFade} />
          <View style={styles.spotTag}>
            <Text style={styles.spotTagTxt}>{spot.tag}</Text>
          </View>
        </View>
        <View style={styles.spotBody}>
          <Text style={styles.spotName}>{spot.name}</Text>
          <Text style={styles.spotDesc} numberOfLines={2}>{spot.desc}</Text>
          <Text style={styles.spotLink}>了解更多 →</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FeaturedSpots() {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const ITEM_W = CAROUSEL_W + 12;

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const onScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / ITEM_W);
    setActiveIdx(idx);
  }, [ITEM_W]);

  return (
    <View style={styles.spots}>
      <View style={styles.spotsHead}>
        <View>
          <Text style={styles.secTitle}>精选景点</Text>
          <Text style={styles.secSub}>FEATURED SPOTS</Text>
        </View>
        <Pressable
          style={styles.seeAllBtn}
          onPress={() => InkTransition.trigger(() => router.push('/attractions'))}
        >
          <Text style={styles.seeAllText}>查看全部 →</Text>
        </Pressable>
      </View>

      {showHint && (
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>← 左右滑动探索更多 →</Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spotsScroll}
        snapToInterval={ITEM_W}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {SPOTS.map((s, i) => (
          <SpotCard
            key={s.id}
            spot={s}
            isActive={i === activeIdx}
            onPress={() => InkTransition.trigger(() => router.push(`/attractions/${s.id}`))}
          />
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SPOTS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIdx && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spots: { paddingTop: 28, paddingBottom: 32, backgroundColor: Colors.paperWarm },
  spotsHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 18, marginBottom: 18,
  },
  seeAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(106,156,137,0.3)',
  },
  seeAllText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  spotsScroll: { gap: 12, paddingHorizontal: 18 },
  swipeHint: {
    alignItems: 'center', paddingVertical: 8, marginBottom: 10,
  },
  swipeHintText: {
    fontSize: 11, color: Colors.gray400, letterSpacing: 2,
  },
  spotCard: {
    width: CAROUSEL_W, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  spotCardInner: {},
  spotImgWrap: { height: 160, position: 'relative', overflow: 'hidden', backgroundColor: '#E8F2EE' },
  spotImage: { width: '100%', height: '100%' },
  spotFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  spotTag: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(200,75,49,0.85)', borderRadius: 3,
  },
  spotTagTxt: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  spotBody: { padding: 14 },
  spotName: { fontSize: 15, fontWeight: '700', color: Colors.ink, letterSpacing: 1, marginBottom: 6 },
  spotDesc: { fontSize: 12, color: Colors.gray500, lineHeight: 18, marginBottom: 8 },
  spotLink: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gray300 },
  dotActive: { width: 18, backgroundColor: Colors.primary },
  secTitle: { fontSize: 20, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  secSub: { fontSize: 9, letterSpacing: 3, color: Colors.gray400, marginTop: 5 },
});
