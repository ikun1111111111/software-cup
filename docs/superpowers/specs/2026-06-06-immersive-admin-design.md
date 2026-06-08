# 智慧旅游管理后台 — 沉浸式前端重构设计文档

## 1. 项目背景与目标

### 1.1 背景
当前管理后台（M3 知识库、M4 数字人配置、M7 感受度报告、M8 数据大屏）已完成 API 对接，但 UI 仍为朴素的默认样式，缺乏项目主题感和设计品质。

### 1.2 目标
- **贴合主题**：设计语言呼应"智慧灵山胜境"的文旅气质
- **简约有设计感**：拒绝 AI slop（居中渐变紫、圆角大统一、system font）
- **略微炫技**：用克制的动效提升工作人员的操作愉悦感
- **体验优先**：底部 Dock 导航 + 全出血内容区，最大化信息展示空间

## 2. 设计方向：沉浸式意境

### 2.1 核心理念
将"灵山胜境"的四季晨昏变化融入后台界面，让工作人员每次打开系统都能感受到景区的氛围。背景不是装饰，而是**随时间呼吸的环境**。

### 2.2 氛围关键词
宁静、温暖、有温度、有故事感、身临其境

## 3. 色彩系统：四时主题

后台背景根据系统时间自动切换四种主题色板：

| 时段 | 主题名 | 背景渐变 | 文字色 | 卡片背景 | 点缀色 |
|------|--------|---------|--------|---------|--------|
| 06:00-10:00 | 🌫️ 晨雾 Dawn | `#e8e4df` → `#d4cbb8` | `#3d352e` | `rgba(255,255,255,0.72)` | `#c9a96e` |
| 10:00-16:00 | ☀️ 白昼 Day | `#e3f0f7` → `#f7fbfd` | `#1a1a1a` | `#ffffff` | `#4a90d9` |
| 16:00-19:00 | 🌇 日暮 Dusk | `#f4c7a8` → `#e8b4d0` | `#3e2b36` | `rgba(255,250,245,0.78)` | `#d4896e` |
| 19:00-06:00 | 🌙 月夜 Night | `#1a2332` → `#0d1117` | `#e6edf3` | `rgba(30,40,55,0.65)` | `#6ba8f5` |

### 3.1 默认主题
首次加载默认使用 **晨雾 Dawn**（6:00-10:00 色板），营造清晨开始工作的仪式感。

### 3.2 主题切换动效
背景渐变切换时，使用 `transition: background 2s ease-in-out`，避免突兀跳变。

### 3.3 CSS 变量规范
```css
:root[data-theme="dawn"] {
  --bg-gradient-start: #e8e4df;
  --bg-gradient-end: #d4cbb8;
  --text-primary: #3d352e;
  --text-secondary: #5c534a;
  --surface: rgba(255,255,255,0.72);
  --surface-border: rgba(255,255,255,0.4);
  --accent: #c9a96e;
  --accent-hover: #b8945a;
  --shadow: 0 4px 24px rgba(61,53,46,0.08);
}
```

## 4. 导航设计：底部 Dock 浮动栏

### 4.1 布局
- **位置**：底部居中，距浏览器底边 `24px`
- **尺寸**：高度 `56px`，内边距 `8px 20px`
- **形状**：胶囊形圆角 `28px`

### 4.2 视觉样式
```css
dock-container {
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
```

### 4.3 交互规范
- **Hover**：图标弹性放大 `scale(1.15)`，使用 spring physics（`cubic-bezier(0.34, 1.56, 0.64, 1)`）
- **选中态**：
  - 图标颜色变为当前主题 `accent` 色
  - 底部出现 `2px` 发光指示条（`box-shadow: 0 0 8px var(--accent)`）
- **Tooltip**：hover 时上方浮出模块名称（纯 CSS，`opacity + translateY` 过渡）

### 4.4 模块图标（4 个）
| 模块 | 图标建议 | 路由 |
|------|---------|------|
| 数据大屏 | DashboardOutlined | `/admin/dashboard` |
| 知识库 | BookOutlined | `/admin/knowledge` |
| 数字人 | CustomerServiceOutlined | `/admin/avatar` |
| 感受度报告 | FileTextOutlined | `/admin/report` |

## 5. 字体系统

| 用途 | 字体 | 字重 | 说明 |
|------|------|------|------|
| 页面大标题 | Noto Serif SC | 600 | 文化厚重感，区别于千篇一律的黑体 |
| 卡片标题 / 标签 | Noto Sans SC | 500 | 清晰现代 |
| 正文 / 描述 | Noto Sans SC | 400 | 屏显优化，长文易读 |
| 数据 / KPI 数字 | DIN Alternate | 700 | 等宽感，数据专业感 |
| 代码 / 统计 | Roboto Mono | 400 | 等宽字体，用于日志和代码片段 |

