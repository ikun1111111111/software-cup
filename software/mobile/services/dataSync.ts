/**
 * 数据同步服务
 * 负责从后端获取数据并存储到本地 SQLite，同时提供本地优先的数据读取
 */

import * as localDb from './localDatabase';
import { getSpotById, type SpotDetail } from '@/api/spots';
import { listRoutes, getRouteById, type TourRoute, type TourRouteDetail } from '@/api/routes';
import { listMemories, getLatestSummary, getUserProfile, getAchievements, type TravelMemory, type JourneySummary, type UserProfile, type Achievement } from '@/api/memory';
import { listSpots, type Spot } from '@/api/spots';
import {
  getOfflineDemoRouteDetail,
  getOfflineDemoRoutes,
  isOfflineDemoRoute,
} from '@/constants/offline-demo';

export const SESSION_ID = 'mobile-app-session';
const LOCAL_CACHE_TIMEOUT_MS = 1200;

export interface MemoryReadOptions {
  limit?: number;
  offset?: number;
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

async function withLocalCacheFallback<T>(
  operation: Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`[DataSync] Local cache ${label} timed out, using fallback`);
          resolve(fallback);
        }, LOCAL_CACHE_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn(`[DataSync] Local cache ${label} failed, using fallback:`, error);
    return fallback;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// ============ 景点数据同步 ============

/**
 * 同步单个景点数据到本地数据库
 */
export async function syncSpotToDb(spotId: string): Promise<SpotDetail | null> {
  try {
    const spot = await getSpotById(spotId);
    if (spot) {
      await localDb.saveSpot({
        id: spot.id,
        name: spot.name,
        overview: spot.overview,
        description: spot.detail,
        latitude: spot.latitude,
        longitude: spot.longitude,
        category: spot.category,
        image_url: null,
        audio_url: null,
      });
      return spot;
    }
    return null;
  } catch (error) {
    console.warn('[DataSync] Failed to sync spot:', spotId, error);
    return null;
  }
}

/**
 * 批量同步景点数据（使用事务）
 */
export async function syncSpotsToDb(spotIds: string[]): Promise<void> {
  try {
    const spots = await Promise.all(
      spotIds.map(id => getSpotById(id).catch(() => null))
    );
    const validSpots = spots.filter(Boolean) as SpotDetail[];
    await localDb.saveSpots(validSpots.map(s => ({
      id: s.id,
      name: s.name,
      overview: s.overview,
      description: s.detail,
      latitude: s.latitude,
      longitude: s.longitude,
      category: s.category,
      image_url: null,
      audio_url: null,
    })));
  } catch (error) {
    console.warn('[DataSync] Failed to sync spots:', error);
  }
}

/**
 * 从本地数据库获取景点，如果没有则从后端获取
 */
export async function getSpotWithFallback(spotId: string): Promise<SpotDetail | null> {
  // 优先从本地数据库获取
  const cached = await localDb.getSpot(spotId);
  if (cached) {
    return cached as unknown as SpotDetail;
  }

  // 从后端获取并缓存（直接调用，不重复查DB）
  return await syncSpotToDb(spotId);
}

// ============ 路线数据同步 ============

/**
 * 同步所有路线数据到本地数据库
 */
export async function syncRoutesToDb(): Promise<TourRoute[]> {
  try {
    const routes = await listRoutes();
    await localDb.saveRoutes(routes.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      route_type: r.route_type,
      duration: r.duration,
      gradient: r.gradient,
    })));
    return routes;
  } catch (error) {
    console.warn('[DataSync] Failed to sync routes:', error);
    return getOfflineDemoRoutes();
  }
}

/**
 * 同步路线详情到本地数据库
 */
export async function syncRouteDetailToDb(routeId: string): Promise<TourRouteDetail | null> {
  if (isOfflineDemoRoute(routeId)) {
    return getOfflineDemoRouteDetail(routeId);
  }

  try {
    const detail = await getRouteById(routeId);
    if (detail) {
      await localDb.saveRoute({
        id: detail.id,
        name: detail.name,
        description: detail.description,
        route_type: detail.route_type,
        duration: detail.duration,
        gradient: detail.gradient,
        spot_order: JSON.stringify(detail.spot_order),
        spot_names: JSON.stringify(detail.spot_names),
        spot_details: detail.spot_details ? JSON.stringify(detail.spot_details) : null,
      });
      return detail;
    }
    return null;
  } catch (error) {
    console.warn('[DataSync] Failed to sync route detail:', routeId, error);
    return getOfflineDemoRouteDetail(routeId);
  }
}

/**
 * 从本地数据库获取路线，如果没有则从后端获取
 */
