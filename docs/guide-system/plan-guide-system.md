# 数字人智能向导系统 — 设计方案

> 版本: v3.0 | 日期: 2026-06-17  
> 平台: React Native (Expo) + FastAPI  
> 核心理念: 智能向导 + 自由探索

---

## 1. 设计哲学

### 1.1 定位

数字人是「贴心向导」而非「严格导游」：
- **主动但不强制**：主动提供建议，游客可完全忽略
- **智能但不打扰**：根据场景智能提示，但尊重用户节奏
- **随时可切换**：自由探索 ↔ 主动导览 无缝切换

### 1.2 与强制导览的区别

| 维度 | 强制导览模式 | 自由探索模式（本方案） |
|------|-----------|------------------|
| 主动权 | 数字人主导 | 游客主导 |
| 交互压力 | 高（必须响应） | 低（可忽略） |
| 适合人群 | 首次到访、需要全程指导 | 多次到访、喜欢自由探索 |
| 用户体验 | 像跟团游 | 像有私人向导陪同 |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    数字人智能向导系统                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              ProactiveStrategy (提示策略引擎)          │   │
│  │  决定何时、何地、以何种方式主动提示                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────┼───────────────────────────────┐   │
│  │                       ▼                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ 场景检测      │  │ 用户偏好       │  │ 提示生成    │  │   │
│  │  │ - GPS位置    │  │ - 历史行为     │  │ - 轻提示    │  │   │
│  │  │ - 停留时间   │  │ - 设置项       │  │ - 卡片      │  │   │
│  │  │ - 浏览轨迹   │  │ - 反馈记录     │  │ - 对话      │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │              TourOrchestrator (状态机)                │   │
│  │                                                       │   │
│  │  状态:                                                │   │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐       │   │
│  │  │   IDLE   │───▶│ GREETING │───▶│ SUGGEST  │       │   │
│  │  │ (静默)   │    │ (问候)   │    │ (推荐)   │       │   │
│  │  └────┬─────┘    └──────────┘    └────┬─────┘       │   │
│  │       │                                │              │   │
│  │       │    ┌──────────────────────────┘              │   │
│  │       │    ▼                                        │   │
│  │       │  ┌──────────┐    ┌──────────┐              │   │
│  │       └──│   FREE   │◀───│NARRATING │              │   │
│  │          │ (自由)   │    │ (讲解)   │              │   │
│  │          └────┬─────┘    └──────────┘              │   │
│  │               │                                     │   │
│  │               └────────────────────────────────▶    │   │
│  │                           (用户主动点击VRM)          │   │
│  │                           CONVERSING (对话)         │   │
│  └───────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │                   输出层                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ VRM 3D   │  │ 轻提示    │  │ 底部卡片  │          │   │
│  │  │ 表情/口型 │  │ Toast    │  │ Bottom   │          │   │
│  │  │          │  │          │  │ Sheet    │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 数字人行为模式

### 3.1 五种核心状态

| 状态 | 图标 | 行为 | 触发条件 |
|------|------|------|---------|
| **静默跟随** | 😶 | VRM浮窗显示，idle动画，不主动说话 | 默认状态 |
| **接近提示** | 💬 | 轻提示："前面就是XX，要听听吗？" | GPS接近景点50m |
| **主动讲解** | 🎤 | 进入讲解模式，口型同步 | 用户点击"听听"或主动点击VRM |
| **路线偏离** | 🗺️ | 提示："需要重新规划吗？" | GPS偏离推荐路线>100m |
| **对话模式** | 💭 | 正常对话，回答问题 | 用户主动点击VRM或语音唤醒 |

### 3.2 状态流转

```
                        用户点击VRM
                         或语音唤醒
    ┌──────────────────────────────────────────────────┐
    │                                                  │
    ▼                                                  │
┌──────────┐      接近景点      ┌──────────┐          │
│   IDLE   │────────────────────▶│  PROMPT  │          │
│ (静默)   │                     │ (提示)   │          │
└────┬─────┘                     └────┬─────┘          │
     │                                │                │
     │         用户忽略/超时           │ 用户点击"听听"  │
     │◀───────────────────────────────┘                │
     │                                                  │
     │                  ┌──────────◀───────────────────┘
     │                  │          │
     │  用户点击"结束"   │          │ 用户主动提问
     ▼                  │          ▼
┌──────────┐            │    ┌──────────┐
│   FREE   │────────────┘    │   CHAT   │
│ (自由浏览)│◀─────────────────│ (对话中) │
└──────────┘   回答完毕        └──────────┘
     │
     │ GPS偏离路线
     ▼
┌──────────┐
│  DETOUR  │
│ (偏离)   │
└──────────┘
```

