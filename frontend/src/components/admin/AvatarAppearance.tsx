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
  model: string;
  skin: string;
  hair: string;
  outfit: string;
  accessories: string[];
  /** Costume mode: 'auto' = system picks by date, 'manual' = user chose */
  costumeMode: 'auto' | 'manual';
  /** Active costume ID (from costumeMap.ts) */
  costumeId: string;
}

export interface AvatarAppearanceProps {
  config?: AppearanceConfig;
  onChange?: (config: AppearanceConfig) => void;
}

export const MODELS = [
  { id: 'model-1', name: '默认模型' },
  { id: 'model-2', name: '古风模型' },
  { id: 'model-3', name: '现代模型' },
];

export const SKINS = [
  { id: 'skin-1', name: '默认肤色', color: '#FDDCB5' },
  { id: 'skin-2', name: '白皙', color: '#FFF5E1' },
  { id: 'skin-3', name: '小麦色', color: '#D4A574' },
];

export const HAIRS = [
  { id: 'hair-1', name: '黑色长发' },
  { id: 'hair-2', name: '棕色短发' },
  { id: 'hair-3', name: '金色卷发' },
];

export const OUTFITS = [
  { id: 'outfit-1', name: '传统汉服' },
  { id: 'outfit-2', name: '现代正装' },
  { id: 'outfit-3', name: '休闲装' },
];

export const ACCESSORIES = [
  { id: 'acc-1', name: '发簪' },
  { id: 'acc-2', name: '耳环' },
  { id: 'acc-3', name: '项链' },
  { id: 'acc-4', name: '手镯' },
];

const DEFAULT_CONFIG: AppearanceConfig = {
  model: 'model-1',
  skin: 'skin-1',
  hair: 'hair-1',
  outfit: 'outfit-1',
  accessories: [],
  costumeMode: 'auto',
  costumeId: 'daily-classic',
};

const buttonStyle = (isSelected: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  backgroundColor: isSelected ? '#1A5FB4' : '#F8F6F2',
  color: isSelected ? '#fff' : '#5C554C',
  border: isSelected ? '1.5px solid #1A5FB4' : '1px solid #E8E5DF',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: isSelected ? 600 : 400,
  transition: 'all 200ms',
});

const categoryLabel: React.CSSProperties = {
  fontSize: 12,
  color: '#8A8580',
  fontWeight: 500,
  marginBottom: 6,
  display: 'block',
};

