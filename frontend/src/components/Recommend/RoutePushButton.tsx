import React, { useState, useCallback } from 'react';
import { Button, message, Tooltip } from 'antd';
import { SendOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { addSpotToItinerary } from '../../api/room';
import type { RecommendationResult } from '../../api/routes';

interface RoutePushButtonProps {
  roomId: string | null;
  recommendations: RecommendationResult[];
  onPushComplete?: (count: number) => void;
}

/**
 * Button to push all recommended routes' spots to a collaborative room.
 */
const RoutePushButton: React.FC<RoutePushButtonProps> = ({
  roomId,
  recommendations,
  onPushComplete,
}) => {
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [pushedCount, setPushedCount] = useState(0);

  const handlePushAll = useCallback(async () => {
    if (!roomId) {
      message.warning('请先加入协同房间');
      return;
    }

    if (recommendations.length === 0) {
      message.warning('没有可推送的路线');
      return;
    }

    setPushing(true);
    let successCount = 0;

    try {
      for (const rec of recommendations) {
        try {
          await addSpotToItinerary(roomId, {
            spot_name: rec.route_name,
            source: 'recommend',
            confidence: rec.score,
            note: rec.reason,
          });
          successCount++;
        } catch {
          // Skip individual failures
        }
      }

      setPushedCount(successCount);
      setPushed(true);

      if (successCount > 0) {
        message.success(`${successCount} 个景点已推送到房间行程`);
        onPushComplete?.(successCount);
      } else {
        message.warning('所有景点已存在，无需重复推送');
      }

      setTimeout(() => setPushed(false), 3000);
    } catch {
      message.error('推送失败，请稍后重试');
    } finally {
      setPushing(false);
    }
  }, [roomId, recommendations, onPushComplete]);

  if (!roomId) return null;

  return (
    <Tooltip title={`将 ${recommendations.length} 个推荐路线推送到协同房间行程`}>
      <Button
        type="primary"
        icon={
          pushing ? (
            <LoadingOutlined />
          ) : pushed ? (
            <CheckCircleOutlined />
          ) : (
            <SendOutlined />
          )
        }
        onClick={handlePushAll}
        disabled={pushing || recommendations.length === 0}
        loading={pushing}
        style={{
          borderRadius: 'var(--radius-xl)',
          height: 44,
          paddingLeft: '24px',
          paddingRight: '24px',
          background:
            pushed
              ? 'var(--color-success)'
              : pushing
              ? undefined
              : 'linear-gradient(135deg, #C8882E 0%, #E8A838 100%)',
          border: 'none',
          boxShadow: pushing
            ? undefined
            : '0 2px 8px rgba(200, 136, 46, 0.3)',
        }}
      >
        {pushing
          ? `推送中 (${pushedCount}/${recommendations.length})...`
          : pushed
          ? `已推送 ${pushedCount} 个景点`
          : `全部推送到房间 · 房间 ${roomId}`}
      </Button>
    </Tooltip>
  );
};

export default RoutePushButton;
