import { useCallback, useState } from 'react';
import { message } from 'antd';
import { syncSpotToRoom, type SyncToRoomResult } from '../api/vision';

interface UseVisionRoomSyncOptions {
  roomId: string | null;
  onSuccess?: (result: SyncToRoomResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for syncing vision identification results to a collaborative room.
 *
 * Usage:
 *   const { syncResult, syncing, syncToRoom } = useVisionRoomSync({
 *     roomId: currentRoomId,
 *     onSuccess: (r) => message.success(`已同步 ${r.spot_name}`),
 *   });
 */
export function useVisionRoomSync(options: UseVisionRoomSyncOptions) {
  const { roomId, onSuccess, onError } = options;
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncToRoomResult | null>(null);

  const syncToRoom = useCallback(
    async (spotName: string, confidence: number, note?: string) => {
      if (!roomId) {
        message.warning('请先加入协同房间');
        return null;
      }

      if (!spotName || spotName === '未知景点' || spotName === '识别失败') {
        message.warning('无法同步：景点识别失败');
        return null;
      }

      if (confidence < 0.3) {
        message.warning(`识别可信度过低 (${Math.round(confidence * 100)}%)，无法同步`);
        return null;
      }

      setSyncing(true);
      try {
        const result = await syncSpotToRoom({
          room_id: roomId,
          spot_name: spotName,
          confidence,
          note: note || `拍照识别 (${Math.round(confidence * 100)}% 可信度)`,
        });
        setLastResult(result);
        message.success(`"${spotName}" 已同步到房间行程`);
        onSuccess?.(result);
        return result;
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.detail ||
          err?.message ||
          '同步失败，请稍后重试';
        message.error(errMsg);
        onError?.(errMsg);
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [roomId, onSuccess, onError],
  );

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    syncing,
    lastResult,
    syncToRoom,
    clearResult,
    canSync: !!roomId && !syncing,
  };
}
