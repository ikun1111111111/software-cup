import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChatStore, type Message } from '@/stores/chatStore';
import { useSSE } from '@/hooks/useSSE';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import type { VoiceConfig } from '@/hooks/useVRMSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/api/config';
import { useTour } from '@/context/TourContext';
import { VRMView } from '@/components/vrm/VRMView';
import { VRMManager } from '@/components/vrm/VRMManager';
import VRMSettings, { type VoiceMode } from '@/components/vrm/VRMSettings';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { estimateSpeechDuration } from '@/utils/digitalHumanDriver';
import type { Action } from '@/utils/textTimeline';
import { getLocalDemoAnswer, getOfflineFallbackAnswer } from '@/utils/localKnowledge';
import { trackMobileEvent, flushMobileEvents } from '@/services/mobileAnalytics';
import { buildMemorySourceMetadata } from '@/utils/memorySource';
import type { Emotion } from '@/components/vrm/VRMTypes';
import { Colors } from '@/constants/colors';
import {
  DEFAULT_DIGITAL_HUMAN_VOICE_MODE,
  XIAOLING_CHAT_COPY,
} from '@/utils/digitalHumanProduct';
import { runAfterNextPaint, type CancelScheduledTask } from '@/utils/scheduling';
import {
  getInitialChatBubbleDisplayLength,
  shouldAnimateChatBubbleText,
} from '@/utils/chatBubbleDisplay';
import {
  buildDigitalHumanChatPayload,
  buildDigitalHumanChatStreamUrl,
} from '@/utils/aiChat';

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

const REPLY_ACTION_DURATION_MS = 1600;
const THINKING_ACTION_DURATION_MS = 1400;
const TAB_BAR_CLEARANCE = 12;
const ANSWER_SOURCE_PATTERN = /(?:\r?\n){1,}\s*来源[:：][\s\S]*$/;
const DEFAULT_VOICE_CONFIG: VoiceConfig = { rate: 1, pitch: 1, ttsVoiceId: 'mandarin' };
const VOICE_CONFIG_KEY = '@vrm_voice_config';
const VOICE_MODE_KEY = '@vrm_voice_mode';
const DEFAULT_CHAT_VOICE_MODE: VoiceMode = Platform.OS === 'web' ? 'browser' : 'tts';

function stripAnswerSource(answer: string): string {
  return answer.replace(ANSWER_SOURCE_PATTERN, '').trim();
}

function getReplyAction(text: string, emotion?: Emotion): Action {
  if (emotion === 'grateful') return 'bow';
  if (emotion === 'sad') return 'shakeHead';
  if (emotion === 'thinking') return 'lookUp';
  if (emotion === 'surprised') return 'lookUp';
  if (/(高|高度|米|层|楼|海拔)/.test(text)) return 'lookUp';
  if (/(路线|依次|进入|前往|下一站|这里|这边|那边|前方|左边|右边)/.test(text)) return 'point';
  if (emotion === 'happy') return 'nod';
  return 'nod';
}

