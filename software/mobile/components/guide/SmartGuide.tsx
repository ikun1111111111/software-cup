import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import InlineModal from '@/components/ui/InlineModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { Colors } from '@/constants/colors';
import { VRMManager } from '@/components/vrm/VRMManager';
import { useGuide } from '@/hooks/useGuide';
import { matchPageGuide, PageGuideConfig } from '@/config/pageGuide';
import GuideToast from './GuideToast';
import RouteCard from './RouteCard';
import NarrationSheet, { NarrationContent } from './NarrationSheet';
import GuideSettings, { GuidePreferences } from './GuideSettings';
import { recordRejection, isInCooldown } from '@/utils/rejectionCooldown';

type GuideState = 'prompt' | 'speaking' | 'question' | 'idle' | 'dismissed' | 'route' | 'route-pending';

const DISMISS_PREFIX = 'guide_dismissed_v1_';

function detectEmotion(text: string): 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised' {
  if (/[开心高兴棒好赞喜欢欢迎精彩美好]/.test(text)) return 'happy';
  if (/[抱歉遗憾难过问题错]/.test(text)) return 'sad';
  if (/[？?什么为什么怎么]/.test(text)) return 'relaxed';
  if (/[！!哇惊讶]/.test(text)) return 'surprised';
  return 'neutral';
}

/**
 * 智能向导系统（移动端）：
 *  - 状态机: prompt → speaking → question → idle
 *  - ProactiveStrategy 提示：轻提示卡片 + 后端心跳
 *  - 讲解模式：触发 VRM speak + 显示文本气泡
 *  - 对话模式：SSE 通信、轻量级 FAQ / 后端 chat 集成
 *  - 空闲模式：再听一次 / 继续提问
 */
