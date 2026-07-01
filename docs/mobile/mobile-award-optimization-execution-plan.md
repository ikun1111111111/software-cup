# 移动端拿奖优化执行方案

日期：2026-06-23  
范围：`software/mobile` 为主，联动后台数据看板与演示材料

## 1. 目标定位

把移动端从“景区功能集合”收束成一个可答辩、可演示、可抗风险的 AI 数字人导游作品。

作品主叙事：

> 小灵是面向景区的情境感知 AI 数字人导游。它根据游客时间、兴趣、当前位置和游览行为，完成路线规划、主动带路、到点讲解、智能问答、拍照打卡、旅行记忆生成和运营数据回流。

## 2. 赛题匹配度

| 赛题要求 | 当前基础 | 优化动作 |
|---|---|---|
| 数字人形象展示 | 已有 VRM 数字人、表情、动作、口型、TTS 驱动 | 首页首屏强化小灵导览主控台，保留 2D/静态兜底说明 |
| 多模态交互 | 已有文字问答、TTS、地图、拍照/扫码打卡 | 演示链固定为语音/文字问答 + 地图到点 + 拍照入册 |
| 智能问答 | 已有后端问答、本地知识库、离线兜底 | 气泡明确显示答案来源，突出不编造与弱网兜底 |
| 个性化讲解 | 已有路线、画像、导览状态机 | 首页提供 1 小时、亲子、老人/慢游等意图入口 |
| 情感互动 | 已有关键词驱动表情动作 | 包装成语义情绪驱动，演示感谢、惊叹、抱歉场景 |
| 后台分析 | 已有移动端埋点与管理端基础 | 展示问答热词、路线完成率、景点热度、记忆生成数 |

## 3. 核心演示链

1. 打开 App，数字人小灵欢迎。
2. 首页点击“我只有 1 小时 / 亲子轻松游 / 安静慢游”。
3. 小灵生成路线并解释推荐理由。
4. 进入地图页，显示当前目标、距离、下一步提示。
5. 模拟到达景点，触发到点讲解。
6. 追问知识问题，显示知识来源。
7. 拍照或直接打卡。
8. 路线结束后进入旅行记忆页，生成旅行手账。
9. 管理端展示游客互动数据回流。

## 4. 第一阶段执行内容

本阶段先做最能提升第一印象和演示稳定性的移动端入口收束。

### M1：首页小灵导览主控台

- 在首页 Hero 下方新增“今日小灵主控台”。
- 显示当前路线、当前目标、下一站、完成进度。
- 没有导览时显示三张意图卡：
  - 1 小时经典线
  - 亲子轻松线
  - 安静慢游线
- 点击意图卡直接使用本地 M0 路线启动导览，避免现场依赖后端。
- 提供“问小灵”“看地图”“生成记忆”三个明确操作入口。

### M2：地图与到点演示增强

- 当前目标景点更醒目。
- 保留模拟到达/继续导览兜底。
- 到点讲解和数字人口播统一。

### M3：旅行记忆高潮页

- 记忆页突出“旅程线索”与“入册”。
- 路线完成后引导生成旅行回顾卡。
- 把问答、讲解、打卡沉淀为可展示素材。

## 5. 后续执行优先级

| 优先级 | 任务 | 价值 |
|---|---|---|
| P0 | 首页主控台与快速意图导览 | 第一眼看懂作品，现场演示稳定 |
| P0 | 真机演示脚本与弱网模式验证 | 降低比赛现场风险 |
| P1 | 地图页到点讲解链路强化 | 展示 AI 导游不是聊天机器人 |
| P1 | 旅行记忆图谱视觉强化 | 形成作品闭环与差异化 |
| P2 | 后台运营看板演示数据整理 | 对应管理方数据洞察评分点 |

## 6. 验收标准

- 首页无导览时，3 秒内能看懂“小灵能规划路线并带路”。
- 点击任一意图卡后，可立即进入导览状态。
- 当前路线、当前目标、下一站和进度在首页可见。
- 后端不可用时仍能用本地路线启动导览。
- TypeScript 检查通过，核心测试不回归。

## 7. 2026-06-23 执行记录

已完成 P0 的第一步：首页“小灵导览主控台”第一版。

变更文件：

- `software/mobile/app/(tabs)/index.tsx`
- `docs/mobile/mobile-award-optimization-execution-plan.md`