function ChatBubble({ item, isStreaming }: { item: Message; isStreaming: boolean }) {
  const isUser = item.role === 'user';
  const shouldAnimateText = shouldAnimateChatBubbleText({
    role: item.role,
    status: item.status,
    isStreaming,
  });
  const initialDisplayLen = getInitialChatBubbleDisplayLength({
    role: item.role,
    status: item.status,
    isStreaming,
    contentLength: item.content.length,
  });
  const [displayLen, setDisplayLen] = useState(initialDisplayLen);
  const prevContentLen = useRef(initialDisplayLen);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimateText) {
      cursorOpacity.value = withRepeat(withTiming(0, { duration: 500 }), -1);
    } else {
      cursorOpacity.value = withTiming(0, { duration: 0 });
    }
  }, [cursorOpacity, shouldAnimateText]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  useEffect(() => {
    if (!shouldAnimateText) {
      prevContentLen.current = item.content.length;
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
  }, [item.content, shouldAnimateText]);

  const displayedText = isUser ? item.content : item.content.slice(0, displayLen);
  const showCursor = shouldAnimateText;
  const showPlaceholder = shouldAnimateText && item.content === '' && displayLen === 0;

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
    return `小灵正在为你导览${tourState.currentRoute?.name || '灵山胜境'}，当前在${tourState.currentSpot?.name || '景区'}。有任何问题都可以随时问我。`;
  }
  if (tourState.status === 'completed' && tourState.currentRoute) {
    return `本次${tourState.currentRoute.name}已经完成，可以去小灵回忆册生成旅行手帐。`;
  }
  if (tourState.currentRoute) {
    return `你已选择${tourState.currentRoute.name}，需要小灵继续讲解或调整路线吗？`;
  }
  return '你好，我是小灵。你可以用语音或文字问我景点、路线、门票、演出和游览建议。';
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    returnLabel?: string;
    fresh?: string;
    initialQuestion?: string;
    spotId?: string;
    spotName?: string;
    sourcePage?: string;
    routeId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const currentMsgIdRef = useRef('');
  const currentQuestionRef = useRef('');
  const currentQuestionStartedAtRef = useRef(0);
  const spokenWelcomeKeyRef = useRef<string | null>(null);
  const sentInitialQuestionKeyRef = useRef<string | null>(null);
  const sendLockedRef = useRef(false);
  const scheduledChatTasksRef = useRef<CancelScheduledTask[]>([]);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(DEFAULT_CHAT_VOICE_MODE);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(DEFAULT_VOICE_CONFIG);
  const [tourState, tourActions] = useTour();

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(VOICE_MODE_KEY),
      AsyncStorage.getItem(VOICE_CONFIG_KEY),
    ])
      .then(([modeRaw, configRaw]) => {
        if (modeRaw) {
          const m = modeRaw as VoiceMode;
          if (m === 'silent' || m === 'browser' || m === 'tts') {
            setVoiceMode(m);
          }
        }
        if (configRaw) {
          const parsed = JSON.parse(configRaw) as VoiceConfig;
          setVoiceConfig({ ...DEFAULT_VOICE_CONFIG, ...parsed });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(VOICE_MODE_KEY, voiceMode).catch(() => {});
  }, [voiceMode]);

  useEffect(() => {
    AsyncStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(voiceConfig)).catch(() => {});
  }, [voiceConfig]);
  const [inputText, setInputText] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedCostume, setSelectedCostume] = useState('festival-spring');
  const [vrmReady, setVrmReady] = useState(false);
  const [vrmReloadNonce, setVrmReloadNonce] = useState(0);
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const returnLabel = typeof params.returnLabel === 'string' ? params.returnLabel : '返回';
  const shouldStartFresh = params.fresh === '1';
  const showContextBack = Boolean(returnTo);
  const initialQuestion = typeof params.initialQuestion === 'string' ? params.initialQuestion : undefined;
  const spotId = typeof params.spotId === 'string' ? params.spotId : undefined;
  const spotName = typeof params.spotName === 'string' ? params.spotName : undefined;
  const sourcePage = typeof params.sourcePage === 'string' ? params.sourcePage : 'chat';
  const routeId = typeof params.routeId === 'string' ? params.routeId : tourState.currentRoute?.id;
  const localAnswerContext = useMemo(() => ({ spotId, spotName }), [spotId, spotName]);

  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action: currentAction,
    actionDurationMs: currentActionDuration,
    headRotation,
    speak,
    stop,
    setExpression,
    playAction,
    setPageContext,
  } = useDigitalHumanDriver(voiceMode, { voiceConfig });

  const {
    messages, addMessage, updateMessage, updateMessageStatus,
    setStreaming, isStreaming, currentSessionId, setCurrentSession, getHistory, clearMessages,
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

  const cancelScheduledChatTasks = useCallback(() => {
    scheduledChatTasksRef.current.forEach((cancel) => cancel());
    scheduledChatTasksRef.current = [];
  }, []);

  const releaseSendLock = useCallback(() => {
    sendLockedRef.current = false;
  }, []);

  useEffect(() => cancelScheduledChatTasks, [cancelScheduledChatTasks]);

  const scheduleChatSideEffect = useCallback((task: () => void) => {
    let cancelTask: CancelScheduledTask = () => {};
    cancelTask = runAfterNextPaint(() => {
      scheduledChatTasksRef.current = scheduledChatTasksRef.current.filter((cancel) => cancel !== cancelTask);
      task();
    });
    scheduledChatTasksRef.current.push(cancelTask);
    return cancelTask;
  }, []);

  const resetConversation = useCallback(() => {
    cancelScheduledChatTasks();
    currentMsgIdRef.current = '';
    currentQuestionRef.current = '';
    currentQuestionStartedAtRef.current = 0;
    sendLockedRef.current = false;
    clearMessages();
    setStreaming(false);
    setCurrentSession(createSessionId());
  }, [cancelScheduledChatTasks, clearMessages, setCurrentSession, setStreaming]);

  useFocusEffect(
    useCallback(() => {
      if (shouldStartFresh || !returnTo) resetConversation();
      return undefined;
    }, [resetConversation, returnTo, shouldStartFresh]),
  );

  const primeQuestionResponse = useCallback(() => {
    stop({ playQueued: false });
    setExpression('thinking');
    playAction('lookUp', THINKING_ACTION_DURATION_MS);
  }, [playAction, setExpression, stop]);

  const speakWithDriver = useCallback((
    text: string,
    emotion?: Emotion,
    action?: Action,
    options: { interrupt?: boolean } = {},
  ) => {
    const spokenText = stripAnswerSource(text);
    if (!spokenText) return;
    if (options.interrupt) {
      stop({ playQueued: false });
    }
    speak(spokenText, {
      emotion,
      durationMs: estimateSpeechDuration(spokenText),
      action,
      actionDurationMs: action ? REPLY_ACTION_DURATION_MS : undefined,
    });
  }, [speak, stop]);

  const playReply = useCallback((replyText: string, emotion?: Emotion) => {
    const reply = stripAnswerSource(replyText);
    if (!reply) return;
    speakWithDriver(reply, emotion, getReplyAction(reply, emotion), { interrupt: true });
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
      metadata: buildMemorySourceMetadata({
        sourcePage: 'chat',
        route: tourState.currentRoute,
        spot: tourState.currentSpot,
        extra: {
          answer_source: answerSource,
          ...extraMetadata,
        },
      }),
    });
  }, [tourActions, tourState.currentRoute, tourState.currentSpot]);

  const applyOfflineAnswer = useCallback((assistantId: string, question: string) => {
    const fallback = getOfflineFallbackAnswer(question, localAnswerContext);
    const displayAnswer = stripAnswerSource(fallback.displayAnswer);
    updateMessage(assistantId, displayAnswer);
    updateMessageStatus(assistantId, 'sent');
    setStreaming(false);
    const latencyMs = currentQuestionStartedAtRef.current ? Date.now() - currentQuestionStartedAtRef.current : undefined;
    currentMsgIdRef.current = '';
    currentQuestionRef.current = '';
    currentQuestionStartedAtRef.current = 0;
    releaseSendLock();
    scheduleChatSideEffect(() => {
      void trackMobileEvent('question_asked', {
        text: question,
        source_page: sourcePage,
        spot_id: spotId,
        spot_name: spotName,
        route_id: routeId,
        answer_status: fallback.score > 0 ? 'local_fallback_hit' : 'local_fallback_refused',
        latency_ms: latencyMs,
        source_label: fallback.sourceLabel,
      });
      recordQuestionMemory(question, displayAnswer, 'offline_fallback', {
        source_label: fallback.sourceLabel,
      });
      playReply(displayAnswer, fallback.emotion);
    });
  }, [playReply, recordQuestionMemory, releaseSendLock, scheduleChatSideEffect, setStreaming, updateMessage, updateMessageStatus, sourcePage, spotId, spotName, routeId, localAnswerContext]);

  const { connect } = useSSE({
    onMessage: useCallback((msg: any) => {
      const id = currentMsgIdRef.current;
      if (!id) return;

      if (msg.event === 'token') {
        const currentContent = useChatStore.getState().messages.find((m) => m.id === id)?.content || '';
        useChatStore.getState().updateMessage(id, currentContent + (msg.data?.token || ''));
      } else if (msg.event === 'faq_hit' || msg.event === 'cache_hit') {
        const answer = stripAnswerSource(msg.data?.answer || msg.data?.response || '');
        const question = currentQuestionRef.current;
        const latencyMs = currentQuestionStartedAtRef.current ? Date.now() - currentQuestionStartedAtRef.current : undefined;
        const emotion = msg.data?.emotion;
        updateMessage(id, answer);
        updateMessageStatus(id, 'sent');
        setStreaming(false);
        currentMsgIdRef.current = '';
        currentQuestionRef.current = '';
        currentQuestionStartedAtRef.current = 0;
        releaseSendLock();
        scheduleChatSideEffect(() => {
          void trackMobileEvent('question_asked', {
            text: question,
            source_page: sourcePage,
            spot_id: spotId,
            spot_name: spotName,
            route_id: routeId,
            answer_status: msg.event,
            latency_ms: latencyMs,
            emotion,
          });
          recordQuestionMemory(question, answer, msg.event, {
            emotion,
          });
          playReply(answer, emotion);
        });
      } else if (msg.event === 'done') {
        const question = currentQuestionRef.current;
        const latencyMs = currentQuestionStartedAtRef.current ? Date.now() - currentQuestionStartedAtRef.current : undefined;
        const emotion = msg.data?.emotion;
        setStreaming(false);
        updateMessageStatus(id, 'sent');
        const answer = stripAnswerSource(msg.data?.answer
          || useChatStore.getState().messages.find((m) => m.id === id)?.content
          || '');
        currentMsgIdRef.current = '';
        currentQuestionRef.current = '';
        currentQuestionStartedAtRef.current = 0;
        releaseSendLock();
        scheduleChatSideEffect(() => {
          void trackMobileEvent('question_asked', {
            text: question,
            source_page: sourcePage,
            spot_id: spotId,
            spot_name: spotName,
            route_id: routeId,
            answer_status: 'backend_done',
            latency_ms: latencyMs,
            emotion,
          });
          recordQuestionMemory(question, answer, 'backend_done', {
            emotion,
          });
          playReply(answer, emotion);
        });
      } else if (msg.event === 'error') {
        applyOfflineAnswer(id, currentQuestionRef.current);
      }
    }, [applyOfflineAnswer, releaseSendLock, scheduleChatSideEffect, setStreaming, updateMessage, updateMessageStatus, playReply, recordQuestionMemory, sourcePage, spotId, spotName, routeId]),
    onError: useCallback(() => {
      const id = currentMsgIdRef.current;
      if (id) {
        applyOfflineAnswer(id, currentQuestionRef.current);
      } else {
        releaseSendLock();
        setStreaming(false);
      }
    }, [applyOfflineAnswer, releaseSendLock, setStreaming]),
  });

  useEffect(() => {
    setPageContext('chat');
    void flushMobileEvents();
    const welcomeKey = [
      returnTo || 'tab',
      tourState.status,
      tourState.currentRoute?.id || 'no-route',
      tourState.currentSpot?.id || 'no-spot',
    ].join(':');
    if (spokenWelcomeKeyRef.current === welcomeKey) return;
    spokenWelcomeKeyRef.current = welcomeKey;
    const timer = setTimeout(() => {
      speakWithDriver(getTourWelcomeText(tourState), 'neutral');
    }, 600);
    return () => clearTimeout(timer);
  }, [
    returnTo,
    setPageContext,
    speakWithDriver,
    tourState.currentRoute?.id,
    tourState.currentSpot?.id,
    tourState.status,
  ]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isStreaming || sendLockedRef.current) return;

    const trimmed = text.trim();
    sendLockedRef.current = true;
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
    scheduleChatSideEffect(() => {
      primeQuestionResponse();
    });

    const localAnswer = getLocalDemoAnswer(trimmed, localAnswerContext);
    if (localAnswer) {
      const displayAnswer = stripAnswerSource(localAnswer.displayAnswer);
      addMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: displayAnswer,
        timestamp: Date.now(),
        status: 'sent',
        source: 'offline',
      });
      scheduleChatSideEffect(() => {
        void trackMobileEvent('question_asked', {
          text: trimmed,
          source_page: sourcePage,
          spot_id: spotId,
          spot_name: spotName,
          route_id: routeId,
          answer_status: 'local_demo_hit',
          latency_ms: 0,
          source_label: localAnswer.sourceLabel,
          category: localAnswer.category,
        });
        recordQuestionMemory(trimmed, displayAnswer, 'local_demo', {
          source_label: localAnswer.sourceLabel,
          category: localAnswer.category,
        });
        playReply(displayAnswer, localAnswer.emotion);
        releaseSendLock();
      });
      return;
    }

    const history = getHistory(5);
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

    scheduleChatSideEffect(() => {
      void connect(buildDigitalHumanChatStreamUrl(API_BASE_URL), buildDigitalHumanChatPayload({
        sessionId: activeSessionId,
        question: trimmed,
        history,
        spotId,
        spotName,
        routeId,
        sourcePage,
      })).catch(() => {
        applyOfflineAnswer(assistantMsg.id, trimmed);
      });
    });
  }, [
    addMessage,
    applyOfflineAnswer,
    connect,
    currentSessionId,
    getHistory,
    isStreaming,
    localAnswerContext,
    playReply,
    primeQuestionResponse,
    recordQuestionMemory,
    releaseSendLock,
    scheduleChatSideEffect,
    setCurrentSession,
    setStreaming,
    spotId,
    spotName,
    routeId,
    sourcePage,
  ]);

  const handleTourQuickQuestion = useCallback((text: string) => {
    if (text === '暂停导览') {
      tourActions.pauseTour();
      speakWithDriver('导览已暂停，需要继续时告诉我。', 'neutral');
      return;
    }
    sendMessage(text);
  }, [sendMessage, speakWithDriver, tourActions]);

  useEffect(() => {
    const question = initialQuestion?.trim();
    if (!question) return;
    const initialQuestionKey = [spotId || 'no-spot', spotName || 'no-name', question].join(':');
    if (sentInitialQuestionKeyRef.current === initialQuestionKey) return;
    sentInitialQuestionKeyRef.current = initialQuestionKey;
    const timer = setTimeout(() => {
      sendMessage(question);
    }, 400);
    return () => clearTimeout(timer);
  }, [initialQuestion, spotId, spotName, sendMessage]);

  const handleContextBack = useCallback(() => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/explore');
  }, [returnTo, router]);

  const reloadChatVrm = useCallback(() => {
    setVrmReady(false);
    setVrmReloadNonce((nonce) => nonce + 1);
    VRMManager.requestManualReload(undefined, '/chat');
  }, []);

  useEffect(() => {
    setVrmReady(false);
  }, [selectedCostume]);

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
          {showContextBack && (
            <Pressable
              style={styles.contextBackBtn}
              onPress={handleContextBack}
              accessibilityRole="button"
              accessibilityLabel={returnLabel}
              hitSlop={8}
            >
              <Text style={styles.contextBackText}>‹ {returnLabel}</Text>
            </Pressable>
          )}
          <Text style={styles.headerTitle}>{XIAOLING_CHAT_COPY.title}</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerSub}>{XIAOLING_CHAT_COPY.subtitle}</Text>
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
            key={`vrm-full-${selectedCostume}-${vrmReloadNonce}`}
            mode="full"
            expression={expression}
            mouthOpen={mouthOpen}
            speaking={isSpeaking}
            action={currentAction}
            actionDuration={currentActionDuration}
            headRotation={headRotation}
            enableGesture
            costumeId={selectedCostume}
            onReadyChange={setVrmReady}
          />

          {!vrmReady && (
            <View style={styles.chatAvatarFallback} pointerEvents="box-none">
              <View style={[styles.chatAvatarHalo, isSpeaking && styles.chatAvatarHaloActive]} />
              <View style={styles.chatAvatarSeal}>
                <View style={styles.chatAvatarGlow} />
                <Text style={styles.chatAvatarGlyph}>灵</Text>
                <View style={styles.chatAvatarWaveRow}>
                  <View style={[styles.chatAvatarWave, isSpeaking && styles.chatAvatarWaveActive]} />
                  <View style={[styles.chatAvatarWave, styles.chatAvatarWaveMid, isSpeaking && styles.chatAvatarWaveActive]} />
                  <View style={[styles.chatAvatarWave, isSpeaking && styles.chatAvatarWaveActive]} />
                </View>
              </View>
              <View style={styles.chatAvatarBadge}>
                <Text style={styles.chatAvatarName}>小灵</Text>
                <Text style={styles.chatAvatarStatus}>
                  {isSpeaking ? '讲解声纹同步中' : '数字人加载中'}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.chatAvatarReload,
                  pressed && styles.chatAvatarReloadPressed,
                ]}
                onPress={reloadChatVrm}
                accessibilityRole="button"
                accessibilityLabel="重新加载数字人"
              >
                <Text style={styles.chatAvatarReloadText}>重新加载数字人</Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.chatLayer, { bottom: TAB_BAR_CLEARANCE + Math.max(insets.bottom, 0) }]}>
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
                      onPress={() => router.push({
                        pathname: '/memory',
                        params: { returnTo: '/chat', returnLabel: '返回对话' },
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="查看旅行记忆"
                    >
                      <Text style={styles.tourResumeBtnText}>{XIAOLING_CHAT_COPY.memoryCta}</Text>
                    </Pressable>
                  ) : tourState.status === 'narrating' || tourState.status === 'navigate' ? (
                    <Pressable
                      style={styles.tourPauseBtn}
                      onPress={tourActions.pauseTour}
                      accessibilityRole="button"
                      accessibilityLabel="暂停当前导览"
                    >
                      <Text style={styles.tourPauseBtnText}>{XIAOLING_CHAT_COPY.pauseCta}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.tourResumeBtn}
                      onPress={tourActions.resumeTour}
                      accessibilityRole="button"
                      accessibilityLabel="继续当前导览"
                    >
                      <Text style={styles.tourResumeBtnText}>{XIAOLING_CHAT_COPY.resumeCta}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.tourEndBtn}
                    onPress={tourActions.endTour}
                    accessibilityRole="button"
                    accessibilityLabel="结束当前导览"
                  >
                    <Text style={styles.tourEndBtnText}>{XIAOLING_CHAT_COPY.endCta}</Text>
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

            <View style={styles.dialogDeck}>
              {messages.length === 0 && (
                <View style={styles.quickSection}>
                  <View style={styles.quickHeader}>
                    <Text style={styles.quickTitle}>
                      {tourState.currentRoute ? XIAOLING_CHAT_COPY.tourQuickTitle : XIAOLING_CHAT_COPY.quickTitle}
                    </Text>
                    <View style={styles.quickHeaderLine} />
                  </View>
                  <View style={styles.quickGrid}>
                    {(tourState.currentRoute ? TOUR_QUICK_QUESTIONS : QUICK_QUESTIONS).map((q) => (
                      <Pressable
                        key={q.text}
                        style={({ pressed }) => [
                          styles.quickBtn,
                          { borderColor: q.color + '38' },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => (tourState.currentRoute ? handleTourQuickQuestion(q.text) : sendMessage(q.text))}
                        accessibilityRole="button"
                        accessibilityLabel={q.text}
                      >
                        <View style={[styles.quickBtnMark, { backgroundColor: q.color }]} />
                        <Text style={styles.quickBtnText}>{q.text}</Text>
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
                      <Text style={styles.tourStartBtnText}>{XIAOLING_CHAT_COPY.routeCta}</Text>
                      <Text style={styles.tourStartArrow}>›</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.inputBar}>
                <TextInput
                  style={styles.input}
                  placeholder={XIAOLING_CHAT_COPY.inputPlaceholder}
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
                  <Text style={styles.sendBtnText}>送</Text>
                </Pressable>
              </View>
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
          voiceConfig={voiceConfig}
          onVoiceConfigChange={setVoiceConfig}
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
  contextBackBtn: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -14,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
  },
  contextBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
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
  chatAvatarFallback: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  chatAvatarHalo: {
    position: 'absolute',
    top: -20,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(106,156,137,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.22)',
  },
  chatAvatarHaloActive: {
    backgroundColor: 'rgba(200,75,49,0.13)',
    borderColor: 'rgba(200,75,49,0.24)',
  },
  chatAvatarSeal: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(253,251,247,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.34)',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  chatAvatarGlow: {
    position: 'absolute',
    top: -18,
    right: -12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(106,156,137,0.13)',
  },
  chatAvatarGlyph: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  chatAvatarWaveRow: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: 4,
  },
  chatAvatarWave: {
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(106,156,137,0.35)',
  },
  chatAvatarWaveMid: {
    height: 12,
  },
  chatAvatarWaveActive: {
    backgroundColor: 'rgba(200,75,49,0.52)',
  },
  chatAvatarBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(42,37,32,0.86)',
    alignItems: 'center',
  },
  chatAvatarName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  chatAvatarStatus: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
  },
  chatAvatarReload: {
    marginTop: 10,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.28)',
  },
  chatAvatarReloadPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: 'rgba(232,242,238,0.94)',
  },
  chatAvatarReloadText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  chatLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
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
    paddingBottom: 10,
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
  dialogDeck: {
    width: '88%',
    maxWidth: 380,
    alignSelf: 'center',
    marginBottom: 8,
    padding: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,208,200,0.66)',
    backgroundColor: 'rgba(253,251,247,0.88)',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
  },
  quickSection: {
    paddingHorizontal: 1,
    paddingTop: 1,
    paddingBottom: 8,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 7,
  },
  quickTitle: {
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  quickHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(196,191,182,0.52)',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    width: '48.6%',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  quickBtnMark: {
    width: 5,
    height: 18,
    borderRadius: 4,
    opacity: 0.84,
  },
  quickBtnText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.gray700,
    flex: 1,
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
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  tourStartBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  tourStartBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.6,
  },
  tourStartArrow: {
    fontSize: 19,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(212,208,200,0.78)',
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    fontSize: 14,
    color: Colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Colors.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,75,49,0.18)',
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
