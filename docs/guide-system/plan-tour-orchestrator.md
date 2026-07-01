# 数字人主动导览系统重构方案

> 版本: v1.0 | 日期: 2026-06-17  
> 平台: React Native (Expo) + FastAPI  
> 核心理念: 数字人主导的沉浸式导览体验

---

## 1. 重构目标

### 1.1 当前问题

- 数字人处于被动状态，仅在用户触发时响应
- 页面之间缺乏连贯的导览体验
- 用户容易迷失，不知道下一步该做什么
- 景点讲解孤立，没有形成完整的游览流程

### 1.2 重构目标

- **数字人主导**: 数字人主动引导用户游览，提供完整的导览体验
- **页面连贯**: 每个页面都融入数字人讲解，页面间通过数字人导航
- **流程完整**: 从欢迎 → 路线选择 → 导览 → 讲解 → 回顾，形成完整闭环
- **保留自由**: 用户可随时切换到自由探索模式

### 1.3 核心体验

> **像有一个贴心的导游全程陪同，主动讲解、推荐、导航，但也可以随时自由探索。**

---

## 2. 现有页面分析

### 2.1 页面清单（13个页面）

| 页面路径 | 页面名称 | 当前功能 | 改造方向 |
|---------|---------|---------|---------|
| `app/(tabs)/index.tsx` | 首页 | 静态展示、功能入口 | 导览入口、欢迎、路线推荐 |
| `app/(tabs)/explore.tsx` | 探索 | 景点发现 | 景点推荐、导览节点 |
| `app/(tabs)/chat.tsx` | 聊天 | 对话界面 | 互动问答、导览建议 |
| `app/(tabs)/memory.tsx` | 记忆 | 游览记忆 | 回顾导览、展示记忆 |
| `app/attractions/index.tsx` | 景点列表 | 景点列表展示 | 导览节点、景点介绍 |
| `app/attractions/[id].tsx` | 景点详情 | 景点详情展示 | 讲解节点、主动讲解 |
| `app/routes/index.tsx` | 路线列表 | 路线列表展示 | 路线选择、最佳推荐 |
| `app/routes/[id].tsx` | 路线详情 | 路线详情展示 | 路线导览、进度跟踪 |
| `app/map.tsx` | 地图 | 地图展示 | 导航节点、位置指引 |
| `app/guide-demo.tsx` | 向导演示 | 演示界面 | 废弃（功能已集成） |
| `app/history/index.tsx` | 历史 | 历史文化展示 | 文化节点、历史讲解 |

### 2.2 现有数字人组件

| 组件 | 文件路径 | 当前功能 | 改造方向 |
|------|---------|---------|---------|
| SmartGuide | `components/guide/SmartGuide.tsx` | 智能向导、被动提示 | 改为主动导览控制 |
| GuideToast | `components/guide/GuideToast.tsx` | 轻提示 | 保留，改为主动提示 |
| NarrationSheet | `components/guide/NarrationSheet.tsx` | 讲解面板 | 保留，作为核心讲解界面 |
| WelcomeRouteCard | `components/guide/WelcomeRouteCard.tsx` | 欢迎路线卡片 | 保留，作为导览入口 |
| ProactiveStrategyEngine | `components/guide/ProactiveStrategyEngine.tsx` | 主动策略引擎 | 扩展为导览流程引擎 |
| VRMFloating | `components/vrm/VRMFloating.tsx` | VRM浮窗 | 保留，作为数字人展示 |

---

## 3. 核心架构设计

### 3.1 TourOrchestrator 状态机

