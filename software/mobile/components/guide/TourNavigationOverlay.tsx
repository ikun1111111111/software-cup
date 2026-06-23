import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import type { Spot } from '@/hooks/useTourOrchestrator';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  targetSpot: Spot;
  distance?: number;
  duration?: number;
  onArrive: () => void;
  onCancel: () => void;
}

/**
 * 导航遮罩
 * 显示导航信息：目标景点、距离、时间
 * 提供到达/取消按钮
 */
export const TourNavigationOverlay: React.FC<Props> = ({
  targetSpot,
  distance,
  duration,
  onArrive,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // 入场动画
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 150,
    }).start();
  }, [slideAnim]);

  const formatDistance = (meters?: number) => {
    if (!meters) return '未知';
    if (meters < 1000) return `${Math.round(meters)}米`;
    return `${(meters / 1000).toFixed(1)}公里`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 60,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* 目标景点信息 */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎯</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.targetLabel}>前往</Text>
          <Text style={styles.targetName}>{targetSpot.name}</Text>

          <View style={styles.metaRow}>
            {distance !== undefined && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{formatDistance(distance)}</Text>
              </View>
            )}
            {duration !== undefined && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <Text style={styles.metaText}>{formatDuration(duration)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 控制按钮 */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            styles.arriveBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onArrive}
        >
          <Text style={styles.arriveBtnText}>✓ 已到达</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            styles.cancelBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onCancel}
        >
          <Text style={styles.cancelBtnText}>✕ 取消</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(253, 251, 247, 0.98)',
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.2)',
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(106, 156, 137, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: 2,
  },
  targetName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  arriveBtn: {
    backgroundColor: Colors.primary,
  },
  arriveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.3)',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    color: Colors.gray600,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TourNavigationOverlay;
