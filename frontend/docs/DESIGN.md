# 智慧灵山胜境 · 前端设计系统文档

## 一、设计定位

| 维度 | 定义 |
|------|------|
| 产品类型 | 文旅 AI 服务工具（C端游客 + B端管理） |
| 设计风格 | 新中式现代 — 传统文化元素 + 现代极简布局 |
| 核心体验 | 沉浸式数字人对话 > 功能导航 > 信息浏览 |
| 目标用户 | 游客：全年龄段，含老年/儿童；管理者：景区运营人员 |
| 设备场景 | 游客端：手机竖屏为主；管理端：桌面宽屏 |

---

## 二、设计语言系统

### 色彩体系

| 角色 | 色值 | 用途 |
|------|------|------|
| 品牌主色 | `#1A5FB4` 深湖蓝 | 主按钮、链接、强调色 |
| 辅助金 | `#C8882E` 暖金 | 佛教文化元素、评分、高亮 |
| 成功色 | `#2D8B57` 翡翠绿 | 成功状态、正面趋势 |
| 警告色 | `#E8A838` 琥珀黄 | 警告、待处理 |
| 错误色 | `#DC4444` 朱砂红 | 错误、删除、负面趋势 |

**中性色阶**：`tokens.css` 中定义了 `--gray-50` 到 `--gray-900` 共 10 级灰度。

**暗色主题**（仅管理端 Dashboard）：通过 `[data-theme="dark"]` 选择器覆盖，背景 `#0F1419`，卡片 `#1A2332`。

### 字体

| 场景 | 字体 |
|------|------|
| 正文 | 系统字体栈（PingFang SC / Microsoft YaHei） |
| 数据数字 | DM Mono（等宽，防跳动） |

### 圆角

| 元素 | 值 | 变量 |
|------|-----|------|
| 卡片 | 14px | `--radius-lg` |
| 按钮 | 20px (pill) | `--radius-pill` |
| 输入框 | 10px | `--radius-md` |
| 小元素 | 6px | `--radius-sm` |

### 阴影

| 层级 | 值 | 用途 |
|------|-----|------|
| sm | `0 1px 3px rgba(0,0,0,0.04)` | 卡片默认 |
| md | `0 4px 12px rgba(0,0,0,0.08)` | 卡片悬浮 |
| lg | `0 12px 32px rgba(0,0,0,0.12)` | 弹窗/浮层 |
| glow | `0 0 0 3px rgba(26,95,180,0.15)` | 输入框聚焦 |

---

## 三、响应式设计

### 断点

| 名称 | 宽度 | 设备 |
|------|------|------|
| sm | < 768px | 手机 |
| md | 768px - 1023px | 平板 |
| lg | ≥ 1024px | 桌面 |

### 布局策略

- **游客端**：移动端底部 Tab Bar 导航（3 项），桌面端顶部水平导航
- **ChatPage**：桌面端左右分栏（左侧数字人 320px + 右侧聊天区），移动端纵向堆叠（数字人在上，聊天在下）
- **管理端**：横向 Tab 导航（可滚动），移动端 padding 缩小
- **Dashboard**：Grid 自适应（移动端 2 列，桌面端 4 列）

### 容器

```css
.container {
  max-width: 1200px;
  padding: 0 24px;  /* 移动端 16px */
}
```

---

## 四、动画规范

| 场景 | 动效 | 时长 | 缓动 |
|------|------|------|------|
| 消息气泡出现 | fadeInUp（translateY 12px + opacity） | 250ms | ease-out |
| 卡片悬浮 | translateY(-2px) + 阴影加深 | 200ms | ease-out |
| 数字人呼吸 | float（translateY -6px） | 3s 循环 | ease-in-out |
| 录音按钮 | pulse-ring（box-shadow 扩散） | 1.5s 循环 | ease-out |
| 骨架屏 | shimmer（渐变位移） | 1.5s 循环 | linear |
| 页面切换 | slideInRight | 300ms | ease-out |

**无障碍**：所有动画在 `prefers-reduced-motion: reduce` 下禁用。

---

## 五、Z-Index 层级

