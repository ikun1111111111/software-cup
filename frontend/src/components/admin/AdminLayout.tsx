import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChartOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  RobotOutlined,
} from '@ant-design/icons';

const titleMap: Record<string, { title: string; subtitle: string }> = {
  '/admin/dashboard': { title: '数据大屏', subtitle: '观测游客问答、服务状态与实时热度' },
  '/admin/knowledge': { title: '知识库', subtitle: '维护景点、路线、FAQ 与讲解内容' },
  '/admin/behavior': { title: '数据洞察', subtitle: '分析消费结构、路线偏好、满意度与营销机会' },
  '/admin/avatar': { title: '数字人', subtitle: '调整数字人形象、音色与欢迎语' },
  '/admin/report': { title: '分析报告', subtitle: '沉淀游客感受度与运营决策建议' },
};

const navItems = [
  { to: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据大屏', code: 'OVERVIEW' },
  { to: '/admin/knowledge', icon: <DatabaseOutlined />, label: '知识库', code: 'KNOWLEDGE' },
  { to: '/admin/behavior', icon: <BarChartOutlined />, label: '数据洞察', code: 'INSIGHT' },
  { to: '/admin/avatar', icon: <RobotOutlined />, label: '数字人', code: 'AVATAR' },
  { to: '/admin/report', icon: <FileTextOutlined />, label: '报告', code: 'REPORT' },
];

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const meta = titleMap[location.pathname] ?? titleMap['/admin/dashboard'];

  return (
    <div className="admin-command-shell">
      <header className="admin-command-topbar">
        <div className="admin-command-brand">
          <span className="admin-command-brand__seal">灵</span>
          <div>
            <strong>灵山胜境 · 管理后台</strong>
            <small>{meta.subtitle}</small>
          </div>
        </div>

        <nav className="admin-command-nav" aria-label="管理后台功能导航">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (
                isActive ? 'admin-command-nav__item admin-command-nav__item--active' : 'admin-command-nav__item'
              )}
            >
              <span className="admin-command-nav__icon">{item.icon}</span>
              <span className="admin-command-nav__text">{item.label}</span>
              <i>{item.code}</i>
            </NavLink>
          ))}
        </nav>

        <div className="admin-command-context">
          <span>{meta.title}</span>
        </div>
      </header>

      <main className="admin-command-main">
        <Outlet />
      </main>

      <style>
        {`
          .admin-command-shell {
            position: fixed;
            inset: 0;
            z-index: 300;
            color: var(--text-primary);
            overflow: hidden;
            background:
              radial-gradient(circle at 18% 8%, rgba(106, 156, 137, 0.13), transparent 28%),
              radial-gradient(circle at 86% 12%, rgba(200, 75, 49, 0.08), transparent 24%),
              var(--texture-paper),
              var(--color-paper);
          }

          .admin-command-topbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 997;
            height: 64px;
            display: grid;
            grid-template-columns: minmax(260px, 0.9fr) auto minmax(180px, 0.9fr);
            align-items: center;
            gap: 18px;
            padding: 0 30px;
            border-bottom: 1px solid rgba(201, 169, 110, 0.18);
            background:
              linear-gradient(90deg, rgba(247, 245, 240, 0.94), rgba(255, 248, 229, 0.78), rgba(247, 245, 240, 0.94));
            box-shadow: 0 12px 34px rgba(42, 37, 32, 0.05);
            backdrop-filter: blur(14px) saturate(118%);
            -webkit-backdrop-filter: blur(14px) saturate(118%);
          }

          .admin-command-topbar::before,
          .admin-command-topbar::after {
            content: '';
            position: absolute;
            bottom: 0;
            width: 34%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(240, 90, 40, 0.74), transparent);
            pointer-events: none;
          }

          .admin-command-topbar::before {
            left: 0;
          }

          .admin-command-topbar::after {
            right: 0;
          }

          .admin-command-brand {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .admin-command-brand__seal {
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            flex: 0 0 auto;
            border: 1px solid rgba(184, 115, 51, 0.44);
            color: #B87333;
            background: rgba(255, 248, 229, 0.66);
            font-family: var(--font-serif);
            font-size: 19px;
            font-weight: 900;
            box-shadow: inset 0 0 0 3px rgba(184, 115, 51, 0.08);
          }

          .admin-command-brand strong,
          .admin-command-brand small {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .admin-command-brand strong {
            color: #2A2520;
            font-family: var(--font-serif);
            font-size: 17px;
            letter-spacing: 0.14em;
          }

          .admin-command-brand small {
            margin-top: 3px;
            color: rgba(42, 37, 32, 0.46);
            font-size: 12px;
            letter-spacing: 0.06em;
          }

          .admin-command-nav {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-self: center;
            gap: 7px;
            max-width: 100%;
            padding: 6px;
            overflow-x: auto;
            scrollbar-width: none;
            border: 1px solid rgba(201, 169, 110, 0.24);
            border-radius: 999px;
            background:
              linear-gradient(180deg, rgba(255, 253, 247, 0.84), rgba(255, 248, 229, 0.68));
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 12px 30px rgba(42, 37, 32, 0.07);
          }

          .admin-command-nav::-webkit-scrollbar {
            display: none;
          }

          .admin-command-nav__item {
            position: relative;
            min-width: 86px;
            height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            padding: 0 12px;
            border-radius: 999px;
            color: rgba(42, 37, 32, 0.56);
            text-decoration: none;
            transition: color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
          }

          .admin-command-nav__item:hover {
            color: #C84B31;
            background: rgba(240, 90, 40, 0.08);
            transform: translateY(-1px);
          }

          .admin-command-nav__item--active {
            color: #fff;
            background: linear-gradient(180deg, #F05A28, #D86A22);
            box-shadow: 0 10px 22px rgba(240, 90, 40, 0.26);
          }

          .admin-command-nav__item--active::after {
            content: '';
            position: absolute;
            left: 50%;
            bottom: -8px;
            width: 24px;
            height: 2px;
            border-radius: 999px;
            background: #F05A28;
            box-shadow: 0 0 12px rgba(240, 90, 40, 0.8);
            transform: translateX(-50%);
          }

          .admin-command-nav__icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
          }

          .admin-command-nav__text {
            font-size: 13px;
            font-weight: 800;
            white-space: nowrap;
          }

          .admin-command-nav__item i {
            position: absolute;
            top: -13px;
            left: 50%;
            color: rgba(200, 75, 49, 0.44);
            font-family: var(--font-mono);
            font-size: 8px;
            font-style: normal;
            font-weight: 800;
            letter-spacing: 0.18em;
            opacity: 0;
            transform: translateX(-50%) translateY(3px);
            transition: opacity 160ms ease, transform 160ms ease;
            pointer-events: none;
          }

          .admin-command-nav__item:hover i,
          .admin-command-nav__item--active i {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          .admin-command-nav__item--active i {
            color: rgba(200, 75, 49, 0.66);
          }

          .admin-command-context {
            justify-self: end;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            color: #6A9C89;
            background: rgba(106, 156, 137, 0.10);
            border: 1px solid rgba(106, 156, 137, 0.14);
            font-family: var(--font-serif);
            font-size: 13px;
            font-weight: 800;
            white-space: nowrap;
          }

          .admin-command-context::before {
            content: '';
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #6A9C89;
            box-shadow: 0 0 0 5px rgba(106, 156, 137, 0.12);
          }

          .admin-command-main {
            position: fixed;
            top: 64px;
            right: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            height: auto;
            min-height: 0;
            padding-top: 0;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
            scrollbar-gutter: stable;
          }

          .admin-command-nav__icon :where(svg) {
            width: 1em;
            height: 1em;
            display: block;
          }

          @media (max-width: 1280px) {
            .admin-command-topbar {
              grid-template-columns: minmax(210px, 0.75fr) minmax(0, auto) auto;
              gap: 10px;
              padding: 0 18px;
            }

            .admin-command-nav__item {
              min-width: 72px;
              padding: 0 10px;
            }

            .admin-command-brand small {
              display: none;
            }
          }

          @media (max-width: 960px) {
            .admin-command-topbar {
              grid-template-columns: 1fr;
              height: 116px;
              align-content: center;
              justify-items: center;
              padding: 10px 14px;
            }

            .admin-command-brand,
            .admin-command-context {
              display: none;
            }

            .admin-command-main {
              top: 116px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default AdminLayout;
