# 数字人主动带领导览 — 移动端设计方案

> 版本: v2.0 | 日期: 2026-06-17  
> 平台: React Native (Expo) + FastAPI 后端  
> 关联文档: `docs/mobile-migration/react-native-migration-plan.md`

---

## 1. 背景与目标

### 1.1 现状问题

当前移动端 App 是**被动应答模式**：游客自己浏览页面、点击景点、主动提问，VRM 数字人只负责回答。这导致：

- 游客不知道从哪开始、按什么顺序游览
- 数字人缺乏主动性，体验像"搜索引擎"而非"真人导游"
- 景点之间的串联、转场叙事缺失，游览体验碎片化

### 1.2 目标

实现**数字人主动带领模式（Guide-Driven Tour）**：

- 游客选择路线后，VRM 数字人全程带领，主动讲解、导航、互动
- 数字人从"应答器"升级为"导游"，具备叙事节奏和情感表达
- 游客可随时语音打断提问，数字人回答后自动恢复导览
- 结合 GPS 实时定位，到达景点自动触发讲解

### 1.3 与现有移动端架构的关系

本方案是 `react-native-migration-plan.md` 中「禅径通幽」功能的升级版：

| 原文档定义 | 本方案升级 |
|-----------|-----------|
| 禅径通幽 = 地图导航 + VRM 浮窗讲解 | **全流程导览**：选路线 → 数字人带路 → 逐站讲解 → 互动 → 结束 |
| VRM 浮窗被动显示 | VRM 浮窗**主动驱动**：自动开口、表情变化、口型同步 |
| 手动点击景点触发讲解 | **GPS 到达自动触发** + 手动推进双模式 |

---

## 2. 现有能力盘点（移动端可复用）

| 能力 | 来源 | 复用方式 |
|------|------|----------|
| VRM 3D 数字人 | `VRMManager` 全局单例 | 直接复用，浮窗模式（80×110pt） |
| VRM 口型同步 | `useVRMSync` hook | TTS → phoneme → `setMouthOpen()` |
| VRM 表情控制 | `VRMManager.setExpression()` | 根据讲解情感切换 happy/surprised/neutral |
| TTS 语音合成 | `backend/app/core/tts.py` | 讲解文本 → 流式 MP3 + phoneme 时间戳 |
| RAG 知识检索 | `backend/app/core/rag.py` | 景点深度讲解内容检索 |
| 聊天管道 | `backend/app/services/chat_service.py` | 游客打断提问 → RAG → LLM 回答 |
| 推荐引擎 | `backend/app/core/recommender.py` | 导览结束后推荐下一站 |
| 路线数据 | `TourRoute` 模型 | 预设游览路线（spot_order） |
| 景点数据 | `ScenicSpot` 模型 | 12 个景点，含经纬度（GPS 触发用） |
| 角色系统 | `ROLE_PROMPTS` | 5 种角色人设 prompt |
| 故事讲解 | `SYSTEM_PROMPT_STORY` | 景点叙事 prompt |
| 解谜互动 | `SYSTEM_PROMPT_PUZZLE` | 景点选择题生成 |
| 地图导航 | `react-native-maps` + GPS | 路线 Polyline + 实时定位 + 步行导航 |
| 语音录制 | `expo-av` AudioRecorder | 游客语音打断提问 |
| 音频播放 | `expo-av` Audio.Sound | TTS 音频播放 |
| SSE 通信 | `useSSE` hook | 后端事件流推送 |

---

