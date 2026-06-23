import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { VRMView } from '@/components/vrm/VRMView';
import type { Emotion } from '@/components/vrm/VRMTypes';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { useSSE } from '@/hooks/useSSE';
import { useChatStore } from '@/stores/chatStore';
import type { PageGuideConfig } from '@/config/pageGuide';
import { API_BASE_URL } from '@/api/config';
import { estimateSpeechDuration } from '@/utils/digitalHumanDriver';

type GuideState = 'prompt' | 'speaking' | 'question' | 'dismissed' | 'idle';

const DISMISS_KEY = 'guide_demo_dismissed';
const CURVE_DURATION = 1500;

const config: PageGuideConfig = {
  pageId: 'home',
  guidePrompt: '欢迎来到灵山胜境。我是小灵，你的数字导览员，需要我先为你讲解一下吗？',
  welcomeText: '欢迎来到灵山胜境。这里是太湖之滨的佛教文化圣地，灵山大佛高八十八米，是世界著名的青铜立佛。景区还有梵宫、九龙灌浴等代表性景点，有什么想了解的，随时问我。',
  autoSpeak: false,
  quickQuestions: ['推荐一条游玩路线', '灵山大佛有多高？', '景区开放时间？', '门票多少钱？'],
  guideType: 'auto',
};

const sceneExamples: Array<{ label: string; emotion: Emotion; text: string }> = [
  { label: '欢迎', emotion: 'neutral', text: '欢迎来到灵山胜境，非常高兴见到你。' },
  { label: '思考', emotion: 'thinking', text: '让我想想这个问题，我们可以从游览路线和文化背景两方面来看。' },
  { label: '惊叹', emotion: 'surprised', text: '灵山大佛高达八十八米，站在广场上看会非常震撼。' },
  { label: '抱歉', emotion: 'sad', text: '很抱歉，这个问题我现在还不够确定，可以换个方式再问我一次。' },
  { label: '明白', emotion: 'neutral', text: '嗯，我知道了，接下来我会按你的节奏继续讲解。' },
];

const expressionExamples: Array<{ label: string; emotion: Emotion }> = [
  { label: '中立', emotion: 'neutral' },
  { label: '开心', emotion: 'happy' },
  { label: '悲伤', emotion: 'sad' },
  { label: '生气', emotion: 'angry' },
  { label: '放松', emotion: 'relaxed' },
  { label: '惊讶', emotion: 'surprised' },
  { label: '思考', emotion: 'thinking' },
];