export async function getRoutesWithFallback(): Promise<TourRoute[]> {
  // 优先从本地数据库获取
  const cached = await localDb.getAllRoutes();
  if (cached.length > 0) {
    return cached.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      route_type: r.route_type || '',
      duration: r.duration || '',
      gradient: r.gradient,
      spot_names: safeJsonParse(r.spot_names, []),
    })) as unknown as TourRoute[];
  }

  const synced = await syncRoutesToDb();
  return synced.length > 0 ? synced : getOfflineDemoRoutes();
}

/**
 * 从本地数据库获取路线详情，如果没有则从后端获取
 */
export async function getRouteDetailWithFallback(routeId: string): Promise<TourRouteDetail | null> {
  // 优先从本地数据库获取
  const cached = await localDb.getRoute(routeId);
  if (cached) {
    return {
      id: cached.id,
      name: cached.name,
      description: cached.description || '',
      route_type: cached.route_type || '',
      duration: cached.duration || '',
      gradient: cached.gradient,
      spot_order: safeJsonParse(cached.spot_order, []),
      spot_names: safeJsonParse(cached.spot_names, []),
      spot_details: safeJsonParse(cached.spot_details, null),
    } as unknown as TourRouteDetail;
  }

  return await syncRouteDetailToDb(routeId);
}

// ============ 记忆数据同步 ============

/**
 * 同步记忆数据到本地数据库
 */
export async function syncMemoriesToDb(sessionId: string = SESSION_ID): Promise<TravelMemory[]> {
  try {
    const memories = await listMemories(sessionId);
    if (memories.length > 0) {
      await withLocalCacheFallback(
        localDb.saveMemories(memories.map(m => ({
          id: m.id,
          session_id: m.session_id,
          title: m.title,
          original_content: m.original_content,
          polished_content: m.polished_content,
          spot_name: m.spot_name,
          spot_id: m.spot_id,
          source_type: m.source_type,
          mood_tag: m.mood_tag,
          metadata_json: m.metadata_json ? JSON.stringify(m.metadata_json) : null,
          photo_url: m.photo_url,
          voice_url: m.voice_url,
          voice_duration: m.voice_duration,
          is_capsule: m.is_capsule ? 1 : 0,
          capsule_unlock_at: m.capsule_unlock_at,
          capsule_content: m.capsule_content,
          created_at: m.created_at,
          updated_at: m.updated_at,
        }))),
        undefined,
        'memory write',
      );
    }
    return memories;
  } catch (error) {
    console.warn('[DataSync] Failed to sync memories:', error);
    return [];
  }
}

/**
 * 从本地数据库获取记忆，如果没有则从后端获取
 */
export async function getMemoriesWithFallback(
  sessionId: string = SESSION_ID,
  options: MemoryReadOptions = {},
): Promise<TravelMemory[]> {
  // 优先从本地数据库获取
  const cached = await withLocalCacheFallback(
    localDb.getMemoriesBySession(sessionId, options.limit, options.offset ?? 0),
    [],
    'memory read',
  );
  if (cached.length > 0) {
    return cached.map(m => ({
      ...m,
      is_capsule: m.is_capsule === 1,
      metadata_json: safeJsonParse(m.metadata_json, null),
    })) as unknown as TravelMemory[];
  }

  // 从后端获取并缓存
  const synced = await syncMemoriesToDb(sessionId);
  if (typeof options.limit === 'number') {
    const offset = options.offset ?? 0;
    return synced.slice(offset, offset + options.limit);
  }
  return synced;
}

// ============ 用户画像同步 ============

/**
 * 同步用户画像到本地数据库
 */
export async function syncUserProfileToDb(sessionId: string = SESSION_ID): Promise<UserProfile | null> {
  try {
    const profile = await getUserProfile(sessionId);
    if (profile) {
      await withLocalCacheFallback(
        localDb.saveUserProfile({
          session_id: sessionId,
          nickname: null,
          avatar_url: null,
          travel_style: null,
          interests: null,
        }),
        undefined,
        'profile write',
      );
      return profile;
    }
    return null;
  } catch (error) {
    console.warn('[DataSync] Failed to sync user profile:', error);
    return null;
  }
}

/**
 * 从本地数据库获取用户画像，如果没有则从后端获取
 */
export async function getUserProfileWithFallback(sessionId: string = SESSION_ID): Promise<UserProfile | null> {
  // 优先从本地数据库获取
  const cached = await withLocalCacheFallback(
    localDb.getUserProfile(sessionId),
    null,
    'profile read',
  );
  if (cached) {
    return {
      ...cached,
      interests: safeJsonParse(cached.interests, null),
    } as unknown as UserProfile;
  }

  // 从后端获取并缓存
  return await syncUserProfileToDb(sessionId);
}

// ============ 成就数据同步 ============

/**
 * 同步成就数据到本地数据库
 */
