/**
 * 本地 SQLite 数据库服务
 * 用于缓存景点、路线、记忆等数据，减少网络请求
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'lingshan_local.db';

// 数据库单例
let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * 获取数据库实例
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await initDatabase(dbInstance);
  }
  return dbInstance;
}

/**
 * 初始化数据库表结构
 */
async function initDatabase(db: SQLite.SQLiteDatabase) {
  // 景点表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS spots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      overview TEXT,
      description TEXT,
      latitude REAL,
      longitude REAL,
      category TEXT,
      image_url TEXT,
      audio_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 路线表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      route_type TEXT,
      duration TEXT,
      gradient TEXT,
      spot_order TEXT,
      spot_names TEXT,
      spot_details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 记忆表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT,
      original_content TEXT,
      polished_content TEXT,
      spot_name TEXT,
      spot_id TEXT,
      source_type TEXT,
      mood_tag TEXT,
      metadata_json TEXT,
      photo_url TEXT,
      voice_url TEXT,
      voice_duration INTEGER,
      is_capsule INTEGER DEFAULT 0,
      capsule_unlock_at TEXT,
      capsule_content TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // 用户画像表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      session_id TEXT PRIMARY KEY,
      nickname TEXT,
      avatar_url TEXT,
      travel_style TEXT,
      interests TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 成就表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      unlocked_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 旅程总结表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS journey_summaries (
      id INTEGER PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT,
      content TEXT,
      spot_count INTEGER,
      memory_count INTEGER,
      date_range TEXT,
      cover_image_url TEXT,
      created_at TEXT
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_memories_session_created
      ON memories(session_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_journey_summaries_session_created
      ON journey_summaries(session_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_achievements_session_unlocked
      ON achievements(session_id, unlocked_at DESC);
  `);
}

// ============ 景点数据操作 ============

export interface SpotRow {
  id: string;
  name: string;
  overview?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * 保存景点数据
 */
export async function saveSpot(spot: SpotRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO spots (id, name, overview, description, latitude, longitude, category, image_url, audio_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [spot.id, spot.name, spot.overview ?? null, spot.description ?? null, spot.latitude ?? null, spot.longitude ?? null, spot.category ?? null, spot.image_url ?? null, spot.audio_url ?? null]
  );
}

/**
 * 批量保存景点数据（事务）
 */
export async function saveSpots(spots: SpotRow[]): Promise<void> {
  if (spots.length === 0) return;
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const spot of spots) {
      await db.runAsync(
        `INSERT OR REPLACE INTO spots (id, name, overview, description, latitude, longitude, category, image_url, audio_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [spot.id, spot.name, spot.overview ?? null, spot.description ?? null, spot.latitude ?? null, spot.longitude ?? null, spot.category ?? null, spot.image_url ?? null, spot.audio_url ?? null]
      );
    }
  });
}

/**
 * 获取单个景点
 */
export async function getSpot(id: string): Promise<SpotRow | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<SpotRow>(
    'SELECT * FROM spots WHERE id = ?',
    [id]
  );
  return result;
}

/**
 * 获取所有景点
 */
export async function getAllSpots(): Promise<SpotRow[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<SpotRow>('SELECT * FROM spots ORDER BY name');
  return result;
}

// ============ 路线数据操作 ============

export interface RouteRow {
  id: string;
  name: string;
  description?: string | null;
  route_type?: string | null;
  duration?: string | null;
  gradient?: string | null;
  spot_order?: string | null; // JSON string
  spot_names?: string | null; // JSON string
  spot_details?: string | null; // JSON string
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * 保存路线数据
 */
export async function saveRoute(route: RouteRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO routes (id, name, description, route_type, duration, gradient, spot_order, spot_names, spot_details, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [route.id, route.name, route.description ?? null, route.route_type ?? null, route.duration ?? null, route.gradient ?? null, route.spot_order ?? null, route.spot_names ?? null, route.spot_details ?? null]
  );
}

/**
 * 批量保存路线数据（事务）
 */
export async function saveRoutes(routes: RouteRow[]): Promise<void> {
  if (routes.length === 0) return;
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const route of routes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO routes (id, name, description, route_type, duration, gradient, spot_order, spot_names, spot_details, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [route.id, route.name, route.description ?? null, route.route_type ?? null, route.duration ?? null, route.gradient ?? null, route.spot_order ?? null, route.spot_names ?? null, route.spot_details ?? null]
      );
    }
  });
}

