import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ChatPage from '../pages/tourist/ChatPage';

Element.prototype.scrollIntoView = vi.fn();

const mockAddMessage = vi.fn();
const mockUpdateMessage = vi.fn();
const mockUpdateMessageStatus = vi.fn();
const mockSetStreaming = vi.fn();
const mockSetCurrentSession = vi.fn();
const mockSetError = vi.fn();
const mockSetActiveTopic = vi.fn();
const mockSetPanelCollapsed = vi.fn();
const mockClearMessages = vi.fn();
const mockGetHistory = vi.fn(() => []);
const mockListRoutes = vi.hoisted(() => vi.fn());
const mockListSpots = vi.hoisted(() => vi.fn());

vi.mock('../stores/chatStore', () => {
  const useChatStore = () => ({
    messages: [],
    currentSessionId: null,
    isStreaming: false,
    error: null,
    activeTopic: null,
    panelCollapsed: true,
    addMessage: mockAddMessage,
    updateMessage: mockUpdateMessage,
    updateMessageStatus: mockUpdateMessageStatus,
    setStreaming: mockSetStreaming,
    setCurrentSession: mockSetCurrentSession,
    setError: mockSetError,
    setActiveTopic: mockSetActiveTopic,
    setPanelCollapsed: mockSetPanelCollapsed,
    clearMessages: mockClearMessages,
    getHistory: mockGetHistory,
    removeMessage: vi.fn(),
  });
  useChatStore.getState = () => ({
    messages: [],
    updateMessage: mockUpdateMessage,
    updateMessageStatus: mockUpdateMessageStatus,
  });
  useChatStore.setState = vi.fn();
  return { useChatStore };
});

const mockControllerStart = vi.fn();
const mockControllerStop = vi.fn();

vi.mock('../hooks/useAudioSyncController', () => ({
  useAudioSyncController: () => ({
    start: mockControllerStart,
    stop: mockControllerStop,
    topic: null,
    card: null,
    error: null,
    visibleCharCount: 0,
    isStreaming: false,
  }),
}));

const mockSpeak = vi.fn();
const mockSpeakBrowserFallback = vi.fn();
const mockStop = vi.fn();
const mockSetEmotion = vi.fn();
const mockSetPoseOverride = vi.fn();

vi.mock('../components/tourist/DigitalHumanProvider', () => ({
  useDigitalHuman: () => ({
    isSpeaking: false,
    speak: mockSpeak,
    speakBrowserFallback: mockSpeakBrowserFallback,
    stop: mockStop,
    setEmotion: mockSetEmotion,
    setPoseOverride: mockSetPoseOverride,
  }),
}));

vi.mock('../utils/emotion', () => ({
  detectEmotion: () => 'smile',
}));

vi.mock('../api/chat', () => ({
  transcribeAudio: vi.fn(() => Promise.resolve('语音转文字结果')),
}));

vi.mock('../api/spots', () => ({
  listRoutes: mockListRoutes,
  listSpots: mockListSpots,
}));

vi.mock('../hooks/useVoiceRecord', () => ({
  convertBlobToWav: vi.fn((blob) => Promise.resolve(blob)),
  useVoiceRecord: () => ({
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    getAudioBlob: vi.fn(() => new Blob(['audio'])),
    isRecording: false,
    error: null,
  }),
}));

vi.mock('../components/DigitalHuman/ChatBubble', () => ({
  default: ({ message, isUser }: any) => (
    <div data-testid={`bubble-${message.id}`}>
      {isUser ? '用户' : 'AI'}: {message.content}
    </div>
  ),
  TimeDivider: ({ timestamp }: any) => <div data-testid="time-divider">{timestamp}</div>,
  isSameDay: () => true,
}));

vi.mock('../components/common/AMapView', () => ({
  default: ({ markers, pathOrder, activeMarkerId }: any) => (
    <div
      data-testid="amap-view"
      data-marker-count={markers.length}
      data-path-order={(pathOrder || []).join(',')}
      data-active-marker={activeMarkerId || ''}
    />
  ),
}));

