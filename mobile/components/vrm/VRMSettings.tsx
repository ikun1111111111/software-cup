import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { COSTUMES, ALL_COSTUME_IDS } from '@/constants/costumeMap';

export type VoiceMode = 'silent' | 'browser' | 'tts';

interface VRMSettingsProps {
  visible: boolean;
  onClose: () => void;
  selectedCostume: string;
  onCostumeChange: (id: string) => void;
  voiceMode: VoiceMode;
  onVoiceModeChange: (mode: VoiceMode) => void;
}

const VOICE_MODES: { id: VoiceMode; label: string; desc: string }[] = [
  { id: 'silent', label: '纯演示', desc: '无声音，只看动作表情' },
  { id: 'browser', label: '浏览器语音', desc: '使用系统TTS' },
  { id: 'tts', label: '后端TTS', desc: '需要后端服务' },
];

const DEMO_TEXTS = [
  '你好！欢迎来到灵山景区，我是你的数字人导游。',
  '灵山梵宫是景区的核心景点，建筑气势恢宏。',
  '灵山大佛高八十八米，是世界上最高的青铜佛像之一。',
  '每年春节，灵山景区都会举办盛大的庙会活动。',
];

export default function VRMSettings({
  visible,
  onClose,
  selectedCostume,
  onCostumeChange,
  voiceMode,
  onVoiceModeChange,
}: VRMSettingsProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>数字人设置</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 服装选择 */}
            <Text style={styles.sectionTitle}>服装选择</Text>
            <View style={styles.costumeGrid}>
              {ALL_COSTUME_IDS.map((id) => {
                const c = COSTUMES[id];
                const active = selectedCostume === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.costumeBtn, active && styles.costumeBtnActive]}
                    onPress={() => onCostumeChange(id)}
                  >
                    <View style={[styles.costumeSwatch, { backgroundColor: c.color }]} />
                    <Text style={[styles.costumeName, active && styles.costumeNameActive]}>
                      {c.name}
                    </Text>
                    <Text style={styles.costumeDesc}>{c.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 语音模式 */}
            <Text style={styles.sectionTitle}>语音模式</Text>
            <View style={styles.modeRow}>
              {VOICE_MODES.map((m) => {
                const active = voiceMode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                    onPress={() => onVoiceModeChange(m.id)}
                  >
                    <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                      {m.label}
                    </Text>
                    <Text style={styles.modeDesc}>{m.desc}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 功能说明 */}
            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>演示内容</Text>
              <Text style={styles.featureItem}>唇形同步 — 嘴巴跟随节奏开合</Text>
              <Text style={styles.featureItem}>表情变化 — 根据文本情感切换表情</Text>
              <Text style={styles.featureItem}>头部点头 — 说话时的自然点头动作</Text>
              <Text style={styles.featureItem}>手臂微动 — 自然的手势摆动</Text>
              <Text style={styles.featureItem}>身体摇摆 — 脊柱轻微晃动</Text>
            </View>
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>完成</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 10,
    letterSpacing: 1,
  },
  costumeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  costumeBtn: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  costumeBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  costumeSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 6,
  },
  costumeName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 2,
  },
  costumeNameActive: {
    color: Colors.accent,
  },
  costumeDesc: {
    fontSize: 10,
    color: Colors.gray400,
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 2,
  },
  modeLabelActive: {
    color: Colors.accent,
  },
  modeDesc: {
    fontSize: 10,
    color: Colors.gray400,
    textAlign: 'center',
  },
  featureBox: {
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 22,
  },
  closeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
