import React, { useCallback, useEffect, useState } from 'react';
import { ScanOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';

export interface QRScanProps {
  onScan?: (data: string) => void;
  onError?: (error: string) => void;
}

const LOCATIONS = [
  { id: '1', name: '灵山大佛', desc: '核心景点 · 高88米青铜佛像' },
  { id: '2', name: '梵宫', desc: '标志性建筑 · 佛教文化精髓' },
  { id: '3', name: '九龙灌浴', desc: '音乐喷泉 · 定时表演' },
  { id: '4', name: '五印坛城', desc: '藏传佛教 · 曼陀罗建筑' },
  { id: '5', name: '太湖观景台', desc: '自然风光 · 太湖全景' },
];

const QRScan: React.FC<QRScanProps> = ({
  onScan,
  onError,
}) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStartScan = useCallback(() => {
    setScanning(true);
    setResult(null);

    setTimeout(() => {
      const mockResult = 'https://scenic.example.com/location/灵山大佛';
      setResult(mockResult);
      setScanning(false);
      onScan?.(mockResult);
    }, 2000);
  }, [onScan]);

  const handleLocationSelect = useCallback((name: string) => {
    const mockResult = `https://scenic.example.com/location/${encodeURIComponent(name)}`;
    setResult(mockResult);
    onScan?.(mockResult);
  }, [onScan]);

  return (
    <div data-testid="qr-scan" style={{
      padding: isMobile ? '24px 16px' : '40px 24px',
      textAlign: 'center',
      maxWidth: '500px',
      margin: '0 auto',
      paddingBottom: isMobile ? '80px' : undefined,
    }}>
      <h2 style={{
        margin: '0 0 8px 0',
        fontSize: isMobile ? '18px' : '20px',
        fontWeight: 700,
        color: 'var(--text-primary)',
      }}>
        扫码定位
      </h2>
      <p style={{
        color: 'var(--text-tertiary)',
        fontSize: '14px',
        marginBottom: '28px',
      }}>
        扫描景区二维码，获取当前位置讲解
      </p>

      {/* Scan area with corner decorations */}
      <div
        data-testid="scan-area"
        style={{
          width: isMobile ? '240px' : '280px',
          height: isMobile ? '240px' : '280px',
          margin: '0 auto 28px',
          border: `2px dashed ${scanning ? 'var(--color-primary)' : 'var(--border-default)'}`,
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scanning
            ? 'var(--color-primary-bg)'
            : result
              ? 'var(--color-success-bg)'
              : 'var(--surface-card)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
        }}
      >
        {/* Corner decorations */}
        {!scanning && !result && (
          <>
            <div style={{ position: 'absolute', top: -1, left: -1, width: 24, height: 24, borderTop: '3px solid var(--color-primary)', borderLeft: '3px solid var(--color-primary)', borderRadius: '20px 0 0 0' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 24, height: 24, borderTop: '3px solid var(--color-primary)', borderRight: '3px solid var(--color-primary)', borderRadius: '0 20px 0 0' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 24, height: 24, borderBottom: '3px solid var(--color-primary)', borderLeft: '3px solid var(--color-primary)', borderRadius: '0 0 0 20px' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 24, height: 24, borderBottom: '3px solid var(--color-primary)', borderRight: '3px solid var(--color-primary)', borderRadius: '0 0 20px 0' }} />
          </>
        )}

        {scanning ? (
          <div data-testid="scanning-indicator">
            <ScanOutlined style={{
              fontSize: '52px',
              color: 'var(--color-primary)',
              marginBottom: '16px',
            }} spin />
            <div style={{
              color: 'var(--color-primary)',
              fontWeight: 500,
              fontSize: '15px',
            }}>
              扫描中...
            </div>
          </div>
        ) : result ? (
          <div data-testid="scan-result">
            <CheckCircleOutlined style={{
              fontSize: '52px',
              color: 'var(--color-success)',
              marginBottom: '16px',
            }} />
            <div style={{
              color: 'var(--color-success)',
              fontWeight: 600,
              fontSize: '15px',
            }}>
              扫描成功
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              marginTop: '8px',
            }}>
              {result}
            </div>
          </div>
        ) : (
          <div data-testid="scan-placeholder">
            <ScanOutlined style={{
              fontSize: '52px',
              color: 'var(--gray-300)',
              marginBottom: '16px',
            }} />
            <div style={{
              color: 'var(--text-tertiary)',
              fontSize: '14px',
            }}>
              点击下方按钮开始扫描
            </div>
          </div>
        )}
      </div>

      <button
        data-testid="scan-btn"
        onClick={handleStartScan}
        disabled={scanning}
        style={{
          padding: '12px 48px',
          backgroundColor: scanning ? 'var(--gray-300)' : 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          cursor: scanning ? 'not-allowed' : 'pointer',
          fontSize: '15px',
          fontWeight: 600,
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: scanning ? 'none' : '0 4px 12px rgba(26, 95, 180, 0.3)',
          minHeight: 48,
          marginBottom: '32px',
        }}
      >
        {scanning ? '扫描中...' : '开始扫描'}
      </button>

      {/* Manual location selection */}
      {!result && (
        <div className="animate-fade-in-up" style={{ textAlign: 'left' }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            或手动选择位置:
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleLocationSelect(loc.name)}
                className="card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  minHeight: 48,
                }}
              >
                <EnvironmentOutlined style={{
                  color: 'var(--color-primary)',
                  fontSize: '18px',
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                  }}>
                    {loc.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginTop: '2px',
                  }}>
                    {loc.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScan;
