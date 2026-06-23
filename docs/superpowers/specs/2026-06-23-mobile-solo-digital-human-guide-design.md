# 移动端独自游览数字人主动导览设计
> 日期：2026-06-23  
> 范围：`software/mobile/`  
> 状态：待评审  
> 核心目标：把“独自游览”从自由探索入口升级为数字人主导的私人陪游闭环。

---

## 一、背景与现状

移动端已经具备主动导览的基础骨架：

| 能力 | 现有位置 | 可复用点 |
|------|----------|----------|
| 导览状态机 | `software/mobile/hooks/useTourOrchestrator.ts` | 路线开始、暂停、继续、结束、到站、讲解、打卡、记忆事件 |
| 全局导览上下文 | `software/mobile/context/TourContext.tsx` | 跨页面保存路线、进度、偏好 |
| 数字人驱动 | `software/mobile/hooks/useDigitalHumanDriver.ts` | 表情、口型、字幕、动作、页面上下文 |
| 数字人服务封装 | `software/mobile/services/digitalHuman.ts` | 全局触发说话、设置页面上下文、预加载 |
| 路线与讲解数据 | `software/mobile/data/lingshanGuideData.ts`、`software/mobile/data/lingshanRoutes.ts` | 本地路线、景点、讲解脚本、推荐理由 |
| 探索页入口 | `software/mobile/app/(tabs)/explore.tsx` | 数字人舞台、地图、拍照识景、扫码、路线推荐 |
| 记忆沉淀 | `memoryEvents`、`software/mobile/app/(tabs)/memory.tsx` | 导览结束后生成游览回顾 |

当前的问题不是缺少导览能力，而是“独自游览”没有形成独立产品心智：

- 默认画像仍偏向多人场景，例如 `DEFAULT_USER_GUIDE_PROFILE.groupType` 为 `couple`。
- “自由探索”和“独自游览”的边界模糊，用户感知像功能集合，不像数字人陪游。
- 数字人更多是讲解和提示，没有围绕独游场景承担“陪伴、判断、提醒、重规划”的角色。
- 路线推荐还不够体现独游差异：轻松、安静、深听、拍照、安全、少打扰等需求没有成为推荐输入。
- 游后记忆可以记录事件，但缺少“一个人由小灵陪着完成路线”的总结表达。

---

## 二、目标

### 2.1 产品目标

让用户进入移动端后能明确感知：

> 我不是在看景区功能菜单，而是有一个数字人小灵陪我一个人游览。

独自游览模式需要完成四件事：

1. 帮用户快速决定怎么逛。
2. 在路上用低打扰方式陪伴和提醒。
3. 到景点后主动讲解，但保留用户自由。
4. 结束后生成一段可回看的独游记忆。

### 2.2 展示目标

面向比赛演示，独自游览应能讲清楚以下亮点：

- 数字人不是装饰，而是导览流程的主控角色。
- 系统能根据独游偏好生成不同路线和讲解节奏。
- 用户偏离路线时，系统能温和重规划。
- 离线数据、本地状态机和数字人动作形成稳定演示闭环。

### 2.3 非目标

本阶段不做以下内容：

- 不实现复杂 AR 导航。
- 不新增重型后端推荐模型。
- 不依赖实时大模型才能完成核心演示。
- 不重写已有导览状态机。
- 不改变协同导览主流程，只保证它不被独游改造破坏。

---

## 三、推荐方案

采用“中等重构”方案：在现有导览状态机上增加独游画像、独游入口、数字人主动开场、动态路线推荐、路中陪伴、到站讲解、偏离重规划和游后记忆。

选择理由：

- 复用现有 `TourContext` 和 `useTourOrchestrator`，改动范围可控。
- 不依赖后端稳定性，能够用本地路线和本地讲解数据完成演示。
- 比轻量文案优化更有产品差异，比 AR/实时语音方案风险更低。
- 符合“数字人导览为主”的叙事：数字人控制节奏，地图和卡片服务于导览。

---

## 四、用户流程

### 4.1 首次进入

1. 用户进入首页或探索页。
2. 页面首屏突出“小灵独自游览”入口。
3. 小灵主动欢迎：
   “今天我陪你一个人逛灵山。你想轻松走、深度听，还是多拍照？”
4. 用户选择独游偏好：
   - 轻松散步
   - 文化深听
   - 拍照打卡
   - 安静少打扰
5. 小灵推荐路线并说明原因。
6. 用户点击“开始独自游览”。

### 4.2 路中导览

1. 小灵进入导航状态，显示下一站、预计步行时间、路线进度。
2. 距离变化触发低频提醒：
   - 远距离：确认方向。
   - 接近：提示即将到达。
   - 到达：询问是否开始讲解。
3. 用户可随时：
   - 听完整讲解
   - 自己看看
   - 拍照识景
   - 打卡
   - 去下一站
   - 暂停陪伴

