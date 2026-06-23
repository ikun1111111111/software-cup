import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

interface Props {
  visible: boolean;
  spotName: string;
  distance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 景点到达弹窗
 * 当用户接近景点时弹出，询问是否跳转到详情页打卡
 */
export const ArrivalDialog: React.FC<Props> = ({
  visible,
  spotName,
  distance,
  onConfirm,
  onCancel,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* 图标 */}
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>📍</Text>
          </View>

          {/* 标题 */}
          <Text style={styles.title}>即将到达</Text>
          <Text style={styles.spotName}>{spotName}</Text>

          {/* 距离信息 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {distance > 0 ? '距您约' : '景点'}
            </Text>
            <Text style={styles.infoValue}>
              {distance > 0 ? `${distance}米` : '打卡'}
            </Text>
          </View>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelBtnText}>稍后再说</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.confirmBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmBtnText}>前往打卡</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(106, 156, 137, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 14,
    color: Colors.gray400,
    letterSpacing: 2,
    marginBottom: 8,
  },
  spotName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(192, 136, 46, 0.08)',
    borderRadius: Radius.md,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.gray500,
    marginRight: 6,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelBtnText: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 2,
  },
});

export default ArrivalDialog;
