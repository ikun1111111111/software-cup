import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AvatarPage from '../pages/admin/AvatarPage';

// Mock VRMPreview to avoid loading Three.js/WebGL in jsdom
vi.mock('../components/admin/VRMPreview', () => ({
  VRMPreview: () => <div data-testid="vrm-preview-mock">VRM Preview</div>,
}));

// Mock avatar API so save/load complete deterministically in jsdom
vi.mock('../api/avatar', () => ({
  getActiveAvatar: vi.fn(() => Promise.reject(new Error('no active'))),
  getAvatars: vi.fn(() =>
    Promise.resolve({
      total: 1,
      page: 1,
      pageSize: 1,
      data: [
        {
          id: '1',
          name: '默认数字人',
          description: null,
          modelPath: '/models/488366049787804013.vrm',
          appearanceJson: {
            costumeMode: 'auto',
            costumeId: 'daily-artistic',
          },
          voiceId: 'mandarin',
          emotionPresets: null,
          welcomeMessage: '你好！欢迎来到灵山景区，我是你的数字人导游，有什么可以帮你的吗？',
          isActive: true,
          createdAt: null,
          updatedAt: null,
        },
      ],
    }),
  ),
  createAvatar: vi.fn((payload) =>
    Promise.resolve({
      id: '1',
      ...payload,
      description: null,
      emotionPresets: null,
      isActive: true,
      createdAt: null,
      updatedAt: null,
    }),
  ),
  updateAvatar: vi.fn((id, payload) =>
    Promise.resolve({
      id,
      ...payload,
      description: null,
      emotionPresets: null,
      isActive: true,
      createdAt: null,
      updatedAt: null,
    }),
  ),
  activateAvatar: vi.fn(() => Promise.resolve({ status: 'ok', avatarId: 1 })),
}));

let pageAudioInstances: PageAudioMock[] = [];

class PageAudioMock {
  src: string;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  load = vi.fn();
  currentTime = 0;
  preload = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src = '') {
    this.src = src;
    pageAudioInstances.push(this);
  }
}

describe('AvatarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageAudioInstances = [];
    vi.stubGlobal('Audio', PageAudioMock);
  });

  describe('渲染', () => {
    it('应该渲染页面容器', async () => {
      render(<AvatarPage />);
      expect(screen.getByTestId('avatar-page')).toBeDefined();
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());
    });

    it('应该显示标题', async () => {
      render(<AvatarPage />);
      expect(screen.getByText('数字人形象配置')).toBeDefined();
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());
    });

    it('应该显示保存按钮', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());
      expect(screen.getByText('保存配置')).toBeDefined();
    });

    it('应该显示预览区域', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('preview-area')).toBeDefined());
    });

    it('应该显示外观配置', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('appearance-section')).toBeDefined());
    });

    it('应该显示声音选择', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('voice-section')).toBeDefined());
      expect(screen.getByTestId('voice-mandarin')).toBeDefined();
    });

    it('shows a distinct description for every voice option', async () => {
      render(<AvatarPage />);

      expect(await screen.findByText('温柔清晰 · 稳重 · 标准普通话')).toBeDefined();
      expect(screen.getByText('青春明亮 · 轻快 · 更有活力')).toBeDefined();
      expect(screen.getByText('亲切爽朗 · 地域感 · 更有记忆点')).toBeDefined();
    });

    it('preloads all three static previews when the page mounts', async () => {
      render(<AvatarPage />);

      await waitFor(() => {
        const preloadedUrls = pageAudioInstances
          .filter((audio) => audio.load.mock.calls.length > 0)
          .map((audio) => audio.src);
        expect(preloadedUrls).toEqual([
          '/audio/voice-previews/mandarin.mp3',
          '/audio/voice-previews/female.mp3',
          '/audio/voice-previews/liaoning.mp3',
        ]);
      });
    });

    it('plays the selected static preview without changing voice selection', async () => {
      render(<AvatarPage />);
      const femaleCard = await screen.findByTestId('voice-female');
      const previewButton = screen.getByTestId('voice-preview-female');

      fireEvent.click(previewButton);

      const playedAudio = await waitFor(() => {
        const audio = pageAudioInstances.find((instance) => instance.play.mock.calls.length > 0);
        expect(audio).toBeDefined();
        return audio;
      });
      expect(playedAudio?.src).toContain('/audio/voice-previews/female.mp3');
      expect(femaleCard.getAttribute('data-selected')).toBe('false');
    });

    it('shows a playing label while a preview is active', async () => {
      render(<AvatarPage />);
      fireEvent.click(await screen.findByTestId('voice-preview-mandarin'));

      expect(await screen.findByText('播放中')).toBeDefined();
    });

    it('应该显示实时预览标题', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('preview-area')).toBeDefined());
      expect(screen.getByText('实时预览')).toBeDefined();
    });

    it('应该渲染数字人预览组件', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('vrm-preview-mock')).toBeDefined());
    });
  });

  describe('保存功能', () => {
    it('点击保存应该显示保存中', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());

      const saveBtns = screen.getAllByText('保存配置');
      fireEvent.click(saveBtns[0]);

      await waitFor(() => expect(screen.getByText('保存中...')).toBeDefined());
    });

    it('保存按钮应该禁用', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());

      const saveBtns = screen.getAllByTestId('save-btn');
      fireEvent.click(saveBtns[0]);

      await waitFor(() => expect(saveBtns[0]).toBeDisabled());
    });

    it('保存后应该显示已保存', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());

      const saveBtns = screen.getAllByText('保存配置');
      fireEvent.click(saveBtns[0]);

      await waitFor(() => expect(screen.getByTestId('saved-msg')).toBeDefined());
      expect(screen.getByText('已保存')).toBeDefined();
    });

    it('保存后应该恢复按钮', async () => {
      render(<AvatarPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).not.toBeDisabled());

      const saveBtns = screen.getAllByText('保存配置');
      fireEvent.click(saveBtns[0]);

      await waitFor(() => expect(screen.getByTestId('saved-msg')).toBeDefined());
      expect(screen.getByText('保存配置')).toBeDefined();
    });
  });
});
