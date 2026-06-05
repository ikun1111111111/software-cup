# 智慧灵山胜境 · UI/UX 设计规范文档

> 面向中国大学生计算机设计大赛的数字人导览系统视觉与交互设计指南

---

## 一、设计定位

### 1.1 产品类型

- **类型**: 文化旅游 + AI 数字人导览
- **目标用户**: C端游客（20-50岁），景区管理后台（运营人员）
- **核心场景**: 景区现场导览、文化知识问答、语音交互、拍照识景
- **设计关键词**: 新中式、沉浸感、文化辨识度、科技温度

### 1.2 设计风格定义

**风格**: 新中式现代（Neo-Chinese Modern）

将中国传统美学元素（水墨、宣纸、印章、工笔）与现代 UI 设计语言融合，
避免"贴图式国风"，追求**意境而非装饰**。

| 维度 | 定义 |
|------|------|
| 情绪 | 温润、宁静、有文化厚度 |
| 节奏 | 舒缓而不拖沓，动效有呼吸感 |
| 密度 | 中等密度，留白充裕 |
| 对比度 | 柔和对比，避免刺眼高饱和 |

---

## 二、设计系统（Design Tokens）

### 2.1 色彩体系

#### 主色

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-primary` | `#1A5FB4` | 主操作、链接、品牌色 |
| `--color-primary-light` | `#3584E4` | Hover、渐变终点 |
| `--color-primary-bg` | `#E8F0FE` | 浅色背景、选中态 |

#### 文化强调色

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-accent` | `#C8882E` | 金色点缀、重要提示 |
| `--color-vermilion` | `#C84B31` | **朱砂红** — 主 CTA 按钮、印章装饰 |
| `--color-ink` | `#2A2520` | **墨色** — 标题、强调文字 |
| `--color-celadon` | `#6BA292` | **青瓷绿** — 成功态、环保/自然标签 |
| `--color-paper` | `#F8F6F2` | **宣纸白** — 页面背景 |

#### 语义色

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-success` | `#2D8B57` | 操作成功 |
| `--color-warning` | `#E8A838` | 警告提示 |
| `--color-error` | `#DC4444` | 错误状态 |

#### 配色使用规则

- **主 CTA 按钮**: 使用朱砂红渐变 `linear-gradient(135deg, #C84B31, #E85D3A)`，而非蓝色
- **数字人底座光晕**: 使用主色蓝色半透明 `rgba(26, 95, 180, 0.15)`
- **文化类内容区域**: 使用宣纸白背景 + 墨色文字
- **科技类内容区域**: 使用主色蓝渐变

### 2.2 字体系统

```css
/* 标题字体 — 有文化感 */
--font-heading: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', serif;

/* 正文字体 — 清晰易读 */
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
  'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

/* 等宽字体 — 数据展示 */
--font-mono: 'DM Mono', 'SF Mono', 'Fira Code', monospace;
```

#### 字号阶梯

| Token | 大小 | 用途 |
|-------|------|------|
| `--font-size-xs` | 12px | 辅助标签、时间戳 |
| `--font-size-sm` | 13px | 次要文字、说明 |
| `--font-size-base` | 14px | 正文（桌面端） |
| `--font-size-md` | 15px | 正文（移动端） |
| `--font-size-lg` | 18px | 小标题 |
| `--font-size-xl` | 22px | 区域标题 |
| `--font-size-2xl` | 28px | 页面标题 |
| `--font-size-3xl` | 36px | 首屏大标题 |

#### 行高

- 正文: `1.5-1.7`
- 标题: `1.3`
- 紧凑列表: `1.4`

### 2.3 间距系统

基于 **4px 网格**，所有间距为 4 的倍数：

| Token | 值 | 常见用途 |
|-------|-----|---------|
| `--space-1` | 4px | 图标与文字间距 |
| `--space-2` | 8px | 紧凑元素间距 |
| `--space-3` | 12px | 按钮内间距 |
| `--space-4` | 16px | 卡片内间距 |
| `--space-6` | 24px | 区域间距 |
| `--space-8` | 32px | 大区域分隔 |
| `--space-12` | 48px | 页面级间距 |

