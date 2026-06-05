import React, { useState, useEffect, useCallback } from 'react';
import { EnvironmentOutlined, TeamOutlined, CameraOutlined } from '@ant-design/icons';
import PhotoCapture from '../../components/Vision/PhotoCapture';
import InkMap from '../../components/common/InkMap';
import type { VisionResult } from '../../api/vision';
import QRScanCard from './QRScan';
import type { Spot } from '../../api/spots';
import RoomCard from './RoomPage';
import { useNavigate } from 'react-router-dom';

const TouristDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [lastVisionResult, setLastVisionResult] = useState<VisionResult | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleVisionResult = (result: VisionResult) => {
    setLastVisionResult(result);
  };

  const handleGoToChat = () => {
    if (lastVisionResult) {
      navigate('/', {
        state: {
          fromVision: true,
          spotName: lastVisionResult.spot_name,
          explanation: lastVisionResult.explanation,
        },
      });
    }
  };

  const handleQRScan = useCallback((spot: Spot) => {
    navigate('/', {
      state: {
        fromQR: true,
        spotId: spot.id,
        spotName: spot.name,
      },
    });
  }, [navigate]);

  const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
  };

  const iconBox = (bg: string) => ({
    width: 42, height: 42, borderRadius: '12px',
    background: bg,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    color: '#fff', fontSize: '18px',
  });

  return (
    <div data-testid="tourist-dashboard" className="celadon-mountain-bg paper-texture" style={{
      paddingBottom: isMobile ? '70px' : '20px',
    }}>
      <div style={{
        padding: isMobile ? '12px' : '16px 24px',
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '14px' : '18px',
      }}>
        {/* 水墨景区地图 */}
        <div className="section-card" style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBox('linear-gradient(135deg, #2A2520, #5C554C)')}>
                <EnvironmentOutlined />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  景区导览
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                  点击景点查看介绍
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <InkMap />
          </div>
        </div>

        {/* Photo Recognition — full width, tall */}
        <div className="section-card" style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: isMobile ? 380 : 440,
        }}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={iconBox('linear-gradient(135deg, #1A5FB4, #3584E4)')}>
                <CameraOutlined />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  拍照识景
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                  拍摄景点照片，AI 自动识别并讲解
                </div>
              </div>
            </div>
            {lastVisionResult && (
              <button
                onClick={handleGoToChat}
                style={{
                  padding: '8px 22px',
                  background: 'linear-gradient(135deg, #1A5FB4, #3584E4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(26,95,180,0.25)',
                  transition: 'transform 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                去对话页听数字人讲解
              </button>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <PhotoCapture
              onResult={handleVisionResult}
              onError={(err) => console.error('[TouristDashboard]', err)}
            />
          </div>
        </div>

        {/* Bottom Row: QR + Room side by side */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : '1fr 1fr',
          gap: isMobile ? '14px' : '18px',
        }}>
          {/* QR Scan */}
          <div className="section-card" style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: isMobile ? 300 : 360,
          }}>
            <div style={cardHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBox('linear-gradient(135deg, #2D8B57, #4ADE80)')}>
                  <EnvironmentOutlined />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    扫码定位
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                    扫描景区二维码获取讲解
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <QRScanCard onScan={handleQRScan} />
            </div>
          </div>

          {/* Room */}
          <div className="section-card" style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: isMobile ? 300 : 360,
          }}>
            <div style={cardHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBox('linear-gradient(135deg, #C8882E, #E8A838)')}>
                  <TeamOutlined />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    协同导览
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                    和朋友一起听讲解
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <RoomCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristDashboard;
