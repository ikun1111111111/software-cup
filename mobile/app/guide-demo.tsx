import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet,
  Dimensions, Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { VRMView } from '@/components/vrm/VRMView';
import { VRMManager, type Emotion } from '@/components/vrm/VRMManager';
import { useVRMSync } from '@/hooks/useVRMSync';
import { useSSE } from '@/hooks/useSSE';
import { useChatStore } from '@/stores/chatStore';
import { matchPageGuide, type PageGuideConfig } from '@/config/pageGuide';
import { API_BASE_URL } from '@/api/config';
import { textToTimeline, ExpressionPlayer, type Action } from '@/utils/textTimeline';

const { width: SCREEN_W } = Dimensions.get('window');

type GuideState = 'prompt' | 'speaking' | 'question' | 'dismissed' | 'idle';

const DISMISS_KEY = 'guide_demo_dismissed';

export default function GuideDemoPage() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  // VRM 同步 — 启用 TTS 语音播放
  const {
    mouthOpen, isSpeaking, subtitle,
    triggerSpeak, stopSpeaking,
  } = useVRMSync('tts');

  // 本地表情控制（覆盖 useVRMSync 的 expression）
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

  // lookUp 曲线可视化
  const CURVE_DURATION = 1500;
  const [curveProgress, setCurveProgress] = useState(0);
  const [curveActive, setCurveActive] = useState(false);
  const curveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeLookUpCurve = (progress: number) => {
    const p = Math.min(progress, 1);
    if (p < 0.2) return Math.pow(p / 0.2, 2);
    if (p > 0.8) return Math.pow((1 - p) / 0.2, 2);
    return 1;
  };

  const startCurveDemo = useCallback(() => {
    if (curveTimerRef.current) clearInterval(curveTimerRef.current);
    setCurveActive(true);
    setCurveProgress(0);
    const start = Date.now();
    curveTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / CURVE_DURATION, 1);
      setCurveProgress(progress);
      if (progress >= 1) {
        clearInterval(curveTimerRef.current!);
        curveTimerRef.current = null;
        setTimeout(() => setCurveActive(false), 500);
      }
    }, 16);
  }, []);

  useEffect(() => {
    return () => { if (curveTimerRef.current) clearInterval(curveTimerRef.current); };
  }, []);

  // 初始化播放器
  useEffect(() => {
    playerRef.current = new ExpressionPlayer();
    return () => playerRef.current?.stop();
  }, []);

  // 导航状态
  const [guideState, setGuideState] = useState<GuideState>('prompt');
  const [inputText, setInputText] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState(0);

  // 模拟页面上下文 — 固定为 home
  const config: PageGuideConfig = {
    pageId: 'home',
    guidePrompt: '欢迎来到灵山胜境！我是小灵，你的数字导览员。需要我为你介绍一下吗？',
    welcomeText: '欢迎来到灵山胜境！这里是太湖之滨的佛教文化圣地。灵山大佛高88米，是世界上最高的青铜立佛。景区还有梵宫、九龙灌浴等精彩景点。有什么想了解的，随时问我！',
    autoSpeak: false,
    quickQuestions: ['推荐一条游玩路线', '灵山大佛有多高？', '景区开放时间', '门票多少钱？'],
    guideType: 'auto',
  };

  // Chat store
  const {
    messages, addMessage, updateMessage, updateMessageStatus,
    setStreaming, currentSessionId, setCurrentSession, isStreaming, getHistory,
  } = useChatStore();

  useEffect(() => {
    if (!currentSessionId) {
      setCurrentSession(`demo_${Date.now()}`);
    }
  }, [currentSessionId, setCurrentSession]);

  // SSE
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

  // 监听回答完成 → 启动表情时间线
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.status === 'sent' && last.content) {
      const text = last.content;
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
      setGuideState('speaking');

      // 说话结束后停止播放器
      const stopTimer = setTimeout(() => {
        playerRef.current?.stop();
        setDisplayExpression('neutral');
        setCurrentAction('none');
        setGuideState('idle');
      }, durationMs);

      return () => clearTimeout(stopTimer);
    }
  }, [messages, triggerSpeak]);

  // 检查是否已关闭
  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then((v) => {
      if (v === '1') setGuideState('dismissed');
    });
  }, []);

  const handleSpeak = useCallback(() => {
    const text = config.welcomeText;
    const durationMs = Math.max(3000, text.length * 150);
    const timeline = textToTimeline(text, durationMs);

    const first = timeline[0];
    if (first) {
      setDisplayExpression(first.expression);
      setCurrentAction(first.action);
      setCurrentActionDuration(first.durationMs ?? 800);
    }

    playerRef.current?.play(timeline, (expr, action, dur) => {
      setDisplayExpression(expr);
      setCurrentAction(action);
      setCurrentActionDuration(dur);
    });

    triggerSpeak(text, first?.expression || 'neutral');
    setGuideState('speaking');

    setTimeout(() => {
      playerRef.current?.stop();
      setDisplayExpression('neutral');
      setCurrentAction('none');
      setGuideState('idle');
    }, durationMs);
  }, [config, triggerSpeak]);

  const handleDismiss = useCallback(() => {
    setGuideState('dismissed');
    AsyncStorage.setItem(DISMISS_KEY, '1');
  }, []);

  const doSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    addMessage({
      id: `msg_${Date.now()}`, role: 'user',
      content: text.trim(), timestamp: Date.now(), status: 'sent',
    });
    addMessage({
      id: `msg_${Date.now() + 1}`, role: 'assistant',
      content: '', timestamp: Date.now(), status: 'sending',
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

  // 说话动画条
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
    } else {
      soundAnim.setValue(0);
    }
  }, [isSpeaking, soundAnim]);

  const soundBar1 = soundAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 16] });
  const soundBar2 = soundAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 6] });
  const soundBar3 = soundAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 14] });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ─── 顶部标题栏 ─── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>数字人导览 Demo</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* ─── VRM 数字人展示区（页面主体） ─── */}
      <View style={styles.vrmArea} pointerEvents="none">
        <VRMView
          mode="full"
          expression={displayExpression}
          mouthOpen={mouthOpen}
          speaking={isSpeaking}
          action={currentAction}
          actionDuration={currentActionDuration}
          headRotation={headRotation}
        />

        {/* 字幕 */}
        {isSpeaking && subtitle ? (
          <View style={styles.subtitleOverlay}>
            <Text style={styles.subtitleText} numberOfLines={2}>{subtitle}</Text>
          </View>
        ) : null}

        {/* 说话指示器 */}
        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <RNAnimated.View style={[styles.dot, { height: soundBar1 }]} />
            <RNAnimated.View style={[styles.dot, { height: soundBar2 }]} />
            <RNAnimated.View style={[styles.dot, { height: soundBar3 }]} />
            <Text style={styles.speakingLabel}>讲解中</Text>
          </View>
        )}
      </View>

      {/* ─── lookUp 曲线可视化 ─── */}
      {curveActive && (
        <View style={styles.curveOverlay}>
          <Text style={styles.curveTitle}>lookUp 曲线 — lookAtX/Y × curve</Text>
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

      {/* ─── 底部导览面板 ─── */}
      <View style={styles.panelContainer}>
        {/* 已关闭 → 小按钮重新打开 */}
        {guideState === 'dismissed' && (
          <Pressable style={styles.reopenBtn} onPress={() => setGuideState('prompt')}>
            <Text style={styles.reopenIcon}>💰</Text>
            <Text style={styles.reopenText}>小灵</Text>
          </Pressable>
        )}

        {/* 引导气泡 */}
        {guideState === 'prompt' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>🤖 小灵 · 智能导览</Text>
              <Pressable onPress={handleDismiss} hitSlop={8}>
                <Text style={styles.panelClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.panelText}>{config.guidePrompt}</Text>
            <View style={styles.panelButtons}>
              <Pressable style={styles.primaryBtn} onPress={handleSpeak}>
                <Text style={styles.primaryBtnText}>▶ 需要讲解</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setGuideState('question'); inputRef.current?.focus(); }}
              >
                <Text style={styles.secondaryBtnText}>? 随便问问</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 提问框 */}
        {guideState === 'question' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>💰 向小灵提问</Text>
              <Pressable
                onPress={() => setGuideState('prompt')}
                hitSlop={8}
              >
                <Text style={styles.panelClose}>✕</Text>
              </Pressable>
            </View>

            {/* 消息列表 */}
            <ScrollView
              style={styles.msgList}
              contentContainerStyle={styles.msgListContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <Text style={styles.emptyHint}>有什么关于灵山的问题？试试下面的快捷问题</Text>
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

            {/* 快捷问题 */}
            {messages.length === 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {config.quickQuestions.map((q) => (
                  <Pressable
                    key={q}
                    style={styles.chip}
                    onPress={() => doSend(q)}
                  >
                    <Text style={styles.chipText}>{q}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* 输入区 */}
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
                <Text style={styles.sendBtnIcon}>↑</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 空闲态 */}
        {guideState === 'idle' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>🤖 小灵</Text>
              <Pressable onPress={handleDismiss} hitSlop={8}>
                <Text style={styles.panelClose}>✕</Text>
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

      {/* ─── 底部测试栏 ─── */}
      <View style={styles.testBar}>
        {/* 表情测试 */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>表情</Text>
          <View style={styles.testRow}>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('neutral'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>😐 中立</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('happy'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>😊 开心</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('sad'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>😢 悲伤</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('angry'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>😠 生气</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('relaxed'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>😌 放松</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('surprised'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>😲 惊讶</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setDisplayExpression('thinking'); setCurrentAction('none'); }}>
              <Text style={styles.testBtnText}>🤔 思考</Text>
            </Pressable>
          </View>
        </View>

        {/* 动作测试 */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>动作</Text>
          <View style={styles.testRow}>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('nod'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>点头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('shakeHead'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>摇头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('tiltHead'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>歪头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('lookUp'); setCurrentActionDuration(2000); }}>
              <Text style={styles.testBtnText}>抬头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('lookDown'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>低头</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('wave'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>挥手</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('point'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>指向</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('clap'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>鼓掌</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => { setCurrentAction('bow'); setCurrentActionDuration(1500); }}>
              <Text style={styles.testBtnText}>鞠躬</Text>
            </Pressable>
          </View>
        </View>

        {/* 场景测试 */}
        <View style={styles.testSection}>
          <Text style={styles.testLabel}>场景</Text>
          <View style={styles.testRow}>
            <Pressable style={styles.testBtn} onPress={() => {
              const text = '欢迎来到灵山胜境，非常漂亮';
              const durationMs = Math.max(3000, text.length * 150);
              const tl = textToTimeline(text, durationMs);
              playerRef.current?.play(tl, (e, a, d) => { setDisplayExpression(e); setCurrentAction(a); setCurrentActionDuration(d); });
              triggerSpeak(text, 'neutral');
            }}>
              <Text style={styles.testBtnText}>😊 欢迎</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => {
              const text = '让我想想这个问题，大概不太清楚';
              const durationMs = Math.max(3000, text.length * 150);
              const tl = textToTimeline(text, durationMs);
              playerRef.current?.play(tl, (e, a, d) => { setDisplayExpression(e); setCurrentAction(a); setCurrentActionDuration(d); });
              triggerSpeak(text, 'thinking');
            }}>
              <Text style={styles.testBtnText}>🤔 思考</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => {
              const text = '哇，灵山大佛高达88米，太壮观了';
              const durationMs = Math.max(3000, text.length * 150);
              const tl = textToTimeline(text, durationMs);
              playerRef.current?.play(tl, (e, a, d) => { setDisplayExpression(e); setCurrentAction(a); setCurrentActionDuration(d); });
              triggerSpeak(text, 'surprised');
            }}>
              <Text style={styles.testBtnText}>😲 惊叹</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => {
              const text = '很抱歉，这个问题我不太清楚';
              const durationMs = Math.max(3000, text.length * 150);
              const tl = textToTimeline(text, durationMs);
              playerRef.current?.play(tl, (e, a, d) => { setDisplayExpression(e); setCurrentAction(a); setCurrentActionDuration(d); });
              triggerSpeak(text, 'sad');
            }}>
              <Text style={styles.testBtnText}>😢 抱歉</Text>
            </Pressable>
            <Pressable style={styles.testBtn} onPress={() => {
              const text = '嗯，我知道了';
              const durationMs = Math.max(3000, text.length * 150);
              const tl = textToTimeline(text, durationMs);
              playerRef.current?.play(tl, (e, a, d) => { setDisplayExpression(e); setCurrentAction(a); setCurrentActionDuration(d); });
              triggerSpeak(text, 'neutral');
            }}>
              <Text style={styles.testBtnText}>😐 明白</Text>
            </Pressable>
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

  // ─── 顶部栏 ───
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

  // ─── VRM 区域 ───
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

  // ─── 底部面板 ───
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
    fontSize: 16,
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

  // ─── 消息列表 ───
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

  // ─── 快捷问题 ───
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

  // ─── 输入区 ───
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
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },

  // ─── 重新打开按钮 ───
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reopenIcon: {
    fontSize: 16,
  },
  reopenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // ─── 统计 ───
  statsText: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 6,
  },

  // ─── 表情测试栏 ───
  emotionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  emotionChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionEmoji: {
    fontSize: 22,
  },

  // ─── 测试面板 ───
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
    textTransform: 'uppercase',
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
  gestureDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginHorizontal: 4,
  },
  gestureChip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.2)',
  },

  // ─── 曲线可视化 ───
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
    letterSpacing: 0.5,
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
});
