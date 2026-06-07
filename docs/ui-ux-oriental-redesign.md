# 智慧灵山胜境 · 东方美学 UI/UX 重设计规范

> 版本：v1.0
> 日期：2026-06-06
> 适用范围：frontend/src 全站视觉升级

---

## 一、设计哲学

### 1.1 核心理念：「游园惊梦」

将旅游体验包装为一场穿越灵山胜境的文化之旅。用户不是"浏览网页"，而是"展开画卷、步入园林"。

- **游**——流畅的动线引导，如漫步园林
- **园**——留白与层次的页面节奏，如借景造园
- **惊**——关键时刻的视觉冲击，如转角见山
- **梦**——沉浸式的氛围营造，如人在画中

### 1.2 视觉调性

| 维度 | 传统表达 | 现代转译 |
|------|----------|----------|
| 底色 | 宣纸白 | 暖米白 `#F7F5F0` + 噪点纹理 |
| 层次 | 水墨浓淡 | 透明度梯度 + 毛玻璃 |
| 点缀 | 朱红印章 | 高饱和强调色 + 徽章式标签 |
| 结构 | 卷轴装裱 | 圆角卡片 + 边框装饰线 |
| 文字 | 书法气韵 | 书法体标题 + 无衬线正文 |

### 1.3 设计原则

1. **留白即景**：40% 以上页面留白，内容如山水点缀其间
2. **动线如径**：用户操作路径如园林小径，曲折有致，每步有景
3. **层次如山**：前景（内容）- 中景（卡片）- 远景（背景）三层分明
4. **细节如印**：微交互和点缀如印章落款，精致而不喧宾夺主

---

## 二、视觉系统规范（Design Tokens）

### 2.1 色彩系统

#### 主色体系：天青 + 朱红 + 黛蓝

```css
/* === 主色 === */
--color-primary: #6A9C89;        /* 天青 — 主导航、主操作 */
--color-primary-light: #8CBFAD;  /* 天青浅 — hover态 */
--color-primary-dark: #4A7A68;   /* 天青深 — active/press态 */
--color-primary-bg: #E8F2EE;     /* 天青背景 — 选中态、轻提示 */

--color-accent: #C84B31;         /* 朱红 — CTA、重点强调、印章 */
--color-accent-light: #E85D3A;   /* 朱红浅 — hover态 */
--color-accent-bg: #FCECE9;      /* 朱红背景 — 轻提示 */

--color-auxiliary: #2A4D6E;      /* 黛蓝 — 辅助信息、科技感 */
--color-auxiliary-light: #4A6D8E;/* 黛蓝浅 */
--color-auxiliary-bg: #E8EEF4;   /* 黛蓝背景 */
```

#### 文化色板（模块区分用）

```css
--color-celadon: #6BA292;        /* 茶青 — 自然/生态模块 */
--color-ochre: #B87333;          /* 赭石 — 历史/文化模块 */
--color-lotus: #D4A5A5;          /* 藕粉 — 人文/情感模块 */
--color-gold: #C8A951;           /* 鎏金 — 成就/排行榜 */
--color-ink: #2A2520;            /* 墨黑 — 标题/正文 */
--color-paper: #F7F5F0;          /* 宣纸 — 全局背景 */
```

#### 中性色阶

```css
--gray-50:  #FAF9F6;   /* 极浅 — hover背景 */
--gray-100: #F0EDE8;   /* 浅 — 卡片交替背景 */
--gray-200: #E0DCD5;   /* 边框浅色 */
--gray-300: #C4BFB6;   /* 禁用态 */
--gray-400: #9E988E;   /* 占位文字 */
--gray-500: #7A7468;   /* 次要文字 */
--gray-600: #5C554C;   /* 正文辅助 */
--gray-700: #3D3832;   /* 正文主色 */
--gray-800: #2A2520;   /* 标题/深色文字 */
--gray-900: #1A1614;   /* 极深 — 深色模式正文 */
```

#### 语义色

```css
--color-success: #2D8B57;
--color-success-bg: #E6F7ED;
--color-warning: #C8A951;
--color-warning-bg: #FDF6E3;
--color-error: #C84B31;
--color-error-bg: #FCECE9;
--color-info: #2A4D6E;
--color-info-bg: #E8EEF4;
```

#### 渐变体系

```css
/* 水墨渐变 — 用于Hero区、遮罩 */
--gradient-ink: linear-gradient(
  180deg,
  rgba(26, 22, 20, 0) 0%,
  rgba(26, 22, 20, 0.02) 40%,
  rgba(26, 22, 20, 0.08) 100%
);

/* 霞光渐变 — 用于重点卡片、CTA */
--gradient-sunset: linear-gradient(
  135deg,
  #C84B31 0%,
  #D4A5A5 50%,
  #F7F5F0 100%
);

/* 天青渐变 — 用于导航、品牌区域 */
--gradient-cyan: linear-gradient(
  135deg,
  #6A9C89 0%,
  #8CBFAD 100%
);

/* 宣纸纹理叠加 — 用于背景 */
--texture-paper: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
```

#### 阴影体系

```css
/* 柔和投影 — 模拟纸张层次 */
--shadow-sm: 0 1px 3px rgba(26, 22, 20, 0.04), 0 1px 2px rgba(26, 22, 20, 0.02);
--shadow-md: 0 4px 16px rgba(26, 22, 20, 0.06), 0 2px 6px rgba(26, 22, 20, 0.03);
--shadow-lg: 0 12px 40px rgba(26, 22, 20, 0.08), 0 4px 12px rgba(26, 22, 20, 0.04);

/* 朱红辉光 — 用于强调元素focus/hover */
--shadow-glow-vermilion: 0 0 0 3px rgba(200, 75, 49, 0.15);

/* 天青辉光 */
--shadow-glow-cyan: 0 0 0 3px rgba(106, 156, 137, 0.15);
```

### 2.2 字体系统

#### 字体栈

```css
/* 书法体 — 大标题、装饰文字、印章 */
--font-calligraphy: 'LXGW WenKai', 'ZCOOL XiaoWei', 'Ma Shan Zheng', 'STKaiti', serif;

/* 宋体 — 副标题、强调段落 */
--font-serif: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;

/* 无衬线 — 正文、UI控件 */
--font-sans: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB',
  'Microsoft YaHei', 'Helvetica Neue', sans-serif;

/* 等宽 — 数据、代码 */
--font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
```

#### 字体加载策略

```html
<!-- 在 index.html <head> 中添加 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet" />
```

