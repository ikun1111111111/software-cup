import React, { useCallback, useState } from 'react';

export interface AppearanceConfig {
  model: string;
  skin: string;
  hair: string;
  outfit: string;
  accessories: string[];
}

export interface AvatarAppearanceProps {
  config?: AppearanceConfig;
  onChange?: (config: AppearanceConfig) => void;
}

const MODELS = [
  { id: 'model-1', name: '默认模型' },
  { id: 'model-2', name: '古风模型' },
  { id: 'model-3', name: '现代模型' },
];

const SKINS = [
  { id: 'skin-1', name: '默认肤色', color: '#FDDCB5' },
  { id: 'skin-2', name: '白皙', color: '#FFF5E1' },
  { id: 'skin-3', name: '小麦色', color: '#D4A574' },
];

const HAIRS = [
  { id: 'hair-1', name: '黑色长发' },
  { id: 'hair-2', name: '棕色短发' },
  { id: 'hair-3', name: '金色卷发' },
];

const OUTFITS = [
  { id: 'outfit-1', name: '传统汉服' },
  { id: 'outfit-2', name: '现代正装' },
  { id: 'outfit-3', name: '休闲装' },
];

const ACCESSORIES = [
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
};

const AvatarAppearance: React.FC<AvatarAppearanceProps> = ({
  config: propConfig,
  onChange,
}) => {
  const [config, setConfig] = useState<AppearanceConfig>(propConfig || DEFAULT_CONFIG);

  const updateConfig = useCallback((updates: Partial<AppearanceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange?.(newConfig);
  }, [config, onChange]);

  const handleModelChange = useCallback((modelId: string) => {
    updateConfig({ model: modelId });
  }, [updateConfig]);

  const handleSkinChange = useCallback((skinId: string) => {
    updateConfig({ skin: skinId });
  }, [updateConfig]);

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
    backgroundColor: isSelected ? '#1A5FB4' : '#F8F6F2',
    color: isSelected ? '#fff' : '#5C554C',
    border: isSelected ? '1.5px solid #1A5FB4' : '1px solid #E8E5DF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 200ms',
  });

  return (
    <div data-testid="avatar-appearance" style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 600, color: '#1A1614' }}>外观配置</h3>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>模型</label>
        <div data-testid="model-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MODELS.map((model) => (
            <button
              key={model.id}
              data-testid={`model-${model.id}`}
              onClick={() => handleModelChange(model.id)}
              style={buttonStyle(config.model === model.id)}
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>肤色</label>
        <div data-testid="skin-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SKINS.map((skin) => (
            <button
              key={skin.id}
              data-testid={`skin-${skin.id}`}
              onClick={() => handleSkinChange(skin.id)}
              style={buttonStyle(config.skin === skin.id)}
            >
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: skin.color, marginRight: 6, verticalAlign: 'middle' }} />
              {skin.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>发型</label>
        <div data-testid="hair-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {HAIRS.map((hair) => (
            <button
              key={hair.id}
              data-testid={`hair-${hair.id}`}
              onClick={() => handleHairChange(hair.id)}
              style={buttonStyle(config.hair === hair.id)}
            >
              {hair.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>服装</label>
        <div data-testid="outfit-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {OUTFITS.map((outfit) => (
            <button
              key={outfit.id}
              data-testid={`outfit-${outfit.id}`}
              onClick={() => handleOutfitChange(outfit.id)}
              style={buttonStyle(config.outfit === outfit.id)}
            >
              {outfit.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '0' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '13px', color: '#5C554C' }}>配饰</label>
        <div data-testid="accessory-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ACCESSORIES.map((acc) => (
            <button
              key={acc.id}
              data-testid={`acc-${acc.id}`}
              onClick={() => toggleAccessory(acc.id)}
              style={buttonStyle(config.accessories.includes(acc.id))}
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
