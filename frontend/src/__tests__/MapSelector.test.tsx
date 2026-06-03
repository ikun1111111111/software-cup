import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapSelector from '../components/common/MapSelector';

describe('MapSelector', () => {
  describe('渲染', () => {
    it('应该渲染容器', () => {
      render(<MapSelector />);
      expect(screen.getByTestId('map-selector')).toBeDefined();
    });

    it('应该显示标题', () => {
      render(<MapSelector />);
      expect(screen.getByText('地图选点')).toBeDefined();
    });

    it('应该渲染地图容器', () => {
      render(<MapSelector />);
      expect(screen.getByTestId('map-container')).toBeDefined();
    });

    it('应该显示位置列表', () => {
      render(<MapSelector />);
      expect(screen.getByTestId('location-list')).toBeDefined();
    });

    it('应该显示推荐位置', () => {
      render(<MapSelector />);
      expect(screen.getByText('灵山大佛')).toBeDefined();
      expect(screen.getByText('梵宫')).toBeDefined();
      expect(screen.getByText('九龙灌浴')).toBeDefined();
    });
  });

  describe('位置选择', () => {
    it('点击位置按钮应该选中', () => {
      const onLocationSelect = vi.fn();
      render(<MapSelector onLocationSelect={onLocationSelect} />);

      fireEvent.click(screen.getByTestId('location-btn-灵山大佛'));

      expect(onLocationSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: '灵山大佛' })
      );
    });

    it('点击地图标记应该选中', () => {
      const onLocationSelect = vi.fn();
      render(<MapSelector onLocationSelect={onLocationSelect} />);

      fireEvent.click(screen.getByTestId('marker-梵宫'));

      expect(onLocationSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: '梵宫' })
      );
    });

    it('选中后应该显示信息', () => {
      render(<MapSelector />);

      fireEvent.click(screen.getByTestId('location-btn-灵山大佛'));

      expect(screen.getByTestId('selected-info')).toBeDefined();
      expect(screen.getByText('已选位置:')).toBeDefined();
    });

    it('选中按钮应该高亮', () => {
      render(<MapSelector />);

      fireEvent.click(screen.getByTestId('location-btn-灵山大佛'));

      const btn = screen.getByTestId('location-btn-灵山大佛');
      expect(btn.style.backgroundColor).toBe('rgb(232, 240, 254)');
    });
  });
});
