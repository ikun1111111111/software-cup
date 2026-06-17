# 数字人全场景导览 · 移动端设计文档

> 📌 目标：让 VRM 数字人贯穿每个页面 — 自动讲解、即时问答、GPS 导航、表情/手势联动
> 📌 平台：移动端 React Native (Expo)
> 📌 数字人：VRM 3D 模型（three.js + @pixiv/three-vrm）
> 📌 范围：移动端组件 + 后端 guide API
> 📌 状态：设计完成，待开发

---

## 一、需求概述

### 1.1 四个核心需求

| # | 需求 | 说明 |
|---|------|------|
| 1 | **页面自动讲解** | 进入每个页面时询问用户是否需要讲解，确认后播放固定讲解文字 + TTS |
| 2 | **页面内问答** | 提供提问框，用户提问后通过 RAG 等技术回答 |
| 3 | **实时位置导航** | 在景区导览等页面实时告知用户位置，提供方向指引 |
| 4 | **文字驱动表情/动作** | 数字人根据讲解/回答文字内容自动触发匹配的表情和手势 |

### 1.2 移动端技术栈

| 技术 | 说明 |
|------|------|
| **React Native + Expo** | 移动端框架，使用 Expo Router 进行路由管理 |
| **VRM 数字人** | 使用 three.js + @pixiv/three-vrm 渲染 3D VRM 模型 |
| **expo-location** | GPS 定位与位置监听 |
| **AsyncStorage** | 本地持久化存储（替代 sessionStorage） |
| **StyleSheet** | React Native 原生样式系统 |
| **Bottom Sheet** | 使用 @gorhom/bottom-sheet 实现底部弹出面板 |

### 1.3 现有移动端能力复用

| 现有模块 | 已有能力 | 本次使用方式 |
|----------|---------|-------------|
| `VRMFloating` | VRM 数字人悬浮组件，支持表情/口型 | 作为全局数字人渲染出口 |
| `VRMManager` | 单例管理器，控制数字人状态 | 统一管理页面上下文与讲解状态 |
| `useVRMSpeak` | 数字人说话 Hook | 复用 TTS + 口型同步能力 |
| 移动端 ChatPage | SSE 流式问答 | 复用 SSE 链路嵌入各页面 |
| 地图页面 | GPS 定位 + 距离计算 | 扩展为导航指引 |

---

## 二、整体架构

### 2.1 移动端组件关系图

```
各页面 (app/(tabs)/index.tsx / app/map.tsx / app/attractions.tsx / ...)
  │
  ├─ PageGuideProvider (Context) ◄── 监听路由变化，下发 pageContext
  │    │
  │    ├─ AutoGuideEngine ────────► 底部弹出讲解面板 → 用户确认 → TTS 播放
  │    │
  │    ├─ InPageQuestionBox ──────► 底部提问面板 → SSE → 流式回答
  │    │
  │    └─ LocationGuide ─────────► GPS 定位播报 + 方向指引 (仅地图页面)
  │
  └─ VRMFloating ◄─────────────── 全局悬浮 VRM 数字人（表情/手势/口型/TTS）
       ├─ SpeakingExpressionController (VRM blendShape)
       ├─ SpeakingGestureController (VRM bone rotation)
       └─ LipSync + AudioSync
```

### 2.2 移动端数据流

```
Expo Router 路由变化
  → PageGuideProvider 检测 route name
  → 匹配 PAGE_GUIDE_MAP[route]
  → AutoGuideEngine 弹出底部面板
  → 用户交互分支：
       ├─ "需要讲解" → VRMManager.speak(config.welcomeText)
       │                → VRMFloating isSpeaking=true
       │                → SpeakingExpressionController 分析文字 → VRM 表情
       │                → SpeakingGestureController 分析文字 → VRM 骨骼旋转
       │
       ├─ "提问" → InPageQuestionBox 底部面板展开
       │            → 用户输入 → POST /api/chat/stream (SSE)
       │            → 流式渲染回答
       │            → VRMManager.speak(answer) → 表情/手势联动
       │
       └─ "导航" → LocationGuide (仅地图页面)
                    → expo-location 获取 GPS
                    → 计算最近景点 + 方位角
                    → 方向指引文字 → VRMManager.speak() → 数字人指示手势
```

---

## 三、详细设计

### 3.1 页面讲解配置 (PAGE_GUIDE_MAP)

**文件**: `software/mobile/config/pageGuide.ts`

