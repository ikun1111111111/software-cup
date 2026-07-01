import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

const { height: H } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

const DISPLAY_MS = 260;
const EXIT_FADE_MS = 220;

/**
 * 简化版开场 — 静态展示品牌图 + 数字人图标 + 标题，2.5 秒后淡出进入主页
 */
export function SplashTransition({ onFinish }: Props) {
  const [ready, setReady] = useState(false);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
      exitOpacity.value = withTiming(0, { duration: EXIT_FADE_MS }, (finished) => {
        if (finished) runOnJS(onFinish)();
      });
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, containerStyle]} pointerEvents={ready ? 'none' : 'auto'}>
      {/* 背景图 */}
      <Image
        source={require('@/image/map-bg-mobile.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      {/* 底部渐变遮罩 */}
      <View style={styles.bgGradient} />

      {/* 中心内容 */}
      <View style={styles.content}>
        {/* 数字人徽章 — "灵" 字印章 */}
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>灵</Text>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>灵山数字导览人</Text>

        {/* 英文副标题 */}
        <Text style={styles.subtitle}>LINGSHAN DIGITAL GUIDE</Text>

        {/* 装饰线 */}
        <View style={styles.divider} />

        {/* 底部提示 */}
        <Text style={styles.hint}>AI 数字人 · 全程智慧伴游</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(245,240,232,0.75)',
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
    marginTop: -40,
  },
  avatarBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(200,75,49,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 24,
    shadowColor: 'rgba(200,75,49,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '900',
    color: 'rgba(200,75,49,0.9)',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1614',
    letterSpacing: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(26,22,20,0.5)',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  divider: {
    width: 80,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(26,22,20,0.6)',
    letterSpacing: 2,
  },
});
