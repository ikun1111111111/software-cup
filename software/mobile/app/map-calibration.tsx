import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// @ts-ignore - AmapView is platform-specific
import AmapView from '@/components/map/AmapView';
import type { AmapViewRef } from '@/components/map/AmapView.shared';
import { LINGSHAN_CENTER } from '@/components/map/AmapView.shared';
import type { Spot } from '@/api/spots';
import { CAT_COLORS } from '@/constants/scenic';
import { Colors } from '@/constants/colors';
import { LINGSHAN_SPOTS } from '@/data/lingshanSpots';
import {
  buildChangedSpotSnippet,
  buildCoordinateSnippet,
  mergeCalibrationCoordinates,
  nudgeCoordinate,
  type CalibrationCoordinates,
  type CalibrationDirection,
  type CalibrationPoint,
} from '@/utils/mapCalibration';

const STEP_OPTIONS = [
  { label: '1m', value: 0.00001 },
  { label: '5m', value: 0.00005 },
  { label: '10m', value: 0.0001 },
];

const sourceSpots = LINGSHAN_SPOTS as Spot[];

function getSpotPoint(spot: Spot | undefined, coordinates: CalibrationCoordinates): CalibrationPoint | null {
  if (!spot || spot.latitude == null || spot.longitude == null) return null;
  return coordinates[spot.id] ?? { latitude: spot.latitude, longitude: spot.longitude };
}

function buildCurrentSnippet(spot: Spot | undefined, point: CalibrationPoint | null) {
  if (!spot || !point) return '';
  return `${spot.id} ${spot.name}\n${buildCoordinateSnippet(point)}`;
}

