import { useCallback, useEffect, useRef, useState } from 'react';
import { checkLocation, handlePushAction, PushNotification } from '../api/push';

interface UsePushNotificationOptions {
  userId: string;
  enabled?: boolean;
  intervalMs?: number;
  onNotification?: (notification: PushNotification) => void;
}

export function usePushNotification(options: UsePushNotificationOptions) {
  const { userId, enabled = true, intervalMs = 30000, onNotification } = options;
  const [notification, setNotification] = useState<PushNotification | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const check = useCallback(async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await checkLocation(userId, position.coords.latitude, position.coords.longitude);
          if (result.triggered && result.notification) {
            setNotification(result.notification);
            onNotification?.(result.notification);
          }
        } catch {
          // Silent fail
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [userId, onNotification]);

  const handleListen = useCallback(async (spotName: string) => {
    try {
      return await handlePushAction(spotName, 'listen');
    } catch {
      return null;
    }
  }, []);

  const handleNavigate = useCallback(async (spotName: string) => {
    try {
      return await handlePushAction(spotName, 'navigate');
    } catch {
      return null;
    }
  }, []);

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;

    check();
    intervalRef.current = setInterval(check, intervalMs);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [enabled, userId, intervalMs, check]);

  return {
    notification,
    handleListen,
    handleNavigate,
    dismiss,
    check,
  };
}