/**
 * 获取单个路线
 */
export async function getRoute(id: string): Promise<RouteRow | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<RouteRow>(
    'SELECT * FROM routes WHERE id = ?',
    [id]
  );
  return result;
}

/**
 * 获取所有路线
 */
export async function getAllRoutes(): Promise<RouteRow[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<RouteRow>('SELECT * FROM routes ORDER BY name');
  return result;
}

// ============ 记忆数据操作 ============

export interface MemoryRow {
  id: number;
  session_id: string;
  title?: string | null;
  original_content?: string | null;
  polished_content?: string | null;
  spot_name?: string | null;
  spot_id?: string | null;
  source_type?: string | null;
  mood_tag?: string | null;
  metadata_json?: string | null;
  photo_url?: string | null;
  voice_url?: string | null;
  voice_duration?: number | null;
  is_capsule?: number | null;
  capsule_unlock_at?: string | null;
  capsule_content?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * 保存记忆数据
 */
export async function saveMemory(memory: MemoryRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO memories (id, session_id, title, original_content, polished_content, spot_name, spot_id, source_type, mood_tag, metadata_json, photo_url, voice_url, voice_duration, is_capsule, capsule_unlock_at, capsule_content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      memory.id,
      memory.session_id,
      memory.title || null,
      memory.original_content || null,
      memory.polished_content || null,
      memory.spot_name || null,
      memory.spot_id || null,
      memory.source_type || null,
      memory.mood_tag || null,
      memory.metadata_json || null,
      memory.photo_url || null,
      memory.voice_url || null,
      memory.voice_duration || null,
      memory.is_capsule || 0,
      memory.capsule_unlock_at || null,
      memory.capsule_content || null,
      memory.created_at || null,
    ]
  );
}

/**
 * 批量保存记忆数据
 */