备选：使用 [`@chinese-fonts/lxgwwenkai`](https://github.com/chinese-fonts/lxgwwenkai) npm包离线加载霞鹜文楷。

#### 字号层级

| Token | 桌面端 | 移动端 | 字重 | 字体 | 用途 |
|-------|--------|--------|------|------|------|
| display | 48px | 32px | 700 | 书法体 | 首屏大标题 |
| h1 | 36px | 28px | 700 | 书法体 | 页面标题 |
| h2 | 28px | 22px | 600 | 宋体 | 区块标题 |
| h3 | 22px | 18px | 600 | 宋体 | 卡片标题 |
| h4 | 18px | 16px | 600 | 无衬线 | 小标题 |
| body | 15px | 14px | 400 | 无衬线 | 正文 |
| body-sm | 14px | 13px | 400 | 无衬线 | 辅助文字 |
| caption | 12px | 11px | 400 | 无衬线 | 标注、时间戳 |
| data | 28px | 22px | 600 | 等宽 | 统计数据 |

```css
--font-size-display: clamp(2rem, 5vw, 3rem);
--font-size-h1: clamp(1.75rem, 4vw, 2.25rem);
--font-size-h2: clamp(1.375rem, 3vw, 1.75rem);
--font-size-h3: clamp(1.125rem, 2.5vw, 1.375rem);
--font-size-h4: 1.125rem;
--font-size-body: 0.9375rem;
--font-size-body-sm: 0.875rem;
--font-size-caption: 0.75rem;
--font-size-data: clamp(1.375rem, 3vw, 1.75rem);

--line-height-tight: 1.3;
--line-height-normal: 1.6;
--line-height-relaxed: 1.8;
--line-height-loose: 2.0;
```

#### 排版规范

- **标题**：使用书法体，增加 `letter-spacing: 0.05em` 营造呼吸感
- **正文**：无衬线，`line-height: 1.6-1.8`，段落间距 `1em`
- **引用/典故**：左侧 `3px` 朱红竖线 + 宋体斜体 + 浅灰背景
- **数据展示**：等宽字体 + 天青色，大数字用书法体配合单位

### 2.3 间距系统

沿用现有 `--space-*` 体系，增加页面级间距：

```css
--space-section-sm: 48px;   /* 小段落间距 */
--space-section-md: 64px;   /* 标准段落间距 */
--space-section-lg: 96px;   /* 大段落间距（Hero区） */
--space-section-xl: 128px;  /* 超大间距（页面分区） */
```

### 2.4 圆角系统

```css
--radius-sm: 6px;    /* 小标签、徽章 */
--radius-md: 10px;   /* 按钮、输入框 */
--radius-lg: 16px;   /* 小卡片 */
--radius-xl: 24px;   /* 大卡片、弹窗 */
--radius-pill: 999px;/* 胶囊按钮 */
--radius-seal: 4px;  /* 印章、方形标签 */
```

### 2.5 Z-Index 层级

```css
--z-base: 0;
--z-background: -1;   /* 背景图、装饰层 */
--z-dropdown: 100;
--z-sticky: 200;      /* 导航栏 */
--z-overlay: 400;     /* 遮罩、弹窗背景 */
--z-modal: 500;       /* 弹窗、抽屉 */
--z-toast: 1000;      /* 通知、Toast */
```

---

## 三、组件设计规范

### 3.1 导航栏（Navbar）

#### 视觉规范

```
┌─────────────────────────────────────────────────────────────┐
│  ┌───┐                                                      │
│  │ 灵│  智慧灵山胜境          对话  探索导览  景点  ...      │
│  └───┘                                      ┌──────────┐    │
│                                             │ 管理后台 │    │
└─────────────────────────────────────────────────────────────┘
```

- **背景**：`rgba(247, 245, 240, 0.75)` + `backdrop-filter: blur(16px)` + 宣纸噪点纹理
- **底部边框**：`1px solid rgba(192, 188, 182, 0.5)`
- **高度**：`64px`（桌面端） / `56px`（移动端）
- **阴影**：`--shadow-sm`

#### Logo区域

```css
.logo-seal {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #C84B31 0%, #E85D3A 100%);
  border-radius: 4px; /* 印章方形 */
  color: #fff;
  font-family: var(--font-calligraphy);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(200, 75, 49, 0.25);
}
```

- 文字"灵"使用书法体，偏右上方偏移 `1px` 模拟手工印章的不居中对齐感

#### 导航链接

```css
.nav-link {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  color: var(--gray-600);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  text-decoration: none;
  position: relative;
  transition: color 200ms ease;
}

.nav-link:hover {
  color: var(--color-primary);
}

/* 当前页指示器 — 朱红短线 */
.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 1px;
}

/* hover 下划线动画 — 毛笔笔触感 */
.nav-link::before {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 20px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.nav-link:hover::before {
  transform: translateX(-50%) scaleX(1);
}
```

#### 移动端导航

- 汉堡菜单图标改为"卷轴"图标（三条横线 + 底部略宽）
- 展开菜单采用全屏"画卷"风格，从顶部滑下，背景为宣纸白 + 水墨装饰
- 菜单项竖排排列，每个项左侧有朱红小圆点指示器

### 3.2 卡片体系

#### 3.2.1 画卷卡片（景点/内容卡片）

```
┌──────────────────────────┐
│  ┌────────────────────┐  │
│  │                    │  │  ← 图片区 + 水墨底部晕染
│  │    [景点图片]       │  │
│  │                    │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 景点名称           ● │  │  ← 标题 + 状态指示点
│  │ 简介文字...         │  │
│  │ ┌──┐ ┌──┐         │  │
│  │ │标签│ │标签│       │  │  ← 功能标签（pill样式）
│  │ └──┘ └──┘         │  │
│  └────────────────────┘  │
└──────────────────────────┘
      ↑ 细线边框模拟装裱
```

```css
.scroll-card {
  background: var(--surface-card);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 300ms ease, transform 300ms ease;
}

.scroll-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

/* 图片区水墨晕染 */
.scroll-card__image {
  position: relative;
  overflow: hidden;
}

.scroll-card__image::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(
    to top,
    rgba(247, 245, 240, 1) 0%,
    rgba(247, 245, 240, 0) 100%
  );
  mask-image: linear-gradient(
    to top,
    black 0%,
    transparent 100%
  );
}

.scroll-card__image img {
  transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-card:hover .scroll-card__image img {
  transform: scale(1.05);
}

/* 底部装裱线 */
.scroll-card__footer {
  border-top: 1px solid var(--gray-200);
  padding-top: 12px;
  margin-top: 12px;
}
```

#### 3.2.2 匾额卡片（统计/成就卡片）

```css
.plaque-card {
  background: linear-gradient(135deg, #2A2520 0%, #3D3832 100%);
  border-radius: var(--radius-lg);
  padding: 24px;
  color: var(--gray-100);
  position: relative;
  overflow: hidden;
}

/* 边框装饰 — 金色细线 */
.plaque-card::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(200, 169, 81, 0.3);
  border-radius: calc(var(--radius-lg) - 4px);
  pointer-events: none;
}

.plaque-card__value {
  font-family: var(--font-calligraphy);
  font-size: var(--font-size-data);
  color: var(--color-gold);
}

.plaque-card__label {
  font-size: var(--font-size-caption);
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

#### 3.2.3 书札卡片（消息/对话卡片）

```css
/* AI 回复 — 书札样式 */
.letter-card--ai {
  background: linear-gradient(135deg, #FDFBF7 0%, #F5F3EE 100%);
  border-left: 3px solid var(--color-primary);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  padding: 16px 20px;
  position: relative;
}

/* 左侧竖线装饰 */
.letter-card--ai::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 12px;
  bottom: 12px;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-primary) 20%,
    var(--color-primary) 80%,
    transparent 100%
  );
  opacity: 0.3;
}

/* 用户消息 — 朱批样式 */
.letter-card--user {
  background: linear-gradient(135deg, #FCECE9 0%, #FDF5F3 100%);
  border-right: 3px solid var(--color-accent);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  padding: 16px 20px;
}
```

### 3.3 按钮体系

#### 印章按钮（主操作）

```css
.btn-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;              /* 触控目标 ≥44px */
  min-width: 44px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #C84B31 0%, #E85D3A 100%);
  color: #fff;
  font-size: var(--font-size-body);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: box-shadow 200ms ease, transform 150ms ease;
  box-shadow: 0 2px 8px rgba(200, 75, 49, 0.25);
}