### 4.3 偏离路线

1. 系统发现用户偏离当前目标或主动点选非路线景点。
2. 小灵不报错，改用陪伴语气：
   “这样走也可以，我帮你把后面的路线顺一下。”
3. 给出三种选择：
   - 继续原路线
   - 就近讲解这里
   - 重新规划独游路线

### 4.4 结束与记忆

1. 用户完成路线或主动结束。
2. 小灵总结：
   - 走过的景点
   - 停留时间
   - 听过的讲解
   - 拍照/打卡记录
   - 用户偏好的文化主题
3. 进入记忆页展示“独游手帐”。
4. 推荐下次路线。

---

## 五、核心体验设计

### 5.1 独游数字人导览台

在首页或探索页首屏强化数字人：

- 中央展示小灵或页面内 VRM。
- 展示一句当前主动建议。
- 展示三枚主操作：
  - 开始独自游览
  - 自由看看
  - 问小灵
- 若已有进行中的独游，展示继续导览卡：
  - 当前路线
  - 下一站
  - 已完成进度
  - 继续、暂停、结束

地图不作为第一视觉中心，而是作为“小灵正在带我去哪”的辅助模块。

### 5.2 独游偏好选择

新增一个轻量偏好面板，避免复杂表单。

| 选项 | 影响 |
|------|------|
| 轻松散步 | 推荐较短路线，减少连续讲解，增加休息提示 |
| 文化深听 | 推荐历史文化路线，讲解深度提升 |
| 拍照打卡 | 推荐地标、视野、建筑节点，增加拍照提示 |
| 安静少打扰 | 降低语音频率，优先安静节点 |

偏好不要求用户一次填完。用户跳过时使用默认独游画像。

### 5.3 独游画像

扩展现有 `UserGuideProfile`：

```ts
export interface UserGuideProfile {
  userId?: string;
  interests: GuideIntent[];
  pace: 'slow' | 'normal' | 'fast';
  groupType: 'solo' | 'couple' | 'family' | 'group';
  budgetLevel: 'low' | 'medium' | 'high';
  narrationDepth: 'brief' | 'standard' | 'deep';
  autoNarrate: boolean;
  companionLevel?: 'quiet' | 'balanced' | 'active';
  safetyReminder?: boolean;
}
```

默认画像调整为：

```ts
export const DEFAULT_USER_GUIDE_PROFILE: UserGuideProfile = {
  interests: ['history', 'free_walk'],
  pace: 'normal',
  groupType: 'solo',
  budgetLevel: 'medium',
  narrationDepth: 'standard',
  autoNarrate: true,
  companionLevel: 'balanced',
  safetyReminder: true,
};
```

### 5.4 路线推荐规则

先使用本地规则，不引入复杂模型。

推荐分数由以下因素组成：

| 因素 | 说明 |
|------|------|
| 兴趣匹配 | 路线 `suitableFor` 命中用户 `interests` |
| 独游适配 | 短路线、少强制打卡、动线清晰、安静节点加分 |
| 节奏匹配 | `pace` 慢则降低长路线权重 |
| 讲解深度 | `deep_explain` 偏好提升文化路线权重 |
| 拍照偏好 | `photo` 偏好提升地标和建筑路线权重 |

输出不只是一条路线，还需要给小灵推荐话术：

```ts
interface SoloRouteRecommendation {
  route: GuideRoute;
  reason: string;
  confidence: number;
  estimatedEnergy: 'low' | 'medium' | 'high';
  companionLine: string;
}
```

### 5.5 路中陪伴策略

新增独游陪伴触发器，基于现有距离信息和状态机。

| 触发 | 小灵行为 | 冷却 |
|------|----------|------|
| 开始路线 | 说明路线节奏和第一站 | 每次路线一次 |
| 距离目标较远 | 简短确认方向 | 60 秒 |
| 接近目标 | 提醒即将到达 | 30 秒 |
| 到达目标 | 询问是否讲解/打卡 | 每站一次 |
| 长时间停留 | 询问是否继续或休息 | 5 分钟 |
| 用户偏离 | 给出重规划选择 | 每次偏离一次 |
| 低打扰模式 | 仅字幕或短震动提示 | 持续生效 |

现有 `useTourGuide` 已有距离分层和冷却机制，可以扩展而不是重写。

### 5.6 到点讲解

到达景点后使用“两段式讲解”：

1. 自动短讲：10 到 20 秒，帮助用户快速进入场景。
2. 用户选择：
   - 继续听完整讲解
   - 切换儿童/轻松版本
   - 自己看看
   - 去下一站

讲解内容优先使用 `GUIDE_NARRATION_SCRIPTS`：

- `brief` 用于自动短讲。
- `deepDive` 用于文化深听。
- `familyVersion` 暂不作为独游默认，但可保留入口。

