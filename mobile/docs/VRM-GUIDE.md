# VRM 数字人导览系统

## 概述

VRM 数字人导览系统为灵山胜境景区提供智能导览服务，通过 3D VRM 模型展示表情、动作和手势，配合文字分析引擎实现情感驱动的动画效果。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   VRMGuide   │  │ VRMFloating  │  │  guide-demo  │       │
│  │  (完整导览)   │  │  (浮动数字人) │  │  (测试页面)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      核心组件层                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    VRMView                           │   │
│  │  - 3D 渲染 (expo-gl + three.js + @pixiv/three-vrm)   │   │
│  │  - 表情/动作/口型同步                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  VRMManager                          │   │
│  │  - 状态管理 (单例模式)                                │   │
│  │  - 模型加载/切换                                      │   │
│  │  - 事件系统 (speak/emotionChange/stateChange)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      动画引擎层                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                VRMIdleAnim.ts                        │   │
│  │  - applyIdleAnimation: 眨眼、呼吸、头部微动           │   │
│  │  - applyExpression: 7种表情预设                       │   │
│  │  - applyAction: 9种手势动作                           │   │
│  │  - applyMouthOpen: 口型同步                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               textTimeline.ts                        │   │
│  │  - splitSentences: 中文分句                           │   │
│  │  - analyzeSentence: 情感/动作分析                     │   │
│  │  - textToTimeline: 生成时间轴                         │   │
│  │  - ExpressionPlayer: 时间轴播放器                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 表情系统

### 表情类型 (Emotion)

| 表情 | 名称 | 触发场景 |
|------|------|----------|
| `neutral` | 中立 | 默认状态 |
| `happy` | 开心 | 欢迎、赞美、美好事物 |
| `sad` | 悲伤 | 抱歉、遗憾、不知道 |
| `angry` | 生气 | 生气、愤怒、讨厌 |
| `relaxed` | 放松 | 不确定、推测、疑问 |
| `surprised` | 惊讶 | 惊叹、震撼、太棒了 |
| `thinking` | 思考 | 思考、考虑、让我想想 |

### 表情实现

表情通过 VRM 的 `expressionManager` 设置预设表情值：

```typescript
vrm.expressionManager?.setValue('happy', 1);  // 开心
vrm.expressionManager?.setValue('sad', 0.6);  // 微悲伤
```

`thinking` 表情为组合效果：
- `relaxed` 设为 0.6
- 头部微倾 `headBone.rotation.x = -0.05`

## 动作系统

### 动作类型 (Action)

| 动作 | 名称 | 触发场景 | 持续时间 |
|------|------|----------|----------|
| `none` | 无 | 默认状态 | - |
| `nod` | 点头 | 肯定、同意、明白 | 800ms |
| `shakeHead` | 摇头 | 否定、拒绝、抱歉 | 800ms |
| `tiltHead` | 歪头 | 疑问、思考 | 800ms |
| `lookUp` | 抬头 | 思考、高度相关 | 2500ms |
| `lookDown` | 低头 | 谦虚、沉思 | 800ms |
| `wave` | 挥手 | 打招呼、欢迎 | 800ms |
| `point` | 指向 | 指引方向、请看 | 800ms |
| `clap` | 鼓掌 | 祝贺、太棒了 | 800ms |
| `bow` | 鞠躬 | 感谢、祝福 | 800ms |

### 动作实现细节

#### nod (点头)
```typescript
headBone.rotation.x += Math.sin(t * Math.PI * 4) * 0.12 * decay;
```
- 幅度：0.12 弧度 (~7°)
- 频率：2Hz
- 衰减：二次衰减

#### shakeHead (摇头)
```typescript
headBone.rotation.y += Math.sin(t * Math.PI * 3) * 0.2 * decay;
```
- 幅度：0.2 弧度 (~11°)
- 频率：1.5Hz
- 衰减：二次衰减

#### lookUp (抬头)
```typescript
const lookUpCurve = progress < 0.2
  ? (progress / 0.2) * (progress / 0.2)
  : progress > 0.8
    ? ((1 - progress) / 0.2) * ((1 - progress) / 0.2)
    : 1;
headBone.rotation.x = 0.25 * lookUpCurve;
headBone.rotation.y = 0.15 * lookUpCurve;
```
- 方向：右上方
- 曲线：20% easeIn + 60% hold + 20% easeOut
- 恢复：300ms easeOut 平滑过渡

#### wave (挥手)
```typescript
rightUpperArm.rotation.z = -1.45 + 3.0 * raiseCurve;
rightLowerArm.rotation.x = -5.0 * raiseCurve;
rightHand.rotation.y = Math.sin(t * Math.PI * 6) * 0.5 * decay * raiseCurve;
```
- 大臂抬起 3.0 弧度
- 小臂弯曲 -5.0 弧度
- 手掌左右摆动

#### point (指向)
```typescript
rightUpperArm.rotation.z = -1.45 + 2.2 * raiseCurve;
rightUpperArm.rotation.x = 0.12 * (1 - raiseCurve) - 0.8 * raiseCurve;
// 手指：食指伸出，其余握拳
```
- 手臂前伸
- 食指伸出，其余手指握拳
- 头部跟随转向

#### clap (鼓掌)
```typescript
// 大臂Z轴15°，X轴30°
lua.rotation.z = 1.45 - 0.262 * raiseCurve;
lua.rotation.x = 0.524 * raiseCurve;
// 小臂Y轴140°，左右反向
lla.rotation.y = -2.443 * raiseCurve;
rla.rotation.y = 2.443 * raiseCurve;
// 拍击振荡
const clapOsc = Math.sin(t * Math.PI * 5) * 0.3 * decay * raiseCurve;
```
- 双手合十
- 拍击振荡效果

