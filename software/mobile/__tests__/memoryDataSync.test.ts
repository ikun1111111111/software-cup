describe('memory data sync', () => {
  const apiMemory = {
    id: 2,
    session_id: 'session-1',
    title: 'api memory',
    original_content: 'from api',
    polished_content: null,
    spot_name: null,
    spot_id: null,
    source_type: 'manual',
    mood_tag: null,
    metadata_json: null,
    photo_url: null,
    voice_url: null,
    voice_duration: null,
    is_capsule: false,
    capsule_unlock_at: null,
    capsule_content: null,
    created_at: '2026-06-23T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
  };

  function setupModules(cachedRows: any[]) {
    jest.resetModules();

    const localDb = {
      getMemoriesBySession: jest.fn(async () => cachedRows),
      saveMemories: jest.fn(async () => undefined),
      getUserProfile: jest.fn(async () => null),
      saveUserProfile: jest.fn(async () => undefined),
      getAchievementsBySession: jest.fn(async () => []),
      saveAchievements: jest.fn(async () => undefined),
      getLatestSummary: jest.fn(async () => null),
      saveJourneySummary: jest.fn(async () => undefined),
      getAllSpots: jest.fn(async () => []),
      saveSpots: jest.fn(async () => undefined),
      getAllRoutes: jest.fn(async () => []),
      saveRoutes: jest.fn(async () => undefined),
      getRoute: jest.fn(async () => null),
      saveRoute: jest.fn(async () => undefined),
      getSpot: jest.fn(async () => null),
      saveSpot: jest.fn(async () => undefined),
    };

    jest.doMock('../services/localDatabase', () => localDb);
    const memoryApi = {
      listMemories: jest.fn(async () => []),
      getLatestSummary: jest.fn(async () => null),
      getUserProfile: jest.fn(async () => null),
      getAchievements: jest.fn(async () => ({ achievements: [] })),
    };
    const routesApi = {
      listRoutes: jest.fn(async () => []),
      getRouteById: jest.fn(async () => null),
    };

    jest.doMock('../api/memory', () => memoryApi);
    jest.doMock('../api/spots', () => ({
      getSpotById: jest.fn(async () => null),
      listSpots: jest.fn(async () => []),
    }));
    jest.doMock('../api/routes', () => routesApi);

    return { localDb, memoryApi, routesApi };
  }

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.dontMock('../services/localDatabase');
    jest.dontMock('../api/memory');
    jest.dontMock('../api/spots');
    jest.dontMock('../api/routes');
  });

  test('reads cached memories with pagination options for fast first paint', async () => {
    const { localDb } = setupModules([
      {
        id: 1,
        session_id: 'session-1',
        title: 'cached',
        metadata_json: '{"source":"local"}',
        is_capsule: 0,
      },
    ]);
    const dataSync = await import('../services/dataSync');

    const result = await (dataSync.getMemoriesWithFallback as any)('session-1', {
      limit: 12,
      offset: 6,
    });

    expect(localDb.getMemoriesBySession.mock.calls).toEqual([['session-1', 12, 6]]);
    expect(result[0].metadata_json).toEqual({ source: 'local' });
    expect(result[0].is_capsule).toBe(false);
  });

  test('falls back to API memories when local memory cache read stalls', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { localDb, memoryApi } = setupModules([]);
    localDb.getMemoriesBySession.mockImplementation(() => new Promise(() => {}));
    memoryApi.listMemories.mockResolvedValue([apiMemory] as any);
    const dataSync = await import('../services/dataSync');

    const resultPromise = (dataSync.getMemoriesWithFallback as any)('session-1');

    await jest.advanceTimersByTimeAsync(1600);
    const settled = await Promise.race([
      resultPromise,
      Promise.resolve('__pending__'),
    ]);

    expect(settled).toEqual([apiMemory]);
    expect(memoryApi.listMemories).toHaveBeenCalledWith('session-1');
  });

  test('returns API memories when local memory cache write stalls', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { localDb, memoryApi } = setupModules([]);
    localDb.saveMemories.mockImplementation(() => new Promise(() => {}));
    memoryApi.listMemories.mockResolvedValue([apiMemory] as any);
    const dataSync = await import('../services/dataSync');

    const resultPromise = (dataSync.syncMemoriesToDb as any)('session-1');

    await jest.advanceTimersByTimeAsync(1600);
    const settled = await Promise.race([
      resultPromise,
      Promise.resolve('__pending__'),
    ]);

    expect(settled).toEqual([apiMemory]);
    expect(memoryApi.listMemories).toHaveBeenCalledWith('session-1');
  });

  test('refreshes memory page data without fetching route lists', async () => {
    const { memoryApi, routesApi } = setupModules([]);
    const dataSync = await import('../services/dataSync');

    expect(typeof (dataSync as any).refreshMemoryPageDataInBackground).toBe('function');
    await (dataSync as any).refreshMemoryPageDataInBackground('session-1');

    expect(memoryApi.listMemories).toHaveBeenCalledWith('session-1');
    expect(routesApi.listRoutes).not.toHaveBeenCalled();
  });
});
