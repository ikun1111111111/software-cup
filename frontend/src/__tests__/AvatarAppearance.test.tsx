import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AvatarAppearance from '../components/admin/AvatarAppearance';

describe('AvatarAppearance', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<AvatarAppearance />);
      expect(screen.getByTestId('avatar-appearance')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<AvatarAppearance />);
      expect(screen.getByText('外观配置')).toBeDefined();
    });

    it('应该渲染模型列表', () => {
      render(<AvatarAppearance />);
      expect(screen.getByTestId('model-list')).toBeDefined();
    });

    it('应该渲染肤色列表', () => {
      render(<AvatarAppearance />);
      expect(screen.getByTestId('skin-list')).toBeDefined();
    });

    it('应该渲染发型列表', () => {
      render(<AvatarAppearance />);
      expect(screen.getByTestId('hair-list')).toBeDefined();
    });

    it('应该渲染服装列表', () => {
      render(<AvatarAppearance />);
      expect(screen.getByTestId('outfit-list')).toBeDefined();
    });

    it('应该渲染配饰列表', () => {
      render(<AvatarAppearance />);
      expect(screen.getByTestId('accessory-list')).toBeDefined();
    });
  });

  describe('模型选择', () => {
    it('应该显示默认模型选项', () => {
      render(<AvatarAppearance />);
      expect(screen.getByText('默认模型')).toBeDefined();
      expect(screen.getByText('古风模型')).toBeDefined();
      expect(screen.getByText('现代模型')).toBeDefined();
    });

    it('点击模型应该选中', () => {
      const onChange = vi.fn();
      render(<AvatarAppearance onChange={onChange} />);

      fireEvent.click(screen.getByTestId('model-model-2'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ model: 'model-2' }));
    });

    it('默认应该选中第一个模型', () => {
      render(<AvatarAppearance />);
      const defaultModel = screen.getByTestId('model-model-1');
      expect(defaultModel.style.backgroundColor).toBe('rgb(26, 95, 180)');
    });
  });

  describe('肤色选择', () => {
    it('应该显示肤色选项', () => {
      render(<AvatarAppearance />);
      expect(screen.getByText('默认肤色')).toBeDefined();
      expect(screen.getByText('白皙')).toBeDefined();
      expect(screen.getByText('小麦色')).toBeDefined();
    });

    it('点击肤色应该选中', () => {
      const onChange = vi.fn();
      render(<AvatarAppearance onChange={onChange} />);

      fireEvent.click(screen.getByTestId('skin-skin-2'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ skin: 'skin-2' }));
    });
  });

  describe('发型选择', () => {
    it('应该显示发型选项', () => {
      render(<AvatarAppearance />);
      expect(screen.getByText('黑色长发')).toBeDefined();
      expect(screen.getByText('棕色短发')).toBeDefined();
      expect(screen.getByText('金色卷发')).toBeDefined();
    });

    it('点击发型应该选中', () => {
      const onChange = vi.fn();
      render(<AvatarAppearance onChange={onChange} />);

      fireEvent.click(screen.getByTestId('hair-hair-2'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hair: 'hair-2' }));
    });
  });

  describe('服装选择', () => {
    it('应该显示服装选项', () => {
      render(<AvatarAppearance />);
      expect(screen.getByText('传统汉服')).toBeDefined();
      expect(screen.getByText('现代正装')).toBeDefined();
      expect(screen.getByText('休闲装')).toBeDefined();
    });

    it('点击服装应该选中', () => {
      const onChange = vi.fn();
      render(<AvatarAppearance onChange={onChange} />);

      fireEvent.click(screen.getByTestId('outfit-outfit-2'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outfit: 'outfit-2' }));
    });
  });

  describe('配饰选择', () => {
    it('应该显示配饰选项', () => {
      render(<AvatarAppearance />);
      expect(screen.getByText('发簪')).toBeDefined();
      expect(screen.getByText('耳环')).toBeDefined();
      expect(screen.getByText('项链')).toBeDefined();
      expect(screen.getByText('手镯')).toBeDefined();
    });

    it('点击配饰应该选中', () => {
      const onChange = vi.fn();
      render(<AvatarAppearance onChange={onChange} />);

      fireEvent.click(screen.getByTestId('acc-acc-1'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ accessories: ['acc-1'] }));
    });

    it('再次点击配饰应该取消选中', () => {
      const onChange = vi.fn();
      const config = {
        model: 'model-1',
        skin: 'skin-1',
        hair: 'hair-1',
        outfit: 'outfit-1',
        accessories: ['acc-1'],
        costumeMode: 'auto' as const,
        costumeId: 'festival-spring',
      };
      render(<AvatarAppearance config={config} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('acc-acc-1'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ accessories: [] }));
    });

    it('应该支持多选配饰', () => {
      const onChange = vi.fn();
      render(<AvatarAppearance onChange={onChange} />);

      fireEvent.click(screen.getByTestId('acc-acc-1'));
      fireEvent.click(screen.getByTestId('acc-acc-2'));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ accessories: ['acc-1', 'acc-2'] }));
    });
  });

  describe('初始配置', () => {
    it('应该加载初始配置', () => {
      const config = {
        model: 'model-2',
        skin: 'skin-2',
        hair: 'hair-2',
        outfit: 'outfit-2',
        accessories: ['acc-1', 'acc-2'],
        costumeMode: 'auto' as const,
        costumeId: 'festival-spring',
      };
      render(<AvatarAppearance config={config} />);

      expect(screen.getByTestId('model-model-2').style.backgroundColor).toBe('rgb(26, 95, 180)');
      expect(screen.getByTestId('skin-skin-2').style.backgroundColor).toBe('rgb(26, 95, 180)');
      expect(screen.getByTestId('hair-hair-2').style.backgroundColor).toBe('rgb(26, 95, 180)');
      expect(screen.getByTestId('outfit-outfit-2').style.backgroundColor).toBe('rgb(26, 95, 180)');
      expect(screen.getByTestId('acc-acc-1').style.backgroundColor).toBe('rgb(26, 95, 180)');
    });
  });
});
