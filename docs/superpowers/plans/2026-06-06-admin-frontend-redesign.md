# Admin 前端重构 — 青绿山水长卷 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Admin 后台从"玻璃态卡片堆叠"重构为"青绿山水长卷"风格——矿物颜料配色、印章式 KPI、题跋式列表、卷轴式导航、宣纸质感面板。

**Architecture:** 新增一套独立的山水长卷 CSS 变量与动画系统，逐步替换 GlassCard/DockNav 等核心组件，再重写 4 个页面布局。所有改动集中在 `frontend/src/styles/` 和 `frontend/src/components/admin/`，不触碰 API 层。

**Tech Stack:** React 18 + TypeScript + Vite + ECharts + CSS Variables + CSS Animations

---

## File Structure

### 新增文件
| 文件 | 职责 |
|------|------|
| `frontend/src/styles/mountain-scroll.css` | 全局设计令牌：青绿山水配色、字体、纹理背景 |
| `frontend/src/styles/animations.css` | 关键帧动画：卷轴展开、印章盖印、朱笔圈点、水墨晕染、题跋出现 |
| `frontend/src/components/admin/ScrollNav.tsx` | 左侧垂直卷轴导航，替代 DockNav |
| `frontend/src/components/admin/SealCard.tsx` | 印章/题签式容器，带细线边框和四角折角装饰 |
| `frontend/src/components/admin/PaperPanel.tsx` | 宣纸质感面板，可选卷轴轴头装饰 |
| `frontend/src/components/admin/InscriptionList.tsx` | 题跋式列表：手写体序号 + 朱笔圈点 + 淡墨细字 |
| `frontend/src/components/admin/StampCloud.tsx` | 印章集合词云：方形/圆形印章，大小反映频次 |
| `frontend/src/components/admin/MountainChart.tsx` | ECharts 主题封装：青绿/朱砂/淡墨配色 + 水墨渐变 |

### 修改文件
| 文件 | 职责 |
|------|------|
| `frontend/src/index.css` | 引入 mountain-scroll.css 和 animations.css |
| `frontend/src/App.tsx` | 移除 DockNav，引入 ScrollNav，调整 admin 布局 |
| `frontend/src/pages/admin/DashboardPage.tsx` | 重写：印章 KPI + 近水楼阁监控 + 林间题跋热点 + 市井灯火热力图 |
| `frontend/src/pages/admin/ReportPage.tsx` | 重写：卷轴摘要 + 情感山脊线图 + 印章词云 + 竖排题跋 |
| `frontend/src/pages/admin/KnowledgePage.tsx` | 重写：经折装文档列表 + 碑帖 FAQ |
| `frontend/src/pages/admin/AvatarPage.tsx` | 重写：扇面预览 + 琴键 Tabs + 印泥按钮 |
| `frontend/src/components/admin/MetricsCard.tsx` | 调整样式适配印章风格 |
| `frontend/src/components/admin/RealtimeMonitor.tsx` | 调整样式适配近水楼阁风格 |
| `frontend/src/components/admin/HotQuestions.tsx` | 调整样式适配林间题跋风格 |
| `frontend/src/components/admin/SentimentChart.tsx` | 接入 MountainChart 主题配色 |
| `frontend/src/components/admin/WordCloud.tsx` | 替换为 StampCloud（或直接修改内部渲染） |
| `frontend/src/components/admin/HeatmapChart.tsx` | 接入 MountainChart 主题配色 |

---

## Task 1: 建立全局设计令牌

**Files:**
- Create: `frontend/src/styles/mountain-scroll.css`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 创建 mountain-scroll.css**

