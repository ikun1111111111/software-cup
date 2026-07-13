import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SaveOutlined,
  CheckOutlined,
  LoadingOutlined,
  DesktopOutlined,
  MobileOutlined,
  CalendarOutlined,
  SoundOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import AvatarAppearance, { type AppearanceConfig } from '../../components/admin/AvatarAppearance';
import PaperPanel from '../../components/admin/PaperPanel';
import PageTransition from '../../components/admin/PageTransition';
import { VRMPreview } from '../../components/admin/VRMPreview';
import { getCostume, type CostumeDef } from '../../config/costumeMap';
import { VOICE_PREVIEW_OPTIONS } from '../../config/voicePreviewOptions';
import { useStaticVoicePreview } from '../../hooks/useStaticVoicePreview';
import {
  getActiveAvatar,
  getAvatars,
  createAvatar,
  updateAvatar,
  activateAvatar,
} from '../../api/avatar';

interface LocalConfig {
  backendId: string | null;
  appearance: AppearanceConfig;
  voiceId: string;
  welcomeMessage: string;
}

const DEFAULT_CONFIG: LocalConfig = {
  backendId: null,
  appearance: {
    costumeMode: 'auto' as const,
    costumeId: 'daily-artistic',
  },
  voiceId: 'mandarin',
  welcomeMessage: '你好！欢迎来到灵山景区，我是你的数字人导游，有什么可以帮你的吗？',
};

const mapBackendToLocal = (backend: Awaited<ReturnType<typeof getActiveAvatar>>): LocalConfig => ({
  backendId: backend.id,
  appearance: backend.appearanceJson
    ? {
        costumeMode: (backend.appearanceJson.costumeMode as 'auto' | 'manual') || 'auto',
        costumeId: backend.appearanceJson.costumeId || 'daily-artistic',
      }
    : DEFAULT_CONFIG.appearance,
  voiceId: backend.voiceId || 'mandarin',
  welcomeMessage: backend.welcomeMessage || DEFAULT_CONFIG.welcomeMessage,
});

