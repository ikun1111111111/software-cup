import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { VRMManager, type Emotion } from '@/components/vrm/VRMManager';
import { VRMView } from '@/components/vrm/VRMView';
// @ts-ignore - AmapView is platform-specific
import AmapView from '@/components/map/AmapView';
import type { AmapViewRef, MapPoint } from '@/components/map/AmapView.shared';
import { LINGSHAN_CENTER } from '@/components/map/AmapView.shared';
import { useMapSpots } from '@/hooks/useMapSpots';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES, CAT_COLORS } from '@/constants/scenic';
import { LINGSHAN_ROUTES } from '@/data/lingshanRoutes';
import { useTour } from '@/context/TourContext';
import { useTourGeolocation } from '@/hooks/useTourGeolocation';
import { XIAOLING_MAP_COPY } from '@/utils/digitalHumanProduct';
import { buildMapNarrationFeedback, buildMapSpotNarration } from '@/utils/mapNarration';
import {
  createMapActionState,
  getRouteActionButton,
  getRouteBlockedMessage,
  isActionCoolingDown,
  type MapActionState,
  type MapActionStatus,
  type MapGuideAction,
} from '@/utils/mapGuideActions';
import {
  clampMapDockOffset,
  getMapDockOffsets,
  getNearestMapDockLevel,
  getNextMapDockLevel,
  type MapDockLevel,
} from '@/utils/mapDock';
import { runAfterNextPaint, type CancelScheduledTask } from '@/utils/scheduling';
import type { Spot } from '@/api/spots';

const IS_WEB = Platform.OS === 'web';
const CLASSIC_ROUTE = LINGSHAN_ROUTES[0];
const WALK_METERS_PER_MINUTE = 80;
const COORDINATE_STATUS = '地图校准';

type MapStatus = 'loading' | 'ready' | 'error';
type PendingMapCommand = {
  type: 'route';
  origin: MapPoint;
  destination: MapPoint;
  spotId: string;
};

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

function toTourSpot(spot: Spot) {
  return {
    id: spot.id,
    name: spot.name,
    description: buildMapSpotNarration(spot),
    latitude: spot.latitude ?? undefined,
    longitude: spot.longitude ?? undefined,
  };
}

