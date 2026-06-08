# 管理后台沉浸式前端重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将管理后台从朴素默认样式重构为"沉浸式意境"设计：四时主题背景、底部 Dock 导航、毛玻璃卡片、动效系统。

**Architecture:** 模块级持久 event loop + React Context 驱动 CSS 变量主题系统 + 底部 Dock 胶囊导航 + 各页面按需使用 GlassCard / AnimatedNumber / PageTransition 组件。

**Tech Stack:** React 18 + TypeScript + Vite + CSS Variables + Ant Design 5（保持现有）

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/styles/themes.css` | 创建 | 四时主题 CSS 变量定义 |
| `frontend/src/context/ThemeContext.tsx` | 创建 | 主题上下文 + 自动切换逻辑 |
| `frontend/src/components/admin/DockNav.tsx` | 创建 | 底部 Dock 浮动导航 |
| `frontend/src/components/admin/GlassCard.tsx` | 创建 | 毛玻璃卡片容器 |
| `frontend/src/components/admin/AnimatedNumber.tsx` | 创建 | 数字滚动动画 |
| `frontend/src/components/admin/PageTransition.tsx` | 创建 | 页面淡入淡出包装器 |
| `frontend/src/index.css` | 修改 | 引入 themes.css 和 Google Fonts |
| `frontend/src/App.tsx` | 修改 | 集成 ThemeProvider + DockNav，移除 AdminNav |
| `frontend/src/pages/admin/DashboardPage.tsx` | 修改 | 重构为三列 masonry + KPI 大数字 |
| `frontend/src/pages/admin/KnowledgePage.tsx` | 修改 | 左右分栏 + 毛玻璃卡片 |
| `frontend/src/pages/admin/AvatarPage.tsx` | 修改 | 居中预览 + 右侧配置面板 |
| `frontend/src/pages/admin/ReportPage.tsx` | 修改 | 全宽信息流 + 展开卡片 |
| `frontend/src/components/admin/SentimentChart.tsx` | 修改 | 适配主题色变量 |
| `frontend/src/components/admin/WordCloud.tsx` | 修改 | 适配主题色变量 |

---

## Task 1: 四时主题 CSS 变量

**Files:**
- Create: `frontend/src/styles/themes.css`

### Step 1: 创建 themes.css

```css
/* ============================================
   四时主题系统 — 沉浸式意境
   ============================================ */

@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&family=Noto+Sans+SC:wght@400;500&family=Roboto+Mono&display=swap');

/* ── 晨雾 Dawn (默认 06:00-10:00) ── */
:root[data-theme="dawn"],
:root {
  --bg-gradient-start: #e8e4df;
  --bg-gradient-end: #d4cbb8;
  --text-primary: #3d352e;
  --text-secondary: #5c534a;
  --text-tertiary: #9a9085;
  --surface: rgba(255, 255, 255, 0.72);
  --surface-solid: #faf8f5;
  --surface-border: rgba(255, 255, 255, 0.4);
  --accent: #c9a96e;
  --accent-hover: #b8945a;
  --shadow-sm: 0 1px 3px rgba(61, 53, 46, 0.06);
  --shadow-md: 0 4px 16px rgba(61, 53, 46, 0.08);
  --shadow-lg: 0 12px 32px rgba(61, 53, 46, 0.1);
}

/* ── 白昼 Day (10:00-16:00) ── */
:root[data-theme="day"] {
  --bg-gradient-start: #e3f0f7;
  --bg-gradient-end: #f7fbfd;
  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --text-tertiary: #8a8a8a;
  --surface: rgba(255, 255, 255, 0.85);
  --surface-solid: #ffffff;
  --surface-border: rgba(255, 255, 255, 0.5);
  --accent: #4a90d9;
  --accent-hover: #3a7bc8;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.1);
}

