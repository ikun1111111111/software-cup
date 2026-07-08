import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MiniRouteTimeline from '../../components/Galgame/MiniRouteTimeline';
import GalgameRouteScroll from '../../components/Galgame/GalgameRouteScroll';
import GuideBubble from '../../components/Galgame/GuideBubble';
import GalgameDialog from '../../components/Galgame/GalgameDialog';
import { listRoutes, listSpots, type Spot, type TourRoute } from '../../api/spots';
import { useDigitalHuman } from '../../components/tourist/DigitalHumanProvider';
import { useChatStore, Message } from '../../stores/chatStore';
import { useSSE } from '../../hooks/useSSE';
import type { Emotion } from '../../components/DigitalHuman/EmotionController';
import type { RouteData, RouteSpot } from '../../components/Galgame/routeData';

const WELCOME_TEXT =
  '欢迎来到路线推荐。我是你的数字导览人小景，会为你规划最适合的灵山游览路线。你想先了解哪条路线呢？';

const DIALOG_PROMPTS = {
  list: '请选择一条路线，小景为你讲解。也可以直接向我提问。',
  overview: '已选择路线，可以开始游览、返回列表，或直接提问。',
  tour: '正在游览中，可切换站点、查看概览，或随时向我提问。',
};

interface DialogChoice {
  id: string;
  text: string;
  onClick: () => void;
}

type ViewMode = 'list' | 'overview' | 'tour';
type TravelPreferenceId = 'culture' | 'nature' | 'family';
type DisplayRoute = RouteData & {
  routeType: string;
  description: string;
};

interface TravelPreference {
  id: TravelPreferenceId;
  label: string;
  subtitle: string;
  routeTypes: string[];
  keywords: string[];
}

interface RouteRecommendation {
  route: DisplayRoute;
  score: number;
  reason: string;
  matchedKeywords: string[];
}

const PREFERENCE_OPTIONS: TravelPreference[] = [
  {
    id: 'culture',
    label: '人文历史',
    subtitle: '典故、建筑、佛教艺术',
    routeTypes: ['culture', 'history'],
    keywords: ['历史', '文化', '玄奘', '祥符', '梵宫', '五印', '三圣', '佛教', '艺术', '非遗'],
  },
  {
    id: 'nature',
    label: '自然风光',
    subtitle: '太湖、园林、慢行放松',
    routeTypes: ['nature', 'scenery'],
    keywords: ['自然', '风光', '太湖', '园林', '菩提', '曼飞龙', '精舍', '山水', '漫步', '放松'],
  },
  {
    id: 'family',
    label: '亲子休闲',
    subtitle: '互动、表演、轻松节奏',
    routeTypes: ['family', 'kids', 'leisure'],
    keywords: ['亲子', '孩子', '家庭', '互动', '表演', '九龙', '佛手', '百子', '轻松', '拍照'],
  },
];