## 3. 架构设计

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                  TourConductor (后端状态机)                    │
│                                                              │
│  状态流转:                                                    │
│  idle → greeting → navigating → narrating_overview           │
│       → narrating_story → interactive → transitioning        │
│       → (下一站 navigating → ...) → farewell → idle          │
│                                                              │
│  任何状态 + user_interrupt → answering → (恢复原状态)          │
│  GPS 到达景点 → 自动触发 narrating                             │
└──────────┬──────────────┬──────────────┬─────────────────────┘
           │              │              │
     ┌─────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │ Route      │ │ RAG/LLM  │ │ TTS         │
     │ Engine     │ │ Pipeline │ │ Pipeline    │
     │ (路线推进)  │ │ (内容生成) │ │ (语音合成)   │
     └────────────┘ └──────────┘ └─────────────┘
           │              │              │
     ┌─────▼──────────────▼──────────────▼─────┐
     │         SSE 事件流 (单向推送)              │
     │  event: speak / navigate / quiz / done   │
     └──────────────────┬──────────────────────┘
                        │
     ┌──────────────────▼──────────────────────────────────┐
     │            移动端 TourScreen (Expo Router)            │
     │                                                      │
     │  ┌──────────────────────────────────────────────┐    │
     │  │                                              │    │
     │  │       MapView (react-native-maps)             │    │
     │  │   [Marker 景点] [Polyline 路线] [用户位置]     │    │
     │  │                                              │    │
     │  │                                        ┌───┐ │    │
     │  │                                        │VRM│ │    │ ← VRM 浮窗
     │  │                                        │小窗│ │    │   80×110pt
     │  │                                        └───┘ │    │
     │  └──────────────────────────────────────────────┘    │
     │                                                      │
     │  ┌──────────────────────────────────────────────┐    │
     │  │  BottomSheet (底部卡片)                       │    │
     │  │  第 2/5 站 · 梵宫                             │    │
     │  │  "梵宫被誉为东方卢浮宫..."                      │    │ ← 讲解字幕
     │  │  [⏸暂停] [⏭跳过] [▶下一站]                    │    │ ← 控制按钮
     │  │  [🎤 按住说话，随时提问]                       │    │ ← 语音打断
     │  └──────────────────────────────────────────────┘    │
     └──────────────────────────────────────────────────────┘
```

### 3.2 通信协议

采用 **SSE（Server-Sent Events）** 单向推送，复用现有 `useSSE` hook：

```
POST /api/tour/stream
Body: {
  session_id: string,
  route_id: string,
  role_id: string,
  action: "start" | "advance" | "skip" | "interrupt" | "arrived",
  payload?: { question?: string, spot_id?: string }
}

SSE 事件类型:
  event: speak       → 数字人说话 { text, emotion }
  event: token       → 流式文本 { token, index }
  event: audio       → 流式音频 { data (base64) }
  event: phonemes    → 口型数据 { data: Phoneme[] }
  event: navigate    → 导航指令 { from_spot, to_spot, path_coords, distance_m, eta_seconds }
  event: highlight   → 地图高亮 { spot_id, zoom_level, center: {lat, lng} }
  event: quiz        → 互动题目 { question, options[], answer_index, explanation }
  event: state       → 状态变更 { state, stop_index, total_stops, spot_name }
  event: done        → 当前阶段完成 { next_action_hint }
  event: error       → 错误 { error }
```

---

## 4. 状态机设计

### 4.1 状态定义

```python
class TourState(str, Enum):
    IDLE              = "idle"
    GREETING          = "greeting"            # 开场白
    NAVIGATING        = "navigating"          # 导航中（GPS 步行到下一站）
    NARRATING_OVERVIEW = "narrating_overview" # 景点概览
    NARRATING_STORY   = "narrating_story"     # 深度故事
    INTERACTIVE       = "interactive"         # 互动问答
    TRANSITIONING     = "transitioning"       # 转场过渡
    FAREWELL          = "farewell"            # 结束语
    ANSWERING         = "answering"           # 回答打断提问
