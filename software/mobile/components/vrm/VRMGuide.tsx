import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Animated as RNAnimated, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { Colors } from '@/constants/colors';
import { VRMView } from './VRMView';
import type { Emotion } from './VRMTypes';
import { useSSE } from '@/hooks/useSSE';
import { useChatStore } from '@/stores/chatStore';
import { matchPageGuide } from '@/config/pageGuide';
import { API_BASE_URL } from '@/api/config';
import { useDigitalHumanDriver } from '@/hooks/useDigitalHumanDriver';
import { estimateSpeechDuration } from '@/utils/digitalHumanDriver';
import { DEFAULT_DIGITAL_HUMAN_VOICE_MODE } from '@/utils/digitalHumanProduct';
import {
  buildDigitalHumanChatPayload,
  buildDigitalHumanChatStreamUrl,
} from '@/utils/aiChat';

const { width: SCREEN_W } = Dimensions.get('window');

type GuideState = 'prompt' | 'speaking' | 'question' | 'dismissed' | 'idle';

const DISMISS_PREFIX = 'guide_demo_dismissed_';

export const VRMGuide: React.FC = () => {
  const [guideState, setGuideState] = useState<GuideState>('prompt');
  const [inputText, setInputText] = useState('');
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const {
    expression,
    mouthOpen,
    isSpeaking,
    subtitle,
    action: currentAction,
    actionDurationMs: currentActionDuration,
    headRotation,
    speak: speakText,
    setExpression,
    playAction,
  } = useDigitalHumanDriver(DEFAULT_DIGITAL_HUMAN_VOICE_MODE);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeName = usePathname();
  const config = matchPageGuide(routeName);

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

  const playGuideText = useCallback((text: string, emotion?: Emotion) => {
    const durationMs = estimateSpeechDuration(text);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    speakText(text, { emotion, durationMs });
    setGuideState('speaking');
    idleTimerRef.current = setTimeout(() => {
      setGuideState('idle');
      idleTimerRef.current = null;
    }, durationMs);
  }, [speakText]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // 鐩戝惉鍥炵瓟瀹屾垚 鈫?鍚姩琛ㄦ儏鏃堕棿杞?
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.status === 'sent' && last.content) {
      playGuideText(last.content);
    }
  }, [messages, playGuideText]);

  // 妫€鏌ユ槸鍚﹀凡鍏抽棴
  useEffect(() => {
    if (config) {
      AsyncStorage.getItem(`${DISMISS_PREFIX}${config.pageId}`).then((v) => {
        if (v === '1') setGuideState('dismissed');
      });
    }
  }, [config]);

  const handleSpeak = useCallback(() => {
    if (!config) return;
    playGuideText(config.welcomeText);
  }, [config, playGuideText]);

  const handleDismiss = useCallback(() => {
    setGuideState('dismissed');
    if (config) {
      AsyncStorage.setItem(`${DISMISS_PREFIX}${config.pageId}`, '1');
    }
  }, [config]);

  const doSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    const activeSessionId = currentSessionId ?? `demo_${Date.now()}`;
    if (!currentSessionId) {
      setCurrentSession(activeSessionId);
    }

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

    connect(buildDigitalHumanChatStreamUrl(API_BASE_URL), buildDigitalHumanChatPayload({
      sessionId: activeSessionId,
      question: text,
      history: getHistory(5),
      sourcePage: config?.pageId ?? 'vrm_guide',
    }));
  }, [isStreaming, currentSessionId, setCurrentSession, addMessage, setStreaming, connect, getHistory, config?.pageId]);

  // 璇磋瘽鍔ㄧ敾鏉?
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

  if (!config) return null;

  // Show reset button when dismissed
  if (guideState === 'dismissed') {
    return (
      <Pressable
        onPress={() => setGuideState('prompt')}
        style={styles.dismissedButton}
      >
        <Text style={styles.dismissedIcon}>馃挰</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {/* 鈹€鈹€鈹€ VRM 鏁板瓧浜哄睍绀哄尯 鈹€鈹€鈹€ */}
      <View style={styles.vrmArea} pointerEvents="none">
        <VRMView
          mode="float"
          expression={expression}
          mouthOpen={mouthOpen}
          speaking={isSpeaking}
          action={currentAction}
          actionDuration={currentActionDuration}
          headRotation={headRotation}
        />

        {/* 瀛楀箷 */}
        {isSpeaking && subtitle ? (
          <View style={styles.subtitleOverlay}>
            <Text style={styles.subtitleText} numberOfLines={2}>{subtitle}</Text>
          </View>
        ) : null}

        {/* 璇磋瘽鎸囩ず鍣?*/}
        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <RNAnimated.View style={[styles.dot, { height: soundBar1 }]} />
            <RNAnimated.View style={[styles.dot, { height: soundBar2 }]} />
            <RNAnimated.View style={[styles.dot, { height: soundBar3 }]} />
            <Text style={styles.speakingLabel}>璁茶В涓</Text>
          </View>
        )}
      </View>

      {/* 鈹€鈹€鈹€ 搴曢儴瀵艰闈㈡澘 鈹€鈹€鈹€ */}
      <View style={styles.panelContainer}>
        {/* 寮曞姘旀场 */}
        {guideState === 'prompt' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>馃 灏忕伒 路 鏅鸿兘瀵艰</Text>
              <Pressable onPress={handleDismiss} hitSlop={8}>
                <Text style={styles.panelClose}>鉁</Text>
              </Pressable>
            </View>
            <Text style={styles.panelText}>{config.guidePrompt}</Text>
            <View style={styles.panelButtons}>
              <Pressable style={styles.primaryBtn} onPress={handleSpeak}>
                <Text style={styles.primaryBtnText}>鈻?闇€瑕佽瑙</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setGuideState('question'); inputRef.current?.focus(); }}
              >
                <Text style={styles.secondaryBtnText}>? 闅忎究闂棶</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 鎻愰棶妗?*/}
        {guideState === 'question' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>馃挰 鍚戝皬鐏垫彁闂</Text>
              <Pressable
                onPress={() => setGuideState('prompt')}
                hitSlop={8}
              >
                <Text style={styles.panelClose}>鉁</Text>
              </Pressable>
            </View>

            {/* 娑堟伅鍒楄〃 */}
            <ScrollView
              style={styles.msgList}
              contentContainerStyle={styles.msgListContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <Text style={styles.emptyHint}>鏈変粈涔堝叧浜庣伒灞辩殑闂锛熻瘯璇曚笅闈㈢殑蹇嵎闂</Text>
              ) : (
                messages.map((msg) => {
                  let displayText = msg.content;
                  if (msg.role === 'assistant') {
                    if (!displayText && msg.status === 'sending') displayText = '鎬濊€冧腑...';
                    else if (!displayText && msg.status === 'error') displayText = '鍥炲澶辫触锛岃閲嶈瘯';
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

            {/* 蹇嵎闂 */}
            {messages.length === 0 && config.quickQuestions.length > 0 && (
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

            {/* 杈撳叆鍖?*/}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => { doSend(inputText); setInputText(''); }}
                placeholder="杈撳叆浣犵殑闂..."
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
                <Text style={styles.sendBtnIcon}>鈫</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 绌洪棽鎬?*/}
        {guideState === 'idle' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>馃 灏忕伒</Text>
              <Pressable onPress={handleDismiss} hitSlop={8}>
                <Text style={styles.panelClose}>鉁</Text>
              </Pressable>
            </View>
            <View style={styles.panelButtons}>
              <Pressable style={styles.secondaryBtn} onPress={handleSpeak}>
                <Text style={styles.secondaryBtnText}>鍐嶅惉涓€娆¤瑙</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setGuideState('question'); inputRef.current?.focus(); }}
              >
                <Text style={styles.secondaryBtnText}>缁х画鎻愰棶</Text>
              </Pressable>
            </View>
            {questionsAsked > 0 && (
              <Text style={styles.statsText}>宸叉彁闂?{questionsAsked} 娆</Text>
            )}
          </View>
        )}

        {/* 鈹€鈹€鈹€ 搴曢儴娴嬭瘯鏍?鈹€鈹€鈹€ */}
        <View style={styles.testBar}>
          {/* 琛ㄦ儏娴嬭瘯 */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>琛ㄦ儏</Text>
            <View style={styles.testRow}>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('neutral'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃槓 涓珛</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('happy'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃槉 寮€蹇</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('sad'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃様 鎮蹭激</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('angry'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃槧 鐢熸皵</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('relaxed'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃槍 鏀炬澗</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('surprised'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃槻 鎯婅</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { setExpression('thinking'); playAction('none'); }}>
                <Text style={styles.testBtnText}>馃 鎬濊€</Text>
              </Pressable>
            </View>
          </View>

          {/* 鍔ㄤ綔娴嬭瘯 */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>鍔ㄤ綔</Text>
            <View style={styles.testRow}>
              <Pressable style={styles.testBtn} onPress={() => { playAction('nod', 1500); }}>
                <Text style={styles.testBtnText}>鐐瑰ご</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('shakeHead', 1500); }}>
                <Text style={styles.testBtnText}>鎽囧ご</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('tiltHead', 1500); }}>
                <Text style={styles.testBtnText}>姝ご</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('lookUp', 2000); }}>
                <Text style={styles.testBtnText}>鎶ご</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('lookDown', 1500); }}>
                <Text style={styles.testBtnText}>浣庡ご</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('wave', 1500); }}>
                <Text style={styles.testBtnText}>鎸ユ墜</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('point', 1500); }}>
                <Text style={styles.testBtnText}>鎸囧悜</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('clap', 1500); }}>
                <Text style={styles.testBtnText}>榧撴帉</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => { playAction('bow', 1500); }}>
                <Text style={styles.testBtnText}>闉犺含</Text>
              </Pressable>
            </View>
          </View>

          {/* 鍦烘櫙娴嬭瘯 */}
          <View style={styles.testSection}>
            <Text style={styles.testLabel}>鍦烘櫙</Text>
            <View style={styles.testRow}>
              <Pressable style={styles.testBtn} onPress={() => {
              const text = '欢迎来到灵山胜境，非常漂亮';
                playGuideText(text, 'neutral');
              }}>
                <Text style={styles.testBtnText}>馃槉 娆㈣繋</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => {
              const text = '欢迎来到灵山胜境，非常漂亮';
                playGuideText(text, 'thinking');
              }}>
                <Text style={styles.testBtnText}>馃 鎬濊€</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => {
                const text = '鍝囷紝鐏靛北澶т經楂樿揪88绫筹紝澶．瑙備簡';
                playGuideText(text, 'surprised');
              }}>
                <Text style={styles.testBtnText}>馃槻 鎯婂徆</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => {
              const text = '欢迎来到灵山胜境，非常漂亮';
                playGuideText(text, 'sad');
              }}>
                <Text style={styles.testBtnText}>馃様 鎶辨瓑</Text>
              </Pressable>
              <Pressable style={styles.testBtn} onPress={() => {
                const text = '鍡紝鎴戠煡閬撲簡';
                playGuideText(text, 'neutral');
              }}>
                <Text style={styles.testBtnText}>馃槓 鏄庣櫧</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },

  // 鈹€鈹€鈹€ VRM 鍖哄煙 鈹€鈹€鈹€
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

  // 鈹€鈹€鈹€ 搴曢儴闈㈡澘 鈹€鈹€鈹€
  panelContainer: {
    minHeight: 120,
    maxHeight: 400,
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

  // 鈹€鈹€鈹€ 娑堟伅鍒楄〃 鈹€鈹€鈹€
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

  // 鈹€鈹€鈹€ 蹇嵎闂 鈹€鈹€鈹€
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

  // 鈹€鈹€鈹€ 杈撳叆鍖?鈹€鈹€鈹€
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

  // 鈹€鈹€鈹€ 缁熻 鈹€鈹€鈹€
  statsText: {
    fontSize: 11,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 6,
  },

  // 鈹€鈹€鈹€ 娴嬭瘯闈㈡澘 鈹€鈹€鈹€
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

  // 鈹€鈹€鈹€ 閲嶆柊鎵撳紑鎸夐挳 鈹€鈹€鈹€
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
});

export default VRMGuide;