.btn-seal:hover {
  box-shadow: 0 4px 16px rgba(200, 75, 49, 0.35);
  transform: translateY(-1px);
}

.btn-seal:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(200, 75, 49, 0.25);
}

/* 点击时的墨迹扩散效果 */
.btn-seal::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 400ms ease, height 400ms ease;
}

.btn-seal:active::after {
  width: 200%;
  height: 200%;
}
```

#### 线框按钮（次要操作）

```css
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;              /* 触控目标 ≥44px */
  min-width: 44px;
  padding: 10px 24px;
  background: transparent;
  color: var(--gray-700);
  font-size: var(--font-size-body);
  font-weight: 500;
  border: 1.5px solid var(--gray-300);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 200ms ease;
  position: relative;
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}
```

#### 题签按钮（快捷操作/标签）

```css
.btn-tag {
  display: inline-flex;
  align-items: center;
  min-height: 36px;              /* 题签可略小，但不低于36px */
  min-width: 44px;
  padding: 6px 14px;
  background: var(--gray-100);
  color: var(--gray-600);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 200ms ease;
}

.btn-tag:hover {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-tag.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
```

#### 印章徽章（状态/标签）

```css
.badge-seal {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  font-size: var(--font-size-caption);
  font-weight: 600;
  border-radius: var(--radius-seal);
  border: 1px solid rgba(200, 75, 49, 0.2);
}

.badge-seal--gold {
  background: rgba(200, 169, 81, 0.1);
  color: var(--color-gold);
  border-color: rgba(200, 169, 81, 0.2);
}
```

### 3.4 输入框

```css
.input-ink {
  width: 100%;
  padding: 12px 16px;
  font-size: var(--font-size-body);
  font-family: var(--font-sans);
  color: var(--gray-800);
  background: var(--surface-card);
  border: none;
  border-bottom: 2px solid var(--gray-200);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  outline: none;
  transition: border-color 200ms ease, background 200ms ease;
}

/* 底部边框 — 毛笔笔触感（左粗右细） */
.input-ink {
  border-image: linear-gradient(
    to right,
    var(--gray-200) 0%,
    var(--gray-200) 60%,
    transparent 100%
  ) 1;
}

.input-ink:focus {
  border-color: var(--color-primary);
  border-image: linear-gradient(
    to right,
    var(--color-primary) 0%,
    var(--color-primary) 70%,
    transparent 100%
  ) 1;
  background: var(--gray-50);
}

.input-ink::placeholder {
  color: var(--gray-400);
  font-style: italic;
}
```

### 3.5 Live2D 数字人东方美学包装

> 项目已集成 Live2D（`pixi.js` + `pixi-live2d-display/cubism4`），本规范描述如何为其添加东方美学视觉包装。

#### 水墨画框容器

```css
.live2d-ink-frame {
  position: relative;
  width: 280px;
  height: 380px;
  border-radius: 50% 48% 52% 50%; /* 不规则圆角，模拟手绘感 */
  overflow: hidden;
  background: linear-gradient(
    180deg,
    #F0F4FF 0%,
    #E8F0FE 50%,
    #F8F6F2 100%
  );
  /* 水墨晕染边框效果 */
  box-shadow:
    0 0 0 2px rgba(106, 156, 137, 0.3),
    0 0 0 6px rgba(106, 156, 137, 0.1),
    0 0 0 12px rgba(106, 156, 137, 0.05),
    0 8px 32px rgba(26, 22, 20, 0.1);
}

/* 内层宣纸纹理 */
.live2d-ink-frame::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: inherit;
  background: var(--texture-paper);
  opacity: 0.5;
  pointer-events: none;
  z-index: 1;
}

/* 底部状态栏 */
.live2d-status-bar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(106, 156, 137, 0.85);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.live2d-status-bar .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
```

#### 讲解中状态（声波动画）

```css
.live2d-speaking-wave {
  display: flex;
  gap: 2px;
  align-items: center;
}

.live2d-speaking-wave .bar {
  width: 3px;
  background: #fff;
  border-radius: 2px;
  animation: soundBar 0.5s ease-in-out infinite alternate;
}

.live2d-speaking-wave .bar:nth-child(1) { height: 8px; animation-delay: 0s; }
.live2d-speaking-wave .bar:nth-child(2) { height: 14px; animation-delay: 0.1s; }
.live2d-speaking-wave .bar:nth-child(3) { height: 10px; animation-delay: 0.2s; }

@keyframes soundBar {
  from { transform: scaleY(0.5); }
  to { transform: scaleY(1); }
}
```

#### 情绪反馈光效

| 情绪 | 视觉效果 |
|------|----------|
| 开心 | 头像框周围泛起淡金色光晕（`box-shadow: 0 0 20px rgba(200,169,81,0.3)`）|
| 思考 | 泛起淡青色涟漪（`box-shadow: 0 0 20px rgba(106,156,137,0.3)`）|
| 惊讶 | 轻微放大 + 朱红脉冲（`animation: pulseVermilion 0.6s ease`）|
| 抱歉 | 光晕变暗，边框颜色转灰 |

```css
@keyframes pulseVermilion {
  0% { box-shadow: 0 0 0 0 rgba(200, 75, 49, 0.4); }
  70% { box-shadow: 0 0 0 16px rgba(200, 75, 49, 0); }
  100% { box-shadow: 0 0 0 0 rgba(200, 75, 49, 0); }
}
```

#### 加载状态

- 数字人加载中：显示旋转的墨滴动画（替代现有蓝色 spinner）
- 使用"数字人加载中..."文字 + 淡墨色
- 错误状态：显示水墨风格错误图标 + "请确认模型文件已放置"提示

### 3.6 分隔与装饰元素

```css
/* 水墨分割线 */
.divider-ink {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--gray-300) 20%,
    var(--gray-300) 80%,
    transparent 100%
  );
  margin: var(--space-6) 0;
}

/* 竖排装饰线（用于引用、侧边） */
.deco-line-v {
  width: 2px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-primary) 30%,
    var(--color-primary) 70%,
    transparent 100%
  );
}

/* 印章落款（页面角落装饰） */
.seal-mark {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  font-family: var(--font-calligraphy);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-5deg);
  opacity: 0.6;
  pointer-events: none;
}
```

---

## 四、页面级设计规范

### 4.1 全局背景策略 + 动态特效

```css
/* 全局背景 — 宣纸白 + 水墨山景 + 动态特效层 */
.app-background {
  min-height: 100vh;
  background-color: var(--color-paper);
  background-image:
    var(--texture-paper),
    linear-gradient(
      180deg,
      rgba(247, 245, 240, 0.95) 0%,
      rgba(247, 245, 240, 0.85) 50%,
      rgba(247, 245, 240, 0.92) 100%
    ),
    url('/image/AigcAssets(3).png');
  background-size: 100px 100px, 100% 100%, cover;
  background-position: center, center, center 75%;
  background-repeat: repeat, no-repeat, no-repeat;
  background-attachment: scroll, scroll, fixed;
}
```

- **图层1**：宣纸噪点纹理（重复平铺）
- **图层2**：半透明白色遮罩（确保文字可读性）
- **图层3**：水墨山景底图（固定定位，营造远景）—— 使用现有图片 `AigcAssets(3).png` 或 `bg-mountain.png`
- 底图透明度：从现有 `0.45` 降至 `0.15-0.2`，使其真正成为"远景"

#### 动态特效层（覆盖在全站背景之上）

**1. 视差滚动**
- 远山底图以 `0.3x` 速度跟随页面滚动，营造景深
- 中层装饰元素（如云纹）以 `0.5x` 速度滚动
- 实现：JS 监听 `scroll` 事件，对 `background-position-y` 做偏移

**2. 飘落粒子系统**
- 类型：花瓣（藕粉色）+ 银杏叶（鎏金色）
- 数量：桌面端 20-30 个，移动端 10-15 个
- 运动轨迹：缓慢飘落 + 左右摇摆（正弦波）+ 旋转
- 出现范围：页面顶部随机生成，飘落至底部后重置
- 实现：Canvas 2D 或 CSS `position: fixed` + `requestAnimationFrame`

```css
.particle-floating {
  position: fixed;
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
  animation: particleFall linear infinite;
}

