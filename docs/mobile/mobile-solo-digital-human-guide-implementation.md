# 移动端独自游览数字人导览实施说明

## 目标

本次优化把移动端主动导览从“选择路线后跟随讲解”推进到“以数字人小灵为核心的独自游览体验”。核心体验是：用户一个人进入景区后，小灵主动推荐适合独游的路线，按陪伴强度控制打扰频率，在地图临时偏离路线时继续解释与顺路重排，并在游览结束后生成可回顾的独游小结。

## 已实施范围

### 1. 独游优先的用户画像

- 默认导览画像改为 `solo`，并启用安全提醒。
- 新增 `companionLevel`，支持 `quiet`、`balanced`、`active` 三种陪伴强度。
- 独游意图会自动映射到画像：
  - `free_walk` / `quiet`：少打扰、轻讲解、慢节奏。
  - `history` / `deep_explain`：更主动、更深入的文化讲解。
  - `photo`：保留自由节奏，同时强调拍照节点。

### 2. 本地独游路线推荐

实现文件：

- `software/mobile/utils/soloTour.ts`
- `software/mobile/data/lingshanGuideData.ts`

能力：

- 按用户兴趣、节奏、陪伴强度、讲解深度对路线打分。
- 返回推荐理由、信心分、体力估计和数字人陪伴话术。
- 在无后端服务时仍可稳定演示，适合比赛现场或弱网环境。

### 3. 首页与探索页独游入口

实现文件：

- `software/mobile/app/(tabs)/index.tsx`
- `software/mobile/app/(tabs)/explore.tsx`
- `software/mobile/components/guide/GuidePlanModal.tsx`

变化：

- 首页主入口从“自由探索”调整为“独自游览”。
- 探索页主按钮调整为“开始独自游览”。
- 进入路线前，小灵会先说明推荐理由和陪伴方式。

### 4. 导览状态机扩展

实现文件：

- `software/mobile/hooks/useTourOrchestrator.ts`

新增状态：

```ts
soloTour: {
  enabled: boolean;
  intent: GuideIntent | null;
  companionLevel: 'quiet' | 'balanced' | 'active';
  deviationCount: number;
  pendingDeviation?: SoloDeviationResult | null;
  summary?: SoloTourSummary | null;
}
```

新增动作：

- `selectSoloIntent(intent)`：选择独游意图并更新画像。
- `recommendSoloRoute()`：返回当前画像下的路线推荐。
- `startSoloTour(intent?)`：一键开始独游路线。
- `handleSoloDeviation(spotId, action?)`：处理用户临时点选非当前路线节点。
- `completeSoloTour()`：生成独游小结。

记忆事件增强：

- 开始路线写入 `start_route`。
- 开始讲解写入 `narration`。
- 用户提问写入 `ask`。
- 打卡完成写入 `checkin`。
- 路线完成时生成 `soloTour.summary`。

### 5. 地图偏航陪伴

实现文件：

- `software/mobile/app/map.tsx`

交互：

- 独游路线进行中，用户点选路线外或已完成景点时，小灵不再只做普通景点播报，而是提示“这样走也可以”，并继续为当前景点解释。
- 偏航事件会写入状态，后续可扩展为弹出“继续原路线 / 从这里重排 / 先讲当前点”的操作面板。

### 6. 景点页独游到达话术

实现文件：

- `software/mobile/app/attractions/[id].tsx`

变化：

- 独游模式到达景点时，小灵的话术从强引导改为陪伴式提示：
  - 先让用户自己看一眼。
  - 提醒需要时可点讲解。
  - 保留原有讲解、打卡、继续导览能力。

### 7. 记忆页独游复盘

实现文件：

- `software/mobile/app/(tabs)/memory.tsx`

展示内容：

- “小灵陪你独自游览”复盘卡。
- 当前路线名称。
- 讲解次数、打卡次数、提问次数。
- 已陪用户看过的景点。
- 下一条可继续游览的推荐路线入口。

## 核心体验流

1. 用户从首页点击“独自游览”。
2. 小灵按独游画像推荐路线，并说明陪伴方式。
3. 用户开始路线后进入地图或景点页。
4. 小灵按距离、到达、讲解、打卡节点主动陪伴。
5. 用户临时点选别的景点时，小灵识别偏航并顺势讲解。
6. 完成打卡后，状态机会更新进度并在全部完成时生成独游小结。
7. 用户进入记忆页查看本次独游复盘，并可继续下一条路线。

## 测试与验证

已覆盖的自动化测试：

- `software/mobile/__tests__/soloTour.test.ts`
  - 默认画像为独游优先。
  - 安静独游推荐自然路线。
  - 深度讲解推荐历史文化路线。
  - 陪伴提示、偏航检测、重排路线、独游总结。
- `software/mobile/__tests__/tourProgress.test.ts`
- `software/mobile/__tests__/digitalHumanDriver.test.ts`

推荐验证命令：

```bash
cd software/mobile
npx jest __tests__/soloTour.test.ts --runInBand
npx jest __tests__/tourProgress.test.ts __tests__/digitalHumanDriver.test.ts --runInBand
npx tsc --noEmit --pretty false
```

## 已知限制

- 偏航处理目前以状态和语音提示为主，尚未做完整弹窗动作面板。
- 路线重排是本地轻量算法，未结合实时拥堵、人流热度或天气。
- 独游安全提醒已进入画像字段，但还没有独立的安全提示 UI。
- 小结基于本地导览记忆事件，后续可同步到后端记忆接口，形成跨设备游览档案。

## 后续增强建议

1. 在地图页增加偏航操作面板，提供“继续原路线 / 从这里重排 / 先讲当前点”。
2. 根据 `companionLevel` 和 GPS 距离做主动提示冷却，避免独游场景下过度打扰。
3. 接入人流、天气、营业时间，升级路线推荐为实时策略。
4. 将 `soloTour.summary` 同步到后端记忆系统，支持生成独游手帐和答辩展示数据。
5. 为独游模式增加安全提醒卡，例如夜间、偏远点位、长时间停留等场景提示。
