describe('local memory database performance helpers', () => {
  function setupDatabaseMock() {
    jest.resetModules();

    const db = {
      execAsync: jest.fn<Promise<void>, [string]>(async () => undefined),
      runAsync: jest.fn<Promise<void>, [string, any[]?]>(async () => undefined),
      getAllAsync: jest.fn(async () => []),
      getFirstAsync: jest.fn(async () => null),
      withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => callback()),
    };

    const openDatabaseAsync = jest.fn(async () => db);

    jest.doMock('expo-sqlite', () => ({
      openDatabaseAsync,
    }));

    return { db, openDatabaseAsync };
  }

  afterEach(() => {
    jest.dontMock('expo-sqlite');
  });

  test('creates an index for session-scoped memory timeline queries', async () => {
    const { db } = setupDatabaseMock();
    const localDb = await import('../services/localDatabase');

    await localDb.getDatabase();

    expect(
      db.execAsync.mock.calls.some(([sql]) =>
        String(sql).includes('CREATE INDEX IF NOT EXISTS idx_memories_session_created'),
      ),
    ).toBe(true);
  });

  test('saves memory batches inside one transaction', async () => {
    const { db } = setupDatabaseMock();
    const localDb = await import('../services/localDatabase');

    await localDb.saveMemories([
      { id: 1, session_id: 'session-1', title: 'first' },
      { id: 2, session_id: 'session-1', title: 'second' },
    ]);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
  });
});
