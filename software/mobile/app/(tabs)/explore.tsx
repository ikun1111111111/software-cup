import React, { useState, useRef, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import InlineModal from '@/components/ui/InlineModal';
import { Image } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { VRMManager } from '@/components/vrm/VRMManager';
import { VRMView } from '@/components/vrm/VRMView';
import { useTour } from '@/context/TourContext';
import { listSpots, type Spot } from '@/api/spots';
import { listRoutes, type TourRoute } from '@/api/routes';
import { identifySpot, type VisionResult } from '@/api/vision';
import { createRoom, joinRoom, type Room, type RoomActiveRoute } from '@/api/room';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { preloadDigitalHuman } from '@/services/digitalHuman';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import { useRoomSync } from '@/hooks/useRoomSync';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES } from '@/constants/scenic';
import { enrichSpotsWithLocations } from '@/constants/spot-locations';
import { getCostume } from '@/constants/costumeMap';
import { GUIDE_DATA_SOURCE_SUMMARY, getSoloRouteRecommendation } from '@/data/lingshanGuideData';
import { getMockApiRoutes, getMockApiSpots } from '@/mocks/guide';

/** Ref handle for auto-opening camera/scan from outside */
export interface ExplorePhotoHandle { openCamera: () => void; }
export interface ExploreScanHandle { openScanner: () => void; }

const MAP_H = 300;
const ROUTE_CARD_W = 260;
const STORY_CARD_W = 252;

const HERO_SPOT_PRIORITY = ['ling-shan-da-fo', 'fan-gong', 'jiu-long-guan-yu'];

const EXPLORE_VISUALS = {
  hero: require('../../assets/images/explore/hero-courtyard.png'),
  heroEcho: require('../../assets/images/explore/hero-overview.png'),
  spotRecognition: require('../../assets/images/explore/spot-temple-cliff.png'),
  checkinSeal: require('../../assets/images/explore/seal-tang-simple.png'),
  lingshanSeal: require('../../assets/images/explore/seal-lingshan.png'),
  routeMap: require('../../assets/images/explore/route-map.png'),
  lantern: require('../../assets/images/explore/lantern.png'),
  templePlan: require('../../assets/images/explore/temple-plan.png'),
  templeGate: require('../../assets/images/explore/temple-gate.png'),
  scrollPaper: require('../../assets/images/explore/scroll-paper.png'),
};

const SPOT_STORY_COPY: Record<string, { highlight: string; duration: string; bestTime: string }> = {
  'ling-shan-da-fo': { highlight: '登高望湖，听一段大佛落成的愿力故事', duration: '45 分钟', bestTime: '夕照前' },
  'jiu-long-guan-yu': { highlight: '看九龙腾水，等一场音乐喷泉开合', duration: '25 分钟', bestTime: '表演前 10 分钟' },
  'fan-gong': { highlight: '走进金色穹顶，看佛教艺术与建筑交汇', duration: '50 分钟', bestTime: '上午' },
  'wu-yin-tan-cheng': { highlight: '从五方佛坛城读懂藏传佛教宇宙观', duration: '35 分钟', bestTime: '午后' },
  'xiang-fu-chan-si': { highlight: '在古寺钟声里放慢脚步', duration: '30 分钟', bestTime: '清晨' },
};

function getSpotStory(spot?: Spot | null) {
  if (!spot) {
    return { highlight: '从地图挑一处景点，小灵会先讲故事再带路', duration: '自由探索', bestTime: '现在' };
  }
  return SPOT_STORY_COPY[spot.id] ?? {
    highlight: spot.overview || '这一站适合慢慢看，边走边听讲解',
    duration: spot.category === '文化设施' ? '30 分钟' : '25 分钟',
    bestTime: spot.category === '核心景点' ? '上午' : '全天',
  };
}