---

## 4. 提示策略引擎

### 4.1 提示触发条件

```python
class ProactiveStrategy:
    """决定何时主动提示游客"""
    
    def check_nearby_prompt(self, context: Context) -> Optional[Prompt]:
        """
        接近景点提示
        触发条件：
        - 距离景点 < 50m
        - 距离上次提示 > 5分钟
        - 用户未设置"免打扰"
        - 该景点今日未讲解过
        """
        if (context.distance_to_spot < 50 and
            context.time_since_last_prompt > 300 and
            not context.user.dnd_mode and
            context.spot.id not in context.today_narrated):
            return GentlePrompt(
                message=f"前面就是{context.spot.name}，要听听讲解吗？",
                actions=["听听", "不用了"],
                auto_dismiss=5
            )
        return None
    
    def check_idle_prompt(self, context: Context) -> Optional[Prompt]:
        """
        空闲提示
        触发条件：
        - 页面停留 > 2分钟无操作
        - 用户未拒绝过同类提示
        """
        if (context.idle_time > 120 and
            not context.user.rejected_idle_prompt):
            return GentlePrompt(
                message="需要推荐附近景点吗？",
                actions=["推荐", "不用了"],
                auto_dismiss=3
            )
        return None
    
    def check_detour_prompt(self, context: Context) -> Optional[Prompt]:
        """
        偏离路线提示
        触发条件：
        - 偏离推荐路线 > 100m
        - 持续偏离 > 30秒
        """
        if (context.deviation_distance > 100 and
            context.deviation_duration > 30):
            return GentlePrompt(
                message="您偏离了推荐路线，需要重新规划吗？",
                actions=["重新规划", "不用了", "静音"],
                auto_dismiss=8
            )
        return None
```

### 4.2 提示冷却机制

```typescript
interface PromptCooldown {
  // 同类型提示的冷却时间
  nearbyPromptCooldown: 300;      // 5分钟
  idlePromptCooldown: 600;        // 10分钟
  detourPromptCooldown: 180;      // 3分钟
  
  // 用户拒绝后的静默期
  rejectionBackoff: {
    first: 3600,    // 1小时
    second: 7200,   // 2小时
    third: 86400,   // 24小时
  };
}
```

---

## 5. 交互组件设计

### 5.1 轻提示 Toast

```
┌─────────────────────────────────────┐
│                                     │
│  ┌───────────────────────────────┐  │
│  │  🤖 前面就是梵宫，要听听讲解吗？ │  │
│  │                               │  │
│  │  [听听]        [不用了]        │  │
│  └───────────────────────────────┘  │
│                                     │
│              （5秒后自动消失）        │
└─────────────────────────────────────┘
```

**特性**：
- 非模态，不阻断用户操作
- 自动消失（可配置时间）
- 可滑动关闭
- 记录用户选择，优化后续提示

### 5.2 VRM 浮窗交互

```
┌─────────────────────────────────────┐
│                                     │
│    （页面内容）                      │
│                                     │
│                          ┌──────┐   │
│                          │  🧘  │   │ ← 点击展开
│                          │ VRM │   │    对话气泡
│                          │ 小窗 │   │
│                          └──────┘   │
│                            💬       │
│                          "在呢~"    │
│                                     │
└─────────────────────────────────────┘
```

**点击VRM后**：
```
┌─────────────────────────────────────┐
│                                     │
│                          ┌────────┐ │
│                          │  🧘    │ │
│                          │  VRM   │ │
│                          │        │ │
│                          └────────┘ │
│    ┌─────────────────────────────┐  │
│    │  💬 有什么可以帮您的？      │  │
│    │                             │  │
│    │  [🎤 语音输入] [⌨️ 文字]   │  │
│    └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 5.3 讲解模式 BottomSheet

```
┌─────────────────────────────────────┐
│  ← 返回                    ⏸ 暂停    │
├──────────────────────────────────────┤
│                                     │
│         [景点图片/AR]                │
│                                     │
│  ┌───┐                              │
│  │VRM│ "梵宫被誉为东方卢浮宫，       │
│  │   │  内部珍藏着..."              │
│  └───┘                              │
│                                     │
├──────────────────────────────────────┤
│  字幕：梵宫被誉为东方卢浮宫...        │
│                                     │
│  [⏸暂停] [⏭跳过] [🎤提问] [✕结束]  │
└─────────────────────────────────────┘
```

### 5.4 推荐卡片

```
┌─────────────────────────────────────┐
│                                     │
│  📍 为您推荐                         │
│  ━━━━━━━━━━━━━━━━━━━━               │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🧘 禅意之旅                    │  │
│  │                               │  │
│  │ 菩提大道 → 梵宫 → 灵山精舍     │  │
│  │                               │  │
│  │ ⏱️ 1.5小时  📍 3个景点         │  │
│  │                               │  │
│  │ [查看详情]  [换一个]  [开始 ✓] │  │
│  └───────────────────────────────┘  │
│                                     │
│           [关闭]                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. 用户偏好设置