vi.mock('../components/Galgame/GalgameRouteScroll', () => ({
  default: ({ route, currentSpotIndex, onSpotClick }: any) => (
    <div data-testid="galgame-route-scroll" data-route={route.name} data-current={currentSpotIndex}>
      {route.spots.map((spot: any, index: number) => (
        <button
          key={spot.id}
          data-testid={`route-spot-marker-${spot.id}`}
          onClick={() => onSpotClick?.(index)}
        >
          {spot.name}
        </button>
      ))}
    </div>
  ),
}));

const routeSpot = (id: string, name: string, longitude: number, latitude: number, overview = `${name}简介`) => ({
  id,
  name,
  category: 'spot',
  tags: [],
  overview,
  qr_code: null,
  thumbnail: null,
  duration: '20分钟',
  display_x: 50,
  display_y: 50,
  latitude,
  longitude,
  qa_json: [],
  story_acts: [],
});

const routeFixture = {
  id: 'culture-route',
  name: '文化深度游',
  route_type: 'culture',
  duration: '5小时',
  description: '从灵山大佛出发的文化路线',
  gradient: null,
  cover_image: null,
  color: '#8B6B4A',
  brush_image: null,
  opening_text: '沿着文化深度游继续向前。',
  closing_text: '祝你游览愉快。',
  spot_order: ['ling-shan-da-fo', 'xiang-fu-chan-si', 'jiu-long-guan-yu'],
  spot_details: null,
  is_active: true,
};

const offCurrentRouteFixture = {
  ...routeFixture,
  id: 'family-route',
  name: '亲子欢乐游',
  route_type: 'family',
  duration: '3-4小时',
  description: '轻松看演出和互动点，适合亲子慢游',
  opening_text: '亲子欢乐游会更轻松，适合带小朋友慢慢看。',
  spot_order: ['jiu-long-guan-yu', 'xiang-fu-chan-si'],
};

function renderPage(path = '/chat') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ChatPage />
    </MemoryRouter>
  );
}

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="route-location">{location.pathname}{location.search}</div>;
};