```

### 4.2 状态流转图

```
                         ┌──────────────────────────────────────┐
                         │         用户语音打断提问               │
                         │    (任何状态 → ANSWERING → 恢复)      │
                         └──────────────────────────────────────┘
                                          │
    ┌──────────┐    ┌───────────┐    ┌────▼──────┐    ┌──────────────────┐
    │  IDLE    │───▶│ GREETING  │───▶│ NAVIGATING│───▶│ NARRATING_OVERVIEW│
    └──────────┘    └───────────┘    └───────────┘    └────────┬─────────┘
                                    ▲                          │
                                    │ GPS 到达/手动     ┌───────┘
                                    │                   ▼
                              ┌─────┴─────┐    ┌───────────────┐
                              │ NARRATING_STORY│───▶│ INTERACTIVE │
                              └───────────────┘    └──────┬──────┘
                                                          │
                                    ┌─────────────────────┤
                                    │ 还有下一站           │ 最后一站
                                    ▼                     ▼
                              ┌───────────┐        ┌──────────┐
                              │TRANSITIONING│      │ FAREWELL │──▶ IDLE
                              └─────┬─────┘        └──────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │ NAVIGATING │ (下一站)
                              └───────────┘
```

### 4.3 每个状态的行为

| 状态 | 内容来源 | 时长 | VRM 表情 | VRM 模式 | 用户操作 |
|------|----------|------|----------|----------|---------|
| GREETING | LLM（角色 prompt + 路线信息） | 15-20s | happy | 浮窗 | 可跳过 |
| NAVIGATING | LLM（导航语 + 冷知识） | 根据 GPS 距离 | neutral | 浮窗 | 可跳过 |
| NARRATING_OVERVIEW | `ScenicSpot.overview` + LLM 润色 | 20-30s | happy | 浮窗 | 可跳过 |
| NARRATING_STORY | RAG + `SYSTEM_PROMPT_STORY` | 40-60s | surprised → happy | 浮窗 | 可跳过 |
| INTERACTIVE | `SYSTEM_PROMPT_PUZZLE` 选择题 | 用户决定 | surprised → happy | 浮窗 | 作答或跳过 |
| TRANSITIONING | LLM（承上启下 + 预告） | 10-15s | happy | 浮窗 | 可跳过 |
| FAREWELL | LLM（回顾 + 推荐 + 祝福） | 15-20s | happy | 浮窗 | — |
| ANSWERING | `chat_service.process_chat()` | 不定 | neutral | 浮窗 | 等待回答 |

---

## 5. 后端实现

### 5.1 新增文件

| 文件 | 职责 |
|------|------|
| `backend/app/services/tour_conductor.py` | 核心状态机 |
| `backend/app/api/tour.py` | Tour API 路由 |
| `backend/app/core/prompts_tour.py` | 导览专用 prompt 模板 |

### 5.2 TourConductor 核心类

```python
class TourConductor:
    """单次导览会话的状态机。

    每个 session_id 同一时间只有一个活跃导览。
    状态保存在 Redis（TTL 2h），支持 App 切后台再回来恢复。
    """

    def __init__(self, session_id: str, route_id: str, role_id: str, db: AsyncSession):
        self.session_id = session_id
        self.route_id = route_id
        self.role_id = role_id
        self.db = db
        self.state = TourState.IDLE
        self.current_stop_index = -1
        self.route: TourRoute | None = None
        self.spots: list[ScenicSpot] = []

    async def start(self) -> AsyncGenerator[TourEvent]:
        """开始导览，yield SSE 事件流。"""

    async def advance(self) -> AsyncGenerator[TourEvent]:
        """推进到下一个状态。"""

    async def interrupt(self, question: str) -> AsyncGenerator[TourEvent]:
        """用户打断提问，走 chat 管道回答后恢复。"""

    async def skip(self) -> TourEvent:
        """跳过当前阶段。"""

    async def on_arrived(self, spot_id: str) -> AsyncGenerator[TourEvent]:
        """GPS 到达景点，自动触发讲解。"""
        # 前端检测到用户进入景点 50m 范围时调用
```

### 5.3 Tour API

```python
router = APIRouter(prefix="/api/tour", tags=["tour"])

