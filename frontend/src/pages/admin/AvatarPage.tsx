import React, { useCallback, useEffect, useState } from 'react';
import { SaveOutlined, CheckOutlined } from '@ant-design/icons';
import AvatarAppearance from '../../components/admin/AvatarAppearance';
import VoiceSelector from '../../components/admin/VoiceSelector';
import WelcomeEditor from '../../components/admin/WelcomeEditor';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import { getModelPath, getExpressionForAppearance } from '../../config/avatarModels';
import type { AppearanceConfig } from '../../components/admin/AvatarAppearance';
import type { Voice } from '../../components/admin/VoiceSelector';

interface AvatarConfig {
  appearance: AppearanceConfig;
  voiceId: string;
  welcomeMessage: string;
}

const MOCK_VOICES: Voice[] = [
  { id: 'voice-1', name: '甜美女声', language: '中文', gender: '女', previewUrl: '' },
  { id: 'voice-2', name: '沉稳男声', language: '中文', gender: '男', previewUrl: '' },
  { id: 'voice-3', name: '活泼女声', language: '中文', gender: '女', previewUrl: '' },
];

const DEFAULT_CONFIG: AvatarConfig = {
  appearance: {
    model: 'model-1',
    skin: 'skin-1',
    hair: 'hair-1',
    outfit: 'outfit-1',
    accessories: [],
  },
  voiceId: 'voice-1',
  welcomeMessage: '你好！欢迎来到灵山景区，我是你的数字人导游，有什么可以帮你的吗？',
};

const AvatarPage: React.FC = () => {
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isMobile = false; // web-only

  useEffect(() => {
  }, []);

  const handleAppearanceChange = useCallback((appearance: AppearanceConfig) => {
    setConfig((prev) => ({ ...prev, appearance }));
    setSaved(false);
  }, []);

  const handleVoiceChange = useCallback((voiceId: string) => {
    setConfig((prev) => ({ ...prev, voiceId }));
    setSaved(false);
  }, []);

  const handleWelcomeChange = useCallback((welcomeMessage: string) => {
    setConfig((prev) => ({ ...prev, welcomeMessage }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 1000);
  }, []);

  const tabs = ['外观', '声音', '欢迎语'];

  return (
    <div data-testid="avatar-page" style={{
      padding: isMobile ? '16px' : '28px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? '20px' : '28px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? '18px' : '22px',
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          数字人配置
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saved && (
            <span data-testid="saved-msg" style={{
              color: 'var(--color-success)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}>
              <CheckOutlined /> 已保存
            </span>
          )}
          <button
            data-testid="save-btn"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 22px',
              backgroundColor: saving ? 'var(--gray-300)' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 200ms',
              boxShadow: saving ? 'none' : '0 2px 8px rgba(26, 95, 180, 0.25)',
            }}
          >
            <SaveOutlined />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '24px',
      }}>
        {/* Preview area */}
        <div data-testid="preview-area" className="section-card" style={{
          flex: isMobile ? 'auto' : '0 0 280px',
          padding: '20px',
        }}>
          <h3 style={{
            margin: '0 0 14px 0',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            实时预览
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DigitalHuman
              modelPath={getModelPath(config.appearance.model)}
              width={isMobile ? 180 : 240}
              height={isMobile ? 260 : 340}
              emotion="neutral"
              expression={getExpressionForAppearance(config.appearance)}
              onReady={() => console.log('[AvatarPage] Preview ready')}
            />
          </div>
          <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            <div>模型: {config.appearance.model}</div>
            <div>声音: {config.voiceId}</div>
          </div>
        </div>

        {/* Config area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-testid="config-tabs" className="scroll-tags" style={{
            marginBottom: '20px',
            backgroundColor: 'var(--gray-100)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            width: 'fit-content',
          }}>
            {tabs.map((tab, i) => (
              <span
                key={tab}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: activeTab === i ? 'var(--surface-card)' : 'transparent',
                  color: activeTab === i ? 'var(--color-primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: activeTab === i ? 600 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  boxShadow: activeTab === i ? 'var(--shadow-sm)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="section-card" style={{ overflow: 'hidden' }}>
            {activeTab === 0 && (
              <div data-testid="appearance-section">
                <AvatarAppearance config={config.appearance} onChange={handleAppearanceChange} />
              </div>
            )}
            {activeTab === 1 && (
              <div data-testid="voice-section">
                <VoiceSelector
                  voices={MOCK_VOICES}
                  selected={config.voiceId}
                  onChange={handleVoiceChange}
                  onPreview={() => {}}
                />
              </div>
            )}
            {activeTab === 2 && (
              <div data-testid="welcome-section">
                <WelcomeEditor
                  welcome={config.welcomeMessage}
                  onChange={handleWelcomeChange}
                  onSave={handleWelcomeChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPage;
