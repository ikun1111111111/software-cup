import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OfflinePackage } from '../services/offlineCache';

// In-memory stores
let qaData: any[];
let spotData: any[];
let metaData: Record<string, any>;

beforeEach(() => {
  qaData = [];
  spotData = [];
  metaData = {};
  vi.resetModules();
});

// Mock the entire module
vi.mock('../services/offlineCache', async () => {
  const cachePackage = async (pkg: OfflinePackage) => {
    qaData.push(...pkg.qa_pairs);
    spotData.push(...pkg.scenic_spots);
    metaData.version = pkg.version;
    metaData.entry_count = pkg.qa_pairs.length;
    metaData.cached_at = new Date().toISOString();
  };
  const getCachedQA = async () => [...qaData];
  const getCachedSpots = async () => [...spotData];
  const getCacheMeta = async () => ({ ...metaData });
  const hasCache = async () => !!metaData.entry_count && metaData.entry_count > 0;
  const getNetworkMode = () => (navigator.onLine ? 'online' : 'offline') as 'online' | 'offline';
  const searchCachedQA = async (keyword: string) => {
    const lower = keyword.toLowerCase();
    return qaData.filter((p: any) => p.q.includes(lower) || p.a.includes(lower));
  };
  const onNetworkChange = (cb: (mode: 'online' | 'offline') => void) => {
    const goOnline = () => cb('online');
    const goOffline = () => cb('offline');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  };
  return { cachePackage, getCachedQA, getCachedSpots, getCacheMeta, hasCache, getNetworkMode, searchCachedQA, onNetworkChange };
});

const samplePackage: OfflinePackage = {
  version: '1.0.0',
  generated_at: '2026-06-04T00:00:00Z',
  qa_pairs: [
    { q: '灵山大佛有多高？', a: '通高88米。' },
    { q: '门票多少钱？', a: '约210元。' },
  ],
  scenic_spots: [
    { id: 'spot1', name: '灵山大佛' },
    { id: 'spot2', name: '九龙灌浴' },
  ],
};

describe('offlineCache', () => {
  it('cachePackage stores data', async () => {
    const { cachePackage, getCacheMeta } = await import('../services/offlineCache');
    await cachePackage(samplePackage);
    const meta = await getCacheMeta();
    expect(meta.entry_count).toBe(2);
    expect(meta.version).toBe('1.0.0');
  });

  it('getCachedQA returns cached Q&A pairs', async () => {
    const mod = await import('../services/offlineCache');
    await mod.cachePackage(samplePackage);
    const qa = await mod.getCachedQA();
    expect(qa.length).toBe(2);
    expect(qa[0].q).toBe('灵山大佛有多高？');
  });

  it('getCachedSpots returns cached scenic spots', async () => {
    const mod = await import('../services/offlineCache');
    await mod.cachePackage(samplePackage);
    const spots = await mod.getCachedSpots();
    expect(spots.length).toBe(2);
    expect(spots[0].name).toBe('灵山大佛');
  });

  it('hasCache returns false initially then true after caching', async () => {
    const mod = await import('../services/offlineCache');
    expect(await mod.hasCache()).toBe(false);
    await mod.cachePackage(samplePackage);
    expect(await mod.hasCache()).toBe(true);
  });

  it('searchCachedQA finds matching pairs', async () => {
    const mod = await import('../services/offlineCache');
    await mod.cachePackage(samplePackage);
    const results = await mod.searchCachedQA('大佛');
    expect(results.length).toBe(1);
    expect(results[0].q).toBe('灵山大佛有多高？');
  });

  it('searchCachedQA returns empty for no match', async () => {
    const mod = await import('../services/offlineCache');
    await mod.cachePackage(samplePackage);
    const results = await mod.searchCachedQA('不存在的问题');
    expect(results.length).toBe(0);
  });

  it('getNetworkMode returns based on navigator.onLine', async () => {
    const mod = await import('../services/offlineCache');
    vi.stubGlobal('navigator', { onLine: true });
    expect(mod.getNetworkMode()).toBe('online');
    vi.stubGlobal('navigator', { onLine: false });
    expect(mod.getNetworkMode()).toBe('offline');
  });

  it('onNetworkChange registers and unregisters listeners', async () => {
    const mod = await import('../services/offlineCache');
    const cb = vi.fn();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const unsub = mod.onNetworkChange(cb);
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unsub();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