@router.post("/stream")
async def tour_stream(request: TourRequest):
    """统一 SSE 入口。根据 action 分发。"""
    # action: start / advance / skip / interrupt / arrived

@router.get("/state")
async def tour_state(session_id: str):
    """获取当前导览状态（App 从后台恢复时调用）。"""

@router.get("/routes")
async def tour_routes():
    """获取可选路线列表（复用现有 routes_api）。"""
```

### 5.4 导览 Prompt 模板

```python
TOUR_GREETING_PROMPT = """
你是灵山胜境的数字导游{role_name}。
游客刚刚选择了「{route_name}」路线，共 {total_stops} 个景点。
请生成一段热情的开场白，包含：
1. 问候语（符合你的角色风格）
2. 简要介绍这条路线的亮点
3. 预告第一个景点
控制在 80 字以内，适合口播朗读。
"""

TOUR_NAVIGATE_PROMPT = """
你是{role_name}，正在带游客从「{from_spot}」前往「{to_spot}」。
距离约 {distance} 米，步行约 {eta} 分钟。
请生成一段导航语，包含：
1. 方向指引（前后左右）
2. 途中一个有趣的小知识或观察提示
控制在 60 字以内。
"""

TOUR_TRANSITION_PROMPT = """
你是{role_name}，刚刚讲解完「{current_spot}」。
下一个景点是「{next_spot}」。
请生成一段过渡语：
1. 一句话总结刚才的景点
2. 预告下一个景点的看点，制造期待感
控制在 60 字以内。
"""

TOUR_FAREWELL_PROMPT = """
你是{role_name}，游览即将结束。
游客今天走过了以下景点：{visited_spots}。
请生成结束语：
1. 回顾今天的行程亮点
2. 推荐一个值得再来或附近的好去处
3. 以角色风格的祝福语收尾
控制在 100 字以内。
"""
```

---

## 6. 移动端实现

### 6.1 新增文件

```
mobile/
├── app/
│   └── tour/
│       ├── _layout.tsx              # Stack 导航
│       ├── index.tsx                # 导览入口（选路线 → 选角色）
│       └── active.tsx               # 导览进行中（地图 + VRM + 控制）
│
├── components/
│   └── tour/
│       ├── TourMapView.tsx          # react-native-maps 路线 + Marker
│       ├── TourBottomSheet.tsx      # 底部卡片（字幕 + 控制）
│       ├── TourQuizModal.tsx        # 互动答题弹窗
│       └── TourRouteSelector.tsx    # 路线选择卡片
│
├── hooks/
│   └── useTour.ts                  # 导览状态 + SSE + VRM 联动
│
└── api/
    └── tour.ts                     # Tour API 请求封装
```

### 6.2 useTour Hook

```typescript
// hooks/useTour.ts
import { useState, useCallback, useRef } from 'react';
import { useSSE } from './useSSE';
import { useVRMSync } from './useVRMSync';
import { useLocation } from './useLocation';
import { VRMManager } from '../components/vrm/VRMManager';

type TourPhase =
  | 'idle' | 'greeting' | 'navigating' | 'narrating_overview'
  | 'narrating_story' | 'interactive' | 'transitioning'
  | 'farewell' | 'answering';

interface TourState {
  status: 'idle' | 'active' | 'paused' | 'ended';
  phase: TourPhase;
  currentStopIndex: number;
  totalStops: number;
  currentSpot: { id: string; name: string; lat: number; lng: number } | null;
  subtitle: string;              // 当前讲解字幕（流式拼接）
  emotion: string;               // VRM 表情
  isSpeaking: boolean;
  audioChunks: string[];         // SSE 音频块 → expo-av 播放
  phonemes: Phoneme[];           // 口型数据 → VRMManager.setMouthOpen()
  quiz: QuizData | null;
  routeCoords: { lat: number; lng: number }[];  // 地图 Polyline
}

