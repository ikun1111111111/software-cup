import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

interface Props {
  visible: boolean;
  spotName: string;
  photoUri?: string;
  onAddMemory: () => void;
  onSkip: () => void;
}

/**
 * 打卡成功后的记忆写入询问弹窗
 * 使用绝对定位 overlay 替代 Modal，确保在手机框架内显示
 */
export function MemoryPrompt({
  visible,
  spotName,
  photoUri,
  onAddMemory,
  onSkip,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 250, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onSkip} />
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* 成功图标 */}
        <View style={styles.successWrap}>
          <Text style={styles.successIcon}>🎉</Text>
        </View>

        <Text style={styles.title}>打卡成功！</Text>
        <Text style={styles.spotName}>{spotName}</Text>

        {/* 照片预览 */}
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
          </View>
        ) : (
          <View style={styles.noPhotoWrap}>
            <Text style={styles.noPhotoIcon}>📍</Text>
            <Text style={styles.noPhotoText}>已记录到达</Text>
          </View>
        )}

        {/* 提示文字 */}
        <Text style={styles.prompt}>是否将这次体验加入旅行记忆？</Text>

        {/* 按钮 */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
            onPress={onSkip}
          >
            <Text style={styles.skipBtnTxt}>跳过</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.memoryBtn, pressed && { opacity: 0.9 }]}
            onPress={onAddMemory}
          >
            <Text style={styles.memoryBtnTxt}> 加入记忆</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  successWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(200,169,81,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 4,
  },
  spotName: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  photoWrap: {
    width: '100%',
    height: 140,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhotoWrap: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.lg,
    marginBottom: 16,
  },
  noPhotoIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  noPhotoText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  prompt: {
    fontSize: 14,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  skipBtnTxt: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: '600',
  },
  memoryBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  memoryBtnTxt: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default MemoryPrompt;