function MapGuideAvatar({
  activeColor,
  fallbackLine,
}: {
  activeColor: string;
  fallbackLine: string;
}) {
  const driver = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE);
  const guideText = driver.subtitle || fallbackLine;

  return (
    <View style={styles.avatarModule} pointerEvents="none">
      <View style={styles.avatarSpeech}>
        <Text style={styles.avatarSpeechText} numberOfLines={1}>
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
  const isFocused = useIsFocused();
  const { height: viewportHeight } = useWindowDimensions();
  const mapRef = useRef<AmapViewRef>(null);
  const spokenMapPromptRef = useRef<string | null>(null);
  const pendingMapCommandRef = useRef<PendingMapCommand | null>(null);
  const scheduledMapTasksRef = useRef<CancelScheduledTask[]>([]);
  const dockTranslateY = useRef(new RNAnimated.Value(0)).current;
  const dockOffsetRef = useRef(0);
  const didSetInitialDockLevelRef = useRef(false);
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [mapAction, setMapAction] = useState<MapActionState | null>(null);
  const [dockLevel, setDockLevel] = useState<MapDockLevel>('collapsed');

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
  const currentNarrationText = tourState.narration?.spot.id === activeGuideSpot?.id
    ? tourState.narration.text.trim() || null
    : null;
  const guideLine = currentNarrationText
    ?? (selectedSpot
      ? buildMapSpotNarration(selectedSpot)
      : activeGuideSpot
        ? buildMapSpotNarration(activeGuideSpot, routeCopy)
        : routeCopy);
  const avatarFallbackLine = activeGuideSpot
    ? navigating
      ? `我正在带你前往${activeGuideSpot.name}，跟着路线走就好。`
      : `下一站看${activeGuideSpot.name}，我先把重点讲给你听。`
    : XIAOLING_MAP_COPY.beaconFallback;
  const statusLabel = navigating
    ? '导航中'
    : tourState.status === 'narrating'
      ? '正在讲解'
      : tourState.status === 'attraction'
        ? '现场讲解'
        : selectedSpot
          ? '景点讲解'
          : tourState.currentRoute
            ? '路线导览'
            : '自由探索';
  const routeButtonState = useMemo(() => getRouteActionButton({
    hasActiveSpot: !!activeGuideSpot,
    hasCoordinates: !!activeGuideSpot && activeGuideSpot.latitude != null && activeGuideSpot.longitude != null,
    isNavigating: navigating,
    isMapReady: mapStatus === 'ready',
  }), [activeGuideSpot, mapStatus, navigating]);
  const primaryListenLabel = mapAction?.action === 'narrating' && mapAction.status === 'success'
    ? '重播讲解'
    : XIAOLING_MAP_COPY.primaryCta;
  const demoArriveLabel = mapAction?.action === 'arrived' && mapAction.status === 'success'
    ? '已到达'
    : XIAOLING_MAP_COPY.demoArriveCta;
  const demoPanelMessage = mapAction?.message ?? actionFeedback
    ?? (tourState.error ? '在线导览暂未连接，已使用本地讲解继续。' : XIAOLING_MAP_COPY.demoText);
  const dockOffsets = useMemo(() => getMapDockOffsets(viewportHeight), [viewportHeight]);
  const navigationStripTop = insets.top + (mapStatus !== 'ready' ? 196 : 144);
  const locationErrorTop = insets.top + (navigating && activeGuideSpot ? 264 : 188);
  const navigationDistanceText = formatDistance(displayDistance);
  const navigationWalkText = estimateWalk(displayDistance);

  const snapDockToLevel = useCallback((level: MapDockLevel) => {
    const nextOffset = dockOffsets[level];
    dockOffsetRef.current = nextOffset;
    setDockLevel(level);
    RNAnimated.spring(dockTranslateY, {
      toValue: nextOffset,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [dockOffsets, dockTranslateY]);

  const handleDockHandlePress = useCallback(() => {
    snapDockToLevel(getNextMapDockLevel(dockLevel));
  }, [dockLevel, snapDockToLevel]);

  const dockPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
    ),
    onPanResponderGrant: () => {
      dockTranslateY.stopAnimation((value) => {
        dockOffsetRef.current = clampMapDockOffset(value, dockOffsets);
      });
    },
    onPanResponderMove: (_, gestureState) => {
      const nextOffset = clampMapDockOffset(dockOffsetRef.current + gestureState.dy, dockOffsets);
      dockTranslateY.setValue(nextOffset);
    },
    onPanResponderRelease: (_, gestureState) => {
      const releaseOffset = clampMapDockOffset(
        dockOffsetRef.current + gestureState.dy,
        dockOffsets,
      );
      snapDockToLevel(getNearestMapDockLevel(releaseOffset, gestureState.vy, dockOffsets));
    },
    onPanResponderTerminate: (_, gestureState) => {
      const releaseOffset = clampMapDockOffset(
        dockOffsetRef.current + gestureState.dy,
        dockOffsets,
      );
      snapDockToLevel(getNearestMapDockLevel(releaseOffset, gestureState.vy, dockOffsets));
    },
  }), [dockOffsets, dockTranslateY, snapDockToLevel]);

  const setMapActionResult = useCallback((
    action: MapGuideAction,
    status: MapActionStatus,
    message: string,
    spotId?: string,
  ) => {
    setMapAction(createMapActionState({ action, status, message, spotId }));
    setActionFeedback(message);
  }, []);

  const cancelScheduledMapTasks = useCallback(() => {
    scheduledMapTasksRef.current.forEach((cancel) => cancel());
    scheduledMapTasksRef.current = [];
  }, []);

  useEffect(() => cancelScheduledMapTasks, [cancelScheduledMapTasks]);

  const scheduleMapSideEffect = useCallback((task: () => void) => {
    let cancelTask: CancelScheduledTask = () => {};
    cancelTask = runAfterNextPaint(() => {
      scheduledMapTasksRef.current = scheduledMapTasksRef.current.filter((cancel) => cancel !== cancelTask);
      task();
    });
    scheduledMapTasksRef.current.push(cancelTask);
    return cancelTask;
  }, []);

  const speakMapFeedback = useCallback((text: string, emotion: Emotion = 'neutral') => {
    scheduleMapSideEffect(() => {
      VRMManager.stopSpeaking({ playQueued: false });
      VRMManager.speak(text, emotion);
    });
  }, [scheduleMapSideEffect]);

  const executeMapCommand = useCallback((command: PendingMapCommand) => {
    mapRef.current?.drawRoute([command.origin, command.destination]);
    mapRef.current?.setCenter(command.destination.latitude, command.destination.longitude, 16);
  }, []);

  const handleMapReady = useCallback(() => {
    setMapStatus('ready');
    setMapError(null);
    if (pendingMapCommandRef.current) {
      executeMapCommand(pendingMapCommandRef.current);
      pendingMapCommandRef.current = null;
    }
  }, [executeMapCommand]);

  const handleMapError = useCallback((message: string) => {
    setMapStatus('error');
    setMapError(message);
    setMapActionResult('idle', 'error', '真实地图暂时不可用，讲解和路线提示仍可继续使用。');
  }, [setMapActionResult]);

  useEffect(() => {
    if (!isFocused) return undefined;
    VRMManager.setPageContext('map');
    const promptKey = tourState.preferences.mode === 'tour' && tourTargetSpot
      ? `tour:${tourTargetSpot.id}`
      : 'free';

    if (spokenMapPromptRef.current === promptKey) return;
    spokenMapPromptRef.current = promptKey;
    const timer = setTimeout(() => {
      if (tourState.preferences.mode === 'tour' && tourTargetSpot) {
        VRMManager.replaceSpeech(
          `我们现在前往${tourTargetSpot.name}，我会一路提示路线和讲解重点。`,
          'neutral',
        );
      } else {
        VRMManager.replaceSpeech('我是小灵。你可以点地图上的景点，我来讲给你听。', 'neutral');
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [isFocused, tourState.preferences.mode, tourTargetSpot?.id]);

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

  useEffect(() => {
    if (!didSetInitialDockLevelRef.current) {
      const initialOffset = dockOffsets.collapsed;
      didSetInitialDockLevelRef.current = true;
      dockOffsetRef.current = initialOffset;
      dockTranslateY.setValue(initialOffset);
      setDockLevel('collapsed');
      return;
    }
    const nextLevel = getNearestMapDockLevel(dockOffsetRef.current, 0, dockOffsets);
    const nextOffset = dockOffsets[nextLevel];
    dockOffsetRef.current = nextOffset;
    dockTranslateY.setValue(nextOffset);
    setDockLevel(nextLevel);
  }, [dockOffsets, dockTranslateY]);

  const centerSpotOnMap = useCallback((spot: Spot, zoom = 16) => {
    if (spot.latitude == null || spot.longitude == null) return;
    mapRef.current?.setCenter(spot.latitude, spot.longitude, zoom);
  }, []);

  const handleSpotSelect = useCallback((spot: Spot) => {
    handleSpotTap(spot);
    centerSpotOnMap(spot);
    setMapActionResult('idle', 'success', `已切到${spot.name}，可以开始讲解或让小灵指路。`, spot.id);
    const deviation = tourState.soloTour.enabled
      ? tourActions.handleSoloDeviation(spot.id, 'explain_current_spot')
      : null;
    if (deviation) {
      speakMapFeedback(`${deviation.message}${spot.name}我也可以先讲给你听。`, 'neutral');
      return;
    }
    speakMapFeedback(`这里是${spot.name}。${buildMapSpotNarration(spot)}`, 'thinking');
  }, [centerSpotOnMap, handleSpotTap, setMapActionResult, speakMapFeedback, tourActions, tourState.soloTour.enabled]);

  const handleLocate = useCallback(() => {
    if (userLocation) {
      mapRef.current?.setCenter(userLocation.latitude, userLocation.longitude, 17, 'wgs84');
      setActionFeedback('已校准到你的当前位置。');
      speakMapFeedback('我已经把地图移到你当前位置。', 'neutral');
      return;
    }
    mapRef.current?.setCenter(LINGSHAN_CENTER.latitude, LINGSHAN_CENTER.longitude, 15);
    setActionFeedback('定位暂不可用，已校准到景区入口作为起点。');
    speakMapFeedback('暂时没有拿到定位，我先把地图放回灵山核心区。', 'neutral');
  }, [speakMapFeedback, userLocation]);

  const handleNavigateWithMap = useCallback(() => {
    if (isActionCoolingDown(mapAction, 'routing')) return;
    if (navigating) {
      pendingMapCommandRef.current = null;
      handleCloseRoute();
      setMapActionResult('routing', 'success', '已结束当前指路，可以重新选择景点或路线。', activeGuideSpot?.id);
      speakMapFeedback('已结束指路，你可以继续自由探索。', 'neutral');
      return;
    }
    if (!activeGuideSpot) {
      setMapActionResult('routing', 'blocked', getRouteBlockedMessage(null));
      return;
    }
    if (activeGuideSpot.latitude == null || activeGuideSpot.longitude == null) {
      setMapActionResult('routing', 'blocked', getRouteBlockedMessage(activeGuideSpot.name), activeGuideSpot.id);
      return;
    }

    setSelectedSpot(activeGuideSpot);
    const origin = userLocation
      ? { ...userLocation, source: 'wgs84' as const }
      : LINGSHAN_CENTER;
    const destination = {
      latitude: activeGuideSpot.latitude,
      longitude: activeGuideSpot.longitude,
    };
    const command: PendingMapCommand = {
      type: 'route',
      origin,
      destination,
      spotId: activeGuideSpot.id,
    };
    setNavigating(true);
    if (mapStatus === 'ready') {
      pendingMapCommandRef.current = null;
      executeMapCommand(command);
    } else {
      pendingMapCommandRef.current = command;
    }
    setMapActionResult(
      'routing',
      mapStatus === 'ready' ? 'success' : 'pending',
      mapStatus === 'ready'
        ? `已规划前往${activeGuideSpot.name}，可按路线前进。`
        : `路线已准备，地图加载后会自动显示前往${activeGuideSpot.name}的路线。`,
      activeGuideSpot.id,
    );
    speakMapFeedback(
      userLocation
        ? `好的，我们前往${activeGuideSpot.name}。`
        : `我先用景区入口作为起点，带你前往${activeGuideSpot.name}。`,
      'neutral',
    );
  }, [
    activeGuideSpot,
    executeMapCommand,
    handleCloseRoute,
    mapAction,
    mapStatus,
    navigating,
    setMapActionResult,
    setNavigating,
    setSelectedSpot,
    speakMapFeedback,
    userLocation,
  ]);

  const handleStartNarration = useCallback(() => {
    if (isActionCoolingDown(mapAction, 'narrating')) return;
    if (!activeGuideSpot) {
      setMapActionResult('narrating', 'blocked', '先点一个景点，小灵再讲给你听。');
      return;
    }
    const narrationText = buildMapSpotNarration(activeGuideSpot, routeCopy);
    const feedback = buildMapNarrationFeedback(activeGuideSpot.name, narrationText);
    setSelectedSpot(activeGuideSpot);
    setMapActionResult('narrating', 'success', feedback, activeGuideSpot.id);
    tourActions.startNarration(toTourSpot(activeGuideSpot));
    speakMapFeedback(`${activeGuideSpot.name}。${narrationText}`, 'happy');
  }, [activeGuideSpot, mapAction, routeCopy, setMapActionResult, setSelectedSpot, speakMapFeedback, tourActions]);

  const handleDemoArrive = useCallback(() => {
    if (isActionCoolingDown(mapAction, 'arrived')) return;
    if (!activeGuideSpot) {
      setMapActionResult('arrived', 'blocked', '先点一个景点，小灵再帮你标记到达。');
      return;
    }
    const arrivedSpot = toTourSpot(activeGuideSpot);
    pendingMapCommandRef.current = null;
    setSelectedSpot(activeGuideSpot);
    setNavigating(false);
    tourActions.arriveAtStop(arrivedSpot);
    centerSpotOnMap(activeGuideSpot, 17);
    setMapActionResult(
      'arrived',
      'success',
      `已到达${activeGuideSpot.name}，可以先听小灵讲解，再继续下一站。`,
      activeGuideSpot.id,
    );
    speakMapFeedback(`已到达${activeGuideSpot.name}。我会从这里开始现场讲解。`, 'happy');
  }, [activeGuideSpot, centerSpotOnMap, mapAction, setMapActionResult, setNavigating, setSelectedSpot, speakMapFeedback, tourActions]);

  const handleArrive = useCallback(() => {
    if (!activeGuideSpot) {
      setMapActionResult('opening_detail', 'blocked', '先选一个景点，再查看景点详情。');
      return;
    }
    setMapActionResult('opening_detail', 'pending', `正在打开${activeGuideSpot.name}详情...`, activeGuideSpot.id);
    scheduleMapSideEffect(() => {
      router.push({
        pathname: '/attractions/[id]',
        params: { id: activeGuideSpot.id, returnTo: '/map', returnLabel: '返回地图' },
      });
    });
  }, [activeGuideSpot, router, scheduleMapSideEffect, setMapActionResult]);

  const handleCancelNavigation = useCallback(() => {
    pendingMapCommandRef.current = null;
    handleCloseRoute();
    setMapActionResult('routing', 'success', '已结束当前路线，可以重新选择景点或路线。', activeGuideSpot?.id);
    speakMapFeedback('已取消导航，你可以继续自由探索。', 'neutral');
  }, [activeGuideSpot?.id, handleCloseRoute, setMapActionResult, speakMapFeedback]);

  const handleAskXiaoling = useCallback(() => {
    setMapActionResult(
      'asking',
      'pending',
      activeGuideSpot
        ? `正在带着${activeGuideSpot.name}的问题上下文打开小灵。`
        : '正在打开小灵，你也可以先点一个景点再提问。',
      activeGuideSpot?.id,
    );
    scheduleMapSideEffect(() => {
      router.push({
        pathname: '/chat',
        params: { returnTo: '/map', returnLabel: '返回地图', fresh: '1', spotId: activeGuideSpot?.id },
      });
    });
  }, [activeGuideSpot, router, scheduleMapSideEffect, setMapActionResult]);

  const handleRouteEntry = useCallback(() => {
    if (tourState.currentRoute) {
      setMapActionResult('selecting_route', 'success', `继续${routeTitle}，小灵会接着带路。`);
      tourActions.resumeTour();
      return;
    }
    setMapActionResult('selecting_route', 'pending', '正在打开路线选择，小灵会按时间和兴趣推荐。');
    scheduleMapSideEffect(() => {
      router.push({
        pathname: '/routes',
        params: { returnTo: '/map', returnLabel: '返回地图' },
      });
    });
  }, [routeTitle, router, scheduleMapSideEffect, setMapActionResult, tourActions, tourState.currentRoute]);

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
        showLocationControls={false}
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
          <Text style={styles.headerKicker}>{XIAOLING_MAP_COPY.headerKicker}</Text>
          <Text style={styles.headerTitle}>{XIAOLING_MAP_COPY.headerTitle}</Text>
        </View>
        <Pressable onPress={handleLocate} style={styles.iconBtn} accessibilityLabel="定位">
          <Text style={styles.locateTxt}>⌖</Text>
        </Pressable>
      </View>

      <Reanimated.View
        entering={FadeInUp.duration(420)}
        style={[styles.guideBeacon, { top: insets.top + 78 }]}
      >
        <View style={[styles.beaconDot, { backgroundColor: activeColor }]} />
        <View style={styles.beaconCopy}>
          <View style={styles.beaconTitleRow}>
            <Text style={styles.beaconTitle} numberOfLines={1}>{statusLabel}</Text>
          </View>
          <Text style={styles.beaconText} numberOfLines={1}>
            {activeGuideSpot ? `下一段看 ${activeGuideSpot.name}` : XIAOLING_MAP_COPY.beaconFallback}
          </Text>
        </View>
      </Reanimated.View>

      {mapStatus !== 'ready' && (
        <View style={[styles.mapNotice, { top: insets.top + 144 }]}>
          {mapStatus === 'loading' && <ActivityIndicator size="small" color={Colors.primary} />}
          <Text style={styles.mapNoticeText}>
            {mapStatus === 'loading' ? '正在加载真实地图' : mapError || '已切换离线导览底图'}
          </Text>
        </View>
      )}

      {navigating && activeGuideSpot && (
        <Reanimated.View
          entering={FadeInUp.delay(90).duration(360)}
          style={[
            styles.navigationStrip,
            { top: navigationStripTop, borderColor: activeColor },
          ]}
        >
          <View style={styles.navigationTopRow}>
            <View style={styles.navigationTargetBlock}>
              <Text style={styles.navigationKicker}>导航中 · 前往</Text>
              <Text style={styles.navigationTargetName} numberOfLines={1}>
                {activeGuideSpot.name}
              </Text>
            </View>
            <View style={styles.navigationPulse}>
              <View style={[styles.navigationPulseDot, { backgroundColor: activeColor }]} />
              <Text style={styles.navigationPulseText}>路线已绘制</Text>
            </View>
          </View>

          <View style={styles.navigationBottomRow}>
            <View style={styles.navigationMetaGroup}>
              <View style={styles.navigationMetaPill}>
                <Text style={styles.navigationMetaLabel}>距离</Text>
                <Text style={styles.navigationMetaValue}>{navigationDistanceText}</Text>
              </View>
              <View style={styles.navigationMetaPill}>
                <Text style={styles.navigationMetaLabel}>步行</Text>
                <Text style={styles.navigationMetaValue}>{navigationWalkText}</Text>
              </View>
            </View>
            <View style={styles.navigationActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.navigationActionBtn,
                  styles.navigationArriveBtn,
                  pressed && styles.navigationPressed,
                ]}
                onPress={handleDemoArrive}
                accessibilityRole="button"
                accessibilityLabel={`到达${activeGuideSpot.name}`}
              >
                <Text style={styles.navigationArriveText}>到达</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.navigationActionBtn,
                  styles.navigationStopBtn,
                  pressed && styles.navigationPressed,
                ]}
                onPress={handleCancelNavigation}
                accessibilityRole="button"
                accessibilityLabel="结束导航"
              >
                <Text style={styles.navigationStopText}>结束导航</Text>
              </Pressable>
            </View>
          </View>
        </Reanimated.View>
      )}

      {locationError && (
        <View style={[styles.errorToast, { top: locationErrorTop }]}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      <RNAnimated.View
        style={[
          styles.guideDock,
          {
            maxHeight: Math.max(360, viewportHeight - insets.top - 92),
            paddingBottom: insets.bottom + 10,
          },
          { transform: [{ translateY: dockTranslateY }] },
        ]}
      >
        <Pressable
          {...dockPanResponder.panHandlers}
          onPress={handleDockHandlePress}
          style={styles.dockHandleTouch}
          accessibilityRole="button"
          accessibilityLabel="展开或收起地图设置面板"
        >
          <View style={styles.dockHandle} />
        </Pressable>
        <ScrollView
          style={styles.dockScroll}
          contentContainerStyle={styles.dockScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.dockContent}>
            <View style={styles.dockHero}>
              <View style={styles.guideScript}>
                <View style={styles.guideIdentityRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.dockEyebrow}>{XIAOLING_MAP_COPY.dockEyebrow}</Text>
                </View>
                <Text style={styles.dockTitle} numberOfLines={1}>
                  {activeGuideSpot?.name || '灵山胜境'}
                </Text>
                <View style={styles.guideTalkBox}>
                  {activeImage && (
                    <Image source={activeImage} style={styles.spotThumb} resizeMode="cover" />
                  )}
                <Text style={styles.dockCopy} numberOfLines={2}>
                  {guideLine || routeCopy}
                </Text>
              </View>
              </View>

              <MapGuideAvatar
                activeColor={activeColor}
                fallbackLine={avatarFallbackLine}
              />
            </View>

            <View style={styles.metricRow}>
              <Pressable
                style={styles.metricItem}
                onPress={handleLocate}
                accessibilityRole="button"
                accessibilityLabel="地图校准"
              >
                <Text style={styles.metricValue}>{COORDINATE_STATUS}</Text>
                <Text style={styles.metricLabel}>点位</Text>
              </Pressable>
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

            <View style={styles.demoPanel}>
              <View style={styles.demoHeaderRow}>
                <View style={styles.demoCopy}>
                  <Text style={styles.demoLabel}>{XIAOLING_MAP_COPY.demoLabel}</Text>
                  <Text
                    style={[styles.demoText, actionFeedback && styles.demoFeedbackText]}
                    numberOfLines={2}
                  >
                    {demoPanelMessage}
                  </Text>
                </View>
                <Pressable
                  style={[styles.demoArrivalPill, !activeGuideSpot && styles.actionBtnDisabled]}
                  onPress={handleDemoArrive}
                  accessibilityRole="button"
                  accessibilityLabel="标记抵达当前景点"
                  accessibilityState={{ disabled: !activeGuideSpot }}
                  disabled={!activeGuideSpot}
                >
                  <Text style={styles.demoArrivalText}>{demoArriveLabel}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.primaryBtn, !activeGuideSpot && styles.actionBtnDisabled]}
                onPress={handleStartNarration}
                accessibilityRole="button"
                accessibilityLabel={primaryListenLabel}
                accessibilityState={{ disabled: !activeGuideSpot }}
                disabled={!activeGuideSpot}
              >
                <Text style={styles.primaryBtnText}>{primaryListenLabel}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryBtn,
                  routeButtonState.pending && styles.secondaryBtnPending,
                  routeButtonState.disabled && styles.actionBtnDisabled,
                ]}
                onPress={handleNavigateWithMap}
                accessibilityRole="button"
                accessibilityLabel={routeButtonState.label}
                accessibilityState={{ disabled: routeButtonState.disabled }}
                disabled={routeButtonState.disabled}
              >
                <Text style={styles.secondaryBtnText}>
                  {routeButtonState.label}
                </Text>
              </Pressable>
            </View>

            <View style={styles.miniActionRow}>
              <Pressable
                style={styles.textBtn}
                onPress={handleAskXiaoling}
                accessibilityRole="button"
              >
                <Text style={styles.textBtnText}>{XIAOLING_MAP_COPY.askCta}</Text>
              </Pressable>
              <Pressable
                style={[styles.textBtn, !activeGuideSpot && styles.actionBtnDisabled]}
                onPress={handleArrive}
                accessibilityRole="button"
                accessibilityState={{ disabled: !activeGuideSpot }}
                disabled={!activeGuideSpot}
              >
                <Text style={styles.textBtnText}>{XIAOLING_MAP_COPY.detailCta}</Text>
              </Pressable>
              {navigating ? (
                <Pressable style={styles.textBtn} onPress={handleCancelNavigation}>
                  <Text style={styles.textBtnText}>结束导航</Text>
                </Pressable>
              ) : tourState.currentRoute ? (
                <Pressable style={styles.textBtn} onPress={handleRouteEntry}>
                  <Text style={styles.textBtnText}>{XIAOLING_MAP_COPY.continueRouteCta}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.textBtn}
                  onPress={handleRouteEntry}
                  accessibilityRole="button"
                >
                  <Text style={styles.textBtnText}>{XIAOLING_MAP_COPY.selectRouteCta}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {routePreviewSpots.length > 0 && (
            <View style={styles.routeRail}>
              <Text style={styles.routeRailTitle}>{XIAOLING_MAP_COPY.routeRailTitle}</Text>
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
        </ScrollView>
      </RNAnimated.View>
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
    left: 64,
    right: 64,
    zIndex: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: 'rgba(42,37,32,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  beaconDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
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
    justifyContent: 'center',
  },
  beaconTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 11,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
  },
  beaconText: {
    marginTop: 2,
    fontSize: 10,
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
  navigationStrip: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 34,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(253,251,247,0.96)',
    borderWidth: 1.5,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  navigationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  navigationTargetBlock: {
    flex: 1,
    minWidth: 0,
  },
  navigationKicker: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: '900',
    letterSpacing: 1,
  },
  navigationTargetName: {
    marginTop: 2,
    fontSize: 18,
    color: Colors.ink,
    fontWeight: '900',
  },
  navigationPulse: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.16)',
  },
  navigationPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  navigationPulseText: {
    fontSize: 10,
    color: Colors.gray700,
    fontWeight: '800',
  },
  navigationBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },
  navigationMetaGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  navigationMetaPill: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(42,37,32,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
  },
  navigationMetaLabel: {
    fontSize: 9,
    color: Colors.gray500,
    fontWeight: '800',
    letterSpacing: 1,
  },
  navigationMetaValue: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.ink,
    fontWeight: '900',
  },
  navigationActions: {
    width: 132,
    flexDirection: 'row',
    gap: 7,
  },
  navigationActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationArriveBtn: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  navigationStopBtn: {
    backgroundColor: Colors.ink,
  },
  navigationPressed: {
    opacity: 0.78,
  },
  navigationArriveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  navigationStopText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
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
    paddingTop: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(253,251,247,0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.18)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  dockHandleTouch: {
    alignSelf: 'center',
    width: 76,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  dockHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(42,37,32,0.16)',
  },
  dockScroll: {
    flexGrow: 0,
  },
  dockScrollContent: {
    paddingBottom: 4,
  },
  dockContent: {},
  dockHero: {
    minHeight: 118,
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
    minHeight: 54,
    marginTop: 7,
    padding: 7,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.07)',
  },
  avatarModule: {
    width: 86,
    height: 126,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  avatarSpeech: {
    width: 104,
    minHeight: 28,
    marginLeft: -8,
    marginBottom: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: 'rgba(42,37,32,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  avatarSpeechText: {
    fontSize: 9,
    lineHeight: 12,
    color: '#fff',
    fontWeight: '700',
  },
  avatarStage: {
    width: 82,
    height: 88,
    borderRadius: 15,
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
    bottom: 1,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.88)',
  },
  avatarNameText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  dockIntro: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotThumb: {
    width: 44,
    height: 44,
    borderRadius: 9,
    marginRight: 8,
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
    fontSize: 18,
    color: Colors.ink,
    fontWeight: '900',
  },
  dockCopy: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray600,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 0,
    marginTop: 7,
    minHeight: 42,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(106,156,137,0.075)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.13)',
  },
  metricItem: {
    flex: 1,
    paddingVertical: 5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 12,
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
    height: 4,
    marginTop: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(106,156,137,0.16)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  demoPanel: {
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(200,75,49,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.15)',
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  demoCopy: {
    flex: 1,
    minWidth: 0,
  },
  demoLabel: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '900',
    letterSpacing: 1,
  },
  demoText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.gray600,
  },
  demoFeedbackText: {
    color: Colors.primaryDark,
    fontWeight: '800',
    lineHeight: 16,
  },
  demoArrivalPill: {
    minWidth: 76,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoArrivalText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 7,
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
  secondaryBtnPending: {
    backgroundColor: Colors.primaryDark,
  },
  actionBtnDisabled: {
    opacity: 0.48,
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
    marginTop: 4,
  },
  textBtn: {
    flex: 1,
    minHeight: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  textBtnText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  routeRail: {
    marginTop: 9,
  },
  routeRailTitle: {
    marginBottom: 6,
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
    width: 68,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.66)',
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
