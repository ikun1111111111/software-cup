# 数字人全功能融合 · 开发计划书

> 📌 任务：数字人贯穿全页面体验升级
> 📌 核心目标：让数字人从"一个聊天功能"变成"贯穿整个游览体验的核心角色"
> 📌 格式约定：任务编号格式 `[模块]-[序号]`，状态标记：🔴 未开始 → 🔵 进行中 → ✅ 已完成

**核心原则：**

- 每个页面根据功能特点嵌入不同形态的数字人（全尺寸/小型/悬浮）
- 数字人在不同页面有连贯的行为和记忆
- 利用已有组件（Live2D、TTS、Emotion、Costume）最小化新开发量
- 按优先级分批实施，P0 先行保证比赛核心展示

***

## 一、当前状态分析

| 页面 | 数字人参与度 | 问题 |
|------|------------|------|
| ChatPage | 完整 (Live2D + TTS + 情感 + 口型) | 唯一完整体验 |
| HomePage | 静态展示 | 不说话、不互动 |
| VisionPage | 无 | 拍照识别后跳转到 ChatPage 才能对话 |
| AttractionDetail | 无 | 纯图文，无人讲解 |
| RecommendPage | 无 | 路线推荐无引导 |
| HistoryExplore | 无 | 时空穿越无角色 |
| Leaderboard | 无 | 排行榜纯数据 |
| RoomPage | 无 | 协同房间无助手 |
| QRScan | 无 | 扫码后跳转才能对话 |
| FloatingAssistant | 只有图标 | 没有 Live2D 模型 |
| CrowdHeatmap | 无 | 客流数据无建议 |

***

## 二、团队分工总览

| 角色 | 职责范围 | 核心交付 |
|------|----------|----------|
| **Person A** | 基础设施 + 跨页面联动 | 全局上下文、悬浮数字人升级、页面嵌入基础组件 |
| **Person B** | 页面级数字人集成 | 各页面数字人嵌入、讲解逻辑、互动反馈 |

> 两人均可独立开发，Person A 搭基础设施，Person B 在各页面集成。无强耦合。

***

## 三、开发内容详细计划

***

### 模块 C · 全局基础设施（Person A 负责）

> 📌 负责人：**Person A**
> 目标：全局上下文系统 + 悬浮数字人升级 + 页面嵌入基础组件

***

#### `C-001` 全局数字人上下文系统

> 让数字人有"记忆"，跨页面记住用户行为

- **前置任务**：无
- **负责人**：Person A
- **状态**：🔴 未开始
- **优先级**：P0

**开发内容：**

- [ ] 新建全局上下文 Store — `frontend/src/stores/digitalHumanContext.ts`
  - 当前页面上下文（页面类型、页面参数）
  - 最近识别的景点（VisionPage 写入）
  - 当前浏览的朝代（HistoryExplore 写入）
  - 当前选中的路线（RecommendPage 写入）
  - 当前房间 ID（RoomPage 写入）
  - 对话历史摘要
  - 用户兴趣偏好
- [ ] 新建上下文写入 Hook — `frontend/src/hooks/useDHContext.ts`
  - `writeContext(key, value)` — 各页面调用
  - `readContext()` — ChatPage / FloatingAssistant 读取
  - `getContextSummary()` — 生成自然语言摘要供数字人开场白使用
- [ ] 上下文持久化到 sessionStorage（页面刷新不丢失）

**产出文件：**

```
frontend/src/
  stores/
    digitalHumanContext.ts     # 新建：全局上下文 Store
  hooks/
    useDHContext.ts            # 新建：上下文读写 Hook
  __tests__/
    digitalHumanContext.test.ts # 单元测试
```

***

#### `C-002` 悬浮数字人升级（Live2D 嵌入）

> 将 FloatingAssistant 从纯图标升级为带 Live2D 模型的全局悬浮助手

- **前置任务**：`C-001`
- **负责人**：Person A
- **状态**：🔴 未开始
- **优先级**：P0

**开发内容：**

- [ ] 修改 FloatingAssistant 展开面板嵌入小型 DigitalHuman — `frontend/src/components/DigitalHuman/FloatingAssistant.tsx`
  - 展开面板顶部：小型 Live2D 数字人（宽 120，高 160）
  - 数字人下方：聊天消息列表 + 输入框
  - 数字人根据对话内容驱动表情和口型