### 2.4 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | 6px | 标签、小按钮 |
| `--radius-md` | 10px | 输入框、卡片 |
| `--radius-lg` | 14px | 大卡片、弹窗 |
| `--radius-xl` | 24px | 聊天气泡、Pill 按钮 |
| `--radius-pill` | 999px | 胶囊按钮 |

### 2.5 阴影

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-sm` | `0 1px 3px rgba(26,22,20,0.06)` | 静息卡片 |
| `--shadow-md` | `0 4px 12px rgba(26,22,20,0.08)` | 悬浮卡片 |
| `--shadow-lg` | `0 12px 32px rgba(26,22,20,0.12)` | 弹窗、浮层 |
| `--shadow-glow` | `0 0 0 3px rgba(26,95,180,0.15)` | 聚焦态 |

### 2.6 动效

| Token | 值 | 用途 |
|-------|-----|------|
| `--transition-fast` | 150ms cubic-bezier(0.4, 0, 0.2, 1) | 按钮 hover、颜色切换 |
| `--transition-normal` | 250ms cubic-bezier(0.4, 0, 0.2, 1) | 卡片展开、面板切换 |
| `--transition-slow` | 350ms cubic-bezier(0.4, 0, 0.2, 1) | 页面过渡、大区域动画 |

---

## 三、页面设计方案

### 3.1 首页/对话页 — "画卷对话"

**布局**: 桌面端左右分栏，移动端上下堆叠

```
┌─────────────────────────────────────────────────────┐
│  NavBar  [灵] 智慧灵山胜境         [游客端] [管理后台]  │
├──────────────┬──────────────────────────────────────┤
│              │  你好！我是灵山胜境数字人导游           │
│   数字人      │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│   (全息底座)   │  │灵山大佛│ │推荐路线│ │附近美食│ │听故事 ││
│              │  └──────┘ └──────┘ └──────┘ └──────┘│
│   [呼吸灯]    │                                      │
│              │  ┌─ 用户消息 ─────────────────────┐   │
│              │  │ 灵山大佛有多高？               │   │
│              │  └────────────────────────────────┘   │
│              │  ┌─ 数字人回复 ───────────────────┐   │
│              │  │ 灵山大佛高88米...              │   │
│              │  └────────────────────────────────┘   │
│              ├──────────────────────────────────────┤
│              │  🎤  [输入消息...]           [发送]   │
└──────────────┴──────────────────────────────────────┘
```

**设计要点**:

1. **数字人区域**:
   - 数字人下方加**发光圆环底座**（模拟全息投影）
   - 底座使用 CSS `box-shadow` + `radial-gradient` 实现
   - 数字人说话时底座**脉冲发光**（颜色随情绪变化）
   - 数字人区域背景加微妙的**粒子飘散效果**

2. **聊天气泡**:
   - 用户消息: 右侧，朱砂红渐变背景，白色文字
   - 数字人消息: 左侧，宣纸纹理背景（CSS `background-image`），墨色文字
   - 气泡出现时加 `fadeInUp` 动画，50ms 交错延迟

3. **快捷问题**:
   - 使用**印章风格**的圆角按钮
   - hover 时微微上浮 + 阴影加深

4. **输入区域**:
   - 语音按钮加**声波动画**（录音时）
   - 发送按钮使用朱砂红渐变

### 3.2 探索导览页 — "水墨地图"

```
┌─────────────────────────────────────────────────────┐
│  NavBar                                              │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │            水墨风格景区地图 (SVG)                 ││
│  │         ☁️          📍灵山大佛                    ││
│  │    📍梵宫                    📍九龙灌浴          ││
│  │              📍五印坛城                          ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  ┌──────────────┐ ┌──────────────┐                  │
│  │ 📷 拍照识景    │ │ 📍 扫码定位    │                  │
│  │              │ │              │                  │
│  │  [相机取景框]  │ │  [罗盘动画]   │                  │
│  └──────────────┘ └──────────────┘                  │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ 👥 协同导览                                       ││
│  │ [创建房间]  [加入房间]                             ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**设计要点**:

