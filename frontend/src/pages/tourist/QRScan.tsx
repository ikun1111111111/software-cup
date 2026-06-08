import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { listSpots, type Spot } from '../../api/spots';

export interface QRScanProps {
  onScan?: (spot: Spot) => void;
  onError?: (error: string) => void;
}

/**
 * Match a decoded QR code text against a list of spots.
 * Priority: exact ID match > exact QR code match > name fuzzy match.
 */
export function matchSpot(decodedText: string, spots: Spot[]): Spot | undefined {
  for (const spot of spots) {
    if (decodedText === spot.id) {
      return spot;
    }
    if (spot.qr_code && decodedText === spot.qr_code) {
      return spot;
    }
    if (decodedText.includes(spot.name)) {
      return spot;
    }
  }
  return undefined;
}

const QRScanCard: React.FC<QRScanProps> = ({ onScan, onError }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Spot | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const spotsRef = useRef<Spot[]>([]);
  useEffect(() => { spotsRef.current = spots; }, [spots]);

  // Load spots from API
  useEffect(() => {
    setLoading(true);
    listSpots()
      .then((res) => setSpots(res ?? []))
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const handleStartScan = useCallback(async () => {
    if (!containerRef.current) return;
    setScanning(true);
    setScanError(null);
    setResult(null);

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText: string) => {
          scanner.stop().catch(() => {});
          setScanning(false);

          const matchedSpot = matchSpot(decodedText, spotsRef.current);
          if (matchedSpot) {
            setResult(matchedSpot);
            onScan?.(matchedSpot);
          } else {
            const msg = `未识别的二维码: ${decodedText}`;
            setScanError(msg);
          }
        },
        () => {},
      );
    } catch (err: any) {
      setScanning(false);
      const msg = err?.message || '无法启动摄像头';
      setScanError(msg);
      onError?.(msg);
    }
  }, [onScan, onError]);

  const handleStopScan = useCallback(() => {
    scannerRef.current?.stop().catch(() => {});
    setScanning(false);
  }, []);

  const handleLocationSelect = useCallback((spot: Spot) => {
    setResult(spot);
    onScan?.(spot);
  }, [onScan]);

  const handleReset = useCallback(() => {
    handleStopScan();
    setResult(null);
    setScanError(null);
  }, [handleStopScan]);

  return (
    <div data-testid="qr-scan-card" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
    }}>
      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
        <div
          ref={containerRef}
          data-testid="scan-area"
          style={{
            width: 140,
            height: 140,
            minWidth: 140,
            borderRadius: 'var(--radius-lg)',
            border: `2.5px solid ${scanning ? 'var(--color-primary)' : result ? 'var(--color-success)' : 'var(--border-default)'}`,
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
            overflow: 'hidden',
            cursor: !scanning && !result ? 'pointer' : 'default',
          }}
          onClick={!scanning && !result ? handleStartScan : undefined}
        >
          {scanning && <div id="qr-reader" style={{ width: '100%', height: '100%' }} />}

          {!scanning && !result && (
            <>
              <div style={{ position: 'absolute', top: -1, left: -1, width: 20, height: 20, borderTop: '3px solid var(--color-primary)', borderLeft: '3px solid var(--color-primary)', borderRadius: '12px 0 0 0' }} />
              <div style={{ position: 'absolute', top: -1, right: -1, width: 20, height: 20, borderTop: '3px solid var(--color-primary)', borderRight: '3px solid var(--color-primary)', borderRadius: '0 12px 0 0' }} />
              <div style={{ position: 'absolute', bottom: -1, left: -1, width: 20, height: 20, borderBottom: '3px solid var(--color-primary)', borderLeft: '3px solid var(--color-primary)', borderRadius: '0 0 0 12px' }} />
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 20, height: 20, borderBottom: '3px solid var(--color-primary)', borderRight: '3px solid var(--color-primary)', borderRadius: '0 0 12px 0' }} />
            </>
          )}

          {!scanning && !result && (
            <ScanOutlined style={{ fontSize: '36px', color: 'var(--gray-300)' }} />
          )}
          {result && (
            <div className="animate-pulse-success">
              <CheckCircleOutlined style={{ fontSize: '36px', color: 'var(--color-success)' }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {scanning ? (
            <div>
              <div style={{ fontSize: '16px', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '8px' }}>
                正在扫描...
              </div>
              <button
                data-testid="scan-cancel-btn"
                onClick={handleStopScan}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          ) : scanError ? (
            <div>
              <div style={{ fontSize: '14px', color: 'var(--color-error)', marginBottom: '8px' }}>
                {scanError}
              </div>
              <button
                onClick={handleStartScan}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-pill)',
                  background: 'transparent',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          ) : result ? (
            <div style={{ animation: 'fadeInUp 250ms ease-out both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <CheckCircleOutlined style={{ color: 'var(--color-success)', fontSize: '20px' }} />
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.name}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {result.overview}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--surface-card)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  重新扫描
                </button>
                <button
                  onClick={() => onScan?.(result)}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    background: 'linear-gradient(135deg, #2D8B57, #4ADE80)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  开始讲解
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '15px', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
              点击扫描框，对准景点二维码
            </div>
          )}
        </div>
      </div>

      {!result && (
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <EnvironmentOutlined style={{ fontSize: '15px' }} />
            {loading ? '加载景点中...' : '所有景点'}
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '6px',
            scrollbarWidth: 'none',
          }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    minWidth: 100, padding: '14px 16px',
                    border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-card)', textAlign: 'center',
                    opacity: 0.5,
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>加载中...</div>
                  </div>
                ))
              : spots.map((loc, i) => (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationSelect(loc)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 16px',
                      minWidth: 100,
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-card)',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      animation: `fadeInUp 250ms ease-out ${i * 50}ms both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--color-primary)', fontSize: '16px',
                    }}>
                      <EnvironmentOutlined />
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {loc.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {loc.category}
                    </div>
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanCard;
