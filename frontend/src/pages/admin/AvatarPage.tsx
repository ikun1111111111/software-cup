import React, { useCallback, useEffect, useState } from 'react';
import { SaveOutlined, CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { message } from 'antd';
import AvatarAppearance from '../../components/admin/AvatarAppearance';
import { COSTUMES } from '../../config/costumeMap';
import VoiceSelector from '../../components/admin/VoiceSelector';
import WelcomeEditor from '../../components/admin/WelcomeEditor';
import DigitalHuman from '../../components/DigitalHuman/DigitalHuman';
import PaperPanel from '../../components/admin/PaperPanel';
import PageTransition from '../../components/admin/PageTransition';
import { getExpressionForAppearance } from '../../config/avatarModels';
import { getCostume } from '../../config/costumeMap';
import { useCostume } from '../../hooks/useCostume';
import { previewVoice } from '../../api/tts';
import {
  getActiveAvatar,
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
    costumeId: 'festival-spring',
    expressionId: 'f00',
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
        costumeId: backend.appearanceJson.costumeId || 'festival-spring',
        expressionId: backend.appearanceJson.expressionId || 'f00',
      }
    : DEFAULT_CONFIG.appearance,
  voiceId: backend.voiceId || DEFAULT_CONFIG.voiceId,
  welcomeMessage: backend.welcomeMessage || DEFAULT_CONFIG.welcomeMessage,
});

const STORAGE_KEY = 'avatar-local-config';

const AvatarPage: React.FC = () => {
  const { costumeId: liveCostumeId, mode: liveCostumeMode, selectCostume, resetToAuto } = useCostume();
  const [config, setConfig] = useState<LocalConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_CONFIG;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [backendConnected, setBackendConnected] = useState(true);
  const isMobile = false;

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const active = await getActiveAvatar();
        setConfig(mapBackendToLocal(active));
        setBackendConnected(true);
      } catch {
        setBackendConnected(false);
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
    const payload = {
      name: '默认数字人',
      appearanceJson: {
        model: config.appearance.model,
        skin: config.appearance.skin,
        hair: config.appearance.hair,
        outfit: config.appearance.outfit,
        accessories: config.appearance.accessories,
        costumeMode: config.appearance.costumeMode,
        costumeId: config.appearance.costumeId,
        expressionId: config.appearance.expressionId || 'f00',
      },
      voiceId: config.voiceId,
      welcomeMessage: config.welcomeMessage,
    };

    if (backendConnected) {
      try {
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
      } catch {
        setBackendConnected(false);
      }
    }

    if (!backendConnected) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      message.info('后端未连接，配置已保存到本地');
      setSaved(true);
    }

    setSaving(false);
  }, [config, backendConnected]);

  const tabs = ['外观', '声音', '欢迎语'];

  const selectedVoiceName = DEFAULT_VOICES.find((v) => v.id === config.voiceId)?.name || config.voiceId;

  // Derive costume properties from config (single source of truth)
  const costumeDef = getCostume(config.appearance.costumeId);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            {!backendConnected && (
              <span style={{
                fontSize: '11px',
                color: '#B8860B',
                backgroundColor: 'rgba(184, 134, 11, 0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 500,
              }}>
                本地模式
              </span>
            )}
          </div>
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
              onClick={() => {
                setConfig(DEFAULT_CONFIG);
                localStorage.removeItem(STORAGE_KEY);
                setSaved(false);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 200ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(168, 56, 40, 0.05)';
                e.currentTarget.style.borderColor = 'var(--vermilion)';
                e.currentTarget.style.color = 'var(--vermilion)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              恢复默认
            </button>
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
              flex: isMobile ? 'auto' : '0 0 400px',
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
                      width: isMobile ? 220 : 340,
                      height: isMobile ? 300 : 440,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <DigitalHuman
                      width={isMobile ? 220 : 340}
                      height={isMobile ? 300 : 440}
                      emotion="neutral"
                      expression={config.appearance.expressionId || 'f00'}
                      costumeId={config.appearance.costumeId}
                      onReady={() => console.log('[AvatarPage] Preview ready')}
                    />
                  </div>
                </div>

                {/* 当前配置摘要 */}
                <div style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  backgroundColor: 'rgba(247, 245, 240, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-light)',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.8,
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>当前服装</span>
                      <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {config.appearance.costumeId ? COSTUMES[config.appearance.costumeId]?.name || config.appearance.costumeId : '自动匹配'}
                      </span>
                    </div>
                    <div>
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
                    <AvatarAppearance
                      config={config.appearance}
                      onChange={handleAppearanceChange}
                      activeCostumeId={liveCostumeId}
                      activeCostumeMode={liveCostumeMode}
                      onCostumeSelect={selectCostume}
                      onCostumeAutoToggle={() => liveCostumeMode === 'auto' ? selectCostume(liveCostumeId) : resetToAuto()}
                    />
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
