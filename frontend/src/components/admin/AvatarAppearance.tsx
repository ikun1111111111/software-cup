import React, { useCallback, useState } from 'react';
import {
  COSTUMES,
  DAILY_COSTUME_IDS,
  FESTIVAL_COSTUME_IDS,
  getCostume,
} from '../../config/costumeMap';

export interface AppearanceConfig {
  model: string;
  skin: string;
  hair: string;
  outfit: string;
  accessories: string[];
  costumeMode: 'auto' | 'manual';
  costumeId: string;
  /** Selected expression ID: f00-f07 */
  expressionId?: string;
}

export interface AvatarAppearanceProps {
  config?: AppearanceConfig;
  onChange?: (config: AppearanceConfig) => void;
  activeCostumeId?: string;
  activeCostumeMode?: 'auto' | 'manual';
  onCostumeSelect?: (costumeId: string) => void;
  onCostumeAutoToggle?: () => void;
}

/* ── Expression definitions ── */
const EXPRESSIONS = [
  { id: 'f00', name: '默认', emoji: '😊', desc: '自然微笑' },
  { id: 'f01', name: '开心', emoji: '😄', desc: '灿烂笑容' },
  { id: 'f02', name: '温柔', emoji: '🥰', desc: '柔和亲切' },
  { id: 'f03', name: '惊喜', emoji: '😮', desc: '惊喜好奇' },
  { id: 'f04', name: '害羞', emoji: '😳', desc: '腼腆可爱' },
  { id: 'f05', name: '沉思', emoji: '🤔', desc: '若有所思' },
  { id: 'f06', name: '坚定', emoji: '😤', desc: '认真专注' },
  { id: 'f07', name: '闭眼', emoji: '😌', desc: '安详闭目' },
];

/* ── Color palettes for each costume (for preview swatches) ── */
const COSTUME_COLORS: Record<string, [string, string]> = {
  'daily-classic':    ['#E8E2D6', '#C8BFB0'],
  'daily-modern':     ['#D4C5B0', '#A89880'],
  'daily-artistic':   ['#B8C4B8', '#8FA08F'],
  'festival-spring':  ['#C84B31', '#E8A040'],
  'festival-lantern': ['#E8A040', '#C86030'],
  'festival-qingming':['#6A9C89', '#A8D8A0'],
  'festival-dragon':  ['#3A6EA5', '#A0C4E8'],
  'festival-midautumn':['#C8A951', '#F0E6C0'],
  'festival-national':['#C84B31', '#C8A951'],
};

const DEFAULT_CONFIG: AppearanceConfig = {
  model: 'model-1',
  skin: 'skin-1',
  hair: 'hair-1',
  outfit: 'outfit-1',
  accessories: [],
  costumeMode: 'auto',
  costumeId: 'daily-classic',
  expressionId: 'f00',
};