- [ ] 集成全局上下文：展开时数字人根据当前页面自动开场
  - 在景点详情页 → "这里是灵山大佛，要我为你介绍一下吗？"
  - 在路线推荐页 → "看你的兴趣画像，你更偏爱历史文化类景点..."
  - 在时空穿越页 → "你正在探索唐代的历史，想了解什么？"
- [ ] 接收 ChatResponse 驱动表情和播报
- [ ] 监听 `entity:click` 事件触发展开
- [ ] 修改 App.tsx 全局挂载 — `frontend/src/App.tsx`

**产出文件：**

```
frontend/src/
  components/DigitalHuman/
    FloatingAssistant.tsx      # 修改：嵌入 Live2D + 上下文感知
  App.tsx                      # 修改：全局挂载（已有，确认集成）
  __tests__/
    FloatingAssistant.test.tsx # 单元测试
```

***

#### `C-003` 页面嵌入基础组件

> 提供可复用的"讲解面板"组件，各页面只需传入文本即可使用

- **前置任务**：`C-001`
- **负责人**：Person A
- **状态**：🔴 未开始
- **优先级**：P1

**开发内容：**

- [ ] 新建讲解面板组件 — `frontend/src/components/DigitalHuman/NarrationPanel.tsx`
  - 接口：`text: string`, `emotion?: Emotion`, `onComplete?: () => void`
  - 内部：小型 DigitalHuman + TTS 播放 + 情感驱动 + 口型同步
  - 样式：可嵌入页面底部/侧边，支持 compact / expanded 两种形态
  - 动画：从底部滑入，讲解完毕后可自动收起
- [ ] 新建讲解触发 Hook — `frontend/src/hooks/useNarration.ts`
  - `narrate(text, emotion?)` — 触发讲解
  - `stop()` — 停止讲解
  - `isNarrating` — 当前是否在讲解
  - 内部调用 `synthesizeSpeech()` + 管理音频播放
- [ ] 支持快捷键 `Esc` 停止讲解

**产出文件：**

```
frontend/src/
  components/DigitalHuman/
    NarrationPanel.tsx         # 新建：讲解面板组件
  hooks/
    useNarration.ts            # 新建：讲解触发 Hook
  __tests__/
    NarrationPanel.test.tsx    # 单元测试
    useNarration.test.ts       # 单元测试
```

***

#### `C-004` 节日服装自动切换

> 根据日期自动切换数字人服装，无需用户操作

- **前置任务**：无
- **负责人**：Person A
- **状态**：🔴 未开始
- **优先级**：P3

**开发内容：**

- [ ] 新建节日配置 — `frontend/src/config/festivalCostumes.ts`
  - 春节（农历正月初一） → 红色唐装 + `festive-red` texture
  - 中秋（农历八月十五） → 月宫装 + `midnight-blue` texture
  - 佛诞日（农历四月初八） → 僧袍 + `monk-robes` texture
  - 国庆（公历 10/1） → 国风装 + `national-pride` texture
  - 默认 → 日常装
- [ ] 修改 `useCostume` hook 接入节日判断 — `frontend/src/hooks/useCostume.ts`
  - 启动时检查当前日期 → 匹配节日 → 自动应用对应 costumeMap
  - 节日服装优先级高于用户手动选择
- [ ] 特殊节日期间数字人开场白包含节日祝福

**产出文件：**

```
frontend/src/
  config/
    festivalCostumes.ts        # 新建：节日服装配置
  hooks/
    useCostume.ts              # 修改：接入节日判断
  __tests__/
    festivalCostumes.test.ts   # 单元测试
```

***

### 模块 D · 页面级数字人集成（Person B 负责）

> 📌 负责人：**Person B**
> 目标：在各功能页面嵌入数字人，实现就地讲解、互动反馈、沉浸体验

***

#### `D-001` 时空穿越 — 数字人换装穿越

> 时间线页面嵌入数字人，根据朝代自动换装

- **前置任务**：`C-001`（上下文系统）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P0

**开发内容：**

- [ ] 修改 HistoryExplore 页面，右侧嵌入数字人展示区 — `frontend/src/pages/tourist/HistoryExplore.tsx`
  - 桌面端：右侧固定 280px 面板，嵌入 DigitalHuman
  - 移动端：底部折叠面板，点击展开