const AvatarPage: React.FC = () => {
  const [config, setConfig] = useState<LocalConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isMobile = false;

  const handlePreviewError = useCallback(() => {
    message.error('试听音频加载失败，请检查静态资源');
  }, []);

  const { playingVoiceId, togglePreview } = useStaticVoicePreview(handlePreviewError);

  useEffect(() => {
    const preloaders = VOICE_PREVIEW_OPTIONS.map(({ previewUrl }) => {
      const audio = new Audio(previewUrl);
      audio.preload = 'auto';
      audio.load();
      return audio;
    });

    return () => {
      preloaders.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

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

  const costume = useMemo<CostumeDef>(() => getCostume(config.appearance.costumeId), [config.appearance.costumeId]);

  const handleAppearanceChange = useCallback((appearance: AppearanceConfig) => {
    setConfig((prev) => ({ ...prev, appearance }));
    setSaved(false);
  }, []);

  const handleVoiceChange = useCallback((voiceId: string) => {
    setConfig((prev) => ({ ...prev, voiceId }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const modelFile = costume.modelFile || 'avatar.vrm';
      const payload = {
        name: '默认数字人',
        modelPath: `/models/${modelFile}`,
        appearanceJson: {
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
  }, [config, costume]);

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
            数字人形象配置
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

        <PaperPanel title="双端数字人服务" withScrollHead style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            {[
              { icon: <DesktopOutlined />, label: 'Web 大屏', value: '现场讲解互动', hint: '问我、讲讲这里、历史穿越统一使用当前形象策略' },
              { icon: <MobileOutlined />, label: '移动端', value: '路线随身导览', hint: '移动端语音讲解复用同一音色与讲解风格' },
              { icon: <CalendarOutlined />, label: '当前服装', value: costume.name, hint: `${costume.category === 'festival' ? '节日限定' : '日常服装'} · ${costume.description}` },
            ].map((item) => (
              <div key={item.label} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(184,115,51,0.12)', background: 'rgba(255,253,247,0.62)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mountain-mid)', fontSize: 13, fontWeight: 700 }}>
                  {item.icon}{item.label}
                </div>
                <strong style={{ display: 'block', marginTop: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: 21 }}>{item.value}</strong>
                <small style={{ display: 'block', marginTop: 5, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{item.hint}</small>
              </div>
            ))}
          </div>
        </PaperPanel>

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
              请稍候，系统正在从服务端获取最新的数字人形象配置
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
              <div data-testid="preview-area" style={{
                position: 'relative',
                padding: '16px 16px 20px',
                backgroundColor: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-medium)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  textAlign: 'center',
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

                <VRMPreview
                  key={costume.modelFile || 'avatar.vrm'}
                  modelUrl={`/models/${costume.modelFile || 'avatar.vrm'}`}
                  width={280}
                  height={360}
                />

                <div style={{
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {costume.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {costume.category === 'festival' ? '节日限定' : '日常服装'} · {costume.description}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(247, 245, 240, 0.6)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-light)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>当前配置摘要</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>服装</span>
                    <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{costume.name}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>模式</span>
                    <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{config.appearance.costumeMode === 'auto' ? '自动匹配' : '手动选择'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>声音</span>
                    <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-primary)' }}>{VOICE_PREVIEW_OPTIONS.find((v) => v.id === config.voiceId)?.name || config.voiceId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：配置面板 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <PaperPanel>
                <div data-testid="appearance-section">
                  <AvatarAppearance config={config.appearance} onChange={handleAppearanceChange} />
                </div>

                <div data-testid="voice-section" style={{
                  marginTop: 24,
                  paddingTop: 24,
                  borderTop: '1px solid var(--border-light)',
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <SoundOutlined style={{ color: 'var(--mountain-mid)' }} />
                    讲解声音
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {VOICE_PREVIEW_OPTIONS.map((voice) => {
                      const selected = config.voiceId === voice.id;
                      return (
                        <div
                          key={voice.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minWidth: 190,
                            padding: '6px 8px 6px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: selected ? '1.5px solid rgba(200, 75, 49, 0.35)' : '1px solid var(--border-light)',
                            backgroundColor: selected ? 'rgba(200, 75, 49, 0.08)' : 'transparent',
                            transition: 'all 200ms',
                          }}
                        >
                          <button
                            type="button"
                            data-testid={`voice-${voice.id}`}
                            data-selected={selected ? 'true' : 'false'}
                            aria-pressed={selected}
                            onClick={() => handleVoiceChange(voice.id)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              minHeight: 44,
                              padding: '6px 0',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: selected ? 600 : 500, color: selected ? '#A83828' : 'var(--text-secondary)' }}>
                              {voice.name}
                            </div>
                            <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>
                              {voice.description}
                            </div>
                          </button>
                          <button
                            type="button"
                            data-testid={`voice-preview-${voice.id}`}
                            onClick={() => {
                              void togglePreview(voice.id, voice.previewUrl);
                            }}
                            aria-label={`${playingVoiceId === voice.id ? '停止' : '试听'}${voice.name}`}
                            style={{
                              minWidth: 78,
                              minHeight: 44,
                              padding: '8px 10px',
                              border: 'none',
                              borderRadius: 22,
                              background: playingVoiceId === voice.id ? 'rgba(200, 75, 49, 0.1)' : 'transparent',
                              cursor: 'pointer',
                              color: playingVoiceId === voice.id ? '#A83828' : 'var(--mountain-mid)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 180ms ease',
                            }}
                            title={playingVoiceId === voice.id ? '停止试听' : '试听'}
                          >
                            {playingVoiceId === voice.id ? (
                              <>
                                <PauseCircleOutlined style={{ fontSize: 18 }} />
                                <span style={{ marginLeft: 4, fontSize: 11 }}>播放中</span>
                              </>
                            ) : (
                              <>
                                <PlayCircleOutlined style={{ fontSize: 18 }} />
                                <span style={{ marginLeft: 4, fontSize: 11 }}>试听</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PaperPanel>
            </div>
          </div>
        )}
      </PageTransition>
    </div>
  );
};

export default AvatarPage;
