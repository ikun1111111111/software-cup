import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Modal } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

interface Props {
  visible: boolean;
  spotName: string;
  onPhoto: () => void;
  onScan: () => void;
  onDirect: () => void;
  onCancel: () => void;
}

/**
 * 多功能打卡面板
 * 替代原有的 ArrivalDialog，提供拍照/扫码/直接打卡三种方式
 */
export function CheckinPanel({
  visible,
  spotName,
  onPhoto,
  onScan,
  onDirect,
  onCancel,
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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.panel, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* 标题 */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>📍</Text>
            </View>
            <Text style={styles.label}>已到达</Text>
            <Text style={styles.spotName}>{spotName}</Text>
          </View>

          {/* 打卡方式 */}
          <View style={styles.methods}>
            {/* 拍照打卡 */}
            <Pressable
              style={({ pressed }) => [styles.methodCard, pressed && { opacity: 0.85 }]}
              onPress={onPhoto}
            >
              <View style={[styles.methodIcon, { backgroundColor: Colors.primaryBg }]}>
                <Text style={styles.methodEmoji}>📷</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>拍照打卡</Text>
                <Text style={styles.methodDesc}>拍摄景点照片留念</Text>
              </View>
              <Text style={styles.methodArrow}>→</Text>
            </Pressable>

            {/* 扫码打卡 */}
            <Pressable
              style={({ pressed }) => [styles.methodCard, pressed && { opacity: 0.85 }]}
              onPress={onScan}
            >
              <View style={[styles.methodIcon, { backgroundColor: Colors.auxiliaryBg }]}>
                <Text style={styles.methodEmoji}>📱</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>扫码打卡</Text>
                <Text style={styles.methodDesc}>扫描景点二维码</Text>
              </View>
              <Text style={styles.methodArrow}>→</Text>
            </Pressable>
          </View>

          {/* 直接打卡 */}
          <Pressable
            style={({ pressed }) => [styles.directBtn, pressed && { opacity: 0.9 }]}
            onPress={onDirect}
          >
            <Text style={styles.directBtnTxt}>✅ 直接打卡</Text>
          </Pressable>

          {/* 返回 */}
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnTxt}>返回</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(106,156,137,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    fontSize: 12,
    color: Colors.gray400,
    letterSpacing: 2,
    marginBottom: 4,
  },
  spotName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 2,
  },
  methods: {
    gap: 10,
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: '#FAFAF8',
    gap: 12,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodEmoji: {
    fontSize: 20,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 11,
    color: Colors.gray500,
  },
  methodArrow: {
    fontSize: 16,
    color: Colors.gray400,
  },
  directBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  directBtnTxt: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 2,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnTxt: {
    fontSize: 13,
    color: Colors.gray500,
    fontWeight: '500',
  },
});

export default CheckinPanel;