- [ ] 朝代 → 服装映射配置
  - 唐代 → 唐装 texture + `hue-rotate(10deg) saturate(1.2)`
  - 宋代 → 宋制汉服 texture + `sepia(0.1)`
  - 元代 → 蒙古装 texture + `hue-rotate(-15deg)`
  - 明代 → 明制汉服 texture + `contrast(1.1)`
  - 清代 → 清装 texture + `brightness(0.95)`
  - 现代 → 日常装（默认）
- [ ] 切换时间线时，数字人外观同步变化（通过 `cssFilter` prop）
- [ ] 切换朝代时，数字人自动讲解该朝代的灵山历史
- [ ] 写入上下文：`writeContext('currentEra', era)`

**产出文件：**

```
frontend/src/
  pages/tourist/
    HistoryExplore.tsx         # 修改：嵌入数字人 + 换装逻辑
  config/
    eraCostumes.ts             # 新建：朝代服装映射
  __tests__/
    HistoryExplore.test.tsx    # 单元测试
```

***

#### `D-002` 文化解谜 — 数字人出题官

> PuzzleGame 嵌入数字人，语音念题 + 表情反馈

- **前置任务**：`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P1

**开发内容：**

- [ ] 修改 PuzzleGame 顶部嵌入小型数字人 — `frontend/src/components/tourist/PuzzleGame.tsx`
  - 数字人区域：宽 160，高 200，固定在题目卡片上方
  - 出题时：数字人 `think` 表情 + TTS 念题目
  - 答对时：数字人 `surprise` 表情 + "答对了！" + TapBody 动画
  - 答错时：数字人 `sorry` 表情 + "没关系，正确答案是..." + 讲解
  - 完成一轮：数字人 `smile` 表情 + 总结鼓励
- [ ] 使用 `useNarration` hook 驱动语音讲解
- [ ] 写入上下文：`writeContext('lastPuzzleScore', { correct, total })`

**产出文件：**

```
frontend/src/
  components/tourist/
    PuzzleGame.tsx             # 修改：嵌入数字人出题官
  __tests__/
    PuzzleGame.test.tsx        # 单元测试
```

***

#### `D-003` 印章收集 — 数字人见证仪式

> StampWall 收集印章时数字人出现祝贺

- **前置任务**：`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P3

**开发内容：**

- [ ] 修改 StampWall 底部嵌入数字人 — `frontend/src/components/tourist/StampWall.tsx`
  - 收集到新印章 → 数字人 `smile` 表情 + TapBody 动画 + "恭喜获得新印章！"
  - 集齐一套 → 数字人特殊庆典动画 + "太厉害了，你集齐了所有印章！"
  - 未收集时 → 数字人 `neutral` 表情 + "继续探索，还有更多印章等你收集"
- [ ] 使用 `useNarration` hook 驱动语音讲解
- [ ] 印章详情可以用数字人语音讲解每个印章的含义

**产出文件：**

```
frontend/src/
  components/tourist/
    StampWall.tsx              # 修改：嵌入数字人见证
  __tests__/
    StampWall.test.tsx         # 单元测试
```

***

#### `D-004` 景点详情页 — 嵌入讲解

> AttractionDetail 页面嵌入"听小景讲解"按钮

- **前置任务**：`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P1

**开发内容：**

- [ ] 修改 AttractionDetail 页面底部添加浮动讲解按钮 — `frontend/src/pages/tourist/AttractionDetail.tsx`
  - 按钮样式：红色渐变 + 喇叭图标 + "听小景讲解"
  - 点击后页面底部滑出 NarrationPanel
  - 数字人朗读景点介绍文本
  - 讲解时配合表情（讲到壮观用 `surprise`，讲到历史用 `think`）
  - 讲解完成后面板可收起，用户可点击"再听一次"
- [ ] 写入上下文：`writeContext('lastViewedSpot', spot.name)`
- [ ] 支持快捷键 `Esc` 停止讲解

**产出文件：**

```
frontend/src/
  pages/tourist/
    AttractionDetail.tsx       # 修改：嵌入讲解按钮 + NarrationPanel
  __tests__/
    AttractionDetail.test.tsx  # 单元测试