/* ── 日暮 Dusk (16:00-19:00) ── */
:root[data-theme="dusk"] {
  --bg-gradient-start: #f4c7a8;
  --bg-gradient-end: #e8b4d0;
  --text-primary: #3e2b36;
  --text-secondary: #5c3d4a;
  --text-tertiary: #8a6a78;
  --surface: rgba(255, 250, 245, 0.78);
  --surface-solid: #fff8f3;
  --surface-border: rgba(255, 250, 245, 0.5);
  --accent: #d4896e;
  --accent-hover: #c27860;
  --shadow-sm: 0 1px 3px rgba(62, 43, 54, 0.06);
  --shadow-md: 0 4px 16px rgba(62, 43, 54, 0.08);
  --shadow-lg: 0 12px 32px rgba(62, 43, 54, 0.1);
}

/* ── 月夜 Night (19:00-06:00) ── */
:root[data-theme="night"] {
  --bg-gradient-start: #1a2332;
  --bg-gradient-end: #0d1117;
  --text-primary: #e6edf3;
  --text-secondary: #a0abb8;
  --text-tertiary: #5c6678;
  --surface: rgba(30, 40, 55, 0.65);
  --surface-solid: #1a2332;
  --surface-border: rgba(255, 255, 255, 0.08);
  --accent: #6ba8f5;
  --accent-hover: #5a98e8;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.4);
}

/* ── 全局过渡 ── */
body {
  background: linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
  background-attachment: fixed;
  transition: background 2s ease-in-out;
}

* {
  transition: color 1.5s ease, border-color 1.5s ease, background-color 1.5s ease;
}