const AvatarAppearance: React.FC<AvatarAppearanceProps> = ({
  config: propConfig,
  onChange,
}) => {
  const [config, setConfig] = useState<AppearanceConfig>(propConfig || DEFAULT_CONFIG);
  const { costumeId: liveCostumeId, mode: liveCostumeMode, selectCostume, resetToAuto } = useCostume();

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
    if (liveCostumeMode === 'auto') {
      updateConfig({ costumeMode: 'manual' });
    } else {
      resetToAuto();
      updateConfig({ costumeMode: 'auto', costumeId: liveCostumeId });
    }
  }, [liveCostumeMode, liveCostumeId, resetToAuto, updateConfig]);

  const handleHairChange = useCallback((hairId: string) => {
    updateConfig({ hair: hairId });
  }, [updateConfig]);

  const handleOutfitChange = useCallback((outfitId: string) => {
    updateConfig({ outfit: outfitId });
  }, [updateConfig]);

  const toggleAccessory = useCallback((accId: string) => {
    const newAccessories = config.accessories.includes(accId)
      ? config.accessories.filter((id) => id !== accId)
      : [...config.accessories, accId];
    updateConfig({ accessories: newAccessories });
  }, [config.accessories, updateConfig]);

  const buttonStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    backgroundColor: isSelected ? 'rgba(200, 75, 49, 0.08)' : 'transparent',
    color: isSelected ? '#A83828' : 'var(--text-secondary)',
    border: isSelected ? '1.5px solid rgba(200, 75, 49, 0.35)' : '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: isSelected ? '0.02em' : 'normal',
  });

  const renderCostumeButton = (costume: CostumeDef) => {
    const isSelected = liveCostumeId === costume.id && liveCostumeMode === 'manual';
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
          minWidth: 100,
        }}
        title={costume.description}
      >
        <span>{costume.name}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{costume.description}</span>
      </button>
    );
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 600,
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-serif)',
    letterSpacing: '0.05em',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--border-light)',
  };

  return (
    <div data-testid="avatar-appearance" style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 20px 0',
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
          width: 3,
          height: 18,
          backgroundColor: 'var(--vermilion)',
          borderRadius: '0 2px 2px 0',
          opacity: 0.8,
        }} />
        外观配置
      </h3>

      <div style={sectionStyle}>
        <label style={labelStyle}>模型</label>
        <div data-testid="model-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MODELS.map((model) => (
            <button
              key={model.id}
              data-testid={`model-${model.id}`}
              onClick={() => updateConfig({ model: model.id })}
              style={buttonStyle(config.model === model.id)}
              onMouseEnter={(e) => {
                if (config.model !== model.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(200, 75, 49, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (config.model !== model.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }
              }}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>肤色</label>
        <div data-testid="skin-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SKINS.map((skin) => (
            <button
              key={skin.id}
              data-testid={`skin-${skin.id}`}
              onClick={() => updateConfig({ skin: skin.id })}
              style={buttonStyle(config.skin === skin.id)}
              onMouseEnter={(e) => {
                if (config.skin !== skin.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(200, 75, 49, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (config.skin !== skin.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: skin.color,
                marginRight: 8,
                verticalAlign: 'middle',
                border: '1.5px solid rgba(0,0,0,0.08)',
                boxShadow: config.skin === skin.id ? '0 0 0 2px rgba(200,75,49,0.2)' : 'none',
                transition: 'box-shadow 200ms',
              }} />
              {skin.name}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>发型</label>
        <div data-testid="hair-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {HAIRS.map((hair) => (
            <button
              key={hair.id}
              data-testid={`hair-${hair.id}`}
              onClick={() => updateConfig({ hair: hair.id })}
              style={buttonStyle(config.hair === hair.id)}
              onMouseEnter={(e) => {
                if (config.hair !== hair.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(200, 75, 49, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (config.hair !== hair.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }
              }}
            >
              {hair.name}
            </button>
          ))}
        </div>
      </div>

      {/* Costume selection — 9-costume system with auto/manual toggle */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={labelStyle}>服装</label>
          <button
            onClick={handleAutoToggle}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 12,
              border: liveCostumeMode === 'auto' ? '1px solid #1A5FB4' : '1px solid #E8E5DF',
              backgroundColor: liveCostumeMode === 'auto' ? '#1A5FB4' : 'transparent',
              color: liveCostumeMode === 'auto' ? '#fff' : '#5C554C',
              cursor: 'pointer',
              transition: 'all 200ms',
            }}
          >
            {liveCostumeMode === 'auto' ? '自动匹配节日' : '手动选择'}
          </button>
        </div>

        {liveCostumeMode === 'auto' && (
          <div style={{
            padding: '10px 14px',
            background: '#F0F4FF',
            borderRadius: 8,
            fontSize: 12,
            color: '#1A5FB4',
            marginBottom: 10,
          }}>
            当前自动匹配：<strong>{getCostume(liveCostumeId).name}</strong> — {getCostume(liveCostumeId).description}
          </div>
        )}

        <div data-testid="costume-list">
          <span style={categoryLabel}>日常服装</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 10 }}>
            {DAILY_COSTUME_IDS.map((id) => renderCostumeButton(COSTUMES[id]))}
          </div>

          <span style={categoryLabel}>节日限定</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FESTIVAL_COSTUME_IDS.map((id) => renderCostumeButton(COSTUMES[id]))}
          </div>
        </div>
      </div>

      {/* Accessories */}
      <div style={{ marginBottom: '0' }}>
        <label style={labelStyle}>配饰</label>
        <div data-testid="accessory-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ACCESSORIES.map((acc) => (
            <button
              key={acc.id}
              data-testid={`acc-${acc.id}`}
              onClick={() => {
                const newAccessories = config.accessories.includes(acc.id)
                  ? config.accessories.filter((id) => id !== acc.id)
                  : [...config.accessories, acc.id];
                updateConfig({ accessories: newAccessories });
              }}
              style={buttonStyle(config.accessories.includes(acc.id))}
              onMouseEnter={(e) => {
                if (!config.accessories.includes(acc.id)) {
                  e.currentTarget.style.backgroundColor = 'rgba(200, 75, 49, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(200, 75, 49, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!config.accessories.includes(acc.id)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }
              }}
            >
              {acc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AvatarAppearance;