```
┌─────────────────────────────────────────────────────────────┐
│                    TourOrchestrator 状态机                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │   IDLE   │───▶│ GREETING │───▶│ SUGGEST  │───▶│NAVIGATE│ │
│  │ (空闲)   │    │ (欢迎)   │    │ (推荐)   │    │ (导航) │ │
│  └────┬─────┘    └──────────┘    └────┬─────┘    └───┬────┘ │
│       │                                │                │     │
│       │          ┌─────────────────────┘                │     │
│       │          │                                      │     │
│       │          ▼                                      ▼     │
│       │    ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│       └───▶│   FREE   │◀───│NARRATING │◀───│ATTRACTION    │  │
│            │ (自由)   │    │ (讲解)   │    │(景点导览)    │  │
│            └──────────┘    └──────────┘    └──────────────┘  │
│                 │                                              │
│                 └───────────────────────────────────▶          │
│                                 CONVERSING (对话)             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 状态定义

| 状态 | 说明 | 数字人行为 | 页面表现 |
|------|------|-----------|---------|
| **IDLE** | 空闲 | VRM静默跟随，不主动说话 | 显示VRM浮窗，无其他提示 |
| **GREETING** | 欢迎 | 主动欢迎，介绍自己，询问游览偏好 | 弹出欢迎卡片，推荐路线 |
| **SUGGEST** | 推荐 | 推荐路线或景点，说明理由 | 显示推荐卡片，用户可选择 |
| **NAVIGATE** | 导航 | 指引用户前往目标位置，显示进度 | 地图导航，语音提示方向 |
| **ATTRACTION** | 景点导览 | 介绍景点，推荐下一个景点 | 景点详情+讲解面板 |
| **NARRATING** | 讲解 | 主动讲解景点内容，同步VRM口型 | 讲解BottomSheet，字幕显示 |
| **FREE** | 自由 | 提供建议但不强制，可随时响应 | VRM静默，用户可点击交互 |
| **CONVERSING** | 对话 | 回答用户问题，提供导览建议 | 聊天界面，数字人主导话题 |

### 3.3 状态流转规则

```
启动App
  │
  ▼
[IDLE]
  │ 用户首次访问 / 进入新区域
  ▼
[GREETING] → 欢迎语 + 路线推荐
  │ 用户选择路线
  ▼
[SUGGEST] → 确认路线详情
  │ 用户点击"开始"
  ▼
[NAVIGATE] → 导航到第一个景点
  │ 到达景点
  ▼
[ATTRACTION] → 介绍景点
  │ 用户点击"讲解"
  ▼
[NARRATING] → 主动讲解
  │ 讲解完成
  ▼
[SUGGEST] → 推荐下一个景点
  │ 用户选择"继续"或"自由探索"
  ├─ 继续 → [NAVIGATE] → 下一个景点
  └─ 自由 → [FREE]
  │ 用户点击VRM或语音唤醒
  ▼
[CONVERSING] → 对话互动
  │ 对话结束
  ▼
[IDLE] 或 [FREE]
```

---

## 4. 页面改造详细方案

### 4.1 首页 (`app/(tabs)/index.tsx`)

**当前状态**: 静态展示页面，包含景点列表入口、功能按钮等

**改造方案**:
- 添加数字人欢迎动画（3秒后自动播放）
- 弹出欢迎路线卡片（`WelcomeRouteCard`）
- 添加导览模式切换按钮（主动导览 / 自由探索）
- 记录用户游览进度，下次打开时继续导览

**数字人行为**:
```
"欢迎来到灵山胜境！我是您的向导小灵。
 今天想怎么游览？
 - 我为您推荐了禅意之旅路线
 - 也可以自由探索
 - 或者选择其他路线"
```

**改造要点**:
- 集成 `SmartGuide` 组件，默认开启主动导览模式
- 添加游览进度指示器（显示当前进度）
- 添加导览设置入口（快速调整偏好）

### 4.2 景点详情页 (`app/attractions/[id].tsx`)

**当前状态**: 静态展示景点详情，包含图片、介绍、位置等

**改造方案**:
- 到达景点时，数字人主动介绍景点
- 弹出讲解面板（`NarrationSheet`），用户可选择"立即讲解"或"稍后讲解"
- 讲解完成后，推荐下一个景点
- 添加"继续导览"按钮，导航到下一个景点

**数字人行为**:
```
"现在我们来到了梵宫。
 梵宫被誉为东方卢浮宫，内部珍藏着...
 - 要听听详细讲解吗？
 - 或者先自己看看？
 - 讲解完成后，我们将前往五印坛城"