function renderRoutedPage(path = '/chat') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/history" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChatPage kiosk mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRoutes.mockResolvedValue([routeFixture, offCurrentRouteFixture]);
    mockListSpots.mockResolvedValue([
      routeSpot('ling-shan-da-fo', '灵山大佛', 120.101, 31.473),
      routeSpot(
        'xiang-fu-chan-si',
        '祥符禅寺',
        120.102,
        31.474,
        '长约数百米的林荫步道，两侧植有数十株菩提树，枝叶交错如绿色穹顶，适合慢慢步行感受山水与禅意。'
      ),
      routeSpot('jiu-long-guan-yu', '九龙灌浴', 120.103, 31.475),
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the large-screen kiosk shell', () => {
    renderPage();

    expect(screen.getByTestId('chat-page')).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-service-grid')).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-idle-card')).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-voice-button')).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-spot-switch-link')).toHaveTextContent('切换点位');
    expect(screen.getByTestId('kiosk-history-button')).toHaveTextContent('历史穿越');
  });

  it('enters the era time-travel page and preserves the kiosk return spot', () => {
    renderRoutedPage('/chat?spot=lingshan-dafo');
    fireEvent.click(screen.getByTestId('kiosk-history-button'));

    expect(mockControllerStop).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(screen.getByTestId('route-location')).toHaveTextContent(
      `/history?returnTo=${encodeURIComponent('/chat?spot=lingshan-dafo')}`,
    );
  });

  it('loads a fixed spot by URL parameter', () => {
    renderPage('/chat?spot=xiangfu-temple');

    expect(screen.getByText('祥符禅寺 AI 导览')).toBeInTheDocument();
    expect(screen.getByText('当前点位 · 祥符禅寺入口')).toBeInTheDocument();
  });

  it('initializes a kiosk session and greeting', async () => {
    renderPage('/chat?spot=nine-dragon');

    expect(mockClearMessages).toHaveBeenCalled();
    expect(mockSetCurrentSession).toHaveBeenCalledWith(expect.stringMatching(/^kiosk_nine-dragon_/));
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalledWith(expect.stringContaining('九龙灌浴'), { emotion: 'smile' });
    });
  });

  it('sends typed questions with hidden spot context', () => {
    renderPage('/chat?spot=lingshan-dafo');
    vi.clearAllMocks();

    fireEvent.change(screen.getByTestId('text-input'), { target: { value: '这里有什么看点？' } });
    fireEvent.click(screen.getByTestId('send-button'));

    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'user', content: '这里有什么看点？' })
    );
    expect(mockControllerStart).toHaveBeenCalledWith(
      expect.objectContaining({
        question: expect.stringContaining('当前互动大屏点位：灵山大佛'),
      })
    );
  });

  it('does not send blank typed questions', () => {
    renderPage();
    vi.clearAllMocks();

    fireEvent.click(screen.getByTestId('send-button'));

    expect(mockAddMessage).not.toHaveBeenCalled();
    expect(mockControllerStart).not.toHaveBeenCalled();
  });

  it('answers greetings locally without starting the AI stream', () => {
    renderPage('/chat?spot=nine-dragon');
    vi.clearAllMocks();

    fireEvent.change(screen.getByTestId('text-input'), { target: { value: '你好' } });
    fireEvent.click(screen.getByTestId('send-button'));

    expect(mockSetActiveTopic).toHaveBeenCalledWith('general');
    expect(mockControllerStart).not.toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'user', content: '你好' })
    );
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('你现在位于九龙灌浴'),
      })
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('可以直接问我这里有什么看点'),
      expect.objectContaining({ emotion: 'smile', onError: expect.any(Function) })
    );
    expect(mockSpeakBrowserFallback).not.toHaveBeenCalled();
  });

  it('answers restroom questions locally for the current kiosk spot', () => {
    renderPage('/chat?spot=nine-dragon');
    vi.clearAllMocks();

    fireEvent.change(screen.getByTestId('text-input'), { target: { value: '厕所在哪里？' } });
    fireEvent.click(screen.getByTestId('send-button'));

    expect(mockSetActiveTopic).toHaveBeenCalledWith('food');
    expect(mockControllerStart).not.toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'user', content: '厕所在哪里？' })
    );
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('九龙灌浴广场'),
      })
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('卫生间 / WC / 游客服务中心'),
      expect.objectContaining({ emotion: 'smile', onError: expect.any(Function) })
    );
  });

  it('route tile opens chooser, expands scroll map after selection, and exits cleanly', async () => {
    renderPage('/chat?spot=lingshan-dafo');
    vi.clearAllMocks();

    fireEvent.click(screen.getByTestId('kiosk-action-route-next'));

    expect(screen.getByTestId('kiosk-route-map-panel')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('kiosk-route-choice-list')).toBeInTheDocument());
    expect(screen.getByTestId('kiosk-service-grid')).toHaveClass('is-route-hidden');
    expect(screen.getByTestId('kiosk-service-grid')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('galgame-route-scroll')).not.toBeInTheDocument();
    expect(mockSetActiveTopic).toHaveBeenCalledWith('route');
    expect(mockSetPanelCollapsed).toHaveBeenCalledWith(false);
    expect(mockControllerStop).toHaveBeenCalled();
    expect(mockControllerStart).not.toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'user', content: '推荐路线' })
    );
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('你可以先选'),
      })
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('我先不替你直接拍板'),
      expect.objectContaining({ emotion: 'smile', onError: expect.any(Function) })
    );

    fireEvent.click(screen.getByTestId('kiosk-route-choice-culture-route'));
    await waitFor(() => expect(screen.getByTestId('galgame-route-scroll')).toHaveAttribute('data-route', '文化深度游'));
    expect(screen.getByTestId('galgame-route-scroll')).toHaveAttribute('data-current', '0');
    expect(mockAddMessage).toHaveBeenCalledTimes(4);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ role: 'user', content: '选择路线：文化深度游' })
    );
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('文化深度游'),
      })
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('沿着文化深度游继续向前'),
      expect.objectContaining({ emotion: 'smile', onComplete: expect.any(Function), onError: expect.any(Function) })
    );

    mockSpeak.mockClear();
    mockSpeakBrowserFallback.mockClear();

    fireEvent.click(screen.getByTestId('route-spot-marker-xiang-fu-chan-si'));
    expect(screen.getByTestId('galgame-route-scroll')).toHaveAttribute('data-current', '1');
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('祥符禅寺'),
      expect.objectContaining({ emotion: 'smile', onError: expect.any(Function) })
    );
    const focusedSpotSpeech = mockSpeak.mock.calls[mockSpeak.mock.calls.length - 1]?.[0] as string;
    expect(focusedSpotSpeech).toContain('绿色穹顶');
    expect(focusedSpotSpeech).not.toContain('…');
    expect(mockSpeakBrowserFallback).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('kiosk-route-exit'));
    expect(screen.getByTestId('kiosk-service-grid')).toBeInTheDocument();
    expect(screen.getByTestId('kiosk-service-grid')).not.toHaveClass('is-route-hidden');
    expect(mockSetActiveTopic).toHaveBeenCalledWith(null);
  });

  it('warns when selected route does not include the current kiosk spot', async () => {
    renderPage('/chat?spot=lingshan-dafo');
    vi.clearAllMocks();

    fireEvent.click(screen.getByTestId('kiosk-action-route-next'));
    await waitFor(() => expect(screen.getByTestId('kiosk-route-choice-list')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('kiosk-route-choice-family-route'));

    await waitFor(() => expect(screen.getByTestId('kiosk-route-away-notice')).toBeInTheDocument());
    expect(screen.getByTestId('kiosk-route-away-notice')).toHaveTextContent('当前点位不在此路线');
    expect(screen.getByTestId('kiosk-route-away-notice')).toHaveTextContent('灵山大佛');
    expect(screen.getByText(/当前在 灵山大佛，该路线从 九龙灌浴 开始/)).toBeInTheDocument();
    expect(screen.getByText('路线起点')).toBeInTheDocument();
    expect(screen.getByTestId('galgame-route-scroll')).toHaveAttribute('data-current', '0');
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('这条路线不经过当前点位'),
      })
    );
  });

  it('spot guide tile plays curated local narration with a visual scroll panel', async () => {
    renderPage('/chat?spot=lingshan-dafo');
    vi.clearAllMocks();

    fireEvent.click(screen.getByTestId('kiosk-action-spot-guide'));

    expect(mockControllerStop).toHaveBeenCalled();
    expect(mockControllerStart).not.toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'user', content: '讲讲这里' })
    );
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('1997年11月15日'),
      })
    );
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('最有震撼力的地标'),
      expect.objectContaining({ emotion: 'smile', onComplete: expect.any(Function), onError: expect.any(Function) })
    );
    expect(screen.getByTestId('kiosk-spot-guide-panel')).toBeInTheDocument();
    expect(screen.getByText('灵山大佛图文导览')).toBeInTheDocument();
    expect(screen.getByText('216 级登云道')).toBeInTheDocument();
    expect(screen.getByText('施无畏印与与愿印')).toBeInTheDocument();
    expect(screen.getAllByTestId('kiosk-guide-card')).toHaveLength(3);

    const latestCall = mockSpeak.mock.calls[mockSpeak.mock.calls.length - 1];
    await act(async () => {
      latestCall?.[1]?.onComplete?.();
    });
    expect(mockSpeak).toHaveBeenCalledWith(
      expect.stringContaining('通高88米'),
      expect.objectContaining({ emotion: 'smile', onComplete: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('reset button clears the current kiosk conversation', () => {
    renderPage();
    vi.clearAllMocks();

    fireEvent.click(screen.getByText('重置'));

    expect(mockControllerStop).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(mockClearMessages).toHaveBeenCalled();
    expect(mockSetCurrentSession).toHaveBeenCalledWith(expect.stringMatching(/^kiosk_lingshan-dafo_/));
  });
});