interface TourActions {
  startTour: (routeId: string, roleId: string) => void;
  advance: () => void;
  skip: () => void;
  interrupt: (question: string) => void;  // 语音识别结果传入
  pause: () => void;
  resume: () => void;
  answerQuiz: (optionIndex: number) => void;
  notifyArrived: (spotId: string) => void;  // GPS 到达触发
}

export function useTour(sessionId: string): [TourState, TourActions] {
  const { speak: vrmSpeak } = useVRMSync();
  const { location } = useLocation();  // GPS 实时位置
  const stateRef = useRef<TourState>(initialState);

  // SSE 事件处理
  const handleEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'speak':
        // 1. 设置 VRM 表情
        VRMManager.setExpression(data.emotion);
        // 2. 更新字幕
        setState(s => ({ ...s, subtitle: data.text, emotion: data.emotion }));
        break;

      case 'audio':
        // 音频块 → expo-av 播放
        setState(s => ({ ...s, audioChunks: [...s.audioChunks, data.data] }));
        break;

      case 'phonemes':
        // phoneme 时间戳 → setTimeout → VRMManager.setMouthOpen()
        data.data.forEach(({ time, value }) => {
          setTimeout(() => VRMManager.setMouthOpen(value), time * 1000);
        });
        break;

      case 'navigate':
        // 更新地图 Polyline + 高亮
        setState(s => ({ ...s, routeCoords: data.path_coords }));
        break;

      case 'highlight':
        // 地图相机动画移动到景点
        mapRef.current?.animateCamera({
          center: { latitude: data.center.lat, longitude: data.center.lng },
        }, { duration: 1000 });
        break;

      case 'quiz':
        setState(s => ({ ...s, quiz: data }));
        break;

      case 'state':
        setState(s => ({
          ...s,
          phase: data.state,
          currentStopIndex: data.stop_index,
          totalStops: data.total_stops,
        }));
        break;

      case 'done':
        // 一段讲解结束，重置口型
        VRMManager.setMouthOpen(0);
        VRMManager.setExpression('neutral');
        break;
    }
  }, []);

  // GPS 接近检测：用户距离当前目标景点 < 50m 时自动触发
  useEffect(() => {
    if (!location || !stateRef.current.currentSpot) return;
    const dist = haversineDistance(
      location.latitude, location.longitude,
      stateRef.current.currentSpot.lat, stateRef.current.currentSpot.lng,
    );
    if (dist < 50 && stateRef.current.phase === 'navigating') {
      actions.notifyArrived(stateRef.current.currentSpot.id);
    }
  }, [location]);

  const sse = useSSE('/api/tour/stream', handleEvent);

  // ... actions 实现
  return [stateRef.current, actions];
}
```

### 6.3 导览入口页（选路线 → 选角色）

```
app/tour/index.tsx

┌──────────────────────────┐
│ StatusBar                │
├──────────────────────────┤
│ ← 返回    禅径通幽        │
│         让小灵带你游灵山   │
├──────────────────────────┤
│                          │
│  选择游览路线              │
│                          │
│  ┌────────────────────┐  │
│  │ 🏛 经典全景          │  │
│  │ 5 站 · 约 3 小时     │  │
│  │ 大照壁→大佛→禅寺→…   │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 🧘 禅意之旅          │  │
│  │ 3 站 · 约 1.5 小时   │  │
│  │ 菩提大道→梵宫→精舍   │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 👨‍👩‍👧 亲子欢乐    │  │
│  │ 4 站 · 约 2 小时     │  │
│  │ 佛手广场→百子戏弥勒→…│  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│  选择你的导游              │
│                          │
│  ┌────┐ ┌────┐ ┌────┐   │
│  │ 🤖 │ │ 🪷 │ │ 🧘 │   │
│  │小景│ │佛祖│ │禅师│   │
│  └────┘ └────┘ └────┘   │
│  ┌────┐ ┌────┐          │
│  │ 📸 │ │ 📜 │          │
│  │游客│ │徐霞│          │
│  │朋友│ │ 客 │          │
│  └────┘ └────┘          │
│                          │
│  ┌────────────────────┐  │
│  │    开始导览 →       │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### 6.4 导览进行页（核心页面）

