import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { Colors } from '@/constants/colors';
import { VRMManager } from '@/components/vrm/VRMManager';
import { useSSE } from '@/hooks/useSSE';
import { useChatStore, Message } from '@/stores/chatStore';
import { matchPageGuide, PageGuideConfig } from '@/config/pageGuide';
import { API_BASE_URL } from '@/api/config';

type GuideState = 'prompt' | 'speaking' | 'question' | 'dismissed' | 'idle';

function detectEmotion(text: string): 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised' {
  if (/[开心高兴棒好赞喜欢欢迎精彩美好]/.test(text)) return 'neutral';
  if (/[抱歉遗憾难过问题错]/.test(text)) return 'sad';
  if (/[？?什么为什么怎么]/.test(text)) return 'relaxed';
  if (/[！!哇惊讶]/.test(text)) return 'surprised';
  return 'neutral';
}

const DISMISS_PREFIX = 'guide_demo_dismissed_';

export const DemoGuide: React.FC = () => {
  const [guideState, setGuideState] = useState<GuideState>('prompt');
  const [inputText, setInputText] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const routeName = usePathname();
  const config = matchPageGuide(routeName);

  const { messages, addMessage, updateMessage, updateMessageStatus, setStreaming, currentSessionId, setCurrentSession, isStreaming, getHistory } = useChatStore();

  // Ensure session
  useEffect(() => {
    if (!currentSessionId) {
      setCurrentSession(`demo_session_${Date.now()}`);
    }
  }, [currentSessionId, setCurrentSession]);

  const { connect } = useSSE({
    onMessage: (msg) => {
      const { messages: latest, updateMessage: upd, updateMessageStatus: updSt } = useChatStore.getState();
      const last = latest[latest.length - 1];
      if (!last) return;

      if (msg.event === 'token') {
        if (last.role === 'assistant') upd(last.id, last.content + (msg.data.token || ''));
      } else if (msg.event === 'done') {
        setStreaming(false);
        updSt(last.id, 'sent');
        VRMManager.speak(last.content, detectEmotion(last.content));
      } else if (msg.event === 'error') {
        setStreaming(false);
        updSt(last.id, 'error');
      }
    },
    onError: () => setStreaming(false),
    onClose: () => setStreaming(false),
  });

  const doSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: text.trim(), timestamp: Date.now(), status: 'sent' });
    addMessage({ id: `msg_${Date.now() + 1}`, role: 'assistant', content: '', timestamp: Date.now(), status: 'sending' });
    setStreaming(true);
    setQuestionsAsked(q => q + 1);
    setGuideState('question');

    connect(`${API_BASE_URL}/chat/stream`, {
      session_id: currentSessionId,
      question: text.trim(),
      stream: true,
      history: getHistory(5),
    });
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect, getHistory]);

  const handleSpeak = useCallback(() => {
    if (!config) return;
    VRMManager.speak(config.welcomeText, 'neutral');
    setGuideState('speaking');
    const dur = Math.max(3000, config.welcomeText.length * 150);
    setTimeout(() => setGuideState('idle'), dur);
  }, [config]);

  const handleDismiss = useCallback(() => {
    setGuideState('dismissed');
    if (config) {
      AsyncStorage.setItem(`${DISMISS_PREFIX}${config.pageId}`, '1');
    }
  }, [config]);

  // Auto-dismiss if already dismissed this session
  useEffect(() => {
    if (config) {
      AsyncStorage.getItem(`${DISMISS_PREFIX}${config.pageId}`).then((val) => {
        if (val === '1') {
          setGuideState('dismissed');
        }
      });
    }
  }, [config]);

  // Auto-speak on mount if configured
  useEffect(() => {
    if (config?.autoSpeak && guideState === 'prompt') {
      const timer = setTimeout(() => {
        handleSpeak();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [config, guideState, handleSpeak]);

  if (!config) return null;

  // Show reset button when dismissed
  if (guideState === 'dismissed') {
    return (
      <Pressable
        onPress={() => setGuideState('prompt')}
        style={styles.dismissedButton}
      >
        <Text style={styles.dismissedIcon}>💬</Text>
      </Pressable>
    );
  }

  const lastMsg = messages[messages.length - 1];

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🤖</Text>
          <Text style={styles.headerTitle}>小灵 · 智能导览</Text>
        </View>
        <Pressable onPress={handleDismiss} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>

      {/* 内容区 */}
      <View style={styles.content}>
        {/* 引导气泡（初始状态） */}
        {guideState === 'prompt' && (
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>{config.guidePrompt}</Text>
            <View style={styles.buttonRow}>
              <Pressable style={styles.speakButton} onPress={handleSpeak}>
                <Text style={styles.speakIcon}>▶</Text>
                <Text style={styles.speakText}>需要讲解</Text>
              </Pressable>
              <Pressable
                style={styles.questionButton}
                onPress={() => {
                  setGuideState('question');
                  inputRef.current?.focus();
                }}
              >
                <Text style={styles.questionIcon}>?</Text>
                <Text style={styles.questionText}>随便问问</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 讲解中 */}
        {guideState === 'speaking' && (
          <View style={styles.speakingBox}>
            <View style={styles.soundBars}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.soundBar,
                    {
                      height: 6 + Math.sin(Date.now() / 200 + i) * 4,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.speakingText}>正在讲解...</Text>
          </View>
        )}

        {/* 提问框 */}
        {guideState === 'question' && (
          <View style={styles.questionBox}>
            {/* 回答区 */}
            <ScrollView style={styles.messageList} showsVerticalScrollIndicator={false}>
              {messages.length === 0 ? (
                <Text style={styles.emptyText}>有什么关于当前页面的问题？</Text>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
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
                      {msg.content || (msg.role === 'assistant' && isStreaming ? '正在回答...' : '')}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* 快捷问题 */}
            {messages.length === 0 && config.quickQuestions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickQuestions}
                contentContainerStyle={styles.quickQuestionsContent}
              >
                {config.quickQuestions.map((q) => (
                  <Pressable
                    key={q}
                    style={styles.quickQuestionChip}
                    onPress={() => doSend(q)}
                  >
                    <Text style={styles.quickQuestionText}>{q}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* 输入区 */}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => doSend(inputText)}
                placeholder="输入问题..."
                placeholderTextColor={Colors.gray400}
                editable={!isStreaming}
                returnKeyType="send"
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
                ]}
                onPress={() => doSend(inputText)}
                disabled={!inputText.trim() || isStreaming}
              >
                <Text style={styles.sendIcon}>↑</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 空闲态（讲解完/问答完） */}
        {guideState === 'idle' && (
          <View style={styles.idleBox}>
            <Pressable
              style={styles.idleButton}
              onPress={() => setGuideState('prompt')}
            >
              <Text style={styles.idleButtonText}>再听一次讲解</Text>
            </Pressable>
            <Pressable
              style={styles.idleButton}
              onPress={() => {
                setGuideState('question');
                inputRef.current?.focus();
              }}
            >
              <Text style={styles.idleButtonText}>继续提问</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 快捷问题统计 */}
      {questionsAsked > 0 && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>已提问 {questionsAsked} 次</Text>
        </View>
      )}
    </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(106, 156, 137, 0.95)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    minHeight: 80,
  },
  promptBox: {
    padding: 14,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray600,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speakButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 156, 137, 0.95)',
  },
  speakIcon: {
    fontSize: 10,
    color: '#fff',
  },
  speakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
  questionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.3)',
    backgroundColor: 'transparent',
  },
  questionIcon: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  speakingBox: {
    padding: 16,
    alignItems: 'center',
  },
  soundBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  soundBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  speakingText: {
    fontSize: 12,
    color: Colors.primary,
  },
  questionBox: {
    padding: 10,
  },
  messageList: {
    maxHeight: 180,
    minHeight: 60,
    paddingHorizontal: 4,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: 'center',
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gray100,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 18,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: Colors.ink,
  },
  quickQuestions: {
    maxHeight: 36,
    marginBottom: 8,
  },
  quickQuestionsContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  quickQuestionChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.25)',
    backgroundColor: 'transparent',
  },
  quickQuestionText: {
    fontSize: 12,
    color: Colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  input: {
    flex: 1,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    fontSize: 13,
    backgroundColor: Colors.surfaceBg,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendIcon: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  idleBox: {
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  idleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  idleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  dismissedButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(106,156,137,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dismissedIcon: {
    fontSize: 18,
  },
  statsBar: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 10,
    color: Colors.gray400,
  },
});

export default DemoGuide;