每个页面一条配置，控制进入时的行为：

| 字段 | 类型 | 说明 |
|------|------|------|
| `pageId` | `string` | 页面唯一标识 |
| `welcomeText` | `string` | 欢迎讲解文字 |
| `autoSpeak` | `boolean` | 是否自动朗读讲解词 |
| `quickQuestions` | `string[]` | 推荐问题（2-5 条） |
| `locationTip` | `string?` | 导航页面专属位置提示 |
| `guideType` | `'auto' \| 'manual' \| 'none'` | 讲解触发方式 |

移动端页面配置：

| 路由 | pageId | welcomeText (摘要) | autoSpeak | 快捷问题示例 |
|------|--------|-------------------|-----------|-------------|
| `(tabs)/index` | `home` | 欢迎来到智慧灵山，我是小灵… | false | 必去景点？推荐路线？ |
| `(tabs)/attractions` | `attractions` | 这里是景点大全… | true | 大佛多高？梵宫有什么？ |
| `(tabs)/map` | `map` | 这是导览地图… | true | 最近景点？大佛怎么走？ |
| `(tabs)/recommend` | `recommend` | 为你个性化推荐路线… | false | 半日游推荐？带老人怎么走？ |
| `(tabs)/history` | `history` | 历史探索记录… | false | 没去过的景点？ |
| `attraction/[id]` | `attraction-detail` | 当前景点详情… | true | 讲个故事？历史由来？ |
| `chat` | `chat` | (已有完整 UI) | - | - |

### 3.2 页面上下文 Provider

**文件**: `software/mobile/contexts/PageGuideContext.tsx`

```typescript
// React Native Context 定义
interface PageGuideContext {
  currentPageId: string
  config: PageGuideConfig | null
  guideState: 'idle' | 'prompting' | 'speaking' | 'questioning' | 'dismissed'
  requestGuide(): void          // 触发讲解
  dismissGuide(): void           // 关闭讲解
  openQuestion(): void           // 打开提问
  closeQuestion(): void          // 关闭提问
  setGuideState(state): void     // 设置状态
}
```

**路由检测机制**：
- 使用 Expo Router 的 `usePathname()` 监听路由变化
- 通过 `PAGE_GUIDE_MAP` 前缀匹配找到对应配置
- `guideState` 初始为 `'prompting'`，用户交互后切换

**会话跳过逻辑**：
- 用户点击"不用了"→ `AsyncStorage` 记录 `guide_dismissed_{pageId}=1`
- 同次会话内同一页面不再弹出
- 用户可主动点击数字人重新触发

### 3.3 自动讲解引擎

**文件**: `software/mobile/components/guide/AutoGuideEngine.tsx`

#### 3.3.1 移动端交互流程

```
进入页面
  │
  ├─ AsyncStorage 已标记跳过？
  │   ├─ 是 → 不弹出，guideState = 'dismissed'
  │   └─ 否 → 继续
  │
  ▼
显示底部讲解面板 (guideState = 'prompting')
┌──────────────────────────────────┐
│  🤖 小灵                          │
│  欢迎来到灵山胜境！我是你的数字    │
│  导览员小灵。有任何问题都可以      │
│  随时问我~                         │
│                                  │
│  [需要讲解 ▶]  [不用了 ✕]         │
│  [随便问问 ↓]                     │
└──────────────────────────────────┘
  │
  ├─ "需要讲解"
  │   → guideState = 'speaking'
  │   → 调用 VRMManager.speak(welcomeText)
  │   → VRMFloating 播放讲解词 + 表情/手势
  │   → 播放完毕 → guideState = 'idle'
  │
  ├─ "不用了"
  │   → AsyncStorage 记录
  │   → guideState = 'dismissed'
  │
  └─ "随便问问"
      → guideState = 'questioning'
      → 展开 InPageQuestionBox 底部面板
```

#### 3.3.2 移动端 UI 形态

使用 **@gorhom/bottom-sheet** 实现底部弹出面板：

| 页面类型 | 形态 | 位置 | 高度 |
|---------|------|------|------|
| HomePage | 底部面板 | 屏幕底部 | 200px |
| 景点列表 | 底部面板 | 屏幕底部 | 200px |
| 地图导览 | 底部面板 | 屏幕底部（覆盖地图） | 240px |
| 景点详情 | 底部面板 | 屏幕底部 | 200px |

