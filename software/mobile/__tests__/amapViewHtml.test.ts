jest.mock('../constants/scenic', () => ({
  CAT_COLORS: {
    特色景点: '#6A9C89',
  },
}));

import { buildHTML } from '../components/map/AmapView.shared';
describe('AMap WebView HTML coordinates', () => {
  test('renders local scenic GCJ-02 center without applying another offset', () => {
    const center = { latitude: 31.4268, longitude: 120.0962 };
    const spot = {
      id: 'ling-shan-da-zhao-bi',
      name: '灵山大照壁',
      category: '特色景点',
      tags: null,
      overview: '',
      qr_code: null,
      latitude: center.latitude,
      longitude: center.longitude,
    };
    const html = buildHTML([spot], center, 15, '');

    expect(html).toContain(`center:[${center.longitude},${center.latitude}]`);
    expect(html).toContain('var point=toScenicAmapPoint({latitude:s.lat,longitude:s.lng});');
    expect(html).toContain("source || point.source || 'gcj02'");
    expect(html).toContain('map.setFitView(markers,false,[118,48,240,48]);');
  });
});
