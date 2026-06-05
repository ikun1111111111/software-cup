/**
 * Offline cache service for tour content.
 * Uses IndexedDB to cache Q&A pairs and audio, detects network status,
 * and auto-switches between online/offline modes.
 */

const DB_NAME = 'lingshan_offline';
const DB_VERSION = 1;
const STORE_QA = 'qa_pairs';
const STORE_SPOTS = 'scenic_spots';
const STORE_META = 'meta';

export interface QAPair {
  q: string;
  a: string;
}

export interface ScenicSpot {
  id: string;
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export interface OfflinePackage {
  version: string;
  generated_at: string;
  qa_pairs: QAPair[];
  scenic_spots: ScenicSpot[];
  audio_refs?: { id: string; spot_id: string; path: string }[];
}

type NetworkMode = 'online' | 'offline';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QA)) db.createObjectStore(STORE_QA, { keyPath: 'q' });
      if (!db.objectStoreNames.contains(STORE_SPOTS)) db.createObjectStore(STORE_SPOTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };

    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

function txPut(db: IDBDatabase, storeName: string, items: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function txGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function txPutMeta(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function txGetMeta<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Cache an offline package into IndexedDB. */
export async function cachePackage(pkg: OfflinePackage): Promise<void> {
  const db = await openDB();
  await txPut(db, STORE_QA, pkg.qa_pairs);
  await txPut(db, STORE_SPOTS, pkg.scenic_spots);
  await txPutMeta(db, 'version', pkg.version);
  await txPutMeta(db, 'cached_at', new Date().toISOString());
  await txPutMeta(db, 'entry_count', pkg.qa_pairs.length);
}

/** Retrieve cached Q&A pairs. */
export async function getCachedQA(): Promise<QAPair[]> {
  const db = await openDB();
  return txGetAll<QAPair>(db, STORE_QA);
}

/** Retrieve cached scenic spots. */
export async function getCachedSpots(): Promise<ScenicSpot[]> {
  const db = await openDB();
  return txGetAll<ScenicSpot>(db, STORE_SPOTS);
}

/** Get cache metadata. */
export async function getCacheMeta(): Promise<{ version?: string; cached_at?: string; entry_count?: number }> {
  const db = await openDB();
  const version = await txGetMeta<string>(db, 'version');
  const cached_at = await txGetMeta<string>(db, 'cached_at');
  const entry_count = await txGetMeta<number>(db, 'entry_count');
  return { version, cached_at, entry_count };
}

/** Check if cache has data. */
export async function hasCache(): Promise<boolean> {
  const meta = await getCacheMeta();
  return !!meta.entry_count && meta.entry_count > 0;
}

/** Get current network mode. */
export function getNetworkMode(): NetworkMode {
  return navigator.onLine ? 'online' : 'offline';
}

/** Fetch and cache offline package from server. */
export async function syncOfflinePackage(baseUrl = ''): Promise<boolean> {
  try {
    const statusResp = await fetch(`${baseUrl}/api/offline/status`);
    if (!statusResp.ok) return false;

    const status = await statusResp.json();
    if (!status.available) return false;

    const cachedMeta = await getCacheMeta();
    const cachedEtag = cachedMeta?.version;

    const headers: Record<string, string> = {};
    if (cachedEtag) headers['If-None-Match'] = cachedEtag;

    const resp = await fetch(`${baseUrl}/api/offline/package`, { headers });
    if (resp.status === 304) return true; // already up to date
    if (!resp.ok) return false;

    const pkg: OfflinePackage = await resp.json();
    await cachePackage(pkg);
    return true;
  } catch {
    return false;
  }
}

/** Search cached Q&A by keyword. Returns matching pairs. */
export async function searchCachedQA(keyword: string): Promise<QAPair[]> {
  const all = await getCachedQA();
  const lower = keyword.toLowerCase();
  return all.filter((p) => p.q.includes(lower) || p.a.includes(lower));
}

/** Register a callback for network status changes. Returns unsubscribe function. */
export function onNetworkChange(callback: (mode: NetworkMode) => void): () => void {
  const goOnline = () => callback('online');
  const goOffline = () => callback('offline');
  window.addEventListener('online', goOnline);
  window.addEventListener('offline', goOffline);
  return () => {
    window.removeEventListener('online', goOnline);
    window.removeEventListener('offline', goOffline);
  };
}
