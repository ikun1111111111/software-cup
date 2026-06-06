import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Spin, message, Progress } from 'antd';
import { CameraOutlined, UploadOutlined, CloseOutlined, CheckCircleOutlined, HistoryOutlined, RightOutlined } from '@ant-design/icons';
import { identifySpot, VisionResult } from '../../api/vision';

interface PhotoCaptureProps {
  onResult?: (result: VisionResult) => void;
  onError?: (error: string) => void;
}

type CaptureState = 'idle' | 'preview' | 'loading' | 'result' | 'error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;
const HISTORY_KEY = 'vision_scan_history';
const MAX_HISTORY = 3;

interface ScanHistoryItem {
  spotName: string;
  timestamp: number;
  confidence: number;
}

const STEPS = [
  { icon: '\u{1F4F7}', label: '拍照', desc: '拍摄或上传景点照片' },
  { icon: '\u{1F50D}', label: '识别', desc: 'AI 智能分析图片' },
  { icon: '\u{1F4D6}', label: '讲解', desc: '数字人语音讲解' },
];

function loadHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(item: ScanHistoryItem) {
  try {
    const history = loadHistory();
    history.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onResult, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setPreviewUrl(null);
    setSelectedFile(null);
    setResult(null);
    setErrorMsg(null);
    setHistory(loadHistory());
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return '请上传 JPEG、PNG、WebP 或 GIF 格式的图片';
    }
    if (file.size > MAX_SIZE) {
      return `图片大小超过限制 (最大 ${MAX_SIZE / (1024 * 1024)}MB)`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      message.error(error);
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState('preview');
  }, [validateFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setState('loading');
    setErrorMsg(null);
    try {
      const visionResult = await identifySpot(selectedFile);
      setResult(visionResult);
      setState('result');
      saveToHistory({
        spotName: visionResult.spot_name,
        timestamp: Date.now(),
        confidence: visionResult.confidence,
      });
      onResult?.(visionResult);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || '识别失败，请重试';
      setErrorMsg(msg);
      setState('error');
      onError?.(msg);
    }
  }, [selectedFile, onResult, onError]);

  const confidenceColor = (conf: number) => {
    if (conf >= 0.7) return '#2D8B57';
    if (conf >= 0.4) return '#E8A838';
    return '#DC4444';
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (state === 'idle') {
    return (
      <div data-testid="photo-capture" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '28px 20px',
        flex: 1,
      }}>
        {/* Camera Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(26,95,180,0.1) 0%, rgba(53,132,228,0.15) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '34px',
          color: '#1A5FB4',
        }}>
          <CameraOutlined />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            拍照识景点
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            拍摄或上传景点照片，AI 自动识别并讲解
          </div>
        </div>

        {/* 3-Step Guide */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 16px',
          backgroundColor: 'var(--surface-bg)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 400,
        }}>
          {STEPS.map((step, i) => (
            <React.Fragment key={i}>
              <div style={{
                flex: 1,
                textAlign: 'center',
                animation: `fadeInUp 250ms ease-out ${i * 80}ms both`,
              }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{step.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{step.desc}</div>
              </div>
              {i < STEPS.length - 1 && (
                <RightOutlined style={{ fontSize: '12px', color: 'var(--gray-300)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={() => cameraInputRef.current?.click()}
            style={{
              borderRadius: 'var(--radius-xl)',
              height: 48,
              paddingLeft: '24px',
              paddingRight: '24px',
              fontSize: '15px',
              background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(26, 95, 180, 0.3)',
            }}
          >
            拍照
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderRadius: 'var(--radius-xl)',
              height: 48,
              paddingLeft: '24px',
              paddingRight: '24px',
              fontSize: '15px',
            }}
          >
            从相册选择
          </Button>
        </div>

        {/* Scan History */}
        {history.length > 0 && (
          <div style={{
            width: '100%',
            maxWidth: 400,
            borderTop: '1px solid var(--border-light)',
            paddingTop: '14px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              marginBottom: '10px',
            }}>
              <HistoryOutlined /> 最近识别
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface-bg)',
                  borderRadius: 'var(--radius-md)',
                  animation: `fadeInUp 200ms ease-out ${i * 50}ms both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircleOutlined style={{ color: confidenceColor(item.confidence), fontSize: '14px' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {item.spotName}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileInput} />
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
      </div>
    );
  }

  if (state === 'preview') {
    return (
      <div data-testid="photo-preview" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
        padding: '20px',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
          <img
            src={previewUrl!}
            alt="预览"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              objectFit: 'cover',
              maxHeight: 300,
            }}
          />
          <Button
            icon={<CloseOutlined />}
            shape="circle"
            onClick={reset}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: 'none',
              color: '#fff',
              width: 36,
              height: 36,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          <Button onClick={reset} style={{ height: 44, fontSize: '14px', paddingInline: 20 }}>重新选择</Button>
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={handleUpload}
            style={{
              height: 44,
              fontSize: '14px',
              paddingInline: 20,
              background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
              border: 'none',
            }}
          >
            开始识别
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div data-testid="photo-loading" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '36px 20px',
      }}>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="识别中"
            style={{
              width: '100%',
              maxWidth: 320,
              borderRadius: 'var(--radius-lg)',
              opacity: 0.5,
              maxHeight: 200,
              objectFit: 'cover',
            }}
          />
        )}
        <Spin size="large" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
            正在识别景点...
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            AI 正在分析图片
          </div>
        </div>
      </div>
    );
  }

  if (state === 'result' && result) {
    return (
      <div data-testid="photo-result" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '18px',
        animation: 'fadeInUp 300ms ease-out both',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={result.spot_name}
              style={{
                width: 90,
                height: 90,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}>
              <CheckCircleOutlined style={{ color: '#2D8B57', fontSize: '20px' }} />
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {result.spot_name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>置信度</span>
              <Progress
                percent={Math.round(result.confidence * 100)}
                size="small"
                style={{ flex: 1, margin: 0 }}
                strokeColor={confidenceColor(result.confidence)}
                format={(p) => `${p}%`}
              />
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {result.description}
            </div>
          </div>
        </div>

        {result.explanation && (
          <div style={{
            padding: '14px 16px',
            backgroundColor: 'var(--color-primary-bg)',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            maxHeight: 160,
            overflow: 'auto',
          }}>
            {result.explanation}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button onClick={reset} style={{ height: 44, fontSize: '14px', paddingInline: 20 }}>再拍一张</Button>
          <Button
            type="primary"
            onClick={() => onResult?.(result)}
            style={{
              height: 44,
              fontSize: '14px',
              paddingInline: 20,
              background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
              border: 'none',
            }}
          >
            听数字人讲解
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div data-testid="photo-error" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '32px 20px',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          backgroundColor: 'var(--color-error-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px', color: '#DC4444',
        }}>
          !
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            识别失败
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            {errorMsg || '暂时无法识别，请尝试更清晰的照片'}
          </div>
        </div>
        <Button type="primary" onClick={reset} style={{ height: 44, fontSize: '14px', paddingInline: 20 }}>
          重新尝试
        </Button>
      </div>
    );
  }

  return null;
};

export default PhotoCapture;
