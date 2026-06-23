import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { VRMManager } from '@/components/vrm/VRMManager';
import { VRMView } from '@/components/vrm/VRMView';
// @ts-ignore - AmapView is platform-specific
import AmapView from '@/components/map/AmapView';
import type { AmapViewRef } from '@/components/map/AmapView.shared';
import { LINGSHAN_CENTER } from '@/components/map/AmapView.shared';
import { useMapSpots } from '@/hooks/useMapSpots';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES, CAT_COLORS } from '@/constants/scenic';
import { LINGSHAN_ROUTES } from '@/data/lingshanRoutes';
import { useTour } from '@/context/TourContext';
import { useTourGeolocation } from '@/hooks/useTourGeolocation';
import type { Spot } from '@/api/spots';

const IS_WEB = Platform.OS === 'web';
const CLASSIC_ROUTE = LINGSHAN_ROUTES[0];
const WALK_METERS_PER_MINUTE = 80;
const COORDINATE_STATUS = '地图校准';

type MapStatus = 'loading' | 'ready' | 'error';

function formatDistance(distance?: number | null) {
  if (distance == null) return '园内';
  if (distance >= 1000) return `${(distance / 1000).toFixed(1)}km`;
  return `${Math.max(1, Math.round(distance))}m`;
}

function estimateWalk(distance?: number | null) {
  if (distance == null) return '约5分钟';
  return `约${Math.max(1, Math.ceil(distance / WALK_METERS_PER_MINUTE))}分钟`;
}

function toMapSpot(spot: {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}): Spot {
  return {
    id: spot.id,
    name: spot.name,
    category: '导览目标',
    tags: null,
    overview: spot.description || '小灵正在带您前往这一站。',
    qr_code: null,
    latitude: spot.latitude ?? null,
    longitude: spot.longitude ?? null,
  };
}

function MapGuideAvatar({
  activeColor,
  fallbackLine,
}: {
  activeColor: string;
  fallbackLine: string;
}) {
  const driver = useDigitalHumanDriver('tts');
  const guideText = driver.subtitle || fallbackLine;

  return (
    <View style={styles.avatarModule} pointerEvents="none">
      <View style={styles.avatarSpeech}>
        <Text style={styles.avatarSpeechLabel}>小灵导览中</Text>
        <Text style={styles.avatarSpeechText} numberOfLines={2}>
          {guideText}
        </Text>
      </View>
      <View style={[styles.avatarStage, { borderColor: activeColor }]}>
        <VRMView
          mode="float"
          expression={driver.expression}
          mouthOpen={driver.mouthOpen}
          speaking={driver.isSpeaking}
          action={driver.action}
          actionDuration={driver.actionDurationMs}
          headRotation={driver.headRotation}
          costumeId="festival-spring"
        />
      </View>
      <View style={[styles.avatarNameTag, { backgroundColor: activeColor }]}>
        <Text style={styles.avatarNameText}>小灵</Text>
      </View>
    </View>
  );
}