export async function saveMemories(memories: MemoryRow[]): Promise<void> {
  if (memories.length === 0) return;
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const memory of memories) {
      await db.runAsync(
        `INSERT OR REPLACE INTO memories (id, session_id, title, original_content, polished_content, spot_name, spot_id, source_type, mood_tag, metadata_json, photo_url, voice_url, voice_duration, is_capsule, capsule_unlock_at, capsule_content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          memory.id,
          memory.session_id,
          memory.title || null,
          memory.original_content || null,
          memory.polished_content || null,
          memory.spot_name || null,
          memory.spot_id || null,
          memory.source_type || null,
          memory.mood_tag || null,
          memory.metadata_json || null,
          memory.photo_url || null,
          memory.voice_url || null,
          memory.voice_duration || null,
          memory.is_capsule || 0,
          memory.capsule_unlock_at || null,
          memory.capsule_content || null,
          memory.created_at || null,
        ]
      );
    }
  });
}

/**
 * 获取指定会话的所有记忆
 */
export async function getMemoriesBySession(
  sessionId: string,
  limit?: number,
  offset = 0,
): Promise<MemoryRow[]> {
  const db = await getDatabase();
  if (typeof limit === 'number') {
    const result = await db.getAllAsync<MemoryRow>(
      'SELECT * FROM memories WHERE session_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [sessionId, limit, offset]
    );
    return result;
  }

  const result = await db.getAllAsync<MemoryRow>(
    'SELECT * FROM memories WHERE session_id = ? ORDER BY created_at DESC',
    [sessionId]
  );
  return result;
}

// ============ 用户画像操作 ============

export interface UserProfileRow {
  session_id: string;
  nickname?: string | null;
  avatar_url?: string | null;
  travel_style?: string | null;
  interests?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * 保存用户画像
 */
export async function saveUserProfile(profile: UserProfileRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profiles (session_id, nickname, avatar_url, travel_style, interests, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      profile.session_id,
      profile.nickname || null,
      profile.avatar_url || null,
      profile.travel_style || null,
      profile.interests || null,
    ]
  );
}

/**
 * 获取用户画像
 */
export async function getUserProfile(sessionId: string): Promise<UserProfileRow | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<UserProfileRow>(
    'SELECT * FROM user_profiles WHERE session_id = ?',
    [sessionId]
  );
  return result;
}

// ============ 成就操作 ============

export interface AchievementRow {
  id: string;
  session_id: string;
  name?: string | null;
  description?: string | null;
  icon_url?: string | null;
  unlocked_at?: string | null;
  created_at?: string | null;
}

/**
 * 保存成就
 */
export async function saveAchievement(achievement: AchievementRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO achievements (id, session_id, name, description, icon_url, unlocked_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      achievement.id,
      achievement.session_id,
      achievement.name || null,
      achievement.description || null,
      achievement.icon_url || null,
      achievement.unlocked_at || null,
    ]
  );
}

/**
 * 批量保存成就
 */
export async function saveAchievements(achievements: AchievementRow[]): Promise<void> {
  const db = await getDatabase();
  for (const achievement of achievements) {
    await saveAchievement(achievement);
  }
}

/**
 * 获取指定会话的所有成就
 */
export async function getAchievementsBySession(sessionId: string): Promise<AchievementRow[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<AchievementRow>(
    'SELECT * FROM achievements WHERE session_id = ? ORDER BY unlocked_at DESC',
    [sessionId]
  );
  return result;
}

// ============ 旅程总结操作 ============

export interface JourneySummaryRow {
  id: number;
  session_id: string;
  title?: string | null;
  content?: string | null;
  spot_count?: number | null;
  memory_count?: number | null;
  date_range?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
}

/**
 * 保存旅程总结
 */
export async function saveJourneySummary(summary: JourneySummaryRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO journey_summaries (id, session_id, title, content, spot_count, memory_count, date_range, cover_image_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      summary.id,
      summary.session_id,
      summary.title || null,
      summary.content || null,
      summary.spot_count || null,
      summary.memory_count || null,
      summary.date_range || null,
      summary.cover_image_url || null,
      summary.created_at || null,
    ]
  );
}

/**
 * 获取最新的旅程总结
 */
export async function getLatestSummary(sessionId: string): Promise<JourneySummaryRow | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<JourneySummaryRow>(
    'SELECT * FROM journey_summaries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
    [sessionId]
  );
  return result;
}

// ============ 缓存管理 ============

/**
 * 清除所有缓存数据
 */
export async function clearAllCache(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM spots;
    DELETE FROM routes;
    DELETE FROM memories;
    DELETE FROM user_profiles;
    DELETE FROM achievements;
    DELETE FROM journey_summaries;
  `);
}

/**
 * 清除指定会话的缓存数据
 */
export async function clearSessionCache(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM memories WHERE session_id = ?', [sessionId]);
  await db.runAsync('DELETE FROM achievements WHERE session_id = ?', [sessionId]);
  await db.runAsync('DELETE FROM journey_summaries WHERE session_id = ?', [sessionId]);
  await db.runAsync('DELETE FROM user_profiles WHERE session_id = ?', [sessionId]);
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  spots: number;
  routes: number;
  memories: number;
  achievements: number;
}> {
  const db = await getDatabase();
  const spots = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM spots');
  const routes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM routes');
  const memories = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM memories');
  const achievements = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM achievements');

  return {
    spots: spots?.count || 0,
    routes: routes?.count || 0,
    memories: memories?.count || 0,
    achievements: achievements?.count || 0,
  };
}
