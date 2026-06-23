import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 拒绝后静默期管理
 * 实现渐进退避策略：用户拒绝提示后，逐步延长静默时间
 */

const STORAGE_KEY_PREFIX = 'guide_rejection_';

export interface RejectionRecord {
  type: string; // 提示类型：nearby | idle | detour
  count: number; // 拒绝次数
  lastRejectionTime: number; // 上次拒绝时间戳
  cooldownUntil: number; // 静默截止时间戳
}

/**
 * 渐进退避配置
 * 拒绝次数越多，静默时间越长
 */
const BACKOFF_CONFIG = {
  // 接近景点提示
  nearby: [
    { count: 1, cooldownMinutes: 60 }, // 第1次拒绝：静默1小时
    { count: 2, cooldownMinutes: 120 }, // 第2次拒绝：静默2小时
    { count: 3, cooldownMinutes: 360 }, // 第3次拒绝：静默6小时
    { count: 4, cooldownMinutes: 1440 }, // 第4次拒绝：静默24小时
  ],
  // 空闲提示
  idle: [
    { count: 1, cooldownMinutes: 120 }, // 第1次拒绝：静默2小时
    { count: 2, cooldownMinutes: 360 }, // 第2次拒绝：静默6小时
    { count: 3, cooldownMinutes: 1440 }, // 第3次拒绝：静默24小时
  ],
  // 偏离路线提示
  detour: [
    { count: 1, cooldownMinutes: 30 }, // 第1次拒绝：静默30分钟
    { count: 2, cooldownMinutes: 60 }, // 第2次拒绝：静默1小时
    { count: 3, cooldownMinutes: 180 }, // 第3次拒绝：静默3小时
  ],
};

/**
 * 记录用户拒绝提示
 */
export const recordRejection = async (
  sessionId: string,
  promptType: 'nearby' | 'idle' | 'detour',
): Promise<void> => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}_${promptType}`;
    const existing = await AsyncStorage.getItem(key);
    
    let record: RejectionRecord;
    if (existing) {
      record = JSON.parse(existing);
      record.count += 1;
    } else {
      record = {
        type: promptType,
        count: 1,
        lastRejectionTime: Date.now(),
        cooldownUntil: 0,
      };
    }

    // 计算静默时间
    const config = BACKOFF_CONFIG[promptType];
    const level = Math.min(record.count - 1, config.length - 1);
    const cooldownMinutes = config[level].cooldownMinutes;
    
    record.cooldownUntil = Date.now() + cooldownMinutes * 60 * 1000;
    record.lastRejectionTime = Date.now();

    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    console.error('Failed to record rejection:', error);
  }
};

/**
 * 检查是否处于静默期
 */
export const isInCooldown = async (
  sessionId: string,
  promptType: 'nearby' | 'idle' | 'detour',
): Promise<boolean> => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}_${promptType}`;
    const existing = await AsyncStorage.getItem(key);
    
    if (!existing) return false;
    
    const record: RejectionRecord = JSON.parse(existing);
    return Date.now() < record.cooldownUntil;
  } catch (error) {
    console.error('Failed to check cooldown:', error);
    return false;
  }
};

/**
 * 获取静默期剩余时间（分钟）
 */
export const getCooldownRemaining = async (
  sessionId: string,
  promptType: 'nearby' | 'idle' | 'detour',
): Promise<number> => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}_${promptType}`;
    const existing = await AsyncStorage.getItem(key);
    
    if (!existing) return 0;
    
    const record: RejectionRecord = JSON.parse(existing);
    const remaining = record.cooldownUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  } catch (error) {
    console.error('Failed to get cooldown remaining:', error);
    return 0;
  }
};

/**
 * 重置拒绝记录（用户主动恢复提示）
 */
export const resetRejection = async (
  sessionId: string,
  promptType: 'nearby' | 'idle' | 'detour',
): Promise<void> => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}_${promptType}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to reset rejection:', error);
  }
};

/**
 * 重置所有拒绝记录
 */
export const resetAllRejections = async (sessionId: string): Promise<void> => {
  try {
    const types = ['nearby', 'idle', 'detour'];
    for (const type of types) {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}_${type}`;
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to reset all rejections:', error);
  }
};

/**
 * 获取拒绝统计
 */
export const getRejectionStats = async (
  sessionId: string,
): Promise<Record<string, RejectionRecord>> => {
  try {
    const stats: Record<string, RejectionRecord> = {};
    const types = ['nearby', 'idle', 'detour'];
    
    for (const type of types) {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}_${type}`;
      const existing = await AsyncStorage.getItem(key);
      if (existing) {
        stats[type] = JSON.parse(existing);
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get rejection stats:', error);
    return {};
  }
};
