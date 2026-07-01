import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import InlineModal from '@/components/ui/InlineModal';
import type { TourRouteDetail } from '@/api/routes';
import { getRoutesWithFallback, getRouteDetailWithFallback } from '@/services/dataSync';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── 路线选项 ──
export interface RouteOption {
  id: string;
  name: string;
  description: string;
  spots: Array<{ id: string; name: string }>;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

type Step = 'collab' | 'plan';

interface Props {
  visible: boolean;
  routes?: RouteOption[];
  onSelectRoute: (route: RouteOption) => void;
  onCollabTour: () => void;
  onClose: () => void;
}

/**
 * 导览方案选择弹窗
 * Step 1: 选择小灵陪伴强度
 * Step 2: 选择导览方案
 */
export function GuidePlanModal({
  visible,
  routes: externalRoutes,
  onSelectRoute,
  onCollabTour,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('collab');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>(externalRoutes || []);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 从本地数据库获取路线数据，如果没有则从后端获取
  useEffect(() => {
    if (visible && !externalRoutes) {
      setLoading(true);
      
      // 使用本地数据库优先策略
      getRoutesWithFallback()
        .then(async (dbRoutes) => {
          // 并行获取所有路线详情（优先从本地数据库）
          const details = await Promise.all(
            dbRoutes.map((r) => getRouteDetailWithFallback(r.id).catch(() => null)),
          );
          // 组装路线数据：详情失败时仍保留路线列表项，避免方案弹窗空白。
          const routeOptions: RouteOption[] = dbRoutes.map((dbRoute, index) => {
            const detail = details[index] as TourRouteDetail | null;
            const spotNames = detail?.spot_names?.length
              ? detail.spot_names
              : ((dbRoute as any).spot_names || []);
            const spotOrder = detail?.spot_order || (dbRoute as any).spot_order || [];
            return {
              id: dbRoute.id,
              name: detail?.name || dbRoute.name,
              description: detail?.description || dbRoute.description || '',
              spots: spotNames.length > 0
                ? spotNames.map((s: any) => ({ id: s.id, name: s.name }))
                : spotOrder.map((id: string) => ({ id, name: id })),
              duration: detail?.duration || dbRoute.duration || '未知',
              difficulty: dbRoute.route_type === 'family' ? 'easy' : dbRoute.route_type === 'history' ? 'medium' : 'hard',
              tags: [],
            };
          });

          setRoutes(routeOptions);
        })
        .catch((err) => {
          console.error('获取路线列表失败:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (externalRoutes) {
      setRoutes(externalRoutes);
    }
  }, [visible, externalRoutes]);

  // 入场动画
  useEffect(() => {
    if (visible) {
      setStep('collab');
      setSelectedId(null);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 120,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleProactiveGuide = () => {
    onCollabTour();
  };

  const handleQuietCompanion = () => {
    setStep('plan');
  };

  const handleSelectRoute = (route: RouteOption) => {
    setSelectedId(route.id);
  };

  const handleStartTour = () => {
    const route = routes.find((r) => r.id === selectedId);
    if (route) onSelectRoute(route);
  };

  if (!visible) return null;

  const getDiffColor = (d: string) =>
    d === 'easy' ? Colors.success : d === 'medium' ? Colors.warning : Colors.error;
  const getDiffText = (d: string) =>
    d === 'easy' ? '轻松' : d === 'medium' ? '适中' : '挑战';

  return (
    <InlineModal visible={visible} transparent animationType="fade" onClose={onClose}>
    <View style={styles.overlay}>
      {/* 遮罩 */}
      <Pressable style={[styles.backdrop, { opacity: fadeAnim }]} onPress={onClose} />

      {/* 面板 */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* 拖拽手柄 */}
        <View style={styles.handle} />

        {step === 'collab' ? (
          /* ───────── Step 1: 小灵陪伴强度 ───────── */
          <View style={styles.collabStep}>
            <Text style={styles.stepTitle}>开始您的灵山之旅</Text>
            <Text style={styles.stepSub}>选择游览方式，开启专属导览体验</Text>

            <View style={styles.collabOptions}>
              {/* 小灵主动带路 */}
              <Pressable
                style={({ pressed }) => [styles.collabCard, pressed && { opacity: 0.85 }]}
                onPress={handleProactiveGuide}
                accessibilityRole="button"
                accessibilityLabel="开启小灵主动带路"
              >
                <View style={[styles.collabIconWrap, { backgroundColor: Colors.primaryBg }]}>
                  <Text style={styles.collabIcon}>👥</Text>
                </View>
                <Text style={styles.collabCardTitle}>小灵主动带路</Text>
                <Text style={styles.collabCardDesc}>小灵规划路线、提醒下一站，到点主动讲解</Text>
                <Text style={styles.collabCardCta}>开始主动导览 →</Text>
              </Pressable>

              {/* 小灵安静陪伴 */}
              <Pressable
                style={({ pressed }) => [styles.collabCard, pressed && { opacity: 0.85 }]}
                onPress={handleQuietCompanion}
                accessibilityRole="button"
                accessibilityLabel="选择小灵安静陪伴方案"
              >
                <View style={[styles.collabIconWrap, { backgroundColor: Colors.accentBg }]}>
                  <Text style={styles.collabIcon}>🎤</Text>
                </View>
                <Text style={styles.collabCardTitle}>小灵安静陪伴</Text>
                <Text style={styles.collabCardDesc}>你自由慢逛，小灵只在关键节点轻声提醒</Text>
                <Text style={styles.collabCardCta}>选择陪伴节奏 →</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ───────── Step 2: 方案选择 ───────── */
          <View style={styles.planStep}>
            <View style={styles.planHeader}>
              <Pressable
                style={styles.backBtn}
                onPress={() => setStep('collab')}
                accessibilityRole="button"
                accessibilityLabel="返回游览方式选择"
              >
                <Text style={styles.backBtnTxt}>← 返回</Text>
              </Pressable>
              <Text style={styles.stepTitle}>选择导览方案</Text>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>加载路线数据...</Text>
              </View>
            ) : routes.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>暂无可用路线</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.routeList}
                contentContainerStyle={styles.routeListContent}
                showsVerticalScrollIndicator={false}
              >
                {routes.map((route) => {
                const isSelected = selectedId === route.id;
                return (
                  <Pressable
                    key={route.id}
                    style={[styles.routeCard, isSelected && styles.routeCardSelected]}
                    onPress={() => handleSelectRoute(route)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${route.name}，${route.duration}，${route.spots.length}个景点`}
                  >
                    <View style={styles.routeHeader}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.routeDesc}>{route.description}</Text>

                    {/* 景点序列 */}
                    <View style={styles.spotsRow}>
                      {route.spots.map((spot, i) => (
                        <View key={spot.id} style={styles.spotItem}>
                          <Text style={styles.spotName}>{spot.name}</Text>
                          {i < route.spots.length - 1 && (
                            <Text style={styles.spotArrow}>→</Text>
                          )}
                        </View>
                      ))}
                    </View>

                    {/* 元信息 */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>⏱️ {route.duration}</Text>
                      <Text style={styles.metaText}>📍 {route.spots.length}个景点</Text>
                      <View style={[styles.diffBadge, { backgroundColor: getDiffColor(route.difficulty) + '15' }]}>
                        <Text style={[styles.diffText, { color: getDiffColor(route.difficulty) }]}>
                          {getDiffText(route.difficulty)}
                        </Text>
                      </View>
                    </View>

                    {/* 标签 */}
                    <View style={styles.tagsRow}>
                      {route.tags.map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
              </ScrollView>
            )}

            {/* 底部按钮 */}
            <Pressable
              style={[styles.startBtn, !selectedId && styles.startBtnDisabled]}
              onPress={handleStartTour}
              disabled={!selectedId || loading || routes.length === 0}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedId || loading || routes.length === 0 }}
              accessibilityLabel={selectedId ? '开始行程' : '请选择导览方案'}
            >
              <Text style={styles.startBtnTxt}>
                {selectedId ? '开始小灵陪伴 →' : '请选择方案'}
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </View>
    </InlineModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.78,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },

  // ─── Step 1: Collab ───
  collabStep: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: 13,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  collabOptions: {
    flexDirection: 'row',
    gap: 14,
  },
  collabCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  collabIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  collabIcon: {
    fontSize: 26,
  },
  collabCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 1,
    marginBottom: 6,
  },
  collabCardDesc: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  collabCardCta: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  // ─── Step 2: Plan ───
  planStep: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnTxt: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  routeList: {
    maxHeight: SCREEN_H * 0.48,
  },
  routeListContent: {
    gap: 12,
    paddingBottom: 8,
  },
  routeCard: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  routeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(106,156,137,0.04)',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
  },
  routeDesc: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: 10,
    lineHeight: 17,
  },
  spotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  spotItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotName: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  spotArrow: {
    fontSize: 11,
    color: Colors.gray400,
    marginHorizontal: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 11,
    color: Colors.gray500,
  },
  diffBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(106,156,137,0.08)',
  },
  tagText: {
    fontSize: 10,
    color: Colors.primary,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnDisabled: {
    backgroundColor: Colors.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnTxt: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray500,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray500,
  },
});

export default GuidePlanModal;