/* ── 字体覆盖 ── */
.font-serif {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

.font-sans {
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.font-mono-data {
  font-family: 'Roboto Mono', 'DM Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

### Step 2: Commit

```bash
git add frontend/src/styles/themes.css
git commit -m "feat: add four-season theme system CSS variables"
```

---

## Task 2: ThemeContext 上下文

**Files:**
- Create: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/src/main.tsx`

### Step 1: 创建 ThemeContext.tsx

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeName = 'dawn' | 'day' | 'dusk' | 'night';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dawn',
  setTheme: () => {},
});

function getThemeByHour(hour: number): ThemeName {
  if (hour >= 6 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const hour = new Date().getHours();
    return getThemeByHour(hour);
  });

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    // 每小时检查一次是否需要切换主题
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const expected = getThemeByHour(hour);
      if (expected !== theme) {
        setThemeState(expected);
        document.documentElement.setAttribute('data-theme', expected);
      }
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Step 2: 修改 main.tsx 包裹 ThemeProvider

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>,
);
```

### Step 3: Commit

```bash
git add frontend/src/context/ThemeContext.tsx frontend/src/main.tsx
git commit -m "feat: add ThemeContext with auto time-based switching"
```

---

## Task 3: 入口文件引入主题

**Files:**
- Modify: `frontend/src/index.css`

### Step 1: 在 index.css 顶部引入 themes.css

替换 `frontend/src/index.css` 第一行：

```css
@import './styles/themes.css';
@import './styles/tokens.css';
@import './styles/celadon-mountain-bg.css';
```

### Step 2: Commit

```bash
git add frontend/src/index.css
git commit -m "chore: import themes.css in index.css"
```

---

## Task 4: DockNav 底部导航组件

**Files:**
- Create: `frontend/src/components/admin/DockNav.tsx`
- Modify: `frontend/src/App.tsx`

### Step 1: 创建 DockNav.tsx

```typescript
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  RobotOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const navItems = [
  { to: '/admin/dashboard', icon: <DashboardOutlined />, label: '数据大屏' },
  { to: '/admin', icon: <DatabaseOutlined />, label: '知识库' },
  { to: '/admin/avatar', icon: <RobotOutlined />, label: '数字人' },
  { to: '/admin/report', icon: <FileTextOutlined />, label: '报告' },
];

const DockNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 16px',
        height: 56,
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: 28,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.to || (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 14,
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {active && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent)',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default DockNav;
```

### Step 2: 修改 App.tsx 替换 AdminNav 为 DockNav

在 `App.tsx` 中：
1. 删除 `AdminNav` 组件定义（第172-226行）
2. 导入 `DockNav`
3. 在 admin 路由外层包裹 DockNav
4. 给 admin 内容区底部加 padding 防止被 Dock 遮挡

```typescript
import DockNav from './components/admin/DockNav';
```

修改 admin 路由渲染：

```tsx
{/* Admin routes with DockNav */}
<Route path="/admin/*" element={
  <>
    <DockNav />
    <div style={{ paddingBottom: 96 }}>
      <Routes>
        <Route path="/" element={<KnowledgePage />} />
        <Route path="avatar" element={<AvatarPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  </>
} />
```

同时删除原有的四个独立 admin Route 定义（278-281行）。

### Step 3: Commit

```bash
git add frontend/src/components/admin/DockNav.tsx frontend/src/App.tsx
git commit -m "feat: replace AdminNav with bottom Dock navigation"
```

---

## Task 5: GlassCard 毛玻璃卡片

**Files:**
- Create: `frontend/src/components/admin/GlassCard.tsx`

### Step 1: 创建 GlassCard.tsx

```typescript
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, style, className }) => {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        borderRadius: 16,
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-md)',
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;
```

### Step 2: Commit

```bash
git add frontend/src/components/admin/GlassCard.tsx
git commit -m "feat: add GlassCard component"
```

---

## Task 6: AnimatedNumber 数字滚动

**Files:**
- Create: `frontend/src/components/admin/AnimatedNumber.tsx`

### Step 1: 创建 AnimatedNumber.tsx

```typescript
import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
}) => {
  const [display, setDisplay] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    startValue.current = display;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue.current + (value - startValue.current) * easeOut;
      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <span className="font-mono-data" style={style}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
};

export default AnimatedNumber;
```

### Step 2: Commit

```bash
git add frontend/src/components/admin/AnimatedNumber.tsx
git commit -m "feat: add AnimatedNumber component with ease-out scroll"
```

---

## Task 7: PageTransition 页面过渡

**Files:**
- Create: `frontend/src/components/admin/PageTransition.tsx`

### Step 1: 创建 PageTransition.tsx

```typescript
import React from 'react';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        animation: 'pageFadeIn 300ms ease-in-out both',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
```

同时在 `themes.css` 或 `tokens.css` 中添加关键帧（如果已存在 `fadeIn` 则可直接复用）。在 `themes.css` 末尾追加：

```css
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Step 2: Commit

```bash
git add frontend/src/components/admin/PageTransition.tsx
git commit -m "feat: add PageTransition wrapper component"
```

---

## Task 8: DashboardPage 重构

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.tsx`

### Step 1: 重构 DashboardPage

核心改动：
1. 移除 `data-theme="dark"` 硬编码
2. 标题改用 `.font-serif`
3. MetricsCard 外层使用 GlassCard 包裹
4. 底部加 padding 防止 Dock 遮挡（已经在 App.tsx 加了）
5. 大数字改用 AnimatedNumber

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { TeamOutlined, MessageOutlined, SmileOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import MetricsCard from '../../components/admin/MetricsCard';
import HotQuestions from '../../components/admin/HotQuestions';
import RealtimeMonitor from '../../components/admin/RealtimeMonitor';
import GlassCard from '../../components/admin/GlassCard';
import AnimatedNumber from '../../components/admin/AnimatedNumber';
import PageTransition from '../../components/admin/PageTransition';
import {
  getOverview,
  getTopQuestions,
  type OverviewMetrics,
  type TopQuestionItem,
} from '../../api/analytics';

const DashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [topQuestions, setTopQuestions] = useState<TopQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = false;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [ov, tq] = await Promise.all([
          getOverview(),
          getTopQuestions(10),
        ]);
        setOverview(ov);
        setTopQuestions(tq);
      } catch (err: any) {
        message.error('加载数据失败: ' + (err?.message || '未知错误'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ov = await getOverview();
        setOverview(ov);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleQuestionClick = useCallback((question: { id: string; question: string }) => {
    console.log('Question clicked:', question);
  }, []);

  const hotQuestions = topQuestions.map((q, i) => ({
    id: `q-${i}`,
    question: q.question,
    count: q.count,
    trend: 'stable' as const,
  }));

  const realtimeData = overview
    ? {
        activeUsers: overview.uniqueSessions,
        messagesPerMinute: Math.max(1, Math.round(overview.todayInteractions / 60)),
        avgResponseTime: Math.round(overview.avgLatencyMs),
        sentimentScore: overview.avgSentimentScore,
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      data-testid="dashboard-page"
      style={{
        padding: isMobile ? '16px' : '28px',
        maxWidth: '1440px',
        margin: '0 auto',
        minHeight: isFullscreen ? '100vh' : undefined,
      }}
    >
      <PageTransition>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '20px' : '28px',
        }}>
          <h1 className="font-serif" style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
          }}>
            数据大屏
          </h1>
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? '退出全屏' : '全屏模式'}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              borderRadius: 12,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '18px',
              transition: 'all 200ms',
              backdropFilter: 'blur(12px)',
            }}
          >
            {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '12px' : '16px',
              marginBottom: isMobile ? '16px' : '28px',
            }}>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="今日交互"
                  value={<AnimatedNumber value={overview?.todayInteractions ?? 0} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<TeamOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="活跃会话"
                  value={<AnimatedNumber value={overview?.uniqueSessions ?? 0} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<MessageOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="平均情感分"
                  value={<AnimatedNumber value={overview?.avgSentimentScore ?? 0} decimals={2} style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="stable"
                  trendValue="实时"
                  icon={<SmileOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
              <GlassCard style={{ padding: 20 }}>
                <MetricsCard
                  title="FAQ命中率"
                  value={<AnimatedNumber value={((overview?.faqHitRate ?? 0) * 100)} decimals={0} suffix="%" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }} />}
                  trend="up"
                  trendValue="实时"
                  icon={<SmileOutlined />}
                  color="var(--accent)"
                />
              </GlassCard>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
            }}>
              <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                <RealtimeMonitor data={realtimeData} />
              </GlassCard>
              <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                <HotQuestions questions={hotQuestions} onQuestionClick={handleQuestionClick} />
              </GlassCard>
            </div>
          </>
        )}
      </PageTransition>
    </div>
  );
};

