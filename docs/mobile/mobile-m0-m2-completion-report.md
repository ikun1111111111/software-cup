# 移动端 M0-M2 完成成果报告

日期：2026-06-23

## 交付范围

本次完成并落地 `mobile-digital-human-guide-module-plan.md` 中的前三个模块：

- M0 数据资产层
- M1 小灵导览状态中枢
- M2 云游主控台保留增强

目标是让移动端先具备“不依赖后端也能演示的数字人导览闭环”：小灵可基于本地灵山数据推荐路线、开启导览、更新当前站点与下一站、记录记忆事件，并由云游页承担唯一导览主控台职责。

## M0 数据资产层

新增文件：

- `software/mobile/types/guide.ts`
- `software/mobile/data/lingshanGuideData.ts`
- `software/mobile/mocks/guide.ts`
- `software/mobile/constants/offline-demo.ts`

完成内容：

- 定义统一导览契约：`GuideIntent`、`UserGuideProfile`、`GuideStop`、`GuideRoute`、`GuideSessionState`、`GuideMemoryEvent`。
- 沉淀灵山本地导览数据：10 个核心导览点、3 条主题路线、5 组讲解脚本。
- 路线覆盖：
  - 历史文化深度线，约 6 小时。
  - 自然舒缓观景线，约 5 小时。
  - 亲子轻松互动线，约 4 小时。
- 记录数据来源摘要：行为数据约 14 万条、5 万名游客、152 个景点、平均满意度 3.72、中位停留约 3.7 小时。
- 提供 mock 适配器，把 M0 数据转换成现有 `api/spots`、`api/routes` 和 `useTourOrchestrator` 能消费的数据结构。
- 将旧离线演示路线切换到 M0 数据源，避免应用内出现两套不一致的路线数据。

## M1 小灵导览状态中枢

修改文件：

- `software/mobile/hooks/useTourOrchestrator.ts`

完成内容：

- 扩展 `TourState`，新增：
  - `sessionId`
  - `activeIntent`
  - `guideProfile`
  - `guideSession`
  - `memoryEvents`
- 新增本地导览动作：
  - `startGuideRoute(route, intent)`：使用 M0 `GuideRoute` 直接开启导览，不依赖 SSE/后端。
  - `arriveAtStop(spot)`：记录抵达景点并切换现场讲解上下文。
  - `createMemoryEvent(input)`：统一写入导览记忆事件。
  - `updateGuideProfile(profile)`：更新小灵导览画像。
- 增强已有动作：
  - `startTour` 会同步写入 `guideSession` 和 `memoryEvents`。
  - `completeSpot` 会更新进度、已完成景点、下一站和打卡记忆事件。
  - `endTour` 会写入结束事件，并把会话状态切到 `completed`。
- 保留现有后端 SSE、埋点、暂停/继续/打卡动作，不破坏其他页面调用。

## M2 云游主控台保留增强

修改文件：

- `software/mobile/app/(tabs)/explore.tsx`

完成内容：

- 云游页数据加载接入 M0 fallback：
  - 后端景点或路线为空时，自动使用本地灵山导览数据。
  - 后端请求失败时，仍可展示景点、路线、地图点位和小灵主控台。
- “开始小灵导览”不再只是跳转路线页：
  - 直接根据用户画像选择默认 M0 路线。
  - 调用 `startGuideRoute` 本地开启导览。
  - 页面立即显示当前路线、当前站点、下一站和进度。
- “结束导览”接入记忆出口：
  - 调用 `endTour` 写入完成事件。
  - 自动跳转到记忆页。
- 将底部重复功能收束为支撑入口：
  - 调整路线。
  - 查景点资料。
  - 生成旅程记忆。
- 移除云游页中重复承担资料库职责的路线横滑、分类导航、景点故事轮播渲染，让它回到“导览主控台”定位。

## 当前导览闭环

现在移动端可用本地数据完成这条演示链路：

```text
打开云游页
-> 小灵读取 M0 本地数据
-> 点击开始小灵导览
-> M1 写入 GuideSessionState
-> 云游页显示当前路线、进度、下一站
-> 可进入地图、景点讲解、问小灵
-> 结束导览
-> 写入 GuideMemoryEvent
-> 跳转记忆页
```

## 验证结果

已通过：

```bash
npx tsc --noEmit
```

结果：无 TypeScript 错误。

已通过：

```bash
npm test -- --runInBand tourProgress localKnowledge
```

结果：

- 2 个测试套件通过。
- 11 条测试通过。

已通过 Expo Web 冒烟：

```bash
npm run start -- --web --port 8097
```

结果：

- Metro Bundler 启动成功。
- Web bundle 成功。
- `http://localhost:8097` 返回 HTTP 200。

环境提醒：

- Expo 启动时提示 `expo-sqlite@56.0.5` 与当前 Expo 期望版本 `~15.1.4` 不一致。该提醒属于既有依赖环境问题，本次 M0-M2 未修改依赖版本。

## 影响边界

本次只处理 M0-M2，不改 M3 之后的页面职责：

- 首页唤醒页仍待 M3 重构。
- 小灵对话室仍待 M4 重构。
- 路线规划器仍待 M5 重构。
- 现场讲解、地图执行、历史专题、记忆增强、偏好画像仍按后续模块推进。

工作区原本存在大量未提交和未跟踪文件，本次没有回退或覆盖无关改动。

## 后续建议

下一步建议并行推进：

- M3：首页改成小灵唤醒和意图选择。
- M4：聊天页强制携带当前路线、当前景点和画像上下文。
- M5：路线页使用 M0 `GuideRoute`，开始路线时统一调用 `startGuideRoute`。
- M9：记忆页读取 `memoryEvents`，生成“我和小灵走过的灵山”时间线。