const AvatarAppearance: React.FC<AvatarAppearanceProps> = ({
  config: propConfig,
  onChange,
  activeCostumeId,
  activeCostumeMode,
  onCostumeSelect,
  onCostumeAutoToggle,
}) => {
  const [config, setConfig] = useState<AppearanceConfig>(propConfig || DEFAULT_CONFIG);

  const liveCostumeId = activeCostumeId || config.costumeId;
  const liveCostumeMode = activeCostumeMode || config.costumeMode;
  const expressionId = config.expressionId || 'f00';

  const updateConfig = useCallback((updates: Partial<AppearanceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange?.(newConfig);
  }, [config, onChange]);

  const handleCostumeSelect = useCallback((costumeId: string) => {
    onCostumeSelect?.(costumeId);
    const costume = getCostume(costumeId);
    updateConfig({ costumeId, costumeMode: 'manual', expressionId: costume.expression });
  }, [onCostumeSelect, updateConfig]);

  const handleAutoToggle = useCallback(() => {
    if (liveCostumeMode === 'auto') {
      onCostumeSelect?.(liveCostumeId);
    } else {
      onCostumeAutoToggle?.();
    }
    updateConfig({ costumeMode: liveCostumeMode === 'auto' ? 'manual' : 'auto', costumeId: liveCostumeId });
  }, [onCostumeSelect, onCostumeAutoToggle, liveCostumeMode, liveCostumeId, updateConfig]);

  const handleExpressionSelect = useCallback((id: string) => {
    updateConfig({ expressionId: id });
  }, [updateConfig]);

  /* ── Styles ── */
  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: '12px',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-serif)',
    letterSpacing: '0.05em',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid var(--border-light)',
  };

  return (
    <div data-testid="avatar-appearance" style={{ padding: '4px 20px 20px' }}>
      <h3 style={{
        margin: '0 0 24px 0',
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
        letterSpacing: '0.08em',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 3, height: 18,
          backgroundColor: 'var(--vermilion)',
          borderRadius: '0 2px 2px 0', opacity: 0.8,
        }} />
        外观配置
      </h3>

      {/* ═══ 换装 ═══ */}
      <div style={sectionStyle}>
        <div style={{ ...labelStyle, justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>换装</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' }}>
              点击切换服装纹理
            </span>
          </span>
          <button
            onClick={handleAutoToggle}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              borderRadius: 14,
              border: liveCostumeMode === 'auto'
                ? '1px solid rgba(106, 156, 137, 0.5)'
                : '1px solid var(--border-light)',
              backgroundColor: liveCostumeMode === 'auto' ? 'rgba(106, 156, 137, 0.08)' : 'transparent',
              color: liveCostumeMode === 'auto' ? '#6A9C89' : 'var(--text-tertiary)',
              cursor: 'pointer',
              transition: 'all 200ms',
              fontWeight: 500,
            }}
          >
            {liveCostumeMode === 'auto' ? '🔄 自动匹配' : '手动选择'}
          </button>
        </div>

        {liveCostumeMode === 'auto' && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(106, 156, 137, 0.06)',
            borderRadius: 8,
            fontSize: 12,
            color: '#6A9C89',
            marginBottom: 12,
            border: '1px solid rgba(106, 156, 137, 0.12)',
          }}>
            系统自动匹配：<strong>{getCostume(liveCostumeId).name}</strong> — {getCostume(liveCostumeId).description}
          </div>
        )}

        {/* 日常服装 */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8, display: 'block' }}>
            日常
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {DAILY_COSTUME_IDS.map((id) => {
              const c = COSTUMES[id];
              const isSelected = liveCostumeId === id && liveCostumeMode === 'manual';
              const colors = COSTUME_COLORS[id] || ['#ccc', '#999'];
              return (
                <button
                  key={id}
                  data-testid={`costume-${id}`}
                  onClick={() => handleCostumeSelect(id)}
                  title={c.description}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '12px 8px',
                    borderRadius: 10,
                    border: isSelected ? '2px solid #C84B31' : '1.5px solid var(--border-light)',
                    backgroundColor: isSelected ? 'rgba(200, 75, 49, 0.04)' : 'var(--surface-card)',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    boxShadow: isSelected ? '0 2px 12px rgba(200,75,49,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Color swatch */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
                    border: isSelected ? '2px solid #C84B31' : '2px solid rgba(0,0,0,0.06)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(200,75,49,0.15)' : 'none',
                    transition: 'all 200ms',
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#C84B31' : 'var(--text-primary)',
                    fontFamily: 'var(--font-serif)',
                  }}>
                    {c.name}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--text-tertiary)',
                    lineHeight: 1.3, textAlign: 'center',
                  }}>
                    {c.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 节日限定 */}
        <div>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 8, display: 'block' }}>
            节日限定
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {FESTIVAL_COSTUME_IDS.map((id) => {
              const c = COSTUMES[id];
              const isSelected = liveCostumeId === id && liveCostumeMode === 'manual';
              const colors = COSTUME_COLORS[id] || ['#ccc', '#999'];
              return (
                <button
                  key={id}
                  data-testid={`costume-${id}`}
                  onClick={() => handleCostumeSelect(id)}
                  title={c.description}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '12px 8px',
                    borderRadius: 10,
                    border: isSelected ? '2px solid #C84B31' : '1.5px solid var(--border-light)',
                    backgroundColor: isSelected ? 'rgba(200, 75, 49, 0.04)' : 'var(--surface-card)',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    boxShadow: isSelected ? '0 2px 12px rgba(200,75,49,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
                    border: isSelected ? '2px solid #C84B31' : '2px solid rgba(0,0,0,0.06)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(200,75,49,0.15)' : 'none',
                    transition: 'all 200ms',
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#C84B31' : 'var(--text-primary)',
                    fontFamily: 'var(--font-serif)',
                  }}>
                    {c.name}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--text-tertiary)',
                    lineHeight: 1.3, textAlign: 'center',
                  }}>
                    {c.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ 表情 ═══ */}
      <div style={{ marginBottom: 0 }}>
        <div style={labelStyle}>
          <span>表情</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' }}>
            切换面部表情
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {EXPRESSIONS.map((expr) => {
            const isSelected = expressionId === expr.id;
            return (
              <button
                key={expr.id}
                onClick={() => handleExpressionSelect(expr.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 4px',
                  borderRadius: 10,
                  border: isSelected ? '2px solid #C84B31' : '1.5px solid var(--border-light)',
                  backgroundColor: isSelected ? 'rgba(200, 75, 49, 0.04)' : 'var(--surface-card)',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  boxShadow: isSelected ? '0 2px 8px rgba(200,75,49,0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <span style={{ fontSize: 22 }}>{expr.emoji}</span>
                <span style={{
                  fontSize: 11, fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? '#C84B31' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-serif)',
                }}>
                  {expr.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AvatarAppearance;
