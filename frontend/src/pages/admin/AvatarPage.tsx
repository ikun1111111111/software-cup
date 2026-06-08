import React, { useCallback, useEffect, useState } from 'react';
import { SaveOutlined, CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { message } from 'antd';
import AvatarAppearance, { MODELS, SKINS, HAIRS, OUTFITS } from '../../components/admin/AvatarAppearance';
import VoiceSelector from '../../components/admin/VoiceSelector';
import WelcomeEditor from '../../components/admin/WelcomeEditor';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import PaperPanel from '../../components/admin/PaperPanel';
import PageTransition from '../../components/admin/PageTransition';
import { getModelPath, getExpressionForAppearance } from '../../config/avatarModels';
import { getCostume } from '../../config/costumeMap';
import { previewVoice } from '../../api/tts';
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
    costumeMode: 'auto' as const,
    costumeId: 'daily-classic',
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
        costumeMode: (backend.appearanceJson.costumeMode as 'auto' | 'manual') || 'auto',
        costumeId: backend.appearanceJson.costumeId || 'daily-classic',
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
          costumeMode: config.appearance.costumeMode,
          costumeId: config.appearance.costumeId,
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

  const selectedVoiceName = DEFAULT_VOICES.find((v) => v.id === config.voiceId)?.name || config.voiceId;
  const selectedModelName = MODELS.find((m) => m.id === config.appearance.model)?.name || config.appearance.model;
  const selectedSkinName = SKINS.find((s) => s.id === config.appearance.skin)?.name || config.appearance.skin;
  const selectedHairName = HAIRS.find((h) => h.id === config.appearance.hair)?.name || config.appearance.hair;
  const selectedOutfitName = OUTFITS.find((o) => o.id === config.appearance.outfit)?.name || config.appearance.outfit;

  // Derive costume properties from config (single source of truth)
  const costumeDef = getCostume(config.appearance.costumeId);
  const costumeTexturePath = costumeDef.texturePath;
  const costumeCssFilter = costumeDef.cssFilter;
  const previewKey = `${config.appearance.model}-${config.appearance.skin}-${config.appearance.hair}-${config.appearance.outfit}-${config.appearance.costumeId}`;

  return (
    <div data-testid="avatar-page" className="animate-scroll-unfold" style={{
      padding: isMobile ? '16px' : '32px',
      maxWidth: 1440,
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
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-serif)',
          }}>
            数字人配置
          </h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {saved && (
              <span data-testid="saved-msg" style={{
                color: 'var(--mountain-mid)',
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
                backgroundColor: '#A83828',
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
                opacity: saving || loading ? 0.45 : 1,
                boxShadow: saving || loading ? 'none' : '0 2px 8px rgba(168, 56, 40, 0.25)',
              }}
              onMouseEnter={(e) => {
                if (!saving && !loading) {
                  e.currentTarget.style.backgroundColor = '#8C2E20';
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201, 169, 110, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving && !loading) {
                  e.currentTarget.style.backgroundColor = '#A83828';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(168, 56, 40, 0.25)';
                }
              }}
            >
              <SaveOutlined />
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(201, 169, 110, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LoadingOutlined style={{ fontSize: 28, color: 'var(--gold-leaf)' }} className="animate-spin" />
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              正在加载数字人配置...
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              maxWidth: 320,
              lineHeight: 1.6,
            }}>
              请稍候，系统正在从服务端获取最新的数字人形象与声音配置
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '28px',
            alignItems: 'flex-start',
          }}>
            {/* 左侧：实时预览区域 */}
            <div style={{
              flex: isMobile ? 'auto' : '0 0 340px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* 月门卷轴预览容器 */}
              <div data-testid="preview-area" style={{
                position: 'relative',
                padding: '16px 16px 20px',
                backgroundColor: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-medium)',
                overflow: 'hidden',
              }}>
                {/* 卷轴轴头装饰 */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.3) 20%, rgba(201,169,110,0.5) 50%, rgba(201,169,110,0.3) 80%, transparent 100%)',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.3) 20%, rgba(201,169,110,0.5) 50%, rgba(201,169,110,0.3) 80%, transparent 100%)',
                }} />

                <div style={{
                  textAlign: 'center',
                  marginBottom: 12,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--vermilion)',
                    opacity: 0.8,
                  }} />
                  实时预览
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--vermilion)',
                    opacity: 0.8,
                  }} />
                </div>

                {/* 月门型预览框 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '12px',
                  borderRadius: '50% / 42%',
                  border: '2px solid rgba(168, 56, 40, 0.12)',
                  background: 'linear-gradient(180deg, rgba(247,245,240,0.6) 0%, rgba(237,232,222,0.5) 100%)',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {/* 水墨晕染背景层 */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at 50% 80%, rgba(168,156,140,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  <div
                    key={previewKey}
                    className="animate-ink-reveal"
                    style={{
                      borderRadius: '50% / 42%',
                      overflow: 'hidden',
                      width: isMobile ? 200 : 280,
                      height: isMobile ? 280 : 380,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <DigitalHuman
                      modelPath={getModelPath(config.appearance.model)}
                      width={isMobile ? 200 : 280}
                      height={isMobile ? 280 : 380}
                      emotion="neutral"
                      expression={getExpressionForAppearance(config.appearance)}
                      texturePath={costumeTexturePath}
                      cssFilter={costumeCssFilter}
                      onReady={() => console.log('[AvatarPage] Preview ready')}
                    />
                  </div>
                </div>

                {/* 当前配置摘要 */}
                <div style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  backgroundColor: 'rgba(247, 245, 240, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-light)',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px 12px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>模型</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedModelName}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>肤色</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedSkinName}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>发型</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedHairName}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>服装</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedOutfitName}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>服装</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{costumeDef.name}</span>
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>{costumeDef.description}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>声音</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedVoiceName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：配置面板 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div data-testid="config-tabs" style={{
                marginBottom: '20px',
                backgroundColor: 'var(--ink-dark)',
                borderRadius: 'var(--radius-md)',
                padding: '4px',
                width: 'fit-content',
                display: 'flex',
                gap: '2px',
              }}>
                {tabs.map((tab, i) => (
                  <span
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: activeTab === i ? 'rgba(243, 239, 230, 0.1)' : 'transparent',
                      color: activeTab === i ? 'var(--gold-leaf)' : 'rgba(243, 239, 230, 0.55)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: activeTab === i ? 600 : 400,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                    }}
                  >
                    {tab}
                    {activeTab === i && (
                      <span style={{
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: 'var(--vermilion)',
                      }} />
                    )}
                  </span>
                ))}
              </div>

              <PaperPanel>
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
                      previewVoice={(voiceId) => previewVoice(voiceId, config.welcomeMessage)}
                    />
                  </div>
                )}
                {activeTab === 2 && (
                  <div data-testid="welcome-section">
                    <WelcomeEditor
                      welcome={config.welcomeMessage}
                      onChange={handleWelcomeChange}
                      onSave={handleWelcomeChange}
                      onPreview={async (text) => {
                        const url = await previewVoice(config.voiceId, text);
                        const audio = new Audio(url);
                        await audio.play();
                        audio.onended = () => URL.revokeObjectURL(url);
                      }}
                    />
                  </div>
                )}
              </PaperPanel>
            </div>
          </div>
        )}
      </PageTransition>
    </div>
  );
};

export default AvatarPage;
