import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

export interface GuideToastPrompt {
  type: string;
  message: string;
  actions: string[];
  auto_dismiss?: number;
  spot?: any;
  deviation?: number;
}

interface Props {
  prompt: GuideToastPrompt;
  onAccept: () => void;
  onDismiss: () => void;
}

/** 数字人轻提示气泡：浮在 VRM 上方。 */
export const GuideToast: React.FC<Props> = ({ prompt, onAccept, onDismiss }) => {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 160 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (!prompt.auto_dismiss) return;
    const t = setTimeout(() => onDismiss(), prompt.auto_dismiss * 1000);
    return () => clearTimeout(t);
  }, [prompt, onDismiss]);

  const primary = (a: string) => ['听听', '推荐', '重新规划'].includes(a);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }], opacity }]}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {prompt.type === 'prompt_nearby' ? '🎯 附近景点' :
           prompt.type === 'prompt_idle' ? '💡 探索建议' :
           prompt.type === 'prompt_detour' ? '🗺️ 路线提示' : '💬 小灵'}
        </Text>
        <Text style={styles.message}>{prompt.message}</Text>
        {prompt.spot && (
          <Text style={styles.spot}>📍 {prompt.spot.name}</Text>
        )}
        {typeof prompt.deviation === 'number' && (
          <Text style={styles.spot}>偏离 {Math.round(prompt.deviation)}m</Text>
        )}
        <View style={styles.actions}>
          {prompt.actions.map((action) => (
            <Pressable
              key={action}
              onPress={() => {
                if (action === '不用了' || action === '静音') onDismiss();
                else onAccept();
              }}
              style={({ pressed }) => [
                styles.btn,
                primary(action) ? styles.btnPrimary : styles.btnGhost,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={primary(action) ? styles.btnPrimaryText : styles.btnGhostText}>
                {action}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.arrow} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 60,
    bottom: 280,
    width: 240,
    zIndex: 90,
  },
  card: {
    backgroundColor: 'rgba(253, 251, 247, 0.98)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.18)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  title: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginBottom: 4 },
  message: { fontSize: 13, lineHeight: 19, color: Colors.ink, marginBottom: 6 },
  spot: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(106,156,137,0.35)' },
  btnGhostText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  arrow: {
    position: 'absolute',
    right: 28,
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: 'rgba(253, 251, 247, 0.98)',
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(106,156,137,0.18)',
  },
});

export default GuideToast;
