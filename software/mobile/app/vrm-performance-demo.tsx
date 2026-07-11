/**
 * VRM 数字人表现包 Demo
 * 验证 8 个 PerformancePreset 的表情、动作、注视和语音是否稳定可复现。
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { VRMView } from '@/components/vrm/VRMView';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import {
  PERFORMANCE_PRESETS,
  type PerformancePreset,
} from '@/constants/vrmPerformancePresets';

export default function VrmPerformanceDemoPage() {
  const router = useRouter();
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [loop, setLoop] = useState(false);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action,
    actionDurationMs,
    headRotation,
    speak,
    stop,
    setExpression,
    playAction,
  } = useDigitalHumanDriver('tts');

  const playPreset = useCallback((preset: PerformancePreset) => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    setActivePresetId(preset.id);

    // 1. 设置表情
    setExpression(preset.expression.emotion);

    // 2. 设置动作（减少动效模式下跳过大动作）
    const skipBigActions = reduceMotion && ['wave', 'showcase'].includes(preset.primaryAction);
    if (!skipBigActions) {
      playAction(preset.primaryAction, preset.actionDurationMs);
    }

    // 3. 语音播报（同时驱动口型和字幕）
    speak(preset.speechText, {
      emotion: preset.expression.emotion,
      action: skipBigActions ? 'none' : preset.primaryAction,
      actionDurationMs: preset.actionDurationMs,
      durationMs: preset.expression.durationMs,
    });

    // 4. 循环播放
    if (loop) {
      loopTimerRef.current = setTimeout(() => {
        playPreset(preset);
      }, preset.expression.durationMs + 1000);
    }
  }, [loop, reduceMotion, playAction, setExpression, speak]);

  const handleStop = useCallback(() => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    stop();
    setActivePresetId(null);
    setExpression('neutral');
    playAction('none', 0);
  }, [stop, setExpression, playAction]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>数字人表现包 Demo</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* VRM 舞台 */}
      <View style={styles.stage}>
        <VRMView
          mode="full"
          expression={expression}
          mouthOpen={mouthOpen}
          speaking={isSpeaking}
          action={action}
          actionDuration={actionDurationMs}
          headRotation={headRotation}
          costumeId="festival-spring"
        />
        {/* 字幕 */}
        {subtitle ? (
          <View style={styles.subtitleBar}>
            <Text style={styles.subtitleText}>{subtitle}</Text>
          </View>
        ) : null}
      </View>

      {/* 状态面板 */}
      <View style={styles.statusPanel}>
        <StatusItem label="表情" value={expression} />
        <StatusItem label="动作" value={action} />
        <StatusItem label="口型" value={mouthOpen.toFixed(2)} />
        <StatusItem label="说话" value={isSpeaking ? '是' : '否'} />
      </View>

      {/* 表现包按钮 */}
      <ScrollView style={styles.presetScroll} contentContainerStyle={styles.presetGrid}>
        {PERFORMANCE_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <Pressable
              key={preset.id}
              style={[styles.presetBtn, isActive && styles.presetBtnActive]}
              onPress={() => playPreset(preset)}
            >
              <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
                {preset.label}
              </Text>
              <Text style={styles.presetDesc}>{preset.description}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 控制栏 */}
      <View style={styles.controlBar}>
        <Pressable style={styles.stopBtn} onPress={handleStop}>
          <Text style={styles.stopBtnText}>停止播放</Text>
        </Pressable>
        <View style={styles.toggleRow}>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>减少动效</Text>
            <Switch value={reduceMotion} onValueChange={setReduceMotion} />
          </View>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>循环播放</Text>
            <Switch value={loop} onValueChange={setLoop} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  stage: {
    flex: 1,
    position: 'relative',
  },
  subtitleBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  statusPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  statusValue: {
    color: '#4fc3f7',
    fontSize: 14,
    fontWeight: '600',
  },
  presetScroll: {
    maxHeight: 220,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  presetBtn: {
    width: '46%',
    margin: '2%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(79,195,247,0.15)',
    borderColor: Colors.primary,
  },
  presetLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetLabelActive: {
    color: Colors.primary,
  },
  presetDesc: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stopBtn: {
    backgroundColor: '#e53935',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  toggleLabel: {
    color: '#ccc',
    fontSize: 13,
    marginRight: 6,
  },
});
