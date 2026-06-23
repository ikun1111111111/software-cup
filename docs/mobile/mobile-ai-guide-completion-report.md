# 移动端 AI 数字人导览完成报告

日期：2026-06-22  
范围：仅移动端，主要目录为 `software/mobile`

## 1. 完成结论

本轮移动端任务已完成到可验收状态：

- P1 数字人讲解驱动统一已完成。
- P2 移动端本地知识问答兜底已完成。
- P3 主动导览闭环已完成。
- P9 实施路线图收口已完成：演示模式、离线路线/景点、移动端事件上报链路补齐。
- P10 风险应对已完成：弱网、后端不可用、现场演示数据和事件丢失风险均有兜底。
- TypeScript 类型检查通过。
- Jest 单元测试通过：9 个测试套件，57 个用例。

当前移动端已经具备“选择路线 -> 开始导览 -> 当前目标导航 -> 景点详情讲解/打卡 -> 继续下一站 -> 全部完成后结束导览”的闭环体验。

## 2. 关键交付

### P1 数字人讲解驱动统一

相关文件：

- `software/mobile/hooks/useDigitalHumanDriver.ts`
- `software/mobile/utils/digitalHumanDriver.ts`
- `software/mobile/__tests__/digitalHumanDriver.test.ts`
- `software/mobile/components/vrm/VRMFloating.tsx`
- `software/mobile/components/vrm/VRMGuide.tsx`
- `software/mobile/app/guide-demo.tsx`
- `software/mobile/app/(tabs)/chat.tsx`

完成内容：

- 统一管理数字人的 TTS、字幕、口型、表情、动作、头部朝向。
- 清理多个入口里重复的数字人播放逻辑。
- 补充讲解时长估算与抬头动作曲线测试。

### P2 移动端本地知识兜底

相关文件：

- `software/mobile/utils/localKnowledge.ts`
- `software/mobile/__tests__/localKnowledge.test.ts`
- `software/mobile/app/(tabs)/chat.tsx`
- `docs/mobile-ai-guide-p2-local-knowledge.md`

完成内容：

- 内置 25+ 条灵山胜境高频演示问答。
- 本地高频问题优先回答，后端 SSE 失败时使用离线兜底。
- 聊天气泡显示答案来源，数字人播报只读取答案正文。
- 覆盖短时游览、亲子/老人路线、礼佛注意事项、拍照点、交通停车、雨天游览等移动端高频场景。

### P3 主动导览闭环

相关文件：

- `software/mobile/hooks/useTourOrchestrator.ts`
- `software/mobile/utils/tourProgress.ts`
- `software/mobile/__tests__/tourProgress.test.ts`
- `software/mobile/app/(tabs)/index.tsx`
- `software/mobile/app/map.tsx`
- `software/mobile/app/attractions/[id].tsx`

完成内容：

- 固定导览状态语义：`currentSpot` 是当前正在前往或展示的目标景点，`nextSpot` 是当前目标之后的预览景点。
- 修正打卡完成后的推进逻辑，避免完成当前景点后直接跳到预览景点导致漏站。
- 景点详情页的打卡和“继续导览”统一使用 `completeSpot` 返回的 `nextTargetSpot`。
- 首页 GPS 提示、地图语音和导航遮罩统一优先使用当前导览目标。
- 地图页按目标景点去重自动播报，避免 GPS 距离刷新导致同一导航提示重复播放。
- 抽出 `getTourCompletionTransition` 纯函数，并补充中间站、最后一站、路线外景点三类测试。

### P9-P10 路线图与风险兜底收口

相关文件：

- `software/mobile/api/config.ts`
- `software/mobile/api/routes.ts`
- `software/mobile/api/spots.ts`
- `software/mobile/api/analytics.ts`
- `software/mobile/constants/offline-demo.ts`
- `software/mobile/utils/localDemoData.ts`
- `software/mobile/utils/mobileAnalytics.ts`
- `software/mobile/services/mobileAnalytics.ts`
- `software/mobile/app/(tabs)/chat.tsx`
- `software/mobile/app/(tabs)/memory.tsx`
- `software/mobile/app/(tabs)/explore.tsx`
- `software/mobile/__tests__/localDemoData.test.ts`
- `software/mobile/__tests__/mobileAnalytics.test.ts`

完成内容：

- 新增 `EXPO_PUBLIC_DEMO_MODE`，聊天页显示“在线服务模式 / 演示数据模式”状态。
- 路线与景点 API 在演示模式或后端不可用时自动降级到本地数据，内置 3 条导览路线和 5 个核心景点。
- 离线演示数据统一到 `lingshan-history-six-hours`、`lingshan-nature-five-hours`、`lingshan-family-four-hours` 路线口径，避免测试、页面和导览状态错位。
- 移动端事件上报失败时自动写入本地队列，后续进入聊天/记忆页会尝试刷新到后端 `/api/analytics/mobile-events`。
- 聊天问答记录 `question_asked`，区分本地命中、后端完成、离线兜底与拒答状态，并记录延迟。
- 记忆创建记录 `memory_created`，导览生命周期沿用已有 `tour_started`、`spot_arrived`、`narration_played`、`route_completed` 事件。
- 补齐探索页“后台工具/支撑流程”卡片样式，修复 TypeScript 样式缺口。

## 3. 验证结果

已执行：

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
cd ../..
python -m py_compile backend/app/api/analytics.py
```

结果：

- TypeScript：通过。
- Jest：通过。
- Python 语法检查：通过。
- 测试统计：9 个测试套件，57 个测试用例，全部通过。

## 4. 剩余风险与后续建议

本轮已完成移动端代码与自动化验证，并补齐现场演示风险兜底。仍建议在真机上补一轮体验验收：

- GPS 定位距离、到达提示、地图导航遮罩。
- TTS 播放、数字人口型/表情/动作同步。
- 相机/扫码打卡流程。
- Expo 页面切换和低端机渲染性能。

已补充真机验收准备文档：`docs/mobile-real-device-acceptance.md`。当前机器未检测到 `adb` 或 `emulator`，无法直接执行真机/模拟器点击验收；代码侧已补齐相机、相册、定位权限配置，并通过 Expo 配置解析。

后端 RAG/FAQ 与移动端本地知识库同源化仍是后续任务。当前移动端已有演示数据兜底，但建议后续把本地 FAQ、路线和景点资料转成共享数据源，避免服务端和移动端答案长期分叉。

## 5. 完成状态

移动端本轮任务状态：已完成。  
验收方式：类型检查通过 + 单元测试通过 + 后端语法检查通过 + 完成报告归档。
