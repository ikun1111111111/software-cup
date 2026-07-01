import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { VRMView } from '@/components/vrm/VRMView';
import { useExternalVRMAnimation } from '@/components/vrm/useExternalVRMAnimation';

const BLENDER_WAVE_ANIMATION = require('../assets/animations/blender-wave.glb');

const STATUS_TEXT = {
  idle: '等待播放',
  loading: '正在加载 GLB 动作',
  ready: '动作已准备好',
  playing: '正在播放 Blender 动作',
  error: '动作加载失败',
};

export default function BlenderActionDemoPage() {
  const router = useRouter();
  const {
    mixer,
    status,
    errorMessage,
    clipName,
    play,
    stop,
  } = useExternalVRMAnimation({
    animationModule: BLENDER_WAVE_ANIMATION,
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>Blender 动作 Demo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.stage}>
        <VRMView
          mode="full"
          expression="happy"
          mouthOpen={0}
          speaking={false}
          action="none"
          costumeId="festival-spring"
          externalAnimationMixer={mixer}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>当前文件</Text>
        <Text style={styles.path}>software/mobile/assets/animations/blender-wave.glb</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>状态</Text>
          <Text style={styles.statusValue}>{STATUS_TEXT[status]}</Text>
        </View>

        {clipName ? (
          <Text style={styles.clipText}>动画片段：{clipName}</Text>
        ) : null}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryButton, status === 'loading' && styles.disabledButton]}
            onPress={play}
            disabled={status === 'loading'}
          >
            <Text style={styles.primaryButtonText}>
              {status === 'playing' ? '重新播放' : '播放 Blender 动作'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={stop}>
            <Text style={styles.secondaryButtonText}>停止</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          把 Blender 导出的 GLB 动作覆盖到上面的文件名，然后重启 Expo 或清缓存重新打开这个页面。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101820',
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 64,
    paddingVertical: 8,
  },
  backText: {
    color: '#F6D36B',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#FFF8E7',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 64,
  },
  stage: {
    flex: 1,
    minHeight: 320,
  },
  panel: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    backgroundColor: '#F7F2E7',
    borderTopWidth: 1,
    borderTopColor: 'rgba(246,211,107,0.45)',
  },
  label: {
    color: '#7A5D1A',
    fontSize: 12,
    fontWeight: '800',
  },
  path: {
    marginTop: 4,
    color: '#17212B',
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: '#607080',
    fontSize: 13,
    fontWeight: '700',
  },
  statusValue: {
    color: '#B93D2B',
    fontSize: 14,
    fontWeight: '900',
  },
  clipText: {
    marginTop: 8,
    color: '#324252',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 8,
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B93D2B',
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.58,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    width: 86,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17212B',
  },
  secondaryButtonText: {
    color: '#17212B',
    fontSize: 15,
    fontWeight: '900',
  },
  hint: {
    marginTop: 12,
    color: '#607080',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