// ─── 拍照识景 ───
const PhotoRecognition = forwardRef<ExplorePhotoHandle, { compact?: boolean }>(
function PhotoRecognition({ compact = false }, ref) {
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);

  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('需要相机权限', '请在设置中允许访问相机');
        return;
      }
    }
    setResult(null);
    setImageUri(null);
    setShowCamera(true);
  }, [permission, requestPermission]);

  useImperativeHandle(ref, () => ({ openCamera }), [openCamera]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      setShowCamera(false);
      setImageUri(photo.uri);
      setLoading(true);
      setResult(null);

      const visionResult = await identifySpot(photo.uri);
      setResult(visionResult);
      VRMManager.speak(
        `识别为${visionResult.spot_name}，置信度${Math.round(visionResult.confidence * 100)}%。${visionResult.description}`,
        'neutral',
      );
    } catch (err: any) {
      setShowCamera(false);
      Alert.alert('识别失败', err.message || '请重试');
      VRMManager.speak('抱歉，识别遇到了问题，请再试一次', 'sad');
    } finally {
      setLoading(false);
    }
  }, []);

  // Camera full-screen
  if (showCamera) {
    return (
      <InlineModal visible animationType="slide" transparent={false}>
        <View style={photoStyles.cameraScreen}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
            {/* Top bar */}
            <View style={photoStyles.cameraTopBar}>
              <Pressable style={photoStyles.cameraCloseBtn} onPress={() => setShowCamera(false)}>
                <Text style={photoStyles.cameraCloseTxt}>✕</Text>
              </Pressable>
              <Text style={photoStyles.cameraTitle}>拍照识景</Text>
              <View style={{ width: 40 }} />
            </View>
            {/* Viewfinder frame */}
            <View style={photoStyles.viewfinder} pointerEvents="none">
              <View style={photoStyles.viewfinderCornerTL} />
              <View style={photoStyles.viewfinderCornerTR} />
              <View style={photoStyles.viewfinderCornerBL} />
              <View style={photoStyles.viewfinderCornerBR} />
              <Text style={photoStyles.viewfinderHint}>将景点置于框内</Text>
            </View>
            {/* Bottom shutter */}
            <View style={photoStyles.cameraBottom}>
              <Pressable style={photoStyles.shutterBtn} onPress={takePicture}>
                <View style={photoStyles.shutterInner} />
              </Pressable>
            </View>
          </CameraView>
        </View>
      </InlineModal>
    );
  }

  if (compact) {
    if (!imageUri && !loading && !result) return null;
    return (
      <View style={photoStyles.compactResult}>
        <View style={photoStyles.compactResultHeader}>
          <Text style={photoStyles.compactResultKicker}>AI 识景结果</Text>
          {result && (
            <View style={photoStyles.confBadge}>
              <Text style={photoStyles.confText}>{Math.round(result.confidence * 100)}%</Text>
            </View>
          )}
        </View>
        {imageUri && (
          <View style={photoStyles.compactPreview}>
            <Image source={{ uri: imageUri }} style={photoStyles.previewImg} contentFit="cover" />
            {loading && (
              <View style={photoStyles.loadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={photoStyles.loadingTxt}>识别中...</Text>
              </View>
            )}
          </View>
        )}
        {result && (
          <>
            <Text style={photoStyles.compactResultName}>{result.spot_name}</Text>
            <Text style={photoStyles.compactResultDesc} numberOfLines={2}>{result.description}</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <>
      <View style={photoStyles.card}>
        <Pressable style={photoStyles.captureBtn} onPress={openCamera}>
          <Text style={photoStyles.captureIcon}>📷</Text>
          <Text style={photoStyles.captureText}>拍照识景</Text>
          <Text style={photoStyles.captureHint}>拍摄景点，AI 智能识别</Text>
        </Pressable>
        {imageUri && (
          <View style={photoStyles.preview}>
            <Image source={{ uri: imageUri }} style={photoStyles.previewImg} contentFit="cover" />
            {loading && (
              <View style={photoStyles.loadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={photoStyles.loadingTxt}>识别中...</Text>
              </View>
            )}
          </View>
        )}
        {result && (
          <View style={photoStyles.resultBox}>
            <View style={photoStyles.resultRow}>
              <Text style={photoStyles.resultName}>{result.spot_name}</Text>
              <View style={photoStyles.confBadge}>
                <Text style={photoStyles.confText}>{Math.round(result.confidence * 100)}%</Text>
              </View>
            </View>
            <Text style={photoStyles.resultDesc} numberOfLines={3}>{result.description}</Text>
          </View>
        )}
      </View>
    </>
  );
});

// ─── 扫码定位 ───
const QRScanSection = forwardRef<ExploreScanHandle, { spots: Spot[]; compact?: boolean }>(
function QRScanSection({ spots, compact = false }, ref) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [matchedSpot, setMatchedSpot] = useState<Spot | null>(null);
  const scanLock = useRef(false);

  const openScanner = useCallback(async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('需要相机权限', '请在设置中允许访问相机以扫描二维码');
        return;
      }
    }
    scanLock.current = false;
    setScannedData(null);
    setMatchedSpot(null);
    setShowScanner(true);
  }, [permission, requestPermission]);

  useImperativeHandle(ref, () => ({ openScanner }), [openScanner]);

  const handleScan = useCallback(({ data }: { data: string }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScannedData(data);
    const spot = spots.find((s) => data.includes(s.id) || data.includes(s.name));
    setMatchedSpot(spot || null);
    if (spot) {
      VRMManager.speak(`打卡成功: ${spot.name}`, 'happy');
    } else {
      VRMManager.speak('扫描成功，但未匹配到景点', 'neutral');
    }
    setTimeout(() => setShowScanner(false), 2000);
  }, [spots]);

  // Checked-in spots
  const checkedSpots = useMemo(() => {
    return spots.filter((s) => scannedData && (scannedData.includes(s.id) || scannedData.includes(s.name)));
  }, [spots, scannedData]);

  // Full-screen scanner
  if (showScanner) {
    return (
      <InlineModal visible animationType="slide" transparent={false}>
        <View style={scanStyles.scannerScreen}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={scanLock.current ? undefined : handleScan}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          >
            <View style={scanStyles.scannerTopBar}>
              <Pressable style={scanStyles.scannerCloseBtn} onPress={() => setShowScanner(false)}>
                <Text style={scanStyles.scannerCloseTxt}>✕</Text>
              </Pressable>
              <Text style={scanStyles.scannerTitle}>扫描二维码打卡</Text>
              <View style={{ width: 40 }} />
            </View>
            {/* Scan frame */}
            <View style={scanStyles.scanFrame}>
              <View style={scanStyles.scanCornerTL} />
              <View style={scanStyles.scanCornerTR} />
              <View style={scanStyles.scanCornerBL} />
              <View style={scanStyles.scanCornerBR} />
              <View style={scanStyles.scanLine} />
              <Text style={scanStyles.scanFrameHint}>将二维码置于框内</Text>
            </View>

            {/* Result overlay */}
            {scannedData && (
              <View style={scanStyles.scanResultOverlay}>
                <View style={scanStyles.scanResultCard}>
                  <Text style={scanStyles.scanResultIcon}>{matchedSpot ? '✅' : 'ℹ️'}</Text>
                  <Text style={scanStyles.scanResultTitle}>
                    {matchedSpot ? `打卡成功: ${matchedSpot.name}` : '扫描成功'}
                  </Text>
                  <Text style={scanStyles.scanResultData} numberOfLines={2}>{scannedData}</Text>
                </View>
              </View>
            )}
          </CameraView>
        </View>
      </InlineModal>
    );
  }

  if (compact) {
    if (!scannedData) return null;
    return (
      <View style={scanStyles.compactResult}>
        <Text style={scanStyles.compactResultKicker}>扫码打卡</Text>
        <Text style={scanStyles.compactResultTitle}>
          {matchedSpot ? `${matchedSpot.name} 打卡成功` : '二维码已识别'}
        </Text>
        <Text style={scanStyles.compactResultData} numberOfLines={2}>{scannedData}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={scanStyles.card}>
        <Pressable style={scanStyles.scanBtn} onPress={openScanner}>
          <Text style={scanStyles.scanIcon}>📱</Text>
          <Text style={scanStyles.scanText}>扫码定位</Text>
          <Text style={scanStyles.scanHint}>扫描景点二维码打卡</Text>
        </Pressable>
        {checkedSpots.length > 0 && (
          <View style={scanStyles.checkedList}>
            <Text style={scanStyles.checkedTitle}>已打卡 {checkedSpots.length} 个景点</Text>
            {checkedSpots.slice(0, 3).map((s) => (
              <View key={s.id} style={scanStyles.checkedItem}>
                <Text style={scanStyles.checkedDot}>●</Text>
                <Text style={scanStyles.checkedName}>{s.name}</Text>
              </View>
            ))}
            {checkedSpots.length > 3 && (
              <Text style={scanStyles.checkedMore}>还有 {checkedSpots.length - 3} 个...</Text>
            )}
          </View>
        )}
      </View>
    </>
  );
});

// ─── 协同导览 ───
function activeRouteToTourRoute(activeRoute: RoomActiveRoute) {
  return {
    id: activeRoute.route_id,
    name: activeRoute.name,
    description: '协同导览共享路线',
    spots: enrichSpotsWithLocations(activeRoute.spot_names.map((spot) => ({ id: spot.id, name: spot.name }))),
    duration: activeRoute.duration || undefined,
    route_type: activeRoute.route_type || undefined,
  };
}

