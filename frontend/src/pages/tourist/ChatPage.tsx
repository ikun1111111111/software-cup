import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AudioOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseOutlined,
  CompassOutlined,
  HistoryOutlined,
  LoadingOutlined,
  PauseOutlined,
  ReloadOutlined,
  SendOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import ChatBubble, { TimeDivider, isSameDay } from '../../components/DigitalHuman/ChatBubble';
import GuideBubble from '../../components/Galgame/GuideBubble';
import KioskRouteMapPanel, {
  type KioskRouteSelection,
  type KioskRouteSpotFocus,
} from '../../components/Chat/KioskRouteMapPanel';
import KioskSpotGuidePanel from '../../components/Chat/KioskSpotGuidePanel';
import { useChatStore, Message } from '../../stores/chatStore';
import { useAudioSyncController } from '../../hooks/useAudioSyncController';
import { useDigitalHuman } from '../../components/tourist/DigitalHumanProvider';
import { detectEmotion } from '../../utils/emotion';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';
import { transcribeAudio } from '../../api/chat';
import { convertBlobToWav, useVoiceRecord } from '../../hooks/useVoiceRecord';
import { useTypewriter } from '../../hooks/useTypewriter';
import {
  buildKioskGreetingReply,
  buildKioskRestroomGuide,
  buildSpotAwareQuestion,
  getKioskSpotConfig,
  isGreetingQuestion,
  isRestroomQuestion,
  type KioskAction,
} from '../../config/kioskSpots';
import type { ThemeTopic } from '../../types/themeCards';

const RESET_AFTER_MS = 60_000;

const statusText = {
  idle: '等待互动',
  listening: '请按住说话',
  recording: '正在收音',
  transcribing: '识别语音中',
  thinking: '检索资料中',
  speaking: '语音讲解中',
  done: '讲解完成',
  error: '需要重试',
};

const ErrorToast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 5200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="kiosk-error-toast">
      <span className="kiosk-error-toast__icon">!</span>
      <span>{message}</span>
      <button onClick={onClose} aria-label="关闭错误提示">
        <CloseOutlined />
      </button>
    </div>
  );
};

function buildRouteSpotBubble(payload: KioskRouteSpotFocus): string {
  const durationText = payload.spotDuration
    ? `这一站建议停留${payload.spotDuration}`
    : `整条路线预计${payload.routeDuration}`;
  const description = compactComicText(
    payload.spotDescription || '这里适合放慢脚步看动线、拍照点和现场指示，再决定是否继续前往下一站。',
    72
  );

  return `第${payload.index + 1}/${payload.total}站到「${payload.spotName}」。\n${durationText}，重点看：${description}`;
}

function compactComicText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return ensureSentenceEnd(normalized);

  const sentences = normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  let collected = '';

  for (const sentence of sentences) {
    if ((collected + sentence).length > maxLength) break;
    collected += sentence;
  }

  if (collected) return ensureSentenceEnd(collected);

  const firstSentence = sentences[0] || normalized;
  const clauses = firstSentence.match(/[^，,、：:]+[，,、：:]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  let clauseText = '';

  for (const clause of clauses) {
    if ((clauseText + clause).length > maxLength) break;
    clauseText += clause;
  }

  const fallback = (clauseText || firstSentence.slice(0, maxLength)).replace(/[，,、：:；;]+$/, '');
  return ensureSentenceEnd(fallback);
}

function ensureSentenceEnd(text: string): string {
  const trimmed = text.trim().replace(/[，,、：:；;]+$/, '');
  return /[。！？!?]$/.test(trimmed) ? trimmed : `${trimmed}。`;
}

function splitGuideNarration(text: string, maxSegmentLength = 76): string[] {
  const sentences =
    text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^。！？!?；;]+[。！？!?；;]?/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) || [];

  const segments: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    if (!current) {
      current = sentence;
      return;
    }
    if ((current + sentence).length <= maxSegmentLength) {
      current += sentence;
    } else {
      segments.push(current);
      current = sentence;
    }
  });

  if (current) segments.push(current);

  return segments.flatMap((segment) => {
    if (segment.length <= maxSegmentLength + 20) return [segment];
    const pieces: string[] = [];
    for (let index = 0; index < segment.length; index += maxSegmentLength) {
      pieces.push(segment.slice(index, index + maxSegmentLength));
    }
    return pieces;
  });
}

interface KioskVoiceButtonProps {
  disabled?: boolean;
  isTranscribing?: boolean;
  onAudioReady: (blob: Blob) => void;
  onInterrupt: () => void;
  onError: (message: string) => void;
}

const KioskVoiceButton: React.FC<KioskVoiceButtonProps> = ({
  disabled = false,
  isTranscribing = false,
  onAudioReady,
  onInterrupt,
  onError,
}) => {
  const { startRecording, stopRecording, getAudioBlob, isRecording, error } = useVoiceRecord();
  const [isPressed, setIsPressed] = useState(false);
  const activePointerRef = useRef(false);

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  const handleStart = useCallback(
    async (event: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || isTranscribing || isRecording) return;
      event.preventDefault();
      activePointerRef.current = true;
      setIsPressed(true);
      onInterrupt();
      await startRecording();
    },
    [disabled, isTranscribing, isRecording, onInterrupt, startRecording]
  );

  const handleEnd = useCallback(async () => {
    if (!activePointerRef.current) return;
    activePointerRef.current = false;
    setIsPressed(false);
    if (!isRecording) return;
    stopRecording();
    await new Promise((resolve) => setTimeout(resolve, 260));
    const audioBlob = getAudioBlob();
    if (audioBlob && audioBlob.size > 100) {
      onAudioReady(audioBlob);
    } else {
      onError('没有采集到有效语音，请按住按钮说完后再松手');
    }
  }, [getAudioBlob, isRecording, onAudioReady, onError, stopRecording]);

  const recording = isRecording || isPressed;

  return (
    <button
      data-testid="kiosk-voice-button"
      className={`kiosk-voice-button ${recording ? 'is-recording' : ''}`}
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onPointerLeave={handleEnd}
      disabled={disabled || isTranscribing}
      aria-label="按住说话"
    >
      <span className="kiosk-voice-button__halo" />
      <span className="kiosk-voice-button__icon">
        {isTranscribing ? <LoadingOutlined /> : recording ? <PauseOutlined /> : <AudioOutlined />}
      </span>
      <span className="kiosk-voice-button__text">
        {isTranscribing ? '识别中' : recording ? '松开发送' : '按住说话'}
      </span>
    </button>
  );
};