**底部面板特性**：
- 支持拖拽调整高度（snapPoints: [200, 400]）
- 背景半透明毛玻璃效果
- 圆角顶部（borderRadius: 24）
- 可完全关闭或展开

### 3.4 页面内提问框

**文件**: `src/components/DigitalHuman/InPageQuestionBox.tsx`

#### 3.4.1 架构

复用 `ChatPage` 已有的核心能力，但不复制整个 UI：

```
InPageQuestionBox
  ├─ 输入区
  │   ├─ 文字输入框
  │   └─ 语音按钮 (VoiceInput)
  │
  ├─ 快捷问题行 (scrollable chips)
  │   └─ 来自 PageGuideConfig.quickQuestions
  │
  ├─ 回答区
  │   ├─ ChatBubble (复用)
  │   └─ ThinkingIndicator (复用)
  │
  └─ 数据链路
      ├─ useSSE (复用) → /api/chat/stream
      ├─ synthesizeSpeech (复用) → TTS
      └─ detectEmotion (复用) → 表情
```

#### 3.4.2 与 ChatPage 的区别

| 特性 | ChatPage | InPageQuestionBox |
|------|----------|-------------------|
| 数字人展示 | 全尺寸 (440×720) | 无（由页面已有数字人负责） |
| 消息历史 | 完整会话列表 | 仅当前问题回答 |
| 快捷问题 | 7 个固定 | 来自 pageContext 配置 |
| 布局 | 左右分栏 | 底部面板/侧边抽屉 |

### 3.5 GPS 实时导航

**文件**: `src/components/DigitalHuman/LocationGuide.tsx`

#### 3.5.1 功能

仅在 `/map` 页面激活，包含以下子能力：

**位置播报**：
```
进入 /map 页面
  → useGeolocation 获取当前位置
  → 计算与各景点距离 (已有 calcDistance)
  → 找出最近景点
  → 数字人说: "你现在在灵山大佛附近，距你约 320 米"
```

**主动推荐**：
```
用户未选择景点时:
  → 找出 2-3 个最近景点
  → 数字人说: "附近有灵山大佛(320m)、梵宫(500m)，想去哪里？"
```

**方向指引**：
```
用户选择/提问: "我想去梵宫"
  → 计算当前坐标与目标坐标的方位角
  → 方位角 → 文字描述 (东南/西北等 8 个方向)
  → 数字人说: "从这里出发，往东南方向走约 500 米"
  → 同时做 PRESENT_RIGHT 手势指向方向
  → 更新导航状态，到达时提醒
```

**到达提醒**：
```
导航进行中:
  → 每 30 秒检查一次距离
  → 距离 < 50m → "你已经快到梵宫了，前面路口右转"
  → 距离 < 20m → "到达梵宫！需要我详细介绍吗？"
```

#### 3.5.2 方位角计算

```typescript
function calcBearing(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(toLat * Math.PI / 180);
  const x = Math.cos(fromLat * Math.PI / 180) * Math.sin(toLat * Math.PI / 180)
          - Math.sin(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * Math.cos(dLng);
  const bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;

  const directions = ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北'];
  return directions[Math.round(bearing / 45) % 8];
}
```

### 3.6 表情/手势关键词扩展

#### 3.6.1 SpeakingExpressionController 扩展

**文件**: `src/components/DigitalHuman/SpeakingExpressionController.tsx`

在现有 `analyzeSentiment` 函数中新增关键词组：

| 情感 | 新增关键词 | 场景 |
|------|-----------|------|
| `surprised` | '大佛', '宏伟', '壮观', '高达', '世界第一', '震撼', '不可思议' | 景点惊叹 |
| `happy` | '欢迎', '你好', '来到', '推荐', '精彩', '美', '漂亮' | 欢迎/推荐 |
| `relaxed` | '历史', '千年', '古老', '传统', '文化', '由来', '佛教', '禅' | 文化讲解 |
| `sad` | '毁坏', '消失', '遗憾', '沧桑', '历经' | 历史沧桑 |
| `neutral` | '距离', '米', '公里', '方向', '分钟', '路线' | 导航信息 |

#### 3.6.2 SpeakingGestureController 扩展

**文件**: `src/components/DigitalHuman/SpeakingGestureController.tsx`

在 `classifyGesture` 函数中新增规则：

