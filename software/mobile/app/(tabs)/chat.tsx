import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useChatStore, type Message } from '@/stores/chatStore';
import { useSSE } from '@/hooks/useSSE';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { API_BASE_URL, API_RUNTIME_LABEL, DEMO_MODE } from '@/api/config';
import { useTour } from '@/context/TourContext';
import { VRMView } from '@/components/vrm/VRMView';
import VRMSettings, { type VoiceMode } from '@/components/vrm/VRMSettings';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { estimateSpeechDuration } from '@/utils/digitalHumanDriver';
import { getLocalDemoAnswer, getOfflineFallbackAnswer } from '@/utils/localKnowledge';
import { trackMobileEvent, flushMobileEvents } from '@/services/mobileAnalytics';
import type { Emotion } from '@/components/vrm/VRMTypes';
import { Colors } from '@/constants/colors';

const QUICK_QUESTIONS = [
  { text: '灵山大佛有多高？', color: '#1A5FB4' },
  { text: '推荐一条经典路线', color: '#2D8B57' },
  { text: '景区门票多少钱？', color: '#C8882E' },
  { text: '九龙灌浴表演时间', color: '#13C2C2' },
];

const TOUR_QUICK_QUESTIONS = [
  { text: '当前景点有什么故事？', color: '#1A5FB4' },
  { text: '下一个景点是什么？', color: '#2D8B57' },
  { text: '暂停导览', color: '#C8882E' },
  { text: '讲解慢一点', color: '#13C2C2' },
];

function ChatBubble({ item, isStreaming }: { item: Message; isStreaming: boolean }) {
  const isUser = item.role === 'user';
  const [displayLen, setDisplayLen] = useState(isUser ? item.content.length : 0);
  const prevContentLen = useRef(0);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (!isUser && isStreaming && item.status === 'sending') {
      cursorOpacity.value = withRepeat(withTiming(0, { duration: 500 }), -1);
    } else {
      cursorOpacity.value = 0;
    }
  }, [cursorOpacity, isUser, isStreaming, item.status]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

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