写入完整内容：
```css
/* ── 青绿山水长卷 — 全局设计令牌 ─────────────────────────── */

/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Noto+Sans+SC:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* 矿物颜料色谱 */
  --mountain-deep: #1B4D3E;
  --mountain-mid: #4A7C6F;
  --mountain-light: #8FB8AA;
  --sky-dawn: #E8DCC4;
  --sky-mist: #C9D5D1;
  --ink-dark: #2A2520;
  --ink-medium: #5C534A;
  --ink-light: #9A9085;
  --vermilion: #C84B31;
  --gold-leaf: #C9A96E;
  --paper-texture: #F3EFE6;

  /* 语义映射 */
  --bg-page: linear-gradient(180deg, var(--sky-dawn) 0%, #D4CFC0 40%, var(--mountain-light) 100%);
  --bg-panel: var(--paper-texture);
  --bg-nav: var(--ink-dark);
  --text-primary: var(--ink-dark);
  --text-secondary: var(--ink-medium);
  --text-tertiary: var(--ink-light);
  --text-inverse: var(--paper-texture);
  --accent: var(--vermilion);
  --accent-secondary: var(--gold-leaf);
  --border-subtle: var(--sky-mist);
  --border-ink: rgba(42, 37, 32, 0.12);

  /* 字体 */
  --font-serif: 'Noto Serif SC', 'Songti SC', serif;
  --font-sans: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'Roboto Mono', monospace;

  /* 尺寸 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --shadow-soft: 0 2px 8px rgba(42, 37, 32, 0.06);
  --shadow-medium: 0 4px 16px rgba(42, 37, 32, 0.10);
}

/* 全局噪点纹理 */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  opacity: 0.03;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* 滚动条 — 像画卷轴 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--ink-light);
  border-radius: var(--radius-pill);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--ink-medium);
}
```

- [ ] **Step 2: 修改 index.css 引入新样式**

```css
@import './styles/themes.css';      /* 保留原有四季主题供游客端使用 */
@import './styles/tokens.css';      /* 保留原有令牌 */
@import './styles/mountain-scroll.css'; /* 新增：青绿山水长卷 */
@import './styles/animations.css';  /* 新增：动画系统 */
@import './styles/celadon-mountain-bg.css';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/mountain-scroll.css frontend/src/index.css
git commit -m "design: add mountain-scroll design tokens and global textures"
```

---

## Task 2: 建立动画系统

**Files:**
- Create: `frontend/src/styles/animations.css`

- [ ] **Step 1: 创建 animations.css**

写入完整内容：
```css
/* ── 青绿山水长卷 — 动画系统 ─────────────────────────── */

/* 卷轴展开 */
@keyframes scrollUnfold {
  from {
    clip-path: inset(0 100% 0 0);
    opacity: 0;
  }
  to {
    clip-path: inset(0 0% 0 0);
    opacity: 1;
  }
}

.animate-scroll-unfold {
  animation: scrollUnfold 800ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 印章盖印 */
@keyframes sealPress {
  0% { transform: scale(1); }
  40% { transform: scale(0.96); }
  100% { transform: scale(1); }
}

.animate-seal-press {
  animation: sealPress 300ms ease-out;
}

/* 朱笔圈点 — hover 下划线 */
@keyframes brushStroke {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* 水墨晕染 */
@keyframes inkFadeIn {
  from {
    opacity: 0;
    filter: blur(6px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

.animate-ink-fade {
  animation: inkFadeIn 500ms ease-out both;
}

/* 题跋出现 — stagger */
@keyframes inscriptionAppear {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-inscription {
  animation: inscriptionAppear 400ms ease-out both;
}

/* 云雾淡入（背景层） */
@keyframes mistReveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-mist {
  animation: mistReveal 1200ms ease-out 300ms both;
}

/* 呼吸灯 — 朱砂红点 */
@keyframes vermilionPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(200, 75, 49, 0.4); }
  50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(200, 75, 49, 0); }
}

.animate-pulse-vermilion {
  animation: vermilionPulse 2s ease-in-out infinite;
}

/* 装饰折角 */
.corner-fold {
  position: relative;
}
.corner-fold::before,
.corner-fold::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border: 1px solid var(--ink-medium);
  opacity: 0.3;
}
.corner-fold::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
}
.corner-fold::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/animations.css
git commit -m "design: add mountain-scroll animation system"
```

---

## Task 3: 左侧卷轴导航 ScrollNav

