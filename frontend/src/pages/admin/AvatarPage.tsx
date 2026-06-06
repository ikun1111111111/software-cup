import React, { useCallback, useEffect, useState } from 'react';
import { SaveOutlined, CheckOutlined } from '@ant-design/icons';
import { message } from 'antd';
import AvatarAppearance from '../../components/admin/AvatarAppearance';
import VoiceSelector from '../../components/admin/VoiceSelector';
import WelcomeEditor from '../../components/admin/WelcomeEditor';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import GlassCard from '../../components/admin/GlassCard';
import PageTransition from '../../components/admin/PageTransition';
import { getModelPath, getExpressionForAppearance } from '../../config/avatarModels';
import {
  getActiveAvatar,
  getAvatars,
  createAvatar,
  updateAvatar,
  activateAvatar,
} from '../../api/avatar';
import type { AppearanceConfig } from '../../components/admin/AvatarAppearance';
import type { Voice } from '../../components/admin/VoiceSelector';

interface LocalConfig {
  backendId: string | null;
  appearance: AppearanceConfig;
  voiceId: string;
  welcomeMessage: string;
}

const DEFAULT_VOICES: Voice[] = [
  { id: 'voice-1', name: '甜美女声', language: '中文', gender: '女', previewUrl: '' },
  { id: 'voice-2', name: '沉稳男声', language: '中文', gender: '男', previewUrl: '' },
  { id: 'voice-3', name: '活泼女声', language: '中文', gender: '女', previewUrl: '' },
  { id: 'voice-4', name: '磁性男声', language: '英文', gender: '男', previewUrl: '' },
];

const DEFAULT_CONFIG: LocalConfig = {
  backendId: null,
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

const mapBackendToLocal = (backend: Awaited<ReturnType<typeof getActiveAvatar>>): LocalConfig => ({
  backendId: backend.id,
  appearance: backend.appearanceJson
    ? {
        model: backend.appearanceJson.model || DEFAULT_CONFIG.appearance.model,
        skin: backend.appearanceJson.skin || DEFAULT_CONFIG.appearance.skin,
        hair: backend.appearanceJson.hair || DEFAULT_CONFIG.appearance.hair,
        outfit: backend.appearanceJson.outfit || DEFAULT_CONFIG.appearance.outfit,
        accessories: Array.isArray(backend.appearanceJson.accessories)
          ? backend.appearanceJson.accessories
          : DEFAULT_CONFIG.appearance.accessories,
      }
    : DEFAULT_CONFIG.appearance,
  voiceId: backend.voiceId || DEFAULT_CONFIG.voiceId,
  welcomeMessage: backend.welcomeMessage || DEFAULT_CONFIG.welcomeMessage,
});

const AvatarPage: React.FC = () => {
  const [config, setConfig] = useState<LocalConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const isMobile = false;

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const active = await getActiveAvatar();
        setConfig(mapBackendToLocal(active));
      } catch (err: any) {
        try {
          const list = await getAvatars({ page: 1, pageSize: 1 });
          if (list.data.length > 0) {
            setConfig(mapBackendToLocal(list.data[0]));
          } else {
            setConfig(DEFAULT_CONFIG);
          }
        } catch (listErr: any) {
          message.error('加载数字人配置失败: ' + (listErr?.message || '未知错误'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        name: '默认数字人',
        modelPath: getModelPath(config.appearance.model),
        appearanceJson: {
          model: config.appearance.model,
          skin: config.appearance.skin,
          hair: config.appearance.hair,
          outfit: config.appearance.outfit,
          accessories: config.appearance.accessories,
        },
        voiceId: config.voiceId,
        welcomeMessage: config.welcomeMessage,
      };

      let backendId = config.backendId;
      if (backendId) {
        await updateAvatar(backendId, payload);
      } else {
        const created = await createAvatar(payload);
        backendId = created.id;
        setConfig((prev) => ({ ...prev, backendId }));
      }

      if (backendId) {
        await activateAvatar(backendId);
      }

      message.success('配置已保存并生效');
      setSaved(true);
    } catch (err: any) {
      message.error('保存失败: ' + (err?.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  }, [config]);

  const tabs = ['外观', '声音', '欢迎语'];

  return (
    <div data-testid="avatar-page" style={{
      padding: isMobile ? '16px' : '28px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <PageTransition>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '20px' : '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <h1 className="font-serif" style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
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
              disabled={saving || loading}
              style={{
                padding: '8px 22px',
                backgroundColor: saving || loading ? 'var(--gray-300)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms',
                boxShadow: saving || loading ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <SaveOutlined />
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '24px',
          }}>
            <GlassCard style={{
              flex: isMobile ? 'auto' : '0 0 280px',
              padding: '20px',
            }}>
              <div data-testid="preview-area">
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
                  <div>声音: {DEFAULT_VOICES.find((v) => v.id === config.voiceId)?.name || config.voiceId}</div>
                </div>
              </div>
            </GlassCard>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div data-testid="config-tabs" className="scroll-tags" style={{
                marginBottom: '20px',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                padding: '4px',
                width: 'fit-content',
                backdropFilter: 'blur(12px)',
              }}>
                {tabs.map((tab, i) => (
                  <span
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: activeTab === i ? 'var(--surface-solid)' : 'transparent',
                      color: activeTab === i ? 'var(--accent)' : 'var(--text-secondary)',
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

              <GlassCard style={{ overflow: 'hidden' }}>
                {activeTab === 0 && (
                  <div data-testid="appearance-section">
                    <AvatarAppearance config={config.appearance} onChange={handleAppearanceChange} />
                  </div>
                )}
                {activeTab === 1 && (
                  <div data-testid="voice-section">
                    <VoiceSelector
                      voices={DEFAULT_VOICES}
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
              </GlassCard>
            </div>
          </div>
        )}
      </PageTransition>
    </div>
  );
};

export default AvatarPage;