function getTourWelcomeText(tourState: ReturnType<typeof useTour>[0]) {
  if (tourState.status === 'narrating' || tourState.status === 'navigate') {
    return `正在为您导览${tourState.currentRoute?.name || '灵山胜境'}，当前在${tourState.currentSpot?.name || '景区'}。有任何问题都可以随时问我。`;
  }
  if (tourState.status === 'completed' && tourState.currentRoute) {
    return `本次${tourState.currentRoute.name}已经完成，可以去旅行记忆里生成灵山手帐。`;
  }
  if (tourState.currentRoute) {
    return `您已选择${tourState.currentRoute.name}，需要我继续为您讲解吗？`;
  }
  return '你好，我是小灵。你可以向我询问灵山胜境的景点、路线、门票和演出信息。';
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const currentMsgIdRef = useRef('');
  const currentQuestionRef = useRef('');
  const currentQuestionStartedAtRef = useRef(0);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('silent');
  const [tourState, tourActions] = useTour();
  const [inputText, setInputText] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedCostume, setSelectedCostume] = useState('festival-spring');

  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action: currentAction,
    actionDurationMs: currentActionDuration,
    headRotation,
    speak,
    setPageContext,
  } = useDigitalHumanDriver(voiceMode);

  const {
    messages, addMessage, updateMessage, updateMessageStatus,
    setStreaming, isStreaming, currentSessionId, setCurrentSession, getHistory,
  } = useChatStore();

  const {
    isRecording, isProcessing: isAsrProcessing,
    startRecording, stopRecording,
  } = useVoiceInput();

  useEffect(() => {
    if (!currentSessionId) {
      setCurrentSession(createSessionId());
    }
  }, [currentSessionId, setCurrentSession]);

  const speakWithDriver = useCallback((text: string, emotion?: Emotion) => {
    speak(text, { emotion, durationMs: estimateSpeechDuration(text) });
  }, [speak]);

  const playReply = useCallback((replyText: string, emotion?: Emotion) => {
    if (!replyText.trim()) return;
    speakWithDriver(replyText, emotion);
  }, [speakWithDriver]);

  const recordQuestionMemory = useCallback((
    question: string,
    answer: string,
    answerSource: string,
    extraMetadata: Record<string, any> = {},
  ) => {
    const q = question.trim();
    const a = answer.trim();
    if (!q || !a) return;

    tourActions.createMemoryEvent({
      type: 'ask',
      routeId: tourState.currentRoute?.id,
      stopId: tourState.currentSpot?.id,
      title: `问小灵：${q.slice(0, 18)}`,
      content: `问：${q}\n答：${a}`,
      metadata: {
        source_page: 'chat',
        route_name: tourState.currentRoute?.name,
        spot_name: tourState.currentSpot?.name,
        answer_source: answerSource,
        ...extraMetadata,
      },
    });
  }, [tourActions, tourState.currentRoute, tourState.currentSpot]);

  const applyOfflineAnswer = useCallback((assistantId: string, question: string) => {
    const fallback = getOfflineFallbackAnswer(question);
    updateMessage(assistantId, fallback.displayAnswer);
    updateMessageStatus(assistantId, 'sent');
    setStreaming(false);
    const latencyMs = currentQuestionStartedAtRef.current ? Date.now() - currentQuestionStartedAtRef.current : undefined;
    currentMsgIdRef.current = '';
    currentQuestionRef.current = '';
    currentQuestionStartedAtRef.current = 0;
    void trackMobileEvent('question_asked', {
      text: question,
      source_page: 'chat',
      answer_status: fallback.score > 0 ? 'local_fallback_hit' : 'local_fallback_refused',
      latency_ms: latencyMs,
      source_label: fallback.sourceLabel,
    });
    recordQuestionMemory(question, fallback.answer, 'offline_fallback', {
      source_label: fallback.sourceLabel,
    });
    playReply(fallback.answer, fallback.emotion);
  }, [playReply, recordQuestionMemory, setStreaming, updateMessage, updateMessageStatus]);

  const { connect } = useSSE({
    onMessage: useCallback((msg: any) => {
      const id = currentMsgIdRef.current;
      if (!id) return;

      if (msg.event === 'token') {
        const currentContent = useChatStore.getState().messages.find((m) => m.id === id)?.content || '';
        useChatStore.getState().updateMessage(id, currentContent + (msg.data?.token || ''));
      } else if (msg.event === 'faq_hit' || msg.event === 'cache_hit') {
        const answer = msg.data?.answer || msg.data?.response || '';
        updateMessage(id, answer);
        updateMessageStatus(id, 'sent');
        setStreaming(false);
        void trackMobileEvent('question_asked', {
          text: currentQuestionRef.current,
          source_page: 'chat',
          answer_status: msg.event,
          latency_ms: currentQuestionStartedAtRef.current ? Date.now() - currentQuestionStartedAtRef.current : undefined,
          emotion: msg.data?.emotion,
        });
        recordQuestionMemory(currentQuestionRef.current, answer, msg.event, {
          emotion: msg.data?.emotion,
        });
        currentMsgIdRef.current = '';
        currentQuestionRef.current = '';
        currentQuestionStartedAtRef.current = 0;
        playReply(answer, msg.data?.emotion);
      } else if (msg.event === 'done') {
        setStreaming(false);
        updateMessageStatus(id, 'sent');
        const answer = msg.data?.answer
          || useChatStore.getState().messages.find((m) => m.id === id)?.content
          || '';
        void trackMobileEvent('question_asked', {
          text: currentQuestionRef.current,
          source_page: 'chat',
          answer_status: 'backend_done',
          latency_ms: currentQuestionStartedAtRef.current ? Date.now() - currentQuestionStartedAtRef.current : undefined,
          emotion: msg.data?.emotion,
        });
        recordQuestionMemory(currentQuestionRef.current, answer, 'backend_done', {
          emotion: msg.data?.emotion,
        });
        currentMsgIdRef.current = '';
        currentQuestionRef.current = '';
        currentQuestionStartedAtRef.current = 0;
        playReply(answer, msg.data?.emotion);
      } else if (msg.event === 'error') {
        applyOfflineAnswer(id, currentQuestionRef.current);
      }
    }, [applyOfflineAnswer, setStreaming, updateMessage, updateMessageStatus, playReply, recordQuestionMemory]),
    onError: useCallback(() => {
      const id = currentMsgIdRef.current;
      if (id) {
        applyOfflineAnswer(id, currentQuestionRef.current);
      } else {
        setStreaming(false);
      }
    }, [applyOfflineAnswer, setStreaming]),
  });

  useEffect(() => {
    setPageContext('chat');
    void flushMobileEvents();
    const timer = setTimeout(() => {
      speakWithDriver(getTourWelcomeText(tourState), 'neutral');
    }, 600);
    return () => clearTimeout(timer);
  }, [setPageContext, speakWithDriver, tourState]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;

    const trimmed = text.trim();
    const activeSessionId = currentSessionId ?? createSessionId();
    if (!currentSessionId) {
      setCurrentSession(activeSessionId);
    }

    addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      status: 'sent',
    });
    setInputText('');

    const localAnswer = getLocalDemoAnswer(trimmed);
    if (localAnswer) {
      void trackMobileEvent('question_asked', {
        text: trimmed,
        source_page: 'chat',
        answer_status: 'local_demo_hit',
        latency_ms: 0,
        source_label: localAnswer.sourceLabel,
        category: localAnswer.category,
      });
      addMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: localAnswer.displayAnswer,
        timestamp: Date.now(),
        status: 'sent',
        source: 'offline',
      });
      recordQuestionMemory(trimmed, localAnswer.answer, 'local_demo', {
        source_label: localAnswer.sourceLabel,
        category: localAnswer.category,
      });
      playReply(localAnswer.answer, localAnswer.emotion);
      return;
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending',
    };
    addMessage(assistantMsg);
    currentMsgIdRef.current = assistantMsg.id;
    currentQuestionRef.current = trimmed;
    currentQuestionStartedAtRef.current = Date.now();
    setStreaming(true);

    void connect(`${API_BASE_URL}/chat/stream`, {
      session_id: activeSessionId,
      question: trimmed,
      stream: true,
      history: getHistory(5),
    });
  }, [
    addMessage,
    connect,
    currentSessionId,
    getHistory,
    isStreaming,
    playReply,
    recordQuestionMemory,
    setCurrentSession,
    setStreaming,
  ]);

  const handleTourQuickQuestion = useCallback((text: string) => {
    if (text === '暂停导览') {
      tourActions.pauseTour();
      speakWithDriver('导览已暂停，需要继续时告诉我。', 'neutral');
      return;
    }
    sendMessage(text);
  }, [sendMessage, speakWithDriver, tourActions]);

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble item={item} isStreaming={isStreaming} />
  );

  return (
    <View style={styles.root}>
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
          <Text style={styles.headerTitle}>问询</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerSub}>与小灵对话，了解灵山</Text>
          <View style={[styles.runtimePill, DEMO_MODE && styles.runtimePillDemo]}>
            <Text style={[styles.runtimePillText, DEMO_MODE && styles.runtimePillTextDemo]}>
              {API_RUNTIME_LABEL}
            </Text>
          </View>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => setSettingsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="打开数字人设置"
          >
            <Text style={styles.settingsBtnText}>设置</Text>
          </Pressable>
        </View>

        <View style={styles.scene}>
          <VRMView
            key={`vrm-full-${selectedCostume}`}
            mode="full"
            expression={expression}
            mouthOpen={mouthOpen}
            speaking={isSpeaking}
            action={currentAction}
            actionDuration={currentActionDuration}
            headRotation={headRotation}
            enableGesture
            costumeId={selectedCostume}
          />

          <View style={styles.chatLayer}>
            {tourState.currentRoute && tourState.status !== 'idle' && tourState.status !== 'free' && (
              <View style={styles.tourBanner}>
                <View style={styles.tourBannerLeft}>
                  <Text style={styles.tourBannerIcon}>
                    {tourState.status === 'completed' ? '忆' : tourState.status === 'narrating' ? '讲' : tourState.status === 'navigate' ? '导' : '游'}
                  </Text>
                  <View style={styles.tourBannerText}>
                    <Text style={styles.tourBannerRoute}>{tourState.currentRoute.name}</Text>
                    <Text style={styles.tourBannerStatus}>
                      {tourState.status === 'completed' ? '已完成' : tourState.status === 'narrating' ? '讲解中' : tourState.status === 'navigate' ? '导航中' : tourState.status === 'attraction' ? '景点介绍' : '已暂停'}
                      {' | '}{tourState.progress.completed}/{tourState.progress.total} 景点
                    </Text>
                  </View>
                </View>
                <View style={styles.tourBannerActions}>
                  {tourState.status === 'completed' ? (
                    <Pressable
                      style={styles.tourResumeBtn}
                      onPress={() => router.push('/memory')}
                      accessibilityRole="button"
                      accessibilityLabel="查看旅行记忆"
                    >
                      <Text style={styles.tourResumeBtnText}>手帐</Text>
                    </Pressable>
                  ) : tourState.status === 'narrating' || tourState.status === 'navigate' ? (
                    <Pressable
                      style={styles.tourPauseBtn}
                      onPress={tourActions.pauseTour}
                      accessibilityRole="button"
                      accessibilityLabel="暂停当前导览"
                    >
                      <Text style={styles.tourPauseBtnText}>暂停</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.tourResumeBtn}
                      onPress={tourActions.resumeTour}
                      accessibilityRole="button"
                      accessibilityLabel="继续当前导览"
                    >
                      <Text style={styles.tourResumeBtnText}>继续</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.tourEndBtn}
                    onPress={tourActions.endTour}
                    accessibilityRole="button"
                    accessibilityLabel="结束当前导览"
                  >
                    <Text style={styles.tourEndBtnText}>结束</Text>
                  </Pressable>
                </View>
              </View>
            )}

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
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              style={styles.messageListWrap}
            />

            {messages.length === 0 && (
              <View style={styles.quickSection}>
                <Text style={styles.quickTitle}>
                  {tourState.currentRoute ? '导览快捷操作' : '快捷问题'}
                </Text>
                <View style={styles.quickGrid}>
                  {(tourState.currentRoute ? TOUR_QUICK_QUESTIONS : QUICK_QUESTIONS).map((q) => (
                    <Pressable
                      key={q.text}
                      style={({ pressed }) => [
                        styles.quickBtn,
                        { borderColor: q.color + '40' },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => (tourState.currentRoute ? handleTourQuickQuestion(q.text) : sendMessage(q.text))}
                      accessibilityRole="button"
                      accessibilityLabel={q.text}
                    >
                      <Text style={[styles.quickBtnText, { color: q.color }]}>{q.text}</Text>
                    </Pressable>
                  ))}
                </View>

                {!tourState.currentRoute && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.tourStartBtn,
                      pressed && styles.tourStartBtnPressed,
                    ]}
                    onPress={() => router.push('/routes')}
                    accessibilityRole="button"
                    accessibilityLabel="选择路线，开始数字人导览"
                  >
                    <Text style={styles.tourStartBtnText}>选择路线，开始数字人导览</Text>
                  </Pressable>
                )}
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
                editable={!isRecording && !isAsrProcessing}
              />
              <Pressable
                style={[
                  styles.voiceBtn,
                  isRecording && styles.voiceBtnRecording,
                  isAsrProcessing && styles.voiceBtnProcessing,
                ]}
                onPress={() => {
                  if (isRecording) {
                    stopRecording({
                      onTranscript: (transcript) => {
                        if (transcript.trim()) setInputText(transcript);
                      },
                    });
                  } else {
                    startRecording({ maxDuration: 30000 });
                  }
                }}
                onLongPress={() => startRecording({ maxDuration: 30000 })}
                disabled={isStreaming || isAsrProcessing}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? '停止录音' : '开始语音输入'}
              >
                <Text style={isRecording ? styles.voiceBtnIconActive : styles.voiceBtnIcon}>
                  {isAsrProcessing ? '...' : isRecording ? '停' : '麦'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isStreaming) && styles.sendBtnDisabled,
                ]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isStreaming}
                accessibilityRole="button"
                accessibilityLabel="发送问题"
              >
                <Text style={styles.sendBtnText}>发送</Text>
              </Pressable>
            </View>

            {(isRecording || isAsrProcessing) && (
              <View style={styles.voiceHint}>
                <Text style={styles.voiceHintText}>
                  {isRecording ? '正在录音，点击停止...' : '正在识别中...'}
                </Text>
              </View>
            )}
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
  root: {
    flex: 1,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    position: 'relative',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 3,
  },
  headerLine: {
    width: 20,
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
    marginTop: 5,
    opacity: 0.6,
  },
  headerSub: {
    fontSize: 10,
    color: Colors.gray400,
    marginTop: 3,
    letterSpacing: 2,
  },
  runtimePill: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -14,
    minHeight: 44,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
  },
  runtimePillDemo: {
    borderColor: Colors.accent + '55',
    backgroundColor: Colors.accentBg,
  },
  runtimePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gray500,
  },
  runtimePillTextDemo: {
    color: Colors.accent,
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
    minHeight: 44,
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  scene: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  chatLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  subtitleBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(106,156,137,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  subtitleText: {
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 18,
    textAlign: 'center',
  },
  messageListWrap: {
    maxHeight: 300,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    padding: 10,
  },
  userBubble: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userBubbleText: {
    color: '#fff',
  },
  assistantBubbleText: {
    color: Colors.ink,
  },
  quickSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  quickTitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginBottom: 8,
    letterSpacing: 2,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#fff',
    minHeight: 44,
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
  },
  tourBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(106,156,137,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tourBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  tourBannerIcon: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
  },
  tourBannerText: {
    flex: 1,
  },
  tourBannerRoute: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  tourBannerStatus: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 1,
  },
  tourBannerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  tourPauseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent + '20',
    justifyContent: 'center',
  },
  tourPauseBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  tourResumeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
  },
  tourResumeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  tourEndBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#FF4D4F20',
    justifyContent: 'center',
  },
  tourEndBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF4D4F',
  },
  tourStartBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  tourStartBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  tourStartBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: Colors.gray50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontSize: 14,
    color: Colors.ink,
  },
  sendBtn: {
    width: 56,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  voiceBtnRecording: {
    backgroundColor: '#FF4D4F15',
    borderColor: '#FF4D4F',
  },
  voiceBtnProcessing: {
    backgroundColor: Colors.gray100,
    opacity: 0.7,
  },
  voiceBtnIcon: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '700',
  },
  voiceBtnIconActive: {
    fontSize: 14,
    color: '#FF4D4F',
    fontWeight: '700',
  },
  voiceHint: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    right: 12,
    alignItems: 'center',
    backgroundColor: '#00000090',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  voiceHintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cursor: {
    color: Colors.accent,
    fontWeight: '300',
  },
});
