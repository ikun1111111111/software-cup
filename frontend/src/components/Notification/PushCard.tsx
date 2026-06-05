import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'antd';
import { AudioOutlined, EnvironmentOutlined, CloseOutlined, BellOutlined } from '@ant-design/icons';
import type { PushNotification } from '../../api/push';

interface PushCardProps {
  notification: PushNotification;
  onListen: (spotName: string) => void;
  onNavigate: (spotName: string) => void;
  onDismiss: () => void;
  autoCollapseMs?: number;
}

const PushCard: React.FC<PushCardProps> = ({
  notification,
  onListen,
  onNavigate,
  onDismiss,
  autoCollapseMs = 5000,
}) => {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setExpanded(false), autoCollapseMs);
    return () => clearTimeout(timer);
  }, [autoCollapseMs]);

  const handleListen = useCallback(() => {
    onListen(notification.spot_name);
    onDismiss();
  }, [notification.spot_name, onListen, onDismiss]);

  const handleNavigate = useCallback(() => {
    onNavigate(notification.spot_name);
    onDismiss();
  }, [notification.spot_name, onNavigate, onDismiss]);

  if (!expanded) {
    return (
      <button
        data-testid="push-card-collapsed"
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed',
          top: 70,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
          border: 'none',
          color: '#fff',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(26, 95, 180, 0.4)',
          zIndex: 1000,
        }}
      >
        <BellOutlined />
      </button>
    );
  }

  return (
    <div
      data-testid="push-card"
      className="animate-fade-in-up"
      style={{
        position: 'fixed',
        top: 70,
        right: 20,
        width: 320,
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 24px rgba(26, 22, 20, 0.12)',
        border: '1px solid var(--border-light)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(26,95,180,0.08) 0%, rgba(53,132,228,0.05) 100%)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BellOutlined style={{ color: '#1A5FB4', fontSize: '16px' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {notification.spot_name}
          </span>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
            padding: '4px',
          }}
        >
          <CloseOutlined />
        </button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: '12px',
        }}>
          {notification.brief}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--color-primary)',
          fontWeight: 500,
          marginBottom: '14px',
        }}>
          {notification.action_hint}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="primary"
            icon={<AudioOutlined />}
            onClick={handleListen}
            style={{
              flex: 1,
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
              border: 'none',
              height: 36,
            }}
          >
            听讲解
          </Button>
          <Button
            icon={<EnvironmentOutlined />}
            onClick={handleNavigate}
            style={{
              borderRadius: 'var(--radius-xl)',
              height: 36,
            }}
          >
            导航
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PushCard;