function getPreferenceById(id: TravelPreferenceId): TravelPreference {
  return PREFERENCE_OPTIONS.find((item) => item.id === id) || PREFERENCE_OPTIONS[0];
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreRouteByPreference(route: DisplayRoute, preference: TravelPreference): RouteRecommendation {
  const routeText = [
    route.name,
    route.duration,
    route.description,
    route.openingText,
    route.closingText,
    ...route.spots.flatMap((spot) => [
      spot.name,
      spot.description,
      ...spot.qa.flatMap((qa) => [qa.q, qa.a]),
    ]),
  ].join(' ');

  const matchedKeywords = uniq(preference.keywords.filter((keyword) => routeText.includes(keyword)));
  const typeMatched = preference.routeTypes.includes(route.routeType);
  const nameMatched = preference.keywords.some((keyword) => route.name.includes(keyword));
  const spotMatchCount = route.spots.reduce((count, spot) => {
    const spotText = `${spot.name} ${spot.description}`;
    return count + preference.keywords.filter((keyword) => spotText.includes(keyword)).length;
  }, 0);

  const score =
    35 +
    (typeMatched ? 42 : 0) +
    (nameMatched ? 12 : 0) +
    Math.min(matchedKeywords.length * 5, 28) +
    Math.min(spotMatchCount * 2, 16);

  let reason = `匹配「${matchedKeywords.slice(0, 3).join('、')}」等兴趣点`;
  if (typeMatched) {
    reason = `路线主题与「${preference.label}」高度匹配`;
  } else if (matchedKeywords.length === 0) {
    reason = '综合景点密度、时长和讲解内容推荐';
  }

  return {
    route,
    score: Math.min(score, 99),
    reason,
    matchedKeywords,
  };
}

function buildRouteRecommendations(
  routes: DisplayRoute[],
  preference: TravelPreference
): RouteRecommendation[] {
  return routes
    .map((route, index) => ({
      ...scoreRouteByPreference(route, preference),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ index: _index, ...item }) => item);
}

const RecommendPage: React.FC = () => {
  const { isSpeaking, speak, stop, setEmotion } = useDigitalHuman();

  const {
    currentSessionId,
    isStreaming,
    addMessage,
    updateMessage,
    updateMessageStatus,
    setStreaming,
    setCurrentSession,
    getHistory,
  } = useChatStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
  const [guideText, setGuideText] = useState('');
  const [dialogText, setDialogText] = useState(DIALOG_PROMPTS.list);
  const [dialogChoices, setDialogChoices] = useState<DialogChoice[]>([]);
  const [inputText, setInputText] = useState('');
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [selectedPreference, setSelectedPreference] = useState<TravelPreferenceId>('culture');

  const [routesRaw, setRoutesRaw] = useState<TourRoute[]>([]);
  const [spotsMap, setSpotsMap] = useState<Record<string, Spot>>({});
  const [loading, setLoading] = useState(true);
  const selectedPreferenceOption = getPreferenceById(selectedPreference);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [routes, spots] = await Promise.all([listRoutes(), listSpots()]);
        if (cancelled) return;
        setRoutesRaw(routes);
        setSpotsMap(Object.fromEntries(spots.map((s) => [s.id, s])));
      } catch (e) {
        console.error('Failed to load route data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const routes = useMemo<DisplayRoute[]>(() => {
    return routesRaw.map((route) => {
      const spots: RouteSpot[] = route.spot_order
        .map((spotId) => {
          const spot = spotsMap[spotId];
          if (!spot) return null;
          return {
            id: spot.id,
            name: spot.name,
            icon: spot.thumbnail ? `/${spot.thumbnail}` : '/image/icons/icon-default.png',
            x: spot.display_x ?? 50,
            y: spot.display_y ?? 50,
            description: spot.overview || '',
            duration: spot.duration || '',
            qa: spot.qa_json || [],
          };
        })
        .filter(Boolean) as RouteSpot[];
      return {
        id: route.id,
        name: route.name,
        duration: route.duration,
        routeType: route.route_type,
        description: route.description,
        color: route.color || '#2A2520',
        brushImage: route.brush_image ? `/${route.brush_image}` : '/image/brushes/brush-ink.png',
        spots,
        openingText: route.opening_text || `欢迎来到${route.name}。`,
        closingText: route.closing_text || '祝您游览愉快。',
      };
    });
  }, [routesRaw, spotsMap]);

  const routeRecommendations = useMemo(
    () => buildRouteRecommendations(routes, selectedPreferenceOption),
    [routes, selectedPreferenceOption]
  );

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

  const selectedRouteRecommendation = useMemo(
    () => routeRecommendations.find((item) => item.route.id === selectedRouteId) || null,
    [routeRecommendations, selectedRouteId]
  );

  const previewRoute = selectedRoute ?? routeRecommendations[0]?.route ?? null;
  const previewSpotIndex = selectedRoute ? currentSpotIndex : 0;

  const handleRouteScrollSpotClick = useCallback(
    (index: number) => {
      if (!previewRoute) return;
      if (!selectedRoute) {
        setSelectedRouteId(previewRoute.id);
      }
      setCurrentSpotIndex(index);
      setViewMode('tour');
    },
    [previewRoute, selectedRoute]
  );

  const narrate = useCallback(
    (text: string, opts?: { emotion?: Emotion }) => {
      setGuideText(text);
      setIsTyping(true);
      setBubbleKey((k) => k + 1);
      speak(text, { emotion: opts?.emotion });
    },
    [speak]
  );

  const handleSkipSpeaking = useCallback(() => {
    stop();
    setIsTyping(false);
  }, [stop]);

  const handlePreferenceSelect = useCallback(
    (preferenceId: TravelPreferenceId) => {
      const nextPreference = getPreferenceById(preferenceId);
      const nextRecommendations = buildRouteRecommendations(routes, nextPreference);
      const topRecommendation = nextRecommendations[0];

      setSelectedPreference(preferenceId);
      setSelectedRouteId(null);
      setCurrentSpotIndex(0);
      setViewMode('list');

      if (topRecommendation) {
        narrate(
          `收到，你更偏好${nextPreference.label}。小景首推「${topRecommendation.route.name}」，${topRecommendation.reason}。`,
          { emotion: 'smile' }
        );
      } else {
        narrate(`收到，你更偏好${nextPreference.label}。小景会按这个方向为你筛选路线。`, { emotion: 'smile' });
      }
    },
    [routes, narrate]
  );

  /* ---------- 内联 SSE 问答 ---------- */
  const { connect, disconnect } = useSSE({
    onMessage: (msg) => {
      const {
        messages: latestMessages,
        updateMessage: latestUpdateMessage,
        updateMessageStatus: latestUpdateStatus,
      } = useChatStore.getState();
      const lastMessage = latestMessages[latestMessages.length - 1];

      if (msg.event === 'token') {
        if (lastMessage && lastMessage.role === 'assistant') {
          const updated = lastMessage.content + (msg.data.token || '');
          latestUpdateMessage(lastMessage.id, updated);
          setGuideText(updated);
        }
      } else if (msg.event === 'faq_hit') {
        setStreaming(false);
        setIsChatStreaming(false);
        if (lastMessage) {
          const answer = msg.data.answer || '';
          latestUpdateMessage(lastMessage.id, answer);
          latestUpdateStatus(lastMessage.id, 'sent');
          setGuideText(answer);
          setEmotion(detectEmotion(answer));
          speak(answer, { emotion: detectEmotion(answer) });
        }
      } else if (msg.event === 'done') {
        setStreaming(false);
        setIsChatStreaming(false);
        if (lastMessage) {
          const finalContent = lastMessage.content || msg.data?.answer || '';
          latestUpdateMessage(lastMessage.id, finalContent);
          latestUpdateStatus(lastMessage.id, 'sent');
          setGuideText(finalContent);
          setEmotion(detectEmotion(finalContent));
          speak(finalContent, { emotion: detectEmotion(finalContent) });
        }
      } else if (msg.event === 'error') {
        setStreaming(false);
        setIsChatStreaming(false);
        setGuideText(msg.data.error || '生成回答时出错，请稍后重试');
        if (lastMessage) {
          latestUpdateStatus(lastMessage.id, 'error');
        }
      }
    },
    onError: () => {
      setStreaming(false);
      setIsChatStreaming(false);
      setGuideText('连接错误，请稍后重试');
    },
    onClose: () => {
      setStreaming(false);
      setIsChatStreaming(false);
    },
  });

  const askInline = useCallback(
    (question: string) => {
      if (!question.trim() || isStreaming || isChatStreaming) return;

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: question.trim(),
        timestamp: Date.now(),
        status: 'sent',
      };
      addMessage(userMessage);

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };
      addMessage(assistantMessage);

      setGuideText('小景正在思考…');
      setIsChatStreaming(true);
      setStreaming(true);
      stop();

      const sid = currentSessionId || `session_${Date.now()}`;
      if (!currentSessionId) setCurrentSession(sid);

      connect('/api/chat/stream', {
        session_id: sid,
        question: question.trim(),
        stream: true,
        history: getHistory(5),
      });
    },
    [
      isStreaming,
      isChatStreaming,
      currentSessionId,
      addMessage,
      setStreaming,
      stop,
      connect,
      getHistory,
      setCurrentSession,
    ]
  );

  const handleSendText = useCallback(() => {
    if (!inputText.trim()) return;
    askInline(inputText);
    setInputText('');
  }, [inputText, askInline]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  const backToList = useCallback(() => {
    setSelectedRouteId(null);
    setCurrentSpotIndex(0);
    setViewMode('list');
    const topRecommendation = routeRecommendations[0];
    narrate(
      topRecommendation
        ? `已回到路线列表。我继续按「${selectedPreferenceOption.label}」为你排序，当前首推「${topRecommendation.route.name}」。`
        : WELCOME_TEXT,
      { emotion: 'smile' }
    );
  }, [narrate, routeRecommendations, selectedPreferenceOption]);

  const backToListRef = useRef(backToList);
  backToListRef.current = backToList;

  const selectRoute = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
    setCurrentSpotIndex(0);
    setViewMode('overview');
  }, []);

  const handleSpotClick = useCallback((idx: number) => {
    setCurrentSpotIndex(idx);
    setViewMode('tour');
  }, []);

  const handleCloseScroll = useCallback(() => {
    backToListRef.current();
  }, []);

  /* ---------- 路线列表态 ---------- */
  useEffect(() => {
    if (viewMode !== 'list') return;
    const topRecommendation = routeRecommendations[0];
    setDialogText(
      topRecommendation
        ? `我已按「${selectedPreferenceOption.label}」为你重排路线，首推「${topRecommendation.route.name}」。${topRecommendation.reason}。`
        : DIALOG_PROMPTS.list
    );
    setDialogChoices(
      routeRecommendations.map((item, index) => ({
        id: item.route.id,
        text: `${index === 0 ? '首推｜' : ''}${item.route.name} · ${item.route.duration}｜${item.reason}`,
        onClick: () => selectRoute(item.route.id),
      }))
    );
  }, [viewMode, routeRecommendations, selectRoute, selectedPreferenceOption]);

  /* ---------- 路线概览态 ---------- */
  useEffect(() => {
    if (viewMode !== 'overview' || !selectedRoute) return;
    setDialogText(DIALOG_PROMPTS.overview);
    setDialogChoices([
      { id: 'start', text: '开始游览', onClick: () => setViewMode('tour') },
      { id: 'back', text: '返回路线列表', onClick: () => backToListRef.current() },
    ]);
    narrate(
      selectedRouteRecommendation
        ? `根据「${selectedPreferenceOption.label}」偏好，我推荐这条路线：${selectedRouteRecommendation.reason}。${selectedRoute.openingText}`
        : selectedRoute.openingText,
      { emotion: 'smile' }
    );
  }, [viewMode, selectedRoute, selectedRouteRecommendation, selectedPreferenceOption, narrate]);

  /* ---------- 景点游览态 ---------- */
  useEffect(() => {
    if (viewMode !== 'tour' || !selectedRoute) return;
    const spot = selectedRoute.spots[currentSpotIndex];
    if (!spot) return;

    setDialogText(DIALOG_PROMPTS.tour);
    const choices: DialogChoice[] = [
      {
        id: 'prev',
        text: '上一站',
        onClick: () => setCurrentSpotIndex((i) => Math.max(i - 1, 0)),
      },
      {
        id: 'next',
        text: '下一站',
        onClick: () => setCurrentSpotIndex((i) => Math.min(i + 1, selectedRoute.spots.length - 1)),
      },
      { id: 'overview', text: '路线概览', onClick: () => setViewMode('overview') },
    ];
    setDialogChoices(
      choices.filter((c) => {
        if (c.id === 'prev' && currentSpotIndex === 0) return false;
        if (c.id === 'next' && currentSpotIndex >= selectedRoute.spots.length - 1) return false;
        return true;
      })
    );
    narrate(`${spot.name}到了。${spot.description}`, { emotion: 'neutral' });
  }, [viewMode, selectedRoute, currentSpotIndex, narrate]);

  /* ---------- 初始化 ---------- */
  useEffect(() => {
    narrate(WELCOME_TEXT, { emotion: 'smile' });
    return () => {
      stop();
    };
  }, []);

  /* ---------- 清理 SSE ---------- */
  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;
  useEffect(() => {
    return () => {
      disconnectRef.current();
    };
  }, []);

  if (loading) {
    return (
      <div
        data-testid="recommend-page"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F7F5F0',
        }}
      >
        小景正在准备路线…
      </div>
    );
  }

  return (
    <div
      data-testid="recommend-page"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#F7F5F0',
      }}
    >
      {/* 抽象墨卷路线图：游客先理解顺序与重点，实时导航降级为辅助入口 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 68% 38%, rgba(106,156,137,0.16), transparent 32%), linear-gradient(135deg, rgba(247,245,240,0.96), rgba(237,232,222,0.9))',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `var(--texture-paper)`,
            opacity: 0.42,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 86,
            right: 72,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            borderRadius: 999,
            background: 'rgba(253,251,247,0.82)',
            border: '1px solid rgba(180,160,130,0.28)',
            boxShadow: '0 10px 24px rgba(42,37,32,0.08)',
            color: '#6A6258',
            fontSize: 12,
            letterSpacing: '0.08em',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span style={{ color: '#C8882E', fontWeight: 700 }}>导览卷轴</span>
          <span>{previewRoute ? `${previewRoute.spots.length} 站 · ${previewRoute.duration}` : '路线加载中'}</span>
        </div>
        <GalgameRouteScroll
          route={previewRoute}
          currentSpotIndex={previewSpotIndex}
          isVisible={Boolean(previewRoute)}
          onSpotClick={handleRouteScrollSpotClick}
        />
      </div>

      {/* 柔和暗角，压住边缘杂讯，让视线落在路线卷轴上 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(247,245,240,0.56) 0%, transparent 26%, transparent 76%, rgba(247,245,240,0.34) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        data-testid="route-preference-panel"
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 8,
          width: 390,
          maxWidth: 'calc(100vw - 48px)',
          padding: '12px',
          background: 'rgba(253,251,247,0.88)',
          border: '1px solid rgba(106,156,137,0.20)',
          borderRadius: 8,
          boxShadow: '0 12px 28px rgba(42,37,32,0.10)',
          backdropFilter: 'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#2A2520',
              fontFamily: "var(--font-calligraphy), 'KaiTi', serif",
            }}
          >
            游览偏好
          </div>
          {routeRecommendations[0] && (
            <div
              data-testid="route-recommendation-summary"
              style={{
                fontSize: 12,
                color: '#6A6258',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              首推 {routeRecommendations[0].route.name}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {PREFERENCE_OPTIONS.map((option) => {
            const active = option.id === selectedPreference;
            return (
              <button
                key={option.id}
                data-testid={`preference-${option.id}`}
                aria-pressed={active}
                onClick={() => handlePreferenceSelect(option.id)}
                style={{
                  minHeight: 68,
                  padding: '9px 8px',
                  borderRadius: 8,
                  border: active ? '1px solid rgba(45,139,87,0.58)' : '1px solid rgba(42,37,32,0.08)',
                  background: active ? 'rgba(106,156,137,0.16)' : 'rgba(255,255,255,0.68)',
                  color: active ? '#2D5D4D' : '#3E3933',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 180ms ease',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.56)' : 'none',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    marginBottom: 5,
                  }}
                >
                  {option.label}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    lineHeight: 1.35,
                    color: active ? 'rgba(45,93,77,0.82)' : 'rgba(62,57,51,0.58)',
                  }}
                >
                  {option.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 路线迷你时间线（overview/tour 态显示，置于右上角，不抢地图主体） */}
      {(viewMode === 'overview' || viewMode === 'tour') && selectedRoute && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            zIndex: 6,
          }}
        >
          <MiniRouteTimeline
            route={selectedRoute}
            currentSpotIndex={currentSpotIndex}
            onSpotClick={handleSpotClick}
            onClose={handleCloseScroll}
          />
        </div>
      )}

      {/* 小景解说气泡 — 让位地图，定位左下，避开右上角时间线 */}
      {!!guideText && (
        <GuideBubble
          key={bubbleKey}
          speakerName="小景"
          text={guideText}
          isTyping={isTyping}
          typingSpeed={22}
          visible
          onSkip={handleSkipSpeaking}
          style={{
            position: 'absolute',
            left: 32,
            bottom: 220,
            maxWidth: 380,
            zIndex: 110,
          }}
        />
      )}

      {/* 底部 Galgame 对话框 — 压扁为水平条让位地图 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <GalgameDialog
            speakerName="小景"
            text={dialogText}
            isTypingEnabled={true}
            typingSpeed={22}
            choices={dialogChoices}
            showChoices={dialogChoices.length > 0}
            inputValue={inputText}
            onInputChange={setInputText}
            onSend={handleSendText}
            onKeyPress={handleKeyPress}
            disabled={isStreaming || isChatStreaming}
            isMobile={false}
            isSpeaking={isSpeaking}
            variant="zen"
            width={680}
            maxWidth="56vw"
            bottom={16}
            minHeight={140}
            maxHeight={210}
            inputPlaceholder="随时向小景提问…"
          />
        </div>
      </div>
    </div>
  );
};

function detectEmotion(text: string): Emotion {
  if (!text) return 'neutral';
  if (/[开心高兴棒好赞喜欢满意]/.test(text)) return 'smile';
  if (/[抱歉遗憾难过不幸问题错]/.test(text)) return 'sorry';
  if (/[？?什么为什么怎么]/.test(text)) return 'think';
  if (/[！!哇厉害惊讶]/.test(text)) return 'surprise';
  return 'neutral';
}

export default RecommendPage;