```typescript
interface UserGuidePreferences {
  // 主动提示开关
  enableNearbyPrompt: boolean;      // 接近景点提示（默认开）
  enableIdlePrompt: boolean;       // 空闲提示（默认开）
  enableDetourPrompt: boolean;      // 偏离路线提示（默认开）
  
  // 提示频率
  promptFrequency: 'low' | 'medium' | 'high';  // 低/中/高
  
  // 讲解模式
  autoNarrate: boolean;            // 到达景点自动讲解（默认关）
  narrationSpeed: 'slow' | 'normal' | 'fast';
  
  // 免打扰
  dndMode: boolean;                // 免打扰模式
  dndSchedule?: {                  // 定时免打扰
    start: '22:00';
    end: '08:00';
  };
  
  // 个性化
  preferredRole: string;          // 偏好角色（小景/佛祖/禅师等）
  preferredRouteType: string;     // 偏好路线类型
}
```

---

## 7. 后端API设计

### 7.1 核心端点

```python
# POST /api/guide/stream
# SSE流，推送提示和状态变更

class GuideStreamRequest(BaseModel):
    session_id: str
    action: Literal[
        'init',           # 初始化，获取当前状态
        'dismiss_prompt', # 忽略提示
        'accept_prompt',  # 接受提示
        'start_narrate',  # 开始讲解
        'end_narrate',    # 结束讲解
        'ask_question',   # 用户提问
        'set_preferences' # 更新偏好
    ]
    payload: Optional[dict]

# GET /api/guide/state
# 获取当前向导状态

class GuideStateResponse(BaseModel):
    status: Literal['idle', 'prompting', 'narrating', 'chatting']
    current_spot: Optional[Spot]
    nearby_spots: List[Spot]      # 附近景点
    suggested_route: Optional[Route]
    preferences: UserGuidePreferences

# POST /api/guide/preferences
# 更新用户偏好

class UpdatePreferencesRequest(BaseModel):
    enable_nearby_prompt: Optional[bool]
    enable_idle_prompt: Optional[bool]
    # ...
```

### 7.2 SSE事件类型

```typescript
type GuideEvent =
  | { type: 'prompt_nearby'; spot: Spot; message: string }
  | { type: 'prompt_idle'; message: string; suggestions: Spot[] }
  | { type: 'prompt_detour'; currentRoute: Route; deviation: number }
  | { type: 'suggest_route'; route: Route; reason: string }
  | { type: 'start_narrate'; spot: Spot; content: NarrationContent }
  | { type: 'narrate_chunk'; text: string; audioChunk: string }
  | { type: 'end_narrate' }
  | { type: 'state_change'; from: string; to: string }
  | { type: 'error'; message: string };
```

---

## 8. 前端实现

### 8.1 目录结构

```
mobile/
├── app/
│   └── guide/
│       ├── _layout.tsx           # Stack导航
│       ├── index.tsx             # 向导主页面
│       └── settings.tsx          # 向导设置
│
├── components/
│   └── guide/
│       ├── VRMFloat.tsx          # VRM浮窗组件
│       ├── GentlePrompt.tsx      # 轻提示组件
│       ├── NarrationSheet.tsx    # 讲解BottomSheet
│       ├── RouteCard.tsx         # 路线推荐卡片
│       └── ChatBubble.tsx        # 对话气泡
│
├── hooks/
│   └── useGuide.ts              # 向导核心hook
│
├── services/
│   └── guide.ts                 # 向导API封装
│
└── stores/
    └── guideStore.ts            # 向导状态管理
```

### 8.2 useGuide Hook

```typescript
// hooks/useGuide.ts
interface GuideState {
  status: 'idle' | 'prompting' | 'narrating' | 'chatting';
  currentSpot: Spot | null;
  currentPrompt: Prompt | null;
  narration: {
    text: string;
    isPlaying: boolean;
    progress: number;
  } | null;
  preferences: UserGuidePreferences;
}

interface GuideActions {
  // 提示响应
  dismissPrompt: () => void;
  acceptPrompt: () => void;
  
  // 讲解控制
  startNarration: (spot: Spot) => void;
  pauseNarration: () => void;
  resumeNarration: () => void;
  skipNarration: () => void;
  endNarration: () => void;
  
  // 对话
  startChat: () => void;
  sendMessage: (text: string) => void;
  endChat: () => void;
  
  // 设置
  updatePreferences: (prefs: Partial<UserGuidePreferences>) => void;
}

export function useGuide(sessionId: string): [GuideState, GuideActions] {
  // SSE连接
  // GPS监听
  // 提示策略判断
  // VRM联动
}
```

