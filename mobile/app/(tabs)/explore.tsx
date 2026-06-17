import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { VRMFloating, type VRMFloatingRef } from '@/components/vrm/VRMFloating';
import { VRMManager } from '@/components/vrm/VRMManager';
import { SectionHeader } from '@/components/scenic/SectionHeader';
import AmapView from '@/components/map/AmapView';
import { listSpots, type Spot } from '@/api/spots';
import { listRoutes, type TourRoute } from '@/api/routes';
import { identifySpot, type VisionResult } from '@/api/vision';
import { createRoom, joinRoom, getRoomInfo, type Room } from '@/api/room';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';
import { SPOT_IMAGES, ROUTE_TYPE_META, CAT_COLORS } from '@/constants/scenic';

const MAP_H = 300;
const ROUTE_CARD_W = 260;

// ─── 拍照识景 ───
function PhotoRecognition({ vrmRef }: { vrmRef: React.RefObject<VRMFloatingRef> }) {
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
      vrmRef.current?.speak(
        `识别为${visionResult.spot_name}，置信度${Math.round(visionResult.confidence * 100)}%。${visionResult.description}`,
        'neutral',
      );
    } catch (err: any) {
      setShowCamera(false);
      Alert.alert('识别失败', err.message || '请重试');
      vrmRef.current?.speak('抱歉，识别遇到了问题，请再试一次', 'sad');
    } finally {
      setLoading(false);
    }
  }, [vrmRef]);

  const pickImage = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setImageUri(res.assets[0].uri);
    setLoading(true);
    setResult(null);
    try {
      const visionResult = await identifySpot(res.assets[0].uri);
      setResult(visionResult);
      vrmRef.current?.speak(
        `识别为${visionResult.spot_name}，置信度${Math.round(visionResult.confidence * 100)}%。${visionResult.description}`,
        'neutral',
      );
    } catch (err: any) {
      Alert.alert('识别失败', err.message || '请重试');
    } finally {
      setLoading(false);
    }
  }, [vrmRef]);

  // Camera full-screen
  if (showCamera) {
    return (
      <Modal visible animationType="slide" transparent={false}>
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
      </Modal>
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
}

// ─── 扫码定位 ───
function QRScanSection({ spots, vrmRef }: { spots: Spot[]; vrmRef: React.RefObject<VRMFloatingRef> }) {
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

  const handleScan = useCallback(({ data }: { data: string }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScannedData(data);
    const spot = spots.find((s) => data.includes(s.id) || data.includes(s.name));
    setMatchedSpot(spot || null);
    if (spot) {
      vrmRef.current?.speak(`打卡成功: ${spot.name}`, 'happy');
    } else {
      vrmRef.current?.speak('扫描成功，但未匹配到景点', 'neutral');
    }
    setTimeout(() => setShowScanner(false), 2000);
  }, [spots, vrmRef]);

  // Checked-in spots
  const checkedSpots = useMemo(() => {
    return spots.filter((s) => scannedData && (scannedData.includes(s.id) || scannedData.includes(s.name)));
  }, [spots, scannedData]);

  // Full-screen scanner
  if (showScanner) {
    return (
      <Modal visible animationType="slide" transparent={false}>
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
      </Modal>
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
}

// ─── 协同导览 ───
function CollabTourSection({ vrmRef }: { vrmRef: React.RefObject<VRMFloatingRef> }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { Alert.alert('请输入昵称'); return; }
    setLoading(true);
    try {
      const r = await createRoom(name.trim());
      setRoom(r);
      setShowModal(false);
      setName('');
      vrmRef.current?.speak(`创建房间成功，房间号 ${r.room_id}，分享给朋友一起游览吧！`, 'happy');
    } catch (err: any) {
      Alert.alert('创建失败', err.message);
    } finally {
      setLoading(false);
    }
  }, [name, vrmRef]);

  const handleJoin = useCallback(async () => {
    if (!name.trim() || !roomIdInput.trim()) { Alert.alert('请填写完整信息'); return; }
    setLoading(true);
    try {
      const r = await joinRoom(roomIdInput.trim(), name.trim());
      setRoom(r);
      setShowModal(false);
      setName('');
      setRoomIdInput('');
      vrmRef.current?.speak('成功加入房间，开始协同游览！', 'neutral');
    } catch (err: any) {
      Alert.alert('加入失败', err.message);
    } finally {
      setLoading(false);
    }
  }, [name, roomIdInput, vrmRef]);

  const handleLeave = useCallback(() => {
    setRoom(null);
    vrmRef.current?.speak('已退出协同导览', 'neutral');
  }, [vrmRef]);

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
            {room.members?.length || 1} 人在线
          </Text>
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

      <Modal visible={showModal} animationType="slide" transparent>
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
      </Modal>
    </View>
  );
}