export default function GuideDemoPage() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [guideState, setGuideState] = useState<GuideState>('prompt');
  const [inputText, setInputText] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [curveProgress, setCurveProgress] = useState(0);
  const [curveActive, setCurveActive] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const curveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action: currentAction,
    actionDurationMs: currentActionDuration,
    headRotation,
    speak,
    setExpression,
    playAction,
  } = useDigitalHumanDriver('tts');

  const {
    messages, addMessage,
    setStreaming, currentSessionId, setCurrentSession, isStreaming, getHistory,
  } = useChatStore();

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const playGuideText = useCallback((text: string, emotion?: Emotion) => {
    const durationMs = estimateSpeechDuration(text);
    clearIdleTimer();
    speak(text, { emotion, durationMs });
    setGuideState('speaking');
    idleTimerRef.current = setTimeout(() => {
      setGuideState('idle');
      idleTimerRef.current = null;
    }, durationMs);
  }, [clearIdleTimer, speak]);

  useEffect(() => {
    return () => {
      clearIdleTimer();
      if (curveTimerRef.current) clearInterval(curveTimerRef.current);
    };
  }, [clearIdleTimer]);

  useEffect(() => {
    if (!currentSessionId) {
      setCurrentSession(`demo_${Date.now()}`);
    }
  }, [currentSessionId, setCurrentSession]);

  const { connect } = useSSE({
    onMessage: (msg) => {
      const { messages: latest, updateMessage: upd, updateMessageStatus: updSt } = useChatStore.getState();
      const last = latest[latest.length - 1];
      if (!last) return;

      if (msg.event === 'token') {
        if (last.role === 'assistant') upd(last.id, last.content + (msg.data.token || ''));
      } else if (msg.event === 'faq_hit' || msg.event === 'done') {
        const answer = msg.data?.answer || msg.data?.data?.answer || '';
        if (answer && last.role === 'assistant' && !last.content) {
          upd(last.id, answer);
        }
        setStreaming(false);
        updSt(last.id, 'sent');
      } else if (msg.event === 'error') {
        setStreaming(false);
        updSt(last.id, 'error');
      }
    },
    onError: () => setStreaming(false),
    onClose: () => setStreaming(false),
  });

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.status === 'sent' && last.content) {
      playGuideText(last.content);
    }
  }, [messages, playGuideText]);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((value) => {
      if (value === '1') setGuideState('dismissed');
    });
  }, []);

  const doSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;

    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      status: 'sent',
    });
    addMessage({
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending',
    });
    setStreaming(true);
    setQuestionsAsked(q => q + 1);

    connect(`${API_BASE_URL}/chat/stream`, {
      session_id: currentSessionId,
      question: text.trim(),
      stream: true,
      history: getHistory(5),
    });
  }, [isStreaming, currentSessionId, addMessage, setStreaming, connect, getHistory]);

  const handleDismiss = useCallback(() => {
    clearIdleTimer();
    setGuideState('dismissed');
    AsyncStorage.setItem(DISMISS_KEY, '1');
  }, [clearIdleTimer]);

  const handleSpeak = useCallback(() => {
    playGuideText(config.welcomeText, 'neutral');
  }, [playGuideText]);

  const computeLookUpCurve = useCallback((progress: number) => {
    const p = Math.min(progress, 1);
    if (p < 0.2) return Math.pow(p / 0.2, 2);
    if (p > 0.8) return Math.pow((1 - p) / 0.2, 2);
    return 1;
  }, []);

  const startCurveDemo = useCallback(() => {
    if (curveTimerRef.current) clearInterval(curveTimerRef.current);
    playAction('lookUp', CURVE_DURATION);
    setCurveActive(true);
    setCurveProgress(0);

    const start = Date.now();
    curveTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / CURVE_DURATION, 1);
      setCurveProgress(progress);
      if (progress >= 1 && curveTimerRef.current) {
        clearInterval(curveTimerRef.current);
        curveTimerRef.current = null;
        setTimeout(() => setCurveActive(false), 500);
      }
    }, 16);
  }, [playAction]);

  const soundAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (isSpeaking) {
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(soundAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          RNAnimated.timing(soundAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    soundAnim.setValue(0);
  }, [isSpeaking, soundAnim]);

  const soundBar1 = soundAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 16] });
  const soundBar2 = soundAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 6] });
  const soundBar3 = soundAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 14] });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>数字人导览 Demo</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.vrmArea} pointerEvents="none">
        <VRMView
          mode="full"
          expression={expression}
          mouthOpen={mouthOpen}
          speaking={isSpeaking}
          action={currentAction}
          actionDuration={currentActionDuration}
          headRotation={headRotation}
        />

        {isSpeaking && subtitle ? (
          <View style={styles.subtitleOverlay}>
            <Text style={styles.subtitleText} numberOfLines={2}>{subtitle}</Text>
          </View>
        ) : null}

        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <RNAnimated.View style={[styles.dot, { height: soundBar1 }]} />
            <RNAnimated.View style={[styles.dot, { height: soundBar2 }]} />
            <RNAnimated.View style={[styles.dot, { height: soundBar3 }]} />
            <Text style={styles.speakingLabel}>讲解中</Text>
          </View>
        )}
      </View>

      {curveActive && (
        <View style={styles.curveOverlay}>
          <Text style={styles.curveTitle}>lookUp 曲线</Text>
          <View style={styles.curveChart}>
            {Array.from({ length: 30 }, (_, i) => {
              const p = i / 29;
              const val = computeLookUpCurve(p);
              const isActive = Math.abs(p - curveProgress) < 0.04;
              return (
                <View key={i} style={styles.curveBarWrap}>
                  <View
                    style={[
                      styles.curveBar,
                      { height: val * 60, backgroundColor: isActive ? '#E85D3A' : 'rgba(106,156,137,0.4)' },
                    ]}
                  />
                  {isActive && (
                    <View style={styles.curveCursor}>
                      <Text style={styles.curveCursorText}>
                        {`p=${curveProgress.toFixed(2)}\nX=${(2.5 * val).toFixed(2)}\nY=${(2.0 * val).toFixed(2)}`}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.curveAxisLabels}>
            <Text style={styles.curveAxisLabel}>0%</Text>
            <Text style={styles.curveAxisLabel}>20% easeIn</Text>
            <Text style={styles.curveAxisLabel}>80%</Text>
            <Text style={styles.curveAxisLabel}>100% easeOut</Text>
          </View>
        </View>
      )}

      <View style={styles.panelContainer}>
        {guideState === 'dismissed' && (
          <Pressable style={styles.reopenBtn} onPress={() => setGuideState('prompt')}>
            <Text style={styles.reopenText}>小灵</Text>
          </Pressable>
        )}

        {guideState === 'prompt' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>小灵 · 智能导览</Text>
              <Pressable onPress={handleDismiss} hitSlop={8}>
                <Text style={styles.panelClose}>关闭</Text>
              </Pressable>
            </View>
            <Text style={styles.panelText}>{config.guidePrompt}</Text>
            <View style={styles.panelButtons}>
              <Pressable style={styles.primaryBtn} onPress={handleSpeak}>
                <Text style={styles.primaryBtnText}>需要讲解</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setGuideState('question'); inputRef.current?.focus(); }}
              >
                <Text style={styles.secondaryBtnText}>随便问问</Text>
              </Pressable>
            </View>
          </View>
        )}

        {guideState === 'question' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>向小灵提问</Text>
              <Pressable onPress={() => setGuideState('prompt')} hitSlop={8}>
                <Text style={styles.panelClose}>返回</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.msgList}
              contentContainerStyle={styles.msgListContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <Text style={styles.emptyHint}>试试下面的快捷问题，或直接输入你想了解的内容。</Text>
              ) : (
                messages.map((msg) => {
                  let displayText = msg.content;
                  if (msg.role === 'assistant') {
                    if (!displayText && msg.status === 'sending') displayText = '思考中...';
                    else if (!displayText && msg.status === 'error') displayText = '回复失败，请重试';
                    else if (!displayText) displayText = '...';
                  }
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.msgBubble,
                        msg.role === 'user' ? styles.userMsg : styles.botMsg,
                      ]}
                    >
                      <Text
                        style={[
                          styles.msgText,
                          msg.role === 'user' ? styles.userMsgText : styles.botMsgText,
                        ]}
                      >
                        {displayText}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {messages.length === 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {config.quickQuestions.map((question) => (
                  <Pressable key={question} style={styles.chip} onPress={() => doSend(question)}>
                    <Text style={styles.chipText}>{question}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => { doSend(inputText); setInputText(''); }}
                placeholder="输入你的问题..."
                placeholderTextColor={Colors.gray400}
                editable={!isStreaming}
                returnKeyType="send"
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isStreaming) && styles.sendBtnOff,
                ]}
                onPress={() => { doSend(inputText); setInputText(''); }}
                disabled={!inputText.trim() || isStreaming}
              >
                <Text style={styles.sendBtnIcon}>发</Text>
              </Pressable>
            </View>
          </View>
        )}

        {guideState === 'idle' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>小灵</Text>
              <Pressable onPress={handleDismiss} hitSlop={8}>
                <Text style={styles.panelClose}>关闭</Text>
              </Pressable>
            </View>
            <View style={styles.panelButtons}>
              <Pressable style={styles.secondaryBtn} onPress={handleSpeak}>
                <Text style={styles.secondaryBtnText}>再听一次讲解</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setGuideState('question'); inputRef.current?.focus(); }}
              >
                <Text style={styles.secondaryBtnText}>继续提问</Text>
              </Pressable>
            </View>
            {questionsAsked > 0 && (
              <Text style={styles.statsText}>已提问 {questionsAsked} 次</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.testBar}>
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>表情</Text>
          <View style={styles.testRow}>
            {expressionExamples.map((item) => (
              <Pressable key={item.emotion} style={styles.testBtn} onPress={() => { setExpression(item.emotion); playAction('none'); }}>
                <Text style={styles.testBtnText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.testLabel}>动作</Text>
          <View style={styles.testRow}>
            <Pressable style={styles.testBtn} onPress={() => playAction('nod', 1500)}>
              <Text style={styles.testBtnText}>点头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('shakeHead', 1500)}>
              <Text style={styles.testBtnText}>摇头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('tiltHead', 1500)}>
              <Text style={styles.testBtnText}>歪头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={startCurveDemo}>
              <Text style={styles.testBtnText}>抬头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('lookDown', 1500)}>
              <Text style={styles.testBtnText}>低头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('wave', 1500)}>
              <Text style={styles.testBtnText}>挥手</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('point', 1500)}>
              <Text style={styles.testBtnText}>指向</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('clap', 1500)}>
              <Text style={styles.testBtnText}>鼓掌</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => playAction('bow', 1500)}>
              <Text style={styles.testBtnText}>鞠躬</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.testLabel}>场景</Text>
          <View style={styles.testRow}>
            {sceneExamples.map((item) => (
              <Pressable key={item.label} style={styles.testBtn} onPress={() => playGuideText(item.text, item.emotion)}>
                <Text style={styles.testBtnText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(247,245,240,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  topSpacer: {
    width: 50,
  },
  vrmArea: {
    flex: 1,
    minHeight: 300,
    backgroundColor: Colors.primaryBg,
    position: 'relative',
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  speakingLabel: {
    fontSize: 11,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  curveOverlay: {
    backgroundColor: 'rgba(253,251,247,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106,156,137,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 110,
    zIndex: 10,
  },
  curveTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  curveChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 2,
  },
  curveBarWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 80,
  },
  curveBar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 2,
  },
  curveCursor: {
    position: 'absolute',
    top: -4,
    backgroundColor: '#E85D3A',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 60,
  },
  curveCursorText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 11,
  },
  curveAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  curveAxisLabel: {
    fontSize: 9,
    color: Colors.gray400,
  },
  panelContainer: {
    minHeight: 120,
    maxHeight: 320,
  },
  panel: {
    backgroundColor: 'rgba(253,251,247,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(106,156,137,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  panelClose: {
    fontSize: 13,
    color: Colors.gray400,
    padding: 4,
  },
  panelText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray600,
    marginBottom: 12,
  },
  panelButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.3)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  msgList: {
    maxHeight: 140,
    minHeight: 50,
  },
  msgListContent: {
    paddingBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: 'center',
    paddingVertical: 10,
  },
  msgBubble: {
    maxWidth: '82%',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  botMsg: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gray100,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 18,
  },
  userMsgText: {
    color: '#fff',
  },
  botMsgText: {
    color: Colors.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.3)',
  },
  chipText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    fontSize: 13,
    backgroundColor: Colors.surfaceBg,
    color: Colors.ink,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {
    backgroundColor: Colors.gray300,
  },
  sendBtnIcon: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  reopenBtn: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reopenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  statsText: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 6,
  },
  testBar: {
    maxHeight: 260,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testSection: {
    marginBottom: 6,
  },
  testLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gray400,
    marginBottom: 4,
  },
  testRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  testBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  testBtnText: {
    fontSize: 12,
    color: Colors.ink,
    fontWeight: '500',
  },
});
