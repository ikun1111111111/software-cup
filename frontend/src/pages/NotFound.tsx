import React from 'react';
import { Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

/**
 * 404 页面 — 水墨风格
 * 规范文档 Phase 4：错误页面（404水墨画）
 */

const NotFound: React.FC = () => {
  return (
    <div
      className="paper-texture"
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      {/* 水墨风装饰圆 */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '2px solid var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          position: 'relative',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-calligraphy)',
            fontSize: 48,
            color: 'var(--gray-300)',
          }}
        >
          迷
        </span>
        {/* 印章装饰 */}
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            right: -8,
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #C84B31 0%, #E85D3A 100%)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-calligraphy)',
            fontSize: 18,
            transform: 'rotate(-5deg)',
            boxShadow: '0 2px 8px rgba(200, 75, 49, 0.25)',
          }}
        >
          404
        </div>
      </div>

      <h1
        style={{
          fontSize: 'var(--font-size-display)',
          fontWeight: 700,
          fontFamily: 'var(--font-calligraphy)',
          color: 'var(--text-primary)',
          marginBottom: 12,
          letterSpacing: 4,
        }}
      >
        此路不通
      </h1>

      <p
        style={{
          fontSize: 'var(--font-size-body)',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-serif)',
          marginBottom: 8,
          letterSpacing: 1,
        }}
      >
        您所寻觅的风景，或许在另一条小径
      </p>

      <p
        style={{
          fontSize: 'var(--font-size-body-sm)',
          color: 'var(--text-tertiary)',
          marginBottom: 40,
          opacity: 0.7,
        }}
      >
        页面不存在或已被移除
      </p>

      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 32px',
          background: 'linear-gradient(135deg, #6A9C89 0%, #8CBFAD 100%)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 10,
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(106, 156, 137, 0.25)',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(106, 156, 137, 0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(106, 156, 137, 0.25)';
        }}
      >
        <HomeOutlined /> 回到首页
      </Link>
    </div>
  );
};

export default NotFound;