| 层级 | 值 | 用途 |
|------|-----|------|
| base | 0 | 普通内容 |
| dropdown | 100 | 下拉菜单 |
| sticky | 200 | 固定导航栏 |
| modal | 500 | 弹窗 |
| toast | 1000 | 提示消息 |

---

## 六、工具类 (CSS Utility Classes)

### 布局

| 类名 | 作用 |
|------|------|
| `.flex-center` | 居中 flex |
| `.flex-between` | 两端对齐 flex |
| `.flex-col` | 纵向 flex |
| `.container` | 居中容器 max-width 1200px |

### 视觉

| 类名 | 作用 |
|------|------|
| `.glass-surface` | 毛玻璃效果 |
| `.card-hover` | 悬浮阴影 + 上移 |
| `.section-card` | 通用卡片样式（白底 + 圆角 + 阴影） |

### 动画

| 类名 | 作用 |
|------|------|
| `.animate-fade-in-up` | 从下方淡入 |
| `.animate-fade-in` | 淡入 |
| `.animate-float` | 悬浮呼吸 |
| `.animate-shimmer` | 骨架屏闪烁 |
| `.animate-pulse-ring` | 脉冲光环（录音） |
| `.animate-spin` | 旋转 |
| `.stagger-1` ~ `.stagger-6` | 列表动画延迟 |

### 响应式

| 类名 | 作用 |
|------|------|
| `.hide-mobile` | 桌面端显示，移动端隐藏 |
| `.hide-desktop` | 移动端显示，桌面端隐藏 |
| `.scroll-tags` | 横向滚动标签容器 |
| `.grid-responsive` | 自适应网格（1/2/4列） |

### 组件模式

| 类名 | 作用 |
|------|------|
| `.btn-pill` | 胶囊按钮（可配合 `.active`） |
| `.badge` / `.badge-success` / `.badge-warning` / `.badge-error` | 状态标签 |
| `.input-base` | 输入框基础样式 |
| `.font-mono` | 等宽数字字体 |

---

## 七、文件结构

```
frontend/src/
├── styles/
│   └── tokens.css          # 设计系统变量 + 工具类 + 动画
├── index.css               # 仅 @import tokens.css
├── App.tsx                 # 路由 + 响应式导航
├── pages/
│   ├── tourist/
│   │   ├── ChatPage.tsx    # 数字人对话页（主视觉）
│   │   ├── RecommendPage.tsx  # 路线推荐
│   │   └── QRScan.tsx      # 扫码定位
│   └── admin/
│       ├── DashboardPage.tsx  # 暗色数据大屏
│       ├── KnowledgePage.tsx  # 知识库管理
│       ├── AvatarPage.tsx     # 数字人配置
│       └── ReportPage.tsx     # 感受度报告
├── components/
│   ├── DigitalHuman/
│   │   ├── ChatBubble.tsx  # 消息气泡（带入场动画）
│   │   ├── VoiceInput.tsx  # 语音输入（脉冲动画）
│   │   └── Live2DStage.tsx # Live2D 渲染
│   └── admin/
│       ├── MetricsCard.tsx  # 指标卡片（计数动画）
│       ├── HotQuestions.tsx # 热门问答
│       ├── RealtimeMonitor.tsx # 实时监控
│       ├── SentimentChart.tsx  # 情感趋势
│       └── WordCloud.tsx    # 关注点词云
└── docs/
    └── DESIGN.md           # 本文档
```

---

## 八、暗色主题说明

暗色主题仅用于管理端 Dashboard 数据大屏，通过以下机制实现：

1. `DashboardPage` 组件设置 `data-theme="dark"` 属性
2. `App.tsx` 在路由切换时自动设置/清除 `data-theme`
3. `tokens.css` 中 `[data-theme="dark"]` 选择器覆盖所有语义变量
4. 子组件通过 CSS 变量自动适配，无需额外逻辑

---

## 九、无障碍设计

- 所有交互元素 ≥ 44px 触摸区域
- 文本对比度 ≥ 4.5:1（WCAG AA）
- 语音输入作为文字输入的替代方案（适老化）
- `prefers-reduced-motion` 关闭所有动画
- 数字人讲解内容同步显示文字（听障用户）
- 色彩不作为唯一信息载体（搭配图标/文字）
- `:focus-visible` 焦点环始终可见
