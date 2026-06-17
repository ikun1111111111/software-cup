# 特殊文字触发手部动作 — 设计文档

> 模块: guide-demo 数字人导览
> 日期: 2026-06-15

---

## 1. 背景

当前数字人 VRM 的动作系统仅支持 **头部动作**（点头、摇头、歪头、抬头、低头），缺少上肢表现力。用户输入或 AI 回复中的关键语义词可以映射为更具表达力的 **手部动作**，提升导览沉浸感。

## 2. 目标

- 当文本中出现特定关键词时，数字人自动执行对应的手部/上肢动作
- 与现有表情 + 头部动作系统并行工作，不冲突
- 用户在 demo 页面可手动触发手势，用于调试和演示

## 3. 动作定义

| Action | 中文名 | 视觉描述 | 预计持续时间 |
|--------|--------|---------|-------------|
| `wave` | 挥手 | 右臂抬起至肩高，手腕左右摆动 2-3 次 | 1200ms |
| `point` | 指引 | 右臂前伸，手指指向右前方 | 1000ms |
| `clap` | 鼓掌 | 双臂内收，双手在胸前合拢拍击 | 1000ms |
| `salute` | 拱手 | 双手抬至胸前合十，微微前倾 | 1200ms |

### 骨骼操作链路

```
VRM Humanoid Bones:
  Left:  leftUpperArm -> leftLowerArm -> leftHand
  Right: rightUpperArm -> rightLowerArm -> rightHand
```

## 4. 文字触发规则

### 4.1 正则映射表

| 优先级 | Action | 触发关键词（正则） | 示例句子 |
|--------|--------|-------------------|---------|
| 1 (最高) | `wave` | `你好\|欢迎\|嗨\|hi\|hello\|见到你` | "你好呀，欢迎来到灵山！" |
| 2 | `point` | `请看\|那边\|这里\|前方\|左边\|右边\|看这\|看那` | "请看右边的九龙灌浴" |
| 3 | `clap` | `太棒\|精彩\|赞\|厉害\|壮观\|好厉害\|真不错` | "灵山大佛太壮观了！" |
| 4 | `salute` | `谢谢\|感恩\|祝福\|感谢\|祝愿` | "感谢您的提问" |
| 5 (最低) | 头部动作 | 现有规则不变 | "也许不太清楚" -> `tiltHead` |

### 4.2 优先级逻辑

```
手势动作 > 头部动作
同一句话只触发一个动作（最高优先级的那个）
表情（expression）独立，不受影响
```

## 5. 代码改动

### 5.1 `components/vrm/VRMIdleAnim.ts`

**Action 类型扩展：**

```typescript
export type Action =
  | 'nod' | 'shakeHead' | 'tiltHead' | 'lookUp' | 'lookDown'  // 现有头部
  | 'wave' | 'point' | 'clap' | 'salute'                       // 新增手部
  | 'none';
```

**applyAction() 新增 case：**

- `wave`：右 upperArm.z 减小（抬起），lowerArm 做 sin 摆动
- `point`：右 upperArm.x 前伸，lowerArm 微曲
- `clap`：双 upperArm 内收（z 值减小），lowerArm 向内弯曲
- `salute`：双 upperArm 抬起，lowerArm 弯曲至胸前，双手合十

### 5.2 `utils/textTimeline.ts`

**Action 类型同步扩展**（与 VRMIdleAnim 保持一致）。

**analyzeSentence() 改造：**

```typescript
// 手势优先级高于头部动作
if (/你好|欢迎|嗨|hi|hello|见到你/.test(s)) action = 'wave';
else if (/请看|那边|这里|前方|左边|右边|看这|看那/.test(s)) action = 'point';
else if (/太棒|精彩|赞|厉害|壮观|好厉害|真不错/.test(s)) action = 'clap';
else if (/谢谢|感恩|祝福|感谢|祝愿/.test(s)) action = 'salute';
// 头部动作（现有逻辑，优先级更低）
else if (/\d+/.test(s)) action = 'lookUp';
else if (/[？?]$/.test(s)) action = 'tiltHead';
else if (/[不没无非别]/.test(s)) action = 'shakeHead';
else if (/[！!]|哇[！!]|太壮观|太棒|真棒/.test(s)) action = 'nod';
else if (/想想|思考|考虑/.test(s)) action = 'lookUp';
```

> 注意：`太棒|太壮观` 等词同时匹配 `clap` 和 `nod`，由于手势优先级更高，会触发 `clap`。

### 5.3 `app/guide-demo.tsx`

底部表情测试栏新增 4 个手势按钮：

| 按钮 | Emoji | 触发文本 | Action |
|------|-------|---------|--------|
| 挥手 | wave | "你好呀，欢迎来到灵山胜境！" | `wave` |
| 指引 | point | "请看那边的灵山大佛" | `point` |
| 鼓掌 | clap | "灵山大佛太壮观了，真棒！" | `clap` |
| 拱手 | salute | "感谢您的提问，祝福您旅途愉快" | `salute` |

### 5.4 无需改动的文件

| 文件 | 原因 |
|------|------|
| `VRMView.tsx` | 已支持 `action` prop，透传到 `applyAction()` |
| `VRMManager.ts` | 纯状态管理，不涉及动画逻辑 |
| 后端 API | 纯前端动画，无需后端变更 |

## 6. 数据流

```
用户输入 / AI 回复文本
        |
  textToTimeline(text)
        |
  splitSentences() -> 逐句 analyzeSentence()
        |
  正则匹配 -> expression + action (手势优先)
        |
  ExpressionPlayer.play(timeline, callback)
        |
  VRMView: action={currentAction}
        |
  applyAction(vrm, action, elapsed)
        |
  骨骼旋转 -> 3D 渲染
```

## 7. 验证标准

- [ ] 输入"你好"，右臂抬起挥手
- [ ] 输入"请看那边"，右臂前伸指引
- [ ] 输入"太壮观了"，双手鼓掌
- [ ] 输入"谢谢"，双手合十
- [ ] 手势播放期间，头部动作被抑制
- [ ] 表情（happy/sad 等）正常工作，不受手势影响
- [ ] 手势结束后，手臂回到 idle 姿态
- [ ] demo 底部测试栏 4 个按钮均可触发对应手势

## 8. 后续扩展（不在本次范围）

- `bow` — 鞠躬（身体前倾）
- `waveBoth` — 双手挥手
- `count` — 伸手指计数（配合数字文本）
- 手势强度随感叹程度变化（多个 `!` -> 更夸张的动作）