// ─── Route Card ───
function RouteCard({ route, onPress }: { route: TourRoute; onPress: () => void }) {
  const meta = ROUTE_TYPE_META[route.route_type] || ROUTE_TYPE_META.nature;
  return (
    <Pressable
      style={({ pressed }) => [
        routeStyles.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <View style={routeStyles.cardTop}>
        <View style={[routeStyles.typeBadge, { backgroundColor: meta.bg }]}>
          <Text style={[routeStyles.typeIcon, { color: meta.color }]}>{meta.icon}</Text>
        </View>
        <View style={routeStyles.cardInfo}>
          <Text style={routeStyles.cardName} numberOfLines={1}>{route.name}</Text>
          <Text style={routeStyles.cardMeta}>{meta.label} · {route.duration}</Text>
        </View>
      </View>
      <Text style={routeStyles.cardDesc} numberOfLines={2}>{route.description}</Text>
      <View style={routeStyles.cardFooter}>
        <Text style={routeStyles.cardCta}>查看路线 →</Text>
      </View>
    </Pressable>
  );
}

// ─── Quick Nav Grid ───
function QuickNavSection({ spots, router }: { spots: Spot[]; router: any }) {
  const categories = [...new Set(spots.map((s) => s.category))];
  const catIcon: Record<string, string> = {
    '核心景点': '佛',
    '特色景点': '境',
    '文化设施': '文',
  };

  return (
    <View style={styles.quickSection}>
      <SectionHeader title="景点分类" subtitle="CATEGORIES" />
      <View style={styles.quickGrid}>
        {categories.map((cat) => {
          const count = spots.filter((s) => s.category === cat).length;
          const color = CAT_COLORS[cat] || Colors.gray500;
          return (
            <Pressable
              key={cat}
              style={({ pressed }) => [
                styles.quickCard,
                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => router.push('/attractions')}
            >
              <View style={[styles.quickIcon, { backgroundColor: color + '12', borderColor: color + '25' }]}>
                <Text style={[styles.quickChar, { color }]}>{catIcon[cat] || '景'}</Text>
              </View>
              <View style={styles.quickInfo}>
                <Text style={styles.quickName}>{cat}</Text>
                <Text style={styles.quickCount}>{count} 个景点</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          style={({ pressed }) => [
            styles.quickCard,
            styles.quickCardAll,
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
          onPress={() => router.push('/attractions')}
        >
          <View style={[styles.quickIcon, { backgroundColor: Colors.ink + '08', borderColor: Colors.ink + '15' }]}>
            <Text style={[styles.quickChar, { color: Colors.ink }]}>全</Text>
          </View>
          <View style={styles.quickInfo}>
            <Text style={styles.quickName}>全部景点</Text>
            <Text style={styles.quickCount}>{spots.length} 个景点</Text>
          </View>
        </Pressable>
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
  const vrmRef = useRef<VRMFloatingRef>(null);
  const scrollY = useSharedValue(0);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const carouselRef = useRef<ScrollView>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const carouselSpots = useMemo(() => spots.slice(0, 8), [spots]);
  const CARD_W = 260;
  const CARD_GAP = 12;

  // Load data
  useEffect(() => {
    Promise.all([listSpots(), listRoutes()])
      .then(([spotsRes, routesRes]) => {
        const sData = (spotsRes as any).data ?? spotsRes;
        const rData = (routesRes as any).data ?? routesRes;
        const withCoords = (Array.isArray(sData) ? sData : []).filter(
          (s: Spot) => s.latitude != null && s.longitude != null,
        );
        setSpots(withCoords);
        setRoutes(Array.isArray(rData) ? rData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const vrmSpeak = useCallback((text: string, emotion?: string) => {
    vrmRef.current?.speak(text, emotion);
  }, []);

  useEffect(() => {
    VRMManager.setPageContext('explore');
    const t = setTimeout(() => {
      vrmSpeak('让我带您游览灵山胜境吧', 'neutral');
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const handleMapSpotTap = useCallback((spot: Spot) => {
    setSelectedSpot(spot.id);
    vrmSpeak(`这是${spot.name}，${spot.overview}`, 'neutral');
    setTimeout(() => router.push(`/attractions/${spot.id}`), 1800);
  }, [vrmSpeak, router]);

  // Auto-scroll carousel
  const startCarouselTimer = useCallback(() => {
    if (carouselTimer.current) clearInterval(carouselTimer.current);
    carouselTimer.current = setInterval(() => {
      setCarouselIdx((prev) => {
        const next = (prev + 1) % carouselSpots.length;
        const offset = 16 + next * (CARD_W + CARD_GAP);
        carouselRef.current?.scrollTo({ x: offset, animated: true });
        return next;
      });
    }, 3000);
  }, [carouselSpots.length]);

  useEffect(() => {
    if (carouselSpots.length > 1) startCarouselTimer();
    return () => { if (carouselTimer.current) clearInterval(carouselTimer.current); };
  }, [carouselSpots.length, startCarouselTimer]);

  const pauseCarousel = useCallback(() => {
    if (carouselTimer.current) clearInterval(carouselTimer.current);
  }, []);

  const resumeCarousel = useCallback(() => {
    if (carouselSpots.length > 1) startCarouselTimer();
  }, [carouselSpots.length, startCarouselTimer]);

  // Header parallax
  const headerAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -30], { extrapolateRight: Extrapolation.CLAMP }) }],
    opacity: interpolate(scrollY.value, [0, 150], [1, 0.6], { extrapolateRight: Extrapolation.CLAMP }),
  }));

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {/* ─── Header ─── */}
        <Animated.View style={[styles.header, { paddingTop: insets.top + 16 }, headerAnim]}>
          <Text style={styles.headerTitle}>云游胜境</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerSub}>景区导览 · 智能识别 · 协同游览</Text>
        </Animated.View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>墨韵渐染...</Text>
          </View>
        ) : (
          <>
            {/* ─── Scenic Map ─── */}
            <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.section}>
              <SectionHeader title="胜境全图" subtitle="SCENIC MAP" />
              <View style={styles.mapCard}>
                <AmapView
                  spots={spots}
                  onSpotTap={handleMapSpotTap}
                  height={280}
                />
                <View style={styles.mapHint}>
                  <Text style={styles.mapHintText}>点击景点标记查看详情</Text>
                </View>
              </View>
            </Animated.View>

            {/* ─── 拍照识景 + 扫码定位 ─── */}
            <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.section}>
              <View style={styles.dualRow}>
                <View style={styles.dualCol}>
                  <PhotoRecognition vrmRef={vrmRef} />
                </View>
                <View style={styles.dualCol}>
                  <QRScanSection spots={spots} vrmRef={vrmRef} />
                </View>
              </View>
            </Animated.View>

            {/* ─── 协同导览 ─── */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.section}>
              <CollabTourSection vrmRef={vrmRef} />
            </Animated.View>

            {/* ─── Tour Routes ─── */}
            {routes.length > 0 && (
              <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.section}>
                <SectionHeader title="游览路线" subtitle="TOUR ROUTES" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.routesScroll}
                  snapToInterval={ROUTE_CARD_W + 12}
                  decelerationRate="fast"
                >
                  {routes.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      onPress={() => router.push(`/routes/${route.id}`)}
                    />
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* ─── Category Navigation ─── */}
            <Animated.View entering={FadeInUp.delay(300).duration(500)}>
              <QuickNavSection spots={spots} router={router} />
            </Animated.View>

            {/* ─── Featured Spots Auto-Carousel ─── */}
            {carouselSpots.length > 0 && (
              <Animated.View entering={FadeInUp.delay(400).duration(500)}>
                <View style={styles.featHead}>
                  <SectionHeader title="精选景点" subtitle="FEATURED" />
                  <Pressable
                    style={styles.seeAllBtn}
                    onPress={() => router.push('/attractions')}
                  >
                    <Text style={styles.seeAllText}>全部 →</Text>
                  </Pressable>
                </View>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featScroll}
                  snapToInterval={CARD_W + CARD_GAP}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onScrollBeginDrag={pauseCarousel}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP));
                    setCarouselIdx(Math.max(0, Math.min(idx, carouselSpots.length - 1)));
                    resumeCarousel();
                  }}
                >
                  {carouselSpots.map((spot, idx) => (
                    <Pressable
                      key={spot.id}
                      style={({ pressed }) => [
                        styles.featSpotCard,
                        idx === 0 && { marginLeft: 16 },
                        idx === carouselSpots.length - 1 && { marginRight: 16 },
                        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => router.push(`/attractions/${spot.id}`)}
                    >
                      <View style={styles.featSpotImg}>
                        {SPOT_IMAGES[spot.id] ? (
                          <Image source={SPOT_IMAGES[spot.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
                        ) : (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.primaryBg }]} />
                        )}
                        <View style={styles.featSpotOverlay} />
                        <View style={styles.featSpotInfo}>
                          <Text style={styles.featSpotNameTxt} numberOfLines={1}>{spot.name}</Text>
                          {spot.category && (
                            <Text style={styles.featSpotCat}>{spot.category}</Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
                {/* Pagination dots */}
                <View style={styles.dotsRow}>
                  {carouselSpots.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === carouselIdx && styles.dotActive]}
                    />
                  ))}
                </View>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <VRMFloating ref={vrmRef} position="bottom-right" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1 },

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
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  typeBadge: {
    width: 40, height: 40, borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  typeIcon: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: Colors.ink, letterSpacing: 1 },
  cardMeta: { fontSize: 11, color: Colors.gray400, marginTop: 3 },
  cardDesc: { fontSize: 12, color: Colors.gray500, lineHeight: 18, marginBottom: 10 },
  cardFooter: {
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    paddingTop: 8, alignItems: 'flex-end',
  },
  cardCta: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
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
