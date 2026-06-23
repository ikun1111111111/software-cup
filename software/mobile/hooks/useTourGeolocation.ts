import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

// ============ 类型定义 ============

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;   // 精度(m)
  timestamp: number;
}

export type DistanceLevel = 'far' | 'near' | 'close' | 'arrived' | 'unknown';

export interface DistanceInfo {
  spotId: string;
  spotName: string;
  spotLat: number;
  spotLng: number;
  distance: number;     // 距离(米)
  level: DistanceLevel;
}

// ============ Haversine 距离计算 ============

/**
 * 计算两点间的Haversine距离(米)
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371e3; // 地球半径(米)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 根据距离判断level
 */
export function getDistanceLevel(distance: number): DistanceLevel {
  if (distance <= 15) return 'arrived';
  if (distance <= 50) return 'close';
  if (distance <= 200) return 'near';
  return 'far';
}

// ============ Hook ============

interface UseTourGeolocationOptions {
  enabled?: boolean;            // 是否启用定位
  pollingInterval?: number;     // 轮询间隔(ms)，默认5000
  onDistanceChange?: (info: DistanceInfo) => void; // 距离变化回调
}

/**
 * GPS定位Hook
 * 持续获取用户GPS坐标，计算与目标景点的距离
 */
export function useTourGeolocation(
  targetSpot: { id: string; name: string; latitude?: number; longitude?: number } | null,
  options: UseTourGeolocationOptions = {},
) {
  const {
    enabled = true,
    pollingInterval = 5000,
    onDistanceChange,
  } = options;

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchingRef = useRef<Location.LocationSubscription | null>(null);
  const lastLevelRef = useRef<DistanceLevel>('unknown');

  // 请求位置权限
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('需要位置权限才能使用导航功能');
        setPermissionGranted(false);
        return false;
      }
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (e) {
      setError('无法获取位置权限');
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // 获取单次定位
  const getCurrentLocation = useCallback(async (): Promise<UserLocation | null> => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newLoc: UserLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 0,
        timestamp: loc.timestamp,
      };
      setUserLocation(newLoc);
      return newLoc;
    } catch (e) {
      return null;
    }
  }, []);

  // 开始持续监听
  const startWatching = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: pollingInterval,
          distanceInterval: 10, // 移动10米以上才更新
        },
        (loc) => {
          const newLoc: UserLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || 0,
            timestamp: loc.timestamp,
          };
          setUserLocation(newLoc);
        },
      );
      watchingRef.current = subscription;
    } catch (e) {
      // 如果watchPosition不可用，降级为轮询
      console.warn('watchPosition不可用，降级为轮询模式');
      intervalRef.current = setInterval(() => {
        getCurrentLocation();
      }, pollingInterval);
    }
  }, [pollingInterval, requestPermission, getCurrentLocation]);

  // 停止监听
  const stopWatching = useCallback(() => {
    if (watchingRef.current) {
      try {
        watchingRef.current.remove();
      } catch {
        // Web 平台 expo-location 的 remove 可能不可用
      }
      watchingRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 计算距离
  useEffect(() => {
    if (!enabled || !userLocation || !targetSpot || !targetSpot.latitude || !targetSpot.longitude) {
      setDistanceInfo(null);
      return;
    }

    const distance = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      targetSpot.latitude,
      targetSpot.longitude,
    );
    const level = getDistanceLevel(distance);

    const info: DistanceInfo = {
      spotId: targetSpot.id,
      spotName: targetSpot.name,
      spotLat: targetSpot.latitude,
      spotLng: targetSpot.longitude,
      distance: Math.round(distance),
      level,
    };
    setDistanceInfo(info);

    // level变化时触发回调
    if (level !== lastLevelRef.current) {
      lastLevelRef.current = level;
      onDistanceChange?.(info);
    }
  }, [enabled, userLocation, targetSpot, onDistanceChange]);

  // 启动/停止定位
  useEffect(() => {
    if (!enabled) {
      stopWatching();
      return;
    }
    startWatching();
    return () => stopWatching();
  }, [enabled, startWatching, stopWatching]);

  // 初始获取一次位置
  useEffect(() => {
    if (enabled && !userLocation) {
      getCurrentLocation();
    }
  }, [enabled]);

  return {
    userLocation,
    distanceInfo,
    permissionGranted,
    error,
    requestPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
    isTracking: enabled,
  };
}
