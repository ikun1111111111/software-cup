import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, TagOutlined } from '@ant-design/icons';
import { listSpots, type Spot } from '../../api/spots';
import { RevealOnScroll } from '../../components/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const CATEGORIES = [
  { key: '', label: '全部' },
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

const PAGE_SIZE = 9;

const AttractionList: React.FC = () => {
  const navigate = useNavigate();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchText]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px' }}>
        {/* Header — 书法体标题 + 朱红短线 */}
        <RevealOnScroll>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'var(--font-size-display)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            fontFamily: 'var(--font-calligraphy)',
            letterSpacing: '0.05em',
          }}>
            灵山胜境
          </h1>
          <div style={{
            width: 40,
            height: 3,
            background: 'var(--color-accent)',
            borderRadius: 2,
            margin: '12px auto',
          }} />
          <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 15 }}>
            探索景点，感受千年佛教文化与现代艺术的交融
          </p>
        </div>
        </RevealOnScroll>

        {/* Search — 水墨输入框 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface-card)', borderRadius: 'var(--radius-md)',
          padding: isMobile ? '12px 16px' : '10px 16px',
          marginBottom: 20,
          margin: isMobile ? '0 0 16px' : '0 0 20px',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <SearchOutlined style={{ color: 'var(--text-tertiary)', fontSize: 16 }} />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="寻一处胜地..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 16, color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Category Tabs — 印章式 */}
        <div style={{
          display: 'flex',
          gap: isMobile ? 8 : 10,
          marginBottom: isMobile ? 16 : 24,
          overflowX: isMobile ? 'auto' : 'visible',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-seal)',
                border: activeCategory === cat.key ? 'none' : '1px solid var(--gray-300)',
                background: activeCategory === cat.key
                  ? 'linear-gradient(135deg, #C84B31, #E85D3A)'
                  : 'var(--surface-card)',
                color: activeCategory === cat.key ? '#fff' : 'var(--gray-500)',
                fontWeight: activeCategory === cat.key ? 600 : 400,
                fontSize: 14, cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: activeCategory === cat.key ? '0 2px 8px rgba(200,75,49,0.25)' : 'none',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Spot Grid — 画卷卡片 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--color-primary)',
              animation: 'inkRipple 1.5s ease-in-out infinite',
              margin: '0 auto 16px',
            }} />
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            未找到匹配的景点
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: isMobile ? 16 : 24,
          }}>
            {paged.map((spot, i) => (
              <RevealOnScroll key={spot.id} delay={i * 80}>
              <div
                onClick={() => navigate(`/attractions/${spot.id}`)}
                className="scroll-card"
                style={{ cursor: 'pointer' }}
              >
                <div style={{ padding: '18px 22px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <h3 style={{
                      margin: 0, fontSize: 18, fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-serif)',
                    }}>
                      {spot.name}
                    </h3>
                    <span className="badge-seal">
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TagOutlined style={{ color: 'var(--text-tertiary)', fontSize: 13 }} />
                      {spot.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="btn-tag" style={{ cursor: 'default', pointerEvents: 'none' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </RevealOnScroll>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: isMobile ? 16 : 8, marginTop: isMobile ? 24 : 28,
          }}>
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="btn-outline"
              style={{ padding: '8px 20px', fontSize: 14 }}
            >
              上一页
            </button>
            {!isMobile && Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-seal)',
                  border: p === safePage ? 'none' : '1px solid var(--gray-200)',
                  background: p === safePage
                    ? 'linear-gradient(135deg, #6A9C89, #8CBFAD)'
                    : 'var(--surface-card)',
                  color: p === safePage ? '#fff' : 'var(--text-secondary)',
                  fontWeight: p === safePage ? 600 : 400,
                  cursor: 'pointer', fontSize: 14,
                  transition: 'all 200ms ease',
                }}
              >
                {p}
              </button>
            ))}
            {isMobile && (
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {safePage} / {totalPages}
              </span>
            )}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="btn-outline"
              style={{ padding: '8px 20px', fontSize: 14 }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttractionList;
