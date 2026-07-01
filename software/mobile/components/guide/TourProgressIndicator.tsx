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
  const nextSpotName = currentRoute.spots[progress.current]?.name;

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

  const guideLine =
    status === 'completed'
      ? '这条路线已经走完了，我可以帮你整理成一段旅行记忆。'
      : status === 'narrating'
        ? `我正在讲 ${currentSpotName || currentRoute.name}，你可以边看边听。`
        : status === 'paused'
          ? '我先安静等你，想继续时点一下就能接上路线。'
          : nextSpotName
            ? `我在前面领路，下一站去 ${nextSpotName}。`
            : `我陪你看 ${currentSpotName || currentRoute.name}，需要讲解就叫我。`;

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

          {!simplified && (
            <View style={styles.guidePanel}>
              <View style={styles.guideAvatarWrap}>
                <View style={styles.guideSeal}>
                  <Text style={styles.guideSealText}>灵</Text>
                </View>
                <Text style={styles.guideName}>小灵</Text>
              </View>
              <View style={styles.guideBubble}>
                <View style={styles.guideBubbleHeader}>
                  <View style={styles.liveDot} />
                  <Text style={styles.guideBadge}>数字人导览在线</Text>
                </View>
                <Text style={styles.guideLine} numberOfLines={2}>
                  {guideLine}
                </Text>
              </View>
            </View>
          )}

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
              style={styles.spotsScrollView}
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
    backgroundColor: 'rgba(253, 251, 247, 0.94)',
    borderRadius: 18,
    padding: 14,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.74)',
  },
  containerCheckIn: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0,
  },
  statusText: {
    fontSize: 11,
    color: Colors.gray600,
    marginTop: 4,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accent,
    backgroundColor: 'rgba(200, 75, 49, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  collapseIcon: {
    fontSize: 13,
    color: Colors.gray400,
    transitionProperty: 'transform',
  },
  collapseIconRotated: {
    transform: [{ rotate: '180deg' }],
  },

  // 展开内容
  expandedContent: {
    marginTop: 10,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(106, 156, 137, 0.14)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryDark,
    borderRadius: 999,
  },

  guidePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(42, 37, 32, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.16)',
  },
  guideAvatarWrap: {
    width: 56,
    alignItems: 'center',
  },
  guideSeal: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EA',
    borderWidth: 1.5,
    borderColor: 'rgba(106, 156, 137, 0.36)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  guideSealText: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    color: Colors.primaryDark,
    fontFamily: 'MaShanZheng',
  },
  guideName: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  guideBubble: {
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  guideBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  guideBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 1,
  },
  guideLine: {
    fontSize: 12,
    color: Colors.gray700,
    lineHeight: 17,
    fontWeight: '600',
  },

  currentSpot: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.14)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  currentSpotLabel: {
    fontSize: 10,
    color: Colors.primaryDark,
    marginBottom: 4,
    fontWeight: '800',
    letterSpacing: 0,
  },
  currentSpotName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 0,
  },
  distanceText: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 2,
  },

  spotsScrollWrapper: {
    width: '100%',
    marginBottom: 14,
    paddingVertical: 3,
  },
  spotsScrollView: {
    height: 72,
  },
  spotsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 8,
  },
  spotScrollItem: {
    position: 'relative',
    alignItems: 'center',
    width: 92,
    paddingTop: 2,
    flexShrink: 0,
  },
  spotDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 2,
  },
  spotDotCompleted: {
    backgroundColor: Colors.primaryDark,
  },
  spotDotCurrent: {
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    transform: [{ scale: 1.06 }],
  },
  spotDotPulse: {
    // 打卡成功时的脉冲效果（可选动画增强）
  },
  spotDotText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
  },
  spotName: {
    width: 80,
    fontSize: 10,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '700',
  },
  spotNameCompleted: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  spotNameCurrent: {
    color: Colors.accent,
    fontWeight: '900',
  },
  spotLineH: {
    position: 'absolute',
    top: 17,
    left: 61,
    width: 62,
    height: 2,
    backgroundColor: 'rgba(196, 191, 182, 0.72)',
    zIndex: 0,
  },
  spotLineCompleted: {
    backgroundColor: Colors.primaryDark,
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
