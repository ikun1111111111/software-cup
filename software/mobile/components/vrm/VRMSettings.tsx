import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import InlineModal from '@/components/ui/InlineModal';
import { Colors } from '@/constants/colors';
import { COSTUMES, ALL_COSTUME_IDS } from '@/constants/costumeMap';
import { API_BASE_URL } from '@/api/config';
import type { VoiceConfig } from '@/hooks/useVRMSync';

export type VoiceMode = 'silent' | 'browser' | 'tts';

interface VRMSettingsProps {
  visible: boolean;
  onClose: () => void;
  selectedCostume: string;
  onCostumeChange: (id: string) => void;
  voiceMode: VoiceMode;
  onVoiceModeChange: (mode: VoiceMode) => void;
  voiceConfig?: VoiceConfig;
  onVoiceConfigChange?: (config: VoiceConfig) => void;
}

interface TTSVoiceEntry {
  speaker_id: string;
  description: string;
}

const VOICE_MODES: { id: VoiceMode; label: string; desc: string }[] = [
  { id: 'silent', label: 'Demo', desc: 'No audio, animation only' },
  { id: 'tts', label: 'Alibaba Cloud voice', desc: 'CosyVoice via backend API key' },
];

const DEMO_TEXTS = [
  'Hello, welcome to Lingshan. I am your digital guide.',
  'Lingshan Fan Palace is a core scenic spot with a grand interior.',
  'The Lingshan Grand Buddha is 88 meters tall.',
  'Every Spring Festival, Lingshan hosts major temple fair events.',
];

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  rate: 1,
  pitch: 1,
};

export default function VRMSettings({
  visible,
  onClose,
  selectedCostume,
  onCostumeChange,
  voiceMode,
  onVoiceModeChange,
  voiceConfig = DEFAULT_VOICE_CONFIG,
  onVoiceConfigChange,
}: VRMSettingsProps) {
  const [ttsVoices, setTtsVoices] = useState<Record<string, TTSVoiceEntry>>({});
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/tts/voices`)
      .then((res) => res.json())
      .then((data) => setTtsVoices(data || {}))
      .catch(() => setTtsVoices({}));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      const zhVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('zh'));
      setBrowserVoices(zhVoices.length > 0 ? zhVoices : voices);
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const updateConfig = (patch: Partial<VoiceConfig>) => {
    onVoiceConfigChange?.({ ...voiceConfig, ...patch });
  };

  const adjust = (key: 'rate' | 'pitch', delta: number) => {
    const current = voiceConfig[key] ?? 1;
    const next = Math.round(Math.max(0.5, Math.min(2.0, current + delta)) * 10) / 10;
    updateConfig({ [key]: next });
  };

  const selectedBrowserVoice = browserVoices.find((v) => v.voiceURI === voiceConfig.browserVoiceUri);
  const ttsVoiceIds = Object.keys(ttsVoices);

  return (
    <InlineModal visible={visible} animationType="slide" transparent onClose={onClose}>
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

            {/* 浏览器音色 */}
            {voiceMode === 'browser' && Platform.OS === 'web' && (
              <>
                <Text style={styles.sectionTitle}>浏览器音色</Text>
                {browserVoices.length === 0 ? (
                  <Text style={styles.emptyText}>未检测到浏览器语音</Text>
                ) : (
                  <View style={styles.voiceList}>
                    {browserVoices.map((voice) => {
                      const active = voice.voiceURI === voiceConfig.browserVoiceUri;
                      return (
                        <Pressable
                          key={voice.voiceURI}
                          style={[styles.voiceBtn, active && styles.voiceBtnActive]}
                          onPress={() => updateConfig({ browserVoiceUri: voice.voiceURI })}
                        >
                          <Text style={[styles.voiceName, active && styles.voiceNameActive]}>
                            {voice.name}
                          </Text>
                          <Text style={styles.voiceDesc}>{voice.lang}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {selectedBrowserVoice && (
                  <Text style={styles.selectedHint}>
                    当前：{selectedBrowserVoice.name}
                  </Text>
                )}
              </>
            )}

            {/* 后端音色 */}
            {voiceMode === 'tts' && (
              <>
                <Text style={styles.sectionTitle}>后端音色</Text>
                {ttsVoiceIds.length === 0 ? (
                  <Text style={styles.emptyText}>未获取到后端音色列表</Text>
                ) : (
                  <View style={styles.voiceList}>
                    {ttsVoiceIds.map((id) => {
                      const voice = ttsVoices[id];
                      const active = id === voiceConfig.ttsVoiceId;
                      return (
                        <Pressable
                          key={id}
                          style={[styles.voiceBtn, active && styles.voiceBtnActive]}
                          onPress={() => updateConfig({ ttsVoiceId: id })}
                        >
                          <Text style={[styles.voiceName, active && styles.voiceNameActive]}>
                            {voice.description || id}
                          </Text>
                          <Text style={styles.voiceDesc}>{voice.speaker_id}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* 语速 / 音高 */}
            {voiceMode !== 'silent' && (
              <>
                <Text style={styles.sectionTitle}>语速与音高</Text>
                <View style={styles.adjustRow}>
                  <Text style={styles.adjustLabel}>语速</Text>
                  <Pressable style={styles.adjustBtn} onPress={() => adjust('rate', -0.1)}>
                    <Text style={styles.adjustBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.adjustValue}>{(voiceConfig.rate ?? 1).toFixed(1)}</Text>
                  <Pressable style={styles.adjustBtn} onPress={() => adjust('rate', 0.1)}>
                    <Text style={styles.adjustBtnText}>+</Text>
                  </Pressable>
                </View>
                <View style={styles.adjustRow}>
                  <Text style={styles.adjustLabel}>音高</Text>
                  <Pressable style={styles.adjustBtn} onPress={() => adjust('pitch', -0.1)}>
                    <Text style={styles.adjustBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.adjustValue}>{(voiceConfig.pitch ?? 1).toFixed(1)}</Text>
                  <Pressable style={styles.adjustBtn} onPress={() => adjust('pitch', 0.1)}>
                    <Text style={styles.adjustBtnText}>+</Text>
                  </Pressable>
                </View>
              </>
            )}

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
    </InlineModal>
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
  voiceList: {
    gap: 8,
    marginBottom: 16,
  },
  voiceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  voiceBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  voiceName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 2,
  },
  voiceNameActive: {
    color: Colors.accent,
  },
  voiceDesc: {
    fontSize: 10,
    color: Colors.gray400,
  },
  selectedHint: {
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 20,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adjustLabel: {
    width: 48,
    fontSize: 13,
    color: Colors.ink,
  },
  adjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 18,
    color: Colors.ink,
    fontWeight: '600',
  },
  adjustValue: {
    width: 44,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
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
