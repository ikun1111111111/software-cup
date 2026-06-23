import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Audio from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/spacing';

const { width: SCREEN_W } = Dimensions.get('window');

// Safe Haptics wrapper - no-op on web
const isNative = Platform.OS !== 'web';
const haptic = {
  impact: (style: any = Haptics.ImpactFeedbackStyle.Light) => {
    if (isNative) Haptics.impactAsync(style).catch(() => {});
  },
  notification: (type: any = Haptics.NotificationFeedbackType.Success) => {
    if (isNative) Haptics.notificationAsync(type).catch(() => {});
  },
};

export type MomentMode = 'photo' | 'write' | 'voice' | 'capsule';

export interface MomentResult {
  mode: MomentMode;
  text: string;
  photoUri?: string;
  voiceUri?: string;
  voiceDuration?: number;
  mood?: string;
  spotName?: string;
  spotId?: string;
  // Capsule fields
  capsuleTitle?: string;
  capsuleUnlockDays?: number;
}

interface Props {
  visible: boolean;
  spotName: string;
  spotId: string;
  defaultMode?: MomentMode;
  onClose: () => void;
  onSubmit: (result: MomentResult) => void;
  loading?: boolean;
}

const MOODS = [
  { key: 'happy', emoji: '😊', label: '开心' },
  { key: 'calm', emoji: '😌', label: '平静' },
  { key: 'excited', emoji: '', label: '兴奋' },
  { key: 'thoughtful', emoji: '🤔', label: '沉思' },
  { key: 'peaceful', emoji: '🧘', label: '宁静' },
  { key: 'touched', emoji: '🥹', label: '感动' },
];

const CAPSULE_DAYS = [7, 30, 90, 365];