export default function MapGuidePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<AmapViewRef>(null);
  const spokenMapPromptRef = useRef<string | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [mapError, setMapError] = useState<string | null>(null);

  const {
    spots, loading, selectedSpot, navigating, userLocation,
    locationError, routeInfo, spotDistance,
    setSelectedSpot, setNavigating, setLocationError, setUserLocation,
    handleSpotTap, handleNavigate, handleCloseRoute,
  } = useMapSpots();

  const [tourState, tourActions] = useTour();
  const tourTargetSpot = tourState.currentSpot || tourState.nextSpot;
  const routeIds = useMemo(
    () => tourState.currentRoute?.spots.map((spot) => spot.id) ?? CLASSIC_ROUTE.spot_order,
    [tourState.currentRoute],
  );
  const routeSpotIds = useMemo(() => routeIds.filter(Boolean), [routeIds]);

  const routePreviewSpots = useMemo(() => {
    const tourSpots = tourState.currentRoute?.spots ?? [];
    return routeIds
      .map((id) => {
        const apiSpot = spots.find((spot) => spot.id === id);
        if (apiSpot) return apiSpot;
        const tourSpot = tourSpots.find((spot) => spot.id === id);
        return tourSpot ? toMapSpot(tourSpot) : null;
      })
      .filter((spot): spot is Spot => !!spot)
      .slice(0, 8);
  }, [routeIds, spots, tourState.currentRoute]);

  const activeGuideSpot = useMemo(() => {
    if (selectedSpot) return selectedSpot;
    if (tourTargetSpot) {
      return spots.find((spot) => spot.id === tourTargetSpot.id) ?? toMapSpot(tourTargetSpot);
    }
    return routePreviewSpots[0] ?? spots[0] ?? null;
  }, [selectedSpot, spots, tourTargetSpot, routePreviewSpots]);

  const activeSpotId = activeGuideSpot?.id ?? null;
  const activeColor = activeGuideSpot
    ? CAT_COLORS[activeGuideSpot.category] || Colors.primary
    : Colors.primary;
  const activeImage = activeGuideSpot ? SPOT_IMAGES[activeGuideSpot.id] : null;
  const activeNavigationDistance = selectedSpot ? spotDistance : undefined;
  const routeTitle = tourState.currentRoute?.name ?? CLASSIC_ROUTE.name;
  const routeCopy = tourState.currentRoute?.description ?? CLASSIC_ROUTE.openingLine;
  const progressTotal = tourState.progress.total || routePreviewSpots.length;
  const progressDone = tourState.progress.completed || 0;
  const progressPct = progressTotal > 0 ? Math.min(100, (progressDone / progressTotal) * 100) : 0;

  const { distanceInfo: tourDistanceInfo } = useTourGeolocation(
    tourState.preferences.mode === 'tour' && tourTargetSpot
      ? {
          id: tourTargetSpot.id,
          name: tourTargetSpot.name,
          latitude: tourTargetSpot.latitude,
          longitude: tourTargetSpot.longitude,
        }
      : null,
    { enabled: tourState.preferences.mode === 'tour' && !!tourTargetSpot },
  );

  const displayDistance = activeNavigationDistance ?? tourDistanceInfo?.distance ?? null;
  const guideLine = selectedSpot
    ? selectedSpot.overview
    : activeGuideSpot?.overview || routeCopy;
  const avatarFallbackLine = activeGuideSpot
    ? navigating
      ? `我正在带你前往${activeGuideSpot.name}，跟着路线走就好。`
      : `下一站看${activeGuideSpot.name}，我先把重点讲给你听。`
    : '点选地图上的景点，我来讲解并带路。';
  const statusLabel = navigating
    ? '导航中'
    : selectedSpot
      ? '景点讲解'
      : tourState.currentRoute
        ? '路线导览'
        : '自由探索';

  const handleMapReady = useCallback(() => {
    setMapStatus('ready');
    setMapError(null);
  }, []);

  const handleMapError = useCallback((message: string) => {
    setMapStatus('error');
    setMapError(message);
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('map');
    const promptKey = tourState.preferences.mode === 'tour' && tourTargetSpot
      ? `tour:${tourTargetSpot.id}`
      : 'free';

    if (spokenMapPromptRef.current === promptKey) return;
    spokenMapPromptRef.current = promptKey;
    const timer = setTimeout(() => {
      if (tourState.preferences.mode === 'tour' && tourTargetSpot) {
        VRMManager.speak(
          `我们现在前往${tourTargetSpot.name}，我会一路提示路线和讲解重点。`,
          'neutral',
        );
      } else {
        VRMManager.speak('我是小灵。你可以点地图上的景点，我来讲给你听。', 'neutral');
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [tourState.preferences.mode, tourTargetSpot?.id]);

  useEffect(() => {
    if (IS_WEB) {
      if (!navigator.geolocation) {
        setLocationError('定位不可用');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLocationError(null);
        },
        () => setLocationError('定位不可用，已使用景区入口作为起点'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }

    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('定位未授权，已使用景区入口作为起点');
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          setLocationError(null);
        },
      );
    })();
    return () => subscription?.remove();
  }, [setLocationError, setUserLocation]);

  useEffect(() => {
    if (!navigating && mapRef.current) {
      mapRef.current.clearRoute();
    }
  }, [navigating]);

  const centerSpotOnMap = useCallback((spot: Spot, zoom = 16) => {
    if (spot.latitude == null || spot.longitude == null) return;
    mapRef.current?.setCenter(spot.latitude, spot.longitude, zoom);
  }, []);

  const handleSpotSelect = useCallback((spot: Spot) => {
    handleSpotTap(spot);
    centerSpotOnMap(spot);
    const deviation = tourState.soloTour.enabled
      ? tourActions.handleSoloDeviation(spot.id, 'explain_current_spot')
      : null;
    if (deviation) {
      VRMManager.speak(`${deviation.message}${spot.name}我也可以先讲给你听。`, 'neutral');
      return;
    }
    VRMManager.speak(`这里是${spot.name}。${spot.overview}`, 'thinking');
  }, [centerSpotOnMap, handleSpotTap, tourActions, tourState.soloTour.enabled]);

  const handleLocate = useCallback(() => {
    if (userLocation) {
      mapRef.current?.setCenter(userLocation.latitude, userLocation.longitude, 17);
      VRMManager.speak('我已经把地图移到你当前位置。', 'neutral');
      return;
    }
    mapRef.current?.setCenter(LINGSHAN_CENTER.latitude, LINGSHAN_CENTER.longitude, 15);
    VRMManager.speak('暂时没有拿到定位，我先把地图放回灵山核心区。', 'neutral');
  }, [userLocation]);

  const handleNavigateWithMap = useCallback(() => {
    if (!activeGuideSpot || activeGuideSpot.latitude == null || activeGuideSpot.longitude == null) return;

    setSelectedSpot(activeGuideSpot);
    const origin = userLocation ?? LINGSHAN_CENTER;
    if (userLocation && selectedSpot?.id === activeGuideSpot.id) {
      handleNavigate();
    } else {
      setNavigating(true);
    }
    mapRef.current?.drawRoute([
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: activeGuideSpot.latitude, longitude: activeGuideSpot.longitude },
    ]);
    centerSpotOnMap(activeGuideSpot, 16);
    VRMManager.speak(
      userLocation
        ? `好的，我们前往${activeGuideSpot.name}。`
        : `我先用景区入口作为起点，带你前往${activeGuideSpot.name}。`,
      'neutral',
    );
  }, [
    activeGuideSpot,
    centerSpotOnMap,
    handleNavigate,
    selectedSpot?.id,
    setNavigating,
    setSelectedSpot,
    userLocation,
  ]);

  const handleStartNarration = useCallback(() => {
    if (!activeGuideSpot) return;
    VRMManager.speak(`${activeGuideSpot.name}。${guideLine}`, 'happy');
  }, [activeGuideSpot, guideLine]);

  const handleArrive = useCallback(() => {
    if (!activeGuideSpot) return;
    router.push(`/attractions/${activeGuideSpot.id}`);
  }, [activeGuideSpot, router]);

  const handleCancelNavigation = useCallback(() => {
    handleCloseRoute();
    VRMManager.speak('已取消导航，你可以继续自由探索。', 'neutral');
  }, [handleCloseRoute]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>加载导览地图...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AmapView
        ref={mapRef}
        spots={spots}
        onSpotTap={handleSpotSelect}
        showUserLocation={!!userLocation}
        userLocation={userLocation}
        routeSpotIds={routeSpotIds}
        activeSpotId={activeSpotId}
        onMapReady={handleMapReady}
        onMapError={handleMapError}
        style={styles.mapFill}
        height={undefined}
      />

      <View style={styles.paperWash} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.iconBtn}
          accessibilityLabel="返回"
        >
          <Text style={styles.backTxt}>←</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerKicker}>DIGITAL GUIDE</Text>
          <Text style={styles.headerTitle}>小灵领路</Text>
        </View>
        <Pressable onPress={handleLocate} style={styles.iconBtn} accessibilityLabel="定位">
          <Text style={styles.locateTxt}>⌖</Text>
        </Pressable>
      </View>

      <Animated.View
        entering={FadeInUp.duration(420)}
        style={[styles.guideBeacon, { top: insets.top + 78 }]}
      >
        <View style={[styles.beaconDot, { backgroundColor: activeColor }]} />
        <View style={styles.beaconCopy}>
          <View style={styles.beaconTitleRow}>
            <Text style={styles.beaconTitle} numberOfLines={1}>{statusLabel} · {routeTitle}</Text>
            <View style={styles.coordinateBadge}>
              <Text style={styles.coordinateBadgeText}>{COORDINATE_STATUS}</Text>
            </View>
          </View>
          <Text style={styles.beaconText} numberOfLines={1}>
            {activeGuideSpot ? `下一段看 ${activeGuideSpot.name}` : '点选景点开始导览'}
          </Text>
        </View>
      </Animated.View>

      {mapStatus !== 'ready' && (
        <View style={[styles.mapNotice, { top: insets.top + 144 }]}>
          {mapStatus === 'loading' && <ActivityIndicator size="small" color={Colors.primary} />}
          <Text style={styles.mapNoticeText}>
            {mapStatus === 'loading' ? '正在加载真实地图' : mapError || '已切换离线导览底图'}
          </Text>
        </View>
      )}

      {locationError && (
        <View style={[styles.errorToast, { top: insets.top + 188 }]}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      <Animated.View
        entering={FadeInUp.delay(120).duration(420)}
        style={[styles.guideDock, { paddingBottom: insets.bottom + 14 }]}
      >
        <View style={styles.dockHandle} />
        <View style={styles.dockContent}>
          <View style={styles.dockHero}>
            <View style={styles.guideScript}>
              <View style={styles.guideIdentityRow}>
                <View style={styles.liveDot} />
                <Text style={styles.dockEyebrow}>数字人导览 · 小灵</Text>
              </View>
              <Text style={styles.dockTitle} numberOfLines={1}>
                {activeGuideSpot?.name || '灵山胜境'}
              </Text>
              <View style={styles.guideTalkBox}>
                {activeImage && (
                  <Image source={activeImage} style={styles.spotThumb} resizeMode="cover" />
                )}
                <Text style={styles.dockCopy} numberOfLines={3}>
                  {guideLine || routeCopy}
                </Text>
              </View>
              <View style={styles.guideStatusRow}>
                <Text style={styles.guideStatusText}>{statusLabel}</Text>
                <Text style={styles.guideStatusText}>{COORDINATE_STATUS}</Text>
              </View>
            </View>

            <MapGuideAvatar
              activeColor={activeColor}
              fallbackLine={avatarFallbackLine}
            />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{COORDINATE_STATUS}</Text>
              <Text style={styles.metricLabel}>点位</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {routeInfo ? `约${routeInfo.duration}分钟` : estimateWalk(displayDistance)}
              </Text>
              <Text style={styles.metricLabel}>步行</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{progressDone}/{progressTotal || routePreviewSpots.length}</Text>
              <Text style={styles.metricLabel}>路线</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.primaryBtn} onPress={handleStartNarration}>
              <Text style={styles.primaryBtnText}>听小灵讲</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleNavigateWithMap}>
              <Text style={styles.secondaryBtnText}>{navigating ? '刷新路线' : '路线指引'}</Text>
            </Pressable>
          </View>

          <View style={styles.miniActionRow}>
            <Pressable style={styles.textBtn} onPress={() => router.push('/chat')}>
              <Text style={styles.textBtnText}>问小灵</Text>
            </Pressable>
            <Pressable style={styles.textBtn} onPress={handleArrive}>
              <Text style={styles.textBtnText}>景点详情</Text>
            </Pressable>
            {navigating ? (
              <Pressable style={styles.textBtn} onPress={handleCancelNavigation}>
                <Text style={styles.textBtnText}>结束导航</Text>
              </Pressable>
            ) : tourState.currentRoute ? (
              <Pressable style={styles.textBtn} onPress={tourActions.resumeTour}>
                <Text style={styles.textBtnText}>继续路线</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.textBtn} onPress={() => router.push('/routes')}>
                <Text style={styles.textBtnText}>选路线</Text>
              </Pressable>
            )}
          </View>
        </View>

        {routePreviewSpots.length > 0 && (
          <View style={styles.routeRail}>
            <Text style={styles.routeRailTitle}>小灵推荐顺路看</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routeRailContent}
            >
              {routePreviewSpots.map((spot, index) => {
                const active = spot.id === activeSpotId;
                const completed = tourState.currentRoute ? index < progressDone : false;
                const dotColor = completed ? Colors.primary : active ? Colors.accent : Colors.gray300;
                return (
                  <Pressable
                    key={spot.id}
                    style={[styles.routeNode, active && styles.routeNodeActive]}
                    onPress={() => handleSpotSelect(spot)}
                  >
                    <View style={[styles.routeNodeDot, { backgroundColor: dotColor }]}>
                      <Text style={styles.routeNodeIndex}>{completed ? '✓' : index + 1}</Text>
                    </View>
                    <Text
                      style={[styles.routeNodeName, active && styles.routeNodeNameActive]}
                      numberOfLines={1}
                    >
                      {spot.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.paper,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: Colors.gray500,
    letterSpacing: 2,
  },
  mapFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  paperWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247,245,240,0.1)',
  },
  header: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253,251,247,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  backTxt: {
    fontSize: 20,
    color: Colors.ink,
    fontWeight: '700',
  },
  locateTxt: {
    fontSize: 20,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  headerTitleWrap: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(253,251,247,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.18)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerKicker: {
    fontSize: 8,
    color: Colors.gray400,
    letterSpacing: 2,
    fontWeight: '700',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 17,
    color: Colors.ink,
    fontWeight: '800',
    letterSpacing: 3,
  },
  guideBeacon: {
    position: 'absolute',
    left: 18,
    right: 18,
    zIndex: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(42,37,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  beaconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.74)',
  },
  beaconCopy: {
    flex: 1,
    minWidth: 0,
  },
  beaconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinateBadge: {
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  beaconTitle: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
  },
  coordinateBadgeText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '800',
    letterSpacing: 1,
  },
  beaconText: {
    marginTop: 3,
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
  },
  mapNotice: {
    position: 'absolute',
    left: 42,
    right: 42,
    zIndex: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(253,251,247,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.2)',
  },
  mapNoticeText: {
    fontSize: 11,
    color: Colors.gray600,
    fontWeight: '600',
  },
  errorToast: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 35,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(253,251,247,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.18)',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.gray600,
  },
  guideDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 28,
    paddingTop: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(253,251,247,0.96)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.18)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  dockHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(42,37,32,0.16)',
    marginBottom: 10,
  },
  dockContent: {},
  dockHero: {
    minHeight: 212,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  guideScript: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
    paddingBottom: 2,
  },
  guideIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  guideTalkBox: {
    minHeight: 76,
    marginTop: 10,
    padding: 9,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.07)',
  },
  guideStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  guideStatusText: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 10,
    color: Colors.gray700,
    fontWeight: '800',
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.14)',
  },
  avatarModule: {
    width: 122,
    height: 212,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  avatarSpeech: {
    width: 138,
    minHeight: 54,
    marginLeft: -16,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(42,37,32,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  avatarSpeechLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '900',
    letterSpacing: 1,
  },
  avatarSpeechText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    color: '#fff',
    fontWeight: '700',
  },
  avatarStage: {
    width: 116,
    height: 150,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderWidth: 1.5,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  avatarNameTag: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.88)',
  },
  avatarNameText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  dockIntro: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotThumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  dockTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  dockEyebrow: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dockTitle: {
    marginTop: 2,
    fontSize: 19,
    color: Colors.ink,
    fontWeight: '900',
  },
  dockCopy: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray600,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(106,156,137,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.12)',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 9,
    color: Colors.gray500,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 5,
    marginTop: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(106,156,137,0.16)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  miniActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  textBtn: {
    flex: 1,
    minHeight: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,37,32,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
  },
  textBtnText: {
    fontSize: 11,
    color: Colors.gray700,
    fontWeight: '800',
  },
  routeRail: {
    marginTop: 10,
  },
  routeRailTitle: {
    marginBottom: 7,
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: '800',
    letterSpacing: 1,
  },
  routeRailContent: {
    gap: 8,
    paddingRight: 14,
  },
  routeNode: {
    width: 72,
    paddingHorizontal: 7,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    alignItems: 'center',
  },
  routeNodeActive: {
    backgroundColor: Colors.accentBg,
    borderColor: 'rgba(200,75,49,0.28)',
  },
  routeNodeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeNodeIndex: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '900',
  },
  routeNodeName: {
    marginTop: 4,
    maxWidth: 58,
    fontSize: 10,
    color: Colors.gray600,
    fontWeight: '700',
  },
  routeNodeNameActive: {
    color: Colors.accent,
    fontWeight: '900',
  },
});