export async function syncAchievementsToDb(sessionId: string = SESSION_ID): Promise<Achievement[]> {
  try {
    const result = await getAchievements(sessionId);
    const achievements = result.achievements || [];
    if (achievements.length > 0) {
      await withLocalCacheFallback(
        localDb.saveAchievements(achievements.map(a => ({
          id: a.id,
          session_id: sessionId,
          name: a.name,
          description: a.description,
          icon_url: a.icon,
          unlocked_at: a.unlocked ? new Date().toISOString() : null,
        }))),
        undefined,
        'achievements write',
      );
    }
    return achievements;
  } catch (error) {
    console.warn('[DataSync] Failed to sync achievements:', error);
    return [];
  }
}

/**
 * 从本地数据库获取成就，如果没有则从后端获取
 */
export async function getAchievementsWithFallback(sessionId: string = SESSION_ID): Promise<{ achievements: Achievement[]; unlocked_count: number; total_count: number }> {
  // 优先从本地数据库获取
  const cached = await withLocalCacheFallback(
    localDb.getAchievementsBySession(sessionId),
    [],
    'achievements read',
  );
  if (cached.length > 0) {
    return {
      achievements: cached as unknown as Achievement[],
      unlocked_count: cached.length,
      total_count: cached.length,
    };
  }

  // 从后端获取并缓存
  const achievements = await syncAchievementsToDb(sessionId);
  return {
    achievements,
    unlocked_count: achievements.length,
    total_count: achievements.length,
  };
}

// ============ 旅程总结同步 ============

/**
 * 同步旅程总结到本地数据库
 */
export async function syncJourneySummaryToDb(sessionId: string = SESSION_ID): Promise<JourneySummary | null> {
  try {
    const summary = await getLatestSummary(sessionId);
    if (summary) {
      await withLocalCacheFallback(
        localDb.saveJourneySummary({
          id: summary.id,
          session_id: sessionId,
          title: summary.title,
          content: summary.content,
          spot_count: summary.spot_count,
          memory_count: summary.memory_count,
          date_range: summary.date_range,
          cover_image_url: summary.cover_image_url,
          created_at: summary.created_at,
        }),
        undefined,
        'summary write',
      );
      return summary;
    }
    return null;
  } catch (error) {
    console.warn('[DataSync] Failed to sync journey summary:', error);
    return null;
  }
}

/**
 * 从本地数据库获取旅程总结，如果没有则从后端获取
 */
export async function getJourneySummaryWithFallback(sessionId: string = SESSION_ID): Promise<JourneySummary | null> {
  // 优先从本地数据库获取
  const cached = await withLocalCacheFallback(
    localDb.getLatestSummary(sessionId),
    null,
    'summary read',
  );
  if (cached) {
    return cached as unknown as JourneySummary;
  }

  // 从后端获取并缓存
  return await syncJourneySummaryToDb(sessionId);
}

// ============ 批量预加载 ============

/**
 * 预加载路线及其景点数据
 */
export async function preloadRouteWithSpots(routeId: string): Promise<void> {
  try {
    // 获取路线详情
    const routeDetail = await getRouteDetailWithFallback(routeId);
    if (routeDetail && routeDetail.spot_order) {
      // 批量预加载景点
      await syncSpotsToDb(routeDetail.spot_order);
    }
  } catch (error) {
    console.warn('[DataSync] Failed to preload route:', routeId, error);
  }
}

/**
 * 预加载所有常用数据
 */
export async function preloadCommonData(): Promise<void> {
  try {
    // 并行加载
    await Promise.all([
      syncRoutesToDb(),
      syncMemoriesToDb(),
      syncUserProfileToDb(),
      syncAchievementsToDb(),
      syncJourneySummaryToDb(),
    ]);
  } catch (error) {
    console.warn('[DataSync] Failed to preload common data:', error);
  }
}

// ============ 后台静默刷新 ============

/**
 * 后台静默刷新所有数据
 */
export async function refreshMemoryPageDataInBackground(sessionId: string = SESSION_ID): Promise<void> {
  try {
    await Promise.all([
      syncMemoriesToDb(sessionId),
      syncUserProfileToDb(sessionId),
      syncAchievementsToDb(sessionId),
      syncJourneySummaryToDb(sessionId),
    ]);
  } catch (error) {
    console.warn('[DataSync] Failed to refresh memory page data:', error);
  }
}

export async function refreshAllDataInBackground(sessionId: string = SESSION_ID): Promise<void> {
  try {
    await Promise.all([
      syncRoutesToDb(),
      syncMemoriesToDb(sessionId),
      syncUserProfileToDb(sessionId),
      syncAchievementsToDb(sessionId),
      syncJourneySummaryToDb(sessionId),
    ]);
  } catch (error) {
    console.warn('[DataSync] Failed to refresh data in background:', error);
  }
}
