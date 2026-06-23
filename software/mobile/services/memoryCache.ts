/**
 * 通用内存缓存服务
 * 支持 TTL、容量限制、LRU 淘汰策略
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessTime: number;
}

interface CacheOptions {
  maxAge?: number; // 最大缓存时间（毫秒）
  maxItems?: number; // 最大缓存项数
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultMaxAge = 5 * 60 * 1000; // 默认5分钟
  private defaultMaxItems = 100; // 默认最多100项

  /**
   * 获取缓存数据
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    const maxAge = this.defaultMaxAge;

    // 检查是否过期
    if (now - item.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccessTime = now;

    return item.data as T;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, customMaxAge?: number): void {
    // 如果缓存已满，淘汰最少使用的项
    if (this.cache.size >= this.defaultMaxItems) {
      this.evictLeastUsed();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessTime: now,
    });
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 删除指定缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 淘汰最少使用的缓存项
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedCount = Infinity;
    let oldestAccessTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      // 优先淘汰访问次数最少的
      if (item.accessCount < leastUsedCount) {
        leastUsedCount = item.accessCount;
        leastUsedKey = key;
        oldestAccessTime = item.lastAccessTime;
      } 
      // 访问次数相同时，淘汰最久未访问的
      else if (item.accessCount === leastUsedCount && item.lastAccessTime < oldestAccessTime) {
        leastUsedKey = key;
        oldestAccessTime = item.lastAccessTime;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }
}

// 全局缓存实例
export const memoryCache = new MemoryCache();

// 缓存键常量
export const CACHE_KEYS = {
  // 路线记忆页面
  MEMORIES: 'memories',
  USER_PROFILE: 'user_profile',
  ACHIEVEMENTS: 'achievements',
  JOURNEY_SUMMARY: 'journey_summary',
  SPOTS_LIST: 'spots_list',
  
  // 景点详情
  SPOT_DETAIL: (id: string) => `spot_detail_${id}`,
};
