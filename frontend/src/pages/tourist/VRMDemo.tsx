import React, { useState } from 'react';
import { Slider } from 'antd';
import type { DemoExpression, OutfitPreset } from '../../components/VRM/VRMStage';
import VRMStage from '../../components/VRM/VRMStage';

const EXPRESSIONS: { label: string; value: DemoExpression; color: string }[] = [
  { label: '平静', value: 'neutral', color: '#A8A198' },
  { label: '开心', value: 'happy', color: '#C8882E' },
  { label: '生气', value: 'angry', color: '#DC4444' },
  { label: '悲伤', value: 'sad', color: '#3584E4' },
  { label: '放松', value: 'relaxed', color: '#2D8B57' },
  { label: '惊讶', value: 'surprised', color: '#8B5CF6' },
];

const OUTFIT_PRESETS: { label: string; value: OutfitPreset; color: string }[] = [
  { label: '素雅禅衣', value: 'elegant', color: '#8B7868' },
  { label: '新中式', value: 'modern', color: '#6A9C89' },
  { label: '水墨雅服', value: 'ink', color: '#5A5A5A' },
  { label: '锦绣红袍', value: 'festive', color: '#C84B31' },
  { label: '灯彩华裳', value: 'lantern', color: '#E85D3A' },
  { label: '踏青轻衣', value: 'spring', color: '#7BA898' },
  { label: '月华裳', value: 'moonlight', color: '#A8B8D8' },
  { label: '学者服', value: 'scholar', color: '#4A6878' },
];

const VRMDemo: React.FC = () => {
  const [expression, setExpression] = useState<DemoExpression>('neutral');
  const [mouthOpen, setMouthOpen] = useState(0);
  const [outfitPreset, setOutfitPreset] = useState<OutfitPreset>('modern');
  const [modelUrl, setModelUrl] = useState('');

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 60px - env(safe-area-inset-top, 0px))',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1,
        position: 'relative',
        background: 'radial-gradient(ellipse at center, rgba(106,156,137,0.06) 0%, transparent 60%), var(--surface-bg)',
      }}>
        <VRMStage
          url={modelUrl || undefined}
          expression={expression}
          mouthOpen={mouthOpen}
          outfitPreset={outfitPreset}
          lookAt={{ x: 0, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div style={{
        width: 320,
        flexShrink: 0,
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        backgroundColor: 'var(--surface-card)',
        borderLeft: '1px solid var(--border-light)',
        overflow: 'auto',
        boxShadow: '-2px 0 20px rgba(26,22,20,0.04)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            VRM 数字人 Demo
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            three.js + @pixiv/three-vrm
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.5px' }}>
            表情
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {EXPRESSIONS.map((exp) => (
              <button
                key={exp.value}
                onClick={() => setExpression(exp.value)}
                disabled={expression === exp.value}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 8px',
                  backgroundColor: expression === exp.value ? `${exp.color}14` : 'var(--surface-bg)',
                  border: expression === exp.value
                    ? `1.5px solid ${exp.color}`
                    : '1px solid var(--border-light)',
                  borderRadius: 12,
                  cursor: expression === exp.value ? 'default' : 'pointer',
                  transition: 'all 150ms ease',
                  color: expression === exp.value ? exp.color : 'var(--text-secondary)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>{exp.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.5px' }}>
            服装
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {OUTFIT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setOutfitPreset(p.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  backgroundColor: outfitPreset === p.value ? `${p.color}14` : 'var(--surface-bg)',
                  border: outfitPreset === p.value
                    ? `1.5px solid ${p.color}`
                    : '1px solid var(--border-light)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: p.color,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: outfitPreset === p.value ? p.color : 'var(--text-secondary)',
                }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
              口型
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              张合度 {Math.round(mouthOpen * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={mouthOpen}
            onChange={setMouthOpen}
            trackStyle={{ backgroundColor: 'var(--color-primary)' }}
          />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.5px' }}>
            模型地址
          </div>
          <input
            type="text"
            placeholder="输入 VRM 文件 URL（留空使用示例模型）"
            value={modelUrl}
            onChange={(e) => setModelUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              fontSize: 12,
              outline: 'none',
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{
          padding: '14px 16px',
          borderRadius: 12,
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-light)',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            支持功能
          </div>
          <div>52 个 BlendShape 表情控制</div>
          <div>自动眨眼 + 呼吸动画</div>
          <div>8 套服装预设切换</div>
          <div>口型同步（Mouth Open）</div>
          <div>鼠标拖拽旋转 / 滚轮缩放</div>
        </div>
      </div>
    </div>
  );
};

export default VRMDemo;