function CollabTourSection({ routes }: { routes: TourRoute[] }) {
  const [, tourActions] = useTour();
  const [room, setRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingRouteId, setSyncingRouteId] = useState<string | null>(null);
  const roomSync = useRoomSync(room?.room_id ?? null, memberName || null);
  const activeRoute = roomSync.activeRoute || room?.active_route || null;
  const members = roomSync.members.length > 0 ? roomSync.members : room?.members || [];

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { Alert.alert('请输入昵称'); return; }
    setLoading(true);
    try {
      const r = await createRoom(name.trim());
      setRoom(r);
      roomSync.setRoom(r);
      setMemberName(name.trim());
      setShowModal(false);
      setName('');
      VRMManager.speak(`创建房间成功，房间号 ${r.room_id}，分享给朋友一起游览吧！`, 'happy');
    } catch (err: any) {
      Alert.alert('创建失败', err.message);
    } finally {
      setLoading(false);
    }
  }, [name]);

  const handleJoin = useCallback(async () => {
    if (!name.trim() || !roomIdInput.trim()) { Alert.alert('请填写完整信息'); return; }
    setLoading(true);
    try {
      const r = await joinRoom(roomIdInput.trim(), name.trim());
      setRoom(r);
      roomSync.setRoom(r);
      setMemberName(name.trim());
      setShowModal(false);
      setName('');
      setRoomIdInput('');
      VRMManager.speak('成功加入房间，开始协同游览！', 'neutral');
    } catch (err: any) {
      Alert.alert('加入失败', err.message);
    } finally {
      setLoading(false);
    }
  }, [name, roomIdInput]);

  const handleLeave = useCallback(() => {
    setRoom(null);
    roomSync.setRoom(null);
    setMemberName('');
    VRMManager.speak('已退出协同导览', 'neutral');
  }, [roomSync]);

  const handleShareRoute = useCallback(async (route: TourRoute) => {
    if (!room) return;
    setSyncingRouteId(route.id);
    try {
      const updated = await roomSync.syncRoute(route.id);
      setRoom(updated);
      const sharedRoute = updated.active_route;
      if (sharedRoute) {
        tourActions.startTour(activeRouteToTourRoute(sharedRoute));
        VRMManager.speak(`已同步${sharedRoute.name}，所有成员会看到同一条路线`, 'happy');
      }
    } catch (err: any) {
      Alert.alert('路线同步失败', err?.message || '请稍后重试');
    } finally {
      setSyncingRouteId(null);
    }
  }, [room, roomSync, tourActions]);

  const handleFollowSharedRoute = useCallback(() => {
    if (!activeRoute) return;
    tourActions.startTour(activeRouteToTourRoute(activeRoute));
    VRMManager.speak(`开始跟随${activeRoute.name}`, 'neutral');
  }, [activeRoute, tourActions]);

  return (
    <View style={collabStyles.card}>
      {room ? (
        <View style={collabStyles.roomInfo}>
          <View style={collabStyles.roomHeader}>
            <Text style={collabStyles.roomIcon}>👥</Text>
            <View style={collabStyles.roomMeta}>
              <Text style={collabStyles.roomTitle}>协同导览中</Text>
              <Text style={collabStyles.roomId}>房间号: {room.room_id}</Text>
            </View>
          </View>
          <Text style={collabStyles.memberCount}>
            {members.length || 1} 人在线 · {roomSync.connected ? '实时同步中' : '同步待连接'}
          </Text>
          {activeRoute ? (
            <View style={collabStyles.activeRouteBox}>
              <Text style={collabStyles.activeRouteLabel}>共享路线</Text>
              <Text style={collabStyles.activeRouteName}>{activeRoute.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={collabStyles.sharedStops}>
                {activeRoute.spot_names.map((spot, index) => (
                  <View key={spot.id} style={collabStyles.sharedStop}>
                    <Text style={collabStyles.sharedStopIndex}>{index + 1}</Text>
                    <Text style={collabStyles.sharedStopName}>{spot.name}</Text>
                  </View>
                ))}
              </ScrollView>
              <Pressable style={collabStyles.followBtn} onPress={handleFollowSharedRoute}>
                <Text style={collabStyles.followBtnTxt}>跟随此路线导览</Text>
              </Pressable>
            </View>
          ) : (
            <View style={collabStyles.routePicker}>
              <Text style={collabStyles.routePickerTitle}>选择一条共享游览路线</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={collabStyles.routePickerRow}>
                {routes.map((route) => (
                  <Pressable
                    key={route.id}
                    style={collabStyles.routeMiniCard}
                    onPress={() => handleShareRoute(route)}
                    disabled={!!syncingRouteId}
                  >
                    {syncingRouteId === route.id ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text style={collabStyles.routeMiniName} numberOfLines={1}>{route.name}</Text>
                        <Text style={collabStyles.routeMiniMeta}>{route.duration}</Text>
                      </>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {!!roomSync.error && <Text style={collabStyles.syncError}>{roomSync.error}</Text>}
          <Pressable style={collabStyles.leaveBtn} onPress={handleLeave}>
            <Text style={collabStyles.leaveBtnTxt}>退出房间</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [collabStyles.joinBtn, pressed && { opacity: 0.8 }]}
          onPress={() => setShowModal(true)}
        >
          <Text style={collabStyles.joinIcon}>👥</Text>
          <Text style={collabStyles.joinText}>协同导览</Text>
          <Text style={collabStyles.joinHint}>与好友实时共享游览路线</Text>
        </Pressable>
      )}

      <InlineModal visible={showModal} animationType="slide" transparent onClose={() => setShowModal(false)}>
        <View style={collabStyles.sheetOverlay}>
          <Pressable style={collabStyles.sheetBackdrop} onPress={() => setShowModal(false)} />
          <View style={collabStyles.sheet}>
            {/* 拖拽手柄 */}
            <View style={collabStyles.sheetHandle} />

            {/* 标题栏 */}
            <View style={collabStyles.sheetHeader}>
              <Text style={collabStyles.sheetTitle}>协同导览</Text>
              <Pressable style={collabStyles.sheetCloseBtn} onPress={() => setShowModal(false)}>
                <Text style={collabStyles.sheetCloseTxt}>✕</Text>
              </Pressable>
            </View>

            {/* Tab 切换 */}
            <View style={collabStyles.tabRow}>
              <Pressable
                style={[collabStyles.tab, mode === 'create' && collabStyles.tabActive]}
                onPress={() => setMode('create')}
              >
                <Text style={[collabStyles.tabTxt, mode === 'create' && collabStyles.tabTxtActive]}>创建房间</Text>
              </Pressable>
              <Pressable
                style={[collabStyles.tab, mode === 'join' && collabStyles.tabActive]}
                onPress={() => setMode('join')}
              >
                <Text style={[collabStyles.tabTxt, mode === 'join' && collabStyles.tabTxtActive]}>加入房间</Text>
              </Pressable>
            </View>

            {/* 说明文字 */}
            <Text style={collabStyles.sheetDesc}>
              {mode === 'create'
                ? '创建一个导览房间，邀请朋友一起游览'
                : '输入房间号加入朋友的导览'}
            </Text>

            {/* 输入框 */}
            <View style={collabStyles.inputGroup}>
              <Text style={collabStyles.inputLabel}>您的昵称</Text>
              <TextInput
                style={collabStyles.input}
                placeholder="请输入昵称"
                placeholderTextColor={Colors.gray400}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </View>

            {mode === 'join' && (
              <View style={collabStyles.inputGroup}>
                <Text style={collabStyles.inputLabel}>房间号</Text>
                <TextInput
                  style={collabStyles.input}
                  placeholder="输入房间号"
                  placeholderTextColor={Colors.gray400}
                  value={roomIdInput}
                  onChangeText={setRoomIdInput}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
              </View>
            )}

            {/* 提交按钮 */}
            <Pressable
              style={({ pressed }) => [
                collabStyles.submitBtn,
                pressed && { opacity: 0.85 },
                loading && { opacity: 0.5 },
              ]}
              onPress={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={collabStyles.submitTxt}>
                  {mode === 'create' ? '创建房间' : '加入房间'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </InlineModal>
    </View>
  );
}

function ExploreHero({
  spots,
  routes,
  insets,
  onStartGuide,
  onAskGuide,
  activeRouteName,
  progressLabel,
  nextSpotName,
}: {
  spots: Spot[];
  routes: TourRoute[];
  insets: { top: number };
  onStartGuide: () => void;
  onAskGuide: () => void;
  activeRouteName?: string;
  progressLabel?: string;
  nextSpotName?: string;
}) {
  const guide = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE);
  const [vrmKey] = useState(0);

  useEffect(() => {
    preloadDigitalHuman(getCostume('festival-spring')?.modelFile || 'avatar.vrm').catch((err) => {
      console.warn('[ExploreHero] preload VRM failed:', err);
    });
  }, []);

  const heroSpot = HERO_SPOT_PRIORITY
    .map((id) => spots.find((spot) => spot.id === id))
    .find(Boolean) ?? spots.find((spot) => SPOT_IMAGES[spot.id]) ?? spots[0];
  const heroStory = getSpotStory(heroSpot);
  const guideLine = activeRouteName
    ? `${activeRouteName}进行中，我会继续带你去${nextSpotName || '下一站'}`
    : '我建议先从山门庭院开始，沿香道进入寺院，再用小灵识景确认眼前故事';

  return (
    <View style={[styles.heroStage, { paddingTop: insets.top + 18 }]}>
      <Image source={EXPLORE_VISUALS.hero} style={StyleSheet.absoluteFill} contentFit="cover" />
      <Image source={EXPLORE_VISUALS.heroEcho} style={[StyleSheet.absoluteFill, styles.heroEchoImage]} contentFit="cover" />
      <View style={styles.heroScrim} />
      <View style={styles.heroWarmth} />

      <View style={styles.heroTopBar}>
        <View style={styles.heroSeal}>
          <Image source={EXPLORE_VISUALS.lingshanSeal} style={styles.heroSealImage} contentFit="contain" />
        </View>
        <View style={styles.heroCounter}>
          <Text style={styles.heroCounterNum}>{spots.length}</Text>
          <Text style={styles.heroCounterLabel}>处景点</Text>
        </View>
      </View>

      <View style={styles.guideStageBody}>
        <View style={styles.guideVrmCard}>
          <View style={styles.guideAura} />
          <View style={styles.guideVrmViewport}>
            <VRMView
              key={vrmKey}
              mode="full"
              expression={guide.expression}
              mouthOpen={guide.mouthOpen}
              speaking={guide.isSpeaking}
              action={guide.action}
              actionDuration={guide.actionDurationMs}
              headRotation={guide.headRotation}
              costumeId="festival-spring"
            />
            {/*
            <Pressable
              style={({ pressed }) => [styles.vrmReloadBtn, pressed && styles.pressedSoft]}
              onPress={() => setVrmKey((k) => k + 1)}
              accessibilityRole="button"
              accessibilityLabel="重新加载数字人"
            >
              <Text style={styles.vrmReloadText}>↻</Text>
            </Pressable>
            */}
          </View>
          <View style={styles.guideNamePlate}>
            <Text style={styles.guideNameText}>小灵 · 数字导览员</Text>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>AI DIGITAL GUIDE</Text>
          <Text style={styles.heroTitle}>小灵带你游灵山</Text>
          <View style={styles.guideSpeechBubble}>
            <Text style={styles.guideSpeechLabel}>
              {guide.isSpeaking ? '正在讲解' : '今日建议'}
            </Text>
            <Text style={styles.guideSpeechText} numberOfLines={3}>
              {guide.isSpeaking && guide.subtitle ? guide.subtitle : guideLine}
            </Text>
            <View style={styles.guideSpeechMeta}>
              <Text style={styles.guideSpeechMetaText}>{routes.length} 条路线</Text>
              <View style={styles.guideSpeechMetaDot} />
              <Text style={styles.guideSpeechMetaText}>{progressLabel || heroStory.duration}</Text>
              <View style={styles.guideSpeechMetaDot} />
              <Text style={styles.guideSpeechMetaText} numberOfLines={1}>
                {nextSpotName || heroStory.bestTime}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.heroActionPanel}>
        <View style={styles.heroActions}>
          <Pressable
            style={({ pressed }) => [styles.heroPrimaryAction, pressed && styles.pressedSoft]}
            onPress={onStartGuide}
          >
            <Text style={styles.heroPrimaryActionText}>
              {activeRouteName ? '继续小灵导览' : '开始独自游览'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.heroGhostAction, pressed && styles.pressedSoft]}
            onPress={onAskGuide}
          >
            <Text style={styles.heroGhostActionText}>问小灵</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DiscoveryCommandDock({
  onPhoto,
  onScan,
  onRoutes,
  onAsk,
}: {
  onPhoto: () => void;
  onScan: () => void;
  onRoutes: () => void;
  onAsk: () => void;
}) {
  const commands = [
    { key: 'photo', title: '小灵识景', desc: '对准眼前景点', image: EXPLORE_VISUALS.spotRecognition, imageFit: 'cover' as const, tone: Colors.accent, onPress: onPhoto },
    { key: 'scan', title: '小灵打卡', desc: '确认已经到达', image: EXPLORE_VISUALS.checkinSeal, imageFit: 'contain' as const, tone: Colors.gold, onPress: onScan },
    { key: 'route', title: '路线安排', desc: '让小灵排路线', image: EXPLORE_VISUALS.routeMap, imageFit: 'cover' as const, tone: Colors.primary, onPress: onRoutes },
    { key: 'ask', title: '随时问询', desc: '和小灵聊一聊', image: EXPLORE_VISUALS.lantern, imageFit: 'contain' as const, tone: Colors.auxiliary, onPress: onAsk },
  ];

  return (
    <View style={styles.commandDock}>
      <View style={styles.commandDockHeader}>
        <Text style={styles.commandDockTitle}>小灵能做什么</Text>
        <Text style={styles.commandDockSub}>GUIDE ABILITIES</Text>
      </View>
      <View style={styles.commandGrid}>
        {commands.map((command) => (
          <Pressable
            key={command.key}
            style={({ pressed }) => [
              styles.commandButton,
              { borderColor: command.tone + '33' },
              pressed && styles.pressedSoft,
            ]}
            onPress={command.onPress}
          >
            <View style={[styles.commandMark, { backgroundColor: command.tone + '18' }]}>
              <Image source={command.image} style={styles.commandMarkImage} contentFit={command.imageFit} />
            </View>
            <View style={styles.commandTextWrap}>
              <Text style={styles.commandTitle}>{command.title}</Text>
              <Text style={styles.commandDesc} numberOfLines={1}>{command.desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function GuideSupportPanel({
  routeCount,
  spotCount,
  onRoutes,
  onLibrary,
  onMemory,
}: {
  routeCount: number;
  spotCount: number;
  onRoutes: () => void;
  onLibrary: () => void;
  onMemory: () => void;
}) {
  const supports = [
    { key: 'routes', title: '调整路线', desc: `${routeCount} 条小灵路线脚本`, image: EXPLORE_VISUALS.templePlan, imageFit: 'cover' as const, tone: Colors.primary, onPress: onRoutes },
    { key: 'library', title: '查景点资料', desc: `${spotCount} 处核心导览点`, image: EXPLORE_VISUALS.templeGate, imageFit: 'cover' as const, tone: Colors.auxiliary, onPress: onLibrary },
    { key: 'memory', title: '生成旅程记忆', desc: '把打卡和问答沉淀下来', image: EXPLORE_VISUALS.scrollPaper, imageFit: 'contain' as const, tone: Colors.accent, onPress: onMemory },
  ];

  return (
    <View style={styles.guideSupportPanel}>
      <View style={styles.guideSupportHead}>
        <View>
          <Text style={[styles.sectionKicker, styles.guideSupportKicker]}>SUPPORTING WORKFLOWS</Text>
          <Text style={[styles.sectionTitleLarge, styles.guideSupportTitleLarge]}>小灵的后台工具</Text>
        </View>
        <View style={styles.guideDataBadge}>
          <Text style={styles.guideDataBadgeNum}>
            {Math.round(GUIDE_DATA_SOURCE_SUMMARY.behaviorRows / 10000)}万+
          </Text>
          <Text style={styles.guideDataBadgeText}>行为样本</Text>
        </View>
      </View>

      <Text style={styles.guideSupportLead}>
        探索页只负责导览主控，路线、资料库和记忆生成作为小灵调用的支撑流程。
      </Text>

      <View style={styles.guideSupportList}>
        {supports.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              styles.guideSupportItem,
              { borderColor: item.tone + '24' },
              pressed && styles.pressedSoft,
            ]}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}，${item.desc}`}
          >
            <View style={[styles.guideSupportMark, { backgroundColor: item.tone + '16' }]}>
              <Image source={item.image} style={styles.guideSupportMarkImage} contentFit={item.imageFit} />
            </View>
            <View style={styles.guideSupportCopy}>
              <Text style={styles.guideSupportTitle}>{item.title}</Text>
              <Text style={styles.guideSupportDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.guideSupportArrow}>→</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tourState, tourActions] = useTour();
  const photoRef = useRef<ExplorePhotoHandle>(null);
  const scanRef = useRef<ExploreScanHandle>(null);
  const checkinConsumedRef = useRef(false);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const soloRecommendation = useMemo(
    () => getSoloRouteRecommendation(tourState.guideProfile),
    [tourState.guideProfile],
  );

  // Load data
  useEffect(() => {
    Promise.all([listSpots(), listRoutes()])
      .then(([spotsRes, routesRes]) => {
        const sData = (spotsRes as any).data ?? spotsRes;
        const rData = (routesRes as any).data ?? routesRes;
        const withCoords = (Array.isArray(sData) ? sData : []).filter(
          (s: Spot) => s.latitude != null && s.longitude != null,
        );
        const fallbackSpots = getMockApiSpots().filter(
          (s: Spot) => s.latitude != null && s.longitude != null,
        );
        const routeData = Array.isArray(rData) ? rData : [];
        setSpots(withCoords.length > 0 ? withCoords : fallbackSpots);
        setRoutes(routeData.length > 0 ? routeData : getMockApiRoutes());
      })
      .catch(() => {
        setSpots(getMockApiSpots().filter((s: Spot) => s.latitude != null && s.longitude != null));
        setRoutes(getMockApiRoutes());
      })
      .finally(() => setLoading(false));
  }, []);

  const hasGreetedRef = useRef(false);

  useEffect(() => {
    VRMManager.setPageContext('explore');
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    const t = setTimeout(() => {
      if (tourState.currentRoute) {
        VRMManager.speak(`${tourState.currentRoute.name}，导览进行中。让我为您导航到下一个景点`, 'happy');
      } else {
        VRMManager.speak('让我带您游览灵山胜境吧', 'neutral');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [tourState.currentRoute]);

  // ─── 自动打开相机/扫码（打卡意图） ───
  useEffect(() => {
    if (checkinConsumedRef.current) return;
    if (!tourState.checkinIntent || loading) return;
    checkinConsumedRef.current = true;
    const intent = tourState.checkinIntent;
    // Delay to ensure refs are ready
    const t = setTimeout(() => {
      if (intent === 'photo') {
        photoRef.current?.openCamera();
        VRMManager.speak('请拍摄景点照片进行打卡', 'neutral');
      } else if (intent === 'scan') {
        scanRef.current?.openScanner();
        VRMManager.speak('请扫描景点二维码进行打卡', 'neutral');
      }
      tourActions.clearCheckinIntent();
    }, 800);
    return () => clearTimeout(t);
  }, [tourState.checkinIntent, loading, tourActions.clearCheckinIntent]);

  // ─── 返回导览 ───
  const handleReturnToTour = useCallback(() => {
    tourActions.clearCheckinIntent();
    router.back();
  }, [tourActions.clearCheckinIntent, router]);

  const handleOpenPhoto = useCallback(() => {
    photoRef.current?.openCamera();
  }, []);

  const handleOpenScan = useCallback(() => {
    scanRef.current?.openScanner();
  }, []);

  const handleAskGuide = useCallback(() => {
    VRMManager.speak('我在，想问景点故事、路线安排还是打卡方式？', 'happy');
    setTimeout(() => {
      router.push({
        pathname: '/chat',
        params: { returnTo: '/explore', returnLabel: '返回探索', fresh: '1' },
      });
    }, 650);
  }, [router]);

  const handleStartGuide = useCallback(() => {
    if (tourState.currentRoute) {
      const target = tourState.currentSpot;
      VRMManager.speak(
        target ? `我们继续前往${target.name}，我会一路提醒您` : '导览继续，我先带您回到地图',
        'happy',
      );
      setTimeout(() => {
        if (target) {
          router.push(`/attractions/${target.id}`);
        } else {
          router.push('/map');
        }
      }, 600);
      return;
    }
    tourActions.startSoloTour('free_walk');
    VRMManager.speak(
      `${soloRecommendation.companionLine}我先不安排完整路线，你可以自由看看。想让我推荐下一站时，随时点路线安排。`,
      'happy',
    );
  }, [
    soloRecommendation.companionLine,
    tourActions.startSoloTour,
    tourState.currentRoute,
    tourState.currentSpot,
    router,
  ]);

  const handleOpenMemory = useCallback(() => {
    router.push({
      pathname: '/memory',
      params: { returnTo: '/explore', returnLabel: '返回探索' },
    });
  }, [router]);

  const handleEndTour = useCallback(() => {
    VRMManager.speak('本次导览我先帮你收束成旅程记忆，稍后可以继续补充照片和问答。', 'happy');
    tourActions.endTour();
    setTimeout(handleOpenMemory, 520);
  }, [handleOpenMemory, tourActions.endTour]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>墨韵渐染...</Text>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInUp.duration(520)}>
              <ExploreHero
                spots={spots}
                routes={routes}
                insets={insets}
                onStartGuide={handleStartGuide}
                onAskGuide={handleAskGuide}
                activeRouteName={tourState.currentRoute?.name}
                progressLabel={
                  tourState.progress.total > 0
                    ? `${tourState.progress.completed}/${tourState.progress.total}`
                    : undefined
                }
                nextSpotName={tourState.currentSpot?.name || tourState.nextSpot?.name}
              />
            </Animated.View>

            {/* ─── 导览状态提示 ─── */}
            {tourState.currentRoute && (
              <Animated.View entering={FadeInUp.duration(400)} style={styles.section}>
                <View style={exploreTourStyles.tourCard}>
                  <View style={exploreTourStyles.tourHeader}>
                    <View style={exploreTourStyles.tourIconBadge}>
                      <Text style={exploreTourStyles.tourIconText}>
                        {tourState.status === 'completed' ? '✓' : tourState.status === 'narrating' ? '🎤' : tourState.status === 'navigate' ? '🧭' : '⏸'}
                      </Text>
                    </View>
                    <View style={exploreTourStyles.tourInfo}>
                      <Text style={exploreTourStyles.tourRouteName}>{tourState.currentRoute.name}</Text>
                      <Text style={exploreTourStyles.tourProgressText}>
                        {tourState.status === 'completed' ? '已完成' : tourState.status === 'narrating' ? '讲解中' : tourState.status === 'navigate' ? '导航中' : tourState.status === 'free' ? '自由探索' : '已暂停'}
                        {' · '}{tourState.progress.completed}/{tourState.progress.total} 景点
                      </Text>
                    </View>
                  </View>
                  <View style={exploreTourStyles.tourProgressBar}>
                    <View style={[exploreTourStyles.tourProgressFill, { width: `${(tourState.progress.completed / Math.max(tourState.progress.total, 1)) * 100}%` }]} />
                  </View>
                  {tourState.nextSpot && (
                    <View style={exploreTourStyles.tourNextSpot}>
                      <Text style={exploreTourStyles.tourNextLabel}>下一站：</Text>
                      <Text style={exploreTourStyles.tourNextName}>{tourState.nextSpot.name}</Text>
                    </View>
                  )}
                  <View style={exploreTourStyles.tourActions}>
                    {tourState.status === 'completed' ? (
                      <Pressable style={exploreTourStyles.tourResumeBtn} onPress={handleOpenMemory}>
                        <Text style={exploreTourStyles.tourResumeBtnText}>查看手帐</Text>
                      </Pressable>
                    ) : (tourState.status === 'narrating' || tourState.status === 'navigate') ? (
                      <Pressable style={exploreTourStyles.tourPauseBtn} onPress={tourActions.pauseTour}>
                        <Text style={exploreTourStyles.tourPauseBtnText}>⏸ 暂停</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={exploreTourStyles.tourResumeBtn} onPress={tourActions.resumeTour}>
                        <Text style={exploreTourStyles.tourResumeBtnText}>▶ 继续</Text>
                      </Pressable>
                    )}
                    <Pressable style={exploreTourStyles.tourMapBtn} onPress={() => router.push('/map')}>
                      <Text style={exploreTourStyles.tourMapBtnText}>🗺️ 地图</Text>
                    </Pressable>
                    <Pressable style={exploreTourStyles.tourEndBtn} onPress={handleEndTour}>
                      <Text style={exploreTourStyles.tourEndBtnText}>结束</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ─── 识景工具条 ─── */}
            <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.section}>
              <DiscoveryCommandDock
                onPhoto={handleOpenPhoto}
                onScan={handleOpenScan}
                onRoutes={() => router.push('/routes')}
                onAsk={handleAskGuide}
              />
              <PhotoRecognition ref={photoRef} compact />
              <QRScanSection ref={scanRef} spots={spots} compact />
            </Animated.View>

            {/* ─── 协同导览 ─── */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.section}>
            <CollabTourSection routes={routes} />
            </Animated.View>

            {/* ─── Supporting Workflows ─── */}
            <Animated.View entering={FadeInUp.delay(260).duration(500)} style={styles.section}>
              <GuideSupportPanel
                routeCount={routes.length}
                spotCount={spots.length}
                onRoutes={() => router.push('/routes')}
                onLibrary={() => router.push('/attractions')}
                onMemory={handleOpenMemory}
              />
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* 返回导览浮动按钮 */}
      {tourState.currentRoute && (
        <Pressable
          style={[styles.returnTourBtn, { top: insets.top + 12 }]}
          onPress={handleReturnToTour}
        >
          <Text style={styles.returnTourTxt}>← 返回导览</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },
  pressedSoft: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },

  // Immersive hero
  heroStage: {
    minHeight: 600,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  heroEchoImage: {
    opacity: 0.18,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,10,8,0.58)',
  },
  heroWarmth: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,75,49,0.12)',
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroSeal: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,228,203,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,241,0.92)',
    transform: [{ rotate: '-7deg' }],
    overflow: 'hidden',
  },
  heroSealImage: {
    width: 44,
    height: 44,
  },
  heroSealText: {
    fontSize: 27,
    color: '#FFE4CB',
    fontFamily: 'MaShanZheng',
  },
  heroCounter: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  heroCounterNum: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
  },
  heroCounterLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
  },
  guideStageBody: {
    zIndex: 2,
    minHeight: 318,
    justifyContent: 'flex-end',
  },
  guideVrmCard: {
    height: 236,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  guideAura: {
    position: 'absolute',
    bottom: 18,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(106,156,137,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  guideVrmViewport: {
    width: 182,
    height: 236,
    position: 'relative',
  },
  vrmReloadBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vrmReloadText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  guideNamePlate: {
    position: 'absolute',
    bottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(247,245,240,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  guideNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: 1,
  },
  heroCopy: {
    zIndex: 2,
    paddingTop: 4,
  },
  heroKicker: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.68)',
    marginBottom: 8,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: '#fff',
    fontFamily: 'MaShanZheng',
    textShadowColor: 'rgba(0,0,0,0.32)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroSub: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.86)',
    maxWidth: 286,
  },
  guideSpeechBubble: {
    marginTop: 12,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(247,245,240,0.15)',
  },
  guideSpeechLabel: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  guideSpeechText: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '500',
  },
  guideSpeechMeta: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideSpeechMetaText: {
    flexShrink: 1,
    color: 'rgba(255,245,232,0.78)',
    fontSize: 11,
    fontWeight: '800',
  },
  guideSpeechMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,228,203,0.55)',
  },
  heroActionPanel: {
    zIndex: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroPrimaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4CB',
  },
  heroPrimaryActionText: {
    fontSize: 14,
    color: Colors.ink,
    fontWeight: '800',
  },
  heroGhostAction: {
    minWidth: 92,
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroGhostActionText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },

  // Shared section language
  sectionIntroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionKicker: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '800',
  },
  sectionTitleLarge: {
    marginTop: 3,
    fontSize: 24,
    color: Colors.ink,
    fontFamily: 'MaShanZheng',
  },
  sectionHint: {
    fontSize: 11,
    color: Colors.gray400,
    paddingBottom: 4,
  },

  // Map as the exploration center
  mapPanel: {
    paddingTop: 2,
  },
  mapStage: {
    height: MAP_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.08)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  mapStoryCard: {
    marginTop: -42,
    marginHorizontal: 12,
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: 'rgba(253,251,247,0.97)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  mapStoryImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.primaryBg,
  },
  mapStoryImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapStoryFallbackText: {
    fontSize: 28,
    fontFamily: 'MaShanZheng',
    color: Colors.primary,
  },
  mapStoryCopy: {
    flex: 1,
  },
  mapStoryEyebrow: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '800',
  },
  mapStoryTitle: {
    marginTop: 3,
    fontSize: 16,
    color: Colors.ink,
    fontWeight: '800',
  },
  mapStoryText: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 18,
  },
  mapStoryArrow: {
    fontSize: 28,
    color: Colors.gray300,
    paddingHorizontal: 2,
  },

  // Toolkit
  commandDock: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: Colors.paperWarm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  commandDockHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commandDockTitle: {
    fontSize: 22,
    color: Colors.ink,
    fontFamily: 'MaShanZheng',
  },
  commandDockSub: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '800',
  },
  commandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  commandButton: {
    width: '48%',
    minHeight: 72,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#fff',
    borderWidth: 1,
  },
  commandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(42,37,32,0.06)',
  },
  commandMarkImage: {
    width: '100%',
    height: '100%',
  },
  commandMarkText: {
    fontSize: 18,
    fontFamily: 'MaShanZheng',
  },
  commandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  commandTitle: {
    fontSize: 14,
    color: Colors.ink,
    fontWeight: '800',
  },
  commandDesc: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.gray400,
  },

  // Supporting workflows
  guideSupportPanel: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: Colors.ink,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5,
  },
  guideSupportHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
  },
  guideSupportKicker: {
    color: '#FFE4CB',
  },
  guideSupportTitleLarge: {
    color: '#fff',
  },
  guideDataBadge: {
    minWidth: 72,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  guideDataBadgeNum: {
    fontSize: 15,
    color: '#FFE4CB',
    fontWeight: '900',
  },
  guideDataBadgeText: {
    marginTop: 2,
    fontSize: 10,
    color: 'rgba(255,255,255,0.58)',
  },
  guideSupportLead: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.66)',
  },
  guideSupportList: {
    marginTop: 14,
    gap: 10,
  },
  guideSupportItem: {
    minHeight: 66,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  guideSupportMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  guideSupportMarkImage: {
    width: '100%',
    height: '100%',
  },
  guideSupportMarkText: {
    fontSize: 18,
    fontFamily: 'MaShanZheng',
  },
  guideSupportCopy: {
    flex: 1,
    minWidth: 0,
  },
  guideSupportTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '900',
  },
  guideSupportDesc: {
    marginTop: 3,
    fontSize: 11,
    color: 'rgba(255,255,255,0.58)',
  },
  guideSupportArrow: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.42)',
  },

  // Story carousel
  storySection: {
    marginTop: 4,
  },
  storyAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.ink,
  },
  storyAllBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  storyScroll: {
    gap: 12,
  },
  storyCard: {
    width: STORY_CARD_W,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  storyImageWrap: {
    height: 148,
    position: 'relative',
    backgroundColor: Colors.primaryBg,
  },
  storyImageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  storyBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  storyBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },
  storyIndex: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontSize: 34,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '900',
  },
  storyContent: {
    padding: 14,
  },
  storyTitle: {
    fontSize: 17,
    color: Colors.ink,
    fontWeight: '900',
  },
  storyDesc: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray500,
  },
  storyMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  storyMeta: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  storyMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
  },

  // 返回导览按钮
  returnTourBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  returnTourTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },

  // Header
  header: { alignItems: 'center', paddingVertical: 12, marginBottom: 4, paddingHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.ink, letterSpacing: 4 },
  headerLine: { width: 24, height: 2, backgroundColor: Colors.accent, borderRadius: 1, marginTop: 6, opacity: 0.6 },
  headerSub: { fontSize: 10, color: Colors.gray400, marginTop: 4, letterSpacing: 2 },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 80 },
  loadingText: { fontSize: 14, color: Colors.gray400, letterSpacing: 4, marginTop: 16 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 24 },

  // Dual layout for photo + scan
  dualRow: { flexDirection: 'row', gap: 10 },
  dualCol: { flex: 1 },

  // Map card
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
  mapHint: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    alignItems: 'center',
  },
  mapHintText: { fontSize: 11, color: Colors.gray400, letterSpacing: 1 },

  // Routes scroll
  routesScroll: { paddingHorizontal: 16, gap: 12 },

  // Quick Nav
  quickSection: { paddingHorizontal: 16, marginBottom: 24 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 12,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  quickCardAll: {
    borderColor: Colors.borderLight,
    borderWidth: 1,
  },
  quickIcon: {
    width: 40, height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  quickChar: { fontSize: 18, fontWeight: '700' },
  quickInfo: { flex: 1 },
  quickName: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  quickCount: { fontSize: 11, color: Colors.gray400, marginTop: 2 },

  // Featured spots carousel
  featHead: {
    paddingHorizontal: 16, marginBottom: 12,
    position: 'relative',
    width: '100%',
  },
  seeAllBtn: {
    position: 'absolute', right: 16, top: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  seeAllText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  featScroll: { gap: 12 },
  featSpotCard: {
    width: 260, height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  featSpotImg: {
    width: '100%', height: '100%',
    position: 'relative',
  },
  featSpotOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  featSpotInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  featSpotNameTxt: { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: 1, flexShrink: 1 },
  featSpotCat: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginLeft: 8 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 12, gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.gray300,
  },
  dotActive: {
    width: 18, borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});


// Route card styles
const routeStyles = StyleSheet.create({
  card: {
    width: ROUTE_CARD_W,
    minHeight: 164,
    backgroundColor: Colors.ink,
    borderRadius: 20,
    padding: 18,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  typeBadge: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  typeIcon: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#fff' },
  cardMeta: { fontSize: 11, color: 'rgba(255,255,255,0.58)', marginTop: 4 },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 19, marginBottom: 12 },
  cardFooter: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 8, alignItems: 'flex-end',
  },
  cardCta: { fontSize: 12, color: '#FFE4CB', fontWeight: '800' },
});

// Photo Recognition styles
const photoStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  captureBtn: { padding: 16, alignItems: 'center' },
  captureIcon: { fontSize: 28, marginBottom: 4 },
  captureText: { fontSize: 14, fontWeight: '600', color: Colors.ink, letterSpacing: 1 },
  captureHint: { fontSize: 10, color: Colors.gray400, marginTop: 2 },
  preview: { height: 120, position: 'relative' },
  previewImg: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  loadingTxt: { fontSize: 12, color: '#fff' },
  resultBox: { padding: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  resultName: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  confBadge: { backgroundColor: Colors.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill },
  confText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  resultDesc: { fontSize: 12, color: Colors.gray500, lineHeight: 18 },
  resultExplain: { fontSize: 11, color: Colors.gray400, marginTop: 4, fontStyle: 'italic' },
  compactResult: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: Colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  compactResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactResultKicker: {
    fontSize: 11,
    color: '#FFE4CB',
    fontWeight: '800',
  },
  compactPreview: {
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: Colors.gray700,
  },
  compactResultName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '800',
  },
  compactResultDesc: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
  },

  // Full-screen camera
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  cameraTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraCloseTxt: { fontSize: 18, color: '#fff', fontWeight: '600' },
  cameraTitle: { fontSize: 16, color: '#fff', fontWeight: '600', letterSpacing: 2 },
  viewfinder: {
    position: 'absolute', top: '25%', left: '15%', right: '15%', bottom: '35%',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
  },
  viewfinderCornerTL: { position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#fff' },
  viewfinderCornerTR: { position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#fff' },
  viewfinderCornerBL: { position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#fff' },
  viewfinderCornerBR: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#fff' },
  viewfinderHint: {
    position: 'absolute', bottom: -32, left: 0, right: 0,
    textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  cameraBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 48, paddingTop: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
  },
});

// QR Scan styles
const scanStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scanBtn: { padding: 16, alignItems: 'center' },
  scanIcon: { fontSize: 28, marginBottom: 4 },
  scanText: { fontSize: 14, fontWeight: '600', color: Colors.ink, letterSpacing: 1 },
  scanHint: { fontSize: 10, color: Colors.gray400, marginTop: 2 },
  checkedList: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  checkedTitle: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  checkedItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  checkedDot: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  checkedName: { fontSize: 12, color: Colors.ink },
  checkedMore: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  compactResult: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.24)',
  },
  compactResultKicker: {
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '800',
  },
  compactResultTitle: {
    marginTop: 4,
    fontSize: 15,
    color: Colors.ink,
    fontWeight: '800',
  },
  compactResultData: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.gray500,
    lineHeight: 16,
  },
  // Full-screen scanner
  scannerScreen: { flex: 1, backgroundColor: '#000' },
  scannerTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10,
  },
  scannerCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scannerCloseTxt: { fontSize: 18, color: '#fff', fontWeight: '600' },
  scannerTitle: { fontSize: 16, color: '#fff', fontWeight: '600', letterSpacing: 2 },
  scanFrame: {
    position: 'absolute', top: '28%', left: '20%', right: '20%', bottom: '38%',
    borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
  },
  scanCornerTL: { position: 'absolute', top: -2, left: -2, width: 28, height: 28, borderTopWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary },
  scanCornerTR: { position: 'absolute', top: -2, right: -2, width: 28, height: 28, borderTopWidth: 3, borderRightWidth: 3, borderColor: Colors.primary },
  scanCornerBL: { position: 'absolute', bottom: -2, left: -2, width: 28, height: 28, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: Colors.primary },
  scanCornerBR: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderBottomWidth: 3, borderRightWidth: 3, borderColor: Colors.primary },
  scanLine: {
    position: 'absolute', top: '50%', left: 4, right: 4, height: 2,
    backgroundColor: Colors.primary, opacity: 0.6,
  },
  scanFrameHint: {
    position: 'absolute', bottom: -32, left: 0, right: 0,
    textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
  },
  scanResultOverlay: {
    position: 'absolute', bottom: 80, left: 24, right: 24, zIndex: 10,
  },
  scanResultCard: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  scanResultIcon: { fontSize: 32, marginBottom: 8 },
  scanResultTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  scanResultData: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});

// Collab Tour styles
const collabStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  joinBtn: { padding: 18, alignItems: 'center' },
  joinIcon: { fontSize: 28, marginBottom: 4 },
  joinText: { fontSize: 14, fontWeight: '600', color: Colors.ink, letterSpacing: 1 },
  joinHint: { fontSize: 10, color: Colors.gray400, marginTop: 2 },
  roomInfo: { padding: 16 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  roomIcon: { fontSize: 28 },
  roomMeta: { flex: 1 },
  roomTitle: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  roomId: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  memberCount: { fontSize: 12, color: Colors.primary, fontWeight: '500', marginBottom: 10 },
  activeRouteBox: {
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  activeRouteLabel: { fontSize: 10, color: Colors.gray500, fontWeight: '700', letterSpacing: 1 },
  activeRouteName: { fontSize: 15, color: Colors.ink, fontWeight: '700', marginTop: 3, marginBottom: 8 },
  sharedStops: { gap: 8, paddingRight: 4 },
  sharedStop: {
    minWidth: 72,
    borderRadius: Radius.sm,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  sharedStopIndex: { fontSize: 10, color: Colors.primary, fontWeight: '800' },
  sharedStopName: { fontSize: 11, color: Colors.ink, marginTop: 2 },
  followBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  followBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  routePicker: { marginBottom: 12 },
  routePickerTitle: { fontSize: 12, color: Colors.gray500, marginBottom: 8, fontWeight: '600' },
  routePickerRow: { gap: 10, paddingRight: 4 },
  routeMiniCard: {
    width: 128,
    minHeight: 62,
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  routeMiniName: { fontSize: 12, color: Colors.ink, fontWeight: '700' },
  routeMiniMeta: { fontSize: 10, color: Colors.gray400, marginTop: 4 },
  syncError: { fontSize: 11, color: Colors.error, marginBottom: 10 },
  leaveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.accent, alignSelf: 'flex-start' },
  leaveBtnTxt: { fontSize: 12, color: Colors.accent, fontWeight: '500' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.gray300, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink, letterSpacing: 1 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  sheetCloseTxt: { fontSize: 14, color: Colors.gray500, fontWeight: '600' },
  sheetDesc: { fontSize: 13, color: Colors.gray500, marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.gray500, marginBottom: 6, letterSpacing: 0.5 },
  tabRow: { flexDirection: 'row', marginBottom: 20, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderLight },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  tabActive: { backgroundColor: Colors.primary },
  tabTxt: { fontSize: 13, fontWeight: '500', color: Colors.gray500 },
  tabTxtActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.ink, marginBottom: 12 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  submitTxt: { fontSize: 14, fontWeight: '600', color: '#fff', letterSpacing: 1 },
});

// 探索页导览卡片样式
const exploreTourStyles = StyleSheet.create({
  tourCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Colors.accent + '30',
  },
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tourIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourIconText: { fontSize: 18 },
  tourInfo: { flex: 1 },
  tourRouteName: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  tourProgressText: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  tourProgressBar: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tourProgressFill: {
    height: 6,
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  tourNextSpot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.sm,
  },
  tourNextLabel: { fontSize: 12, color: Colors.gray500 },
  tourNextName: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  tourActions: { flexDirection: 'row', gap: 8 },
  tourPauseBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.accent + '15',
    borderRadius: Radius.md,
  },
  tourPauseBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent },
  tourResumeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.md,
  },
  tourResumeBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  tourMapBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
  },
  tourMapBtnText: { fontSize: 12, fontWeight: '500', color: Colors.ink },
  tourEndBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  tourEndBtnText: { fontSize: 12, fontWeight: '500', color: '#FF4D4F' },
});