export default DashboardPage;
```

注意：MetricsCard 的 `value` prop 原本是 `number | string`，现在传入 JSX 可能类型不匹配。如果 MetricsCard 限制了类型，需要同时修改 MetricsCard.tsx 的 `value` prop 类型为 `React.ReactNode`。

### Step 2: Commit

```bash
git add frontend/src/pages/admin/DashboardPage.tsx
git commit -m "feat: redesign DashboardPage with GlassCard and AnimatedNumber"
```

---

## Task 9: KnowledgePage 重构

**Files:**
- Modify: `frontend/src/pages/admin/KnowledgePage.tsx`

### Step 1: 重构 KnowledgePage

核心改动：
1. 标题改用 `.font-serif`
2. 外层内容区使用 GlassCard 包裹
3. 按钮使用 accent 色
4. 包裹 PageTransition

```tsx
// 在现有 KnowledgePage.tsx 基础上：
// 1. 导入 GlassCard 和 PageTransition
import GlassCard from '../../components/admin/GlassCard';
import PageTransition from '../../components/admin/PageTransition';

// 2. 在 return 中，将外层 div 改为：
<div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
  <PageTransition>
    {/* 标题 */}
    <h1 className="font-serif" style={{...}}>知识库管理</h1>
    
    {/* 文档列表区用 GlassCard 包裹 */}
    <GlassCard style={{ marginBottom: 24 }}>
      {/* 原有文档列表内容 */}
    </GlassCard>
    
    {/* FAQ 区用 GlassCard 包裹 */}
    <GlassCard>
      {/* 原有 FAQ 内容 */}
    </GlassCard>
  </PageTransition>