1. **水墨地图**:
   - 使用 SVG 绘制景区简图，线条用工笔白描风格
   - 景点标记用**发光圆点**，hover 弹出信息气泡
   - 地图背景加淡雅的水墨晕染渐变

2. **拍照识景**:
   - 取景框边框使用**古典窗棂图案**（CSS border-image 或 SVG）
   - 识别结果以**卷轴展开**动画呈现

3. **扫码定位**:
   - 使用**罗盘/司南**样式的扫描动画
   - 扫描成功后指针指向当前位置

### 3.3 推荐路线页 — "游园导览"

**设计要点**:
- 路线卡片使用**卷轴/画轴**样式的横向滚动
- 每个路线卡片有水墨风的景点插画
- 时间轴用**竹节**样式的纵向连接线

### 3.4 管理后台 — 暗色主题

管理后台使用暗色主题（已有 `data-theme="dark"`），保持科技感：
- 深蓝黑底 `#0F1419`
- 卡片 `#1A2332`
- 强调色保持主色蓝
- 数据大屏使用渐变光效

---

## 四、核心组件规范

### 4.1 数字人全息底座

```css
.holo-base {
  position: relative;
  width: 280px;
  height: 40px;
  margin: 0 auto;
}

/* 发光圆环 */
.holo-base::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(26, 95, 180, 0.2) 0%,
    rgba(26, 95, 180, 0.08) 40%,
    transparent 70%
  );
  animation: holo-pulse 3s ease-in-out infinite;
}

/* 底部光带 */
.holo-base::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(26, 95, 180, 0.4),
    rgba(53, 132, 228, 0.6),
    rgba(26, 95, 180, 0.4),
    transparent
  );
  border-radius: 1px;
}

@keyframes holo-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* 说话时 — 朱砂红脉冲 */
.holo-base.speaking::before {
  background: radial-gradient(
    ellipse at center,
    rgba(200, 75, 49, 0.2) 0%,
    rgba(200, 75, 49, 0.08) 40%,
    transparent 70%
  );
  animation: holo-speak 1.5s ease-in-out infinite;
}
```

### 4.2 聊天气泡

```css
/* 用户消息 — 朱砂红 */
.bubble-user {
  background: linear-gradient(135deg, #C84B31 0%, #E85D3A 100%);
  color: #fff;
  border-radius: 20px 20px 4px 20px;
  padding: 12px 18px;
  max-width: 80%;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(200, 75, 49, 0.2);
}

/* 数字人消息 — 宣纸 */
.bubble-assistant {
  background: linear-gradient(135deg, #FDFBF7 0%, #F5F3EF 100%);
  color: #2A2520;
  border-radius: 20px 20px 20px 4px;
  padding: 12px 18px;
  max-width: 80%;
  border: 1px solid #E8E5DF;
  box-shadow: 0 1px 4px rgba(26, 22, 20, 0.05);
  position: relative;
}

/* 数字人消息左侧装饰线 */
.bubble-assistant::before {
  content: '';
  position: absolute;
  left: -3px;
  top: 12px;
  bottom: 12px;
  width: 3px;
  background: linear-gradient(180deg, #C8882E, #E8A838);
  border-radius: 2px;
}
```

### 4.3 印章按钮

```css
.btn-seal {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 8px;
  border: 1.5px solid #C84B31;
  background: transparent;
  color: #C84B31;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-seal:hover {
  background: rgba(200, 75, 49, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(200, 75, 49, 0.15);
}

.btn-seal:active {
  transform: translateY(0);
}

/* 填充变体 */
.btn-seal--filled {
  background: linear-gradient(135deg, #C84B31 0%, #E85D3A 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(200, 75, 49, 0.3);
}

.btn-seal--filled:hover {
  box-shadow: 0 4px 16px rgba(200, 75, 49, 0.4);
}
```

