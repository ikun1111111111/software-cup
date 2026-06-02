import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mockAppInstance = {
  stage: { addChild: vi.fn() },
  destroy: vi.fn(),
  view: document.createElement('canvas'),
};

vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => mockAppInstance),
  Ticker: { shared: { add: vi.fn() } },
}));

vi.mock('pixi-live2d-display/cubism4', () => ({
  Live2DModel: {
    registerTicker: vi.fn(),
    from: vi.fn().mockRejectedValue(new Error('No model in test env')),
  },
  MotionPreloadStrategy: { IDLE: 0 },
}));

import Live2DStage from '../components/DigitalHuman/Live2DStage';

describe('Live2DStage', () => {
  describe('渲染', () => {
    it('应该渲染舞台容器', () => {
      render(<Live2DStage modelPath="/models/test.model3.json" />);
      expect(screen.getByTestId('live2d-stage')).toBeDefined();
    });

    it('应该设置容器尺寸', () => {
      render(<Live2DStage modelPath="/models/test.model3.json" width={500} height={600} />);
      const stage = screen.getByTestId('live2d-stage');
      expect(stage.style.width).toBe('500px');
      expect(stage.style.height).toBe('600px');
    });

    it('应该使用默认尺寸', () => {
      render(<Live2DStage modelPath="/models/test.model3.json" />);
      const stage = screen.getByTestId('live2d-stage');
      expect(stage.style.width).toBe('300px');
      expect(stage.style.height).toBe('400px');
    });
  });

  describe('加载状态', () => {
    it('初始应该显示加载中', () => {
      render(<Live2DStage modelPath="/models/test.model3.json" />);
      expect(screen.getByTestId('loading-overlay')).toBeDefined();
    });

    it('加载文字应该显示数字人加载中', () => {
      render(<Live2DStage modelPath="/models/test.model3.json" />);
      expect(screen.getByText('数字人加载中...')).toBeDefined();
    });
  });
});