export default function MapCalibrationScreen() {
  const mapRef = useRef<AmapViewRef>(null);
  const [selectedSpotId, setSelectedSpotId] = useState(sourceSpots[0]?.id ?? '');
  const [coordinates, setCoordinates] = useState<CalibrationCoordinates>({});
  const [step, setStep] = useState(STEP_OPTIONS[1].value);
  const [snippet, setSnippet] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const spots = useMemo(() => mergeCalibrationCoordinates(sourceSpots, coordinates), [coordinates]);
  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) ?? spots[0];
  const selectedSourceSpot = sourceSpots.find((spot) => spot.id === selectedSpot?.id) ?? sourceSpots[0];
  const selectedPoint = getSpotPoint(selectedSpot, coordinates);
  const changedCount = Object.keys(coordinates).length;

  const centerOnPoint = useCallback((point: CalibrationPoint | null, zoom = 17) => {
    if (!point) return;
    mapRef.current?.setCenter(point.latitude, point.longitude, zoom, 'gcj02');
  }, []);

  const handleSelectSpot = useCallback((spot: Spot) => {
    setSelectedSpotId(spot.id);
    centerOnPoint(getSpotPoint(spot, coordinates));
  }, [centerOnPoint, coordinates]);

  const updateSpotPoint = useCallback((spotId: string, point: CalibrationPoint) => {
    setSelectedSpotId(spotId);
    setCoordinates((current) => ({
      ...current,
      [spotId]: point,
    }));
  }, []);

  const handleNudge = useCallback((direction: CalibrationDirection) => {
    if (!selectedSpot || !selectedPoint) return;
    const nextPoint = nudgeCoordinate(selectedPoint, direction, step);
    updateSpotPoint(selectedSpot.id, nextPoint);
    centerOnPoint(nextPoint);
  }, [centerOnPoint, selectedPoint, selectedSpot, step, updateSpotPoint]);

  const resetCurrent = useCallback(() => {
    if (!selectedSpot || !selectedSourceSpot) return;
    setCoordinates((current) => {
      const next = { ...current };
      delete next[selectedSpot.id];
      return next;
    });
    centerOnPoint(
      selectedSourceSpot.latitude == null || selectedSourceSpot.longitude == null
        ? null
        : { latitude: selectedSourceSpot.latitude, longitude: selectedSourceSpot.longitude },
    );
  }, [centerOnPoint, selectedSourceSpot, selectedSpot]);

  const resetAll = useCallback(() => {
    setCoordinates({});
    centerOnPoint(getSpotPoint(selectedSourceSpot, {}));
  }, [centerOnPoint, selectedSourceSpot]);

  const copyText = useCallback(async (text: string) => {
    setSnippet(text);
    if (!text) {
      setCopyStatus('没有可复制内容');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyStatus('当前浏览器不支持自动复制，可手动选择文本');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('已复制');
    } catch {
      setCopyStatus('复制失败，可手动选择文本');
    }
  }, []);

  const copyCurrent = useCallback(() => {
    copyText(buildCurrentSnippet(selectedSpot, selectedPoint));
  }, [copyText, selectedPoint, selectedSpot]);

  const copyChanged = useCallback(() => {
    const text = buildChangedSpotSnippet(sourceSpots, coordinates);
    copyText(text || '暂无改动');
  }, [coordinates, copyText]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.nativeOnly}>
        <Text style={styles.nativeTitle}>地图校准工具仅在 Web 预览中使用</Text>
        <Text style={styles.nativeText}>请在浏览器打开 /map-calibration 后拖拽位点并复制坐标片段。</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Lingshan map calibration</Text>
          <Text style={styles.title}>位点坐标校准</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statValue}>{changedCount}</Text>
          <Text style={styles.statLabel}>已调整</Text>
        </View>
      </View>

      <View style={styles.workspace}>
        <View style={styles.mapPane}>
          <AmapView
            ref={mapRef}
            spots={spots}
            center={LINGSHAN_CENTER}
            zoom={15}
            style={styles.map}
            height={undefined}
            activeSpotId={selectedSpot?.id ?? null}
            onSpotTap={handleSelectSpot}
            calibrationMode
            calibratedCoordinates={coordinates}
            onSpotCoordinateChange={updateSpotPoint}
            showLocationControls={false}
          />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>位点</Text>
            <Text style={styles.panelMeta}>{spots.length} 个</Text>
          </View>

          <ScrollView style={styles.spotList} contentContainerStyle={styles.spotListContent}>
            {spots.map((spot, index) => {
              const active = spot.id === selectedSpot?.id;
              const changed = !!coordinates[spot.id];
              const color = CAT_COLORS[spot.category] || Colors.gray500;
              return (
                <Pressable
                  key={spot.id}
                  style={[styles.spotRow, active && styles.spotRowActive]}
                  onPress={() => handleSelectSpot(spot)}
                >
                  <View style={[styles.spotIndex, { backgroundColor: color }]}>
                    <Text style={styles.spotIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.spotTextWrap}>
                    <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
                    <Text style={styles.spotCoord} numberOfLines={1}>
                      {spot.latitude?.toFixed(6)}, {spot.longitude?.toFixed(6)}
                    </Text>
                  </View>
                  {changed && <Text style={styles.changedBadge}>改</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.editor}>
            <Text style={styles.editorTitle}>{selectedSpot?.name ?? '未选择位点'}</Text>
            <Text style={styles.editorCoord}>
              {selectedPoint
                ? `${selectedPoint.latitude.toFixed(6)}, ${selectedPoint.longitude.toFixed(6)}`
                : '无坐标'}
            </Text>

            <View style={styles.stepRow}>
              {STEP_OPTIONS.map((item) => (
                <Pressable
                  key={item.label}
                  style={[styles.stepButton, step === item.value && styles.stepButtonActive]}
                  onPress={() => setStep(item.value)}
                >
                  <Text style={[styles.stepButtonText, step === item.value && styles.stepButtonTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.nudgeGrid}>
              <View />
              <Pressable style={styles.nudgeButton} onPress={() => handleNudge('north')}>
                <Text style={styles.nudgeText}>↑</Text>
              </Pressable>
              <View />
              <Pressable style={styles.nudgeButton} onPress={() => handleNudge('west')}>
                <Text style={styles.nudgeText}>←</Text>
              </Pressable>
              <View style={styles.nudgeCenter}>
                <Text style={styles.nudgeCenterText}>微调</Text>
              </View>
              <Pressable style={styles.nudgeButton} onPress={() => handleNudge('east')}>
                <Text style={styles.nudgeText}>→</Text>
              </Pressable>
              <View />
              <Pressable style={styles.nudgeButton} onPress={() => handleNudge('south')}>
                <Text style={styles.nudgeText}>↓</Text>
              </Pressable>
              <View />
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={resetCurrent}>
                <Text style={styles.secondaryButtonText}>重置当前</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={resetAll}>
                <Text style={styles.secondaryButtonText}>全部重置</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.primaryButton} onPress={copyCurrent}>
                <Text style={styles.primaryButtonText}>复制当前</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={copyChanged}>
                <Text style={styles.primaryButtonText}>复制全部改动</Text>
              </Pressable>
            </View>

            <Text style={styles.copyStatus}>{copyStatus || '拖拽地图标记或使用方向键微调'}</Text>
            <Text selectable style={styles.snippet}>
              {snippet || buildCurrentSnippet(selectedSpot, selectedPoint)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: '#F4F0E8',
    padding: 20,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#D8D0C3',
    paddingBottom: 16,
  },
  kicker: {
    color: Colors.gray600,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    marginTop: 4,
    color: Colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  headerStats: {
    minWidth: 86,
    alignItems: 'flex-end',
  },
  statValue: {
    color: Colors.accent,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  statLabel: {
    color: Colors.gray600,
    fontSize: 12,
    fontWeight: '700',
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    minHeight: 0,
  },
  mapPane: {
    flex: 1,
    minWidth: 560,
    borderWidth: 1,
    borderColor: '#D8D0C3',
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
  },
  map: {
    flex: 1,
    borderRadius: 0,
  },
  panel: {
    width: 420,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#D8D0C3',
  },
  panelHeader: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E6DED2',
  },
  panelTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  panelMeta: {
    color: Colors.gray500,
    fontSize: 12,
    fontWeight: '700',
  },
  spotList: {
    maxHeight: 280,
  },
  spotListContent: {
    padding: 10,
    gap: 8,
  },
  spotRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EFE8DD',
    backgroundColor: '#FFFDF8',
  },
  spotRowActive: {
    borderColor: Colors.accent,
    backgroundColor: '#FFF4ED',
  },
  spotIndex: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  spotTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  spotName: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  spotCoord: {
    marginTop: 2,
    color: Colors.gray500,
    fontSize: 11,
  },
  changedBadge: {
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 3,
    color: '#fff',
    backgroundColor: Colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  editor: {
    borderTopWidth: 1,
    borderTopColor: '#E6DED2',
    padding: 14,
  },
  editorTitle: {
    color: Colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  editorCoord: {
    marginTop: 4,
    color: Colors.gray600,
    fontSize: 13,
    fontWeight: '700',
  },
  stepRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  stepButton: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D0C3',
    backgroundColor: '#F8F3EA',
  },
  stepButtonActive: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  stepButtonText: {
    color: Colors.gray600,
    fontSize: 12,
    fontWeight: '900',
  },
  stepButtonTextActive: {
    color: '#fff',
  },
  nudgeGrid: {
    marginTop: 14,
    alignSelf: 'center',
    width: 174,
    height: 174,
    display: 'grid' as any,
    gridTemplateColumns: '54px 54px 54px' as any,
    gridTemplateRows: '54px 54px 54px' as any,
    gap: 6,
  },
  nudgeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFC5B8',
    backgroundColor: '#F8F3EA',
  },
  nudgeText: {
    color: Colors.ink,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
  },
  nudgeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE5D6',
  },
  nudgeCenterText: {
    color: Colors.gray600,
    fontSize: 12,
    fontWeight: '900',
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFC5B8',
    backgroundColor: '#FFFDF8',
  },
  secondaryButtonText: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  copyStatus: {
    marginTop: 12,
    color: Colors.gray600,
    fontSize: 12,
    fontWeight: '700',
  },
  snippet: {
    marginTop: 8,
    minHeight: 72,
    padding: 10,
    color: Colors.ink,
    backgroundColor: '#F1EBDD',
    borderWidth: 1,
    borderColor: '#D8D0C3',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  nativeOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.paper,
  },
  nativeTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  nativeText: {
    marginTop: 8,
    color: Colors.gray600,
    fontSize: 14,
    textAlign: 'center',
  },
});