### 5.7 偏离与重规划

偏离判断分两类：

- 用户在地图或景点列表主动选择非当前路线景点。
- GPS 与当前目标距离持续变远，同时接近另一个景点。

处理策略：

```ts
type SoloDeviationAction =
  | 'continue_original_route'
  | 'explain_current_spot'
  | 'replan_from_here';
```

重规划优先本地执行：

1. 以当前位置或当前景点为新起点。
2. 从未完成景点中选择 2 到 4 个。
3. 保留用户偏好。
4. 生成新的 `GuideRoute`，写入 `guideSession.currentRoute`。

### 5.8 安全与舒适提醒

独游模式需要体现“一个人游”的真实关怀：

- 路线过长时提醒是否缩短。
- 长时间无操作时询问是否继续。
- 电量低或网络差时建议使用离线讲解。
- 天色较晚或临近闭园时建议收束路线。

第一阶段只实现可演示的软提醒，不接入真实天气或闭园 API。

### 5.9 游后独游记忆

基于现有 `memoryEvents` 生成独游总结：

```ts
interface SoloTourSummary {
  routeName: string;
  visitedSpotNames: string[];
  listenedNarrationCount: number;
  checkinCount: number;
  askedQuestionCount: number;
  dominantInterest: GuideIntent | null;
  nextRecommendation: GuideRoute | null;
}
```

记忆页新增一张“小灵陪你独自游览”卡片：

- 一句话总结
- 走过的路线
- 最有记忆点的景点
- 小灵的下次建议

---

## 六、状态机调整

复用现有 `TourStatus`，增加独游上下文，不新增过多状态。

### 6.1 当前状态复用

| 状态 | 独游语义 |
|------|----------|
| `idle` | 未开始独游 |
| `greeting` | 小灵独游开场 |
| `suggest` | 推荐独游路线 |
| `navigate` | 小灵带路 |
| `attraction` | 到达景点，等待讲解选择 |
| `narrating` | 正在讲解 |
| `free` | 自由看看，小灵低频待命 |
| `paused` | 暂停陪伴 |
| `completed` | 独游完成，等待生成记忆 |
| `conversing` | 问小灵 |

### 6.2 新增上下文字段

在 `TourState` 中加入：

```ts
interface SoloTourContext {
  enabled: boolean;
  intent: GuideIntent | null;
  companionLevel: 'quiet' | 'balanced' | 'active';
  deviationCount: number;
  lastPromptAt?: number;
  pendingDeviation?: {
    currentSpotId?: string;
    suggestedAction: SoloDeviationAction;
  };
}
```

保守做法：如果不想立即扩展 `TourState`，也可以先把这些字段放入 `guideSession` 的扩展对象或本地 hook 中。推荐最终进入 `TourState`，便于跨页面保持一致。

### 6.3 新增动作

```ts
startSoloTour(intent?: GuideIntent): void;
selectSoloIntent(intent: GuideIntent): void;
recommendSoloRoute(): SoloRouteRecommendation;
handleSoloDeviation(action: SoloDeviationAction): void;
setCompanionLevel(level: 'quiet' | 'balanced' | 'active'): void;
completeSoloTour(): void;
```

---

## 七、页面改造

### 7.1 首页 `app/(tabs)/index.tsx`

改造重点：

- 把“自由探索”入口升级为“独自游览”。
- 如果无进行中路线，展示小灵开场和偏好选择入口。
- 如果有进行中独游，展示继续卡片。
- 点击后进入探索页并打开独游方案面板。

### 7.2 探索页 `app/(tabs)/explore.tsx`

改造重点：

- 首屏展示“独游数字人导览台”。
- 三个主要按钮为：
  - 开始独自游览
  - 自由看看
  - 问小灵
- 地图改为陪伴式地图，强调下一站和当前位置。
- 点选地图景点时，小灵先讲一句推荐理由，再提供“设为下一站”。
- 当前导览中控卡要支持暂停陪伴、低打扰、重规划。

### 7.3 路线页 `app/routes/index.tsx` 和 `app/routes/[id].tsx`

改造重点：

- 路线卡增加“适合独自游览”的理由。
- 独游模式下按钮文案改为“让小灵陪我走这条”。
- 路线详情页突出路线节奏、预计体力、可跳过节点。

### 7.4 景点详情页 `app/attractions/[id].tsx`

改造重点：

- 到站后显示独游讲解选择：
  - 先听 20 秒
  - 深度讲解
  - 自己看看
  - 打卡
- 如果当前景点不在路线中，提示是否重规划。
- 讲解完成后推荐下一站或休息。

### 7.5 地图页 `app/map.tsx`

改造重点：

- 导航状态下高亮下一站。
- 偏离路线时显示重规划选择。
- 低打扰模式下减少语音，保留字幕提示。