```
app/tour/active.tsx

┌──────────────────────────┐
│ StatusBar                │
├──────────────────────────┤
│ ← 退出    禅径通幽    ⏸  │
├──────────────────────────┤
│                          │
│     MapView              │
│   (react-native-maps)    │
│                          │
│  📍大佛     📍禅寺        │
│     ·  ·  ·              │  ← Polyline 路线
│        👤 (我的位置)      │  ← GPS 实时定位
│          ↓               │
│        📍梵宫             │  ← 当前目标（高亮 Marker）
│                          │
│                    ┌───┐ │
│                    │VRM│ │  ← VRM 浮窗 (80×110pt)
│                    │小窗│ │    讲解时口型同步
│                    └───┘ │    表情随内容变化
│                          │
├──────────────────────────┤
│ ▼ 第 2/5 站 · 梵宫       │  ← BottomSheet 底部卡片
│ ─────────────────────── │    可上拉展开详情
│                          │
│ "梵宫被誉为东方卢浮宫，   │  ← 讲解字幕（流式）
│  内部珍藏着珍贵的佛教     │
│  艺术珍品..."             │
│                          │
│ ┌──────┐ ┌──────┐ ┌───┐ │
│ │ ⏸暂停 │ │ ⏭跳过 │ │▶下│ │  ← 控制按钮
│ └──────┘ └──────┘ │下一│ │
│                    │ 站 │ │
│ ┌──────────────────┴───┐ │
│ │ 🎤 按住说话，随时提问  │ │  ← 语音打断（expo-av 录音）
│ └──────────────────────┘ │
│                          │
├──────────────────────────┤
│ Tab Bar                  │
└──────────────────────────┘
```

### 6.5 VRM 数字人驱动链路

```
后端 SSE event: speak { text: "梵宫被誉为...", emotion: "happy" }
  │
  ├──→ TourBottomSheet: 流式显示字幕文本
  │
  ├──→ VRMManager.setExpression('happy')
  │
  └──→ SSE event: audio { data: base64 }
        │
        └──→ expo-av Audio.Sound: 播放 MP3
              │
              └──→ SSE event: phonemes { data: [{time: 0.1, value: 0.5}, ...] }
                    │
                    └──→ setTimeout → VRMManager.setMouthOpen(value)
                          │
                          └──→ VRMView 渲染循环读取 mouthOpen → 口型动画
```

**与现有 `useVRMSync` 的关系**：`useTour` 内部组合了 `useVRMSync`，SSE 事件驱动 VRM 的口型和表情，不需要改动 VRM 底层。

### 6.6 GPS 自动触发

```typescript
// useTour 内部 GPS 检测
const ARRIVAL_THRESHOLD_M = 50;  // 距离景点 50m 视为到达

useEffect(() => {
  if (phase !== 'navigating' || !currentSpot || !location) return;

  const dist = haversineDistance(
    location.latitude, location.longitude,
    currentSpot.lat, currentSpot.lng,
  );

  if (dist < ARRIVAL_THRESHOLD_M) {
    // 自动触发：通知后端到达
    notifyArrived(currentSpot.id);
    // 触觉反馈
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}, [location, phase, currentSpot]);
```

### 6.7 语音打断

```typescript
// 按住录音 → 语音识别 → 传给后端
const handleVoiceInterrupt = async () => {
  // 1. 暂停 TTS 播放
  audioRef.current?.pauseAsync();
  VRMManager.setMouthOpen(0);

  // 2. 录音（expo-av）
  const recording = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  // ... 等待用户松手
  const uri = await recording.stopAsync();

  // 3. 发送到后端 ASR（复用 /api/chat/asr）
  const question = await transcribeAudio(uri);

  // 4. 走 interrupt 管道
  sse.send({ action: 'interrupt', payload: { question } });
};
```

