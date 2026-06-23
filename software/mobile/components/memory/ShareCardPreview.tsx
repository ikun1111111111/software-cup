import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, StyleSheet,
} from 'react-native';
import Svg, { Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { type TravelMemory, type JourneySummary } from '@/api/memory';
import InlineModal from '@/components/ui/InlineModal';
import { MOOD_META } from './constants';

export function ShareCardPreview({ visible, onClose, memories, summary }: {
  visible: boolean;
  onClose: () => void;
  memories: TravelMemory[];
  summary: JourneySummary | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<View>(null);

  const cards = useMemo(() => {
    if (!summary && memories.length === 0) return [];

    const result: Array<{
      title: string;
      content: string;
      spotName: string | null;
      mood: string | null;
    }> = [];

    if (summary) {
      result.push({
        title: summary.title,
        content: summary.content.slice(0, 100),
        spotName: null,
        mood: null,
      });
    }

    memories.slice(0, 4).forEach((m) => {
      result.push({
        title: m.title,
        content: (m.polished_content || m.original_content).slice(0, 80),
        spotName: m.spot_name,
        mood: m.mood_tag,
      });
    });

    return result.slice(0, 5);
  }, [memories, summary]);

  const currentCard = cards[currentIndex];

  const handleSave = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1440,
      });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.createAssetAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1440,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '分享你的灵山墨卷',
      });
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!visible || !currentCard) return null;

  return (
    <InlineModal visible={visible} transparent animationType="fade">
      <View style={styles.shareModalRoot}>
        <View style={styles.shareModalHeader}>
          <Text style={styles.shareModalTitle}>朋友圈图文预览</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.shareModalClose}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
            setCurrentIndex(idx);
          }}
          scrollEventThrottle={100}
        >
          {cards.map((card, idx) => {
            const cardMood = card.mood ? MOOD_META[card.mood] : null;
            return (
              <View key={idx} style={styles.shareCardContainer}>
                <View ref={idx === currentIndex ? cardRef : undefined} style={styles.shareCard}>
                  <View style={styles.shareCardBg} />

                  <Text style={styles.shareCardTitle}>{card.title}</Text>
                  <Text style={styles.shareCardContent}>{card.content}</Text>

                  <View style={styles.shareCardMeta}>
                    {card.spotName && (
                      <Text style={styles.shareCardSpot}>📍 {card.spotName}</Text>
                    )}
                    {cardMood && (
                      <Text style={styles.shareCardMood}>
                        {cardMood.emoji} {cardMood.label}
                      </Text>
                    )}
                  </View>

                  <View style={styles.shareCardFooter}>
                    <Text style={styles.shareCardBrand}>灵山手帐 · 你的墨卷</Text>
                    <Text style={styles.shareCardPage}>{idx + 1} / {cards.length}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.shareModalActions}>
          <Pressable
            style={({ pressed }) => [
              styles.shareModalBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSave}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareModalBtnText}>💾 保存到相册</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.shareModalBtnOutline,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleShare}
            disabled={generating}
          >
            <Text style={styles.shareModalBtnOutlineText}>📤 分享</Text>
          </Pressable>
        </View>

        <View style={styles.shareModalDots}>
          {cards.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.shareModalDot,
                idx === currentIndex && styles.shareModalDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </InlineModal>
  );
}

const styles = StyleSheet.create({
  shareModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  shareModalTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  shareModalClose: { fontSize: 20, color: '#fff', padding: 4 },
  shareCardContainer: {
    width: Dimensions.get('window').width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  shareCard: {
    width: 320, height: 426,
    backgroundColor: Colors.paperWarm,
    borderRadius: Radius.xl,
    padding: 28,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  shareCardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.paperWarm,
    opacity: 0.95,
  },
  shareCardTitle: {
    fontSize: 22, fontFamily: 'MaShanZheng', color: Colors.ink,
    letterSpacing: 2, marginBottom: 16, lineHeight: 30, zIndex: 1,
  },
  shareCardContent: {
    fontSize: 14, fontFamily: 'LongCang', color: Colors.gray600,
    lineHeight: 24, marginBottom: 20, zIndex: 1,
  },
  shareCardMeta: { flexDirection: 'row', gap: 12, marginBottom: 20, zIndex: 1 },
  shareCardSpot: { fontSize: 12, color: Colors.gray500 },
  shareCardMood: { fontSize: 12, color: Colors.gray500 },
  shareCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginTop: 'auto', zIndex: 1,
  },
  shareCardBrand: {
    fontSize: 11, fontFamily: 'MaShanZheng', color: Colors.gray400, letterSpacing: 2,
  },
  shareCardPage: { fontSize: 10, color: Colors.gray400 },
  shareModalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16 },
  shareModalBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  shareModalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  shareModalBtnOutline: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  shareModalBtnOutlineText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  shareModalDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 24 },
  shareModalDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  shareModalDotActive: { backgroundColor: '#fff', width: 16 },
});
