import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FAQEditor from '../components/admin/FAQEditor';

describe('FAQEditor', () => {
  describe('渲染', () => {
    it('应该渲染编辑器容器', () => {
      render(<FAQEditor />);
      expect(screen.getByTestId('faq-editor')).toBeDefined();
    });

    it('新建时应该显示新建FAQ标题', () => {
      render(<FAQEditor />);
      expect(screen.getByText('新建FAQ')).toBeDefined();
    });

    it('编辑时应该显示编辑FAQ标题', () => {
      const faq = {
        id: '1',
        question: '测试问题',
        answer: '测试答案',
        keywords: ['测试'],
        category: '通用',
      };
      render(<FAQEditor faq={faq} />);
      expect(screen.getByText('编辑FAQ')).toBeDefined();
    });

    it('应该渲染问题输入框', () => {
      render(<FAQEditor />);
      expect(screen.getByTestId('question-input')).toBeDefined();
    });

    it('应该渲染答案输入框', () => {
      render(<FAQEditor />);
      expect(screen.getByTestId('answer-input')).toBeDefined();
    });

    it('应该渲染分类选择', () => {
      render(<FAQEditor />);
      expect(screen.getByTestId('category-select')).toBeDefined();
    });

    it('应该渲染关键词输入框', () => {
      render(<FAQEditor />);
      expect(screen.getByTestId('keyword-input')).toBeDefined();
    });

    it('应该渲染保存按钮', () => {
      render(<FAQEditor />);
      expect(screen.getByTestId('save-btn')).toBeDefined();
    });
  });

  describe('表单输入', () => {
    it('应该支持输入问题', () => {
      render(<FAQEditor />);
      const input = screen.getByTestId('question-input') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '测试问题' } });

      expect(input.value).toBe('测试问题');
    });

    it('应该支持输入答案', () => {
      render(<FAQEditor />);
      const input = screen.getByTestId('answer-input') as HTMLTextAreaElement;

      fireEvent.change(input, { target: { value: '测试答案' } });

      expect(input.value).toBe('测试答案');
    });

    it('应该支持选择分类', () => {
      render(<FAQEditor />);
      const select = screen.getByTestId('category-select') as HTMLSelectElement;

      fireEvent.change(select, { target: { value: '景点' } });

      expect(select.value).toBe('景点');
    });
  });

  describe('关键词管理', () => {
    it('点击添加按钮应该添加关键词', () => {
      render(<FAQEditor />);
      const input = screen.getByTestId('keyword-input') as HTMLInputElement;
      const addBtn = screen.getByTestId('add-keyword-btn');

      fireEvent.change(input, { target: { value: '测试关键词' } });
      fireEvent.click(addBtn);

      expect(screen.getByText('测试关键词')).toBeDefined();
    });

    it('按回车应该添加关键词', () => {
      render(<FAQEditor />);
      const input = screen.getByTestId('keyword-input') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '回车关键词' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('回车关键词')).toBeDefined();
    });

    it('点击删除应该移除关键词', () => {
      const faq = {
        question: '测试',
        answer: '测试',
        keywords: ['要删除的关键词'],
        category: '通用',
      };
      render(<FAQEditor faq={faq} />);

      const keyword = screen.getByTestId('keyword-要删除的关键词');
      const deleteBtn = keyword.querySelector('span:last-child');

      if (deleteBtn) {
        fireEvent.click(deleteBtn);
      }

      expect(screen.queryByText('要删除的关键词')).toBeNull();
    });

    it('不应该添加重复关键词', () => {
      render(<FAQEditor />);
      const input = screen.getByTestId('keyword-input') as HTMLInputElement;
      const addBtn = screen.getByTestId('add-keyword-btn');

      fireEvent.change(input, { target: { value: '重复' } });
      fireEvent.click(addBtn);
      fireEvent.change(input, { target: { value: '重复' } });
      fireEvent.click(addBtn);

      // 应该只有一个
      const keywords = screen.getAllByText('重复');
      expect(keywords.length).toBe(1);
    });

    it('不应该添加空关键词', () => {
      render(<FAQEditor />);
      const addBtn = screen.getByTestId('add-keyword-btn');

      fireEvent.click(addBtn);

      // 不应该添加空关键词
      expect(screen.getByTestId('keywords-list').children.length).toBe(0);
    });
  });

  describe('保存功能', () => {
    it('点击保存应该调用回调', () => {
      const onSave = vi.fn();
      render(<FAQEditor onSave={onSave} />);

      const questionInput = screen.getByTestId('question-input');
      const answerInput = screen.getByTestId('answer-input');
      const saveBtn = screen.getByTestId('save-btn');

      fireEvent.change(questionInput, { target: { value: '测试问题' } });
      fireEvent.change(answerInput, { target: { value: '测试答案' } });
      fireEvent.click(saveBtn);

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          question: '测试问题',
          answer: '测试答案',
        })
      );
    });

    it('空问题时保存按钮应该禁用', () => {
      render(<FAQEditor />);
      const saveBtn = screen.getByTestId('save-btn');

      expect(saveBtn).toBeDisabled();
    });

    it('有问题时保存按钮应该启用', () => {
      render(<FAQEditor />);
      const questionInput = screen.getByTestId('question-input');
      const saveBtn = screen.getByTestId('save-btn');

      fireEvent.change(questionInput, { target: { value: '测试' } });

      expect(saveBtn).not.toBeDisabled();
    });
  });

  describe('删除功能', () => {
    it('编辑模式应该显示删除按钮', () => {
      const faq = {
        id: '1',
        question: '测试',
        answer: '测试',
        keywords: [],
        category: '通用',
      };
      render(<FAQEditor faq={faq} onDelete={vi.fn()} />);

      expect(screen.getByTestId('delete-btn')).toBeDefined();
    });

    it('新建模式不应该显示删除按钮', () => {
      render(<FAQEditor />);

      expect(screen.queryByTestId('delete-btn')).toBeNull();
    });

    it('点击删除应该调用回调', () => {
      const onDelete = vi.fn();
      const faq = {
        id: '1',
        question: '测试',
        answer: '测试',
        keywords: [],
        category: '通用',
      };
      render(<FAQEditor faq={faq} onDelete={onDelete} />);

      fireEvent.click(screen.getByTestId('delete-btn'));

      expect(onDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('取消功能', () => {
    it('有onCancel时应该显示取消按钮', () => {
      render(<FAQEditor onCancel={vi.fn()} />);

      expect(screen.getByTestId('cancel-btn')).toBeDefined();
    });

    it('点击取消应该调用回调', () => {
      const onCancel = vi.fn();
      render(<FAQEditor onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('cancel-btn'));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('初始数据', () => {
    it('应该加载FAQ初始数据', () => {
      const faq = {
        id: '1',
        question: '初始问题',
        answer: '初始答案',
        keywords: ['关键词1', '关键词2'],
        category: '景点',
      };
      render(<FAQEditor faq={faq} />);

      expect(screen.getByTestId('question-input')).toHaveProperty('value', '初始问题');
      expect(screen.getByTestId('answer-input')).toHaveProperty('value', '初始答案');
      expect(screen.getByText('关键词1')).toBeDefined();
      expect(screen.getByText('关键词2')).toBeDefined();
      expect(screen.getByTestId('category-select')).toHaveProperty('value', '景点');
    });
  });
});
