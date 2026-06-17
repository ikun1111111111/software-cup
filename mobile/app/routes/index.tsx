import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { SectionHeader } from '@/components/scenic/SectionHeader';
import { listRoutes, type TourRoute } from '@/api/routes';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { ROUTE_TYPE_META } from '@/constants/scenic';

export default function RoutesListPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);

  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  const filters = [
    { key: '', label: '全部' },
    { key: 'history', label: '历史文化' },
    { key: 'nature', label: '鑷劧椋庡厜' },
    { key: 'family', label: '亲子家庭' },
  ];

  useEffect(() => {
    setLoading(true);
    listRoutes(activeFilter || undefined)
      .then((res) => {
        const data = (res as any).data ?? res;
        setRoutes(Array.isArray(data) ? data : []);
      })
      .catch(() => setRoutes([]))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const vrmSpeak = useCallback((text: string, emotion?: string) => {
    vrmRef.current?.speak(text, emotion);
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('routes');
    const t = setTimeout(() => {
      vrmSpeak('为您推荐几条精选游览路线', 'neutral');
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const handleRoutePress = useCallback((route: TourRoute) => {
    vrmSpeak(`${route.name}锛?{route.description}`, 'neutral');
    setTimeout(() => router.push(`/routes/${route.id}`), 1500);
  }, [vrmSpeak, router]);

  const handleFilterChange = useCallback((key: string) => {
    setActiveFilter(key);
    const label = filters.find((f) => f.key === key)?.label ?? '全部';
    vrmSpeak(`姝ｅ湪鏌ョ湅${label}璺嚎`, 'neutral');
  }, [vrmSpeak]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/explore')}>
          <Text style={styles.backText}>鈫?杩斿洖</Text>
        </Pressable>
        <Text style={styles.headerTitle}>娓歌璺嚎</Text>
        <View style={styles.headerLine} />
        <Text style={styles.headerSub}>绮鹃€夎矾绾?路 娣卞害浣撻獙</Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => {
          const active = f.key === activeFilter;
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleFilterChange(f.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>鍔犺浇璺嚎...</Text>
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>馃椇锔</Text>
          <Text style={styles.emptyText}>鏆傛棤璺嚎</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {routes.map((route, idx) => {
            const meta = ROUTE_TYPE_META[route.route_type] || ROUTE_TYPE_META.nature;
            return (
              <Animated.View key={route.id} entering={FadeInUp.delay(idx * 80).duration(400)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.routeCard,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => handleRoutePress(route)}
                >
                  <View style={styles.routeTop}>
                    <View style={[styles.routeTypeBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.routeTypeIcon, { color: meta.color }]}>{meta.icon}</Text>
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <View style={styles.routeMetaRow}>
                        <View style={[styles.routeMetaTag, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.routeMetaText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        <Text style={styles.routeDuration}>{route.duration}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.routeDesc} numberOfLines={2}>{route.description}</Text>
                  <View style={styles.routeFooter}>
                    <Text style={styles.routeCta}>鏌ョ湅璇︽儏 鈫</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  header: { alignItems: 'center', paddingVertical: 10 },
  backBtn: { position: 'absolute', left: 14, top: 10, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, letterSpacing: 3 },
  headerLine: { width: 20, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 5, opacity: 0.6 },
  headerSub: { fontSize: 10, color: Colors.gray400, marginTop: 3 },

  filterRow: { paddingHorizontal: 14, marginBottom: 14, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, minHeight: 36,
    borderWidth: 1, borderColor: 'rgba(192,188,182,0.4)',
    backgroundColor: '#fff', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 12, color: Colors.gray500 },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  list: { paddingHorizontal: 14, paddingBottom: 100 },

  routeCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg,
    padding: 16, marginBottom: 14,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  routeTypeBadge: {
    width: 44, height: 44, borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  routeTypeIcon: { fontSize: 20, fontWeight: '700' },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 15, fontWeight: '600', color: Colors.ink, letterSpacing: 1 },
  routeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  routeMetaTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  routeMetaText: { fontSize: 10, fontWeight: '500' },
  routeDuration: { fontSize: 11, color: Colors.gray400 },
  routeDesc: { fontSize: 13, color: Colors.gray500, lineHeight: 20, marginBottom: 10 },
  routeFooter: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8, alignItems: 'flex-end' },
  routeCta: { fontSize: 12, color: Colors.primary, fontWeight: '500' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 3, marginTop: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: Colors.gray400 },
});
