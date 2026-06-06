import React, { useState, useEffect } from 'react';
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载排行榜...</div>;

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 24px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>🏆 探险排行榜</h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-tertiary)' }}>
          探索景点、答对谜题、收集印章来获取积分
        </p>

        {/* My profile */}
        {profile && (
          <div className="section-card" style={{ padding: '18px 24px', marginBottom: 20, borderLeft: '4px solid #E8A838' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 24, marginRight: 8 }}>{profile.level?.icon || '🌱'}</span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{profile.level?.name || '初学者'}</span>
              </div>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#E8A838' }}>{profile.score} 分</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>🗺️ {profile.visited_count} 景点</span>
              <span>✅ {profile.correct_answers}/{profile.total_answers} 题</span>
              <span>🔖 {profile.collected_stamps}/{profile.total_stamps} 印章</span>
              <span>📊 {profile.accuracy}% 正确率</span>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        <div className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', fontWeight: 600, fontSize: 15 }}>
            排名
          </div>
          {players.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              暂无玩家数据，成为第一个探险者吧！
            </div>
          ) : (
            players.map((player, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', padding: '12px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  background: idx < 3 ? `${['#FFD700', '#C0C0C0', '#CD7F32'][idx]}08` : 'transparent',
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: idx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] : '#f0f0f0',
                  color: idx < 3 ? '#fff' : '#666',
                  fontWeight: 700, fontSize: idx < 3 ? 16 : 14,
                  marginRight: 12,
                }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{player.session_id}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {player.visited_count} 景点 · {player.stamps} 印章 · {player.achievements} 成就
                  </div>
                </div>
                <span style={{ fontWeight: 700, color: '#E8A838' }}>{player.score}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
