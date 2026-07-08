import React, { useMemo, useState } from 'react';
import {
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ThemeTopic } from '../../types/themeCards';
import {
  findScenarioByTopic,
  SERVICE_SCENARIOS,
  type ScenarioItem,
  type ServiceScenario,
} from '../Chat/askMeServiceConfig';

export { SERVICE_SCENARIOS };
export type { ScenarioItem, ServiceScenario };

interface Props {
  activeTopic: string | null;
  onSelect: (params: { topic: ThemeTopic; question: string }) => void;
}

const TouristServiceSidebar: React.FC<Props> = ({ activeTopic, onSelect }) => {
  const [expandedScenario, setExpandedScenario] = useState<ServiceScenario | null>('route');
  const [selectedScenario, setSelectedScenario] = useState<ServiceScenario | null>(null);
  const activeScenario = useMemo(() => {
    const selected = SERVICE_SCENARIOS.find((scenario) => scenario.id === selectedScenario);
    const selectedMatchesTopic =
      selected &&
      activeTopic &&
      (selected.topic === activeTopic || selected.subItems?.some((subItem) => subItem.id === activeTopic));
    if (selectedMatchesTopic) return selected;
    return findScenarioByTopic(activeTopic);
  }, [activeTopic, selectedScenario]);

  const handleScenarioClick = (scenario: ScenarioItem) => {
    setSelectedScenario(scenario.id);
    if (scenario.subItems && scenario.subItems.length > 0) {
      setExpandedScenario((current) => (current === scenario.id ? null : scenario.id));
    } else {
      setExpandedScenario(scenario.id);
    }
    onSelect({ topic: scenario.topic, question: scenario.defaultQuestion });
  };

  const handlePromptClick = (topic: ThemeTopic, question: string, scenarioId?: ServiceScenario) => {
    if (scenarioId) setSelectedScenario(scenarioId);
    onSelect({ topic, question });
  };

  return (
    <aside
      data-testid="tourist-service-sidebar"
      style={{
        width: 250,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '72px 14px 18px',
        background:
          'linear-gradient(180deg, rgba(253,251,247,0.94) 0%, rgba(243,239,230,0.88) 100%)',
        borderRight: '1px solid rgba(106,156,137,0.18)',
        boxShadow: '14px 0 42px rgba(42,37,32,0.08)',
        backdropFilter: 'blur(18px) saturate(126%)',
        WebkitBackdropFilter: 'blur(18px) saturate(126%)',
        zIndex: 112,
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '56px 0 auto',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200,75,49,0.28), transparent)',
        }}
      />

      <header
        style={{
          padding: '0 2px 4px',
          color: 'var(--text-primary)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', color: 'rgba(42,37,32,0.42)' }}>ASK ME</div>
            <h2
              style={{
                margin: '4px 0 0',
                fontFamily: "var(--font-calligraphy), 'KaiTi', 'STKaiti', serif",
                fontSize: 24,
                lineHeight: 1,
                letterSpacing: '0.12em',
              }}
            >
              问我服务
            </h2>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SERVICE_SCENARIOS.map((scenario, index) => {
          const isActive = activeScenario?.id === scenario.id;
          const isExpanded = expandedScenario === scenario.id;

          return (
            <section
              key={scenario.id}
              className="ask-service-card"
              style={{
                borderRadius: 18,
                border: isActive
                  ? `1px solid ${scenario.accent}55`
                  : '1px solid rgba(42,37,32,0.07)',
                background: isActive
                  ? `linear-gradient(135deg, ${scenario.accent}17, rgba(255,255,255,0.78))`
                  : 'rgba(255,255,255,0.50)',
                boxShadow: isActive ? `0 16px 30px ${scenario.accent}18` : '0 8px 20px rgba(42,37,32,0.04)',
                overflow: 'hidden',
                animation: `askServiceIn 420ms var(--ease-out-expo) ${index * 45}ms both`,
              }}
            >
              <button
                onClick={() => handleScenarioClick(scenario)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  padding: '12px 12px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? scenario.accent : `${scenario.accent}18`,
                      color: isActive ? '#fff' : scenario.accent,
                      fontSize: 18,
                      flexShrink: 0,
                      boxShadow: isActive ? `0 10px 24px ${scenario.accent}30` : 'none',
                    }}
                  >
                    {scenario.icon}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {scenario.label}
                      </span>
                      <span style={{ color: scenario.accent, fontSize: 12 }}>
                        {isExpanded ? <DownOutlined /> : <RightOutlined />}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        fontSize: 11,
                        color: scenario.accent,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {scenario.eyebrow}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 5,
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: 'rgba(42,37,32,0.58)',
                      }}
                    >
                      {scenario.description}
                    </span>
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div
                  style={{
                    padding: '0 12px 12px 60px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                    animation: 'askSubPanelIn 260ms var(--ease-out-expo) both',
                  }}
                >
                  {scenario.subItems?.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handlePromptClick(subItem.id, subItem.defaultQuestion, scenario.id)}
                      style={{
                        border: '1px solid rgba(42,37,32,0.06)',
                        borderRadius: 12,
                        background: activeTopic === subItem.id ? `${scenario.accent}18` : 'rgba(255,255,255,0.48)',
                        color: 'var(--text-secondary)',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      <strong style={{ color: 'var(--text-primary)' }}>{subItem.label}</strong>
                      <span style={{ display: 'block', marginTop: 2, color: 'rgba(42,37,32,0.48)' }}>
                        {subItem.hint}
                      </span>
                    </button>
                  ))}

                  {scenario.prompts.slice(0, 2).map((prompt) => (
                    <button
                      key={prompt.title}
                      onClick={() => handlePromptClick(scenario.topic, prompt.question, scenario.id)}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '7px 10px',
                        background: 'rgba(255,255,255,0.62)',
                        color: 'rgba(42,37,32,0.66)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 12,
                      }}
                    >
                      {prompt.title} · 立即询问
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <style>{`
        .ask-service-card:hover {
          transform: translateY(-1px);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        @keyframes askServiceIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes askSubPanelIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </aside>
  );
};

export default TouristServiceSidebar;