```

***

#### `D-005` 视觉识别页 — 就地讲解

> VisionPage 拍照识别后数字人直接在当前页面讲解，不跳转

- **前置任务**：`C-001`（上下文系统）、`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P2

**开发内容：**

- [ ] 修改 VisionPage，识别结果出来后嵌入 NarrationPanel — `frontend/src/pages/tourist/VisionPage.tsx`
  - 识别成功 → 页面下半部分滑出讲解面板
  - 左侧：拍到的图片，右侧：小型数字人
  - 数字人讲解识别到的景点信息
  - 检测到景点后数字人自动 `surprise` 表情
- [ ] 保留"去聊天页深入了解"按钮，但不再是唯一选项
- [ ] 写入上下文：`writeContext('lastVisionSpot', result.spot_name)`

**产出文件：**

```
frontend/src/
  pages/tourist/
    VisionPage.tsx             # 修改：嵌入就地讲解
  __tests__/
    VisionPage.test.tsx        # 单元测试
```

***

#### `D-006` 路线推荐 — 数字人路线顾问

> RecommendPage 数字人总结用户偏好 + 概述路线亮点

- **前置任务**：`C-001`（上下文系统）、`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P2

**开发内容：**

- [ ] 修改 RecommendPage，DNA 分析完成后嵌入数字人讲解 — `frontend/src/pages/tourist/RecommendPage.tsx`
  - DNA 加载完成 → 数字人总结："看你的兴趣画像，你更偏爱历史文化类景点..."
  - 展开路线详情 → 数字人概述路线亮点
  - 点击"开始导航"前 → 数字人做出发前温馨提示
- [ ] 使用 `useNarration` hook 驱动语音讲解
- [ ] 写入上下文：`writeContext('selectedRoute', route.name)`

**产出文件：**

```
frontend/src/
  pages/tourist/
    RecommendPage.tsx          # 修改：嵌入数字人路线顾问
  __tests__/
    RecommendPage.test.tsx     # 单元测试
```

***

#### `D-007` QR 扫码 — 数字人即时讲解

> QRScan 扫到景点后数字人直接在扫码界面讲解

- **前置任务**：`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P1

**开发内容：**

- [ ] 修改 QRScanCard，扫码成功后嵌入讲解面板 — `frontend/src/pages/tourist/QRScan.tsx`
  - 扫到景点 → 数字人 `surprise` 表情 + "你扫到了灵山大佛！让我为你介绍一下..."
  - 讲解完成后提供"了解更多"跳转到详情页
- [ ] 使用 `useNarration` hook 驱动语音讲解
- [ ] 写入上下文：`writeContext('lastScannedSpot', spot.name)`

**产出文件：**

```
frontend/src/
  pages/tourist/
    QRScan.tsx                 # 修改：嵌入即时讲解
  __tests__/
    QRScan.test.tsx            # 单元测试
```

***

#### `D-008` 排行榜 — 数字人播报

> Leaderboard 加载时数字人播报前三名

- **前置任务**：`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P3

**开发内容：**

- [ ] 修改 Leaderboard 页面顶部嵌入数字人 — `frontend/src/pages/tourist/Leaderboard.tsx`
  - 页面加载完成 → 数字人播报前三名
  - "本月人气最高的景点是灵山大佛，已有 3286 位游客到访"
  - 数字人 `smile` 表情 + TTS 播报
- [ ] 使用 `useNarration` hook 驱动语音讲解

**产出文件：**

```
frontend/src/
  pages/tourist/
    Leaderboard.tsx            # 修改：嵌入数字人播报
  __tests__/
    Leaderboard.test.tsx       # 单元测试
```

***

#### `D-009` 客流热力图 — 数字人出行建议

> CrowdHeatmap 数据加载后数字人主动建议

- **前置任务**：`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P3

**开发内容：**

- [ ] 修改 CrowdHeatmap 数据加载后嵌入数字人建议 — `frontend/src/components/tourist/CrowdHeatmap.tsx`
  - 数据加载完成 → 数字人根据客流数据给出建议
  - "现在九龙灌浴比较拥挤，建议先去祥符禅寺，半小时后再来"
  - 数字人 `think` 表情 + TTS 播报
- [ ] 使用 `useNarration` hook 驱动语音讲解

**产出文件：**