### 4.4 宣纸卡片

```css
.card-paper {
  background: linear-gradient(135deg, #FDFBF7 0%, #F8F6F2 100%);
  border: 1px solid #E8E5DF;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(26, 22, 20, 0.06);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card-paper:hover {
  box-shadow: 0 4px 16px rgba(26, 22, 20, 0.1);
  transform: translateY(-2px);
}

/* 右上角印章装饰 */
.card-paper::after {
  content: '';
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: 2px solid rgba(200, 75, 49, 0.15);
  border-radius: 4px;
  transform: rotate(15deg);
}
```

### 4.5 加载动画

```css
/* 毛笔蘸墨 */
@keyframes ink-load {
  0% { transform: scaleY(0); transform-origin: bottom; }
  50% { transform: scaleY(1); transform-origin: bottom; }
  50.01% { transform-origin: top; }
  100% { transform: scaleY(0); transform-origin: top; }
}

.ink-loader {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 24px;
}

.ink-loader span {
  width: 4px;
  height: 24px;
  background: #2A2520;
  border-radius: 2px;
  animation: ink-load 1.2s ease-in-out infinite;
}

.ink-loader span:nth-child(2) { animation-delay: 0.15s; }
.ink-loader span:nth-child(3) { animation-delay: 0.3s; }
```

---

## 五、动效规范

### 5.1 动效原则

| 原则 | 说明 |
|------|------|
| **有意义** | 每个动效都要传达因果关系，不做纯装饰动画 |
| **有呼吸** | 使用 ease-out 进入、ease-in 退出，避免 linear |
| **有节制** | 每个视图最多 1-2 个主动效元素 |
| **可感知** | 微交互 150-300ms，复杂过渡 ≤400ms |
| **可关闭** | 尊重 `prefers-reduced-motion` |

### 5.2 动效清单

| 场景 | 动效 | 时长 | 缓动 |
|------|------|------|------|
| 页面进入 | fadeInUp | 250ms | ease-out |
| 卡片 hover | translateY(-2px) + shadow | 250ms | cubic-bezier(0.4,0,0.2,1) |
| 气泡出现 | fadeInUp + 交错延迟 | 200ms + 50ms/条 | ease-out |
| 数字人说话 | 底座脉冲发光 | 1.5s loop | ease-in-out |
| 数字人表情切换 | crossfade | 200ms | ease |
| 发送按钮 | scale(0.95) → scale(1) | 150ms | ease-out |
| 页面切换 | 左右滑动 + fade | 300ms | cubic-bezier(0.4,0,0.2,1) |
| 加载状态 | 墨滴动画 | 1.2s loop | ease-in-out |
| Toast 提示 | slideInRight | 250ms | ease-out |
| 模态框弹出 | scale(0.95→1) + fade | 250ms | ease-out |

### 5.3 交错动画

列表项使用 50ms 交错延迟：

```css
.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 50ms; }
.stagger-3 { animation-delay: 100ms; }
.stagger-4 { animation-delay: 150ms; }
.stagger-5 { animation-delay: 200ms; }
.stagger-6 { animation-delay: 250ms; }
```

---

## 六、响应式策略

### 6.1 断点

| 断点 | 宽度 | 设备 |
|------|------|------|
| `sm` | 375px | 小屏手机 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1440px | 大桌面 |

### 6.2 移动端适配规则

- **底部导航**: 最多 5 个标签，图标+文字
- **触摸目标**: 最小 44×44px
- **间距**: 按钮间距 ≥8px
- **安全区**: 顶部刘海 `env(safe-area-inset-top)`，底部手势条 `env(safe-area-inset-bottom)`
- **字体**: 移动端正文字号 ≥14px，避免 iOS 自动缩放
- **输入框**: 高度 ≥44px

