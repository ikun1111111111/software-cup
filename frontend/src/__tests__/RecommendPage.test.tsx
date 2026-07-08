import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { Spot, TourRoute } from '../api/spots';

Element.prototype.scrollIntoView = vi.fn();

const mockListSpots = vi.fn();
const mockListRoutes = vi.fn();

vi.mock('../api/spots', () => ({
  listSpots: (...args: unknown[]) => mockListSpots(...args),
  listRoutes: (...args: unknown[]) => mockListRoutes(...args),
}));

const mockSpeak = vi.fn();
const mockStop = vi.fn();
const mockSetEmotion = vi.fn();

vi.mock('../components/tourist/DigitalHumanProvider', () => ({
  useDigitalHuman: () => ({
    isSpeaking: false,
    speak: mockSpeak,
    stop: mockStop,
    setEmotion: mockSetEmotion,
  }),
}));

const mockAddMessage = vi.fn();
const mockUpdateMessage = vi.fn();
const mockUpdateMessageStatus = vi.fn();
const mockSetStreaming = vi.fn();
const mockSetCurrentSession = vi.fn();
const mockGetHistory = vi.fn(() => []);

const chatStoreState = {
  messages: [] as unknown[],
  currentSessionId: null as string | null,
  isStreaming: false,
  addMessage: mockAddMessage,
  updateMessage: mockUpdateMessage,
  updateMessageStatus: mockUpdateMessageStatus,
  setStreaming: mockSetStreaming,
  setCurrentSession: mockSetCurrentSession,
  getHistory: mockGetHistory,
};

vi.mock('../stores/chatStore', () => ({
  useChatStore: Object.assign(
    () => chatStoreState,
    { getState: () => chatStoreState }
  ),
}));

const mockSseConnect = vi.fn();
const mockSseDisconnect = vi.fn();
vi.mock('../hooks/useSSE', () => ({
  useSSE: () => ({
    connect: mockSseConnect,
    disconnect: mockSseDisconnect,
    isConnected: false,
    error: null,
  }),
}));

