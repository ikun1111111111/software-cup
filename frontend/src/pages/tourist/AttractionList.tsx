import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnvironmentOutlined, SearchOutlined, TagOutlined } from '@ant-design/icons';
import { listSpots, type Spot } from '../../api/spots';

const CATEGORIES = [
  { key: '', label: '全部景点' },
  { key: '核心景点', label: '核心景点' },
  { key: '特色景点', label: '特色景点' },
  { key: '文化设施', label: '文化设施' },
];

const tagColorMap: Record<string, string> = {
  '佛教造像': '#8B5CF6',
  '佛教艺术': '#7C3AED',
  '建筑': '#2563EB',
  '表演': '#DC2626',
  '亲子': '#F59E0B',
  '历史': '#B45309',
  '祈福': '#E11D48',
  '拍照': '#0EA5E9',
  '自然风光': '#16A34A',
  '藏传佛教': '#9333EA',
  '千年古刹': '#A16207',
  '禅意酒店': '#059669',
};

const AttractionList: React.FC = () => {
  const navigate = useNavigate();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setLoading(true);
    listSpots(activeCategory || undefined)
      .then((res) => {
        const data = (res as any).data ?? res;
        setSpots(Array.isArray(data) ? data : []);
      })
      .catch(() => setSpots([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const filtered = spots.filter(
    (s) =>
      !searchText ||
      s.name.includes(searchText) ||
      s.overview.includes(searchText) ||
      (s.tags ?? []).some((t) => t.includes(searchText)),
  );

  return (
    <div className="paper-texture" style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: 'var(--text-primary)',
            margin: 0, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <EnvironmentOutlined style={{ fontSize: 28, color: 'var(--color-primary)' }} />
            灵山胜境 · 景点导览
          </h1>
          <p style={{ color: 'var(--text-tertiary)', margin: '6px 0 0', fontSize: 15 }}>
            探索 {spots.length} 个景点，感受千年佛教文化与现代艺术的交融
          </p>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.7)', borderRadius: 12,
          padding: '10px 16px', marginBottom: 16,
          border: '1px solid var(--border-light)',
        }}>
          <SearchOutlined style={{ color: 'var(--text-tertiary)', fontSize: 16 }} />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索景点名称、标签..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                border: activeCategory === cat.key ? 'none' : '1px solid var(--border-light)',
                background: activeCategory === cat.key
                  ? 'linear-gradient(135deg, #1A5FB4, #3584E4)'
                  : 'rgba(255,255,255,0.6)',
                color: activeCategory === cat.key ? '#fff' : 'var(--text-secondary)',
                fontWeight: activeCategory === cat.key ? 600 : 400,
                fontSize: 14, cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Spot Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            未找到匹配的景点
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 18,
          }}>
            {filtered.map((spot) => (
              <div
                key={spot.id}
                onClick={() => navigate(`/attractions/${spot.id}`)}
                className="section-card"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                  overflow: 'hidden',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,22,20,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Category stripe */}
                <div style={{
                  height: 4,
                  background: spot.category === '核心景点'
                    ? 'linear-gradient(90deg, #C8882E, #E8A838)'
                    : spot.category === '特色景点'
                    ? 'linear-gradient(90deg, #2D8B57, #4ADE80)'
                    : 'linear-gradient(90deg, #1A5FB4, #3584E4)',
                }} />
                <div style={{ padding: '18px 22px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <h3 style={{
                      margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
                    }}>
                      {spot.name}
                    </h3>
                    <span style={{
                      fontSize: 12, padding: '2px 10px', borderRadius: 10,
                      background: spot.category === '核心景点'
                        ? 'rgba(200,136,46,0.12)' : 'rgba(45,139,87,0.12)',
                      color: spot.category === '核心景点' ? '#B45309' : '#166534',
                      fontWeight: 500,
                    }}>
                      {spot.category}
                    </span>
                  </div>
                  <p style={{
                    margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {spot.overview}
                  </p>
                  {spot.tags && spot.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <TagOutlined style={{ color: 'var(--text-tertiary)', fontSize: 13 }} />
                      {spot.tags.slice(0, 4).map((tag) => (
                        <span key={tag} style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 6,
                          background: `${tagColorMap[tag] ?? '#6B7280'}15`,
                          color: tagColorMap[tag] ?? '#6B7280',
                          fontWeight: 500,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttractionList;
