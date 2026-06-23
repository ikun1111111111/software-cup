import * as Location from 'expo-location';
import { haversineDistance } from './useTourGeolocation';

// ============ 类型定义 ============

export interface CheckinResult {
  success: boolean;
  distance: number;       // 距离(米)
  message: string;
  spotId?: string;
  timestamp?: number;
}

export interface SpotLocation {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

// ============ 配置 ============

const CHECKIN_RADIUS = 30; // 打卡有效半径(米)
const GPS_ACCURACY_THRESHOLD = 100; // GPS精度阈值(米)

/**
 * 打卡校验 - 用户自由打卡，不校验GPS距离
 * @param spot 目标景点
 * @param customLocation 可选的自定义位置（用于测试）
 * @returns CheckinResult
 */
export async function checkInSpot(
  spot: SpotLocation,
  customLocation?: { latitude: number; longitude: number },
): Promise<CheckinResult> {
  // 用户自由打卡，不校验GPS距离
  return {
    success: true,
    distance: 0,
    message: `打卡成功！${spot.name}`,
    spotId: spot.id,
    timestamp: Date.now(),
  };
}

/**
 * 快速距离检查（不打卡，只返回距离）
 */
export async function checkDistanceToSpot(
  spot: SpotLocation,
): Promise<{ distance: number; inRange: boolean } | null> {
  if (!spot.latitude || !spot.longitude) {
    return null;
  }

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const distance = haversineDistance(
      loc.coords.latitude,
      loc.coords.longitude,
      spot.latitude,
      spot.longitude,
    );
    return {
      distance: Math.round(distance),
      inRange: distance <= CHECKIN_RADIUS,
    };
  } catch (e) {
    return null;
  }
}