```

**改造要点**:
- 集成 `NarrationSheet` 组件，支持主动触发
- 添加景点导览进度（显示当前景点在路线中的位置）
- 添加"下一个景点"预览卡片

### 4.3 路线列表页 (`app/routes/index.tsx`)

**当前状态**: 展示所有可选路线

**改造方案**:
- 数字人推荐最佳路线（基于用户偏好）
- 路线卡片添加推荐理由
- 点击路线后，显示路线详情和导览计划

**数字人行为**:
```
"我为您推荐以下路线：
 1. 禅意之旅（最适合您，1.5小时）
 2. 经典全景（打卡所有景点，2.5小时）
 3. 亲子欢乐（适合家庭，2小时）
 您想选择哪条路线？"
```

### 4.4 路线详情页 (`app/routes/[id].tsx`)

**当前状态**: 展示路线详情，包含景点列表、地图等

**改造方案**:
- 数字人介绍路线亮点
- 显示导览进度（已完成X/X个景点）
- 添加"开始导览"按钮，进入导航模式
- 每个景点标注预计停留时间

**数字人行为**:
```
"这条禅意之旅路线包含3个景点：
 1. 菩提大道（10分钟）
 2. 梵宫（30分钟）
 3. 五印坛城（20分钟）
 全程约1.5小时，现在出发吗？"
```

### 4.5 地图页 (`app/map.tsx`)

**当前状态**: 展示地图，标注景点位置

**改造方案**:
- 导航模式下，高亮显示目标景点
- 显示导航路线和距离
- 到达景点时自动触发景点导览
- 数字人提供语音导航提示

**数字人行为**:
```
"我们现在前往梵宫，距离200米，步行约3分钟。
 到达后我会为您讲解。
 请注意脚下安全。"
```

### 4.6 聊天页 (`app/(tabs)/chat.tsx`)

**当前状态**: 纯对话界面

**改造方案**:
- 对话中主动推荐景点或路线
- 根据对话内容调整导览建议
- 支持语音对话，增强交互体验
- 对话结束后可返回导览流程

**数字人行为**:
```
"您问灵山大佛有多高？
 灵山大佛高88米...
 如果您感兴趣，我们现在可以前往大佛景点，
 我为您详细讲解。要现在去吗？"
```

### 4.7 记忆页 (`app/(tabs)/memory.tsx`)

**当前状态**: 展示游览记忆

**改造方案**:
- 回顾本次导览的景点和路线
- 显示游览统计（时间、景点数、问答数）
- 推荐下次游览路线
- 数字人总结本次游览

**数字人行为**:
```
"今天我们游览了3个景点：
 菩提大道、梵宫、五印坛城。
 您一共问了5个问题，非常棒！
 下次为您推荐禅修深度游路线，要看看吗？"
```

### 4.8 历史页 (`app/history/index.tsx`)

**当前状态**: 展示历史文化内容

**改造方案**:
- 关联相关景点，提供文化延伸
- 数字人讲解历史背景
- 推荐包含历史景点的路线

**数字人行为**:
```
"这段历史与梵宫密切相关。
 梵宫的设计灵感就来源于这段历史...
 如果您想了解更多信息，我们可以前往梵宫，
 我为您详细讲解。"
```

---

## 5. 技术实现方案

### 5.1 新增核心组件

#### 5.1.1 TourOrchestrator（导览状态机）

```typescript
// hooks/useTourOrchestrator.ts
interface TourState {
  status: TourStatus;
  currentRoute: Route | null;
  currentSpot: Spot | null;
  nextSpot: Spot | null;
  progress: {
    total: number;
    completed: number;
    current: number;
  };
  preferences: TourPreferences;
}

interface TourActions {
  // 状态控制
  startTour: (route: Route) => void;
  pauseTour: () => void;
  resumeTour: () => void;
  endTour: () => void;
  
  // 导航控制
  navigateToSpot: (spot: Spot) => void;
  startNarration: (spot: Spot) => void;
  endNarration: () => void;
  suggestNextSpot: () => void;
  
  // 交互控制
  greetUser: () => void;
  suggestRoute: () => void;
  startConversation: () => void;
  endConversation: () => void;
  
  // 设置
  updatePreferences: (prefs: Partial<TourPreferences>) => void;
  switchToFreeMode: () => void;
  switchToTourMode: () => void;
}

