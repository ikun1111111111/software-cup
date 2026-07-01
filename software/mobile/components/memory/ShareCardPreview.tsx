import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions, StyleSheet, Platform,
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
import { MemoryImage, MEMORY_IMAGES } from './MemoryVisual';

export function ShareCardPreview({ visible, onClose, memories, summary }: {
  visible: boolean;
  onClose: () => void;
  memories: TravelMemory[];
  summary: JourneySummary | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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

  const captureCurrentCard = () => captureRef(cardRef, {
    format: 'png',
    quality: 1,
    width: 1080,
    height: 1440,
  });

  const downloadOnWeb = (uri: string) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
    const link = document.createElement('a');
    link.href = uri;
    link.download = `lingshan-memory-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  };

  const handleSave = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    setNotice(null);
    try {
      const uri = await captureCurrentCard();
      if (downloadOnWeb(uri)) {
        setNotice('已下载朋友圈图片');
        return;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.createAssetAsync(uri);
        setNotice('已保存到相册');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setNotice('没有相册权限，暂时无法保存');
      }
    } catch (err) {
      console.error('Save failed:', err);
      setNotice('保存失败，请稍后再试');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    setNotice(null);
    try {
      const uri = await captureCurrentCard();
      if (Platform.OS === 'web') {
        downloadOnWeb(uri);
        setNotice('浏览器端已下载图片，可直接发朋友圈');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setNotice('当前设备暂不支持系统分享');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '分享你的灵山墨卷',
      });
    } catch (err) {
      console.error('Share failed:', err);
      setNotice('分享失败，请稍后再试');
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
                      <View style={styles.shareCardMetaItem}>
                        <MemoryImage source={MEMORY_IMAGES.map} size={22} radius={8} fit="cover" />
                        <Text style={styles.shareCardSpot} numberOfLines={1}>{card.spotName}</Text>
                      </View>
                    )}
                    {cardMood && (
                      <View style={styles.shareCardMetaItem}>
                        <View style={[styles.shareCardMoodEmoji, { borderColor: cardMood.color }]}>
                          <Text style={styles.shareCardMoodEmojiText}>{cardMood.emoji}</Text>
                        </View>
                        <Text style={[styles.shareCardMood, { color: cardMood.color }]}>
                          {cardMood.label}
                        </Text>
                      </View>
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
              <>
                <MemoryImage source={MEMORY_IMAGES.write} size={24} radius={8} fit="contain" />
                <Text style={styles.shareModalBtnText}>保存到相册</Text>
              </>
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
            <MemoryImage source={MEMORY_IMAGES.share} size={24} radius={8} fit="contain" />
            <Text style={styles.shareModalBtnOutlineText}>分享</Text>
          </Pressable>
        </View>

        {notice && (
          <Text style={styles.shareNotice}>{notice}</Text>
        )}

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
  shareCardMeta: { flexDirection: 'row', gap: 12, marginBottom: 20, zIndex: 1, flexWrap: 'wrap' },
  shareCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 128 },
  shareCardMoodEmoji: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCardMoodEmojiText: { fontSize: 12, lineHeight: 15 },
  shareCardSpot: { fontSize: 12, color: Colors.gray500, flexShrink: 1 },
  shareCardMood: { fontSize: 12, color: Colors.gray500, fontWeight: '600' },
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
    justifyContent: 'center', flexDirection: 'row', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  shareModalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  shareModalBtnOutline: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  shareModalBtnOutlineText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  shareNotice: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: -4,
    marginBottom: 12,
  },
  shareModalDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 24 },
  shareModalDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)',
  },
  shareModalDotActive: { backgroundColor: '#fff', width: 16 },
});
