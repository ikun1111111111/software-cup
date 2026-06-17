import React, { useRef, useState } from 'react';
import { message } from 'antd';
import { CloseOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { TravelMemory, JourneySummary } from '../../api/memory';

interface ShareCardProps {
  memories: TravelMemory[];
  summary: JourneySummary | null;
  onClose: () => void;
}

const ShareCard: React.FC<ShareCardProps> = ({ memories, summary, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const spotNames = [...new Set(memories.map((m) => m.spot_name).filter(Boolean))] as string[];
  const title = summary?.title || '我的灵山之旅';
  const dateStr = summary?.date_range || new Date().toLocaleDateString('zh-CN');
  const topMemories = memories.slice(0, 5);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `灵山记忆-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      message.success('分享卡片已保存');
    } catch (err) {
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(26, 22, 20, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -40, right: 0,
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: '#fff', width: 32, height: 32,
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, zIndex: 10,
          }}
        >
          <CloseOutlined />
        </button>

        {/* ═══ 卡片本体 ═══ */}
        <div
          ref={cardRef}
          style={{
            width: 380,
            background: '#FDFBF7',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            position: 'relative',
          }}
        >
          {/* 水墨背景纹理 */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            background: `
              radial-gradient(ellipse at 20% 30%, #6A9C89 0%, transparent 50%),
              radial-gradient(ellipse at 80% 70%, #2A4D6E 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, #C84B31 0%, transparent 40%)
            `,
            pointerEvents: 'none',
          }} />

          {/* 顶部装饰带 */}
          <div style={{
            height: 6,
            background: 'linear-gradient(90deg, #6A9C89, #C8A951, #C84B31)',
          }} />

          <div style={{ padding: '28px 24px 24px', position: 'relative' }}>
            {/* 标识 */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 20,
            }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #C84B31, #E85D3A)',
                borderRadius: 4, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--font-calligraphy)',
                fontSize: 18, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(200,75,49,0.25)',
              }}>
                灵
              </div>
              <span style={{
                fontSize: 11, color: '#9E988E',
                fontFamily: 'var(--font-serif)',
              }}>
                灵山胜境 · 旅行记忆
              </span>
            </div>

            {/* 标题 */}
            <h2 style={{
              margin: '0 0 6px',
              fontSize: 24, fontWeight: 800,
              fontFamily: 'var(--font-calligraphy)',
              color: '#1A1614', letterSpacing: 3,
            }}>
              {title}
            </h2>
            <p style={{
              margin: '0 0 20px', fontSize: 12,
              color: '#9E988E', fontFamily: 'var(--font-serif)',
            }}>
              {dateStr} · {memories.length} 段记忆 · {spotNames.length} 处景点
            </p>

            {/* 分隔线 */}
            <div style={{
              height: 1, marginBottom: 18,
              background: 'linear-gradient(90deg, transparent, #D4D0C8, transparent)',
            }} />

            {/* 记忆摘要 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topMemories.map((m) => (
                <div key={m.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#6A9C89', marginTop: 7, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      fontFamily: 'var(--font-serif)',
                      color: '#1A1614', marginBottom: 2,
                    }}>
                      {m.title}
                      {m.spot_name && (
                        <span style={{
                          fontSize: 10, color: '#6A9C89',
                          marginLeft: 6, fontWeight: 500,
                        }}>
                          {m.spot_name}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#5C554C',
                      fontFamily: 'var(--font-serif)',
                      lineHeight: 1.6,
                    }}>
                      {(m.polished_content || m.original_content).slice(0, 60)}
                      {(m.polished_content || m.original_content).length > 60 ? '...' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 景点标签 */}
            {spotNames.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6,
                marginTop: 18,
              }}>
                {spotNames.map((name) => (
                  <span key={name} style={{
                    fontSize: 10, padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #E8E5DF',
                    color: '#5C554C',
                    fontFamily: 'var(--font-serif)',
                  }}>
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* 底部 */}
            <div style={{
              marginTop: 22, paddingTop: 14,
              borderTop: '1px solid #E8E5DF',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: 10, color: '#C4BFB6',
                fontFamily: 'var(--font-serif)',
                letterSpacing: 1,
              }}>
                拾光成册 · 落笔生花
              </span>
              <div style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, #C84B31, #E85D3A)',
                borderRadius: 3, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--font-calligraphy)',
                fontSize: 14,
              }}>
                灵
              </div>
            </div>
          </div>
        </div>

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-seal btn-seal--filled"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 28px', fontSize: 15,
          }}
        >
          {exporting ? <LoadingOutlined /> : <DownloadOutlined />}
          {exporting ? '正在导出...' : '保存为图片'}
        </button>
      </div>
    </div>
  );
};

export default ShareCard;