export default function MemoryMomentModal({
  visible,
  spotName,
  spotId,
  defaultMode = 'photo',
  onClose,
  onSubmit,
  loading = false,
}: Props) {
  const [mode, setMode] = useState<MomentMode>(defaultMode);
  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | undefined>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [capsuleTitle, setCapsuleTitle] = useState('给未来的自己');
  const [capsuleDays, setCapsuleDays] = useState(30);

  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setMode(defaultMode);
      setText('');
      setSelectedMood(undefined);
      setPhotoUri(null);
      setRecordedUri(null);
      setRecordDuration(0);
      setCapsuleTitle('给未来的自己');
      setCapsuleDays(30);
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
      // Stop recording if active
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [visible, defaultMode]);

  // ─── Photo ───
  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      haptic.notification();
    }
  }, []);

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      haptic.impact();
    }
  }, []);

  // ─── Voice ───
  const startRecording = useCallback(async () => {
    try {
      const { status } = await (Audio as any).requestPermissionsAsync();
      if (status !== 'granted') return;

      await (Audio as any).setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await (Audio as any).Recording.createAsync(
        (Audio as any).RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setRecording(true);
      setRecordDuration(0);
      haptic.impact(Haptics.ImpactFeedbackStyle.Medium);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecordedUri(uri);
      setRecording(false);
      haptic.notification();
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Submit ───
  const handleSubmit = useCallback(() => {
    const result: MomentResult = {
      mode,
      text: text.trim() || (mode === 'photo' ? '在此留下了美好瞬间' : ''),
      spotName,
      spotId,
      mood: selectedMood,
    };

    if (mode === 'photo' && photoUri) {
      result.photoUri = photoUri;
    }
    if (mode === 'voice' && recordedUri) {
      result.voiceUri = recordedUri;
      result.voiceDuration = recordDuration;
    }
    if (mode === 'capsule') {
      result.capsuleTitle = capsuleTitle.trim() || '给未来的自己';
      result.capsuleUnlockDays = capsuleDays;
    }

    if (mode === 'voice' && !recordedUri) {
      return; // Must record first
    }
    if (mode === 'photo' && !photoUri && !text.trim()) {
      return; // Must have photo or text
    }

    haptic.notification();
    onSubmit(result);
  }, [mode, text, photoUri, recordedUri, recordDuration, selectedMood, spotName, spotId, capsuleTitle, capsuleDays, onSubmit]);

  const canSubmit = (() => {
    if (loading) return false;
    switch (mode) {
      case 'photo': return !!photoUri || !!text.trim();
      case 'write': return !!text.trim();
      case 'voice': return !!recordedUri;
      case 'capsule': return !!text.trim();
      default: return false;
    }
  })();

  const TABS: { key: MomentMode; icon: string; label: string }[] = [
    { key: 'photo', icon: '📷', label: '拍照' },
    { key: 'write', icon: '✍️', label: '感受' },
    { key: 'voice', icon: '🎤', label: '语音' },
    { key: 'capsule', icon: '', label: '胶囊' },
  ];

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFillObject}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerSpot}>{spotName}</Text>
              <Text style={styles.headerSub}>记录此刻</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {/* Mode Tabs */}
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [
                  styles.tab,
                  mode === tab.key && styles.tabActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => {
                  setMode(tab.key);
                  haptic.impact();
                }}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[
                  styles.tabLabel,
                  mode === tab.key && styles.tabLabelActive,
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Content Area */}
          <View style={styles.content}>
            {/* Photo Mode */}
            {mode === 'photo' && (
              <View style={styles.photoArea}>
                {photoUri ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photoImage} />
                    <Pressable
                      style={styles.photoRemoveBtn}
                      onPress={() => setPhotoUri(null)}
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.photoActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.photoActionBtn,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={handleTakePhoto}
                    >
                      <Text style={styles.photoActionIcon}></Text>
                      <Text style={styles.photoActionText}>拍照</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.photoActionBtn,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={handlePickPhoto}
                    >
                      <Text style={styles.photoActionIcon}>🖼️</Text>
                      <Text style={styles.photoActionText}>相册</Text>
                    </Pressable>
                  </View>
                )}

                {/* Photo caption */}
                <TextInput
                  style={styles.captionInput}
                  placeholder="给这张照片写一句话..."
                  placeholderTextColor={Colors.gray400}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Write Mode */}
            {mode === 'write' && (
              <View style={styles.writeArea}>
                <TextInput
                  style={styles.writeInput}
                  placeholder={`在${spotName}，你想说些什么...`}
                  placeholderTextColor={Colors.gray400}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{text.length} 字</Text>
              </View>
            )}

            {/* Voice Mode */}
            {mode === 'voice' && (
              <View style={styles.voiceArea}>
                {recordedUri ? (
                  <View style={styles.voiceRecorded}>
                    <Text style={styles.voiceRecordedIcon}></Text>
                    <Text style={styles.voiceRecordedText}>
                      录音完成 · {formatDuration(recordDuration)}
                    </Text>
                    <Pressable
                      style={styles.voiceRedoBtn}
                      onPress={() => {
                        setRecordedUri(null);
                        setRecordDuration(0);
                      }}
                    >
                      <Text style={styles.voiceRedoText}>重新录制</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.voiceRecordArea}>
                    {recording && (
                      <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>
                          录音中 · {formatDuration(recordDuration)}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.recordBtn,
                        recording && styles.stopBtn,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
                      ]}
                      onPress={recording ? stopRecording : startRecording}
                    >
                      <Text style={styles.recordBtnText}>
                        {recording ? '⏹ 停止' : ' 开始录音'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Voice caption */}
                <TextInput
                  style={styles.captionInput}
                  placeholder="补充说明（可选）..."
                  placeholderTextColor={Colors.gray400}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Capsule Mode */}
            {mode === 'capsule' && (
              <View style={styles.capsuleArea}>
                <TextInput
                  style={styles.capsuleTitleInput}
                  placeholder="胶囊标题"
                  placeholderTextColor={Colors.gray400}
                  value={capsuleTitle}
                  onChangeText={setCapsuleTitle}
                />
                <TextInput
                  style={styles.capsuleContentInput}
                  placeholder="写给未来的自己，在灵山胜境的这一刻..."
                  placeholderTextColor={Colors.gray400}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <Text style={styles.capsuleDaysLabel}>多久后打开？</Text>
                <View style={styles.capsuleDaysRow}>
                  {CAPSULE_DAYS.map((days) => (
                    <Pressable
                      key={days}
                      style={({ pressed }) => [
                        styles.capsuleDayBtn,
                        capsuleDays === days && styles.capsuleDayBtnActive,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setCapsuleDays(days)}
                    >
                      <Text style={[
                        styles.capsuleDayText,
                        capsuleDays === days && styles.capsuleDayTextActive,
                      ]}>
                        {days < 30 ? `${days}天` : days < 365 ? `${days / 30}个月` : '1年'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Mood Selection (shared across modes except capsule) */}
            {mode !== 'capsule' && (
              <View style={styles.moodSection}>
                <Text style={styles.moodLabel}>此刻心情</Text>
                <View style={styles.moodRow}>
                  {MOODS.map((mood) => (
                    <Pressable
                      key={mood.key}
                      style={({ pressed }) => [
                        styles.moodBtn,
                        selectedMood === mood.key && styles.moodBtnActive,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => {
                        setSelectedMood(selectedMood === mood.key ? undefined : mood.key);
                        haptic.impact();
                      }}
                    >
                      <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                      <Text style={[
                        styles.moodLabel2,
                        selectedMood === mood.key && styles.moodLabel2Active,
                      ]}>
                        {mood.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
                pressed && canSubmit && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'capsule' ? ' 封存胶囊' : '✨ 记录此刻'}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {},
  headerSpot: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.gray400,
    padding: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.primaryBg,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 13,
    color: Colors.gray500,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Content
  content: {
    padding: 16,
    flex: 1,
  },

  // Photo
  photoArea: { gap: 12 },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  photoActionIcon: { fontSize: 24 },
  photoActionText: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  photoPreview: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 8,
    maxHeight: 200,
  },
  photoImage: {
    width: '100%',
    height: 200,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  captionInput: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 22,
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  // Write
  writeArea: {},
  writeInput: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    fontFamily: 'LongCang',
    color: Colors.ink,
    lineHeight: 26,
    minHeight: 160,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  charCount: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'right',
    marginTop: 4,
  },

  // Voice
  voiceArea: { gap: 12 },
  voiceRecordArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e74c3c',
  },
  recordingText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },
  recordBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  stopBtn: {
    backgroundColor: '#e74c3c',
    shadowColor: '#e74c3c',
  },
  recordBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  voiceRecorded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.lg,
    marginBottom: 8,
  },
  voiceRecordedIcon: { fontSize: 24 },
  voiceRecordedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  voiceRedoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#fff',
  },
  voiceRedoText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Capsule
  capsuleArea: { gap: 12 },
  capsuleTitleInput: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  capsuleContentInput: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 14,
    fontFamily: 'LongCang',
    color: Colors.ink,
    lineHeight: 26,
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  capsuleDaysLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 4,
  },
  capsuleDaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  capsuleDayBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  capsuleDayBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  capsuleDayText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '500',
  },
  capsuleDayTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },

  // Mood
  moodSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  moodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  moodEmoji: { fontSize: 16 },
  moodLabel2: {
    fontSize: 12,
    color: Colors.gray500,
  },
  moodLabel2Active: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  submitBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
