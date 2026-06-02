import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import KnowledgePage from '../pages/admin/KnowledgePage';

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      font: '',
      textAlign: '',
    })) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('knowledge-page')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<KnowledgePage />);
      expect(screen.getByText('知识库管理')).toBeDefined();
    });

    it('应该渲染标签栏', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('tab-bar')).toBeDefined();
    });

    it('应该显示文档管理标签', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('tab-documents')).toBeDefined();
    });

    it('应该显示FAQ管理标签', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('tab-faq')).toBeDefined();
    });
  });

  describe('标签切换', () => {
    it('默认应该显示文档管理', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('documents-panel')).toBeDefined();
    });

    it('点击FAQ标签应该切换到FAQ面板', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));

      expect(screen.getByTestId('faq-panel')).toBeDefined();
      expect(screen.queryByTestId('documents-panel')).toBeNull();
    });

    it('点击文档标签应该切换到文档面板', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('tab-documents'));

      expect(screen.getByTestId('documents-panel')).toBeDefined();
      expect(screen.queryByTestId('faq-panel')).toBeNull();
    });
  });

  describe('文档管理', () => {
    it('应该显示文档列表', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('doc-list')).toBeDefined();
    });

    it('应该显示默认文档', () => {
      render(<KnowledgePage />);
      expect(screen.getByText('灵山景区介绍.pdf')).toBeDefined();
      expect(screen.getByText('交通指南.docx')).toBeDefined();
      expect(screen.getByText('美食推荐.pdf')).toBeDefined();
    });

    it('应该显示文档状态', () => {
      render(<KnowledgePage />);
      const readyStatuses = screen.getAllByText('就绪');
      expect(readyStatuses.length).toBe(2);
      expect(screen.getByText('处理中')).toBeDefined();
    });

    it('应该显示上传按钮', () => {
      render(<KnowledgePage />);
      expect(screen.getByTestId('upload-btn')).toBeDefined();
    });

    it('点击上传按钮应该显示上传区域', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('upload-btn'));

      expect(screen.getByTestId('upload-area')).toBeDefined();
    });

    it('再次点击上传按钮应该隐藏上传区域', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('upload-btn'));
      fireEvent.click(screen.getByTestId('upload-btn'));

      expect(screen.queryByTestId('upload-area')).toBeNull();
    });

    it('点击文档应该选中', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('doc-1'));

      expect(screen.getByTestId('chunk-preview-area')).toBeDefined();
      const matches = screen.getAllByText(/灵山景区介绍.pdf/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('应该显示分块预览', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('doc-1'));

      expect(screen.getByText(/分块预览/)).toBeDefined();
    });
  });

  describe('FAQ管理', () => {
    it('应该显示FAQ列表', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));

      expect(screen.getByTestId('faq-list')).toBeDefined();
    });

    it('应该显示默认FAQ', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));

      expect(screen.getByText('灵山大佛有多高？')).toBeDefined();
      expect(screen.getByText('景区开放时间是什么？')).toBeDefined();
    });

    it('应该显示FAQ数量', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));

      expect(screen.getByText(/FAQ列表 \(2\)/)).toBeDefined();
    });

    it('应该显示新建FAQ按钮', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));

      expect(screen.getByTestId('add-faq-btn')).toBeDefined();
    });

    it('点击新建FAQ应该显示编辑器', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('add-faq-btn'));

      expect(screen.getByTestId('faq-editor-area')).toBeDefined();
    });

    it('点击FAQ应该进入编辑模式', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('faq-1'));

      expect(screen.getByTestId('faq-editor-area')).toBeDefined();
      expect(screen.getByText('编辑FAQ')).toBeDefined();
    });

    it('编辑模式应该加载FAQ数据', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('faq-1'));

      const questionInput = screen.getByTestId('question-input') as HTMLInputElement;
      expect(questionInput.value).toBe('灵山大佛有多高？');
    });
  });

  describe('FAQ保存', () => {
    it('新建FAQ后列表应该更新', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('add-faq-btn'));

      const questionInput = screen.getByTestId('question-input');
      const answerInput = screen.getByTestId('answer-input');
      const saveBtn = screen.getByTestId('save-btn');

      fireEvent.change(questionInput, { target: { value: '新问题' } });
      fireEvent.change(answerInput, { target: { value: '新答案' } });
      fireEvent.click(saveBtn);

      expect(screen.getByText('新问题')).toBeDefined();
      expect(screen.getByText(/FAQ列表 \(3\)/)).toBeDefined();
    });

    it('编辑FAQ后应该更新', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('faq-1'));

      const questionInput = screen.getByTestId('question-input');
      const saveBtn = screen.getByTestId('save-btn');

      fireEvent.change(questionInput, { target: { value: '修改后的问题' } });
      fireEvent.click(saveBtn);

      expect(screen.getByText('修改后的问题')).toBeDefined();
    });

    it('删除FAQ后列表应该更新', () => {
      render(<KnowledgePage />);

      fireEvent.click(screen.getByTestId('tab-faq'));
      fireEvent.click(screen.getByTestId('faq-1'));

      const deleteBtn = screen.getByTestId('delete-btn');
      fireEvent.click(deleteBtn);

      expect(screen.queryByText('灵山大佛有多高？')).toBeNull();
      expect(screen.getByText(/FAQ列表 \(1\)/)).toBeDefined();
    });
  });
});