```
frontend/src/
  components/tourist/
    CrowdHeatmap.tsx           # 修改：嵌入数字人建议
  __tests__/
    CrowdHeatmap.test.tsx      # 单元测试
```

***

#### `D-010` 协同房间 — 数字人会议主持

> RoomPage 多人协作时数字人作为房间助手

- **前置任务**：`C-001`（上下文系统）、`C-003`（讲解面板组件）
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P3

**开发内容：**

- [ ] 修改 RoomPage 房间内嵌入数字人 — `frontend/src/pages/tourist/RoomPage.tsx`
  - 房间内始终显示小型数字人（宽 160，高 200）
  - 有人加入 → 数字人 `smile` 表情 + "欢迎 XXX 加入房间！"
  - 有人分享景点 → 数字人补充介绍该景点
  - 房间内提问 → 数字人回答（通过 `useNarration`）
- [ ] 监听 WebSocket 事件驱动数字人行为
- [ ] 写入上下文：`writeContext('roomId', roomId)`

**产出文件：**

```
frontend/src/
  pages/tourist/
    RoomPage.tsx               # 修改：嵌入数字人会议主持
  __tests__/
    RoomPage.test.tsx          # 单元测试
```

***

#### `D-011` 数字人情绪进化

> 结合对话上下文的连续情绪，让数字人更有"人味"

- **前置任务**：无
- **负责人**：Person B
- **状态**：🔴 未开始
- **优先级**：P3

**开发内容：**

- [ ] 修改 `detectEmotion()` 增加上下文感知 — `frontend/src/pages/tourist/ChatPage.tsx`
  - 用户连续问了 3 个问题 → 数字人主动说"你似乎对这里很感兴趣"
  - 用户长时间没互动（> 30s） → 数字人主动打招呼
  - 用户表达了不满 → 数字人切换为 `sorry` 表情 + 主动提供帮助
- [ ] 新建情绪状态机 — `frontend/src/utils/emotionStateMachine.ts`
  - 输入：对话历史 + 用户行为
  - 输出：建议的 emotion + 主动发言文本
- [ ] 数字人 idle 状态下根据情绪做微表情变化

**产出文件：**

```
frontend/src/
  utils/
    emotionStateMachine.ts     # 新建：情绪状态机
  pages/tourist/
    ChatPage.tsx               # 修改：集成情绪进化
  __tests__/
    emotionStateMachine.test.ts # 单元测试
```

***

#### `D-012` 模块 C+D · 单元测试

> 为全部前后端编写测试

- **前置任务**：`C-001` ~ `D-011`
- **负责人**：Person A + Person B
- **状态**：🔴 未开始
- **产出位置**：`frontend/src/__tests__/`

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|----------|----------|
| 1 | 上下文 — 写入 | `writeContext('era', '唐代')` | 存储成功 |
| 2 | 上下文 — 读取 | `readContext()` | 返回完整上下文 |
| 3 | 上下文 — 摘要 | `getContextSummary()` | 返回自然语言字符串 |
| 4 | 上下文 — 持久化 | 页面刷新 | sessionStorage 恢复 |
| 5 | 上下文 — 跨页面 | VisionPage → ChatPage | ChatPage 读到景点名 |
| 6 | 悬浮助手 — 嵌入 Live2D | 展开面板 | 显示 DigitalHuman 组件 |
| 7 | 悬浮助手 — 上下文感知 | 在景点页展开 | 开场白含景点名 |
| 8 | 讲解面板 — 触发 | `narrate("测试文本")` | 面板出现 + TTS 播放 |
| 9 | 讲解面板 — 停止 | `stop()` | 面板收起 + 音频停止 |
| 10 | 讲解面板 — Esc | 按 Esc | 停止讲解 |
| 11 | 节日服装 — 春节 | 日期=正月初一 | 应用 festive-red |
| 12 | 节日服装 — 默认 | 非节日 | 应用默认服装 |
| 13 | 换装 — 唐代 | 切换到唐代 | cssFilter 变化 |
| 14 | 换装 — 明代 | 切换到明代 | cssFilter 变化 |
| 15 | 出题官 — 答对 | 选择正确答案 | surprise 表情 + 祝贺 |
| 16 | 出题官 — 答错 | 选择错误答案 | sorry 表情 + 讲解 |
| 17 | 景点讲解 — 触发 | 点击"听小景讲解" | NarrationPanel 滑出 |
| 18 | 景点讲解 — 完成 | TTS 播放结束 | onComplete 回调 |
| 19 | QR 扫码 — 讲解 | 扫到景点 | 数字人 surprise + 讲解 |
| 20 | 排行榜 — 播报 | 页面加载完成 | 数字人播报前三名 |
| 21 | 客流建议 — 触发 | 数据加载完成 | 数字人给出建议 |
| 22 | 房间 — 欢迎 | 有人加入 | 数字人欢迎语 |
| 23 | 情绪进化 — 连续提问 | 连续 3 个问题 | 主动发言 |
| 24 | 情绪进化 — 长时间无互动 | > 30s 无操作 | 主动打招呼 |

