import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DocumentUpload from '../components/admin/DocumentUpload';

describe('DocumentUpload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('渲染', () => {
    it('应该渲染上传组件', () => {
      render(<DocumentUpload />);
      expect(screen.getByTestId('document-upload')).toBeDefined();
    });

    it('应该渲染拖拽区域', () => {
      render(<DocumentUpload />);
      expect(screen.getByTestId('drop-zone')).toBeDefined();
    });

    it('应该显示上传提示', () => {
      render(<DocumentUpload />);
      expect(screen.getByText('点击或拖拽文件到此处上传')).toBeDefined();
    });

    it('应该显示支持格式', () => {
      render(<DocumentUpload />);
      expect(screen.getByText(/支持格式/)).toBeDefined();
    });

    it('应该隐藏文件输入框', () => {
      render(<DocumentUpload />);
      const input = screen.getByTestId('file-input');
      expect(input.style.display).toBe('none');
    });
  });

  describe('文件选择', () => {
    it('点击应该触发文件选择', () => {
      render(<DocumentUpload />);
      const dropZone = screen.getByTestId('drop-zone');
      const input = screen.getByTestId('file-input') as HTMLInputElement;

      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.click(dropZone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('选择文件后应该开始上传', async () => {
      const onSuccess = vi.fn();
      render(<DocumentUpload onSuccess={onSuccess} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
        vi.advanceTimersByTime(1100);
      });

      expect(onSuccess).toHaveBeenCalledWith(file);
    });
  });

  describe('拖拽上传', () => {
    it('拖拽进入时应该改变样式', () => {
      render(<DocumentUpload />);
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragOver(dropZone);

      // 应该变为拖拽状态样式
      expect(dropZone.style.borderColor).toBe('rgb(26, 95, 180)');
    });

    it('拖拽离开时应该恢复样式', () => {
      render(<DocumentUpload />);
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(dropZone.style.borderColor).toBe('rgb(212, 208, 200)');
    });

    it('放置文件后应该开始上传', async () => {
      const onSuccess = vi.fn();
      render(<DocumentUpload onSuccess={onSuccess} />);

      const dropZone = screen.getByTestId('drop-zone');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.drop(dropZone, {
          dataTransfer: { files: [file] },
        });
        vi.advanceTimersByTime(1100);
      });

      expect(onSuccess).toHaveBeenCalledWith(file);
    });
  });

  describe('上传进度', () => {
    it('上传时应该显示进度', async () => {
      render(<DocumentUpload />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
        vi.advanceTimersByTime(500);
      });

      // 上传中应该显示进度条
      expect(screen.getByTestId('upload-progress')).toBeDefined();
    });

    it('上传完成后应该显示成功', async () => {
      const onSuccess = vi.fn();
      render(<DocumentUpload onSuccess={onSuccess} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
        vi.advanceTimersByTime(1100);
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('文件验证', () => {
    it('超大文件应该调用onError', async () => {
      const onError = vi.fn();
      render(<DocumentUpload maxSize={1} onError={onError} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      // 创建一个2MB的文件
      const file = new File([new ArrayBuffer(2 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(onError).toHaveBeenCalledWith('文件大小超过1MB限制');
    });
  });

  describe('自定义配置', () => {
    it('应该支持自定义accept', () => {
      render(<DocumentUpload accept=".pdf,.doc" />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      expect(input.accept).toBe('.pdf,.doc');
    });

    it('应该支持自定义maxSize', () => {
      render(<DocumentUpload maxSize={20} />);
      expect(screen.getByText(/最大20MB/)).toBeDefined();
    });
  });
});
