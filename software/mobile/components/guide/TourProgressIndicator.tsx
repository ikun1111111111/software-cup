import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import type { TourProgress, Route } from '@/hooks/useTourOrchestrator';

interface Props {
  progress: TourProgress;
  currentRoute: Route | null;
  status: string;
  onResume: () => void;
  onEnd: () => void;
  // GPS相关
  distance?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  // 打卡成功动画
  justCheckedIn?: boolean;
  // 是否显示控制按钮（详情页不显示，放在打卡按钮下方）
  showControls?: boolean;
  // 是否显示简化路线（详情页模式：只显示当前到下一个景点）
  simplified?: boolean;
}

/**
 * 导览进度指示器（支持折叠/展开）
 * 展开态：显示完整景点序列、进度条、控制按钮
 * 收起态：只显示路线名称 + 进度 + 箭头
 */
export const TourProgressIndicator: React.FC<Props> = ({
  progress,
  currentRoute,
  status,
  onResume,
  onEnd,
  distance,
  collapsed = false,
  onToggleCollapse,
  justCheckedIn = false,
  showControls = true,
  simplified = false,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const spotsScrollRef = useRef<ScrollView>(null);

  // 直接用 Dimensions 计算可用宽度（容器 padding: 16 * 2 = 32）
  const availableWidth = Dimensions.get('window').width - 32;

  // 使用外部控制的collapsed或内部状态
  const isCollapsed = onToggleCollapse !== undefined ? collapsed : internalCollapsed;

  if (!currentRoute || progress.total === 0) return null;

  const percentage = (progress.completed / progress.total) * 100;
  const currentSpotName = currentRoute.spots[progress.current - 1]?.name;

  // 自动滚动到当前景点（居中显示）
  useEffect(() => {
    if (spotsScrollRef.current && progress.current > 0) {
      const scrollX = (progress.current - 1) * 90;
      const centerOffset = Math.max(0, scrollX - (availableWidth - 90) / 2);
      spotsScrollRef.current.scrollTo({ x: centerOffset, animated: true });
    }
  }, [progress.current]);

  const statusText =
    status === 'narrating'
      ? '🎤 讲解中'
      : status === 'navigate'
        ? '🧭 导航中'
        : status === 'suggest'
          ? ' 推荐中'
          : status === 'completed'
            ? '✅ 已完成'
            : status === 'free'
              ? '自由探索'
              : status === 'paused'
                ? '⏸ 已暂停'
                : '待导览';

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!isCollapsed);
    }
  };

  return (
    <View
      style={[styles.container, justCheckedIn && styles.containerCheckIn]}
    >
      {/* 头部：点击可折叠/展开 */}
      <Pressable style={styles.header} onPress={toggleCollapse} hitSlop={8}>
        <View style={styles.headerLeft}>
          <Text style={styles.routeName}>{currentRoute.name}</Text>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.progressBadge}>
            {progress.completed}/{progress.total}
          </Text>
          <Text style={[styles.collapseIcon, isCollapsed && styles.collapseIconRotated]}>
            {isCollapsed ? '▼' : '▲'}
          </Text>
        </View>
      </Pressable>

      {/* 展开内容 */}
      {!isCollapsed && (
        <View style={styles.expandedContent}>
          {/* 进度条 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
          </View>

          {/* 当前位置 */}
          {currentSpotName && (
            <View style={styles.currentSpot}>
              <Text style={styles.currentSpotLabel}>当前位置</Text>
              <Text style={styles.currentSpotName}>{currentSpotName}</Text>
              {distance !== undefined && (
                <Text style={styles.distanceText}>距目标约{distance}米</Text>
              )}
            </View>
          )}

          {/* 景点序列 - 横向可滑动 */}
          <View style={styles.spotsScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotsScrollContent}
              ref={spotsScrollRef}
              bounces={false}
              style={{ height: 50, width: availableWidth }}
            >
                {currentRoute.spots.map((spot, index) => {
                  const isCompleted = index < progress.completed;
                  const isCurrent = index === progress.current - 1;
                  const isLast = index === currentRoute.spots.length - 1;
                  return (
                    <View key={spot.id} style={styles.spotScrollItem}>
                      <View
                        style={[
                          styles.spotDot,
                          isCompleted && styles.spotDotCompleted,
                          isCurrent && styles.spotDotCurrent,
                          justCheckedIn && isCompleted && styles.spotDotPulse,
                        ]}
                      >
                        <Text style={styles.spotDotText}>
                          {isCompleted ? '✓' : index + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.spotName,
                          isCompleted && styles.spotNameCompleted,
                          isCurrent && styles.spotNameCurrent,
                        ]}
                        numberOfLines={1}
                      >
                        {spot.name}
                      </Text>
                      {!isLast && (
                        <View
                          style={[
                            styles.spotLineH,
                            isCompleted && styles.spotLineCompleted,
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </ScrollView>
          </View>

          {/* 控制按钮 - 仅在 showControls 为 true 时显示 */}
          {showControls && (
            <View style={styles.controls}>
              {status !== 'free' && status !== 'completed' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.controlBtn,
                    styles.resumeBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={onResume}
                >
                  <Text style={styles.resumeBtnText}>
                    {status === 'narrating' ? '继续讲解' : '继续导览'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.controlBtn,
                  styles.endBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={onEnd}
              >
                <Text style={styles.endBtnText}>结束导览</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(253, 251, 247, 0.98)',
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.15)',
  },
  containerCheckIn: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusText: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    backgroundColor: 'rgba(192, 136, 46, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  collapseIcon: {
    fontSize: 12,
    color: Colors.gray400,
    transitionProperty: 'transform',
  },
  collapseIconRotated: {
    transform: [{ rotate: '180deg' }],
  },

  // 展开内容
  expandedContent: {
    marginTop: 12,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(106, 156, 137, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  currentSpot: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(106, 156, 137, 0.08)',
    borderRadius: 8,
  },
  currentSpotLabel: {
    fontSize: 10,
    color: Colors.gray500,
    marginBottom: 2,
  },
  currentSpotName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  distanceText: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 2,
  },

  spotsScrollWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  spotsScrollView: {
    height: 50,
    marginBottom: 14,
  },
  spotsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  spotScrollItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    flexShrink: 0,
  },
  spotDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  spotDotCompleted: {
    backgroundColor: Colors.primary,
  },
  spotDotCurrent: {
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: 'rgba(106, 156, 137, 0.3)',
  },
  spotDotPulse: {
    // 打卡成功时的脉冲效果（可选动画增强）
  },
  spotDotText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  spotName: {
    fontSize: 10,
    color: Colors.gray500,
    textAlign: 'center',
    maxWidth: 55,
    marginLeft: 4,
  },
  spotNameCompleted: {
    color: Colors.primary,
    fontWeight: '600',
  },
  spotNameCurrent: {
    color: Colors.accent,
    fontWeight: '700',
  },
  spotLineH: {
    width: 16,
    height: 2,
    backgroundColor: Colors.gray300,
    marginLeft: 2,
  },
  spotLineCompleted: {
    backgroundColor: Colors.primary,
  },

  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  resumeBtn: {
    backgroundColor: Colors.primary,
  },
  resumeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  endBtn: {
    borderWidth: 1,
    borderColor: 'rgba(192, 57, 43, 0.3)',
    backgroundColor: 'transparent',
  },
  endBtnText: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TourProgressIndicator;