**产出文件：**

```
frontend/src/__tests__/
  digitalHumanContext.test.ts
  FloatingAssistant.test.tsx
  NarrationPanel.test.tsx
  useNarration.test.ts
  festivalCostumes.test.ts
  emotionStateMachine.test.ts
  HistoryExplore.test.tsx
  PuzzleGame.test.tsx
  StampWall.test.tsx
  AttractionDetail.test.tsx
  VisionPage.test.tsx
  RecommendPage.test.tsx
  QRScan.test.tsx
  Leaderboard.test.tsx
  CrowdHeatmap.test.tsx
  RoomPage.test.tsx
```

***

## 四、测试计划总览

### 4.1 单元测试分布

| 模块 | 负责人 | 测试用例数 | 产出位置 |
|------|--------|-----------|----------|
| 基础设施（C） | Person A | ~6 | `frontend/src/__tests__/` |
| 页面集成（D） | Person B | ~18 | `frontend/src/__tests__/` |
| **合计** | — | **~24** | — |

### 4.2 联调测试

| 联调点 | Person A (提供) | Person B (消费) | 联调时机 |
|--------|-----------------|-----------------|----------|
| 上下文 Store | C-001 创建 Store | D-001~D-010 各页面写入 | Day 2 |
| 讲解面板组件 | C-003 创建组件 | D-002~D-010 各页面使用 | Day 3 |
| 悬浮助手 + 上下文 | C-002 升级 FloatingAssistant | D-001 写入上下文 | Day 4 |

***

## 五、任务依赖图

```
模块 C · 全局基础设施（Person A）
├── C-001 全局上下文系统 ────┐
│                            ├── C-002 悬浮数字人升级
│                            └── C-003 页面嵌入基础组件 ──┐
│                                                         │
├── C-004 节日服装切换（独立）                              │
│                                                         │
模块 D · 页面级集成（Person B）                             │
├── D-001 时空穿越换装 (依赖 C-001)                         │
├── D-002 文化解谜出题官 (依赖 C-003) ◄─────────────────────┤
├── D-003 印章收集仪式 (依赖 C-003) ◄──────────────────────┤
├── D-004 景点详情讲解 (依赖 C-003) ◄──────────────────────┤
├── D-005 视觉识别就地讲解 (依赖 C-001, C-003)             │
├── D-006 路线推荐顾问 (依赖 C-001, C-003)                 │
├── D-007 QR扫码即时讲解 (依赖 C-003) ◄────────────────────┤
├── D-008 排行榜播报 (依赖 C-003) ◄────────────────────────┤
├── D-009 客流建议 (依赖 C-003) ◄──────────────────────────┤
├── D-010 协同房间主持 (依赖 C-001, C-003)                 │
├── D-011 情绪进化（独立）                                  │
│                                                         │
└── D-012 全部测试 (依赖 C-001 ~ D-011)
```

***

## 六、执行顺序总览