@keyframes particleFall {
  0% {
    transform: translateY(-10vh) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% { opacity: 0.4; }
  90% { opacity: 0.4; }
  100% {
    transform: translateY(110vh) translateX(20px) rotate(360deg);
    opacity: 0;
  }
}
```

**3. 远山雾气流动**
- 在山景底图上方增加半透明白雾层
- 雾气缓慢水平流动（`translateX` 循环）
- 多层雾气不同速度，营造层次感
- 实现：绝对定位的 div + `linear-gradient` 遮罩 + CSS 动画

```css
.mist-layer {
  position: fixed;
  bottom: 0;
  left: -20%;
  width: 140%;
  height: 40vh;
  background: linear-gradient(
    to top,
    rgba(247, 245, 240, 0.6) 0%,
    rgba(247, 245, 240, 0.2) 40%,
    transparent 100%
  );
  animation: mistFlow 20s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes mistFlow {
  0% { transform: translateX(0); }
  100% { transform: translateX(-10%); }
}
```

**4. 光斑效果（可选）**
- 模拟阳光透过树叶的斑驳光影
- 使用 radial-gradient 圆点缓慢移动
- 极低透明度，不干扰内容阅读

### 4.2 首页（HomePage）—— 多功能入口页

> **路由**：`/`（原 `/` 对话页移至 `/chat`）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │                                              │  │
│  │         [全屏水墨山水背景图]                  │  │
│  │                                              │  │
│  │           智慧灵山胜境                        │  │
│  │           ━━━━━━━━                           │  │
│  │        一步一景 · 一景一画                   │  │
│  │                                              │  │
│  │        [开启旅程]  [与数字人对话]             │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │                                              │  │
│  │   灵山胜境，坐落于太湖之滨...                  │  │
│  │   简介文字，两段左右...                        │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │        探索灵山                               │  │
│  │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │  │
│  │   │对话  │ │景点  │ │路线  │ │历史  │ │排行  │  │
│  │   │导览  │ │探索  │ │推荐  │ │穿越  │ │榜   │  │
│  │   │[图标]│ │[图标]│ │[图标]│ │[图标]│ │[图标]│  │
│  │   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │        精选景点                               │  │
│  │   ┌────────┐  ┌────────┐  ┌────────┐        │  │
│  │   │ [图]   │  │ [图]   │  │ [图]   │        │  │
│  │   │ 灵山大佛│  │ 九龙灌浴│  │ 梵宫    │        │  │
│  │   └────────┘  └────────┘  └────────┘        │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │                                              │  │
│  │   [数字人导览员展示区]                         │  │
│  │   ┌──────────┐                              │  │
│  │   │ [Live2D] │   "我是您的灵山导览员..."      │  │
│  │   │  水墨边框  │                              │  │
│  │   └──────────┘                              │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │        [页脚：版权信息 · 联系方式]             │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**Hero 区域（首屏）**：
- 全屏高度（`100vh`），背景使用现有图片 `bg-mountain.png` 或 `image.png`
- 背景图做缓慢放大动画（`scale: 1 → 1.05`，持续 10s，循环），营造"画中游"感
- 标题"智慧灵山胜境"用书法体 `display` 字号，白色 + 强文字阴影确保可读
- 副标题用宋体，字间距加宽
- 两个 CTA 按钮：
  - "开启旅程" — 印章按钮（朱红底），点击进入景点列表
  - "与数字人对话" — 线框按钮（天青边框），点击进入对话页
- 底部增加向下滚动提示（箭头动画）

**简介区域**：
- 米白底 + 上方水墨渐变过渡（与 Hero 自然衔接）
- 最大宽度 `720px` 居中，模拟古籍阅读体验
- 标题"关于灵山"用宋体 `h2`
- 正文两端对齐，首行缩进 `2em`，段落间距 `1.5em`
- 左侧可配一条竖向装饰线（天青色渐变）

**功能入口区**：
- 五个入口卡片横向排列（桌面端），网格布局（移动端）
- 每个卡片：
  - 顶部：圆形图标区（天青/朱红/黛蓝/茶青/赭石，各功能不同色）
  - 中间：功能名称（宋体 `h3`）
  - 底部：一句话描述（`body-sm`）
- 卡片样式：白底 + 细边框 + hover 时抬升 + 图标放大
- 图标使用 Ant Design 图标，但配色统一为功能主色

| 入口 | 图标 | 颜色 | 跳转 |
|------|------|------|------|
| 对话导览 | MessageOutlined | 天青 | `/chat` |
| 景点探索 | EnvironmentOutlined | 朱红 | `/attractions` |
| 路线推荐 | CompassOutlined | 黛蓝 | `/recommend` |
| 时空穿越 | HistoryOutlined | 茶青 | `/history` |
| 排行榜 | TrophyOutlined | 鎏金 | `/leaderboard` |

**精选景点区**：
- 标题"精选景点" + 右侧"查看全部"链接
- 三列画卷卡片，展示 3-6 个热门景点
- 使用 `scroll-card` 组件，图片底部水墨晕染
- 卡片点击跳转景点详情

**数字人导览员展示区**：
- 左右布局：左侧 Live2D 数字人，右侧欢迎语
- Live2D 外框采用"水墨晕染"风格（见下文 4.3 数字人包装规范）
- 欢迎语："我是您的灵山导览员小灵，有什么可以帮您的？"（宋体）
- 下方快捷提问按钮（题签样式）
- 点击区域可跳转 `/chat`

**页脚**：
- 深色背景（`#2A2520`）或宣纸纹理
- 简洁的版权信息和联系方式
- 角落可增加朱红印章装饰

---

### 4.3 对话页（ChatPage）

> **路由**：`/chat`（从首页 `/` 移至此）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │                 │  │ ┌──────────────────────┐ │  │
│  │   数字人区域     │  │ │ [机器人头像] 在线    │ │  │
│  │  （水墨头像框）   │  │ │ RAG + DeepSeek      │ │  │
│  │                 │  │ └──────────────────────┘ │  │
│  │   [Live2D       │  │                        │  │
│  │    角色形象]     │  │ ┌────────────────────┐ │  │
│  │                 │  │ │ 消息列表            │ │  │
│  │                 │  │ │ • 用户消息（朱批）  │ │  │
│  │                 │  │ │ • AI消息（书札）    │ │  │
│  │                 │  │ │ • Markdown渲染      │ │  │
│  │                 │  │ └────────────────────┘ │  │
│  │                 │  │                        │  │
│  │                 │  │ ┌────────────────────┐ │  │
│  │                 │  │ │ 追问建议            │ │  │
│  │                 │  │ └────────────────────┘ │  │
│  │                 │  │                        │  │
│  │                 │  │ ┌──────────────────┐   │  │
│  │                 │  │ │ [搜索框...] [发送]│   │  │
│  │                 │  │ └──────────────────┘   │  │
│  └─────────────────┘  └──────────────────────────┘  │
│                                                     │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│  │题签│ │题签│ │题签│ │题签│  ← 快捷问题           │
│  └────┘ └────┘ └────┘ └────┘                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**数字人区域（Live2D 包装）**：
- 项目已集成 Live2D（pixi.js + pixi-live2d-display），保留现有技术方案
- 外框采用"水墨画框"风格：
  - 外层：不规则圆角边框（`border-radius: 50% 48% 52% 50%`）模拟手绘感
  - 内层：`mask-image` 圆形遮罩 + 边缘 `feTurbulence` 水墨晕染
  - 背景：淡青色圆形光晕 + 宣纸纹理底
- 状态指示器：朱红圆点 + 呼吸脉冲动画
- 说话中：底部显示"讲解中..." + 声波动画条
- 点击数字人可触发随机动作（已有功能，保留）

**消息列表区域**：
- 整体容器两侧增加细线模拟"卷轴边"
- 用户消息：右对齐，朱批样式（浅红底 + 右侧朱红边）
- AI消息：左对齐，书札样式（米白底 + 左侧天青边 + 竖线装饰）
- Markdown内容中的标题用宋体，代码块用等宽字体，引用块用左侧竖线

**快捷问题（题签）**：
- 横向滚动的小标签组
- 每个标签是"题签"样式：米白底 + 细边框 + hover时天青色

**输入框区域**：
- 使用 `input-ink` 样式
- 发送按钮改为小型印章按钮

### 4.4 景点列表页（AttractionList）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  灵山胜境                                          │
│  ━━━━━━                                            │
│  探索景点                                           │
│                                                     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                   │
│  │全│ │佛│ │自│ │文│ │美│ │休│  ← 印章式分类Tab    │
│  │部│ │教│ │然│ │化│ │食│ │闲│                     │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                   │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ [图片]   │ │ [图片]   │ │ [图片]   │            │
│  │ 景点名称  │ │ 景点名称  │ │ 景点名称  │            │
│  │ 简介...  │ │ 简介...  │ │ 简介...  │            │
│  │ [标签]   │ │ [标签]   │ │ [标签]   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ ...      │ │ ...      │ │ ...      │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**页面标题区**：
- "灵山胜境"用书法体 `display` 字号，下方有一条朱红短线装饰
- 副标题"探索景点"用宋体 `h2` 字号，颜色 `--gray-500`

**分类Tab（印章式）**：
- 横向滚动，每个Tab是方形（`border-radius: var(--radius-seal)`）
- 未选中：白底 + 灰色边框 + 灰色文字
- 选中：朱红底（或天青底）+ 白字 + 无边框
- 切换动画：背景色淡入 + 文字颜色变化

**景点卡片**：
- 使用 `scroll-card` 组件
- 三列网格（桌面端），两列（平板），单列（手机）
- 图片比例 `3:2`，底部水墨渐变遮罩
- 标题用 `h3` 宋体，简介用 `body-sm` 无衬线
- 标签使用 `badge-seal` 或 `btn-tag`

**搜索框**：
- 放在标题区下方，使用 `input-ink` 样式
- 左侧图标用毛笔/放大镜融合图标
- placeholder："寻一处胜地..."

### 4.5 景点详情页（AttractionDetail）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │           [全屏景点图片]                         │ │
│ │                                                 │ │
│ │    景点名称                                      │ │
│ │    ━━━━━━                                       │ │
│ │    类别标签 · 开放时间                            │ │
│ │                                                 │ │
│ │         ↓ 水墨渐变遮罩                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  景点介绍                                      │  │
│  │                                              │  │
│  │  正文正文正文正文正文正文正文正文正文正文       │  │
│  │  正文正文正文正文正文正文正文正文正文正文       │  │
│  │                                              │  │
│  │  > 引用典故或诗句                               │  │
│  │                                              │  │
│  │  正文正文正文正文正文正文正文正文正文正文       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                │  │
│  │  │图1 │ │图2 │ │图3 │ │图4 │  ← 册页轮播     │  │
│  │  └────┘ └────┘ └────┘ └────┘                │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  实用信息                                      │  │
│  │  ┌────────────┐  ┌────────────┐              │  │
│  │  │ 开放时间    │  │ 门票价格    │              │  │
│  │  │ 08:00-17:00 │  │ ¥88/人     │              │  │
│  │  └────────────┘  └────────────┘              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**Hero区域**：
- 全宽图片，高度 `50vh`（桌面端）/ `40vh`（移动端）
- 图片底部有强烈的水墨渐变遮罩（白色向上渐变），使文字可读
- 标题用书法体 `h1` 字号，白色 + 文字阴影
- 类别标签使用 `badge-seal--gold`
- 向下滚动时，图片以视差速度 `0.5` 滚动

**内容区**：
- 最大宽度 `720px` 居中，模拟古籍阅读体验
- 标题用宋体 `h2`，正文用无衬线 `body`，行高 `1.8`
- 段落首行缩进 `2em`
- 引用块：左侧 `3px` 朱红竖线 + 浅红背景 + 宋体斜体

**图片册页**：
- 横向滚动展示
- 每张图片有"画框"装饰（细边框 + 内阴影）
- 点击可放大查看（弹窗带"卷轴展开"动画）

**实用信息**：
- 使用 `plaque-card` 或带图标的白底卡片
- 图标用天青色
- 重要数字（如价格）用等宽字体 + 朱红色

### 4.6 推荐路线页（RecommendPage）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  为您推荐                                          │
│  ━━━━━━                                            │
│   personalized route for your journey              │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  路线一：灵山禅意之旅                          │  │
│  │  ═══════════════════════                      │  │
│  │                                              │  │
│  │  ●─────●─────●─────●                         │  │
│  │  起点   景点A  景点B  终点                    │  │
│  │                                              │  │
│  │  [展开详情]                                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  路线二：...                                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**路线卡片**：
- 整体采用"游记手札"风格：米白底 + 细边框 + 四角微小装饰
- 路线标题用书法体 `h2`
- 路线节点用"行旅图"横向展示：
  - 节点间用虚线连接（`border-bottom: 2px dashed var(--gray-300)`）
  - 每个节点是一个小圆点 + 下方标签
  - 当前/推荐节点用朱红色，其他用灰色

**展开详情**：
- 点击后卡片下方展开，采用"卷轴展开"动画（`scaleY` 从 `0` 到 `1`，`transform-origin: top`）
- 详情内每个景点用时间轴纵向排列

### 4.7 时空穿越页（HistoryExplore）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  时空穿越                                          │
│  ━━━━━━                                            │
│  穿越千年，与历史对话                               │
│                                                     │
│  ← ●─────●─────●─────●─────● →                     │
│    唐    宋    元    明    清                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │                                              │  │
│  │  [时代背景大图]                               │  │
│  │                                              │  │
│  │  唐代 · 灵山的开端                            │  │
│  │                                              │  │
│  │  正文介绍...                                  │  │
│  │                                              │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐        │  │
│  │  │ 人物A  │  │ 人物B  │  │ 事件C  │        │  │
│  │  └────────┘  └────────┘  └────────┘        │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**时代选择器**：
- 横向长卷式滚动，每个时代是一个"卷轴节"
- 选中时代：朱红底色 + 白字 + 下方指示三角
- 未选中：透明底 + 灰色文字
- 切换时代时，内容区采用"翻页"动画（当前页淡出 + 新页淡入）

**时代内容区**：
- 背景根据时代变化色调：
  - 唐：浓墨色调（深灰背景 + 金文字）
  - 宋：雅致色调（米白背景 + 墨黑文字）
  - 元：苍茫色调（赭石背景 + 白文字）
  - 明：繁华色调（黛蓝背景 + 金文字）
  - 清：淡雅色调（藕粉背景 + 墨黑文字）

**人物/事件卡片**：
- "画像"风格：圆角矩形 + 仿古边框（上下粗线 + 左右细线）
- 人物头像用圆形 + 水墨边框
- 名称用书法体，年代用宋体小字

### 4.8 排行榜（Leaderboard）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│          灵山金榜                                   │
│          ━━━━━━                                    │
│          本周热门景点排行                            │
│                                                     │
│     🥇        🥈        🥉                         │
│   ┌───┐     ┌───┐     ┌───┐                       │
│   │ 1 │     │ 2 │     │ 3 │                       │
│   │景点A│    │景点B│    │景点C│                      │
│   │状元 │    │榜眼 │    │探花 │                      │
│   └───┘     └───┘     └───┘                       │
│                                                     │
│   ┌────────────────────────────────────────────┐   │
│   │ 4  景点D                    12890 次访问   │   │
│   ├────────────────────────────────────────────┤   │
│   │ 5  景点E                    11234 次访问   │   │
│   ├────────────────────────────────────────────┤   │
│   │ 6  景点F                     9876 次访问   │   │
│   └────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**前三名**：
- 横向居中排列，突出显示
- 第一名：金色边框 + "状元"印章标签
- 第二名：银色边框 + "榜眼"印章标签
- 第三名：铜色边框 + "探花"印章标签
- 排名数字用大号书法体，景点名用宋体

**列表区**：
- 米白底 + 细边框分隔
- 每行hover时背景泛起淡墨晕染（`background: linear-gradient(90deg, transparent, rgba(106,156,137,0.05), transparent)`）
- 排名数字用等宽字体，访问次数用朱红色

**整体氛围**：
- 页面顶部可增加"圣旨"式装饰边框
- 标题"灵山金榜"用书法体 + 金色

### 4.9 探索导览页（TouristDashboard）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ [Navbar]                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │                                              │  │
│  │         [水墨风格Hero大图]                    │  │
│  │                                              │  │
│  │    探索灵山                                    │  │
│  │    一步一景，一景一画                          │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  总游客   │ │  今日游客 │ │  好评率   │ │ ...   │ │
│  │  128,390 │ │  3,420   │ │   98%    │ │       │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  [地图/导览组件]                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 关键设计点

**Hero区**：
- 全宽水墨风格大图（可使用AI生成的水墨灵山图）
- 文字居中叠加，白色 + 阴影
- "探索灵山"用书法体 `display` 字号
- 入场动画：文字从下方淡入，图片从模糊到清晰

**统计卡片**：
- 使用 `plaque-card` 样式（深色底 + 金色数字）
- 或白底 + 天青色图标 + 朱红色数字
- 数字使用计数动画（从0滚动到目标值）

**地图/导览**：
- 地图标记点用"印章"样式（小方形 + 朱红）
- 路线用"毛笔笔触"线（不规则粗细的SVG路径）
- 信息窗口用"题签"样式

### 4.10 管理后台（Admin Pages）

#### 设计方向

后台保持现有 dark 模式，但融入东方元素：

```css
/* Dark 模式下的东方色调 */
[data-theme="dark"] {
  --surface-bg: #0F1419;         /* 墨黑 */
  --surface-card: #1A2332;       /* 黛蓝黑 */
  --surface-elevated: #243044;   /* 深蓝灰 */

  --text-primary: #E8ECF1;
  --text-secondary: #8B95A5;

  --color-primary: #6A9C89;      /* 天青在暗底更突出 */
  --color-accent: #E85D3A;       /* 朱红更亮 */
  --color-gold: #D4B876;         /* 鎏金用于数据 */
}
```

**数据图表**：
- 折线图/柱状图配色改为"青绿山水"色系：
  - 系列1：`#6A9C89`（天青）
  - 系列2：`#8CBFAD`（天青浅）
  - 系列3：`#C84B31`（朱红）
  - 系列4：`#C8A951`（鎏金）
- 网格线用极低透明度的灰色

**数据卡片**：
- 增加"屏风"感：卡片间用竖线分隔，而非间距
- 重要指标用"匾额"样式（深色底 + 金色数字 + 边框装饰）

**数字人配置页**：
- 角色头像选择用"画像册"网格（圆角 + 水墨边框）
- 配置项分组用"卷轴"式展开面板
- 保存按钮用"朱红印章"大按钮

---

## 五、动效与交互规范

### 5.1 动画时间体系

```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-in-out-sine: cubic-bezier(0.37, 0, 0.63, 1);
--ease-ink: cubic-bezier(0.4, 0, 0.2, 1);  /* 水墨流动感 */

--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-ink: 800ms;   /* 水墨晕染 */
--duration-scroll: 600ms; /* 卷轴展开 */
```

### 5.2 电影级水墨入场动画（InkEntryOverlay）

> 适用：全站首次访问时的品牌展示页
> 组件：`components/DigitalHuman/InkEntryOverlay.tsx`

#### 整体设计

**"墨落生山"** — 墨滴落在宣纸上，墨迹逐渐擦除纸层，露出底下的山水画卷。全过程约 6-8 秒，分为六个阶段：

```
宣纸铺展 → 墨滴落下 → 墨迹晕染 → 标题浮现 → 印章盖下 → 点击进入
```

#### 六阶段时间线

| 阶段 | 时长 | 视觉效果 |
|------|------|----------|
| **paper** | 0-0.2s | 全屏宣纸色覆盖 `#F5EFE0`，带噪点纹理和边缘泛黄 |
| **raining** | 0.2-2.5s | 15 颗墨滴随机位置落下，每颗带 `200-1700ms` 随机延迟 |
| **reveal** | 2.5-4.3s | 墨滴晕染擦除宣纸，露出底层山水画（`image.png`），宣纸透明度渐变为 0 |
| **title** | 4.3-5.3s | "智慧灵山胜境"标题淡入上浮，书法体 + 白色文字阴影 |
| **seal** | 5.3-5.9s | 朱红印章"灵"字从 `scale(3)` 弹入至 `scale(1)`，带旋转 `-8deg` |
| **enter** | 5.9s+ | 底部显示"点击进入"提示，飘落花瓣粒子开始，背景图缓慢放大 |

#### 墨滴视觉效果

每颗墨滴由三层构成：
1. **墨核**：深色圆形（`#0d0a08` → `#1a1410`），`scale(0.2) → scale(1.3) → scale(1)`
2. **晕染**：外层半透明圆环，`scale(0.3) → scale(6)`，透明度从 `0.9 → 0`
3. **擦除**：Canvas `destination-out` 模式，实际擦除宣纸层

```css
@keyframes inkDropAppear {
  0%   { transform: scale(0.2); opacity: 0; }
  5%   { transform: scale(1); opacity: 1; }
  20%  { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 0.15; }
}

@keyframes inkSpread {
  0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  15%  { opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
}
```

#### 动态增强特效

**1. 飘落花瓣/叶子**
- 在 `title` 阶段后开始，持续整个 `enter` 阶段
- 数量：30 个粒子，类型为 `petal`（藕粉色椭圆）和 `leaf`（鎏金色柳叶）
- 运动：缓慢飘落 + 正弦波左右摇摆 + 持续旋转
- 超出底部后从顶部重新生成

**2. 远山雾气流动**
- 在 `reveal` 阶段后开始
- 使用独立 Canvas 层，绘制多层横向流动的半透明白雾
- 雾气速度：每层不同（15s-25s 完成一个周期）
- 方向：从右向左缓慢流动

**3. 背景图视差**
- `reveal` 阶段后，背景图从 `scale(1)` 缓慢放大至 `scale(1.05)`
- 过渡时间：3000ms，营造镜头推进感

**4. 点击进入交互**
- 印章阶段后，底部中央显示"点击进入"文字 + 下箭头动画
- 整个屏幕变为可点击，点击后触发 `exit` 阶段
- `exit`：使用 `clip-path: inset(0 0 100% 0)` 向上收起，持续 1000ms

#### 技术实现要点

- **Session 控制**：使用 `sessionStorage.setItem('inkEntryShown', '1')` 避免重复播放
- **Canvas 擦除**：`globalCompositeOperation = 'destination-out'` + `radialGradient`
- **响应式**：窗口 resize 时重新初始化 Canvas 尺寸
- **性能**：墨滴动画使用 `requestAnimationFrame`，雾气使用独立 Canvas 避免重绘冲突

#### 页面级：水墨晕染（常规页面切换）

```css
@keyframes inkReveal {
  0% { opacity: 0; filter: blur(8px); }
  30% { opacity: 0.5; filter: blur(4px); }
  100% { opacity: 1; filter: blur(0); }
}

.page-enter {
  animation: inkReveal 800ms var(--ease-ink) both;
}
```

#### 组件级：卷轴展开

```css
@keyframes scrollUnfold {
  0% { transform: scaleY(0); transform-origin: top; opacity: 0; }
  60% { transform: scaleY(1.02); }
  100% { transform: scaleY(1); opacity: 1; }
}

.component-unfold {
  animation: scrollUnfold 600ms var(--ease-ink) both;
}
```

#### 列表级：落墨浮现

```css
@keyframes inkDrop {
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
    filter: blur(2px);
  }
  50% {
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.list-item {
  animation: inkDrop 400ms var(--ease-out-quart) both;
}

/* staggered delay */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 60ms; }
.list-item:nth-child(3) { animation-delay: 120ms; }
.list-item:nth-child(4) { animation-delay: 180ms; }
.list-item:nth-child(5) { animation-delay: 240ms; }
/* ...以此类推 */
```

### 5.3 微交互

#### 按钮hover：墨迹扩散

```css
.btn-ink:hover {
  box-shadow: 0 0 0 4px rgba(106, 156, 137, 0.15),
              0 0 0 8px rgba(106, 156, 137, 0.08);
}
```

#### 卡片hover：宣纸微抬

```css
.card-hover {
  transition: transform 300ms var(--ease-out-quart),
              box-shadow 300ms var(--ease-out-quart);
}

.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

#### Tab切换：笔触拖曳

```css
.tab-indicator {
  height: 2px;
  background: var(--color-accent);
  border-radius: 1px;
  transition: width 250ms var(--ease-out-expo),
              transform 250ms var(--ease-out-expo);
  transform-origin: left center;
}

/* 切换时宽度先缩短再伸长，模拟笔触 */
```

### 5.4 加载状态

#### 全局加载：水墨涟漪

```css
@keyframes inkRipple {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.loader-ink {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: inkRipple 1.5s var(--ease-in-out-sine) infinite;
}
```

#### 骨架屏：淡墨轮廓

```css
.skeleton-ink {
  background: linear-gradient(
    90deg,
    var(--gray-100) 25%,
    var(--gray-200) 50%,
    var(--gray-100) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  border-radius: var(--radius-md);
}
```

### 5.5 滚动动效

#### 视差背景

```css
.parallax-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 120vh;
  background-image: url('/image/mountain-ink.png');
  background-size: cover;
  background-position: center;
  will-change: transform;
  z-index: var(--z-background);
}

/* JS中监听scroll，设置 transform: translateY(scrollY * 0.3) */
```

#### 元素浮现

使用 Intersection Observer + CSS 类切换：

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 500ms var(--ease-out-quart),
              transform 500ms var(--ease-out-quart);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 5.6 数字人/AI 交互动效

#### 说话状态

```css
@keyframes brushWrite {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ai-typing::after {
  content: '|';
  animation: brushWrite 1s step-end infinite;
  color: var(--color-primary);
}
```

#### 情绪反馈

- 开心：头像框周围泛起淡金色光晕
- 思考：头像框周围泛起淡青色涟漪
- 惊讶：头像轻微放大 + 朱红脉冲

---

## 六、图像与插画规范

### 6.1 背景图策略

| 用途 | 当前 | 建议 |
|------|------|------|
| 全局底图 | `AigcAssets(3).png` 高透明度 | 降低至 `opacity: 0.15-0.2`，或替换为更淡的水墨山景 |
| Hero大图 | 无统一规范 | 各页面使用AI生成的对应主题水墨图（景点页用该景点水墨风格图） |
| 卡片图片 | 实景照片 | 保持实景，但统一增加底部水墨渐变遮罩 |
| 空状态 | 简单图标 | 水墨风格插画（如"空白卷轴"、"孤舟"） |

### 6.2 图标系统

#### 方案A：自定义水墨图标（推荐长期）

使用 SVG 绘制简约水墨风格图标：
- 线条粗细不均（模拟毛笔笔触）
- 拐角处略圆
- 部分图标带"墨点"装饰

#### 方案B：双色Ant Design图标（短期可行）

继续使用 Ant Design 图标，但统一配色：
- 默认：`--gray-500`
- hover：`--color-primary`
- 激活：`--color-accent`
- 背景图标：`--color-primary-bg`

#### 图标替换映射

| 功能 | 当前图标 | 建议风格 |
|------|----------|----------|
| 对话 | MessageOutlined | 卷轴/书信 |
| 探索 | CompassOutlined | 罗盘/指南针（古式）|
| 景点 | EnvironmentOutlined | 山水/定位（水墨）|
| 历史 | HistoryOutlined | 沙漏/日晷 |
| 排行榜 | TrophyOutlined | 金榜/印章 |

### 6.3 装饰元素

```css
/* 角落装饰 — 用于卡片、弹窗 */
.corner-deco {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-200);
}

.corner-deco--tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.corner-deco--tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
.corner-deco--bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
.corner-deco--br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
```

---

## 七、响应式适配

### 7.1 断点定义

```css
/* 移动端优先 */
--breakpoint-sm: 375px;   /* 大手机 */
--breakpoint-md: 768px;   /* 平板 */
--breakpoint-lg: 1024px;  /* 小桌面 */
--breakpoint-xl: 1440px;  /* 大桌面 */
```

### 7.2 移动端适配要点

#### 导航
- 底部固定Tab栏（取代顶部二级导航）
- Tab栏背景：宣纸白毛玻璃
- 图标 + 文字，当前项朱红色

```css
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(247, 245, 240, 0.85);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--gray-200);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: var(--z-sticky);
}
```

#### 字体
- 书法体标题缩小 `20-30%`
- 正文保持 `14px` 最小可读尺寸
- 行高增加至 `1.7-1.8`

#### 卡片
- 单列布局
- 图片比例改为 `16:9` 横幅
- 内边距适当缩小

#### 触控
- 所有可点击元素最小 `44x44px`
- 点击反馈：墨滴扩散（`radial-gradient` 从点击位置扩散）

### 7.3 平板适配

- 景点列表：两列网格
- 对话页：数字人区域可折叠/侧滑
- 保持左右适当留白

---

## 八、技术实现指南

### 8.1 文件结构建议

```
frontend/src/
├── styles/
│   ├── tokens.css           # 设计令牌（升级现有）
│   ├── animations.css       # 动画关键帧集合
│   ├── components.css       # 组件样式类
│   └── utilities.css        # 工具类扩展
├── components/
│   ├── ui/                  # 基础UI组件
│   │   ├── ScrollCard.tsx   # 画卷卡片
│   │   ├── PlaqueCard.tsx   # 匾额卡片
│   │   ├── LetterCard.tsx   # 书札卡片
│   │   ├── SealButton.tsx   # 印章按钮
│   │   ├── InkInput.tsx     # 水墨输入框
│   │   ├── SealBadge.tsx    # 印章徽章
│   │   └── InkDivider.tsx   # 水墨分割线
│   └── ...
└── ...
```

### 8.2 关键CSS技巧

#### 水墨边缘效果

```css
/* 方法1: CSS mask-image（推荐，性能较好） */
.ink-edge {
  mask-image: linear-gradient(
    to bottom,
    black 60%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    black 60%,
    transparent 100%
  );
}

/* 方法2: SVG feTurbulence（更自然，但性能开销大） */
.ink-edge-svg {
  filter: url('#ink-filter');
}

/* SVG filter定义 */
<svg style="position: absolute; width: 0; height: 0;">
  <filter id="ink-filter">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" />
  </filter>
</svg>
```

#### 宣纸纹理

```css
/* 内联base64噪点图（已在tokens.css中提供） */
.paper-texture {
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
}
```

#### 墨迹扩散点击效果

```tsx
// React实现示例
function InkRippleButton({ children, ...props }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  };

  return (
    <button onClick={handleClick} style={{ position: 'relative', overflow: 'hidden' }} {...props}>
      {children}
      {ripples.map(r => (
        <span key={r.id} className="ink-ripple" style={{ left: r.x, top: r.y }} />
      ))}
    </button>
  );
}
```

```css
.ink-ripple {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: rippleExpand 600ms ease-out forwards;
  pointer-events: none;
}

