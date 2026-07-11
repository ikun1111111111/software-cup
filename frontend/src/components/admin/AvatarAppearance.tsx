import React, { useCallback, useState } from 'react';
import {
  COSTUMES,
  DAILY_COSTUME_IDS,
  FESTIVAL_COSTUME_IDS,
  getCostume,
  type CostumeDef,
} from '../../config/costumeMap';
import { useCostume } from '../../hooks/useCostume';

export interface AppearanceConfig {
  /** Costume mode: 'auto' = system picks by date, 'manual' = user chose */
  costumeMode: 'auto' | 'manual';
  /** Active costume ID (from costumeMap.ts) */
  costumeId: string;
}

export interface AvatarAppearanceProps {
  config?: AppearanceConfig;
  onChange?: (config: AppearanceConfig) => void;
}

const DEFAULT_CONFIG: AppearanceConfig = {
  costumeMode: 'auto',
  costumeId: 'daily-artistic',
};

const AvatarAppearance: React.FC<AvatarAppearanceProps> = ({
  config: propConfig,
  onChange,
}) => {
  const [config, setConfig] = useState<AppearanceConfig>(propConfig || DEFAULT_CONFIG);
  const { costumeId: resolvedCostumeId, mode: resolvedCostumeMode, selectCostume, resetToAuto } = useCostume();

  const updateConfig = useCallback((updates: Partial<AppearanceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange?.(newConfig);
  }, [config, onChange]);

  const handleCostumeSelect = useCallback((costumeId: string) => {
    selectCostume(costumeId);
    updateConfig({ costumeId, costumeMode: 'manual' });
  }, [selectCostume, updateConfig]);

  const handleAutoToggle = useCallback(() => {
    if (resolvedCostumeMode === 'auto') {
      updateConfig({ costumeMode: 'manual' });
    } else {
      resetToAuto();
      updateConfig({ costumeMode: 'auto', costumeId: resolvedCostumeId });
    }
  }, [resolvedCostumeMode, resolvedCostumeId, resetToAuto, updateConfig]);

  const buttonStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '10px 14px',
    backgroundColor: isSelected ? 'rgba(200, 75, 49, 0.08)' : 'transparent',
    color: isSelected ? '#A83828' : 'var(--text-secondary)',
    border: isSelected ? '1.5px solid rgba(200, 75, 49, 0.35)' : '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: isSelected ? '0.02em' : 'normal',
    textAlign: 'left',
  });

  const renderCostumeButton = (costume: CostumeDef) => {
    const isSelected = resolvedCostumeId === costume.id && resolvedCostumeMode === 'manual';
    return (
      <button
        key={costume.id}
        data-testid={`costume-${costume.id}`}
        onClick={() => handleCostumeSelect(costume.id)}
        style={{
          ...buttonStyle(isSelected),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          minWidth: 110,
          flex: '1 1 140px',
        }}
        title={costume.description}
      >
        <span>{costume.name}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{costume.description}</span>
      </button>
    );
  };

  const categoryLabel: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    marginBottom: 10,
    display: 'block',
    letterSpacing: '0.05em',
  };

  return (
    <div data-testid="avatar-appearance" style={{ padding: '20px' }}>
      <div style={{
        marginBottom: 20,
        padding: '14px 16px',
        background: 'rgba(200, 75, 49, 0.05)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed rgba(200, 75, 49, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {resolvedCostumeMode === 'auto' ? '自动匹配节日服装' : '手动选择服装'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {resolvedCostumeMode === 'auto'
              ? `当前系统已自动匹配：${getCostume(resolvedCostumeId).name}`
              : '当前为手动选择模式，可随时切回自动匹配'}
          </div>
        </div>
        <button
          onClick={handleAutoToggle}
          style={{
            padding: '6px 14px',
            fontSize: 12,
            borderRadius: 16,
            border: resolvedCostumeMode === 'auto' ? '1px solid var(--accent)' : '1px solid var(--border-light)',
            backgroundColor: resolvedCostumeMode === 'auto' ? 'var(--accent)' : 'transparent',
            color: resolvedCostumeMode === 'auto' ? '#fff' : 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 200ms',
            whiteSpace: 'nowrap',
          }}
        >
          {resolvedCostumeMode === 'auto' ? '切换手动' : '切换自动'}
        </button>
      </div>

      <div data-testid="costume-list" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <section>
          <span style={categoryLabel}>日常服装</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {DAILY_COSTUME_IDS.map((id) => renderCostumeButton(COSTUMES[id]))}
          </div>
        </section>

        <section>
          <span style={categoryLabel}>节日限定</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {FESTIVAL_COSTUME_IDS.map((id) => renderCostumeButton(COSTUMES[id]))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AvatarAppearance;