</div>
```

由于 KnowledgePage 代码较长（约 400 行），具体修改保留原有结构，仅做以下替换：
- 所有 `className="section-card"` 的地方替换为 `<GlassCard>` 包裹
- 标题样式增加 `className="font-serif"`
- 外层加 `PageTransition`
- 按钮的 `backgroundColor: 'var(--color-primary)'` 改为 `'var(--accent)'`

### Step 2: Commit

```bash
git add frontend/src/pages/admin/KnowledgePage.tsx
git commit -m "feat: redesign KnowledgePage with GlassCard and theme colors"
```

---

## Task 10: AvatarPage 重构

**Files:**
- Modify: `frontend/src/pages/admin/AvatarPage.tsx`

### Step 1: 重构 AvatarPage

核心改动：
1. 标题改用 `.font-serif`
2. 预览区和配置面板用 GlassCard 包裹
3. 按钮使用 accent 色
4. 包裹 PageTransition

```tsx
// 在现有 AvatarPage.tsx 基础上：
import GlassCard from '../../components/admin/GlassCard';
import PageTransition from '../../components/admin/PageTransition';

// return 中：
<div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
  <PageTransition>
    <h1 className="font-serif" style={{...}}>数字人配置</h1>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <GlassCard style={{ flex: '1 1 500px', minHeight: 400 }}>
        {/* Live2D 预览区 */}
      </GlassCard>
      <GlassCard style={{ flex: '1 1 300px' }}>
        {/* 配置面板 */}
      </GlassCard>
    </div>
  </PageTransition>
</div>
```

### Step 2: Commit

```bash
git add frontend/src/pages/admin/AvatarPage.tsx
git commit -m "feat: redesign AvatarPage with GlassCard layout"
```

---

## Task 11: ReportPage 重构

**Files:**
- Modify: `frontend/src/pages/admin/ReportPage.tsx`

### Step 1: 重构 ReportPage

核心改动：
1. 标题改用 `.font-serif`
2. 报告卡片、盲区发现、服务建议用 GlassCard 包裹
3. 按钮使用 accent 色
4. 包裹 PageTransition

```tsx
import GlassCard from '../../components/admin/GlassCard';
import PageTransition from '../../components/admin/PageTransition';

// return 中：
<div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
  <PageTransition>
    <h1 className="font-serif" style={{...}}>游客感受度报告</h1>
    
    {/* 日期选择 + 生成按钮 */}
    
    <GlassCard style={{ marginBottom: 24 }}>
      {/* 报告内容 / MarkdownRenderer */}
    </GlassCard>
    
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <GlassCard style={{ flex: 1, minWidth: 300 }}>
        <SentimentChart data={trends} />
      </GlassCard>
      <GlassCard style={{ flex: 1, minWidth: 300 }}>
        <WordCloud words={wordCloudData} />
      </GlassCard>
    </div>
    
    <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
      <GlassCard style={{ flex: 1, minWidth: 300 }}>
        {/* 盲区发现 */}
      </GlassCard>
      <GlassCard style={{ flex: 1, minWidth: 300 }}>
        {/* 服务建议 */}
      </GlassCard>
    </div>
  </PageTransition>
