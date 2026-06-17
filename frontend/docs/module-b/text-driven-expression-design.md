# 文字驱动表情 + 动作系统设计文档

## 1. 背景与目标

### 当前问题

数字人表情逻辑过于简单：
- `detectEmotion` 用正则匹配几个汉字，整段话只返回一个表情
- 说话结束后固定 1 秒回 `neutral`，无过渡
- 没有肢体动作（点头、摇头、歪头等）
- 表情与文字内容脱节，显得呆板

### 目标

实现一个**文字驱动的表情 + 动作时间轴系统**，让数字人在说话过程中：
- 根据句子情感**实时切换表情**
- 根据语义**触发肢体动作**（点头、摇头、歪头等）
- 表情和动作有**自然过渡**，不突兀

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        输入层                                │
│  文字文本 (string) + 预估时长 (durationMs)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    文字分析层                                 │
│  textToTimeline(text, durationMs) → TimelineEvent[]          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  分句器   │→│ 情感分析  │→│ 动作映射  │→ 时间轴            │
│  │ Splitter │  │ Emotion  │  │  Action  │                    │
│  └──────────┘  └──────────┘  └──────────┘                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    播放层                                     │
│  ExpressionPlayer.play(timeline, onUpdate)                   │
│  每 100ms 检查时间轴 → 回调通知 UI                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    渲染层                                     │
│  VRMView: expression + action → VRM 模型                     │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │applyExpression│  │ applyAction  │ → 骨骼 + 表情控制器      │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## 3. 数据结构

### 3.1 时间轴事件

```typescript
interface TimelineEvent {
  timeMs: number;        // 触发时间（相对说话开始，毫秒）
  expression: Emotion;   // 表情
  action?: Action;       // 动作（可选）
  durationMs?: number;   // 动作持续时间（默认 800ms）
}
```

### 3.2 表情类型

```typescript
type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised';
```

### 3.3 动作类型

```typescript
type Action = 'nod' | 'shakeHead' | 'tiltHead' | 'lookUp' | 'lookDown' | 'none';
```

### 3.4 时间轴示例

输入文字："灵山大佛高达88米！非常壮观。你去过吗？不太清楚也没关系。"

预估时长：6000ms

生成的时间轴：

```json
[
  { "timeMs": 0,    "expression": "neutral",  "action": "none" },
  { "timeMs": 1200, "expression": "surprised","action": "lookUp",   "durationMs": 800 },
  { "timeMs": 2400, "expression": "happy",    "action": "nod",      "durationMs": 600 },
  { "timeMs": 3600, "expression": "relaxed",  "action": "tiltHead", "durationMs": 800 },
  { "timeMs": 4800, "expression": "sad",      "action": "shakeHead","durationMs": 600 },
  { "timeMs": 5600, "expression": "neutral",  "action": "none" }
]
```

## 4. 核心模块设计

### 4.1 分句器 (`splitSentences`)

按标点符号分割文字：

```typescript
function splitSentences(text: string): string[]
```

分隔符：`。！？!?；;，,`（中文 + 英文标点）

保留分隔符作为句子结尾标记（用于判断是否为问句/感叹句）。

### 4.2 情感分析 (`analyzeSentence`)

对每个句子分析情感和动作：

```typescript
function analyzeSentence(sentence: string): { expression: Emotion; action: Action }
```

**表情映射规则**（优先级从高到低）：

| 优先级 | 条件 | 表情 |
|--------|------|------|
| 1 | 包含 `！!哇太真好棒赞` | `surprised` |
| 2 | 包含 `开心高兴喜欢欢迎美好精彩壮观` | `happy` |
| 3 | 包含 `抱歉遗憾难过可惜` | `sad` |
| 4 | 包含 `生气愤怒讨厌烦` | `angry` |
| 5 | 包含 `想想也许可能大概` | `relaxed` |
| 6 | 问句（`？?` 结尾） | `relaxed` |
| 7 | 默认 | `neutral` |

**动作映射规则**：

| 条件 | 动作 | 含义 |
|------|------|------|
| 包含数字（`\d+`） | `lookUp` | 思考/回忆数据 |
| 问句（`？?` 结尾） | `tiltHead` | 好奇 |
| 包含 `不没无非别` | `shakeHead` | 否定 |
| 包含 `！!哇太真` | `nod` | 强调/感叹 |
| 包含 `想想思考考虑` | `lookUp` | 思考 |
| 默认 | `none` | 无动作 |

### 4.3 时间分配 (`textToTimeline`)

```typescript
function textToTimeline(text: string, durationMs: number): TimelineEvent[]
```

算法：
1. 调用 `splitSentences` 分句
2. 计算每句字数占比：`ratio = sentenceChars / totalChars`
3. 每句起始时间：`timeMs = accumulatedRatio * durationMs`
4. 对每句调用 `analyzeSentence` 获取表情和动作
5. 最后一个事件设为 `neutral`（说话结束恢复）

### 4.4 播放器 (`ExpressionPlayer`)