export function useTourOrchestrator(): [TourState, TourActions] {
  // 状态管理、SSE连接、GPS监听、提示策略
}
```

#### 5.1.2 TourProgressIndicator（导览进度指示器）

```typescript
// components/guide/TourProgressIndicator.tsx
interface Props {
  progress: {
    total: number;
    completed: number;
    current: number;
  };
  currentRoute: Route | null;
  onContinue: () => void;
  onEnd: () => void;
}

// 显示当前导览进度，提供继续/结束按钮
```

#### 5.1.3 TourNavigationOverlay（导航遮罩）

```typescript
// components/guide/TourNavigationOverlay.tsx
interface Props {
  targetSpot: Spot;
  distance: number;
  duration: number;
  onArrive: () => void;
  onCancel: () => void;
}

// 导航模式下显示目标景点、距离、时间
```

### 5.2 改造现有组件

#### 5.2.1 SmartGuide 改造

**当前**: 被动提示组件，仅在特定条件下弹出提示

**改造后**: 主动导览控制组件
- 默认开启主动导览模式
- 根据状态机自动触发讲解、推荐、导航
- 提供模式切换按钮（主动/自由）

```typescript
// components/guide/SmartGuide.tsx
export const SmartGuide: React.FC = () => {
  const [tourState, tourActions] = useTourOrchestrator();
  
  // 根据状态自动触发行为
  useEffect(() => {
    switch (tourState.status) {
      case 'greeting':
        // 播放欢迎语
        break;
      case 'suggest':
        // 显示推荐卡片
        break;
      case 'narrating':
        // 打开讲解面板
        break;
      case 'navigate':
        // 显示导航遮罩
        break;
      // ...
    }
  }, [tourState.status]);
  
  // ... 渲染逻辑
};
```

#### 5.2.2 ProactiveStrategyEngine 改造

**当前**: 仅处理GPS接近、空闲、偏离三种提示

**改造后**: 扩展为导览流程引擎
- 集成 TourOrchestrator 状态机
- 管理整个导览流程
- 处理页面切换、景点导航、讲解触发

### 5.3 后端API扩展

#### 5.3.1 新增端点

```python
# POST /api/tour/start
# 开始导览，返回导览计划和第一个景点

class StartTourRequest(BaseModel):
    session_id: str
    route_id: str
    preferences: Optional[dict]

class StartTourResponse(BaseModel):
    tour_id: str
    route: Route
    first_spot: Spot
    narration: NarrationContent
    next_spots: List[Spot]

# POST /api/tour/progress
# 更新导览进度，返回下一个景点

class UpdateProgressRequest(BaseModel):
    tour_id: str
    current_spot_id: str
    completed: bool

class UpdateProgressResponse(BaseModel):
    next_spot: Optional[Spot]
    narration: Optional[NarrationContent]
    is_complete: bool

# GET /api/tour/{tour_id}/status
# 获取导览状态

class TourStatusResponse(BaseModel):
    tour_id: str
    status: str
    current_spot: Optional[Spot]
    progress: TourProgress
    recommendations: List[Spot]
```

#### 5.3.2 SSE事件扩展

```typescript
type TourEvent = GuideEvent |
  | { type: 'tour_started'; tourId: string; route: Route; firstSpot: Spot }
  | { type: 'spot_arrived'; spot: Spot; narration: NarrationContent }
  | { type: 'spot_completed'; spot: Spot; nextSpot: Spot }
  | { type: 'tour_completed'; stats: TourStats }
  | { type: 'navigation_started'; target: Spot; distance: number }
  | { type: 'navigation_progress'; distance: number; duration: number }
  | { type: 'tour_suggestion'; suggestion: TourSuggestion };
