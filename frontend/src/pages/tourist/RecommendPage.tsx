import React, { useCallback, useEffect, useState } from 'react';
import { ClockCircleOutlined, EnvironmentOutlined, StarFilled, CompassOutlined, RightOutlined } from '@ant-design/icons';

export interface Route {
  id: string;
  name: string;
  description: string;
  duration: string;
  distance: string;
  rating: number;
  interests: string[];
  spots: string[];
}

const INTEREST_OPTIONS = [
  { label: '佛教文化', value: 'buddhism' },
  { label: '自然风光', value: 'nature' },
  { label: '历史古迹', value: 'history' },
  { label: '美食体验', value: 'food' },
  { label: '亲子活动', value: 'family' },
  { label: '摄影打卡', value: 'photography' },
];

const MOCK_ROUTES: Route[] = [
  {
    id: '1',
    name: '灵山大佛精华游',
    description: '参观灵山大佛、梵宫、五印坛城，感受佛教文化魅力',
    duration: '4小时',
    distance: '5公里',
    rating: 4.8,
    interests: ['buddhism', 'history'],
    spots: ['灵山大佛', '梵宫', '五印坛城'],
  },
  {
    id: '2',
    name: '灵山自然漫步',
    description: '漫步灵山风景区，欣赏太湖美景，享受自然风光',
    duration: '3小时',
    distance: '3公里',
    rating: 4.6,
    interests: ['nature', 'photography'],
    spots: ['太湖观景台', '灵山花园', '九龙灌浴'],
  },
  {
    id: '3',
    name: '灵山亲子一日游',
    description: '适合家庭出游，包含互动体验和儿童友好景点',
    duration: '5小时',
    distance: '4公里',
    rating: 4.7,
    interests: ['family', 'nature'],
    spots: ['灵山大佛', '九龙灌浴', '灵山素食'],
  },
];

const ROUTE_GRADIENTS = [
  'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
  'linear-gradient(135deg, #2D8B57 0%, #4CAF50 100%)',
  'linear-gradient(135deg, #C8882E 0%, #E8A838 100%)',
];

const RecommendPage: React.FC = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [routes, setRoutes] = useState<Route[]>(MOCK_ROUTES);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInterestChange = useCallback((interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }, []);

  const handleRouteSelect = useCallback((route: Route) => {
    console.log('Selected route:', route);
  }, []);

  useEffect(() => {
    if (selectedInterests.length === 0) {
      setRoutes(MOCK_ROUTES);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const filtered = MOCK_ROUTES.filter((route) =>
        route.interests.some((interest) => selectedInterests.includes(interest))
      );
      setRoutes(filtered);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedInterests]);

  const renderRouteCard = useCallback((route: Route, index: number) => (
    <div
      key={route.id}
      data-testid={`route-card-${route.id}`}
      onClick={() => handleRouteSelect(route)}
      className={`card-hover animate-fade-in-up stagger-${index + 1}`}
      style={{
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: '16px',
        cursor: 'pointer',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      {/* Gradient header */}
      <div style={{
        padding: isMobile ? '16px' : '20px',
        background: ROUTE_GRADIENTS[index % ROUTE_GRADIENTS.length],
        color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? '15px' : '16px', fontWeight: 600 }}>
            {route.name}
          </h3>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            <StarFilled style={{ fontSize: '13px' }} />
            {route.rating}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>
        <p style={{
          color: 'var(--text-secondary)',
          margin: '0 0 12px 0',
          fontSize: '14px',
          lineHeight: 1.6,
        }}>
          {route.description}
        </p>
        <div style={{
          display: 'flex',
          gap: '20px',
          color: 'var(--text-tertiary)',
          fontSize: '13px',
          marginBottom: '12px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ClockCircleOutlined />
            {route.duration}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <EnvironmentOutlined />
            {route.distance}
          </span>
        </div>
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '12px',
        }}>
          {route.spots.map((spot) => (
            <span
              key={spot}
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                backgroundColor: 'var(--color-primary-bg)',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                color: 'var(--color-primary)',
                fontWeight: 500,
              }}
            >
              {spot}
            </span>
          ))}
        </div>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #1A5FB4 0%, #3584E4 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 200ms',
          width: isMobile ? '100%' : 'auto',
          justifyContent: 'center',
        }}>
          开始导航 <RightOutlined style={{ fontSize: '11px' }} />
        </button>
      </div>
    </div>
  ), [handleRouteSelect, isMobile]);

  return (
    <div data-testid="recommend-page" style={{
      padding: isMobile ? '16px' : '24px',
      maxWidth: '800px',
      margin: '0 auto',
      paddingBottom: isMobile ? '80px' : '24px',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          margin: '0 0 4px 0',
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CompassOutlined style={{ color: 'var(--color-primary)' }} />
          个性化路线推荐
        </h2>
        <p style={{
          margin: 0,
          color: 'var(--text-tertiary)',
          fontSize: '14px',
        }}>
          选择你的兴趣，为你定制专属游览路线
        </p>
      </div>

      {/* Interest tags — horizontal scroll on mobile */}
      <div className="scroll-tags" data-testid="interest-tags" style={{
        marginBottom: '20px',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
      }}>
        {INTEREST_OPTIONS.map((option) => {
          const selected = selectedInterests.includes(option.value);
          return (
            <button
              key={option.value}
              data-testid={`tag-${option.value}`}
              onClick={() => handleInterestChange(option.value)}
              className={selected ? 'btn-pill active' : 'btn-pill'}
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderColor: selected ? 'var(--color-primary)' : undefined,
                backgroundColor: selected ? 'var(--color-primary-bg)' : undefined,
                color: selected ? 'var(--color-primary)' : undefined,
                fontWeight: selected ? 600 : undefined,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div data-testid="route-list" style={{
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 200ms',
      }}>
        {routes.length > 0 ? (
          routes.map((route, index) => renderRouteCard(route, index))
        ) : (
          <div data-testid="empty-state" className="animate-fade-in" style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-default)',
          }}>
            <CompassOutlined style={{
              fontSize: '40px',
              marginBottom: '12px',
              color: 'var(--gray-300)',
            }} />
            <div style={{ fontSize: '15px', fontWeight: 500 }}>暂无匹配的推荐路线</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>试试选择其他兴趣标签</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendPage;