```typescript
class ExpressionPlayer {
  private timeline: TimelineEvent[];
  private timer: ReturnType<typeof setInterval> | null;
  private startTime: number;
  private currentIndex: number;
  private onUpdate: (expression: Emotion, action?: Action) => void;

  play(timeline: TimelineEvent[], onUpdate: (expression: Emotion, action?: Action) => void): void;
  stop(): void;
  private tick(): void;
}
```

**播放逻辑**：
- `play()` 记录 `startTime = Date.now()`，启动 100ms 定时器
- `tick()` 计算 `elapsed = Date.now() - startTime`
- 找到 `timeMs <= elapsed` 的最后一个事件
- 如果事件索引变化，调用 `onUpdate(newExpression, newAction)`
- `stop()` 清除定时器，调用 `onUpdate('neutral', 'none')`

### 4.5 动作执行 (`applyAction`)

在 `VRMIdleAnim.ts` 中新增：

```typescript
function applyAction(vrm: VRM, action: Action, elapsed: number, durationMs: number): void
```

**骨骼修改方案**：

| 动作 | 骨骼 | 修改方式 | 参数 |
|------|------|----------|------|
| `nod` | `head.rotation.x` | sin 振荡 | amplitude=0.15, freq=3Hz |
| `shakeHead` | `head.rotation.y` | sin 振荡 | amplitude=0.12, freq=4Hz |
| `tiltHead` | `head.rotation.z` | sin 振荡 | amplitude=0.1, freq=2Hz |
| `lookUp` | `lookAt.y` | 偏移 | y += 0.5 |
| `lookDown` | `lookAt.y` | 偏移 | y -= 0.3 |
| `none` | 无 | 不修改 | - |

**过渡处理**：
- 动作有 `durationMs`，在持续时间内执行振荡
- 持续时间结束后，骨骼自动回到 idle 状态（由 `applyIdleAnimation` 接管）
- 使用 `progress = elapsed / durationMs` 控制振荡幅度的衰减

### 4.6 VRMView 扩展

新增 `action` prop：

```typescript
interface VRMViewProps {
  // ... existing props
  action?: Action;  // 新增
}
```

动画循环中：

```typescript
const vrm = VRMManager.getVRM();
if (vrm) {
  applyIdleAnimation(vrm, elapsed, dt, speakingRef.current);
  applyExpression(vrm, expressionRef.current);
  applyAction(vrm, actionRef.current, elapsed, actionDurationRef.current);  // 新增
  applyMouthOpen(vrm, mouthOpenRef.current);
  VRMManager.setLookAtTarget(lookAtRef.current.x, lookAtRef.current.y);
  VRMManager.update(dt);
}
```

## 5. 集成方案

### 5.1 guide-demo.tsx 改动

```typescript
// 新增状态
const [currentAction, setCurrentAction] = useState<Action>('none');
const playerRef = useRef<ExpressionPlayer | null>(null);

// 初始化播放器
useEffect(() => {
  playerRef.current = new ExpressionPlayer();
  return () => playerRef.current?.stop();
}, []);

// 监听回答完成 → 启动时间轴
useEffect(() => {
  const last = messages[messages.length - 1];
  if (last?.role === 'assistant' && last.status === 'sent' && last.content) {
    const text = last.content;
    const durationMs = Math.max(3000, text.length * 150);
    const timeline = textToTimeline(text, durationMs);

    // 设置初始表情
    const first = timeline[0];
    if (first) {
      setDisplayExpression(first.expression);
      setCurrentAction(first.action || 'none');
    }

    // 启动播放器
    playerRef.current?.play(timeline, (expr, action) => {
      setDisplayExpression(expr);
      setCurrentAction(action || 'none');
    });

    // 说话结束
    const timer = setTimeout(() => {
      playerRef.current?.stop();
      setDisplayExpression('neutral');
      setCurrentAction('none');
    }, durationMs);

    return () => clearTimeout(timer);
  }
}, [messages]);

// 传给 VRMView
<VRMView
  mode="full"
  expression={displayExpression}
  action={currentAction}
  mouthOpen={mouthOpen}
  speaking={isSpeaking}
/>
```

### 5.2 底部表情测试按钮

保持不变，直接调用 `triggerSpeak` + `setDisplayExpression`。

## 6. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `mobile/utils/textTimeline.ts` | 新建 | `textToTimeline` + `ExpressionPlayer` |
| `mobile/components/vrm/VRMIdleAnim.ts` | 修改 | 加 `applyAction` 函数 |
| `mobile/components/vrm/VRMView.tsx` | 修改 | 加 `action` prop，动画循环调用 `applyAction` |
| `mobile/app/guide-demo.tsx` | 修改 | 用时间轴替换单表情逻辑 |

## 7. 验证方案

1. **基础表情切换**：点"需要讲解"，观察表情是否随句子情感变化
2. **动作触发**：问含数字的问题（"大佛有多高？"），观察 `lookUp` + `tiltHead`
3. **否定动作**：问否定句（"不去行不行？"），观察 `shakeHead`
4. **过渡自然性**：表情切换是否平滑，动作是否突兀
5. **测试按钮**：底部表情按钮功能不受影响
6. **性能**：动画帧率不下降（目标 30fps+）