vi.mock('../components/common/AMapView', () => ({
  default: ({ markers, pathOrder, activeMarkerId, onMarkerClick }: any) => (
    <div
      data-testid="amap-view"
      data-marker-count={markers.length}
      data-path-order={pathOrder ? pathOrder.join(',') : ''}
      data-active-marker={activeMarkerId || ''}
    >
      {markers.map((m: any) => (
        <button
          key={m.id}
          data-testid={`map-marker-${m.id}`}
          onClick={() => onMarkerClick?.(m.id)}
        >
          {m.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../components/Galgame/GuideBubble', () => ({
  default: ({ text }: any) => <div data-testid="guide-bubble">{text}</div>,
}));

vi.mock('../components/Galgame/GalgameDialog', () => ({
  default: ({ text, choices, showChoices, inputValue, onInputChange, onSend }: any) => (
    <div data-testid="galgame-dialog">
      <span data-testid="dialog-text">{text}</span>
      {showChoices &&
        choices?.map((c: any) => (
          <button key={c.id} data-testid={`choice-${c.id}`} onClick={c.onClick}>
            {c.text}
          </button>
        ))}
      <input
        data-testid="chat-input"
        value={inputValue || ''}
        onChange={(e) => onInputChange?.(e.target.value)}
      />
      <button data-testid="chat-send" onClick={onSend}>
        发送
      </button>
    </div>
  ),
}));

vi.mock('../components/Galgame/MiniRouteTimeline', () => ({
  default: ({ route, currentSpotIndex, onSpotClick, onClose }: any) => (
    <div data-testid="mini-timeline" data-route-id={route.id}>
      <span data-testid="timeline-progress">
        {currentSpotIndex + 1}/{route.spots.length}
      </span>
      {route.spots.map((s: any, i: number) => (
        <button
          key={s.id}
          data-testid={`timeline-spot-${s.id}`}
          onClick={() => onSpotClick?.(i)}
        >
          {s.name}
        </button>
      ))}
      <button data-testid="timeline-close" onClick={onClose}>
        关闭
      </button>
    </div>
  ),
}));

import RecommendPage from '../pages/tourist/RecommendPage';

function makeSpot(id: string, name: string, lng: number, lat: number): Spot {
  return {
    id,
    name,
    category: 'temple',
    tags: null,
    overview: `${name} 简介`,
    qr_code: null,
    thumbnail: null,
    duration: '30分钟',
    display_x: 50,
    display_y: 50,
    latitude: lat,
    longitude: lng,
    qa_json: null,
    story_acts: null,
  };
}

function makeRoute(id: string, name: string, spotOrder: string[], routeType = 'culture'): TourRoute {
  return {
    id,
    name,
    route_type: routeType,
    duration: '3小时',
    description: `${name} 描述`,
    gradient: null,
    cover_image: null,
    color: '#2A2520',
    brush_image: null,
    opening_text: `欢迎来到${name}`,
    closing_text: `${name}结束`,
    spot_order: spotOrder,
    spot_details: null,
    is_active: true,
  };
}

const FIXTURE_SPOTS: Spot[] = [
  makeSpot('da-fo', '灵山大佛', 120.1015, 31.4738),
  makeSpot('fan-gong', '灵山梵宫', 120.1025, 31.4748),
  makeSpot('jiu-long', '九龙灌浴', 120.1035, 31.4758),
];

const FIXTURE_ROUTES: TourRoute[] = [
  makeRoute('r1', '文化深度游', ['da-fo', 'fan-gong', 'jiu-long'], 'culture'),
  makeRoute('r2', '亲子欢乐游', ['jiu-long', 'da-fo'], 'family'),
  makeRoute('r3', '自然风光游', ['fan-gong', 'da-fo'], 'nature'),
];

async function renderAndWaitForLoad() {
  const result = render(<RecommendPage />);
  await waitFor(() => {
    expect(screen.getByTestId('amap-view')).toBeDefined();
  });
  return result;
}

describe('RecommendPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSpots.mockResolvedValue(FIXTURE_SPOTS);
    mockListRoutes.mockResolvedValue(FIXTURE_ROUTES);
    chatStoreState.messages = [];
    chatStoreState.currentSessionId = null;
    chatStoreState.isStreaming = false;
  });

  describe('加载状态', () => {
    it('加载期间显示占位文本', () => {
      mockListSpots.mockReturnValue(new Promise(() => {}));
      mockListRoutes.mockReturnValue(new Promise(() => {}));
      render(<RecommendPage />);
      expect(screen.getByText(/小景正在准备路线/)).toBeDefined();
    });

    it('数据加载完成后渲染主容器', async () => {
      await renderAndWaitForLoad();
      expect(screen.getByTestId('recommend-page')).toBeDefined();
    });
  });

  describe('list 态 — 地图主舞台', () => {
    it('展示所有有坐标的景点 marker', async () => {
      await renderAndWaitForLoad();
      const map = screen.getByTestId('amap-view');
      expect(map.dataset.markerCount).toBe('3');
    });

    it('list 态不渲染迷你时间线', async () => {
      await renderAndWaitForLoad();
      expect(screen.queryByTestId('mini-timeline')).toBeNull();
    });

    it('list 态不传 pathOrder（无连线）', async () => {
      await renderAndWaitForLoad();
      const map = screen.getByTestId('amap-view');
      expect(map.dataset.pathOrder).toBe('');
    });

    it('对话框列出所有路线作为选项', async () => {
      await renderAndWaitForLoad();
      await waitFor(() => {
        expect(screen.getByTestId('choice-r1')).toBeDefined();
        expect(screen.getByTestId('choice-r2')).toBeDefined();
        expect(screen.getByTestId('choice-r3')).toBeDefined();
      });
      expect(screen.getByTestId('choice-r1').textContent).toContain('文化深度游');
    });

    it('默认按人文历史偏好首推文化路线', async () => {
      const result = await renderAndWaitForLoad();

      await waitFor(() => {
        expect(screen.getByTestId('route-recommendation-summary').textContent).toContain('文化深度游');
      });
      const choices = Array.from(result.container.querySelectorAll('[data-testid^="choice-"]'));
      expect(choices[0].getAttribute('data-testid')).toBe('choice-r1');
      expect(screen.getByTestId('preference-culture').getAttribute('aria-pressed')).toBe('true');
    });

    it('切换亲子休闲偏好后首推亲子路线', async () => {
      const result = await renderAndWaitForLoad();

      fireEvent.click(screen.getByTestId('preference-family'));

      await waitFor(() => {
        expect(screen.getByTestId('route-recommendation-summary').textContent).toContain('亲子欢乐游');
      });
      const choices = Array.from(result.container.querySelectorAll('[data-testid^="choice-"]'));
      expect(choices[0].getAttribute('data-testid')).toBe('choice-r2');
      expect(screen.getByTestId('preference-family').getAttribute('aria-pressed')).toBe('true');
    });

    it('切换自然风光偏好后首推自然路线', async () => {
      const result = await renderAndWaitForLoad();

      fireEvent.click(screen.getByTestId('preference-nature'));

      await waitFor(() => {
        expect(screen.getByTestId('route-recommendation-summary').textContent).toContain('自然风光游');
      });
      const choices = Array.from(result.container.querySelectorAll('[data-testid^="choice-"]'));
      expect(choices[0].getAttribute('data-testid')).toBe('choice-r3');
    });
  });

  describe('overview 态 — 选中路线', () => {
    it('点击路线选项切到 overview，展示时间线', async () => {
      await renderAndWaitForLoad();
      await waitFor(() => expect(screen.getByTestId('choice-r1')).toBeDefined());

      fireEvent.click(screen.getByTestId('choice-r1'));

      await waitFor(() => {
        expect(screen.getByTestId('mini-timeline')).toBeDefined();
      });
      expect(screen.getByTestId('mini-timeline').dataset.routeId).toBe('r1');
      expect(screen.getByTestId('timeline-progress').textContent).toBe('1/3');
    });

    it('overview 态地图只显示该路线上的景点，并传递 pathOrder', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));

      await waitFor(() => {
        const map = screen.getByTestId('amap-view');
        expect(map.dataset.markerCount).toBe('3');
        expect(map.dataset.pathOrder).toBe('da-fo,fan-gong,jiu-long');
      });
    });

    it('overview 态没有 activeMarkerId（不高亮单点）', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));

      await waitFor(() => {
        const map = screen.getByTestId('amap-view');
        expect(map.dataset.activeMarker).toBe('');
      });
    });

    it('overview 态展示「开始游览」「返回路线列表」选项', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));

      await waitFor(() => {
        expect(screen.getByTestId('choice-start')).toBeDefined();
        expect(screen.getByTestId('choice-back')).toBeDefined();
      });
    });

    it('点击「返回路线列表」回到 list 态', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('mini-timeline')).toBeDefined());

      fireEvent.click(screen.getByTestId('choice-back'));

      await waitFor(() => {
        expect(screen.queryByTestId('mini-timeline')).toBeNull();
      });
    });
  });

  describe('tour 态 — 景点游览', () => {
    it('点击「开始游览」进入 tour，高亮当前 marker', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());

      fireEvent.click(screen.getByTestId('choice-start'));

      await waitFor(() => {
        const map = screen.getByTestId('amap-view');
        expect(map.dataset.activeMarker).toBe('da-fo');
      });
    });

    it('tour 态展示「下一站」「路线概览」，首站无「上一站」', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));

      await waitFor(() => {
        expect(screen.getByTestId('choice-next')).toBeDefined();
        expect(screen.getByTestId('choice-overview')).toBeDefined();
        expect(screen.queryByTestId('choice-prev')).toBeNull();
      });
    });

    it('点击「下一站」前进到下一景点', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));
      await waitFor(() => expect(screen.getByTestId('choice-next')).toBeDefined());

      fireEvent.click(screen.getByTestId('choice-next'));

      await waitFor(() => {
        expect(screen.getByTestId('amap-view').dataset.activeMarker).toBe('fan-gong');
        expect(screen.getByTestId('timeline-progress').textContent).toBe('2/3');
      });
    });

    it('末站隐藏「下一站」', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));
      await waitFor(() => expect(screen.getByTestId('choice-next')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-next'));
      await waitFor(() => expect(screen.getByTestId('timeline-progress').textContent).toBe('2/3'));
      fireEvent.click(screen.getByTestId('choice-next'));

      await waitFor(() => {
        expect(screen.getByTestId('timeline-progress').textContent).toBe('3/3');
        expect(screen.queryByTestId('choice-next')).toBeNull();
        expect(screen.getByTestId('choice-prev')).toBeDefined();
      });
    });

    it('点击「路线概览」回到 overview 态', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));
      await waitFor(() => expect(screen.getByTestId('choice-overview')).toBeDefined());

      fireEvent.click(screen.getByTestId('choice-overview'));

      await waitFor(() => {
        expect(screen.getByTestId('choice-start')).toBeDefined();
        expect(screen.getByTestId('amap-view').dataset.activeMarker).toBe('');
      });
    });

    it('点击迷你时间线上的景点直接跳转', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));
      await waitFor(() => expect(screen.getByTestId('timeline-spot-jiu-long')).toBeDefined());

      fireEvent.click(screen.getByTestId('timeline-spot-jiu-long'));

      await waitFor(() => {
        expect(screen.getByTestId('amap-view').dataset.activeMarker).toBe('jiu-long');
        expect(screen.getByTestId('timeline-progress').textContent).toBe('3/3');
      });
    });

    it('时间线关闭按钮回到 list 态', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));
      await waitFor(() => expect(screen.getByTestId('timeline-close')).toBeDefined());

      fireEvent.click(screen.getByTestId('timeline-close'));

      await waitFor(() => {
        expect(screen.queryByTestId('mini-timeline')).toBeNull();
      });
    });
  });

  describe('地图 marker 交互', () => {
    it('list 态点击 marker 进入对应路线的 overview', async () => {
      await renderAndWaitForLoad();

      fireEvent.click(screen.getByTestId('map-marker-fan-gong'));

      await waitFor(() => {
        expect(screen.getByTestId('mini-timeline')).toBeDefined();
        expect(screen.getByTestId('mini-timeline').dataset.routeId).toBe('r1');
      });
    });

    it('tour 态点击其他 marker 切换当前景点', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('choice-r1'));
      await waitFor(() => expect(screen.getByTestId('choice-start')).toBeDefined());
      fireEvent.click(screen.getByTestId('choice-start'));
      await waitFor(() => expect(screen.getByTestId('amap-view').dataset.activeMarker).toBe('da-fo'));

      fireEvent.click(screen.getByTestId('map-marker-jiu-long'));

      await waitFor(() => {
        expect(screen.getByTestId('amap-view').dataset.activeMarker).toBe('jiu-long');
      });
    });
  });

  describe('内联问答 SSE', () => {
    it('输入并发送会调用 connect 并 addMessage 两次（user + assistant）', async () => {
      await renderAndWaitForLoad();
      const input = screen.getByTestId('chat-input') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '灵山大佛多高？' } });
      fireEvent.click(screen.getByTestId('chat-send'));

      await waitFor(() => {
        expect(mockSseConnect).toHaveBeenCalledTimes(1);
      });
      expect(mockAddMessage).toHaveBeenCalledTimes(2);
      const [userMsg, assistantMsg] = mockAddMessage.mock.calls;
      expect(userMsg[0].role).toBe('user');
      expect(userMsg[0].content).toBe('灵山大佛多高？');
      expect(assistantMsg[0].role).toBe('assistant');
      expect(assistantMsg[0].content).toBe('');
    });

    it('空输入不会触发 SSE', async () => {
      await renderAndWaitForLoad();
      fireEvent.click(screen.getByTestId('chat-send'));
      // give microtask queue a tick
      await act(async () => {});
      expect(mockSseConnect).not.toHaveBeenCalled();
    });
  });

  describe('景点坐标过滤', () => {
    it('缺少经纬度的景点不会出现在 marker 列表', async () => {
      const spotWithoutCoords = makeSpot('no-coord', '无坐标景点', 0, 0);
      spotWithoutCoords.longitude = null;
      spotWithoutCoords.latitude = null;
      mockListSpots.mockResolvedValue([...FIXTURE_SPOTS, spotWithoutCoords]);

      await renderAndWaitForLoad();
      expect(screen.queryByTestId('map-marker-no-coord')).toBeNull();
      expect(screen.getByTestId('amap-view').dataset.markerCount).toBe('3');
    });
  });
});