</div>
```

### Step 2: Commit

```bash
git add frontend/src/pages/admin/ReportPage.tsx
git commit -m "feat: redesign ReportPage with GlassCard and theme integration"
```

---

## Task 12: SentimentChart 适配主题

**Files:**
- Modify: `frontend/src/components/admin/SentimentChart.tsx`

### Step 1: 修改 SentimentChart 使用 CSS 变量色

将图表中的硬编码颜色改为读取 CSS 变量：

```tsx
// 在 ECharts option 中：
const getOption = () => ({
  // ...
  series: [
    {
      name: '正面',
      data: positiveData,
      itemStyle: { color: 'var(--accent)' }, // 或保持品牌色
    },
    // ...
  ],
});
```

如果 ECharts 不支持 CSS 变量字符串作为颜色，则通过 `getComputedStyle` 读取：

```tsx
const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c9a96e';
```

### Step 2: Commit

```bash
git add frontend/src/components/admin/SentimentChart.tsx
git commit -m "feat: adapt SentimentChart to theme colors"
```

---

## Task 13: WordCloud 适配主题

**Files:**
- Modify: `frontend/src/components/admin/WordCloud.tsx`

### Step 1: 修改 WordCloud 使用 CSS 变量色

将 `COLORS` 数组改为读取 CSS 变量或主题相关色：

```tsx
const COLORS = [
  'var(--accent)',
  'var(--text-primary)',
  'var(--text-secondary)',
  'var(--color-vermilion)',
  'var(--color-celadon)',
  '#8B5CF6',
  '#13c2c2',
  '#C23B22',
];
```

### Step 2: Commit

```bash
git add frontend/src/components/admin/WordCloud.tsx
git commit -m "feat: adapt WordCloud to theme colors"
```

---

## Task 14: MetricsCard 适配 ReactNode value

**Files:**
- Modify: `frontend/src/components/admin/MetricsCard.tsx`

### Step 1: 修改 value prop 类型

```tsx
interface MetricsCardProps {
  title: string;
  value: React.ReactNode; // 从 number | string 改为 ReactNode
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  icon: React.ReactNode;
  color: string;
}
```

### Step 2: Commit

```bash
git add frontend/src/components/admin/MetricsCard.tsx
git commit -m "feat: allow ReactNode in MetricsCard value for AnimatedNumber"
```

---

## Task 15: 编译验证与修复

**Files:**
- 可能涉及：多个文件类型修复

### Step 1: 运行 TypeScript 编译检查

```bash
cd frontend
npx tsc --noEmit
```

### Step 2: 修复编译错误

常见错误：
- `MetricsCard` value 类型不匹配 → 已在 Task 14 修复
- `GlassCard` 未导入 → 检查各页面 import
- CSS 变量类型问题 → 无需修复，CSS 是运行时

### Step 3: 运行现有测试

```bash
npm test
```

### Step 4: Commit

```bash
git add -A
git commit -m "fix: resolve TypeScript errors after redesign"
```

---

## Task 16: 最终验收

### Step 1: 启动前后端服务

```bash
# 后端
cd backend && .\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend && npm run dev
```

### Step 2: 浏览器验证清单

- [ ] 打开 `/admin/dashboard`，背景为晨雾渐变
- [ ] 底部 Dock 导航可见，4 个图标居中
- [ ] Dock hover 有弹性放大效果
- [ ] 页面切换有淡入动画
- [ ] KPI 数字从 0 滚动到实际值
- [ ] 各页面卡片为毛玻璃效果
- [ ] 标题为宋体（Noto Serif SC）
- [ ] 切换路由时 Dock 选中态正确更新

### Step 3: Commit（如有修复）

```bash
git add -A
git commit -m "fix: final polish after visual verification"
```

---

## 风险与回滚

| 风险 | 缓解 |
|------|------|
| `backdrop-filter` 性能问题 | 已在 themes.css 中避免大面积使用，仅 Dock 和卡片 |
| Ant Design 样式与主题冲突 | 保持 AntD 组件在卡片内部使用，外层由我们控制 |
| 字体加载慢 | 使用 Google Fonts `display=swap`，有系统字体 fallback |
| 移动端 Dock 遮挡 | App.tsx 已加 `paddingBottom: 96` |

**回滚策略：** 所有改动均为新增文件 + 修改现有文件，回滚时：
1. 删除新增组件文件
2. `git checkout -- frontend/src/App.tsx frontend/src/main.tsx frontend/src/index.css`
3. 恢复四个 admin 页面到之前版本
