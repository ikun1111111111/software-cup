import React, { useState, useEffect } from 'react';
import { TrophyOutlined } from '@ant-design/icons';
import { getLeaderboard, getProfile } from '../../api/puzzle';

const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = 'web-' + Date.now().toString(36);

  useEffect(() => {
    Promise.all([getLeaderboard(20), getProfile(sessionId)])
      .then(([lbRes, pfRes]) => {
        const lb = (lbRes as any).data ?? lbRes;
        const pf = (pfRes as any).data ?? pfRes;
        setPlayers(lb.players || []);
        setProfile(pf);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 排名颜色与图标
  const rankConfig = [
    { color: '#C8A951', bg: 'rgba(200,169,81,0.1)', label: '状元', icon: '🥇' },
    { color: '#9E988E', bg: 'rgba(158,152,142,0.1)', label: '榜眼', icon: '🥈' },
    { color: '#B87333', bg: 'rgba(184,115,51,0.1)', label: '探花', icon: '🥉' },
  ];

  if (loading) {
    return (
      <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            border: '2px solid var(--gray-200)',
            borderTopColor: 'var(--color-gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, letterSpacing: 2 }}>金榜题名中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 32px' }}>

        {/* 灵山金榜 - 卷轴头部 */}
        <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
          {/* 顶部装饰线 */}
          <div style={{
            width: 120, height: 2, background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
            margin: '0 auto 16px',
          }} />

          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #C8A951 0%, #E8CF7A 100%)',
            boxShadow: '0 4px 16px rgba(200,169,81,0.3)',
            marginBottom: 12,
          }}>
            <TrophyOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>

          <h1 style={{
            margin: '0 0 6px', fontSize: 32, fontWeight: 700,
            fontFamily: 'var(--font-calligraphy)', color: 'var(--text-primary)',
            letterSpacing: 4,
          }}>
            灵山金榜
          </h1>
          <p style={{
            margin: 0, fontSize: 15, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-serif)', letterSpacing: 1,
          }}>
            探索景点、答对谜题、收集印章来获取积分
          </p>

          {/* 底部装饰线 */}
          <div style={{
            width: 160, height: 2, background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
            margin: '16px auto 0',
          }} />
        </div>

        {/* My profile - 匾额风格 */}
        {profile && (
          <div className="plaque-card" style={{ marginBottom: 24, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{profile.level?.icon || '🌱'}</span>
                <div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: '#F0EDE8',
                    fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
                  }}>
                    {profile.level?.name || '初学者'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(240,237,232,0.6)', marginTop: 2 }}>
                    当前等级
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 32, fontWeight: 700, color: '#C8A951',
                  fontFamily: 'var(--font-calligraphy)',
                }}>
                  {profile.score}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,237,232,0.6)' }}>
                  积分
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', gap: 20, marginTop: 16, paddingTop: 16,
              borderTop: '1px solid rgba(200,169,81,0.2)',
              flexWrap: 'wrap',
            }}>
              {[
                { icon: '🗺️', label: '景点', value: profile.visited_count },
                { icon: '✅', label: '答题', value: `${profile.correct_answers}/${profile.total_answers}` },
                { icon: '🔖', label: '印章', value: `${profile.collected_stamps}/${profile.total_stamps}` },
                { icon: '📊', label: '正确率', value: `${profile.accuracy}%` },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</div>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: '#C8A951',
                    fontFamily: 'var(--font-calligraphy)',
                  }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', marginTop: 2 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard table - 金榜列表 */}
        <div className="section-card" style={{ overflow: 'hidden', position: 'relative' }}>
          {/* 表头 */}
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-light)',
            background: 'linear-gradient(135deg, rgba(200,169,81,0.06) 0%, rgba(200,169,81,0.02) 100%)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 4, height: 20, background: 'var(--color-gold)', borderRadius: 2,
            }} />
            <span style={{
              fontWeight: 700, fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'var(--font-calligraphy)', letterSpacing: 1,
            }}>
              排名榜
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--gray-200), transparent)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-serif)' }}>
              共 {players.length} 位探险者
            </span>
          </div>

          {players.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{
                width: 60, height: 60, margin: '0 auto 16px',
                border: '2px dashed var(--gray-200)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                📜
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, margin: 0 }}>
                暂无玩家数据，成为第一个探险者吧！
              </p>
            </div>
          ) : (
            players.map((player, idx) => {
              const config = idx < 3 ? rankConfig[idx] : null;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '16px 28px',
                    borderBottom: '1px solid var(--border-light)',
                    background: config ? config.bg : 'transparent',
                    transition: 'background 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!config) e.currentTarget.style.background = 'var(--gray-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = config ? config.bg : 'transparent';
                  }}
                >
                  {/* 排名 */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: config ? config.color : 'var(--gray-100)',
                    color: config ? '#fff' : 'var(--gray-500)',
                    fontWeight: 700, fontSize: config ? 16 : 14,
                    marginRight: 14,
                    flexShrink: 0,
                    boxShadow: config ? `0 2px 8px ${config.color}40` : 'none',
                  }}>
                    {idx < 3 ? (
                      <span style={{ fontSize: 18 }}>{config?.icon}</span>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* 用户信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 16,
                      color: 'var(--text-primary)', marginBottom: 2,
                      fontFamily: idx < 3 ? 'var(--font-calligraphy)' : 'inherit',
                      letterSpacing: idx < 3 ? 1 : 0,
                    }}>
                      {player.session_id}
                      {idx < 3 && (
                        <span style={{
                          fontSize: 11, marginLeft: 8, padding: '1px 8px',
                          borderRadius: 4, background: config?.color,
                          color: '#fff', fontWeight: 500,
                          fontFamily: 'var(--font-serif)',
                          verticalAlign: 'middle',
                        }}>
                          {config?.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {player.visited_count} 景点 · {player.stamps} 印章 · {player.achievements} 成就
                    </div>
                  </div>

                  {/* 分数 */}
                  <div style={{
                    fontWeight: 700, fontSize: 18,
                    color: config ? config.color : 'var(--text-secondary)',
                    fontFamily: 'var(--font-calligraphy)',
                    letterSpacing: 1,
                    flexShrink: 0,
                  }}>
                    {player.score}
                    <span style={{
                      fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)',
                      marginLeft: 2, fontFamily: 'var(--font-serif)',
                    }}>
                      分
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部装饰 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{
            display: 'inline-block', padding: '6px 20px',
            border: '1px solid rgba(200,169,81,0.2)', borderRadius: 4,
            color: 'var(--text-tertiary)', fontSize: 12,
            fontFamily: 'var(--font-serif)', letterSpacing: 1,
          }}>
            学无止境 勇攀高峰
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
