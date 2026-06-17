import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, ScrollView, Image,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import AmapView, { type AmapViewRef } from '@/components/map/AmapView';
import { useMapSpots } from '@/hooks/useMapSpots';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES, CAT_COLORS } from '@/constants/scenic';

import * as Location from 'expo-location';

const IS_WEB = Platform.OS === 'web';

// ─── Web: Spot Card ───
function WebSpotCard({ spot, index, onPress }: { spot: any; index: number; onPress: () => void }) {
  const hasImage = !!SPOT_IMAGES[spot.id];
  const color = CAT_COLORS[spot.category] || Colors.gray400;

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).duration(350)}>
      <Pressable
        style={({ pressed }) => [
          webStyles.card,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={onPress}
      >
        {hasImage && (
          <View style={webStyles.cardImgWrap}>
            <Image source={SPOT_IMAGES[spot.id]} style={webStyles.cardImg} resizeMode="cover" />
            <View style={webStyles.cardImgOverlay} />
          </View>
        )}
        <View style={webStyles.cardBody}>
          <View style={webStyles.cardHeader}>
            <View style={[webStyles.cardBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
              <Text style={[webStyles.cardBadgeText, { color }]}>{spot.category}</Text>
            </View>
          </View>
          <Text style={webStyles.cardName} numberOfLines={1}>{spot.name}</Text>
          <Text style={webStyles.cardOverview} numberOfLines={2}>{spot.overview}</Text>
          {spot.tags && spot.tags.length > 0 && (
            <View style={webStyles.cardTags}>
              {spot.tags.slice(0, 3).map((tag: string) => (
                <View key={tag} style={webStyles.cardTag}>
                  <Text style={webStyles.cardTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MapGuidePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vrmRef = useRef<VRMFloatingRef>(null);

  const {
    spots, loading, selectedSpot, navigating, userLocation,
    locationError, routeInfo, spotDistance,
    setSelectedSpot, setLocationError, setUserLocation,
    handleSpotTap, handleNavigate, handleCloseRoute,
  } = useMapSpots();

  const mapRef = useRef<AmapViewRef>(null);
  const [hoveredSpot, setHoveredSpot] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const vrmSpeak = useCallback((text: string, emotion?: string) => {
    vrmRef.current?.speak(text, emotion);
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('map');
    const t = setTimeout(() => {
      vrmSpeak('点击地图上的标记，探索灵山胜境', 'neutral');
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (IS_WEB) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('已拒绝定位授权');
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          setLocationError(null);
        },
      );
      return () => sub.remove();
    })();
  }, []);

  const handleLocate = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.setCenter(userLocation.latitude, userLocation.longitude, 17);
    }
  }, [userLocation]);

  const handleNavigateWithMap = useCallback(() => {
    handleNavigate();
    if (userLocation && selectedSpot && mapRef.current) {
      mapRef.current.drawRoute([
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: selectedSpot.latitude!, longitude: selectedSpot.longitude! },
      ]);
    }
  }, [handleNavigate, userLocation, selectedSpot]);

  useEffect(() => {
    if (!navigating && mapRef.current) {
      mapRef.current.clearRoute();
    }
  }, [navigating]);

  const handleWebSpotTap = useCallback((spot: any) => {
    setHoveredSpot(spot.id);
    setTimeout(() => router.push(`/attractions/${spot.id}`), 600);
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // ─── Web: scenic overview ───
  if (IS_WEB) {
    return (
      <>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
            <Text style={styles.backTxt}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>灵山导览</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={webStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {/* Map section */}
          <Animated.View entering={FadeInUp.duration(400)} style={webStyles.mapSection}>
            <View style={webStyles.mapSectionHeader}>
              <Text style={webStyles.mapSectionTitle}>胜境全图</Text>
              <Text style={webStyles.mapSectionSub}>SCENIC MAP</Text>
              <View style={webStyles.mapSectionLine} />
            </View>
            <View style={webStyles.mapCard}>
              <AmapView spots={spots} onSpotTap={handleWebSpotTap} height={280} />
              <View style={webStyles.mapFooter}>
                <Text style={webStyles.mapFooterText}>点击景点标记查看详情</Text>
              </View>
            </View>
          </Animated.View>

          {/* Spot grid */}
          <Animated.View entering={FadeInUp.delay(150).duration(400)} style={webStyles.gridSection}>
            <View style={webStyles.gridHeader}>
              <Text style={webStyles.gridTitle}>景点一览</Text>
              <Text style={webStyles.gridCount}>共 {spots.length} 个景点</Text>
            </View>
            <View style={webStyles.spotGrid}>
              {spots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((spot, idx) => (
                <WebSpotCard
                  key={spot.id}
                  spot={spot}
                  index={idx}
                  onPress={() => handleWebSpotTap(spot)}
                />
              ))}
            </View>
            {/* Pagination */}
            {Math.ceil(spots.length / PAGE_SIZE) > 1 && (
              <View style={webStyles.pagination}>
                <Pressable
                  style={({ pressed }) => [
                    webStyles.pageBtn,
                    page === 1 && webStyles.pageBtnDisabled,
                    pressed && page > 1 && { opacity: 0.7 },
                  ]}
                  onPress={() => page > 1 && setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <Text style={[webStyles.pageBtnText, page === 1 && webStyles.pageBtnTextDisabled]}>上一页</Text>
                </Pressable>
                <View style={webStyles.pageDots}>
                  {Array.from({ length: Math.ceil(spots.length / PAGE_SIZE) }, (_, i) => (
                    <Pressable key={i} onPress={() => setPage(i + 1)}>
                      <View style={[webStyles.pageDot, page === i + 1 && webStyles.pageDotActive]} />
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={({ pressed }) => [
                    webStyles.pageBtn,
                    page === Math.ceil(spots.length / PAGE_SIZE) && webStyles.pageBtnDisabled,
                    pressed && page < Math.ceil(spots.length / PAGE_SIZE) && { opacity: 0.7 },
                  ]}
                  onPress={() => page < Math.ceil(spots.length / PAGE_SIZE) && setPage((p) => p + 1)}
                  disabled={page === Math.ceil(spots.length / PAGE_SIZE)}
                >
                  <Text style={[webStyles.pageBtnText, page === Math.ceil(spots.length / PAGE_SIZE) && webStyles.pageBtnTextDisabled]}>下一页</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </>
    );
  }

  // ─── Native: real map ───
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
          <Text style={styles.backTxt}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>灵山导览</Text>
        <Pressable onPress={handleLocate} style={styles.locateBtn}>
          <Text style={styles.locateTxt}>⊕</Text>
        </Pressable>
      </View>

      <AmapView
        ref={mapRef}
        spots={spots}
        onSpotTap={handleSpotTap}
        showUserLocation={!!userLocation}
        userLocation={userLocation}
        style={{ flex: 1 }}
        height={undefined}
      />

      {locationError && (
        <View style={[styles.errorToast, { top: insets.top + 60 }]}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {selectedSpot && !navigating && (
        <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{selectedSpot.name}</Text>
            <Pressable onPress={() => setSelectedSpot(null)} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.cardOverview} numberOfLines={2}>
            {selectedSpot.overview}
            {spotDistance != null && (
              <Text style={styles.cardDist}>
                {'  '}距你 {spotDistance >= 1000 ? `${(spotDistance / 1000).toFixed(1)}km` : `${Math.round(spotDistance)}m`}
              </Text>
            )}
          </Text>
          <View style={styles.cardActions}>
            <Pressable style={styles.navBtn} onPress={handleNavigateWithMap}>
              <Text style={styles.navBtnTxt}>导航到这里</Text>
            </Pressable>
            <Pressable style={styles.detailBtn} onPress={() => router.push(`/attractions/${selectedSpot.id}`)}>
              <Text style={styles.detailBtnTxt}>查看详情</Text>
            </Pressable>
          </View>
        </View>
      )}

      {navigating && selectedSpot && (
        <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>← {selectedSpot.name}</Text>
            <Pressable onPress={handleCloseRoute} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>
          {routeInfo && (
            <View style={styles.routeInfo}>
              <Text style={styles.routeInfoTxt}>
                步行 {routeInfo.distance >= 1000 ? `${(routeInfo.distance / 1000).toFixed(1)}km` : `${routeInfo.distance}m`}
              </Text>
              <Text style={styles.routeInfoTxt}>约{routeInfo.duration}分钟</Text>
            </View>
          )}
          <Pressable style={styles.stopNavBtn} onPress={handleCloseRoute}>
            <Text style={styles.stopNavTxt}>结束导航</Text>
          </Pressable>
        </View>
      )}

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

// ─────────────────────
//  Styles
// ─────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.paper },
  loadingText: { fontSize: 14, color: Colors.gray400, marginTop: 16, letterSpacing: 4 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingBottom: 8, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 8 },
  backTxt: { fontSize: 20, color: Colors.ink, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.ink, letterSpacing: 3 },
  locateBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  locateTxt: { fontSize: 18, color: Colors.auxiliary },
  map: { flex: 1 },
  errorToast: {
    position: 'absolute', left: 20, right: 20, zIndex: 25,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  errorText: { fontSize: 13, color: Colors.gray500 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
    backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14,
    paddingHorizontal: 20, paddingTop: 16,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.ink, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 16, color: Colors.gray400 },
  cardOverview: { fontSize: 13, color: Colors.gray500, lineHeight: 20, marginBottom: 14 },
  cardDist: { color: Colors.accent, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 12 },
  navBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: Colors.accent, alignItems: 'center',
  },
  navBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  detailBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.borderDefault, alignItems: 'center',
  },
  detailBtnTxt: { color: Colors.ink, fontSize: 14, letterSpacing: 1 },
  routeInfo: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  routeInfoTxt: { fontSize: 14, color: Colors.gray600 },
  stopNavBtn: {
    paddingVertical: 12, borderRadius: 8,
    backgroundColor: Colors.gray200, alignItems: 'center',
  },
  stopNavTxt: { color: Colors.ink, fontSize: 14, fontWeight: '500' },
});

// ─────────────────────
//  Web Fallback Styles
// ─────────────────────
const webStyles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },

  // Map section
  mapSection: { paddingHorizontal: 14, marginBottom: 24 },
  mapSectionHeader: { alignItems: 'center', marginBottom: 14 },
  mapSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  mapSectionSub: { fontSize: 9, letterSpacing: 3, color: Colors.gray400, marginTop: 4 },
  mapSectionLine: { width: 24, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 8, opacity: 0.5 },

  mapCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mapFooter: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    alignItems: 'center',
  },
  mapFooterText: { fontSize: 11, color: Colors.gray400, letterSpacing: 1 },

  // Scenic map
  mapContainer: {
    width: '100%', height: 280,
    position: 'relative', overflow: 'hidden',
  },
  mapZoomLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  mapContent: {
    width: '100%', height: '100%',
    transformOrigin: 'center center',
  },
  mapBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F2EC',
  },
  gridH1: { position: 'absolute', top: '25%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(106,156,137,0.06)' },
  gridH2: { position: 'absolute', top: '75%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(106,156,137,0.06)' },
  gridV1: { position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(106,156,137,0.06)' },
  gridV2: { position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(106,156,137,0.06)' },

  marker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    zIndex: 10,
  },
  markerDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  markerNum: { fontSize: 9, fontWeight: '700', color: '#fff' },
  markerLabel: {
    marginTop: 2,
    paddingHorizontal: 5, paddingVertical: 1.5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 3,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  markerLabelText: { fontSize: 9, fontWeight: '500', color: Colors.ink },

  compass: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  compassN: { fontSize: 8, fontWeight: '700', color: Colors.accent, marginTop: -2 },
  compassNeedle: { width: 1.5, height: 7, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 1 },

  legend: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendText: { fontSize: 8, color: Colors.gray500 },

  // Zoom controls
  zoomControls: {
    position: 'absolute', top: 8, right: 8,
    alignItems: 'center',
  },
  zoomBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: Colors.borderLight,
  },
  zoomBtnText: { fontSize: 16, color: Colors.ink, fontWeight: '600', lineHeight: 18 },
  zoomLevel: {
    fontSize: 9, color: Colors.gray500, marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
  },

  // Spot grid
  gridSection: { paddingHorizontal: 14, marginBottom: 24 },
  gridHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  gridTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, letterSpacing: 2 },
  gridCount: { fontSize: 12, color: Colors.gray400 },

  spotGrid: { gap: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImgWrap: {
    width: '100%', height: 100,
    position: 'relative', overflow: 'hidden',
  },
  cardImg: { width: '100%', height: '100%' },
  cardImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cardBody: { padding: 12 },
  cardHeader: { marginBottom: 6 },
  cardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 3, borderWidth: 0.5,
  },
  cardBadgeText: { fontSize: 10, fontWeight: '500' },
  cardName: { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 4 },
  cardOverview: { fontSize: 12, color: Colors.gray500, lineHeight: 18, marginBottom: 6 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cardTag: {
    paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: Colors.gray100, borderRadius: 3,
  },
  cardTagText: { fontSize: 9, color: Colors.gray500 },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  pageBtnDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.borderLight,
  },
  pageBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  pageBtnTextDisabled: {
    color: Colors.gray400,
  },
  pageDots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  pageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.gray200,
  },
  pageDotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
});
