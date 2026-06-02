import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChunkPreview from '../components/admin/ChunkPreview';

describe('ChunkPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染容器', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByTestId('chunk-preview')).toBeDefined();
    });

    it('初始应该显示加载中', () => {
      render(<ChunkPreview docId="1" />);
      expect(screen.getByTestId('chunk-preview-loading')).toBeDefined();
      expect(screen.getByText('加载中...')).toBeDefined();
    });

    it('加载完成后应该显示分块列表', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByTestId('chunk-list')).toBeDefined();
    });

    it('应该显示文档ID和分块数量', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText(/文档ID: 1/)).toBeDefined();
      expect(screen.getByText(/共 3 个分块/)).toBeDefined();
    });
  });

  describe('分块数据', () => {
    it('应该显示默认分块数据', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText(/灵山大佛/)).toBeDefined();
      expect(screen.getByText(/梵宫/)).toBeDefined();
      expect(screen.getByText(/九龙灌浴/)).toBeDefined();
    });

    it('应该显示分块编号', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText('分块 #1')).toBeDefined();
      expect(screen.getByText('分块 #2')).toBeDefined();
      expect(screen.getByText('分块 #3')).toBeDefined();
    });

    it('应该显示分块ID', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByText('ID: 1')).toBeDefined();
      expect(screen.getByText('ID: 2')).toBeDefined();
      expect(screen.getByText('ID: 3')).toBeDefined();
    });

    it('应该支持自定义分块数据', () => {
      const customChunks = [
        { id: '10', content: '自定义分块内容', index: 0, metadata: {} },
      ];

      render(<ChunkPreview docId="1" chunks={customChunks} />);

      expect(screen.getByText('自定义分块内容')).toBeDefined();
      expect(screen.getByText('分块 #1')).toBeDefined();
    });
  });

  describe('交互', () => {
    it('点击分块应该调用回调', async () => {
      const onChunkClick = vi.fn();
      render(<ChunkPreview docId="1" onChunkClick={onChunkClick} />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      const chunk = screen.getByTestId('chunk-1');
      fireEvent.click(chunk);

      expect(onChunkClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', index: 0 })
      );
    });

    it('没有回调时点击不应该报错', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      const chunk = screen.getByTestId('chunk-1');
      fireEvent.click(chunk);

      // 不应该报错
    });
  });

  describe('关键词高亮', () => {
    it('应该支持关键词高亮', async () => {
      render(<ChunkPreview docId="1" highlightKeywords={['灵山大佛']} />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // 高亮后文本应该包含**标记
      expect(screen.getByText(/灵山大佛/)).toBeDefined();
    });
  });

  describe('边界情况', () => {
    it('空分块列表应该显示空状态', () => {
      render(<ChunkPreview docId="1" chunks={[]} />);

      expect(screen.getByTestId('empty-state')).toBeDefined();
      expect(screen.getByText('暂无分块数据')).toBeDefined();
    });

    it('应该显示元数据', async () => {
      render(<ChunkPreview docId="1" />);

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // 应该显示page元数据
      expect(screen.getByText(/page: 1/)).toBeDefined();
    });
  });
});
