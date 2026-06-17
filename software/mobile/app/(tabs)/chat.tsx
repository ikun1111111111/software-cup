import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useChatStore, type Message } from '@/stores/chatStore';
import { useSSE } from '@/hooks/useSSE';
import { useVRMSync, type VoiceMode } from '@/hooks/useVRMSync';
import { VRMView } from '@/components/vrm/VRMView';
import { VRMManager, type Emotion } from '@/components/vrm/VRMManager';
import VRMSettings from '@/components/vrm/VRMSettings';
import { textToTimeline, ExpressionPlayer, type Action } from '@/utils/textTimeline';
import { Colors } from '@/constants/colors';

const QUICK_QUESTIONS = [
  { text: '灵山大佛有多高？', color: '#1A5FB4' },
  { text: '推荐一条游玩路线', color: '#2D8B57' },
  { text: '景区门票多少钱？', color: '#C8882E' },
  { text: '九龙灌浴表演时间', color: '#13c2c2' },
];

// ─── 打字机效果气泡 ───
function ChatBubble({ item, isStreaming }: { item: Message; isStreaming: boolean }) {
  const isUser = item.role === 'user';
  const [displayLen, setDisplayLen] = useState(isUser ? item.content.length : 0);
  const prevContentLen = useRef(0);

  // 光标闪烁
  const cursorOpacity = useSharedValue(1);
  useEffect(() => {
    if (!isUser && isStreaming && item.status === 'sending') {
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 500 }),
        -1,
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [isUser, isStreaming, item.status]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  // 逐字显示
  useEffect(() => {
    if (isUser) {
      setDisplayLen(item.content.length);
      return;
    }
    const fullLen = item.content.length;
    if (fullLen <= prevContentLen.current) return;

    const target = fullLen;
    const startFrom = prevContentLen.current;
    prevContentLen.current = fullLen;

    // 逐字追加显示
    let current = startFrom;
    const interval = setInterval(() => {
      current += 1;
      setDisplayLen(current);
      if (current >= target) clearInterval(interval);
    }, 35);

    return () => clearInterval(interval);
  }, [item.content, isUser]);

  const displayedText = isUser ? item.content : item.content.slice(0, displayLen);
  const showCursor = !isUser && isStreaming && item.status === 'sending';
  const showPlaceholder = !isUser && item.status === 'sending' && item.content === '' && displayLen === 0;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
    >
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}>
        <Text style={[
          styles.bubbleText,
          isUser ? styles.userBubbleText : styles.assistantBubbleText,
        ]}>
          {showPlaceholder ? '正在思考...' : displayedText}
          {showCursor && (
            <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatPage() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('silent');
  const { mouthOpen, isSpeaking, subtitle, triggerSpeak, stopSpeaking } = useVRMSync(voiceMode);

  // 表情和动作状态
  const [displayExpression, setDisplayExpression] = useState<Emotion>('neutral');
  const [currentAction, setCurrentAction] = useState<Action>('none');
  const [currentActionDuration, setCurrentActionDuration] = useState(800);
  const [headRotation, setHeadRotation] = useState({ x: 0, y: 0 });
  const playerRef = useRef<ExpressionPlayer | null>(null);

  // headRotation 计算 — 当 action 变化时启动定时器
  useEffect(() => {
    if (currentAction !== 'lookUp') {
      setHeadRotation({ x: 0, y: 0 });
      return;
    }
    const DURATION = 800;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / DURATION, 1);
      const curve = progress < 0.2
        ? Math.pow(progress / 0.2, 2)
        : progress > 0.8
          ? Math.pow((1 - progress) / 0.2, 2)
          : 1;
      setHeadRotation({ x: -0.8 * curve, y: 0.6 * curve });
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [currentAction]);

  // 初始化播放器
  useEffect(() => {
    playerRef.current = new ExpressionPlayer();
    return () => playerRef.current?.stop();
  }, []);

  const { messages, addMessage, updateMessage, setStreaming, isStreaming } = useChatStore();
  const [inputText, setInputText] = useState('');
  const currentMsgIdRef = useRef('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedCostume, setSelectedCostume] = useState('festival-spring');

  const { connect, disconnect } = useSSE({
    onMessage: useCallback((msg: any) => {
      if (msg.event === 'message' || msg.event === 'rag_chunk' || msg.event === 'faq_chunk') {
        const id = currentMsgIdRef.current;
        if (id) {
          useChatStore.getState().updateMessage(
            id,
            (useChatStore.getState().messages.find((m) => m.id === id)?.content || '') + msg.data,
          );
        }
      } else if (msg.event === 'done') {
        setStreaming(false);
        const lastAssistantMsg = [...useChatStore.getState().messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMsg) {
          const text = lastAssistantMsg.content;
          const durationMs = Math.max(3000, text.length * 150);
          const timeline = textToTimeline(text, durationMs);

          // 设置初始表情和动作
          const first = timeline[0];
          if (first) {
            setDisplayExpression(first.expression);
            setCurrentAction(first.action || 'none');
            setCurrentActionDuration(first.durationMs ?? 800);
          }

          // 启动播放器
          playerRef.current?.play(timeline, (expr, action, dur) => {
            setDisplayExpression(expr);
            setCurrentAction(action || 'none');
            setCurrentActionDuration(dur);
          });

          triggerSpeak(text, first?.expression || 'neutral');

          // 说话结束后重置
          setTimeout(() => {
            playerRef.current?.stop();
            setDisplayExpression('neutral');
            setCurrentAction('none');
          }, durationMs);
        }
      }
    }, [setStreaming, triggerSpeak]),
    onError: useCallback(() => setStreaming(false), [setStreaming]),
  });

  useEffect(() => {
    VRMManager.setPageContext('chat');
    const timer = setTimeout(() => {
      const welcomeText = VRMManager.getWelcomeText();
      const durationMs = Math.max(3000, welcomeText.length * 150);
      const timeline = textToTimeline(welcomeText, durationMs);

      const first = timeline[0];
      if (first) {
        setDisplayExpression(first.expression);
        setCurrentAction(first.action || 'none');
        setCurrentActionDuration(first.durationMs ?? 800);
      }

      playerRef.current?.play(timeline, (expr, action, dur) => {
        setDisplayExpression(expr);
        setCurrentAction(action || 'none');
        setCurrentActionDuration(dur);
      });

      triggerSpeak(welcomeText, first?.expression || 'neutral');

      setTimeout(() => {
        playerRef.current?.stop();
        setDisplayExpression('neutral');
        setCurrentAction('none');
      }, durationMs);
    }, 600);
    return () => clearTimeout(timer);
  }, [triggerSpeak]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      status: 'sent',
    };
    addMessage(userMsg);
    setInputText('');

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending',
    };
    addMessage(assistantMsg);
    currentMsgIdRef.current = assistantMsg.id;
    setStreaming(true);

    setTimeout(() => {
      const replyText = '感谢您的提问！灵山大佛高88米，是世界上最高的青铜佛像之一。';
      updateMessage(assistantMsg.id, replyText);
      setStreaming(false);

      // 触发文字分析 → 表情/动作时间轴
      const durationMs = Math.max(3000, replyText.length * 150);
      const timeline = textToTimeline(replyText, durationMs);

      const first = timeline[0];
      if (first) {
        setDisplayExpression(first.expression);
        setCurrentAction(first.action || 'none');
        setCurrentActionDuration(first.durationMs ?? 800);
      }

      playerRef.current?.play(timeline, (expr, action, dur) => {
        setDisplayExpression(expr);
        setCurrentAction(action || 'none');
        setCurrentActionDuration(dur);
      });

      triggerSpeak(replyText, first?.expression || 'neutral');

      setTimeout(() => {
        playerRef.current?.stop();
        setDisplayExpression('neutral');
        setCurrentAction('none');
      }, durationMs);
    }, 1500);
  }, [addMessage, updateMessage, setStreaming, isStreaming, triggerSpeak]);

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble item={item} isStreaming={isStreaming} />
  );

  return (
    <View style={styles.root}>
      {/* 背景图 — 绝对定位铺满底层 */}
      <ImageBackground
        source={require('../../assets/images/bg-era-tang.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
      </ImageBackground>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>问讯</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerSub}>与小灵对话，了解灵山</Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.settingsBtnText}>设置</Text>
          </Pressable>
        </View>

        {/* 数字人铺满剩余空间 */}
        <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          <VRMView
            key={`vrm-full-${selectedCostume}`}
            mode="full"
            expression={displayExpression}
            mouthOpen={mouthOpen}
            speaking={isSpeaking}
            action={currentAction}
            actionDuration={currentActionDuration}
            headRotation={headRotation}
            enableGesture
            costumeId={selectedCostume}
          />

          {/* 聊天内容浮在数字人上方 */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            {isSpeaking && subtitle ? (
              <View style={styles.subtitleBar}>
                <Text style={styles.subtitleText} numberOfLines={2}>{subtitle}</Text>
              </View>
            ) : null}

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              style={{ maxHeight: 300 }}
            />

            {messages.length === 0 && (
              <View style={styles.quickSection}>
                <Text style={styles.quickTitle}>快捷问题</Text>
                <View style={styles.quickGrid}>
                  {QUICK_QUESTIONS.map((q) => (
                    <Pressable
                      key={q.text}
                      style={({ pressed }) => [
                        styles.quickBtn,
                        { borderColor: q.color + '40' },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => sendMessage(q.text)}
                    >
                      <Text style={[styles.quickBtnText, { color: q.color }]}>{q.text}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="向小灵提问..."
                placeholderTextColor={Colors.gray400}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => sendMessage(inputText)}
                returnKeyType="send"
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isStreaming) && styles.sendBtnDisabled,
                ]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isStreaming}
              >
                <Text style={styles.sendBtnText}>发送</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <VRMSettings
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          selectedCostume={selectedCostume}
          onCostumeChange={setSelectedCostume}
          voiceMode={voiceMode}
          onVoiceModeChange={setVoiceMode}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  root: { flex: 1, position: 'relative' },

  header: {
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    position: 'relative', zIndex: 10,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700',
    color: Colors.ink, letterSpacing: 3,
  },
  headerLine: {
    width: 20, height: 2,
    backgroundColor: Colors.accent, borderRadius: 1, marginTop: 5, opacity: 0.6,
  },
  headerSub: {
    fontSize: 10, color: Colors.gray400, marginTop: 3, letterSpacing: 2,
  },
  settingsBtn: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  settingsBtnText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },

  subtitleBar: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  subtitleText: {
    fontSize: 12, color: Colors.primary, lineHeight: 18, textAlign: 'center',
  },

  messageList: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end',
  },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%', borderRadius: 14, padding: 10,
  },
  userBubble: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userBubbleText: { color: '#fff' },
  assistantBubbleText: { color: Colors.ink },

  quickSection: { paddingHorizontal: 12, paddingBottom: 12 },
  quickTitle: {
    fontSize: 12, color: Colors.gray400,
    marginBottom: 8, letterSpacing: 2,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1, backgroundColor: '#fff',
    minHeight: 40, justifyContent: 'center',
  },
  quickBtnText: { fontSize: 12, fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, height: 40, paddingHorizontal: 14,
    backgroundColor: Colors.gray50, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.borderLight,
    fontSize: 14, color: Colors.ink,
  },
  sendBtn: {
    width: 56, height: 40, borderRadius: 20,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cursor: {
    color: Colors.accent,
    fontWeight: '300',
  },
});