---

## 9. 场景示例

### 场景1：首次打开App

```
[用户打开App]
    │
    ▼
[VRM浮窗出现，idle动画]
    │
    ▼
[3秒后，VRM主动说话]
"欢迎来到灵山胜境！我是您的向导小景。
 今天想怎么游览？"
    │
    ▼
[底部弹出推荐卡片]
┌─────────────────────┐
│ 🧘 禅意之旅          │
│ 👨‍👩‍👧 亲子欢乐    │
│ 📸 经典全景    │
│ 💬 我自己逛         │
└─────────────────────┘
    │
    ├─ 用户选择"禅意之旅" → 显示路线详情 → 用户点击"开始"
    ├─ 用户选择"我自己逛" → 进入自由模式，VRM静默跟随
    └─ 用户忽略/关闭 → 进入自由模式，VRM静默跟随
```

### 场景2：接近景点

```
[用户自由浏览中，走向梵宫]
    │
    ▼
[GPS检测到距离梵宫50m]
    │
    ▼
[VRM表情变为happy，轻提示弹出]
"前面就是梵宫，要听听讲解吗？"
[听听] [不用了]
（5秒后自动消失）
    │
    ├─ 用户点击"听听" → 进入讲解模式
    ├─ 用户点击"不用了" → 记录偏好，24小时内不再提示梵宫
    └─ 用户忽略 → 提示消失，继续静默跟随
```

### 场景3：讲解中提问

```
[讲解进行中]
"梵宫内部有..."
    │
    ▼
[用户按住语音按钮]
"这建筑是什么时候建的？"
    │
    ▼
[讲解暂停，VRM表情neutral]
    │
    ▼
[VRM回答]
"梵宫建于2008年，历时两年完工..."
    │
    ▼
[回答完毕]
"还要继续听梵宫的介绍吗？"
[继续] [结束]
```

### 场景4：偏离路线

```
[用户正在跟随推荐路线]
    │
    ▼
[GPS检测到偏离>100m]
    │
    ▼
[轻提示弹出]
"您偏离了推荐路线，需要重新规划吗？"
[重新规划] [不用了] [静音]
    │
    ├─ 点击"重新规划" → 基于当前位置生成新路线
    ├─ 点击"不用了" → 继续自由浏览
    └─ 点击"静音" → 进入免打扰模式，不再提示偏离
```

---

## 10. 技术要点

### 10.1 GPS精度与提示策略

| 距离 | 行为 |
|------|------|
| < 30m | 高概率提示（如果满足其他条件） |
| 30-50m | 中等概率提示 |
| 50-100m | 低概率提示（仅用户偏好高频率时） |
| > 100m | 不提示 |

### 10.2 VRM性能优化

```typescript
// 根据场景调整VRM渲染质量
const VRMQualityConfig = {
  idle: { fps: 15, resolution: 0.5 },      // 静默时降低资源占用
  prompting: { fps: 30, resolution: 0.8 }, // 提示时正常
  narrating: { fps: 30, resolution: 1.0 }, // 讲解时最高质量
};
```

### 10.3 离线支持

```typescript
// 预缓存内容
interface OfflineCache {
  spots: Spot[];                    // 景点数据
  narrations: Map<spotId, Audio>;  // 讲解音频
  routes: Route[];                 // 推荐路线
  
  // 离线时仍可提供基础功能
}
```

---

## 11. 扩展功能

### 11.1 未来可添加

| 功能 | 描述 |
|------|------|
| AR导览 | 手机摄像头+VRM叠加在实景中 |
| 多人同游 | 多人共享一个数字人向导 |
| 智能拍照 | VRM提示最佳拍照点/角度 |
| 实时人流 | 根据人流密度动态调整推荐 |
| 语音唤醒 | "小景小景"唤醒对话 |
| 手势交互 | 手势控制VRM（挥手打招呼） |

---

## 12. 总结

本方案设计的数字人智能向导系统，在**主动服务**和**用户自主**之间取得平衡：

1. **智能感知**：通过GPS、时间、行为分析，理解用户场景
2. **轻量提示**：非强制、可忽略、自动消失的轻提示设计
3. **无缝切换**：自由探索 ↔ 主动导览 随时切换，不打断用户
4. **个性化**：根据用户偏好和反馈，动态调整提示策略

核心体验：**像有一个贴心的本地朋友陪同，需要时出现，不需要时安静陪伴。**
