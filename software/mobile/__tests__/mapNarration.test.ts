import {
  buildMapNarrationFeedback,
  buildMapSpotNarration,
  previewNarrationText,
} from '../utils/mapNarration';
import type { Spot } from '../api/spots';

const zhaobiSpot: Spot = {
  id: 'ling-shan-da-zhao-bi',
  name: '灵山大照壁',
  category: '特色景点',
  tags: null,
  overview: '景区入口的仪式性节点，以照壁开启灵山空间叙事。',
  qr_code: null,
  latitude: 31.4243,
  longitude: 120.0952,
};

describe('map narration copy', () => {
  test('hydrates the map narration with real spot detail', () => {
    const narration = buildMapSpotNarration(zhaobiSpot);

    expect(narration).toContain('景区入口的仪式性节点');
    expect(narration).toContain('灵山大照壁适合作为历史文化路线起点');
    expect(narration).toContain('主题浮雕');
  });

  test('uses visitor-facing feedback after narration starts', () => {
    const feedback = buildMapNarrationFeedback(zhaobiSpot.name, buildMapSpotNarration(zhaobiSpot));

    expect(feedback).toContain('小灵正在讲解灵山大照壁');
    expect(feedback).not.toContain('正文已切到');
    expect(feedback).not.toContain('上下文');
    expect(feedback).not.toContain('模拟');
  });

  test('keeps feedback compact for the dock panel', () => {
    expect(previewNarrationText('一'.repeat(80))).toHaveLength(45);
  });
});