| 手势 | 触发关键词 | 说明 |
|------|-----------|------|
| `WAVE_RIGHT` | '你好', '欢迎', '大家好', '各位' (已有) | 挥手欢迎 |
| `PRESENT_RIGHT` | '右边', '东侧', '往右', '梵宫', '大佛' | 右手指向景点 |
| `PRESENT_LEFT` | '左边', '西侧', '往左', '这里' | 左手指引 |
| `PRESENT_BOTH` | '前方', '直走', '前面', '整个', '全部' | 双手示意方向 |
| `EMPHASIZE` | '注意', '重要', '必去', '推荐', '记得' | 双手强调 |
| `THINK` | '历史', '传说', '故事', '由来', '为什么' | 思考手势 |
| `GESTURE_REST` | 默认 | 自然站立 |

---

## 四、后端设计

### 4.1 Guide API

**文件**: `backend/app/api/guide.py`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/guide/page/{page_id}` | GET | 返回页面讲解配置（讲解词 + 快捷问题） |
| `/api/v1/guide/navigation` | POST | 计算步行导航指令 |
| `/api/v1/guide/nearest` | POST | 返回最近景点列表 |

#### 4.1.1 GET `/api/v1/guide/page/{page_id}`

```json
// Response
{
  "pageId": "map",
  "welcomeText": "这是灵山景区导览地图，我会实时告诉你位置和推荐路线。",
  "quickQuestions": ["离我最近的景点？", "从这里到大佛怎么走？", "推荐步行路线"],
  "locationTip": "点击景点或告诉我你想去哪里"
}
```

#### 4.1.2 POST `/api/v1/guide/navigation`

```json
// Request
{
  "fromLat": 31.4852,
  "fromLng": 120.0986,
  "toLat": 31.4876,
  "toLng": 120.1023,
  "toName": "梵宫"
}

// Response
{
  "direction": "东南",
  "distanceMeters": 520,
  "walkingTimeMinutes": 7,
  "instruction": "从当前位置出发，沿主路向东南方向步行约 520 米，大约 7 分钟即可到达梵宫。",
  "landmarks": ["经过九龙灌浴", "前方路口右转"]
}
```

#### 4.1.3 POST `/api/v1/guide/nearest`

```json
// Request
{
  "lat": 31.4852,
  "lng": 120.0986,
  "limit": 3
}

// Response
[
  {
    "name": "灵山大佛",
    "distanceMeters": 320,
    "walkingTimeMinutes": 4,
    "direction": "正北"
  },
  {
    "name": "梵宫",
    "distanceMeters": 520,
    "walkingTimeMinutes": 7,
    "direction": "东南"
  }
]
```

### 4.2 与现有 RAG 的关系

本次升级**不新增** RAG 端点。页面内提问框直接复用已有的 `/api/chat/stream` SSE 端点，所有回答都走同样的 LLM + 知识库链路。

---

## 五、组件清单

### 5.1 新增文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/config/pageGuide.ts` | 配置 | 页面讲解配置表 |
| `src/contexts/PageGuideContext.tsx` | Context | 页面上下文 Provider |
| `src/components/DigitalHuman/AutoGuideEngine.tsx` | 组件 | 自动讲解气泡 |
| `src/components/DigitalHuman/InPageQuestionBox.tsx` | 组件 | 页面内提问框 |
| `src/components/DigitalHuman/LocationGuide.tsx` | 组件 | GPS 导航指引 |
| `backend/app/api/guide.py` | API | 页面讲解/导航 API |

### 5.2 修改文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `SpeakingExpressionController.tsx` | 扩展 | 新增景区关键词组 |
| `SpeakingGestureController.tsx` | 扩展 | 新增方位/指示关键词 |
| `HomePage.tsx` | 嵌入 | 包裹 Provider + AutoGuideEngine |
| `MapGuidePage.tsx` | 嵌入 | 包裹 Provider + LocationGuide |
| `AttractionList.tsx` | 嵌入 | 包裹 Provider + AutoGuideEngine |
| `AttractionDetail.tsx` | 嵌入 | 包裹 Provider + AutoGuideEngine |
| `RecommendPage.tsx` | 嵌入 | 包裹 Provider + AutoGuideEngine |
| `HistoryExplore.tsx` | 嵌入 | 包裹 Provider + AutoGuideEngine |
| `backend/app/main.py` | 注册 | 注册 guide 路由 |

---

## 六、页面嵌入形态详述

### 6.1 HomePage — 数字人展示区