### 7.6 记忆页 `app/(tabs)/memory.tsx`

改造重点：

- 增加“独游总结卡”。
- 使用 `memoryEvents` 统计经过景点、讲解、问题、打卡。
- 展示小灵下次推荐。

---

## 八、数据与本地优先策略

第一阶段优先使用本地数据，保证演示稳定：

- 路线：`LINGSHAN_GUIDE_ROUTES`
- 景点：`LINGSHAN_GUIDE_STOPS`
- 讲解：`GUIDE_NARRATION_SCRIPTS`
- 默认画像：`DEFAULT_USER_GUIDE_PROFILE`
- 状态持久化：`AsyncStorage`

后端可作为增强：

- 有网络时记录埋点。
- 有后端时同步导览进度。
- 无后端时保持完整本地闭环。

---

## 九、埋点

复用 `recordMobileTourEvent`，新增或规范以下事件：

| 事件 | 触发 |
|------|------|
| `solo_tour_started` | 用户开始独自游览 |
| `solo_intent_selected` | 用户选择独游偏好 |
| `solo_route_recommended` | 小灵推荐路线 |
| `solo_companion_prompted` | 小灵发出陪伴提醒 |
| `solo_deviation_detected` | 检测到偏离 |
| `solo_replanned` | 用户接受重规划 |
| `solo_tour_completed` | 独游完成 |
| `solo_memory_generated` | 生成独游记忆 |

如果后端事件枚举暂未支持，可以第一阶段把事件名放入 `metadata` 或先仅本地记录，避免阻塞 UI 改造。

---

## 十、验收标准

### 10.1 功能验收

- 首页或探索页有明确“独自游览”入口。
- 默认导览画像为独游画像。
- 用户能选择独游偏好并获得小灵路线推荐。
- 点击开始后进入当前路线导览状态。
- 导览过程中能看到下一站、进度、暂停、结束。
- 到达景点能触发短讲和后续选择。
- 用户选择非当前路线景点时能触发重规划提示。
- 完成后记忆页能看到独游总结。

### 10.2 体验验收

- 第一屏明确以数字人为主。
- 小灵的话术像陪伴式导游，不像系统提示。
- 低打扰模式下不会频繁语音播报。
- 偏离路线时没有责备或错误感。
- 无后端时核心演示仍可完成。

### 10.3 技术验收

- `cd software/mobile && npx tsc --noEmit --pretty false` 通过。
- 独游推荐规则有单元测试。
- 导览状态转换有单元测试。
- 关键页面在 Expo Web 中能打开。
- 不引入新的大型依赖。

---

## 十一、实施分期

### P0：独游主链路

- 调整默认画像为 solo。
- 新增独游入口和偏好选择。
- 实现本地独游路线推荐。
- 小灵开场并启动路线。
- 导览中控显示独游进度。

### P1：路中陪伴与到点讲解

- 扩展 `useTourGuide` 的独游提醒策略。
- 到站后短讲和讲解选择。
- 支持低打扰模式。
- 补充数字人表情和动作。

### P2：偏离重规划与记忆总结

- 检测点选非路线景点。
- 提供继续、就近讲解、重规划三选项。
- 生成独游总结卡。
- 补充埋点。

### P3：演示增强

- 语音问答接入独游上下文。
- 根据拍照识景结果更新路线。
- 增加闭园、电量、网络等舒适提醒。

---

## 十二、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| GPS 不稳定 | 到站触发不准 | 支持用户手动确认到达 |
| 语音过多 | 独游体验被打扰 | 冷却策略 + 低打扰模式 |
| 后端不可用 | 演示中断 | 本地路线、本地讲解、本地状态优先 |
| 状态机过度膨胀 | 后续难维护 | 复用现有状态，只增加独游上下文 |
| 页面同时出现多个数字人 | 视觉混乱 | 页面内 VRM 与全局浮窗互斥 |
| 路线推荐太像固定列表 | 智能感不足 | 输出推荐理由、体力估计、陪伴话术 |

---

## 十三、开放问题

1. 独游入口放首页为主，还是探索页为主？推荐：首页给入口，探索页承载完整体验。
2. 独游默认路线是否需要新增一条短路线？推荐：新增一条 90 到 120 分钟的独游精选线。
3. 是否要把“自由探索”保留为独立入口？推荐：保留，但文案降级为“自由看看”，不要抢独游主入口。
4. 第一阶段是否接后端推荐？推荐：不接，先本地规则保证稳定。

---

## 十四、结论

本方案把“独自游览”定义为数字人主动导览的核心场景：小灵负责开场、推荐、陪伴、讲解、重规划和总结；用户保留自由选择和低打扰控制。实现上复用现有状态机、路线数据、数字人驱动和记忆系统，以较小风险获得明显的产品升级和比赛展示亮点。
