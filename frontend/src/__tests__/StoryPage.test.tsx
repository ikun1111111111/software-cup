import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import type { StoryResult } from '../api/story';

Element.prototype.scrollIntoView = vi.fn();

const mockSpeak = vi.fn();
const mockStop = vi.fn();
const mockSetEmotion = vi.fn();

vi.mock('../components/tourist/DigitalHumanProvider', () => ({
  useDigitalHuman: () => ({
    speak: mockSpeak,
    stop: mockStop,
    setEmotion: mockSetEmotion,
  }),
}));

const mockGetStory = vi.fn();
vi.mock('../api/story', () => ({
  getStory: (...args: unknown[]) => mockGetStory(...args),
}));

const mockListSpots = vi.fn();
vi.mock('../api/spots', () => ({
  listSpots: (...args: unknown[]) => mockListSpots(...args),
}));

vi.mock('../components/Galgame/GalgameDialog', () => ({
  default: ({ text, choices, showChoices }: any) => (
    <div data-testid="dialog">
      <span>{text}</span>
      {showChoices && choices?.map((c: any) => (
        <button key={c.id} data-testid={`choice-${c.id}`} onClick={c.onClick}>{c.text}</button>
      ))}
    </div>
  ),
}));

vi.mock('../components/Story/ActBackground', () => ({
  default: ({ emotion }: any) => <div data-testid="act-bg" data-emotion={emotion} />,
}));

vi.mock('../components/Story/ActSeal', () => ({
  default: ({ emotion, actKey }: any) => <div data-testid="act-seal" data-emotion={emotion} data-key={actKey} />,
}));

vi.mock('../components/Story/ActControlBar', () => ({
  default: ({ acts, currentIndex, onPrev, onNext, onReplay, onExit }: any) => (
    <div data-testid="act-control">
      <span data-testid="act-index">{currentIndex + 1}/{acts.length}</span>
      <button data-testid="btn-replay" onClick={onReplay}>replay</button>
      <button data-testid="btn-prev" onClick={onPrev} disabled={currentIndex <= 0}>prev</button>
      <button data-testid="btn-next" onClick={onNext}>next</button>
      <button data-testid="btn-exit" onClick={onExit}>exit</button>
    </div>
  ),
}));

vi.mock('../components/Story/StorySpotGrid', () => ({
  default: ({ spots, onSelect }: any) => (
    <div data-testid="spot-grid">
      {spots.map((s: any) => (
        <button key={s.id} data-testid={`spot-card-${s.id}`} onClick={() => onSelect(s.id)}>
          {s.name}
        </button>
      ))}
    </div>
  ),
}));

import StoryPage from '../pages/tourist/StoryPage';

const STORY_SPOT_IDS = [
  'ling-shan-da-fo',
  'jiu-long-guan-yu',
  'fan-gong',
  'xiang-fu-chan-si',
  'wu-yin-tan-cheng',
  'fo-shou-guang-chang',
];

function makeStory(spotId: string): StoryResult {
  return {
    spot_id: spotId,
    spot_name: spotId,
    description: '',
    acts: [
      { id: 'a1', title: '第一幕', narration: 'n1', emotion: 'think' },
      { id: 'a2', title: '第二幕', narration: 'n2', emotion: 'surprise' },
      { id: 'a3', title: '第三幕', narration: 'n3', emotion: 'smile' },
      { id: 'a4', title: '第四幕', narration: 'n4', emotion: 'neutral' },
    ],
  };
}

function makeSpot(id: string) {
  return {
    id,
    name: id,
    category: 'story',
    tags: null,
    overview: '',
    qr_code: null,
    thumbnail: null,
    duration: null,
    display_x: null,
    display_y: null,
    latitude: null,
    longitude: null,
    qa_json: null,
    story_acts: [
      { id: 'a1', title: 'act', emotion: 'think', prompt_hint: '', act_image: '' },
    ],
  };
}

async function waitForStoryCards() {
  await waitFor(() => {
    expect(screen.getByTestId('spot-card-ling-shan-da-fo')).toBeDefined();
  });
}