### 6.3 布局切换

| 页面 | 桌面端 | 移动端 |
|------|--------|--------|
| 对话页 | 左右分栏（数字人 380px + 聊天区） | 上下堆叠（数字人 240px + 聊天区） |
| 探索页 | 2列网格 | 单列堆叠 |
| 管理后台 | 侧边栏 + 内容区 | 顶部标签页 + 内容区 |

---

## 七、无障碍设计

### 7.1 对比度

- 正文文字与背景: ≥4.5:1（WCAG AA）
- 大标题与背景: ≥3:1
- 图标与背景: ≥3:1

### 7.2 焦点状态

所有可交互元素必须有可见的焦点环：

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

### 7.3 减少动效

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7.4 ARIA 标签

- 图标按钮必须有 `aria-label`
- 聊天消息使用 `role="log"` + `aria-live="polite"`
- 加载状态使用 `aria-busy="true"`
- 错误提示使用 `role="alert"`

---

## 八、竞赛展示建议

### 8.1 评委关注点

| 维度 | 权重 | 当前状态 | 建议 |
|------|------|----------|------|
| 技术深度 | ★★★★★ | Live2D + MediaPipe + RAG，技术栈强 | 保持，突出技术亮点 |
| 视觉冲击 | ★★★★ | 偏朴素 | 加全息底座 + 水墨入场动画 |
| 交互创新 | ★★★★ | 语音 + 手势 + 数字人 | 做联动演示视频 |
| 文化表达 | ★★★ | 配色偏现代 | 加宣纸纹理 + 印章元素 |
| 完成度 | ★★★★ | 功能基本完整 | 修复已知 bug |

### 8.2 优先实现清单

| 优先级 | 改动项 | 工作量 | 视觉提升 |
|--------|--------|--------|----------|
| P0 | 数字人全息底座 + 呼吸灯 | 2h | ★★★★★ |
| P0 | 聊天气泡改为宣纸/朱砂风格 | 2h | ★★★★ |
| P1 | 首页入场水墨动画 | 4h | ★★★★★ |
| P1 | 快捷问题改为印章按钮 | 1h | ★★★ |
| P1 | 背景加宣纸纹理 | 0.5h | ★★★ |
| P2 | 加载动画改为墨滴风格 | 1h | ★★★ |
| P2 | 探索页水墨地图 | 6h | ★★★★ |
| P2 | 毛笔书写文字动画 | 4h | ★★★★ |

---

## 九、暗色模式（管理后台）

管理后台使用独立的暗色主题：

| Token | 亮色（游客端） | 暗色（管理后台） |
|-------|---------------|-----------------|
| `--surface-bg` | `#F8F6F2` | `#0F1419` |
| `--surface-card` | `#FFFFFF` | `#1A2332` |
| `--surface-elevated` | `#FFFFFF` | `#243044` |
| `--text-primary` | `#1A1614` | `#E8ECF1` |
| `--text-secondary` | `#5C554C` | `#8B95A5` |
| `--border-light` | `#E8E5DF` | `#2A3548` |

暗色模式注意事项：
- 不要简单反转颜色，使用**去饱和 + 降低亮度**的色调
- 暗色模式对比度需要单独验证
- 卡片分层用 `border` 而非阴影（暗色中阴影不明显）

---

## 十、参考资源

### 图标库

- **Ant Design Icons**（当前项目在用）— 保持一致性
- 建议补充**线描风格图标**用于文化类内容区域

### 字体

- **Noto Serif SC** — 开源中文衬线体，适合标题和文化内容
- **DM Mono** — 等宽字体，适合数据展示（已在用）

### 动效参考

- Apple HIG — 弹簧物理动画、空间连续性
- Material Design 3 — 状态层、容器变换
- Lottie — 复杂矢量动画（可选，用于数字人表情）

---

*文档版本: v1.0 | 创建日期: 2026-06-04 | 项目: 智慧灵山胜境数字人导览系统*