export const SmartGuide: React.FC = () => {
  const pathname = usePathname();
  const config: PageGuideConfig | null = matchPageGuide(pathname);

  const [guideState, setGuideState] = useState<GuideState>('prompt');
  const [inputText, setInputText] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [state, actions] = useGuide();
  const { messages, isLoading, error, currentPrompt, currentRoute, narration, quickQuestions } = state;

  // 初始化：进入页面拉一次后端状态
  useEffect(() => {
    if (!config) return;
    actions.init({});
  }, [config?.pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 后端推送讲解文本时，驱动 VRM 说话
  useEffect(() => {
    if (state.status === 'narrating' && narration?.text) {
      VRMManager.speak(narration.text, detectEmotion(narration.text));
      setGuideState('speaking');
      const dur = Math.max(3000, narration.text.length * 150);
      setTimeout(() => {
        VRMManager.stopSpeaking();
        setGuideState('idle');
      }, dur);
    }
  }, [state.status, narration?.text]);

  // 后端推送路线 → 显示路线卡片
  useEffect(() => {
    if (state.status === 'free' && currentRoute && guideState !== 'route') {
      setGuideState('route');
    }
  }, [state.status, currentRoute, guideState]);

  // 检测本页面是否曾被用户关闭
  useEffect(() => {
    if (!config) return;
    AsyncStorage.getItem(`${DISMISS_PREFIX}${config.pageId}`).then((val) => {
      if (val === '1') setGuideState('dismissed');
    });
  }, [config]);

  // autoSpeak
  useEffect(() => {
    if (config?.autoSpeak && guideState === 'prompt' && config.welcomeText) {
      const timer = setTimeout(() => handleSpeak(), 800);
      return () => clearTimeout(timer);
    }
  }, [config, guideState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpeak = useCallback(() => {
    if (!config) return;
    VRMManager.speak(config.welcomeText, 'neutral');
    setGuideState('speaking');
    const dur = Math.max(3000, config.welcomeText.length * 150);
    setTimeout(() => {
      VRMManager.stopSpeaking();
      setGuideState('idle');
    }, dur);
  }, [config]);

  const handleDismiss = useCallback(() => {
    setGuideState('dismissed');
    if (config) AsyncStorage.setItem(`${DISMISS_PREFIX}${config.pageId}`, '1');
  }, [config]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setQuestionsAsked((q) => q + 1);
    setGuideState('question');
    actions.sendQuestion(text);
  }, [inputText, actions.sendQuestion]);

  const handleQuick = useCallback((q: string) => {
    setQuestionsAsked((c) => c + 1);
    setGuideState('question');
    actions.sendQuestion(q);
  }, [actions.sendQuestion]);

  // 主动提示操作（集成拒绝冷却）
  const onAcceptPrompt = useCallback(async () => {
    if (currentPrompt) {
      const promptType = currentPrompt.type as 'nearby' | 'idle' | 'detour';
      const inCooldown = await isInCooldown(state.sessionId, promptType);
      if (inCooldown) {
        console.log('提示仍在冷却期，不显示');
        return;
      }
    }
    actions.acceptPrompt();
  }, [actions.acceptPrompt, currentPrompt, state.sessionId]);

  const onDismissPrompt = useCallback(async () => {
    if (currentPrompt) {
      const promptType = currentPrompt.type as 'nearby' | 'idle' | 'detour';
      await recordRejection(state.sessionId, promptType);
    }
    actions.dismissPrompt();
  }, [actions.dismissPrompt, currentPrompt, state.sessionId]);

  const onAcceptRoute = useCallback(() => {
    setGuideState('idle');
  }, []);

  const onDismissRoute = useCallback(() => {
    setGuideState('idle');
  }, []);

  // 讲解模式
  const handleStartNarration = useCallback((content: NarrationContent) => {
    setGuideState('speaking');
    // NarrationSheet 会通过 Modal 显示
  }, []);

  // 偏好设置
  const handleSavePreferences = useCallback((prefs: GuidePreferences) => {
    console.log('保存偏好设置:', prefs);
    // 这里可以调用后端 API 保存
  }, []);

  if (!config || config.guideType === 'none') return null;

  // 关闭态：不再显示浮动按钮，VRM模型本身即为交互入口
  if (guideState === 'dismissed') {
    return null;
  }

  // 路线推荐卡片
  if (guideState === 'route' && currentRoute) {
    return (
      <RouteCard
        route={currentRoute}
        reason="根据您的偏好推荐"
        onAccept={onAcceptRoute}
        onDismiss={onDismissRoute}
      />
    );
  }

  return (
    <>
      {/* 后端主动提示（轻提示） */}
      {currentPrompt && (
        <GuideToast
          prompt={currentPrompt}
          onAccept={onAcceptPrompt}
          onDismiss={onDismissPrompt}
        />
      )}

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🤖</Text>
            <Text style={styles.headerTitle}>小灵 · 智能导览</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setShowSettings(true)}
              style={styles.settingsButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="打开导览设置"
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </Pressable>
            <Pressable
              onPress={handleDismiss}
              style={styles.closeButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="关闭智能导览"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {guideState === 'prompt' && (
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>{config.guidePrompt}</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [styles.speakButton, pressed && { opacity: 0.85 }]}
                  onPress={handleSpeak}
                  accessibilityRole="button"
                  accessibilityLabel="播放当前页面讲解"
                >
                  <Text style={styles.speakIcon}>▶</Text>
                  <Text style={styles.speakText}>需要讲解</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.questionButton, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    setGuideState('question');
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="向智能导览提问"
                >
                  <Text style={styles.questionIcon}>?</Text>
                  <Text style={styles.questionText}>随便问问</Text>
                </Pressable>
              </View>
            </View>
          )}

          {guideState === 'speaking' && (
            <View style={styles.speakingBox}>
              <View style={styles.soundBars}>
                {[0, 1, 2].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.soundBar,
                      { height: 6 + Math.sin(Date.now() / 200 + i) * 4 },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.speakingText}>
                {narration?.text ? narration.text.slice(0, 30) + '...' : '正在讲解...'}
              </Text>
            </View>
          )}

          {guideState === 'question' && (
            <View style={styles.questionBox}>
              <ScrollView style={styles.messageList} showsVerticalScrollIndicator={false}>
                {messages.length === 0 ? (
                  <Text style={styles.emptyText}>有什么关于当前页面的问题？</Text>
                ) : (
                  messages.slice(-8).map((msg, i) => (
                    <View
                      key={`${msg.role}-${i}-${msg.content.length}`}
                      style={[
                        styles.messageBubble,
                        msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          msg.role === 'user' ? styles.userText : styles.assistantText,
                        ]}
                      >
                        {msg.content || (msg.role === 'assistant' && isLoading ? '正在回答...' : '')}
                      </Text>
                    </View>
                  ))
                )}
                {isLoading && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>小灵正在思考...</Text>
                  </View>
                )}
              </ScrollView>

              {messages.length === 0 && quickQuestions.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickQuestions}
                  contentContainerStyle={styles.quickQuestionsContent}
                >
                  {quickQuestions.map((q) => (
                    <Pressable
                      key={q}
                      style={({ pressed }) => [styles.quickQuestionChip, pressed && { opacity: 0.7 }]}
                      onPress={() => handleQuick(q)}
                      accessibilityRole="button"
                      accessibilityLabel={q}
                    >
                      <Text style={styles.quickQuestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSend}
                  placeholder="输入问题..."
                  placeholderTextColor={Colors.gray400}
                  editable={!isLoading}
                  returnKeyType="send"
                  accessibilityLabel="输入导览问题"
                />
                <Pressable
                  style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !inputText.trim() || isLoading }}
                  accessibilityLabel="发送导览问题"
                >
                  <Text style={styles.sendIcon}>↑</Text>
                </Pressable>
              </View>
            </View>
          )}

          {guideState === 'idle' && (
            <View style={styles.idleBox}>
              <Pressable
                style={styles.idleButton}
                onPress={handleSpeak}
                accessibilityRole="button"
                accessibilityLabel="再听一次讲解"
              >
                <Text style={styles.idleButtonText}>再听一次</Text>
              </Pressable>
              <Pressable
                style={styles.idleButton}
                onPress={() => {
                  setGuideState('question');
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                accessibilityRole="button"
                accessibilityLabel="继续提问"
              >
                <Text style={styles.idleButtonText}>继续提问</Text>
              </Pressable>
            </View>
          )}
        </View>

        {questionsAsked > 0 && (
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>已提问 {questionsAsked} 次</Text>
          </View>
        )}
      </View>

      {/* 偏好设置 Modal */}
      <InlineModal visible={showSettings} animationType="slide">
        <GuideSettings
          onSave={handleSavePreferences}
          onClose={() => setShowSettings(false)}
        />
      </InlineModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 300,
    backgroundColor: 'rgba(253, 251, 247, 0.97)',
    borderRadius: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(106, 156, 137, 0.15)',
    zIndex: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(106, 156, 137, 0.95)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 14 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingsButton: { minWidth: 44, minHeight: 44, padding: 4, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  closeButton: { minWidth: 44, minHeight: 44, padding: 4, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  content: { minHeight: 80 },

  promptBox: { padding: 14 },
  promptText: { fontSize: 13, lineHeight: 20, color: Colors.gray600, marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  speakButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, minHeight: 44, borderRadius: 8, backgroundColor: 'rgba(106, 156, 137, 0.95)',
  },
  speakIcon: { fontSize: 10, color: '#fff' },
  speakText: { fontSize: 12, fontWeight: '600', color: '#fff', letterSpacing: 1 },
  questionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, minHeight: 44, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.3)', backgroundColor: 'transparent',
  },
  questionIcon: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  questionText: { fontSize: 12, fontWeight: '600', color: Colors.primary, letterSpacing: 1 },

  speakingBox: { padding: 16, alignItems: 'center' },
  soundBars: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  soundBar: { width: 6, borderRadius: 3, backgroundColor: Colors.primary },
  speakingText: { fontSize: 12, color: Colors.primary },

  questionBox: { padding: 10 },
  messageList: { maxHeight: 180, minHeight: 60, paddingHorizontal: 4 },
  emptyText: { fontSize: 12, color: Colors.gray400, textAlign: 'center', paddingVertical: 8 },
  messageBubble: {
    maxWidth: '85%', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  assistantBubble: {
    alignSelf: 'flex-start', backgroundColor: Colors.gray100,
    borderLeftWidth: 2, borderLeftColor: Colors.primary,
  },
  messageText: { fontSize: 12, lineHeight: 18 },
  userText: { color: '#fff' },
  assistantText: { color: Colors.ink },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  loadingText: { fontSize: 11, color: Colors.gray500 },
  errorText: { fontSize: 11, color: '#c0392b', paddingHorizontal: 4, marginTop: 4 },

  quickQuestions: { maxHeight: 36, marginBottom: 8 },
  quickQuestionsContent: { paddingHorizontal: 4, gap: 6 },
  quickQuestionChip: {
    paddingVertical: 5, paddingHorizontal: 12, minHeight: 44, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(106,156,137,0.25)', backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  quickQuestionText: { fontSize: 12, color: Colors.primary },

  inputRow: { flexDirection: 'row', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  input: {
    flex: 1, height: 44, paddingHorizontal: 10, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', fontSize: 13, backgroundColor: Colors.surfaceBg,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.gray300 },
  sendIcon: { fontSize: 14, color: '#fff', fontWeight: '600' },

  idleBox: { padding: 12, flexDirection: 'row', gap: 8 },
  idleButton: {
    flex: 1, paddingVertical: 8, minHeight: 44, borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.3)', backgroundColor: 'transparent', alignItems: 'center',
    justifyContent: 'center',
  },
  idleButtonText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  statsBar: { paddingVertical: 4, alignItems: 'center' },
  statsText: { fontSize: 10, color: Colors.gray400 },

  dismissedButton: {
    position: 'absolute', bottom: 100, right: 16, width: 44, height: 44,
    borderRadius: 22, backgroundColor: 'rgba(106,156,137,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, zIndex: 80,
  },
  dismissedIcon: { fontSize: 18 },
});

export default SmartGuide;