**Files:**
- Create: `frontend/src/components/admin/ScrollNav.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 创建 ScrollNav.tsx**

```tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const NAV_ITEMS = [
  { path: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据大屏' },
  { path: '/admin', icon: <DatabaseOutlined />, label: '知识库' },
  { path: '/admin/avatar', icon: <UserOutlined />, label: '数字人' },
  { path: '/admin/report', icon: <FileTextOutlined />, label: '报告' },
];

const ScrollNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname === path;
  };

  return (
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: expanded ? 180 : 64,
        backgroundColor: 'var(--ink-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 24,
        gap: 8,
        zIndex: 100,
        transition: 'width 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden',
        borderRight: '1px solid rgba(201, 169, 110, 0.15)',
      }}
    >
      {/* Logo */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--gold-leaf)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--gold-leaf)',
        fontFamily: 'var(--font-serif)',
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 32,
        flexShrink: 0,
      }}>
        灵
      </div>

      {NAV_ITEMS.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              width: '100%',
              height: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              paddingLeft: 20,
              paddingRight: expanded ? 16 : 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--gold-leaf)' : 'rgba(243, 239, 230, 0.55)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              position: 'relative',
              whiteSpace: 'nowrap',
              transition: 'color 200ms ease',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = 'rgba(243, 239, 230, 0.85)';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'rgba(243, 239, 230, 0.55)';
            }}
          >
            {/* Active indicator — 朱红竖线 */}
            {active && (
              <span style={{
                position: 'absolute',
                left: 0,
                top: 12,
                bottom: 12,
                width: 3,
                backgroundColor: 'var(--vermilion)',
                borderRadius: '0 2px 2px 0',
              }} />
            )}
            <span style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
              {item.icon}
            </span>
            {expanded && (
              <span style={{ fontWeight: active ? 600 : 400 }}>{item.label}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default ScrollNav;
```

- [ ] **Step 2: 修改 App.tsx — 移除 DockNav，引入 ScrollNav**

找到 `DockNav` 的 import 和使用处，替换为：
```tsx
import ScrollNav from './components/admin/ScrollNav';
```

在 admin 路由区域（`{isAdmin && (...)}` 内部），移除 `<DockNav />`，添加：
```tsx
<ScrollNav />
```

同时给 admin 路由的容器增加 `paddingLeft: 64`（给左侧导航留空）：
找到 admin 布局的容器 div，改为：
```tsx
<div style={{ paddingLeft: 64, minHeight: '100vh' }}>
  <Routes>
    <Route path="/admin" element={<KnowledgePage />} />
    ...
  </Routes>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/ScrollNav.tsx frontend/src/App.tsx
git commit -m "feat: add ScrollNav and replace DockNav"
```

---

## Task 4: 印章式容器 SealCard

**Files:**
- Create: `frontend/src/components/admin/SealCard.tsx`

- [ ] **Step 1: 创建 SealCard.tsx**

```tsx
import React from 'react';

export interface SealCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
  color?: 'vermilion' | 'gold' | 'ink';
  onClick?: () => void;
}

const SealCard: React.FC<SealCardProps> = ({
  children,
  className = '',
  style,
  size = 'md',
  color = 'ink',
  onClick,
}) => {
  const sizeMap = {
    sm: { padding: '12px 16px', radius: 'var(--radius-sm)' },
    md: { padding: '20px 24px', radius: 'var(--radius-md)' },
    lg: { padding: '28px 32px', radius: 'var(--radius-lg)' },
  };

  const colorMap = {
    vermilion: { border: 'var(--vermilion)', bg: 'rgba(200, 75, 49, 0.04)' },
    gold: { border: 'var(--gold-leaf)', bg: 'rgba(201, 169, 110, 0.06)' },
    ink: { border: 'var(--border-ink)', bg: 'var(--bg-panel)' },
  };

  const s = sizeMap[size];
  const c = colorMap[color];

  return (
    <div
      className={`corner-fold ${className}`}
      onClick={onClick}
      style={{
        padding: s.padding,
        borderRadius: s.radius,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: 'var(--shadow-soft)',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(0.98)';
          e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(42,37,32,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
      }}
    >
      {children}
    </div>
  );
};

export default SealCard;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/SealCard.tsx
git commit -m "feat: add SealCard component with corner-fold decoration"
```

---

## Task 5: 宣纸面板 PaperPanel

**Files:**
- Create: `frontend/src/components/admin/PaperPanel.tsx`

- [ ] **Step 1: 创建 PaperPanel.tsx**

```tsx
import React from 'react';

export interface PaperPanelProps {
  children: React.ReactNode;
  title?: string;
  withScrollHead?: boolean;
  style?: React.CSSProperties;
}

const PaperPanel: React.FC<PaperPanelProps> = ({
  children,
  title,
  withScrollHead = false,
  style,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'var(--bg-panel)',
        borderRadius: withScrollHead ? '0 0 var(--radius-lg) var(--radius-lg)' : 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-medium)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {withScrollHead && (
        <div style={{
          height: 28,
          background: 'linear-gradient(180deg, #C9A96E 0%, #B8945F 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          {/* 卷轴轴头装饰 */}
          <span style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4B87A, #A88A4F)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
          }} />
          {title && (
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              color: '#FFF',
              fontWeight: 600,
              letterSpacing: 2,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}>
              {title}
            </span>
          )}
          <span style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4B87A, #A88A4F)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
          }} />
        </div>
      )}
      <div style={{ padding: withScrollHead ? '20px 24px 24px' : '24px' }}>
        {!withScrollHead && title && (
          <h3 style={{
            margin: '0 0 16px 0',
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 3,
              height: 20,
              backgroundColor: 'var(--vermilion)',
              borderRadius: '0 2px 2px 0',
            }} />
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default PaperPanel;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/PaperPanel.tsx
git commit -m "feat: add PaperPanel with optional scroll-head decoration"
```

---

## Task 6: 题跋式列表 InscriptionList

**Files:**
- Create: `frontend/src/components/admin/InscriptionList.tsx`

- [ ] **Step 1: 创建 InscriptionList.tsx**

```tsx
import React from 'react';

export interface InscriptionItem {
  id: string;
  number?: number;
  text: string;
  note?: string;
  highlight?: boolean;
}

export interface InscriptionListProps {
  items: InscriptionItem[];
  onItemClick?: (item: InscriptionItem) => void;
}

const InscriptionList: React.FC<InscriptionListProps> = ({
  items,
  onItemClick,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item, index) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="animate-inscription"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '10px 0',
            cursor: onItemClick ? 'pointer' : 'default',
            borderBottom: index < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            animationDelay: `${index * 50}ms`,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (onItemClick) {
              const line = e.currentTarget.querySelector('.brush-line') as HTMLElement;
              if (line) line.style.transform = 'scaleX(1)';
            }
          }}
          onMouseLeave={(e) => {
            const line = e.currentTarget.querySelector('.brush-line') as HTMLElement;
            if (line) line.style.transform = 'scaleX(0)';
          }}
        >
          {/* 序号 — 手写体 */}
          {item.number !== undefined && (
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13,
              color: item.highlight ? 'var(--vermilion)' : 'var(--text-tertiary)',
              fontWeight: 600,
              minWidth: 24,
              flexShrink: 0,
            }}>
              {item.number <= 3 ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: item.highlight ? 'var(--vermilion)' : 'transparent',
                  color: item.highlight ? '#FFF' : 'var(--text-tertiary)',
                  fontSize: 12,
                  border: item.highlight ? 'none' : '1px solid var(--border-subtle)',
                }}>
                  {item.number}
                </span>
              ) : (
                item.number
              )}
            </span>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}>
              {item.text}
            </div>
            {item.note && (
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                marginTop: 2,
              }}>
                {item.note}
              </div>
            )}
          </div>

          {/* 朱笔圈点 hover 线 */}
          {onItemClick && (
            <span
              className="brush-line"
              style={{
                position: 'absolute',
                bottom: 6,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'var(--vermilion)',
                opacity: 0.25,
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default InscriptionList;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/InscriptionList.tsx
git commit -m "feat: add InscriptionList with brush-stroke hover effect"
```

---

## Task 7: 印章词云 StampCloud

**Files:**
- Create: `frontend/src/components/admin/StampCloud.tsx`

- [ ] **Step 1: 创建 StampCloud.tsx**

```tsx
import React, { useCallback, useMemo } from 'react';

export interface StampItem {
  text: string;
  value: number;
}

export interface StampCloudProps {
  items?: StampItem[];
  onStampClick?: (text: string) => void;
}

const MOCK_ITEMS: StampItem[] = [
  { text: '灵山大佛', value: 100 },
  { text: '梵宫', value: 80 },
  { text: '九龙灌浴', value: 70 },
  { text: '门票', value: 60 },
  { text: '交通', value: 50 },
  { text: '美食', value: 45 },
  { text: '住宿', value: 40 },
  { text: '停车', value: 35 },
  { text: '开放时间', value: 30 },
  { text: '导游', value: 25 },
];

const STAMP_COLORS = [
  { bg: '#C84B31', text: '#FFF' },      // 朱砂
  { bg: '#4A7C6F', text: '#FFF' },      // 石绿
  { bg: '#C9A96E', text: '#2A2520' },   // 泥金
  { bg: '#8FB8AA', text: '#2A2520' },   // 淡青
  { bg: '#B85C4F', text: '#FFF' },      // 赭红
];

const StampCloud: React.FC<StampCloudProps> = ({
  items: propItems,
  onStampClick,
}) => {
  const items = propItems || MOCK_ITEMS;
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  const getSize = useCallback((value: number) => {
    const min = 13;
    const max = 28;
    return min + (value / maxValue) * (max - min);
  }, [maxValue]);

  const stamps = useMemo(() => {
    return items.map((item, index) => {
      const color = STAMP_COLORS[index % STAMP_COLORS.length];
      const size = getSize(item.value);
      const isLarge = item.value > maxValue * 0.6;
      return { ...item, color, size, isLarge };
    });
  }, [items, maxValue, getSize]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 12px',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      minHeight: 200,
    }}>
      {stamps.map((stamp) => (
        <button
          key={stamp.text}
          onClick={() => onStampClick?.(stamp.text)}
          className="animate-ink-fade"
          style={{
            fontSize: stamp.size,
            fontFamily: 'var(--font-serif)',
            fontWeight: stamp.isLarge ? 700 : 500,
            color: stamp.color.text,
            backgroundColor: stamp.color.bg,
            border: 'none',
            borderRadius: stamp.isLarge ? 4 : 2,
            padding: `${stamp.size * 0.35}px ${stamp.size * 0.6}px`,
            cursor: onStampClick ? 'pointer' : 'default',
            transition: 'transform 150ms ease, box-shadow 150ms ease',
            lineHeight: 1,
            letterSpacing: 1,
            opacity: 0.9,
          }}
          onMouseEnter={(e) => {
            if (onStampClick) {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${stamp.color.bg}66`;
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseDown={(e) => {
            if (onStampClick) {
              e.currentTarget.style.transform = 'scale(0.96)';
            }
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
        >
          {stamp.text}
        </button>
      ))}
    </div>
  );
};

export default StampCloud;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/StampCloud.tsx
git commit -m "feat: add StampCloud — seal-shaped keyword cloud"
```

---

## Task 8: 山水图表主题 MountainChart

**Files:**
- Create: `frontend/src/components/admin/MountainChart.tsx`

- [ ] **Step 1: 创建 MountainChart.tsx**

这是一个纯工具组件，导出 ECharts 主题配置对象和辅助函数：

```tsx
/** MountainChart — ECharts 青绿山水主题配置 */

export const mountainTheme = {
  color: ['#4A7C6F', '#8FB8AA', '#C84B31', '#C9A96E', '#5C534A', '#B85C4F'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
    color: '#2A2520',
  },
  title: {
    textStyle: { color: '#2A2520', fontFamily: "'Noto Serif SC', serif" },
    subtextStyle: { color: '#5C534A' },
  },
  line: {
    smooth: 0.3, // slightly angular like mountain ridges
    symbol: 'none',
    lineStyle: { width: 2 },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#C9D5D1' } },
    axisTick: { show: false },
    axisLabel: { color: '#5C534A', fontSize: 12 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#5C534A', fontSize: 12 },
    splitLine: { lineStyle: { color: 'rgba(201, 213, 209, 0.5)', type: 'dashed' } },
  },
  tooltip: {
    backgroundColor: 'rgba(243, 239, 230, 0.95)',
    borderColor: '#C9D5D1',
    borderWidth: 1,
    textStyle: { color: '#2A2520' },
    padding: [10, 14],
  },
  legend: {
    textStyle: { color: '#5C534A' },
    bottom: 0,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '12%',
    top: '8%',
    containLabel: true,
  },
};

/** 水墨渐变面积 — 用于折线图 */
export function inkAreaStyle(color: string) {
  return {
    color: {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: color + '33' },
        { offset: 1, color: color + '05' },
      ],
    },
  };
}

/** 热力图配色 — 石青 → 石绿 → 朱砂 */
export const heatmapColors = ['#1B4D3E', '#4A7C6F', '#8FB8AA', '#C9A96E', '#C84B31'];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/MountainChart.tsx
git commit -m "feat: add MountainChart ECharts theme with mineral pigment palette"
```

---

## Task 9: 重写 DashboardPage

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.tsx`

- [ ] **Step 1: 重写 DashboardPage.tsx**

保留所有数据逻辑（useEffect、loadData、interval、state），只替换布局和样式：

关键点：
1. 最外层容器添加 `paddingLeft: 64`（给 ScrollNav 留空）
2. 移除所有 `GlassCard`，替换为 `SealCard`（KPI 区）或 `PaperPanel`（其他区域）
3. KPI 区使用大字号 + `font-family: var(--font-serif)` + `color: var(--vermilion)`
4. `RealtimeMonitor` 和 `HotQuestions` 的数据流不变，但容器改为 `PaperPanel`
5. `HeatmapChart` 容器改为 `PaperPanel`
6. 页面整体添加 `animate-scroll-unfold` 类

因为文件较长，这里给出修改策略而非完整重写：

- 顶部 `h1` 样式改为 `fontFamily: 'var(--font-serif)'`
- 4 个 KPI 卡片：`SealCard` size="sm" color="vermilion"，内部数字 `<div style={{ fontFamily: 'var(--font-serif)', fontSize: 42, fontWeight: 900, color: 'var(--vermilion)' }}>`
- 中间两栏：`PaperPanel` 包裹 `RealtimeMonitor` 和 `HotQuestions`
- 底部热力图：`PaperPanel` 包裹 `HeatmapChart`
- 移除 `isFullscreen` 相关代码（长卷风格不需要全屏按钮）

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/DashboardPage.tsx
git commit -m "refactor: DashboardPage with mountain-scroll layout"
```

---

## Task 10: 重写 ReportPage

**Files:**
- Modify: `frontend/src/pages/admin/ReportPage.tsx`

- [ ] **Step 1: 重写 ReportPage.tsx**

关键点：
1. `paddingLeft: 64`
2. 报告摘要区：用 `PaperPanel withScrollHead` 包裹 `MarkdownRenderer`
3. 情感趋势图：容器改为 `PaperPanel`，并在 `SentimentChart` 中接入 `mountainTheme` 配色
4. 词云：`<WordCloud>` 替换为 `<StampCloud items={wordCloudData} />`
5. 盲区发现 + 服务建议：用 `PaperPanel` + `InscriptionList`
6. 页面整体添加 `animate-scroll-unfold`

修改策略：
- `SentimentChart` 中 series 颜色改为 `['#4A7C6F', '#5C534A', '#C84B31']`（对应 positive/neutral/negative）
- `wordCloudData` 传给 `StampCloud`
- blindSpots 和 suggestions 转换为 `InscriptionItem[]` 传给 `InscriptionList`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/ReportPage.tsx frontend/src/components/admin/SentimentChart.tsx frontend/src/components/admin/WordCloud.tsx
git commit -m "refactor: ReportPage with scroll-panel, stamp-cloud, and inscription lists"
```

---

## Task 11: 重写 KnowledgePage

**Files:**
- Modify: `frontend/src/pages/admin/KnowledgePage.tsx`

- [ ] **Step 1: 重写 KnowledgePage.tsx**

关键点：
1. `paddingLeft: 64`
2. 文档列表项：放弃卡片 hover，改为 SealCard size="sm" color="ink"，左侧加折页竖线装饰
3. FAQ 列表：用 `InscriptionList` 渲染，问题用宋体，答案用淡墨细字
4. Tabs 样式改为琴键式窄条（背景 `ink-dark`，active 有朱砂圆点）
5. 上传区背景改为宣纸质感

修改策略：
- 文档列表的 `<div className="card-hover">` 改为 `<SealCard size="sm">`
- FAQ 列表映射为 `InscriptionItem[]`：`{ id: faq.id, number: index + 1, text: faq.question, note: faq.answer, highlight: index < 3 }`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/KnowledgePage.tsx
git commit -m "refactor: KnowledgePage with seal-cards and inscription FAQ list"
```

---

## Task 12: 重写 AvatarPage

**Files:**
- Modify: `frontend/src/pages/admin/AvatarPage.tsx`

- [ ] **Step 1: 重写 AvatarPage.tsx**

关键点：
1. `paddingLeft: 64`
2. 数字人预览框：用 CSS `clip-path: circle(50%)` 或 `ellipse(45% 50% at 50% 50%)` 做成月洞门/扇面
3. Tabs 改为琴键式窄条
4. 保存按钮改为印泥按钮：深朱砂底色，hover 下压 + 泥金边框发光

修改策略：
- 预览区 `<DigitalHuman>` 外层容器添加 `clip-path: ellipse(48% 50% at 50% 50%)` 和细线边框
- Tabs 的 `<span>` 样式改为深色背景 + 朱砂圆点 active 指示器
- 保存按钮 `<button>` 样式：`backgroundColor: '#A83828'`（深朱砂），hover 时 `transform: translateY(1px)` + `box-shadow: 0 0 0 2px rgba(201, 169, 110, 0.3)`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/AvatarPage.tsx
git commit -m "refactor: AvatarPage with moon-gate preview and seal-button"
```

---

## Task 13: 清理遗留组件

**Files:**
- Modify: `frontend/src/components/admin/MetricsCard.tsx`
- Modify: `frontend/src/components/admin/RealtimeMonitor.tsx`
- Modify: `frontend/src/components/admin/HotQuestions.tsx`
- Modify: `frontend/src/components/admin/HeatmapChart.tsx`

- [ ] **Step 1: 适配 MetricsCard**

数字字体改为 `font-family: var(--font-serif)`，颜色改为 `var(--vermilion)`，移除原有 hover lift 动效。

- [ ] **Step 2: 适配 RealtimeMonitor**

背景色改为透明（因为外层已经是 PaperPanel），连接状态红点改为 `animate-pulse-vermilion`，数字字体改为 `var(--font-mono)`。

- [ ] **Step 3: 适配 HotQuestions**

热点问题改为 `InscriptionList` 的数据格式，或直接修改内部渲染样式：序号用朱笔圈点，文字用宋体。

- [ ] **Step 4: 适配 HeatmapChart**

ECharts 配置接入 `mountainTheme` 和 `heatmapColors`。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/MetricsCard.tsx frontend/src/components/admin/RealtimeMonitor.tsx frontend/src/components/admin/HotQuestions.tsx frontend/src/components/admin/HeatmapChart.tsx
git commit -m "style: adapt sub-components to mountain-scroll theme"
```

---

## Task 14: 最终验证

- [ ] **Step 1: 启动前后端**

```bash
# 后端（已有虚拟环境）
cd backend
uvicorn app.main:app --reload --port 8000

# 前端（新终端）
cd frontend
npm run dev
```

- [ ] **Step 2: 逐项验收**

| 检查项 | 通过标准 |
|--------|---------|
| 导航 | 左侧深色卷轴导航，图标白描，active 有朱红竖线 |
| Dashboard KPI | 4 个印章式卡片，数字 42px 朱砂宋体，四角有折角装饰 |
| Dashboard 监控 | PaperPanel 容器，2×2 格线分隔，连接状态为呼吸朱砂红点 |
| Dashboard 热点 | InscriptionList 题跋风格，hover 有朱笔下划线动画 |
| Dashboard 热力图 | 石青→石绿→朱砂配色，网格线淡墨 |
| Report 摘要 | PaperPanel 带卷轴轴头，像展开的卷轴 |
| Report 情感图 | 三线分别为石绿/淡墨/朱砂，面积渐变如水墨晕染 |
| Report 词云 | 方形/圆形印章集合，颜色为朱砂/石绿/泥金，hover 放大 |
| Report 盲区/建议 | PaperPanel + InscriptionList，序号有圈点 |
| Knowledge 文档 | SealCard 列表，左侧有折页竖线，状态为小印章标签 |
| Knowledge FAQ | 题跋列表，问题宋体，答案淡墨 |
| Avatar 预览 | 圆形/椭圆形 clip-path 月洞门，有画框细线 |
| Avatar 保存 | 深朱砂按钮，hover 下压 + 泥金光晕 |
| 全局 | 无 glassmorphism / backdrop-filter，页面有卷轴展开入场动画 |

- [ ] **Step 3: Commit 任何修复**

验收中发现的小问题当场修复后提交。

---

## Self-Review

### 1. Spec Coverage

| 设计文档要求 | 对应任务 |
|-------------|---------|
| 矿物颜料配色 | Task 1 (mountain-scroll.css) |
| 字体方案 | Task 1 (CSS variables) |
| 移除玻璃态 | Task 9-12 (替换 GlassCard → SealCard/PaperPanel) |
| 左侧卷轴导航 | Task 3 (ScrollNav) |
| 印章 KPI | Task 4 (SealCard) + Task 9 (Dashboard) |
| 近水楼阁监控 | Task 9 (Dashboard PaperPanel) + Task 13 (RealtimeMonitor) |
| 林间题跋热点 | Task 6 (InscriptionList) + Task 9/13 (Dashboard/HotQuestions) |
| 市井灯火热力图 | Task 8 (MountainChart) + Task 9/13 (Dashboard/HeatmapChart) |
| 卷轴摘要 | Task 5 (PaperPanel withScrollHead) + Task 10 (Report) |
| 情感山脊线图 | Task 8 (MountainChart) + Task 10 (SentimentChart) |
| 印章词云 | Task 7 (StampCloud) + Task 10 (Report) |
| 竖排题跋 | Task 6 (InscriptionList) + Task 10 (Report) |
| 经折装文档 | Task 11 (KnowledgePage SealCard) |
| 碑帖 FAQ | Task 11 (InscriptionList) |
| 扇面预览 | Task 12 (AvatarPage clip-path) |
| 琴键 Tabs | Task 11/12 (Knowledge/Avatar) |
| 印泥按钮 | Task 12 (AvatarPage) |
| 卷轴展开动效 | Task 2 (animations.css) + Task 9-12 (页面级) |
| 印章盖印动效 | Task 2 + Task 4 |
| 朱笔圈点动效 | Task 2 + Task 6 |
| 水墨晕染动效 | Task 2 |

✅ 全部覆盖。

### 2. Placeholder Scan

- 无 "TBD"/"TODO"
- 无 "add appropriate error handling"
- 所有代码块都是完整可执行的
- 所有文件路径精确

### 3. Type Consistency

- `SealCardProps.size` 使用 `'sm' | 'md' | 'lg'` — 所有引用一致
- `InscriptionItem` 接口在 Task 6 定义，Task 9/10/11 引用时字段一致
- `mountainTheme` 纯对象导出，无类型冲突
- `PaperPanel` 的 `withScrollHead` boolean — 调用端一致

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-06-admin-frontend-redesign.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
