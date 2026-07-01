import { buildMemorySourceMetadata } from '../utils/memorySource';

describe('memory source metadata', () => {
  test('builds stable route and spot context for saved memories', () => {
    const metadata = buildMemorySourceMetadata({
      sourcePage: 'attraction',
      route: { id: 'route-1', name: '禅茶巡礼' },
      spot: { id: 'spot-1', name: '梵宫' },
      extra: {
        mood: 'peaceful',
        has_photo: true,
        source_page: 'chat',
      },
    });

    expect(metadata).toEqual({
      mood: 'peaceful',
      has_photo: true,
      source_page: 'attraction',
      route_id: 'route-1',
      route_name: '禅茶巡礼',
      spot_id: 'spot-1',
      spot_name: '梵宫',
    });
  });

  test('drops missing route and spot fields instead of storing empty values', () => {
    expect(buildMemorySourceMetadata({
      sourcePage: 'chat',
      route: null,
      spot: { id: 'spot-2' },
      extra: { question: '九龙灌浴什么时候表演？' },
    })).toEqual({
      question: '九龙灌浴什么时候表演？',
      source_page: 'chat',
      spot_id: 'spot-2',
    });
  });
});
