/**
 * 景点数据缓存层
 * 避免重复请求，提升页面切换速度
 */

import type { SpotDetail } from '@/api/spots';

// 内存缓存
const spotCache = new Map<string, { data: SpotDetail; timestamp: number }>();

// 缓存有效期：5分钟
const CACHE_TTL = 5 * 60 * 1000;

export const spotCacheService = {
  /**
   * 获取缓存的景点数据
   * @returns 缓存数据或null
   */
  get(id: string): SpotDetail | null {
    const cached = spotCache.get(id);
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      spotCache.delete(id);
      return null;
    }
    
    return cached.data;
  },

  /**
   * 设置缓存
   */
  set(id: string, data: SpotDetail): void {
    spotCache.set(id, { data, timestamp: Date.now() });
  },

  /**
   * 批量设置缓存（用于列表页预加载）
   */
  setBatch(spots: SpotDetail[]): void {
    const now = Date.now();
    spots.forEach(spot => {
      spotCache.set(spot.id, { data: spot, timestamp: now });
    });
  },

  /**
   * 清除缓存
   */
  clear(id?: string): void {
    if (id) {
      spotCache.delete(id);
    } else {
      spotCache.clear();
    }
  },

  /**
   * 预加载景点数据（后台静默加载）
   */
  async preload(id: string, fetchFn: (id: string) => Promise<SpotDetail>): Promise<SpotDetail> {
    // 如果已有缓存，直接返回
    const cached = this.get(id);
    if (cached) return cached;

    try {
      const data = await fetchFn(id);
      this.set(id, data);
      return data;
    } catch (error) {
      console.warn(`[SpotCache] Failed to preload spot ${id}:`, error);
      throw error;
    }
  },
};