---

## 7. 打断处理

### 7.1 流程

```
用户在 NARRATING_STORY 状态按住 🎤 按钮提问: "这个佛像是谁捐的？"
  │
  ├── 1. expo-av 暂停 TTS 播放
  ├── 2. VRM 口型归零
  ├── 3. 后端保存 resume_state 到 Redis
  ├── 4. 状态 → ANSWERING
  ├── 5. 调 chat_service.process_chat(question, ...)
  ├── 6. SSE 流式返回回答（speak + audio + phonemes）
  ├── 7. VRM 开口说话（回答内容）
  ├── 8. 回答完毕
  ├── 9. 数字人说恢复语: "好，我们继续看梵宫..."
  └── 10. 恢复到 NARRATING_STORY，从断点继续
```

---

## 8. 数据流时序图

```
用户          RN 前端             后端 TourConductor     RAG/LLM       TTS
 │              │                       │                   │             │
 │──选路线+角色▶│                       │                   │             │
 │              │──POST /tour/stream───▶│                   │             │
 │              │   {action:"start"}    │──加载路线+景点───▶│             │
 │              │                       │──生成开场白──────▶│             │
 │              │                       │◀──greeting text──│             │
 │              │                       │──synthesize()───────────────▶│
 │              │                       │◀──audio+phonemes───────────│
 │              │◀──SSE: speak──────────│                   │             │
 │              │◀──SSE: audio──────────│                   │             │
 │              │◀──SSE: phonemes───────│                   │             │
 │              │                       │                   │             │
 │  (VRM 开口说话 + 口型同步 + 字幕显示 + 地图高亮)           │             │
 │              │                       │                   │             │
 │              │◀──SSE: navigate───────│                   │             │
 │              │──地图 Polyline 绘制───│                   │             │
 │              │──GPS 步行导航─────────│                   │             │
 │              │                       │                   │             │
 │──到达景点───▶│                       │                   │             │
 │              │──POST /tour/stream───▶│                   │             │
 │              │   {action:"arrived"}  │──生成讲解内容────▶│             │
 │              │                       │──...同上流程...    │             │
 │              │                       │                   │             │
 │──按住🎤提问▶│                       │                   │             │
 │              │──POST /tour/stream───▶│                   │             │
 │              │   {action:"interrupt"}│──chat_service()──▶│             │
 │              │                       │──...回答流程...    │             │
```

---

## 9. 路线数据

复用现有 `TourRoute` 模型，预设路线：

| 路线 ID | 名称 | 景点顺序 | 时长 | 距离 |
|---------|------|----------|------|------|
| classic | 经典全景 | 大照壁→大佛→祥符禅寺→九龙灌浴→梵宫 | 3h | 2.5km |
| zen | 禅意之旅 | 菩提大道→梵宫→灵山精舍 | 1.5h | 1.2km |
| family | 亲子欢乐 | 佛手广场→百子戏弥勒→九龙灌浴→大佛 | 2h | 1.8km |
| culture | 文化深度 | 大照壁→三圣殿→祥符禅寺→大佛→五印坛城 | 3.5h | 3km |

---

## 10. 开发计划

### Phase 1: 后端状态机（1.5 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| TourConductor 状态机 | `services/tour_conductor.py` | start/advance/skip/interrupt/on_arrived |
| 导览 prompt 模板 | `core/prompts_tour.py` | greeting/navigate/transition/farewell |
| Tour API | `api/tour.py` | 统一 SSE 入口 + state 查询 |
| Redis 状态持久化 | `services/tour_conductor.py` | App 切后台恢复 |