实现内容：

- 首页 Hero 下方新增“今日小灵主控台”。
- 无导览时展示 3 个快速意图入口：
  - `1小时经典线`
  - `亲子轻松线`
  - `安静慢游线`
- 点击快速意图后直接使用本地 M0 导览数据启动路线，不依赖后端。
- 主控台展示当前目标、下一站和路线进度。
- 新增“完整方案 / 问小灵 / 看地图 / 生成记忆”四个高频操作入口。
- 首页欢迎播报改为两段式数字人开场，带动作参数。

验证结果：

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript：通过。
- Jest：19 个测试套件、92 个测试用例全部通过。
- Expo Web：`http://localhost:8103` 返回 HTTP 200。

备注：

- 当前环境没有可用的 Playwright 依赖，未执行浏览器截图级自动化检查。
- 真机 GPS、TTS、VRM 渲染和相机/扫码仍需要按 `docs/mobile/mobile-real-device-acceptance.md` 做人工验收。

## 8. 2026-06-23 地图演示链路增强

已完成 M2 的第一步：地图页增加现场演示控制条。

变更文件：

- `software/mobile/app/map.tsx`
- `docs/mobile/mobile-award-optimization-execution-plan.md`

实现内容：

- 地图页底部导览面板新增“现场演示”控制条。
- 新增“模拟到达”按钮：
  - 不依赖 GPS，可直接把当前地图目标写入导览抵达状态。
  - 调用 `tourActions.arriveAtStop`，沉淀 `arrive_stop` 记忆事件。
  - 地图自动居中当前景点，并触发小灵口播。
- “到点讲解 / 听小灵讲”会调用 `tourActions.startNarration`，沉淀 `narration` 记忆事件。
- 保留原有“路线指引、问小灵、景点详情、继续路线”等入口。

验证结果：

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript：通过。
- Jest：19 个测试套件、92 个测试用例全部通过。

演示价值：

- 比赛现场无需等待真实 GPS，即可稳定展示“到点 -> 讲解 -> 记忆沉淀”的 AI 导游闭环。
- 地图页不再只是导航页，而是数字人主动导览的执行现场。

## 9. 2026-06-23 旅行记忆高潮页增强

已完成 M3 的第一步：记忆页新增“AI 手账生成台”。

变更文件：

- `software/mobile/app/(tabs)/memory.tsx`
- `docs/mobile/mobile-award-optimization-execution-plan.md`

实现内容：

- 在记忆页 Hero 下方新增“小灵手账生成台”。
- 汇总当前导览沉淀数据：
  - 讲解次数
  - 打卡次数
  - 问答次数
  - 已入册记忆数
  - 待入册线索数
- 提供三个演示入口：
  - `一键入册`：打开第一条旅程线索的新建记忆弹窗。
  - `生成总结`：调用现有旅程总结生成流程。
  - `分享手帐`：打开现有分享卡预览。
- 与已有 `MemoryGraphPanel` 复用同一份 `memoryGraphCandidates`，不重复造数据源。

验证结果：

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript：通过。
- Jest：19 个测试套件、92 个测试用例全部通过。

演示价值：

- 评委能直接看到“导览行为 -> 旅程线索 -> AI 手账”的闭环。
- 记忆页从普通列表页升级为作品收束页，适合作为 3-5 分钟演示的结尾。

## 10. 2026-06-23 后台运营数据闭环增强

已完成后台管理端展示增强：移动端导览事件可以在管理端形成运营驾驶舱。

变更文件：

- `frontend/src/pages/admin/DashboardPage.tsx`
- `docs/mobile/mobile-award-optimization-execution-plan.md`

实现内容：

- 管理端“移动端导览闭环”升级为“AI 导游运营驾驶舱”。
- 新增 4 个 7 日移动端核心指标：
  - 移动端事件
  - 活跃会话
  - 路线启动
  - 路线完成
- 保留并强化路线完成率、景点热度、最近导览事件。
- 新增路线转化排行，展示每条路线的开始次数、完成次数和完成率。
- 新增游客偏好画像，展示历史文化、自然慢游、亲子互动等意图分布。
- 最近事件改为中文可读标签，如开始导览、抵达景点、播放讲解、生成记忆。

验证结果：

