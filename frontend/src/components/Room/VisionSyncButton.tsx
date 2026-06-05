import React from 'react';
import { Button, Tooltip } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';

interface VisionSyncButtonProps {
  spotName: string;
  confidence: number;
  onSync: () => void;
  syncing: boolean;
  disabled?: boolean;
  roomId?: string | null;
}

/**
 * Button to sync a vision-identified scenic spot to a collaborative room.
 * Shows only when the user has joined a room (roomId is present).
 */
const VisionSyncButton: React.FC<VisionSyncButtonProps> = ({
  spotName,
  confidence,
  onSync,
  syncing,
  disabled = false,
  roomId,
}) => {
  if (!roomId) {
    return null; // Don't show if user hasn't joined a room
  }

  const confidencePercent = Math.round(confidence * 100);
  const tooltipTitle =
    confidencePercent >= 70
      ? `将"${spotName}"同步到房间行程（可信度 ${confidencePercent}%）`
      : `可信度较低 (${confidencePercent}%)，建议重新拍照`;

  return (
    <Tooltip title={tooltipTitle}>
      <Button
        type="primary"
        icon={syncing ? <LoadingOutlined /> : <SendOutlined />}
        onClick={onSync}
        disabled={disabled || syncing || confidence < 0.3}
        loading={syncing}
        style={{
          borderRadius: 'var(--radius-xl)',
          height: 44,
          paddingLeft: '24px',
          paddingRight: '24px',
          background:
            syncing || disabled
              ? undefined
              : 'linear-gradient(135deg, #C8882E 0%, #E8A838 100%)',
          border: 'none',
          boxShadow:
            syncing || disabled
              ? undefined
              : '0 2px 8px rgba(200, 136, 46, 0.3)',
        }}
      >
        {syncing ? '同步中...' : `同步到协同房间 · 房间 ${roomId}`}
      </Button>
    </Tooltip>
  );
};

export default VisionSyncButton;