### Phase 2: 移动端导览 UI（2 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| useTour hook | `hooks/useTour.ts` | SSE + 状态管理 + GPS 检测 |
| 导览入口页 | `app/tour/index.tsx` | 选路线 + 选角色 |
| 导览进行页 | `app/tour/active.tsx` | 地图 + VRM + BottomSheet |
| TourMapView | `components/tour/TourMapView.tsx` | Polyline + Marker + 相机动画 |
| TourBottomSheet | `components/tour/TourBottomSheet.tsx` | 字幕 + 控制按钮 |

### Phase 3: VRM + 语音集成（1 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| VRM 联动 | `useTour.ts` | SSE → VRMManager.setExpression/setMouthOpen |
| TTS 音频播放 | `useTour.ts` | SSE audio → expo-av Audio.Sound |
| 语音打断 | `useTour.ts` | expo-av 录音 → ASR → interrupt |
| 触觉反馈 | `active.tsx` | expo-haptics 到达景点/答题正确 |

### Phase 4: 互动 + 打磨（1 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| TourQuizModal | `components/tour/TourQuizModal.tsx` | 选择题弹窗 |
| 导览结束记忆卡 | `active.tsx` | 复用 MemoryCard 生成游览总结 |
| 断线恢复 | `useTour.ts` | GET /tour/state → 恢复进度 |
| 后台保活 | `app.json` | 导航时防止 App 被杀 |

**总计: 约 5.5 天**

---

## 11. 关键设计决策

| 决策 | 选择 | 备选 | 理由 |
|------|------|------|------|
| 数字人 | VRM 3D 浮窗 | Live2D / 静态图 | 复用现有 VRMManager，与迁移方案一致 |
| 地图 | react-native-maps | 高德 SDK / SVG | 迁移方案已选定，GPS + Polyline 原生支持 |
| GPS 触发 | 50m 半径阈值 | QR 扫码触发 | GPS 更自然，QR 作为补充（到景点扫码也能触发） |
| 通信 | SSE | WebSocket | 单向推送为主，复用 useSSE hook |
| 状态存储 | Redis | AsyncStorage | 后端统一管，支持多端恢复 |
| 语音打断 | expo-av 录音 + 后端 ASR | 端侧语音识别 | 复用后端 ASR 管道，端侧精度不够 |
| 底部卡片 | 自定义 BottomSheet | @gorhom/bottom-sheet | 轻量，不需要拖拽库的完整功能 |
| 音频播放 | expo-av | react-native-track-player | 项目已有 expo-av 依赖，TTS 场景够用 |

---

## 12. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| LLM 生成延迟 > 3s | 用户等待体验差 | 1. 预生成下一站讲解（pipeline 并行）2. 先用模板兜底 |
| TTS 首包延迟 | 数字人开口慢 | 流式合成，首包到达即播放 |
| expo-gl VRM 发热 | 长时间导览手机发烫 | 1. 浮窗模式降低渲染分辨率 2. 限制 30fps 3. 不讲解时暂停渲染 |
| GPS 精度不足 | 到达检测不准 | 1. 50m 宽松阈值 2. QR 扫码作为补充触发 3. 手动点击"我到了" |
| App 切后台被杀 | 导览状态丢失 | Redis 持久化 + 恢复时 GET /tour/state |
| 网络不稳定 | SSE 断连 | 1. 自动重连 + 状态恢复 2. 预缓存下一站音频到本地 |
| 导航时 VRM + 地图同时渲染卡顿 | 帧率下降 | 1. VRM 浮窗缩小到 60×82pt 降低像素比 2. 地图简化 Marker 图标 |

---

## 13. 后续扩展

- **AR 导览**: expo-camera + VRM 叠加在实景中
- **多人组队**: WebSocket 房间，多个游客跟随同一个数字人
- **UGC 路线**: 游客创建自己的游览路线并分享
- **实时人流**: 结合 `crowd_predict` 动态调整路线避开拥堵
- **离线模式**: 预缓存讲解音频 + 离线地图瓦片
- **LBS 推送**: 走到景点附近自动推送通知提醒继续导览
