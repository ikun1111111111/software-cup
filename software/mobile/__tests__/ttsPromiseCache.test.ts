import { TTSPromiseCache } from '../utils/ttsPromiseCache';

describe('TTSPromiseCache', () => {
  test('deduplicates an in-flight prefetch and playback request', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const loader = jest.fn().mockResolvedValue(42);

    const first = cache.getOrCreate('hello', loader);
    const second = cache.getOrCreate('hello', loader);

    expect(first).toBe(second);
    await expect(second).resolves.toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test('exposes an existing prefetch without starting a new request', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const request = cache.getOrCreate('hello', () => Promise.resolve(42));

    expect(cache.peek('hello')).toBe(request);
    expect(cache.peek('missing')).toBeUndefined();
  });

  test('removes rejected requests so a later playback can retry', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const loader = jest.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(7);

    await expect(cache.getOrCreate('hello', loader)).rejects.toThrow('temporary');
    await expect(cache.getOrCreate('hello', loader)).resolves.toBe(7);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('evicts the oldest key when the FIFO limit is exceeded', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const loader = jest.fn((value: number) => Promise.resolve(value));

    await cache.getOrCreate('first', () => loader(1));
    await cache.getOrCreate('second', () => loader(2));
    await cache.getOrCreate('third', () => loader(3));
    await cache.getOrCreate('first', () => loader(4));

    expect(loader).toHaveBeenCalledTimes(4);
  });

  test('invalidates a hanging request so the next loader can retry', async () => {
    const cache = new TTSPromiseCache<number>(2);
    const hanging = new Promise<number>(() => {});
    const firstLoader = jest.fn(() => hanging);
    const retryLoader = jest.fn(() => Promise.resolve(9));

    const first = cache.getOrCreate('hello', firstLoader);
    expect(cache.deleteIfSame('hello', first)).toBe(true);

    const retry = cache.getOrCreate('hello', retryLoader);
    expect(retry).not.toBe(first);
    await expect(retry).resolves.toBe(9);
    expect(firstLoader).toHaveBeenCalledTimes(1);
    expect(retryLoader).toHaveBeenCalledTimes(1);
  });

  test('does not let an old request invalidate a newer promise', () => {
    const cache = new TTSPromiseCache<number>(2);
    const oldRequest = cache.getOrCreate('hello', () => new Promise<number>(() => {}));
    expect(cache.deleteIfSame('hello', oldRequest)).toBe(true);

    const newRequest = cache.getOrCreate('hello', () => Promise.resolve(11));
    expect(cache.deleteIfSame('hello', oldRequest)).toBe(false);
    expect(cache.getOrCreate('hello', () => Promise.resolve(12))).toBe(newRequest);
  });
});