describe('StoryPage', () => {
  beforeEach(() => {
    mockSpeak.mockReset();
    mockStop.mockReset();
    mockSetEmotion.mockReset();
    mockGetStory.mockReset();
    mockListSpots.mockReset();
    mockGetStory.mockImplementation(async (spotId: string) => makeStory(spotId));
    mockListSpots.mockResolvedValue(STORY_SPOT_IDS.map(makeSpot));
  });

  describe('景点选择页 (idle)', () => {
    it('渲染全部 6 个景点选项', async () => {
      render(<StoryPage />);
      await waitForStoryCards();
      for (const id of STORY_SPOT_IDS) {
        expect(screen.getByTestId(`spot-card-${id}`)).toBeDefined();
      }
    });

    it('渲染标题装饰图', async () => {
      render(<StoryPage />);
      await waitForStoryCards();
      const img = screen.getByAltText('') as HTMLImageElement;
      expect(img.src).toContain('/image/story/title-decor.png');
    });

    it('点击景点调用 getStory 并进入播放态', async () => {
      render(<StoryPage />);
      await waitForStoryCards();
      fireEvent.click(screen.getByTestId('spot-card-ling-shan-da-fo'));

      await waitFor(() => {
        expect(screen.getByTestId('act-control')).toBeDefined();
      }, { timeout: 3000 });
      expect(mockGetStory).toHaveBeenCalledWith('ling-shan-da-fo', { timeoutMs: 10000 });
      expect(screen.getByTestId('act-index').textContent).toBe('1/4');
    });

    it('getStory 失败时进入 error 态', async () => {
      mockGetStory.mockRejectedValueOnce(new Error('net'));
      render(<StoryPage />);
      await waitForStoryCards();
      fireEvent.click(screen.getByTestId('spot-card-fan-gong'));

      await waitFor(() => {
        expect(screen.getByText(/这一卷故事暂未启封/)).toBeDefined();
      }, { timeout: 3000 });
    });

    it('getStory 返回空 acts 时进入 error 态', async () => {
      mockGetStory.mockResolvedValueOnce({
        spot_id: 'x', spot_name: 'x', description: '', acts: [],
      } as StoryResult);
      render(<StoryPage />);
      await waitForStoryCards();
      fireEvent.click(screen.getByTestId('spot-card-fan-gong'));

      await waitFor(() => {
        expect(screen.getByText(/暂无该景点的故事内容/)).toBeDefined();
      }, { timeout: 3000 });
    });
  });

  describe('分幕播放 (playing)', () => {
    async function startPlaying() {
      render(<StoryPage />);
      await waitForStoryCards();
      fireEvent.click(screen.getByTestId('spot-card-ling-shan-da-fo'));
      await waitFor(() => expect(screen.getByTestId('act-control')).toBeDefined(), { timeout: 3000 });
    }

    it('首幕设置 emotion 为 think 并开始 speak', async () => {
      await startPlaying();
      expect(mockSetEmotion).toHaveBeenCalledWith('think');
      expect(mockSpeak).toHaveBeenCalledWith(
        'n1',
        expect.objectContaining({ emotion: 'think' }),
      );
    });

    it('挂载 ActSeal 并传入 emotion', async () => {
      await startPlaying();
      const seal = screen.getByTestId('act-seal');
      expect(seal.getAttribute('data-emotion')).toBe('think');
    });

    it('点击 next 推进到第二幕', async () => {
      await startPlaying();
      fireEvent.click(screen.getByTestId('btn-next'));
      expect(screen.getByTestId('act-index').textContent).toBe('2/4');
      expect(mockSetEmotion).toHaveBeenCalledWith('surprise');
    });

    it('首幕 prev 禁用', async () => {
      await startPlaying();
      expect((screen.getByTestId('btn-prev') as HTMLButtonElement).disabled).toBe(true);
    });

    it('replay 重新触发 speak 且不推进幕号', async () => {
      await startPlaying();
      mockSpeak.mockClear();
      fireEvent.click(screen.getByTestId('btn-replay'));
      expect(screen.getByTestId('act-index').textContent).toBe('1/4');
      expect(mockSpeak).toHaveBeenCalled();
    });

    it('exit 返回景点选择页', async () => {
      await startPlaying();
      fireEvent.click(screen.getByTestId('btn-exit'));
      await waitForStoryCards();
      for (const id of STORY_SPOT_IDS) {
        expect(screen.getByTestId(`spot-card-${id}`)).toBeDefined();
      }
    });

    it('推进到末幕后 next 不越界', async () => {
      await startPlaying();
      fireEvent.click(screen.getByTestId('btn-next'));
      fireEvent.click(screen.getByTestId('btn-next'));
      fireEvent.click(screen.getByTestId('btn-next'));
      expect(screen.getByTestId('act-index').textContent).toBe('4/4');
      fireEvent.click(screen.getByTestId('btn-next'));
      expect(screen.getByTestId('act-index').textContent).toBe('4/4');
    });
  });
});
