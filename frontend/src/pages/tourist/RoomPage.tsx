import React, { useCallback, useState } from 'react';
import { Input, message as antMsg, Tag } from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  LoginOutlined,
  WifiOutlined,
  DisconnectOutlined,
  CopyOutlined,
  CheckOutlined,
  LinkOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { createRoom, joinRoom } from '../../api/room';
import { useRoomWebSocket } from '../../hooks/useRoomWebSocket';

type PageState = 'lobby' | 'room';

const AVATAR_COLORS = ['#1A5FB4', '#C8882E', '#2D8B57', '#9B59B6', '#DC4444', '#3584E4'];

const RoomCard: React.FC = () => {
  const [state, setState] = useState<PageState>('lobby');
  const [nickName, setNickName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    connected,
    members,
    itinerary,
    connect,
    disconnect,
  } = useRoomWebSocket({
    roomId: currentRoomId,
    memberName: nickName,
    onError: (err) => antMsg.error(err),
  });

  const handleCreate = useCallback(async () => {
    if (!nickName.trim()) {
      antMsg.warning('请输入昵称');
      return;
    }
    setLoading(true);
    try {
      const room = await createRoom(nickName.trim());
      setCurrentRoomId(room.room_id);
      setState('room');
      setTimeout(() => connect(), 100);
    } catch {
      antMsg.error('创建房间失败');
    } finally {
      setLoading(false);
    }
  }, [nickName, connect]);

  const handleJoin = useCallback(async () => {
    if (!nickName.trim()) {
      antMsg.warning('请输入昵称');
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      antMsg.warning('请输入6位房间号');
      return;
    }
    setLoading(true);
    try {
      const room = await joinRoom(roomCode.trim(), nickName.trim());
      setCurrentRoomId(room.room_id);
      setState('room');
      setTimeout(() => connect(), 100);
    } catch {
      antMsg.error('加入房间失败');
    } finally {
      setLoading(false);
    }
  }, [nickName, roomCode, connect]);

  const handleLeave = useCallback(() => {
    disconnect();
    setState('lobby');
    setCurrentRoomId('');
  }, [disconnect]);

  const handleCopyRoomId = useCallback(() => {
    navigator.clipboard?.writeText(currentRoomId).then(() => {
      setCopied(true);
      antMsg.success('房间号已复制');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentRoomId]);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  if (state === 'lobby') {
    return (
      <div data-testid="room-lobby" style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
      }}>
        {/* Feature Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { icon: <ThunderboltOutlined />, label: '实时同步', color: '#1A5FB4' },
            { icon: <TeamOutlined />, label: '多人讲解', color: '#C8882E' },
            { icon: <LinkOutlined />, label: '共享行程', color: '#2D8B57' },
          ].map((tag, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: `${tag.color}10`,
              color: tag.color,
              fontSize: '14px',
              fontWeight: 500,
              animation: `fadeInUp 250ms ease-out ${i * 60}ms both`,
            }}>
              {tag.icon} {tag.label}
            </div>
          ))}
        </div>

        {/* Nickname Input */}
        <Input
          placeholder="输入你的昵称"
          value={nickName}
          onChange={(e) => setNickName(e.target.value)}
          style={{ height: 46, fontSize: '15px' }}
        />

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #C8882E, #E8A838)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'transform 150ms ease',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <PlusOutlined /> {loading ? '创建中...' : '创建房间'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          color: 'var(--text-tertiary)', fontSize: '14px',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span>或加入已有房间</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

        {/* Join */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Input
            placeholder="6位房间号"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            style={{ height: 46, flex: 1, fontSize: '15px' }}
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0 20px',
              height: 46,
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <LoginOutlined /> 加入
          </button>
        </div>
      </div>
    );
  }

  // Room State
  return (
    <div data-testid="room-page" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      height: '100%',
    }}>
      {/* Room Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '20px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-primary)',
            letterSpacing: '4px',
          }}>
            {currentRoomId}
          </span>
          <button
            onClick={handleCopyRoomId}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '5px 10px',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-card)',
              cursor: 'pointer',
              fontSize: '14px',
              color: copied ? 'var(--color-success)' : 'var(--text-tertiary)',
              transition: 'all 200ms ease',
            }}
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
          <Tag
            color={connected ? 'green' : 'default'}
            style={{ margin: 0, fontSize: '13px', padding: '2px 10px' }}
          >
            {connected ? <><WifiOutlined /> 在线</> : <><DisconnectOutlined /> 离线</>}
          </Tag>
        </div>
        <button
          onClick={handleLeave}
          style={{
            padding: '5px 14px',
            fontSize: '13px',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-pill)',
            background: 'transparent',
            color: 'var(--color-error)',
            cursor: 'pointer',
          }}
        >
          离开
        </button>
      </div>

      {/* Members */}
      <div>
        <div style={{
          fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: '10px',
        }}>
          同行伙伴 ({members.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {members.map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 14px',
              backgroundColor: m.role === 'creator' ? 'var(--color-primary-bg)' : 'var(--surface-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              fontSize: '14px',
              animation: `fadeInUp 200ms ease-out ${i * 50}ms both`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '14px', fontWeight: 700,
              }}>
                {getInitial(m.name)}
              </div>
              <span style={{ fontWeight: m.role === 'creator' ? 600 : 400, color: 'var(--text-primary)' }}>
                {m.name}
              </span>
              {m.role === 'creator' && (
                <span style={{
                  fontSize: '12px', padding: '2px 8px',
                  background: 'var(--color-primary)', color: '#fff',
                  borderRadius: 'var(--radius-pill)',
                }}>房主</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Itinerary Timeline */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: '10px',
        }}>
          共享行程
        </div>
        {itinerary.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: '14px',
            backgroundColor: 'var(--surface-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-light)',
          }}>
            暂无行程，在对话中让数字人规划
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '26px' }}>
            {/* Timeline Line */}
            <div style={{
              position: 'absolute',
              left: 9,
              top: 10,
              bottom: 10,
              width: '2.5px',
              background: 'linear-gradient(to bottom, var(--color-primary), var(--color-accent))',
              borderRadius: '1px',
            }} />
            {itinerary.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '10px 0',
                position: 'relative',
                animation: `fadeInUp 250ms ease-out ${i * 60}ms both`,
              }}>
                {/* Timeline Dot */}
                <div style={{
                  position: 'absolute',
                  left: -26,
                  top: 12,
                  width: 20, height: 20, borderRadius: '50%',
                  background: i === 0
                    ? 'linear-gradient(135deg, #1A5FB4, #3584E4)'
                    : 'var(--surface-card)',
                  border: i === 0 ? 'none' : '2.5px solid var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                  color: i === 0 ? '#fff' : 'var(--color-primary)',
                  zIndex: 1,
                }}>
                  {i + 1}
                </div>
                <div style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: i === 0 ? 'var(--color-primary-bg)' : 'var(--surface-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{
                    fontSize: '15px', fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {item.spot_name}
                  </div>
                  {item.time && (
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                      {item.time}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomCard;