```bash
cd frontend
npm run build
```

结果：

- 全量构建未通过，失败来自仓库既有问题：测试文件导入 `@testing-library/react` 类型、VRM 大小写路径冲突、AMap 命名空间声明缺失等。
- 本次变更文件窄范围类型检查通过：

```bash
npx tsc --noEmit --pretty false --jsx react-jsx --module esnext --target es2020 --moduleResolution bundler --allowSyntheticDefaultImports --esModuleInterop --skipLibCheck --types vite/client src/pages/admin/DashboardPage.tsx
```

演示价值：

- 移动端的问答、路线、到点、讲解、记忆事件可以回流到后台。
- 答辩时可以从游客端自然切到管理端，说明作品不只服务游客，也服务景区运营决策。

## 11. 2026-06-23 数字人现场兜底增强

已完成 VRM 渲染失败/加载中场景的静态数字人兜底。

变更文件：

- `software/mobile/components/vrm/VRMView.tsx`
- `docs/mobile/mobile-award-optimization-execution-plan.md`

实现内容：

- `VRMView` 新增 `StaticAvatarFallback`。
- Web 与 Native 两套 VRM 渲染均接入 `modelReady` 状态。
- VRM 模型加载中或加载失败时，显示静态 2D“小灵”形象。
- VRM 成功加载后自动隐藏 fallback，不影响原 3D 模型展示。
- fallback 会根据表情和 speaking 状态调整眼睛、嘴型和状态文案。

验证结果：

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript：通过。
- Jest：19 个测试套件、92 个测试用例全部通过。

演示价值：

- 现场如果 VRM 资源、WebGL 或设备性能出现问题，页面仍有数字人形象，不会出现空白讲解区。
- 保留“数字人导游”第一视觉信号，提高演示抗风险能力。

## 12. 2026-06-24 移动端 P2：小灵闭环与游客反馈

已完成移动端 P2 的第一步：把问答、回忆、我的页面继续收束为“小灵数字人导游”闭环，并补齐游客反馈埋点。

变更文件：

- `software/mobile/utils/digitalHumanProduct.ts`
- `software/mobile/app/(tabs)/chat.tsx`
- `software/mobile/app/(tabs)/memory.tsx`
- `software/mobile/app/(tabs)/profile.tsx`
- `software/mobile/components/memory/HeroHeader.tsx`
- `software/mobile/utils/mobileAnalytics.ts`
- `software/mobile/api/analytics.ts`
- `software/mobile/components/vrm/VRMTypes.ts`
- `software/mobile/components/vrm/VRMManager.ts`
- `software/mobile/__tests__/digitalHumanProduct.test.ts`
- `software/mobile/__tests__/mobileAnalytics.test.ts`
- `software/mobile/__tests__/vrmPageContext.test.ts`

实现内容：

- 新增 `XIAOLING_CHAT_COPY`、`XIAOLING_MEMORY_COPY`、`XIAOLING_PROFILE_COPY`，统一问答、回忆、个人档案的数字人产品文案。
- 聊天页强化为“和小灵对话”的多模态交互舱，语音/文字入口、导览快捷操作和路线 CTA 均围绕小灵。
- 回忆页 Hero 改为“小灵回忆册”，手账生成台文案改为“让小灵入册”，突出“导览事件 -> 旅行记忆”的作品闭环。
- 我的页改为“我的小灵导览档案”，新增“游客反馈给小灵”卡片，支持“讲解清楚 / 路线合适 / 还想追问”三类反馈。
- 新增 `feedback_submitted` 移动端埋点事件，为管理端游客反馈分析提供移动端数据源。
- 将 `profile` 纳入 VRM 页面上下文，数字人可在个人档案页给出对应欢迎语和快捷问题。

验证结果：

```bash
cd software/mobile
npm test -- digitalHumanProduct.test.ts mobileAnalytics.test.ts vrmPageContext.test.ts --runInBand
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript：通过。
- Jest：21 个测试套件、102 个测试用例全部通过。
- Expo Web：`http://localhost:8099` 返回 HTTP 200。

演示价值：

- 移动端不再只覆盖“问答、带路、回忆”，还补上“游客反馈回流”的数据入口。
- 答辩时可以说明小灵既服务游客，也通过反馈数据帮助景区优化讲解、路线和运营。