| 角色 | 任务编号 | 任务名 | 周期 | 优先级 |
|------|----------|--------|------|--------|
| **Person A** | C-001 | 全局数字人上下文系统 | Day 1-2 | P0 |
| **Person A** | C-002 | 悬浮数字人升级（Live2D 嵌入） | Day 3-4 | P0 |
| **Person A** | C-003 | 页面嵌入基础组件 | Day 2-3 | P1 |
| **Person A** | C-004 | 节日服装自动切换 | Day 8 | P3 |
| **Person B** | D-001 | 时空穿越 — 数字人换装穿越 | Day 3-4 | P0 |
| **Person B** | D-004 | 景点详情页 — 嵌入讲解 | Day 4 | P1 |
| **Person B** | D-007 | QR 扫码 — 即时讲解 | Day 5 | P1 |
| **Person B** | D-002 | 文化解谜 — 数字人出题官 | Day 5-6 | P1 |
| **Person B** | D-005 | 视觉识别 — 就地讲解 | Day 6 | P2 |
| **Person B** | D-006 | 路线推荐 — 数字人顾问 | Day 7 | P2 |
| **Person B** | D-003 | 印章收集 — 见证仪式 | Day 7 | P3 |
| **Person B** | D-008 | 排行榜 — 数字人播报 | Day 8 | P3 |
| **Person B** | D-009 | 客流热力图 — 出行建议 | Day 8 | P3 |
| **Person B** | D-010 | 协同房间 — 会议主持 | Day 9 | P3 |
| **Person B** | D-011 | 数字人情绪进化 | Day 9 | P3 |
| **A + B** | D-012 | 全部单元测试 | Day 10 | — |

***

## 七、已有组件复用清单

| 组件/Hook | 文件路径 | 本次复用方式 |
|-----------|----------|-------------|
| `DigitalHuman` | `components/DigitalHuman/DigitalHuman.tsx` | 各页面嵌入、悬浮助手嵌入 |
| `Live2DStage` | `components/DigitalHuman/Live2DStage.tsx` | 渲染层，无需修改 |
| `EmotionController` | `components/DigitalHuman/EmotionController.tsx` | 情感驱动，无需修改 |
| `LipSync` | `components/DigitalHuman/LipSync.tsx` | 口型同步，无需修改 |
| `AudioSync` | `components/DigitalHuman/AudioSync.tsx` | TTS 播放，无需修改 |
| `VoiceInput` | `components/DigitalHuman/VoiceInput.tsx` | 语音输入，无需修改 |
| `useLive2D` | `hooks/useLive2D.ts` | Live2D 状态管理，无需修改 |
| `useCostume` | `hooks/useCostume.ts` | 服装切换，C-004 修改扩展 |
| `useIdleAnimation` | `hooks/useIdleAnimation.ts` | 待机动画，无需修改 |
| `FloatingAssistant` | `components/DigitalHuman/FloatingAssistant.tsx` | C-002 修改升级 |
| `synthesizeSpeech()` | `api/tts.ts` | TTS API，无需修改 |
| `detectEmotion()` | `ChatPage.tsx` 内 | D-011 修改扩展 |
| `costumeMap` | `config/costumeMap.ts` | 服装映射，C-004 扩展 |
| `RoleSelector` | `components/DigitalHuman/RoleSelector.tsx` | 角色切换，无需修改 |

***

## 八、新增文件清单

```
frontend/src/
  stores/
    digitalHumanContext.ts         # C-001：全局上下文 Store
  hooks/
    useDHContext.ts                # C-001：上下文读写 Hook
    useNarration.ts               # C-003：讲解触发 Hook
  components/DigitalHuman/
    NarrationPanel.tsx            # C-003：讲解面板组件
  config/
    festivalCostumes.ts           # C-004：节日服装配置
    eraCostumes.ts                # D-001：朝代服装映射
  utils/
    emotionStateMachine.ts        # D-011：情绪状态机
```

**修改文件清单：**

```
frontend/src/
  App.tsx                         # C-002：确认全局挂载
  components/DigitalHuman/
    FloatingAssistant.tsx         # C-002：嵌入 Live2D
  hooks/
    useCostume.ts                 # C-004：接入节日判断
  pages/tourist/
    HistoryExplore.tsx            # D-001：嵌入数字人换装
    AttractionDetail.tsx          # D-004：嵌入讲解按钮
    QRScan.tsx                    # D-007：嵌入即时讲解
    VisionPage.tsx                # D-005：嵌入就地讲解
    RecommendPage.tsx             # D-006：嵌入路线顾问
    Leaderboard.tsx               # D-008：嵌入播报
    ChatPage.tsx                  # D-011：情绪进化
    RoomPage.tsx                  # D-010：嵌入会议主持
  components/tourist/
    PuzzleGame.tsx                # D-002：嵌入出题官
    StampWall.tsx                 # D-003：嵌入见证仪式
    CrowdHeatmap.tsx              # D-009：嵌入出行建议
```