现有 HomePage 已有 `DigitalHumanSection` (730-882 行)，包含全尺寸数字人 (360×480)。

**改动**：在现有基础上增加 AutoGuideEngine 气泡，从数字人嘴边弹出，与现有 "开始对话" 按钮并列。

### 6.2 MapGuidePage — 地图覆盖面板

地图页面没有数字人。需要在地图右下角（或底部）嵌入：
- 小型数字人 (200×280)
- LocationGuide 面板覆盖在地图上
- 自动讲解气泡在地图上方弹出

### 6.3 AttractionList — 顶部横幅

景点列表页面无数字人。在列表顶部嵌入：
- AutoGuideEngine 横幅（全宽×120）
- 点击展开后可看到小型数字人

### 6.4 AttractionDetail — 嵌入式卡片

景点详情页可能有数字人（从 VisionPage 导航过来时）。在详情顶部嵌入讲解卡片。

---

## 七、实施优先级

### P0 — 比赛演示核心路径

1. `PageGuideContext` + `PAGE_GUIDE_MAP` 基础设施
2. `AutoGuideEngine` 讲解气泡 + TTS 联动
3. `SpeakingExpressionController` / `SpeakingGestureController` 关键词扩展
4. `HomePage` + `MapGuidePage` 两个页面接入

### P1 — 完整体验

5. `InPageQuestionBox` 页面内提问框
6. `LocationGuide` GPS 导航
7. 剩余页面（AttractionList/Detail, Recommend, History）接入

### P2 — 后端增强

8. `guide.py` 后端 API（导航计算、最近景点）
9. 讲解词精细化（后端 LLM 动态生成 vs 前端固定文案）

---

## 八、技术约束与注意事项

### 8.1 性能

- 自动讲解气泡为**轻量 DOM 组件**，不加载 Live2D 模型（模型由页面已有 DigitalHuman 负责）
- GPS 轮询频率：导航中每 5 秒更新，空闲时每 30 秒更新
- TTS 调用复用已有 `synthesizeSpeech` 函数，无新增网络请求

### 8.2 兼容性

- 所有新组件为**纯 React 组件**，不修改现有组件内部逻辑
- `DigitalHuman` 组件接口不变，通过 props 控制
- 后端 guide API 为新增端点，不影响现有 `/api/chat/*` 端点

### 8.3 降级策略

- GPS 不可用 → LocationGuide 显示 "定位不可用，请手动选择景点"
- TTS 失败 → 仅文字展示，数字人不播放
- SSE 超时 → 显示错误 Toast，允许重试
- 无网络 → AutoGuideEngine 显示离线提示，不弹出讲解

---

## 九、关键交互时序

### 9.1 页面进入 → 讲解 → 提问 完整时序

```
时间轴    前端                          后端
  │
  ├─ 路由 /map
  │  PageGuideProvider 检测 pathname
  │  匹配 PAGE_GUIDE_MAP['map']
  │
  ├─ AutoGuideEngine 弹出气泡
  │  "这是灵山景区导览地图…"
  │
  ├─ 用户点 "需要讲解"
  │  speakText(welcomeText) ─────────┐
  │  TTS 合成音频 ◄──────────────────┘
  │  DigitalHuman 播放 + 表情/手势
  │
  ├─ 用户点 "随便问问"
  │  InPageQuestionBox 展开
  │
  ├─ 用户输入 "梵宫怎么走？"
  │  POST /api/chat/stream ──────────┐
  │  SSE token 流 ◄──────────────────┘
  │  ChatBubble 流式渲染
  │  speakText(answer) ──────────────┐
  │  TTS + 表情(surprised) ◄─────────┘
  │  手势(PRESENT_RIGHT)
  │
  ├─ LocationGuide 补充:
  │  "距你 800m，向东南方向"
  │  calcBearing() → "东南"
  │
  └─ 数字人做 PRESENT_RIGHT 手势
     指向右侧
```

---

## 十、后续扩展（不在本次范围）

| 扩展项 | 说明 |
|--------|------|
| LLM 动态讲解词 | 后端根据页面上下文 + 用户历史动态生成讲解词，而非固定文案 |
| 多角色切换 | 不同页面/景点使用不同数字人角色 |
| 语音唤醒 | 长按数字人或说"小灵"唤醒 |
| AR 叠加 | 摄像头实景 + 数字人叠加指引方向 |
| 多人协同导览 | RoomPage 中多个用户共享同一数字人视角 |