#### bow (鞠躬)
```typescript
headBone.rotation.x = -0.7 * bowCurve;  // 头部前倾 ~40°
spine.rotation.x = -0.3 * bowCurve;     // 脊柱前弯 ~17°
rootBone.rotation.x = -0.15 * bowCurve; // 整体微前倾 ~9°
```
- 曲线：25% easeIn + 50% hold + 25% easeOut
- 头、脊柱、整体三层弯曲

## 文字分析引擎

### 分句 (splitSentences)

```typescript
const parts = text.split(/(?<=[。！？!?；;，,])/);
```

支持中文标点：。！？；，和英文标点 !?;,

### 情感分析 (analyzeSentence)

#### 表情分析优先级（从高到低）

1. **surprised** - 哇、天哪、太壮观、太棒、太美了...
2. **happy** - 开心、高兴、喜欢、欢迎、美好、精彩...
3. **thinking** - 想想、思考、考虑、让我想想...
4. **sad** - 抱歉、遗憾、难过、可惜、对不起...
5. **angry** - 生气、愤怒、讨厌、烦、气死...
6. **relaxed** - 也许、可能、大概、或许、应该...
7. **疑问句** - 以？或?结尾

#### 动作分析优先级（从高到低）

1. **wave** - 你好、欢迎、嗨、hi、hello...
2. **point** - 请看、那边、这里、前方、左边...
3. **clap** - 鼓掌、拍手、祝贺、恭喜、太棒了...
4. **bow** - 谢谢、感谢、感恩、祝福...
5. **lookUp** - 想想、思考、考虑...
6. **tiltHead** - 以？或?结尾
7. **shakeHead** - 不太、不是、不行、不要、不对、抱歉...
8. **nod** - 是的、对、好、嗯、明白、了解...
9. **lookUp** - 高达、米、层、楼、高...（高度相关）
10. **nod** - ！或!结尾（感叹）

### 时间轴生成 (textToTimeline)

```typescript
interface TimelineEvent {
  timeMs: number;      // 触发时间（毫秒）
  expression: Emotion; // 表情
  action: Action;      // 动作
  durationMs?: number; // 动作持续时间
}

function textToTimeline(text: string, durationMs: number): TimelineEvent[]
```

按句子长度比例分配时间，每句生成一个事件。

### 时间轴播放器 (ExpressionPlayer)

```typescript
class ExpressionPlayer {
  play(timeline: TimelineEvent[], onUpdate: (expression, action, durationMs) => void): void;
  stop(): void;
}
```

每 100ms 检查一次时间轴，触发对应事件。

## 组件使用

### VRMGuide (完整导览组件)

```tsx
import { VRMGuide } from '@/components/vrm/VRMGuide';

// 直接使用，包含完整的导览界面
<VRMGuide />
```

功能：
- VRM 数字人展示
- 字幕显示
- 说话指示器
- 表情/动作/场景测试面板
- 聊天问答
- 快捷问题

### VRMFloating (浮动数字人)

```tsx
import { VRMFloating, VRMFloatingRef } from '@/components/vrm/VRMView';

const vrmRef = useRef<VRMFloatingRef>(null);

// 说话（自动分析文字触发对应表情动作）
vrmRef.current?.speak('欢迎来到灵山胜境', 'happy');

// 直接设置表情
vrmRef.current?.setExpression('thinking');

// 直接设置动作
vrmRef.current?.setAction('wave', 1500);

<VRMFloating ref={vrmRef} onPress={() => {}} />
```

### VRMView (底层渲染组件)

```tsx
import { VRMView } from '@/components/vrm/VRMView';

<VRMView
  mode="float"           // 'full' | 'float'
  expression="happy"     // Emotion
  mouthOpen={0.5}        // 0-1
  speaking={true}        // boolean
  action="wave"          // Action
  actionDuration={800}   // 毫秒
  headRotation={{ x: 0, y: 0 }}  // lookUp 用
/>
```

## 文件结构

```
components/vrm/
├── VRMView.tsx          # 3D 渲染组件
├── VRMManager.ts        # 状态管理（单例）
├── VRMIdleAnim.ts       # 动画引擎
├── VRMGuide.tsx         # 完整导览组件
├── VRMFloating.tsx      # 浮动数字人
├── VRMSettings.tsx      # 设置面板

utils/
└── textTimeline.ts      # 文字分析引擎

hooks/
└── useVRMSync.ts        # VRM 同步钩子

app/
└── guide-demo.tsx       # 测试页面
```

## 开发指南

### 添加新表情

1. 在 `VRMManager.ts` 的 `Emotion` 类型中添加
2. 在 `VRMIdleAnim.ts` 的 `applyExpression` 中实现
3. 在 `textTimeline.ts` 的 `analyzeSentence` 中添加触发规则

### 添加新动作

1. 在 `VRMIdleAnim.ts` 的 `Action` 类型中添加
2. 在 `applyAction` 的 switch 中实现动画逻辑
3. 在 `textTimeline.ts` 的 `analyzeSentence` 中添加触发规则

### 调试技巧

1. 使用 `guide-demo.tsx` 测试页面逐个测试表情和动作
2. 在 `textTimeline.ts` 中查看 `[analyzeSentence]` 日志
3. 在 `VRMView.tsx` 中查看骨骼日志（frameCount === 30 时）

## 参考

- [VRM 规范](https://vrm.dev/en/)
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm)
- [demo/wave-test.html](../demo/wave-test.html) - 动作参考实现