### 5.1 字体加载
使用 Google Fonts CDN 按需加载：
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&family=Noto+Sans+SC:wght@400;500&family=Roboto+Mono&display=swap" rel="stylesheet">
```

## 6. 动效规范

### 6.1 页面切换
- **效果**：内容区 cross-fade 淡入淡出
- **时长**：300ms
- **缓动**：`ease-in-out`
- **实现**：React 路由切换时给内容区加 `fade` CSS class

### 6.2 卡片入场
- **效果**：从下方 20px 处上滑 + 淡入
- **时长**：400ms
- **延迟**：stagger 每个卡片延迟 60ms（第1张 0ms，第2张 60ms...）
- **缓动**：`cubic-bezier(0.25, 0.46, 0.45, 0.94)`

### 6.3 数据图表
- **ECharts 入场**：`animationDuration: 800`, `animationEasing: 'cubicOut'`
- **数字滚动**：KPI 大数字从 0 滚动到目标值，时长 1.2s

### 6.4 Dock 交互
- **Hover 放大**：`transform: scale(1.15)`, `transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`
- **点击反馈**：`scale(0.95)` 后回弹

### 6.5 主题切换
- **背景渐变过渡**：`transition: background 2s ease-in-out`
- **文字/边框过渡**：`transition: color 1.5s ease, border-color 1.5s ease`

## 7. 各页面布局规范

### 7.1 数据大屏 DashboardPage
- **布局**：三列 masonry 卡片流（CSS Grid `repeat(3, 1fr)`）
- **卡片类型**：
  - **KPI 卡片**：大数字 + 趋势指示器（上升/下降箭头和百分比）
  - **图表卡片**：ECharts 折线图/柱状图，占 2 列宽
  - **列表卡片**：热门问答 Top10，带排名序号
- **实时数据区**：顶部横向滚动条，显示当前会话数和响应延迟

### 7.2 知识库 KnowledgePage
- **布局**：左右分栏（左侧 280px 文档树 + 右侧内容区）
- **文档树**：可折叠文件夹图标 + 文档标题，选中高亮
- **内容区**：
  - 顶部：搜索栏 + 上传按钮
  - 中部：文件卡片网格（每卡片显示文件名、状态标签、上传时间）
  - 底部：分页器
- **FAQ 编辑器**：抽屉（Drawer）从右侧滑出，不离开当前页面

### 7.3 数字人配置 AvatarPage
- **布局**：左侧 60% 预览区 + 右侧 40% 配置面板
- **预览区**：
  - Live2D 模型居中渲染
  - 底部浮动播放/暂停语音按钮
- **配置面板**：
  - 分段折叠面板（Appearance / Voice / Welcome Message）
  - 每个段落内表单控件使用卡片式分组

### 7.4 感受度报告 ReportPage
- **布局**：单栏全宽，自上而下信息流
- **顶部**：日期选择器 + "生成报告"按钮
- **情感趋势图**：全宽 ECharts 折线图（positive / neutral / negative 三线）
- **词云**：居中展示，点击词可筛选
- **报告卡片**：
  - 默认收起，点击展开查看完整 Markdown 渲染内容
  - 右上角导出按钮（Word 格式）
- **盲区发现 + 服务建议**：左右两列卡片并排

## 8. 组件清单

### 8.1 新增/重构组件
| 组件名 | 说明 | 位置 |
|--------|------|------|
| `ThemeProvider` | 四时主题上下文 + 自动切换逻辑 | `components/admin/ThemeProvider.tsx` |
| `DockNav` | 底部 Dock 导航栏 | `components/admin/DockNav.tsx` |
| `GlassCard` | 毛玻璃卡片容器 | `components/admin/GlassCard.tsx` |
| `KpiCard` | KPI 大数字卡片 | `components/admin/KpiCard.tsx` |
| `AnimatedNumber` | 数字滚动动画 | `components/admin/AnimatedNumber.tsx` |
| `PageTransition` | 页面切换淡入淡出包装器 | `components/admin/PageTransition.tsx` |

### 8.2 保留并升级现有组件
| 组件名 | 升级内容 |
|--------|---------|
| `SentimentChart` | 适配主题色变量，增加入场动画 |
| `WordCloud` | 适配主题色变量 |
| `RealtimeMonitor` | 使用毛玻璃卡片包装 |
| `DocumentUpload` | 使用新按钮样式和反馈动效 |
| `MarkdownRenderer` | 适配深色/浅色主题的文字色 |

## 9. 技术实现要点

### 9.1 主题系统
- 使用 React Context + `data-theme` attribute 驱动 CSS 变量
- 定时器每小时检查一次时间，判断是否需要切换主题
- 首次加载根据当前时间设置初始主题

### 9.2 Dock 导航
- 使用 `position: fixed; bottom: 24px;` 脱离文档流
- 内容区底部预留 `80px` padding 防止内容被 Dock 遮挡
- 移动端适配：Dock 变为底部全宽 tab 栏

### 9.3 性能
- `backdrop-filter` 仅用于 Dock 和少量卡片，避免大面积使用导致 GPU 压力
- 使用 `will-change: transform` 在 Dock 图标上优化动画性能
- ECharts 懒加载，非视口内图表不渲染

### 9.4 兼容性
- CSS 变量 fallback：在 `:root` 中定义默认 Dawn 色值
- `backdrop-filter` 不支持时使用半透明纯色背景 fallback

## 10. 验收标准

- [ ] 页面加载时背景为晨雾色板，无闪烁
- [ ] Dock 导航固定在底部，hover 有弹性放大效果
- [ ] 页面切换时有 300ms 淡入淡出动效
- [ ] 卡片入场有 stagger 上滑动画
- [ ] KPI 数字从 0 滚动到实际值
- [ ] 各页面布局符合本规范描述
- [ ] 移动端 Dock 变为全宽 tab 栏，布局自适应
- [ ] 主题切换时背景渐变平滑过渡（肉眼可见的 2s 动画）

## 11. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| `backdrop-filter` 性能差 | 低端设备卡顿 | 检测性能，低性能设备回退到半透明纯色 |
| 背景渐变与图表配色冲突 | 数据可读性下降 | 图表使用带白底/黑底的卡片容器隔离 |
| 多主题维护成本高 | 新增功能需适配4套色板 | CSS 变量集中管理，禁止硬编码颜色值 |

---

*设计确认日期：2026-06-06*
*设计方向：C-沉浸式意境 + B-底部Dock + A-晨雾默认*