```

### 5.4 数据流设计

```
┌─────────────────────────────────────────────────────────────┐
│                    数据流架构                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  GPS     │───▶│ 场景     │───▶│ Tour     │              │
│  │  位置    │    │ 检测     │    │ Orch.    │              │
│  └──────────┘    └──────────┘    └────┬─────┘              │
│                                       │                     │
│  ┌──────────┐    ┌──────────┐         │                     │
│  │  用户    │───▶│ 偏好     │─────────┤                     │
│  │  操作    │    │ 管理     │         │                     │
│  └──────────┘    └──────────┘         │                     │
│                                       ▼                     │
│                              ┌──────────────┐              │
│                              │  后端 API     │              │
│                              │  SSE 推送     │              │
│                              └──────┬───────┘              │
│                                     │                       │
│  ┌──────────┐    ┌──────────┐      │                       │
│  │  页面    │◀───│ 组件     │◀─────┘                       │
│  │  渲染    │    │ 响应     │                              │
│  └──────────┘    └──────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 实施计划

### 阶段一：核心基础设施（3-5天）

- [ ] 创建 `useTourOrchestrator` Hook
- [ ] 实现 TourOrchestrator 状态机
- [ ] 扩展后端 Tour API
- [ ] 集成 SSE 事件推送

### 阶段二：核心页面改造（5-7天）

- [ ] 改造首页（导览入口）
- [ ] 改造景点详情页（讲解节点）
- [ ] 改造路线列表页（路线选择）
- [ ] 改造路线详情页（导览流程）

### 阶段三：辅助页面改造（3-5天）

- [ ] 改造地图页（导航节点）
- [ ] 改造聊天页（互动节点）
- [ ] 改造记忆页（回顾节点）
- [ ] 改造历史页（文化节点）

### 阶段四：体验优化（3-5天）

- [ ] 添加导览进度指示器
- [ ] 添加导航遮罩组件
- [ ] 优化数字人讲解体验
- [ ] 添加导览完成奖励

### 阶段五：测试与优化（2-3天）

- [ ] 端到端测试导览流程
- [ ] 优化性能和响应速度
- [ ] 修复bug和问题
- [ ] 用户反馈收集

---

## 7. 关键设计决策

### 7.1 主动导览 vs 自由探索

**决策**: 默认开启主动导览模式，用户可随时切换到自由模式

**理由**:
- 首次用户需要引导，主动导览提供完整体验
- 老用户可切换到自由模式，灵活自主
- 两种模式共享底层组件，降低维护成本

### 7.2 页面间导览连续性

**决策**: 使用全局状态管理导览进度，支持断点续览

**理由**:
- 用户可能中途退出，需要保留进度
- 全局状态避免页面间重复请求
- 支持跨页面导览流程

### 7.3 数字人讲解触发时机

**决策**: 基于GPS到达 + 用户确认触发讲解

**理由**:
- 避免自动播放打扰用户
- 用户确认后播放，体验更好
- GPS到达确保用户确实在景点

---

## 8. 风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| GPS精度不足 | 导航不准确 | 结合地图API，提供手动确认 |
| 数字人讲解枯燥 | 用户流失 | 优化讲解词，增加互动 |
| 性能问题 | VRM渲染卡顿 | 按需加载，降低渲染质量 |
| 网络不稳定 | SSE断连 | 本地缓存，自动重连 |
| 用户拒绝导览 | 功能闲置 | 提供自由模式，不强求 |

---

## 9. 成功指标

| 指标 | 目标 | 测量方式 |
|------|------|---------|
| 导览完成率 | > 60% | 后端统计 |
| 用户满意度 | > 4.5/5 | 问卷调查 |
| 平均游览时间 | 增加30% | 后端统计 |
| 数字人交互次数 | > 5次/游览 | 前端埋点 |
| 自由模式切换率 | < 30% | 前端埋点 |

---

## 10. 总结

本重构方案将现有的**"自由探索 + 被动提示"**模式升级为**"主动导览 + 自由探索"**模式，核心变化：

1. **数字人主导**: 从被动响应改为主动引导，提供完整导览体验
2. **页面连贯**: 每个页面都融入数字人讲解，形成完整游览流程
3. **状态机管理**: 使用 TourOrchestrator 管理导览状态和流程
4. **保留自由**: 用户可随时切换到自由探索模式
5. **复用现有**: 最大化利用现有组件和页面，降低重构成本

通过本方案，用户将获得**像有贴心导游全程陪同**的沉浸式导览体验，同时保留自由探索的灵活性。