const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const spot = useMemo(
    () => getKioskSpotConfig(searchParams.get('spot') || searchParams.get('spotId')),
    [searchParams]
  );
  const {
    isSpeaking,
    speak,
    stop,
    setEmotion,
    isModelReady,
    modelError,
    setPoseOverride,
  } = useDigitalHuman();

  const [inputText, setInputText] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [greetingText, setGreetingText] = useState(spot.greeting);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [localGuideMessageId, setLocalGuideMessageId] = useState<string | null>(null);
  const [isRouteMapOpen, setIsRouteMapOpen] = useState(false);
  const [routeBubbleOverride, setRouteBubbleOverride] = useState<string | null>(null);
  const [routeNarrationSegments, setRouteNarrationSegments] = useState<string[]>([]);
  const [routeNarrationIndex, setRouteNarrationIndex] = useState(0);
  const [spotGuideSegments, setSpotGuideSegments] = useState<string[]>([]);
  const [spotGuideIndex, setSpotGuideIndex] = useState(0);
  const [isSpotGuideOpen, setIsSpotGuideOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeSpokenRef = useRef(false);
  const spotBootRef = useRef<string | null>(null);
  const localTypingMessageIdsRef = useRef(new Set<string>());
  const routeNarrationRunRef = useRef(0);
  const spotGuideRunRef = useRef(0);

  const {
    messages,
    currentSessionId,
    isStreaming,
    error,
    activeTopic,
    addMessage,
    updateMessage,
    updateMessageStatus,
    setStreaming,
    setCurrentSession,
    setError,
    clearMessages,
    getHistory,
    setActiveTopic,
    setPanelCollapsed,
  } = useChatStore();

  const controller = useAudioSyncController({
    onToken: (token) => {
      const { messages: latestMessages, updateMessage: latestUpdateMessage } = useChatStore.getState();
      const lastMessage = latestMessages[latestMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        latestUpdateMessage(lastMessage.id, lastMessage.content + token);
      }
    },
    onAnswer: (answer, meta) => {
      const {
        messages: latestMessages,
        updateMessage: latestUpdateMessage,
        updateMessageStatus: latestUpdateStatus,
      } = useChatStore.getState();
      const lastMessage = latestMessages[latestMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        latestUpdateMessage(lastMessage.id, answer);
        latestUpdateStatus(lastMessage.id, 'sent');
        if (meta.source) {
          useChatStore.setState((state) => ({
            messages: state.messages.map((message) =>
              message.id === lastMessage.id ? { ...message, source: meta.source as Message['source'] } : message
            ),
          }));
        }
      }
      setStreaming(false);
      setEmotion(detectEmotion(answer) as Emotion);
      if (meta.topic) {
        setActiveTopic(meta.topic);
        if (meta.card) setPanelCollapsed(false);
      }
    },
    onCard: () => setPanelCollapsed(false),
    onTtsError: () => {
      setSpeechNotice('语音服务已切换为浏览器播报，文字回答正常展示');
    },
    onError: (errMsg) => {
      const { messages: latestMessages, updateMessageStatus: latestUpdateStatus } = useChatStore.getState();
      const lastMessage = latestMessages[latestMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') latestUpdateStatus(lastMessage.id, 'error');
      setError(errMsg);
      setStreaming(false);
    },
    onStart: () => setStreaming(true),
  });

  const clearRouteNarration = useCallback(() => {
    routeNarrationRunRef.current += 1;
    setRouteBubbleOverride(null);
    setRouteNarrationSegments([]);
    setRouteNarrationIndex(0);
  }, []);

  const clearSpotGuideNarration = useCallback(() => {
    spotGuideRunRef.current += 1;
    setSpotGuideSegments([]);
    setSpotGuideIndex(0);
    setIsSpotGuideOpen(false);
  }, []);

  const startSpotGuideSequence = useCallback(
    (narration: string) => {
      const segments = splitGuideNarration(narration, 68);
      if (segments.length === 0) return;

      const runId = spotGuideRunRef.current + 1;
      spotGuideRunRef.current = runId;
      setIsSpotGuideOpen(true);
      setSpotGuideSegments(segments);
      setSpotGuideIndex(0);

      const playSegment = (index: number) => {
        if (spotGuideRunRef.current !== runId) return;
        const segment = segments[index];
        if (!segment) return;

        setSpotGuideIndex(index);
        void speak(segment, {
          emotion: 'smile',
          onComplete: () => {
            if (spotGuideRunRef.current !== runId) return;
            if (index < segments.length - 1) {
              playSegment(index + 1);
            }
          },
          onError: () => setSpeechNotice('语音服务已切换为浏览器播报，文字讲解正常展示'),
        });
      };

      playSegment(0);
    },
    [speak]
  );

  const startRouteNarrationSequence = useCallback(
    (narration: string) => {
      const segments = splitGuideNarration(narration);
      if (segments.length === 0) return;

      const runId = routeNarrationRunRef.current + 1;
      routeNarrationRunRef.current = runId;
      setRouteBubbleOverride(null);
      setRouteNarrationSegments(segments);
      setRouteNarrationIndex(0);

      const playSegment = (index: number) => {
        if (routeNarrationRunRef.current !== runId) return;
        const segment = segments[index];
        if (!segment) return;

        setRouteNarrationIndex(index);
        void speak(segment, {
          emotion: 'smile',
          onComplete: () => {
            if (routeNarrationRunRef.current !== runId) return;
            if (index < segments.length - 1) {
              playSegment(index + 1);
            }
          },
          onError: () => setSpeechNotice('语音服务已切换为浏览器播报，文字讲解正常展示'),
        });
      };

      playSegment(0);
    },
    [speak]
  );

  const resetSession = useCallback(
    (speakGreeting = true) => {
      controller.stop();
      stop();
      clearRouteNarration();
      clearSpotGuideNarration();
      clearMessages();
      setInputText('');
      setError(null);
      setSpeechNotice(null);
      setLocalGuideMessageId(null);
      setIsRouteMapOpen(false);
      localTypingMessageIdsRef.current.clear();
      setGreetingText(spot.greeting);
      setCurrentSession(`kiosk_${spot.id}_${Date.now()}`);
      setActiveTopic('spot');
      setPanelCollapsed(true);
      welcomeSpokenRef.current = !speakGreeting;
    },
    [
      clearRouteNarration,
      clearMessages,
      controller,
      setActiveTopic,
      setCurrentSession,
      setError,
      setPanelCollapsed,
      spot.greeting,
      spot.id,
      stop,
    ]
  );

  useEffect(() => {
    if (spotBootRef.current === spot.id) return;
    spotBootRef.current = spot.id;
    resetSession(true);
  }, [resetSession, spot.id]);

  useEffect(() => {
    if (messages.length === 0 && !welcomeSpokenRef.current) {
      welcomeSpokenRef.current = true;
      setGreetingText(spot.greeting);
      const timer = setTimeout(() => {
        speak(spot.greeting, { emotion: 'smile' });
      }, 520);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [messages.length, speak, spot.greeting]);

  useEffect(() => {
    if (messages.length === 0 || isStreaming || isSpeaking || isTranscribing) return undefined;
    const timer = setTimeout(() => resetSession(false), RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isSpeaking, isStreaming, isTranscribing, messages.length, resetSession]);

  useEffect(() => {
    if (!speechNotice) return undefined;
    const timer = setTimeout(() => setSpeechNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [speechNotice]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isHistoryOpen) setIsHistoryOpen(false);
        else resetSession(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryOpen, resetSession]);

  const doSend = useCallback(
    (text: string, topic?: ThemeTopic) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || isTranscribing) return;

      if (isRestroomQuestion(trimmed)) {
        setIsRouteMapOpen(false);
        clearRouteNarration();
        clearSpotGuideNarration();
        const narration = buildKioskRestroomGuide(spot);
        controller.stop();
        stop();
        setStreaming(false);
        setInputText('');
        setError(null);
        setSpeechNotice(null);
        setActiveTopic('food');
        setPanelCollapsed(false);
        setEmotion('smile');

        const sessionId = currentSessionId || `kiosk_${spot.id}_${Date.now()}`;
        if (!currentSessionId) setCurrentSession(sessionId);

        const timestamp = Date.now();
        const assistantMessageId = `msg_${timestamp + 1}`;
        localTypingMessageIdsRef.current.add(assistantMessageId);
        setLocalGuideMessageId(assistantMessageId);
        addMessage({
          id: `msg_${timestamp}`,
          role: 'user',
          content: trimmed,
          timestamp,
          status: 'sent',
        });
        addMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: narration,
          timestamp: timestamp + 1,
          status: 'sent',
        });

        void speak(narration, {
          emotion: 'smile',
          onError: () => setSpeechNotice('语音服务已切换为浏览器播报，文字指引正常展示'),
        });
        return;
      }

      if (isGreetingQuestion(trimmed)) {
        setIsRouteMapOpen(false);
        clearRouteNarration();
        clearSpotGuideNarration();
        const narration = buildKioskGreetingReply(spot);
        controller.stop();
        stop();
        setStreaming(false);
        setInputText('');
        setError(null);
        setSpeechNotice(null);
        setActiveTopic('general');
        setPanelCollapsed(true);
        setEmotion('smile');

        const sessionId = currentSessionId || `kiosk_${spot.id}_${Date.now()}`;
        if (!currentSessionId) setCurrentSession(sessionId);

        const timestamp = Date.now();
        const assistantMessageId = `msg_${timestamp + 1}`;
        localTypingMessageIdsRef.current.add(assistantMessageId);
        setLocalGuideMessageId(assistantMessageId);
        addMessage({
          id: `msg_${timestamp}`,
          role: 'user',
          content: trimmed,
          timestamp,
          status: 'sent',
        });
        addMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: narration,
          timestamp: timestamp + 1,
          status: 'sent',
        });

        void speak(narration, {
          emotion: 'smile',
          onError: () => {
            setSpeechNotice('文字回应已展示，语音播报可稍后重试');
          },
        });
        return;
      }

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
        status: 'sent',
      };

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };

      addMessage(userMessage);
      addMessage(assistantMessage);
      setInputText('');
      setStreaming(true);
      setError(null);
      setSpeechNotice(null);
      setLocalGuideMessageId(null);
      clearRouteNarration();
      clearSpotGuideNarration();
      localTypingMessageIdsRef.current.clear();
      setEmotion('think');
      if (topic) setActiveTopic(topic);
      stop();
      controller.stop();

      const sessionId = currentSessionId || `kiosk_${spot.id}_${Date.now()}`;
      if (!currentSessionId) setCurrentSession(sessionId);

      controller.start({
        session_id: sessionId,
        question: buildSpotAwareQuestion(trimmed, spot),
        history: getHistory(4),
      });
    },
    [
      addMessage,
      clearRouteNarration,
      controller,
      currentSessionId,
      getHistory,
      isStreaming,
      isTranscribing,
      setActiveTopic,
      setCurrentSession,
      setEmotion,
      setError,
      setPanelCollapsed,
      setStreaming,
      speak,
      spot,
      stop,
    ]
  );

  const handleSendText = useCallback(() => doSend(inputText), [doSend, inputText]);

  const handleSendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob || audioBlob.size < 100) return;
      stop();
      controller.stop();
      clearRouteNarration();
      clearSpotGuideNarration();
      setIsTranscribing(true);
      setError(null);
      try {
        const wavBlob = await convertBlobToWav(audioBlob);
        const text = await transcribeAudio(wavBlob);
        if (text.trim()) {
          doSend(text.trim());
        } else {
          setError('没有识别到有效语音，请靠近麦克风再试一次');
        }
      } catch (err: any) {
        setError(err?.message || '语音识别失败，请稍后重试');
      } finally {
        setIsTranscribing(false);
      }
    },
    [clearRouteNarration, controller, doSend, setError, stop]
  );

  const playLocalNarration = useCallback(
    (action: KioskAction, narration: string, options?: { segmentedRoute?: boolean; segmentedSpot?: boolean }) => {
      if (isStreaming || isTranscribing) return;

      controller.stop();
      stop();
      setStreaming(false);
      setInputText('');
      setError(null);
      setSpeechNotice(null);
      clearRouteNarration();
      clearSpotGuideNarration();
      setActiveTopic(action.topic);
      setPanelCollapsed(false);
      setEmotion('smile');

      const sessionId = currentSessionId || `kiosk_${spot.id}_${Date.now()}`;
      if (!currentSessionId) setCurrentSession(sessionId);

      const timestamp = Date.now();
      const assistantMessageId = `msg_${timestamp + 1}`;
      localTypingMessageIdsRef.current.add(assistantMessageId);
      setLocalGuideMessageId(assistantMessageId);
      addMessage({
        id: `msg_${timestamp}`,
        role: 'user',
        content: action.label,
        timestamp,
        status: 'sent',
      });
      addMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: narration,
        timestamp: timestamp + 1,
        status: 'sent',
      });

      if (options?.segmentedRoute) {
        startRouteNarrationSequence(narration);
      } else if (options?.segmentedSpot) {
        startSpotGuideSequence(narration);
      } else {
        void speak(narration, {
          emotion: 'smile',
          onError: () => setSpeechNotice('语音服务已切换为浏览器播报，文字讲解正常展示'),
        });
      }
    },
    [
      addMessage,
      clearRouteNarration,
      clearSpotGuideNarration,
      controller,
      currentSessionId,
      isStreaming,
      isTranscribing,
      setActiveTopic,
      setCurrentSession,
      setEmotion,
      setError,
      setPanelCollapsed,
      setStreaming,
      speak,
      startRouteNarrationSequence,
      startSpotGuideSequence,
      spot.id,
      stop,
    ]
  );

  const handleActionSelect = useCallback(
    (action: KioskAction) => {
      if (action.id === 'spot-guide') {
        setIsRouteMapOpen(false);
        clearRouteNarration();
        clearSpotGuideNarration();
        playLocalNarration(action, spot.guideScript, { segmentedSpot: true });
        return;
      }
      if (action.id === 'route-next') {
        const routeIntro =
          '我先不替你直接拍板。右侧已经展开路线卷轴，你可以先选自己想走哪条；选中后我会放大地图，带你一站一站慢慢走。';
        setIsRouteMapOpen(true);
        clearRouteNarration();
        clearSpotGuideNarration();
        playLocalNarration(action, routeIntro);
        setRouteBubbleOverride(routeIntro);
        return;
      }
      setIsRouteMapOpen(false);
      clearRouteNarration();
      clearSpotGuideNarration();
      setActiveTopic(action.topic);
      setPanelCollapsed(false);
      doSend(action.question, action.topic);
    },
    [clearRouteNarration, clearSpotGuideNarration, doSend, playLocalNarration, setActiveTopic, setPanelCollapsed, spot]
  );

  const handleOpenHistory = useCallback(() => {
    stop();
    controller.stop();
    clearRouteNarration();
    clearSpotGuideNarration();
    setIsHistoryOpen(false);
    navigate(`/history?returnTo=${encodeURIComponent(`/chat?spot=${spot.id}`)}`);
  }, [clearRouteNarration, clearSpotGuideNarration, controller, navigate, spot.id, stop]);

  const handleRouteSpotFocus = useCallback(
    (payload: KioskRouteSpotFocus) => {
      const nextText = buildRouteSpotBubble(payload);
      clearRouteNarration();
      clearSpotGuideNarration();
      setRouteBubbleOverride(nextText);
      stop();
      void speak(nextText, {
        emotion: 'smile',
        onError: () => setSpeechNotice('语音服务已切换为浏览器播报，文字讲解正常展示'),
      });
    },
    [clearRouteNarration, clearSpotGuideNarration, speak, stop]
  );

  const handleRouteSelected = useCallback(
    (payload: KioskRouteSelection) => {
      controller.stop();
      stop();
      clearRouteNarration();
      clearSpotGuideNarration();
      setIsRouteMapOpen(true);
      setActiveTopic('route');
      setPanelCollapsed(false);
      setSpeechNotice(null);
      setEmotion('smile');

      const sessionId = currentSessionId || `kiosk_${spot.id}_${Date.now()}`;
      if (!currentSessionId) setCurrentSession(sessionId);

      const timestamp = Date.now();
      const assistantMessageId = `msg_${timestamp + 1}`;
      localTypingMessageIdsRef.current.add(assistantMessageId);
      setLocalGuideMessageId(assistantMessageId);
      addMessage({
        id: `msg_${timestamp}`,
        role: 'user',
        content: `选择路线：${payload.routeName}`,
        timestamp,
        status: 'sent',
      });
      addMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: payload.narration,
        timestamp: timestamp + 1,
        status: 'sent',
      });

      startRouteNarrationSequence(payload.narration);
    },
    [
      addMessage,
      clearRouteNarration,
      clearSpotGuideNarration,
      controller,
      currentSessionId,
      setActiveTopic,
      setCurrentSession,
      setEmotion,
      setPanelCollapsed,
      spot.id,
      startRouteNarrationSequence,
      stop,
    ]
  );

  const handleExitRouteMode = useCallback(() => {
    controller.stop();
    stop();
    clearRouteNarration();
    clearSpotGuideNarration();
    setIsRouteMapOpen(false);
    setActiveTopic(null);
    setPanelCollapsed(true);
    setSpeechNotice(null);
  }, [clearRouteNarration, clearSpotGuideNarration, controller, setActiveTopic, setPanelCollapsed, stop]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  const latestAssistantMsg = messages.filter((message) => message.role === 'assistant').pop();
  const isEmpty = messages.length === 0;
  const isLocalGuideTyping =
    !!latestAssistantMsg &&
    (latestAssistantMsg.id === localGuideMessageId || localTypingMessageIdsRef.current.has(latestAssistantMsg.id));
  const typewriter = useTypewriter({
    text: isLocalGuideTyping ? latestAssistantMsg.content : '',
    speed: 34,
    enabled: isLocalGuideTyping,
  });
  const dialogText =
    isStreaming && messages[messages.length - 1]?.role === 'assistant'
      ? messages[messages.length - 1].content
      : latestAssistantMsg?.content || greetingText;
  const answerDisplayText = isLocalGuideTyping ? typewriter.displayText : dialogText;
  const showRouteMap = isRouteMapOpen || activeTopic === 'route';
  const routeCurrentSpotIds = useMemo(() => [spot.id, spot.storySpotId], [spot.id, spot.storySpotId]);
  const showSpotGuidePanel = isSpotGuideOpen;
  const spotGuideText = spotGuideSegments[spotGuideIndex] || '';
  const spotGuideSpeaker =
    spotGuideText && spotGuideSegments.length > 1 ? `小景 ${spotGuideIndex + 1}/${spotGuideSegments.length}` : '小景';
  const routeNarrationText = routeNarrationSegments[routeNarrationIndex] || '';
  const routeBubbleText = routeBubbleOverride || routeNarrationText;
  const routeBubbleSpeaker =
    !routeBubbleOverride && routeNarrationText && routeNarrationSegments.length > 1
      ? `小景 ${routeNarrationIndex + 1}/${routeNarrationSegments.length}`
      : '小景';
  const isRouteNarrating = showRouteMap && Boolean(routeNarrationText) && isSpeaking;
  useEffect(() => {
    setPoseOverride?.(showRouteMap ? 'route-stage' : null);
    return () => setPoseOverride?.(null);
  }, [setPoseOverride, showRouteMap]);

  const currentStatus = error
    ? 'error'
    : isTranscribing
      ? 'transcribing'
      : isStreaming
        ? 'thinking'
        : isSpeaking
          ? 'speaking'
          : latestAssistantMsg
            ? 'done'
            : 'idle';
  return (
    <>
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}

      <main
        data-testid="chat-page"
        className={`kiosk-page ${showRouteMap ? 'kiosk-page--route-mode' : ''}`}
        style={
          {
            '--spot-accent': spot.accent,
            '--spot-accent-soft': spot.accentSoft,
            '--spot-cover': `url("${spot.storyCoverImage}")`,
            backgroundImage: `linear-gradient(90deg, rgba(247,241,226,0.96) 0%, rgba(247,241,226,0.62) 46%, rgba(247,241,226,0.92) 100%), linear-gradient(180deg, rgba(255,252,244,0.70), rgba(232,216,184,0.72)), url("${spot.storyCoverImage}")`,
          } as React.CSSProperties
        }
      >
        <div className="kiosk-page__grain" />
        <div className="kiosk-page__glow kiosk-page__glow--left" />
        <div className="kiosk-page__glow kiosk-page__glow--right" />

        <header className="kiosk-topbar">
          <div className="kiosk-topbar__brand">
            <div>
              <strong>{spot.name} AI 导览</strong>
              <span>{spot.locationHint}</span>
            </div>
            <button
              className="kiosk-spot-switch-link"
              data-testid="kiosk-spot-switch-link"
              onClick={() => navigate('/spots')}
            >
              <CompassOutlined />
              切换点位
            </button>
          </div>
          <div className="kiosk-topbar__status">
            <span className={`kiosk-status-dot kiosk-status-dot--${currentStatus}`} />
            <strong>{statusText[currentStatus]}</strong>
            <span className="kiosk-topbar__divider" />
            <SoundOutlined />
            <span>语音开</span>
          </div>
          <button className="kiosk-ghost-button" onClick={() => resetSession(true)}>
            <ReloadOutlined />
            重置
          </button>
        </header>

        <section className="kiosk-layout">
          <section className="kiosk-center-stage" aria-label="数字人舞台">
            <div className="kiosk-stage-ring" />
            <div className="kiosk-stage-floor" />
            <div
              className={`kiosk-avatar-fallback ${isModelReady ? 'is-hidden' : ''} ${modelError ? 'has-error' : ''}`}
              aria-hidden="true"
            >
              <span>小景</span>
              <small>{modelError ? '模型接口待接入' : '数字人加载中'}</small>
            </div>
            {isEmpty && (
              <div className="kiosk-idle-card" data-testid="kiosk-idle-card">
                <span>当前点位 · {spot.shortName}</span>
                <h2>{spot.idleTitle}</h2>
                <p>{spot.subtitle}</p>
              </div>
            )}
            <div
              className={`kiosk-service-grid ${showRouteMap ? 'is-route-hidden' : ''}`}
              data-testid="kiosk-service-grid"
              aria-hidden={showRouteMap}
            >
              {spot.actions.slice(0, 1).map((action) => (
                <button
                  key={action.id}
                  data-testid={`kiosk-action-${action.id}`}
                  className="kiosk-service-pill"
                  disabled={showRouteMap || isStreaming || isTranscribing}
                  onClick={() => handleActionSelect(action)}
                  tabIndex={showRouteMap ? -1 : 0}
                >
                  <span>{action.icon}</span>
                  <strong>{action.label}</strong>
                </button>
              ))}
              <button
                data-testid="kiosk-history-button"
                className="kiosk-service-pill kiosk-service-pill--history"
                disabled={showRouteMap || isTranscribing}
                onClick={handleOpenHistory}
                aria-label="开启历史穿越"
                tabIndex={showRouteMap ? -1 : 0}
              >
                <span>游</span>
                <strong>历史穿越</strong>
              </button>
              {spot.actions.slice(1, 2).map((action) => (
                <button
                  key={action.id}
                  data-testid={`kiosk-action-${action.id}`}
                  className="kiosk-service-pill"
                  disabled={showRouteMap || isStreaming || isTranscribing}
                  onClick={() => handleActionSelect(action)}
                  tabIndex={showRouteMap ? -1 : 0}
                >
                  <span>{action.icon}</span>
                  <strong>{action.label}</strong>
                </button>
              ))}
            </div>
            {showSpotGuidePanel && spotGuideText && !showRouteMap && (
              <GuideBubble
                key={`spot-${spotGuideIndex}-${spotGuideText}`}
                speakerName={spotGuideSpeaker}
                text={spotGuideText}
                isTyping
                typingSpeed={18}
                visible
                style={{
                  left: 'calc(50% + clamp(92px, 8.4vw, 146px))',
                  top: 'clamp(156px, 25vh, 232px)',
                  transform: 'translateY(-50%)',
                  maxWidth: 'min(360px, 25vw)',
                  zIndex: 9,
                }}
              />
            )}
            {showRouteMap && routeBubbleText && (
              <GuideBubble
                key={`route-${routeBubbleOverride || `${routeNarrationIndex}-${routeNarrationText}`}`}
                speakerName={routeBubbleSpeaker}
                text={routeBubbleText}
                isTyping
                typingSpeed={18}
                visible
                variant="comic"
                tailSide="right"
                style={{
                  left: 'calc(50% - clamp(240px, 14vw, 300px))',
                  top: 'clamp(230px, 30vh, 320px)',
                  transform: 'translateY(-50%)',
                  maxWidth: 'min(306px, 20vw)',
                  minWidth: 230,
                  zIndex: 12,
                }}
              />
            )}
          </section>

          <aside className="kiosk-answer-card" data-testid="kiosk-answer-card">
            {showRouteMap ? (
              <KioskRouteMapPanel
                currentSpotIds={routeCurrentSpotIds}
                currentSpotName={spot.name}
                isNarrating={isRouteNarrating}
                onExit={handleExitRouteMode}
                onRouteSelected={handleRouteSelected}
                onRouteSpotFocus={handleRouteSpotFocus}
              />
            ) : showSpotGuidePanel ? (
              <KioskSpotGuidePanel
                visual={spot.guideVisual}
                spotName={spot.name}
                activeIndex={spotGuideIndex}
                isSpeaking={isSpeaking}
              />
            ) : (
              <>
                <div className="kiosk-panel-title">
                  <span>
                    <CompassOutlined />
                    小景讲解
                  </span>
                </div>

                <div className="kiosk-answer-text">
                  {isStreaming && !dialogText ? (
                    <div className="kiosk-thinking">
                      <LoadingOutlined />
                      正在检索景区知识库，请稍候…
                    </div>
                  ) : (
                    <>
                      <p>
                        {answerDisplayText}
                        {isLocalGuideTyping && !typewriter.isComplete && (
                          <span className="kiosk-typewriter-cursor" aria-hidden="true">
                            |
                          </span>
                        )}
                      </p>
                      {isSpeaking && <span className="kiosk-speaking-mark">正在播报</span>}
                    </>
                  )}
                </div>

                {speechNotice && (
                  <div className="kiosk-speech-notice">
                    <CheckCircleOutlined />
                    {speechNotice}
                  </div>
                )}
              </>
            )}
          </aside>
        </section>

        <footer className="kiosk-control-deck">
          <KioskVoiceButton
            disabled={isStreaming}
            isTranscribing={isTranscribing}
            onAudioReady={handleSendAudio}
            onInterrupt={() => {
              clearRouteNarration();
              clearSpotGuideNarration();
              stop();
            }}
            onError={setError}
          />

          <div className="kiosk-text-box">
            <textarea
              data-testid="text-input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming || isTranscribing}
              placeholder="也可以在这里输入问题，例如：附近下一站去哪？"
            />
            <button
              data-testid="send-button"
              className="kiosk-send-button"
              onClick={handleSendText}
              disabled={!inputText.trim() || isStreaming || isTranscribing}
            >
              <SendOutlined />
              发送
            </button>
          </div>

          <div className="kiosk-utility-buttons">
            <button onClick={() => setIsHistoryOpen(true)} disabled={messages.length === 0}>
              <HistoryOutlined />
              记录
            </button>
            <button onClick={() => resetSession(false)}>
              <ClearOutlined />
              清屏
            </button>
          </div>
        </footer>

        {isHistoryOpen && (
          <div className="kiosk-history-overlay" data-testid="kiosk-history-overlay">
            <div className="kiosk-history-panel">
              <header>
                <div>
                  <span>本次互动记录</span>
                  <strong>{spot.name}</strong>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} aria-label="关闭记录">
                  <CloseOutlined />
                </button>
              </header>
              <div className="kiosk-history-list">
                {messages.map((message, index) => {
                  const showDivider =
                    index === 0 ||
                    !isSameDay(message.timestamp, messages[index - 1].timestamp) ||
                    message.timestamp - messages[index - 1].timestamp > 5 * 60 * 1000;
                  return (
                    <React.Fragment key={message.id}>
                      {showDivider && <TimeDivider timestamp={message.timestamp} />}
                      <ChatBubble
                        message={message}
                        isUser={message.role === 'user'}
                        source={message.source}
                        showSource={message.role !== 'user'}
                        sessionId={currentSessionId || undefined}
                      />
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        <style>{`
          .kiosk-page {
            position: relative;
            width: 100%;
            height: 100dvh;
            min-height: 720px;
            overflow: hidden;
            display: grid;
            grid-template-rows: auto minmax(0, 1fr) auto;
            background-size: cover;
            background-position: center;
            color: #2a2520;
            font-family: "Source Han Serif SC", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif;
          }

          .kiosk-page__grain {
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            opacity: 0.34;
            background-image:
              url('/image/history/paper-texture-seamless.jpg'),
              radial-gradient(circle at 20% 20%, rgba(111,82,42,0.15) 0 1px, transparent 1px);
            background-size: 260px 260px, 6px 6px;
            mix-blend-mode: multiply;
          }

          .kiosk-page__glow {
            position: absolute;
            z-index: 0;
            width: 36vmax;
            height: 36vmax;
            border-radius: 999px;
            filter: blur(14px);
            pointer-events: none;
          }

          .kiosk-page__glow--left {
            left: -16vmax;
            bottom: -18vmax;
            background: radial-gradient(circle, rgba(216,168,78,0.20), transparent 68%);
          }

          .kiosk-page__glow--right {
            right: -18vmax;
            top: -20vmax;
            background: radial-gradient(circle, rgba(91,126,116,0.14), transparent 64%);
          }

          .kiosk-topbar {
            position: relative;
            z-index: 130;
            height: clamp(64px, 7vh, 88px);
            display: grid;
            grid-template-columns: minmax(260px, 1fr) auto auto;
            align-items: center;
            gap: clamp(10px, 1.4vw, 22px);
            padding: clamp(12px, 1.4vw, 22px) clamp(24px, 3vw, 54px) 0;
          }

          .kiosk-topbar__brand {
            display: flex;
            align-items: center;
            gap: 14px;
            min-width: 0;
          }

          .kiosk-topbar__brand strong {
            display: block;
            font-size: clamp(20px, 1.7vw, 30px);
            letter-spacing: 0.06em;
            font-weight: 900;
            color: #2a2520;
            text-shadow: 0 1px 0 rgba(255,255,255,0.58);
          }

          .kiosk-topbar__brand span:last-child {
            display: block;
            margin-top: 4px;
            color: rgba(42,37,32,0.58);
            font-size: clamp(12px, 0.95vw, 15px);
          }

          .kiosk-spot-switch-link {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            min-height: 36px;
            padding: 0 12px;
            border: 1px solid color-mix(in srgb, var(--spot-accent) 24%, rgba(92,76,48,0.14));
            border-radius: 999px;
            background:
              radial-gradient(circle at 18% 12%, rgba(255,255,255,0.74), transparent 58%),
              color-mix(in srgb, var(--spot-accent) 11%, rgba(255,250,238,0.62));
            color: color-mix(in srgb, var(--spot-accent) 72%, #4c301c);
            font-size: 13px;
            font-weight: 900;
            white-space: nowrap;
            cursor: pointer;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.68);
            transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
          }

          .kiosk-spot-switch-link:hover {
            transform: translateY(-1px);
            border-color: color-mix(in srgb, var(--spot-accent) 42%, rgba(92,76,48,0.16));
            background: color-mix(in srgb, var(--spot-accent) 16%, rgba(255,250,238,0.76));
          }

          .kiosk-topbar__status,
          .kiosk-ghost-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(92,76,48,0.16);
            background: rgba(255,250,238,0.58);
            color: rgba(42,37,32,0.74);
            border-radius: 999px;
            min-height: 40px;
            padding: 0 14px;
            backdrop-filter: blur(10px) saturate(120%);
            white-space: nowrap;
          }

          .kiosk-topbar__status strong {
            color: #2a2520;
          }

          .kiosk-topbar__divider {
            width: 1px;
            height: 18px;
            background: rgba(92,76,48,0.18);
          }

          .kiosk-ghost-button {
            cursor: pointer;
            font-weight: 800;
            transition: transform 160ms ease, background 160ms ease;
          }

          .kiosk-ghost-button:hover {
            transform: translateY(-1px);
            background: rgba(255,250,238,0.78);
          }

          .kiosk-status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--spot-accent);
            box-shadow: 0 0 16px color-mix(in srgb, var(--spot-accent) 70%, white);
          }

          .kiosk-status-dot--thinking,
          .kiosk-status-dot--transcribing,
          .kiosk-status-dot--speaking {
            animation: kioskPulse 1.4s ease-in-out infinite;
          }

          .kiosk-layout {
            position: relative;
            z-index: 115;
            height: auto;
            min-height: 0;
            display: grid;
            grid-template-columns: minmax(560px, 1fr) minmax(360px, 29vw);
            gap: clamp(28px, 3.4vw, 68px);
            padding: clamp(4px, 0.8vw, 14px) clamp(36px, 4.4vw, 86px) 0;
            overflow: visible;
            transition:
              grid-template-columns 420ms cubic-bezier(0.22, 1, 0.36, 1),
              gap 420ms cubic-bezier(0.22, 1, 0.36, 1),
              padding 420ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .kiosk-page--route-mode .kiosk-layout {
            height: 100%;
            min-height: 0;
            grid-template-columns: minmax(300px, 0.58fr) minmax(760px, 1.42fr);
            gap: clamp(18px, 2.2vw, 42px);
            padding: clamp(2px, 0.5vw, 8px) clamp(24px, 3vw, 58px) clamp(8px, 1vh, 14px);
            overflow: hidden;
          }

          .kiosk-page--route-mode .kiosk-center-stage {
            justify-content: flex-start;
          }

          .kiosk-page--route-mode .kiosk-stage-ring {
            opacity: 0.24;
            transform: translateX(-16vw) scale(0.82);
          }

          .kiosk-page--route-mode .kiosk-stage-floor {
            opacity: 0.26;
            transform: translateX(-14vw) scale(0.84);
          }

          .kiosk-page--route-mode .kiosk-idle-card {
            opacity: 0;
            visibility: hidden;
            transform: translateX(-50%) translateY(-10px);
          }

          .kiosk-service-grid {
            position: absolute;
            left: 50%;
            bottom: clamp(18px, 3vh, 42px);
            transform: translate3d(-50%, 0, 0) scale(1);
            z-index: 6;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 7px;
            border: 1px solid rgba(96,76,42,0.16);
            border-radius: 999px;
            background: rgba(255,250,238,0.70);
            backdrop-filter: blur(10px) saturate(112%);
            box-shadow: 0 14px 36px rgba(92,70,38,0.16), inset 0 1px 0 rgba(255,255,255,0.72);
            pointer-events: auto;
            opacity: 1;
            visibility: visible;
            transition:
              opacity 220ms ease,
              visibility 220ms ease,
              transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
              background 160ms ease;
            will-change: opacity, transform;
          }

          .kiosk-service-grid.is-route-hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translate3d(-50%, 14px, 0) scale(0.97);
          }

          .kiosk-service-pill {
            min-width: 104px;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: 1px solid rgba(96,76,42,0.12);
            border-radius: 999px;
            background: rgba(255,255,250,0.60);
            color: rgba(42,37,32,0.78);
            cursor: pointer;
            font-weight: 800;
            transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
          }

          .kiosk-service-pill:hover:not(:disabled) {
            transform: translateY(-2px);
            border-color: color-mix(in srgb, var(--spot-accent) 45%, rgba(96,76,42,0.20));
            background: rgba(255,250,238,0.92);
          }

          .kiosk-service-pill:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .kiosk-service-pill span {
            color: var(--spot-accent);
            font-size: 15px;
          }

          .kiosk-service-pill strong {
            font-size: clamp(14px, 1vw, 16px);
          }

          .kiosk-service-pill--history {
            border-color: color-mix(in srgb, var(--spot-accent) 28%, rgba(96,76,42,0.14));
            background:
              linear-gradient(135deg, rgba(216,168,78,0.18), rgba(255,250,238,0.66)),
              rgba(255,250,238,0.64);
          }

          .kiosk-center-stage {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
            pointer-events: none;
            overflow: visible;
            transform: translate3d(0, 0, 0);
            transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
            contain: layout style;
          }

          .kiosk-stage-ring {
            position: absolute;
            width: min(48vw, 720px);
            aspect-ratio: 1;
            bottom: -20%;
            border-radius: 50%;
            background:
              radial-gradient(circle, transparent 45%, rgba(92,76,48,0.08) 45.4%, transparent 46%),
              radial-gradient(circle, var(--spot-accent-soft), transparent 64%);
            filter: drop-shadow(0 24px 70px rgba(92,70,38,0.14));
            opacity: 0.82;
            transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
          }

          .kiosk-stage-floor {
            position: absolute;
            width: min(42vw, 620px);
            height: min(13vh, 124px);
            bottom: 2%;
            border-radius: 50%;
            background: radial-gradient(ellipse, rgba(92,76,48,0.14), rgba(255,255,255,0.12) 38%, transparent 70%);
            filter: blur(6px);
            transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
          }

          .kiosk-avatar-fallback {
            position: absolute;
            left: 50%;
            top: 52%;
            transform: translate(-50%, -50%);
            width: min(24vw, 320px);
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 50%;
            border: 1px solid rgba(92,76,48,0.12);
            background: radial-gradient(circle, rgba(255,250,238,0.46), rgba(255,255,255,0.08) 58%, transparent 70%);
            color: rgba(42,37,32,0.52);
            text-align: center;
            z-index: 2;
            transition: opacity 260ms ease, visibility 260ms ease;
          }

          .kiosk-avatar-fallback.is-hidden {
            opacity: 0;
            visibility: hidden;
          }

          .kiosk-avatar-fallback.has-error {
            color: rgba(42,37,32,0.72);
            border-color: rgba(160,70,48,0.24);
            background: radial-gradient(circle, rgba(160,70,48,0.12), rgba(255,255,255,0.18) 58%, transparent 72%);
          }

          .kiosk-avatar-fallback span {
            font-family: var(--font-calligraphy), 'KaiTi', 'STKaiti', serif;
            font-size: clamp(42px, 5vw, 82px);
            letter-spacing: 0.16em;
          }

          .kiosk-avatar-fallback small {
            font-size: 13px;
            letter-spacing: 0.2em;
          }

          .kiosk-idle-card {
            position: absolute;
            top: clamp(8px, 1vh, 18px);
            left: 50%;
            transform: translateX(-50%);
            width: min(560px, 88%);
            padding: clamp(10px, 1vw, 16px);
            border-radius: 999px;
            border: 1px solid rgba(96,76,42,0.12);
            background: rgba(255,250,238,0.60);
            text-align: center;
            backdrop-filter: blur(8px) saturate(116%);
            box-shadow: 0 16px 42px rgba(92,70,38,0.12);
            transition:
              opacity 220ms ease,
              visibility 220ms ease,
              transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .kiosk-idle-card span {
            color: color-mix(in srgb, var(--spot-accent) 78%, #5a351f);
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.2em;
          }

          .kiosk-idle-card h2 {
            margin: 4px 0 0;
            font-size: clamp(23px, 2.2vw, 38px);
            letter-spacing: 0.06em;
            color: #2a2520;
          }

          .kiosk-idle-card p {
            display: none;
            margin: 8px auto 0;
            max-width: 420px;
            color: rgba(255,250,240,0.68);
            line-height: 1.7;
            font-size: clamp(13px, 1.2vw, 17px);
          }

          .kiosk-answer-card {
            position: relative;
            z-index: 4;
            min-height: 0;
            display: flex;
            flex-direction: column;
            align-self: stretch;
            padding: clamp(18px, 1.7vw, 28px);
            border: 1px solid rgba(96,76,42,0.16);
            border-radius: clamp(22px, 1.8vw, 30px);
            background:
              linear-gradient(145deg, rgba(255,250,238,0.84), rgba(239,224,195,0.66)),
              url('/image/history/paper-aged.jpg');
            background-size: auto, cover;
            box-shadow: 0 22px 62px rgba(92,70,38,0.16), inset 0 1px 0 rgba(255,255,255,0.70);
            backdrop-filter: blur(10px) saturate(112%);
            transform: translate3d(0, 0, 0);
            transition:
              transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 240ms ease,
              padding 420ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 240ms ease,
              box-shadow 240ms ease;
            contain: layout paint style;
          }

          .kiosk-page--route-mode .kiosk-answer-card {
            max-height: 100%;
            overflow: hidden;
            padding: clamp(18px, 1.55vw, 30px);
            border-color: rgba(96,76,42,0.12);
            background:
              linear-gradient(145deg, rgba(255,250,238,0.76), rgba(239,224,195,0.46)),
              url('/image/history/paper-aged.jpg');
            box-shadow: 0 20px 58px rgba(92,70,38,0.13), inset 0 1px 0 rgba(255,255,255,0.64);
            animation: kioskRoutePanelIn 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .kiosk-panel-title {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
            color: rgba(42,37,32,0.60);
          }

          .kiosk-panel-title span {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #2a2520;
            font-size: clamp(15px, 1.2vw, 20px);
            font-weight: 900;
          }

          .kiosk-answer-text {
            flex: 1;
            min-height: 0;
            margin-top: 16px;
            overflow: auto;
            padding-right: 4px;
          }

          .kiosk-answer-text p {
            margin: 0;
            color: rgba(42,37,32,0.84);
            font-size: clamp(18px, 1.55vw, 28px);
            line-height: 1.76;
            letter-spacing: 0.02em;
            white-space: pre-line;
          }

          .kiosk-typewriter-cursor {
            display: inline-block;
            margin-left: 3px;
            color: color-mix(in srgb, var(--spot-accent) 76%, #6b4c25);
            font-weight: 900;
            transform: translateY(-1px);
            animation: kioskInkCursor 0.95s steps(2, start) infinite;
          }

          .kiosk-thinking,
          .kiosk-speech-notice {
            display: flex;
            align-items: center;
            gap: 10px;
            color: rgba(42,37,32,0.66);
            font-size: clamp(15px, 1.2vw, 18px);
          }

          .kiosk-speaking-mark {
            display: inline-flex;
            margin-top: 18px;
            padding: 8px 12px;
            border-radius: 999px;
            color: #1d1713;
            background: linear-gradient(135deg, var(--spot-accent), #fff1b5);
            font-weight: 900;
          }

          .kiosk-speech-notice {
            margin-top: 16px;
            padding: 12px 14px;
            border-radius: 18px;
            color: rgba(42,37,32,0.70);
            background: rgba(106,156,137,0.13);
          }

          .kiosk-utility-buttons button {
            border: 1px solid rgba(96,76,42,0.14);
            border-radius: 999px;
            background: rgba(255,250,238,0.58);
            color: rgba(42,37,32,0.72);
            min-height: 40px;
            padding: 0 14px;
            cursor: pointer;
            font-weight: 800;
          }

          .kiosk-utility-buttons button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }

          .kiosk-control-deck {
            position: relative;
            z-index: 140;
            display: grid;
            grid-template-columns: auto minmax(360px, 1fr) auto;
            align-items: center;
            gap: clamp(12px, 1.6vw, 24px);
            padding: clamp(10px, 1.2vw, 18px) clamp(24px, 3vw, 54px) clamp(14px, 1.5vw, 24px);
          }

          .kiosk-voice-button {
            position: relative;
            width: clamp(100px, 7.2vw, 132px);
            height: clamp(100px, 7.2vw, 132px);
            border-radius: 999px;
            border: none;
            color: #201914;
            background: linear-gradient(145deg, var(--spot-accent), #fff0b5);
            box-shadow: 0 18px 48px rgba(92,70,38,0.20), 0 0 0 8px rgba(255,250,238,0.40);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            font-weight: 900;
            overflow: visible;
            touch-action: none;
          }

          .kiosk-voice-button:disabled {
            opacity: 0.58;
            cursor: not-allowed;
          }

          .kiosk-voice-button__halo {
            position: absolute;
            inset: -14px;
            border-radius: inherit;
            border: 1px solid rgba(216,168,78,0.28);
            animation: kioskVoiceHalo 2.2s ease-out infinite;
          }

          .kiosk-voice-button.is-recording {
            background: linear-gradient(145deg, #ff6b55, #ffd7ba);
          }

          .kiosk-voice-button__icon {
            font-size: clamp(30px, 3vw, 46px);
          }

          .kiosk-voice-button__text {
            font-size: clamp(15px, 1.2vw, 19px);
            letter-spacing: 0.04em;
          }

          .kiosk-text-box {
            min-height: clamp(86px, 8.8vh, 116px);
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            padding: 12px;
            border: 1px solid rgba(96,76,42,0.14);
            border-radius: 26px;
            background: rgba(255,250,238,0.70);
            backdrop-filter: blur(10px);
            box-shadow: 0 18px 46px rgba(92,70,38,0.14), inset 0 1px 0 rgba(255,255,255,0.76);
          }

          .kiosk-text-box textarea {
            width: 100%;
            height: 100%;
            min-height: 62px;
            resize: none;
            border: none;
            outline: none;
            background: transparent;
            color: #2a2520;
            font-size: clamp(17px, 1.35vw, 22px);
            line-height: 1.5;
            font-family: inherit;
          }

          .kiosk-text-box textarea::placeholder {
            color: rgba(42,37,32,0.38);
          }

          .kiosk-send-button {
            align-self: stretch;
            min-width: clamp(84px, 6vw, 112px);
            border: none;
            border-radius: 20px;
            background: rgba(42,37,32,0.88);
            color: #1c1713;
            cursor: pointer;
            font-size: clamp(16px, 1.2vw, 20px);
            font-weight: 900;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .kiosk-send-button {
            color: #fffaf0;
          }

          .kiosk-send-button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }

          .kiosk-utility-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .kiosk-utility-buttons button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 96px;
          }

          .kiosk-error-toast {
            position: fixed;
            top: 92px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            max-width: min(760px, 88vw);
            padding: 12px 16px;
            border-radius: 999px;
            color: #fffaf0;
            background: rgba(188,66,50,0.92);
            box-shadow: 0 18px 46px rgba(0,0,0,0.28);
            backdrop-filter: blur(16px);
            animation: kioskToastIn 280ms ease-out both;
          }

          .kiosk-error-toast__icon {
            width: 24px;
            height: 24px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            font-weight: 900;
          }

          .kiosk-error-toast button {
            border: none;
            background: transparent;
            color: inherit;
            cursor: pointer;
          }

          .kiosk-history-overlay {
            position: fixed;
            inset: 0;
            z-index: 500;
            display: grid;
            place-items: center;
            padding: 40px;
            background: rgba(4,8,8,0.62);
            backdrop-filter: blur(18px);
          }

          .kiosk-history-panel {
            width: min(980px, 92vw);
            max-height: min(760px, 86vh);
            display: flex;
            flex-direction: column;
            border-radius: 32px;
            background: rgba(253,251,247,0.96);
            color: #241f1a;
            overflow: hidden;
            box-shadow: 0 34px 100px rgba(0,0,0,0.36);
          }

          .kiosk-history-panel header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 28px;
            border-bottom: 1px solid rgba(42,37,32,0.08);
          }

          .kiosk-history-panel header span {
            display: block;
            color: rgba(42,37,32,0.52);
            font-size: 13px;
          }

          .kiosk-history-panel header strong {
            display: block;
            margin-top: 4px;
            font-size: 24px;
          }

          .kiosk-history-panel header button {
            width: 42px;
            height: 42px;
            border: none;
            border-radius: 14px;
            background: rgba(42,37,32,0.06);
            cursor: pointer;
          }

          .kiosk-history-list {
            flex: 1;
            min-height: 0;
            overflow: auto;
            padding: 22px 28px 28px;
          }

          @keyframes kioskPulse {
            0%, 100% { transform: scale(1); opacity: 0.66; }
            50% { transform: scale(1.55); opacity: 1; }
          }

          @keyframes kioskFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-12px) scale(1.02); }
          }

          @keyframes kioskVoiceHalo {
            from { transform: scale(0.88); opacity: 0.62; }
            to { transform: scale(1.18); opacity: 0; }
          }

          @keyframes kioskInkCursor {
            0%, 42% { opacity: 1; }
            43%, 100% { opacity: 0; }
          }

          @keyframes kioskToastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }

          @keyframes kioskRoutePanelIn {
            from { opacity: 0.72; transform: translate3d(18px, 0, 0) scale(0.994); }
            to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          }

          @media (max-width: 1180px) {
            .kiosk-page {
              min-height: 860px;
              overflow: auto;
            }

            .kiosk-topbar,
            .kiosk-control-deck,
            .kiosk-layout {
              grid-template-columns: 1fr;
            }

            .kiosk-topbar {
              height: auto;
            }

            .kiosk-topbar__brand {
              flex-wrap: wrap;
            }

            .kiosk-layout {
              height: auto;
              min-height: 720px;
              padding-inline: 24px;
            }

            .kiosk-page--route-mode .kiosk-layout {
              grid-template-columns: 1fr;
              height: auto;
              min-height: 720px;
              overflow: visible;
              padding-inline: 24px;
            }

            .kiosk-center-stage {
              min-height: 420px;
              order: -1;
            }

            .kiosk-utility-buttons {
              flex-direction: row;
            }

            .kiosk-service-grid {
              position: relative;
              left: auto;
              bottom: auto;
              transform: none;
              margin: auto auto 18px;
              flex-wrap: wrap;
            }

          }

          @media (prefers-reduced-motion: reduce) {
            .kiosk-layout,
            .kiosk-center-stage,
            .kiosk-stage-ring,
            .kiosk-stage-floor,
            .kiosk-idle-card,
            .kiosk-service-grid,
            .kiosk-answer-card,
            .kiosk-status-dot--thinking,
            .kiosk-status-dot--transcribing,
            .kiosk-status-dot--speaking,
            .kiosk-voice-button__halo {
              transition: none;
              animation: none;
            }
          }
        `}</style>
      </main>
    </>
  );
};

export default ChatPage;