@keyframes rippleExpand {
  to {
    transform: translate(-50%, -50%) scale(50);
    opacity: 0;
  }
}
```

### 8.3 性能优化

1. **字体加载**
   - 使用 `font-display: swap` 避免FOIT
   - 书法体仅用于大标题，减少使用场景
   - 考虑子集化加载（仅加载常用汉字）

2. **动画性能**
   - 仅对 `transform` 和 `opacity` 做动画
   - 频繁动画元素添加 `will-change`，动画结束后移除
   - 使用 `contain: layout style paint` 隔离动画区域

3. **背景优化**
   - 全局背景图压缩至 `200KB` 以内
   - 使用 `background-attachment: fixed` 时，注意移动端性能
   - 水墨纹理使用内联SVG（极小体积）

4. **图片处理**
   - 景点图片使用 `loading="lazy"`
   - 提供 `srcset` 响应式图片
   - 图片底部渐变遮罩用CSS实现，无需额外图片

### 8.4 无障碍

```css
/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .parallax-bg {
    transform: none !important;
  }
}

/* 焦点样式 */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* 色彩对比度检查 */
/* 主文字 on 背景: #1A1614 on #F7F5F0 = 14.2:1 ✓ */
/* 次要文字 on 背景: #5C554C on #F7F5F0 = 5.8:1 ✓ */
/* 白字 on 朱红按钮: #FFFFFF on #C84B31 = 4.6:1 ✓ */
```

---

## 九、实施路线图

### Phase 1：基础层（1-2天）

| 任务 | 文件 | 说明 |
|------|------|------|
| 升级设计令牌 | `styles/tokens.css` | 扩展色彩、字体、阴影变量 |
| 全局背景 | `App.tsx` | 宣纸纹理 + 淡化山景底图 |
| 导航栏重设计 | `App.tsx` | 印章Logo + 笔触下划线 |
| 基础组件 | 新建 `components/ui/` | ScrollCard, SealButton, InkInput |

### Phase 2：页面层（3-5天）

| 优先级 | 页面 | 路由 | 核心改造点 |
|--------|------|------|-----------|
| **P0** | **HomePage（新建）** | `/` | 多功能入口页：Hero全屏山水 + 功能入口网格 + 精选景点 + Live2D导览员展示 |
| P0 | ChatPage | `/chat` | 书札消息 + Live2D水墨边框 + 题签快捷问题（从 `/` 移至此） |
| P0 | AttractionList | `/attractions` | 印章Tab + 画卷卡片 + 画廊布局 |
| P1 | AttractionDetail | `/attractions/:id` | Hero水墨遮罩 + 古籍排版 + 册页轮播 |
| P1 | HistoryExplore | `/history` | 历史长卷时间轴 + 时代色调 |
| P2 | RecommendPage | `/recommend` | 游记手札路线 + 行旅图节点 |
| P2 | Leaderboard | `/leaderboard` | 金榜设计 + 状元榜眼探花 |

### Phase 3：动效层（2-3天）

| 任务 | 范围 | 说明 |
|------|------|------|
| 电影级入场 | `InkEntryOverlay` | 墨滴擦除宣纸 + 飘落粒子 + 雾气流动 + 点击进入 |
| 全局背景特效 | `App.tsx` | 视差滚动 + 飘落花瓣/叶子 + 远山雾气流动 |
| 微交互 | 全局 | hover墨迹扩散 + 点击墨滴涟漪 |
| 滚动动效 | 长页面 | 视差背景 + 元素浮现 |
| 加载状态 | 全局 | 水墨涟漪 + 淡墨骨架屏 |

### Phase 4： polish（持续）

- 图标系统替换（自定义水墨SVG）
- 空状态插画
- 错误页面（404水墨画）
- Live2D 模型更换为东方风格角色
- 打印样式（古籍排版优化）

---

## 十、参考与灵感

### 视觉参考
- **故宫文创官网**：印章元素、古籍排版
- **苏州博物馆官网**：留白、宋式美学
- **日本武藏野美术大学**：现代东方排版
- **游戏《江南百景图》**：水墨UI、传统色运用

### 技术参考
- CSS `mask-image` 文档（MDN）
- `feTurbulence` SVG滤镜效果
- 谷歌字体：Noto Serif SC, ZCOOL XiaoWei
- 霞鹜文楷开源字体项目

### 设计工具
- 中国传统色：[中国色](http://zhongguose.com/)
- 配色灵感：日本传统色、Pantone年度色
- 图标设计：Figma + 手绘水墨笔触

---

> **结语**
>
> 本规范旨在为"智慧灵山胜境"注入东方美学的灵魂，但技术的目的是服务于体验。在实施过程中，始终以"用户能否更愉悦地完成旅程"为检验标准，避免为了装饰而牺牲可用性。留白、层次、动线——这三者是东方园林的精髓，也是本设计的核心。
