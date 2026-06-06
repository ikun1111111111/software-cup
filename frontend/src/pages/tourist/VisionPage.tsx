import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { MessageOutlined, ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import PhotoCapture from '../../components/Vision/PhotoCapture';
import VisionSyncButton from '../../components/Room/VisionSyncButton';
import { useVisionRoomSync } from '../../hooks/useVisionRoomSync';
import type { VisionResult } from '../../api/vision';

const VisionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile] = useState(window.innerWidth < 768);
  const [lastResult, setLastResult] = useState<VisionResult | null>(null);
  const [roomId, setRoomId] = useState<string | null>(
    () => sessionStorage.getItem('active_room_id'),
  );

  // Listen for room changes from other tabs/components
  React.useEffect(() => {
    const handler = () => {
      setRoomId(sessionStorage.getItem('active_room_id'));
    };
    window.addEventListener('room_changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('room_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const { syncing, syncToRoom } = useVisionRoomSync({
    roomId,
    onSuccess: (result) => {
      console.log('[VisionPage] Synced to room:', result);
    },
  });

  const handleResult = useCallback((result: VisionResult) => {
    setLastResult(result);
  }, []);

  const handleSyncToRoom = useCallback(() => {
    if (!lastResult) return;
    syncToRoom(lastResult.spot_name, lastResult.confidence);
  }, [lastResult, syncToRoom]);

  const handleGoToChat = useCallback(() => {
    if (lastResult) {
      navigate('/', {
        state: {
          fromVision: true,
          spotName: lastResult.spot_name,
          explanation: lastResult.explanation,
        },
      });
    }
  }, [lastResult, navigate]);

  const handleGoToRoom = useCallback(() => {
    navigate('/room');
  }, [navigate]);

  return (
    <div data-testid="vision-page" className="celadon-mountain-bg" style={{
      display: 'flex',
      flexDirection: 'column',
      height: isMobile
        ? 'calc(100vh - 56px - 56px)'
        : 'calc(100vh - 56px - 48px)',
      backgroundColor: 'var(--surface-bg)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: '1px solid var(--border-light)',
        backgroundColor: 'var(--surface-card)',
        flexShrink: 0,
      }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ padding: '4px 8px' }}
        />
        <div style={{
          fontSize: isMobile ? '15px' : '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          flex: 1,
        }}>
          拍照识景点
        </div>
        {!roomId && (
          <Button
            type="text"
            icon={<TeamOutlined />}
            onClick={handleGoToRoom}
            style={{
              fontSize: '13px',
              color: 'var(--text-tertiary)',
            }}
          >
            加入房间
          </Button>
        )}
        {roomId && (
          <span style={{
            fontSize: '13px',
            color: 'var(--color-primary)',
            fontWeight: 500,
          }}>
            房间 {roomId}
          </span>
        )}
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 2px 12px rgba(26, 22, 20, 0.06)',
          overflow: 'hidden',
        }}>
          <PhotoCapture
            onResult={handleResult}
            onError={(err) => console.error('[VisionPage]', err)}
          />
        </div>
      </div>

      {lastResult && (
        <div style={{
          padding: isMobile ? '12px 16px' : '12px 24px',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--surface-card)',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          <Button
            type="primary"
            icon={<MessageOutlined />}
            onClick={handleGoToChat}
            style={{
              borderRadius: 'var(--radius-xl)',
              height: 44,
              paddingLeft: '24px',
              paddingRight: '24px',
              background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(26, 95, 180, 0.3)',
            }}
          >
            去对话页听数字人讲解
          </Button>
          <VisionSyncButton
            spotName={lastResult.spot_name}
            confidence={lastResult.confidence}
            onSync={handleSyncToRoom}
            syncing={syncing}
            roomId={roomId}
          />
        </div>
      )}
    </div>
  );
};

export default VisionPage;
