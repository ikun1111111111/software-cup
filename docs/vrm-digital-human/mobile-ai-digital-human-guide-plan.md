# 移动端 AI 数字人导览完善方案（赛题对齐版）

> 项目：景区导览服务 AI 数字人  
> 目标端：移动端游客交互端为主，Web/管理端作为后台支撑  
> 当前项目：`software/mobile/` + `backend/`  
> 版本：v1.0  
> 日期：2026-06-20  

---

## 15. 2026-06-23 P9-P10 执行记录

本轮已完成第 9 节“实施路线图”和第 10 节“风险与应对”的移动端收口，重点把现场演示风险从文档方案落到代码兜底。

### 已落地

1. 新增移动端演示模式配置 `EXPO_PUBLIC_DEMO_MODE`，聊天页显示“在线服务模式 / 演示数据模式”状态。
2. 路线与景点 API 支持演示模式和后端失败自动降级，本地内置 3 条导览路线与 5 个核心景点。
3. 离线演示路线统一为 `lingshan-history-six-hours`、`lingshan-nature-five-hours`、`lingshan-family-four-hours`，保证页面、测试和导览状态口径一致。
4. 移动端事件上报增加本地队列兜底，后端不可用时不丢事件，后续进入聊天/记忆页会尝试刷新到 `/api/analytics/mobile-events`。
5. 聊天问答记录 `question_asked`，区分本地命中、后端完成、离线兜底与拒答状态，并记录延迟。
6. 记忆创建记录 `memory_created`，导览生命周期继续复用 `tour_started`、`spot_arrived`、`narration_played`、`route_completed`。
7. 补齐探索页“后台工具/支撑流程”卡片样式，修复 TypeScript 样式缺口。

### 风险项对应

| 风险 | 本轮处理 |
|---|---|
| 网络不稳定 | 路线/景点/问答可走本地演示数据，事件先入本地队列 |
| 语音/问答链路慢 | 聊天页保留本地 FAQ 优先命中和离线兜底，记录问答延迟 |
| 定位精度不足 | 既有 GPS + 手动打卡链路保留，事件记录 `distance_source` |
| 文档与代码不一致 | 完成报告与本方案同步记录 P9-P10 状态 |
| 后台分析断点 | 移动端事件对齐后端 `/api/analytics/mobile-events` 和 `/mobile-tour-summary` |

### 验证结果

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
cd ../..
python -m py_compile backend/app/api/analytics.py
```

验证通过：移动端 TypeScript 通过；Jest 9 个测试套件、57 个用例全部通过；后端 analytics 文件语法检查通过。

## 14. 2026-06-21 P1 执行记录

本轮已完成 P1 中“数字人和多模态主链路”的第一段收口：移动端主要数字人入口统一改为 `DigitalHumanDriver` 驱动。

### 已落地

1. 新增 `software/mobile/hooks/useDigitalHumanDriver.ts`，统一承接 `useVRMSync`、`textToTimeline`、`ExpressionPlayer`、字幕、口型、表情、动作和头部朝向。
2. 新增 `software/mobile/utils/digitalHumanDriver.ts`，提供 `estimateSpeechDuration` 与 `computeLookUpHeadRotation`，避免各页面重复计算语音时长和 lookUp 曲线。
3. 新增 `software/mobile/__tests__/digitalHumanDriver.test.ts`，覆盖 Driver 基础工具函数。
4. 已接入 Driver 的页面/组件：
   - `software/mobile/components/vrm/VRMFloating.tsx`
   - `software/mobile/components/vrm/VRMGuide.tsx`
   - `software/mobile/app/guide-demo.tsx`
   - `software/mobile/app/(tabs)/chat.tsx`
5. `guide-demo` 与聊天页不再各自维护 `ExpressionPlayer`、`textToTimeline`、动作状态、头部曲线和 reset timer，后续统一在 Driver 层演进。

### 验证结果

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

验证通过：3 个测试套件、35 个用例全部通过。

### 下一步

1. P2：基于 `docs/lingshan-knowledge-evaluation-checklist.md` 扩充 100+ 标准问答题库，并打通 RAG/FAQ 评测报告。
2. P3：把首页、路线详情、地图、景点详情的 TourOrchestrator 状态闭环补齐，让数字人主动导览而不只在聊天页响应。

## 1. 方案结论

本次完善应把移动端从“景区信息 App + 数字人组件”收束成一个可演示、可评测的“AI 数字人导游”闭环：

```
数字人欢迎 -> 游客偏好采集 -> 个性化路线 -> 地图导航 -> 到点讲解
     -> 语音/文本问答 -> 表情/口型/动作反馈 -> 旅行记忆 -> 管理端沉淀数据
```

赛题重点不是单点功能堆叠，而是让评委看到数字人真正承担导游角色：能看起来像导游、能说、能答、能带路、能记住游客行为，并能把数据回流给景区运营。

当前移动端已有较好的基础：VRM 数字人、聊天页、地图页、路线页、旅行记忆页、TourOrchestrator、离线缓存和 TTS/语音相关结构。后续重点是补齐赛题硬指标：知识库准确率、语音问答延迟、口型/表情自然度、移动端稳定性、后台配置与数据分析。

---

## 2. 赛题要求映射

| 赛题要求 | 移动端目标形态 | 当前基础 | 差距与优先级 |
|---|---|---|---|
| 数字人形象展示 | 3D VRM 数字人常驻导览，支持口型、语音、表情；低端机可降级 2D/静态形象 | 已有 `VRMManager`、`VRMView`、`VRMFloating`、`textTimeline` | P0：修复数字人时间轴测试；P1：补齐口型与 TTS 时间戳同步、低性能降级 |
| 多模态交互 | 文字输入、按住说话、快捷问题、点赞/不感兴趣等轻反馈 | 已有聊天页、`useVoiceInput`、TTS、SSE 结构 | P1：统一语音输入/输出链路；P1：移动端字幕、重试、静音模式 |
| 情感互动 | 根据语义动态切换高兴、惊讶、感谢、思考、抱歉等表情与动作 | 已有表情/动作规则与演示页 | P0：测试与实现不一致；P1：建立赛题场景关键词表和动作节制策略 |
| 智能问答 | 基于灵山胜境知识库回答景点、历史文化、开放时间、交通方式等问题 | 已有知识库/文档/FAQ 规划，后端 RAG 相关结构 | P1：标准题库评测；P2：RAG 引用来源、拒答策略、知识维护流程 |
| 个性化讲解 | 根据游客偏好、时间、位置生成路线并伴随式讲解 | 已有路线页、地图页、TourOrchestrator 方案 | P1：路线状态机闭环；P2：GPS 到点触发讲解和下一站推荐 |
| 后台分析 | 管理端提供全域数据看板、知识库维护、系统配置、权限管控 | 项目已有后台/API 文档与知识库管理规划 | P2：明确与移动端数据上报字段；P3：形象/音色/服装配置落地 |
| 赛题数据集 | 必须基于无锡灵山胜境资料包；可扩展拈花湾子景点；行为数据用于运营分析 | `docs/` 已有灵山资料、结构化数据、行为分析表 | P0：数据导入清单；P1：问答测试集；P2：运营分析指标映射 |
| 核心技术指标 | 语音问答 < 5s、知识问答准确率 >= 90%、数字人自然、系统稳定 | 已有局部测试报告，但文档与实际测试存在不一致 | P0：建立可复测指标表；P1-P3：按指标补齐验收脚本 |

---

## 3. 产品定位

### 3.1 移动端定位

移动端是游客交互主入口，应该优先服务三个场景：

1. 游客刚进入景区或打开 App：数字人主动欢迎，询问游览时间、兴趣偏好、体力情况。
2. 游客在游览中：数字人结合当前位置与路线状态进行讲解、问答、提醒和下一站推荐。
3. 游客游览后：自动形成旅行记忆、打卡记录、问答摘要和可分享内容。

### 3.2 管理端定位

管理端不抢移动端主线，但必须成为赛题要求的支撑：

1. 维护灵山胜境知识库、FAQ、讲解词、路线数据。
2. 配置数字人外观、音色、服装和默认导览策略。
3. 查看游客问答、景点热度、路线完成率、消费/行为分析等运营数据。

---

## 4. 推荐用户旅程

### 4.1 首次打开

1. 数字人“小灵”出现并欢迎游客。
2. 询问游客可游览时长、兴趣偏好、同行人群。
3. 推荐 1 条主路线和 2 条备选路线。
4. 用户点击开始，进入地图导览模式。

### 4.2 导览中

1. 地图页显示当前目标景点、距离、预计步行时间。
2. 到达景点附近后，数字人自动提示“是否开始讲解”。
3. 用户可用语音或文本追问，例如“灵山大佛为什么是 88 米？”。
4. 数字人给出知识库答案，并同步口型、表情、动作和字幕。
5. 讲解结束后推荐下一站，用户可继续导览或切换自由探索。

### 4.3 游览结束

1. 记忆页生成本次行程摘要。
2. 展示到访景点、问答次数、情绪标签、打卡印章。
3. 支持生成分享卡片或“灵山手帐”。
4. 行为数据回流后台，用于运营分析和路线优化。

---

## 5. 技术架构完善

### 5.1 移动端分层

```
Expo Router 页面层
  app/(tabs)/index.tsx
  app/(tabs)/chat.tsx
  app/(tabs)/memory.tsx
  app/map.tsx
  app/routes/*
  app/attractions/*

导览编排层
  hooks/useTourOrchestrator.ts
  hooks/useTourGeolocation.ts
  hooks/useTourCheckin.ts
  components/guide/*

数字人运行层
  components/vrm/VRMManager.ts
  components/vrm/VRMView.tsx
  components/vrm/VRMFloating.tsx
  hooks/useVRMSync.ts
  utils/textTimeline.ts

多模态交互层
  hooks/useVoiceInput.ts
  hooks/useTTS.ts
  hooks/useSSE.ts
  api/guide.ts
  api/tts.ts
  api/routes.ts
  api/spots.ts

本地缓存与演示保障
  services/localDatabase.ts
  services/spotCache.ts
  services/dataSync.ts
```

### 5.2 后端分层

```
数据层
  灵山胜境资料包
  景点结构化数据
  FAQ / 讲解词 / 路线
  游客行为分析数据

知识层
  文档解析 -> 分块 -> 向量索引
  BM25 / 向量召回 / 重排
  标准问答测试集

智能服务层
  RAG 问答
  路线规划
  TTS / ASR 适配
  数字人状态事件

业务 API 层
  /api/chat/stream
  /api/guide/*
  /api/tour/*
  /api/tts/*
  /api/knowledge/*
  /api/analytics/*
```

---

## 6. 功能完善方案

### 6.1 数字人引擎与驱动

目标：让数字人在演示中“自然可信”，而不是只作为装饰。

实施要点：

1. 保留当前 3D VRM 方案作为主形象，满足“形象生动、贴合景区氛围”的展示要求。
2. 增加低性能降级：浮窗模式降低帧率和像素比；低端设备或 WebGL 异常时切换 2D/静态形象。
3. 统一数字人控制 API：

```typescript
type DigitalHumanDriver = {
  speak(text: string, options?: SpeakOptions): Promise<void>;
  stop(): void;
  setExpression(expression: Emotion): void;
  playAction(action: Action, durationMs?: number): void;
  setPageContext(context: PageGuideContext): void;
  setAppearance(config: AppearanceConfig): void;
};
```

4. 口型同步优先使用 TTS 音素/字符时间戳；没有时间戳时使用 `textTimeline` 估算。
5. 表情与动作要“少而准”：欢迎用挥手，路线推荐用指向，历史讲解用思考，抱歉/未知用轻摇头，避免频繁抽动。
6. 管理端预留外观、服装、音色配置，满足“灵活配置”的赛题要求。

P0 立即处理：

1. 修复 `software/mobile/__tests__/textTimeline.test.ts` 与实现不一致的问题。
2. 明确 `ExpressionPlayer` 回调参数是 2 个还是 3 个，并同步测试和调用方。
3. 为数字人演示页增加“赛题场景”测试按钮：欢迎、问路、讲解、感谢、未知问题。

### 6.2 多模态交互

目标：游客可以自然地用说话或打字完成咨询。

实施要点：

1. 聊天页保留完整会话能力，导览页使用轻量底部提问面板。
2. 支持文字输入、按住说话、快捷问题、重新回答、停止播报。
3. 所有语音回答必须有同步字幕，便于嘈杂景区环境或静音状态使用。
4. 语音问答采用流水线：

```
录音结束 -> ASR -> RAG/LLM -> 首句 TTS -> 数字人口型/表情 -> 后续分句继续播报
```

5. 超时或网络差时降级为文字回答；演示模式下可使用本地预置问答和预生成音频。

移动端交互要求：

1. 主要按钮触摸区域不小于 44pt，Android 推荐不小于 48dp。
2. 语音按钮需要清晰的录音中、识别中、回答中、失败状态。
3. 不能只依赖语音，必须保留文本输入。

### 6.3 智能问答与知识库

目标：围绕灵山胜境资料包建立可评测的 RAG 问答能力。

数据范围：

1. 赛题资料包：无锡灵山胜境公开资料。
2. 可选子景点：拈花湾禅意小镇。
3. 景点景区旅游数据行为分析数据：用于管理端运营分析和路线推荐，不作为事实问答唯一来源。

知识结构建议：

| 数据类型 | 示例字段 | 用途 |
|---|---|---|
| 景点 | id、名称、位置、开放时间、亮点、历史、注意事项 | 问答、讲解、路线 |
| 路线 | id、名称、景点序列、时长、适合人群、强度 | 个性化推荐 |
| FAQ | 问题、答案、分类、来源 | 高频问答 |
| 讲解词 | 景点 id、短讲解、长讲解、儿童版、文化版 | 到点讲解 |
| 运营数据 | 时间、客流、消费、偏好、转化 | 后台分析 |

准确率方案：

1. 建立不少于 100 条标准题库，覆盖景点介绍、历史文化、开放时间、交通方式、路线推荐、边界问题。
2. 每条题绑定标准答案和来源片段。
3. 评测指标：题库准确率不低于 90%，未知问题必须明确说明“不确定/资料中未提及”，避免编造。
4. 回答中可展示“来源：灵山胜境资料包/景点讲解词”，提高可信度。

### 6.4 个性化路线与伴随式讲解

目标：让数字人能主动带游客走，而不是只在聊天页回答问题。

路线生成输入：

1. 游览时间：30 分钟、1 小时、半日、一日。
2. 兴趣偏好：佛教文化、建筑艺术、亲子游、拍照打卡、轻松游。
3. 同行人群：老人、儿童、情侣、朋友、团队。
4. 当前位置和体力偏好。

路线输出：

```typescript
type TourPlan = {
  routeId: string;
  title: string;
  durationMinutes: number;
  reason: string;
  stops: Array<{
    spotId: string;
    spotName: string;
    stayMinutes: number;
    narrationMode: 'short' | 'standard' | 'deep';
    nextInstruction: string;
  }>;
};
```

导览状态机：

```
IDLE -> GREETING -> ROUTE_SUGGESTED -> NAVIGATING
     -> ARRIVED -> NARRATING -> NEXT_RECOMMENDATION
     -> COMPLETED -> MEMORY_SUMMARY
```

GPS 触发策略：

1. 距离目标景点 80 米内：提示即将到达。
2. 距离目标景点 30 米内：询问是否开始讲解。
3. 用户手动确认到达作为 GPS 不准时的兜底。
4. 定位权限被拒绝时使用地图手动选择和路线列表模式。

### 6.5 情感互动

目标：让数字人有“导游感”和“陪伴感”，但不过度打扰。

情感来源：

1. 用户文本/语音内容：感谢、疑问、惊叹、否定、焦虑。
2. 系统场景：欢迎、到达、讲解、路线推荐、完成行程。
3. 回答语义：历史、建筑、导航、歉意、祝福。

动作映射：

| 场景 | 表情 | 动作 |
|---|---|---|
| 欢迎游客 | happy | wave |
| 推荐路线 | happy | point / present |
| 讲解历史文化 | relaxed / thinking | lookUp |
| 景点宏伟壮观 | surprised | lookUp |
| 用户感谢 | grateful / happy | bow |
| 未知或抱歉 | sad | shakeHead |
| 导航提醒 | neutral | point |

控制原则：

1. 每句话最多触发一个主动作。
2. 动作时长与语音片段绑定，结束后恢复 idle。
3. 用户连续提问时降低动作频率，避免干扰阅读。
4. 支持“减少动效”系统设置。

### 6.6 旅行记忆与创新体验

目标：把“游览过程”沉淀成可回看、可分享、可展示的成果。

建议保留并强化现有“灵山手帐”方向：

1. 自动记录到访景点、停留时间、提问内容、用户情绪和打卡。
2. 游览结束生成“今日回顾”：走过哪里、问过什么、最推荐下次去哪。
3. 记忆卡片采用宣纸、印章、手帐视觉，但移动端必须注意性能和无障碍。
4. 支持生成分享卡片，用于比赛展示传播性。
5. 空状态由数字人引导：“让小灵带你写下第一笔”。

### 6.7 管理端协同

目标：满足赛题“后台分析”和“灵活配置”要求。

管理端需要支撑的最小能力：

1. 知识库维护：上传文档、编辑 FAQ、重新索引、查看来源片段。
2. 数字人配置：形象、服装、音色、默认讲解风格。
3. 路线配置：路线名称、景点顺序、预计时长、适合人群。
4. 数据看板：问答热词、知识命中率、路线完成率、景点热度、游客偏好。
5. 权限管控：管理员、运营人员、内容维护人员。

移动端需要上报的关键事件：

| 事件 | 字段 |
|---|---|
| app_opened | user_id、time、entry |
| tour_started | route_id、preferences、start_spot |
| spot_arrived | spot_id、distance_source、timestamp |
| narration_played | spot_id、duration、completed |
| question_asked | text、source_page、answer_status、latency |
| route_completed | route_id、completed_spots、duration |
| memory_created | spot_id、source、mood |

### 6.8 演示与离线保障

比赛现场网络和模型服务不稳定时，必须有降级方案。

建议实现“演示模式”：

1. 内置 20-30 条灵山高频问答。
2. 内置 2-3 条标准路线。
3. 内置 3-5 段讲解词和对应音频/字幕。
4. 后端不可用时移动端提示“演示数据模式”，不影响主流程展示。
5. API 地址配置从开发硬编码改为环境配置或启动页切换。

---

## 7. 移动端体验标准

| 类别 | 标准 |
|---|---|
| 导航 | 底部 Tab 控制在 4-5 个核心入口；路线、地图、问答、记忆路径清晰 |
| 触摸 | 主要点击区域 >= 44pt，Android 推荐 >= 48dp |
| 安全区 | 顶部状态栏、底部手势条、输入框、底部面板都要避让 |
| 字体 | 支持系统字体缩放；长文讲解行高充足，字幕不遮挡按钮 |
| 图标 | 结构性图标使用统一矢量图标，避免把 emoji 当导航/功能图标 |
| 动效 | 关键动效 150-300ms；数字人/水墨动画支持减少动效 |
| 性能 | 列表用 FlatList；VRM 浮窗限帧；重页面避免多个 WebGL/地图/定时器同时高负载 |
| 弱网 | SSE 自动重连；问答超时可重试；TTS 失败时文字可读 |
| 无障碍 | 关键按钮有 `accessibilityLabel`，状态有 `accessibilityState` |

---

## 8. 验收指标

### 8.1 交互性能

| 指标 | 目标 |
|---|---|
| 文本问答首字返回 | <= 2.5s |
| 语音问答端到端 | <= 5s |
| TTS 首句开始播放 | <= 2s |
| 页面切换到可交互 | <= 1s |
| SSE 断线重连 | <= 3s 内提示并重试 |

### 8.2 智能水平

| 指标 | 目标 |
|---|---|
| 标准题库准确率 | >= 90% |
| 回答来源可追溯 | 高频问答和景点事实必须能定位来源 |
| 未知问题拒答 | 不编造，说明资料中未提及 |
| 路线推荐可解释 | 每条路线给出“为什么推荐” |

### 8.3 数字人自然度

| 指标 | 目标 |
|---|---|
| 口型同步 | 语音和口型明显匹配，无长时间空口型 |
| 表情匹配 | 欢迎、惊叹、感谢、思考、抱歉场景可稳定触发 |
| 动作自然 | 动作不过频，结束后回到自然 idle |
| 渲染稳定 | 低端模式不白屏；20 分钟演示无崩溃 |

### 8.4 系统稳定性

| 指标 | 目标 |
|---|---|
| 连续演示时长 | >= 20 分钟无崩溃 |
| 弱网处理 | 问答、TTS、地图均有降级提示 |
| 权限异常 | 定位/麦克风拒绝后仍可文字导览 |
| 测试状态 | 移动端 Jest 核心测试通过 |

---

## 9. 实施路线图

### P0：比赛演示基线收口（1-2 天）

目标：先让现有能力稳定、文档和测试不互相矛盾。

1. 修复 `textTimeline` 相关测试失败。
2. 统一 Expo/React Native 版本与文档描述，当前 `package.json` 为 Expo 52、React Native 0.76.9。
3. 梳理 API 配置，避免开发机地址硬编码影响真机演示。
4. 建立赛题标准演示脚本：欢迎、问答、路线、到点讲解、记忆总结。
5. 确认灵山资料包导入清单和问答题库初版。

交付物：

1. 测试通过截图或日志。
2. 演示脚本。
3. 数据清单。

### P1：数字人和多模态主链路（2-4 天）

目标：让数字人能稳定完成“说、动、答”的闭环。

1. 完善 `DigitalHumanDriver` 控制接口。
2. 补齐 TTS -> 字幕 -> 口型 -> 表情/动作同步。
3. 聊天页与导览页复用同一问答流。
4. 增加语音输入状态机：待录音、录音中、识别中、回答中、失败。
5. 加入低性能降级与减少动效支持。

交付物：

1. 数字人场景测试页。
2. 语音/文字问答演示。
3. 口型与表情验收表。

### P2：RAG 知识库与准确率评测（3-5 天）

目标：达到赛题知识问答准确率要求。

1. 导入灵山胜境资料包，形成景点、路线、FAQ、讲解词结构。
2. 建立 100+ 条标准题库。
3. 接入 RAG 召回、重排、引用来源。
4. 增加未知问题拒答和纠错提示。
5. 输出准确率报告。

交付物：

1. 知识库数据表。
2. 标准题库。
3. 准确率报告，目标 >= 90%。

### P3：主动导览与路线闭环（3-5 天）

目标：让 App 从信息展示升级为“数字人带游”。

1. 完善 TourOrchestrator 状态机。
2. 首页推荐路线，路线详情可开始导览。
3. 地图页根据目标景点显示距离、预计时间和下一步。
4. 到达景点触发讲解，讲解后推荐下一站。
5. 支持中断、继续、自由探索。

交付物：

1. 完整路线演示。
2. GPS/手动到达双模式。
3. 导览完成后的记忆摘要。

### P4：旅行记忆与创新展示（2-4 天）

目标：形成比赛展示亮点。

1. 强化旅行记忆页为“灵山手帐”。
2. 自动生成今日回顾和景点印章。
3. 支持分享卡片。
4. 将问答和导览行为沉淀为记忆素材。

交付物：

1. 记忆页演示。
2. 分享卡片样例。
3. 游览总结样例。

### P5：后台分析与配置闭环（2-4 天）

目标：补齐运营管理端要求。

1. 知识库内容维护和重新索引。
2. 数字人外观、音色、服装配置。
3. 数据看板：问答热词、路线完成率、景点热度、游客偏好。
4. 移动端事件上报与后台展示打通。

交付物：

1. 管理端截图或演示路径。
2. 数据看板样例。
3. 配置生效演示。

---

## 10. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| VRM 渲染性能不稳定 | 真机卡顿、白屏、发热 | 浮窗限帧、降低 pixelRatio、提供 2D fallback |
| 语音链路超过 5s | 不满足赛题指标 | 首句流式 TTS、常见问题缓存、演示模式预置音频 |
| 知识库准确率不足 | 评测失分 | 标准题库驱动调优，FAQ 优先命中，答案带来源 |
| 定位精度不足 | 到点讲解误触发 | GPS + 手动确认双触发，距离阈值放宽 |
| 网络不稳定 | 比赛现场演示失败 | 本地演示数据、离线问答、API 状态提示 |
| 文档与代码版本不一致 | 开发和答辩混乱 | P0 统一 Expo 版本、命令、页面路径、测试状态 |
| 页面过重 | 低端机掉帧 | 拆分超长页面，列表虚拟化，减少同时运行的地图/VRM/定时器 |

---

## 11. 近期执行清单

1. 修复移动端 `textTimeline` 测试，让数字人情感/动作规则先稳定。
2. 将灵山胜境资料整理为景点、路线、FAQ、讲解词四类结构化数据。
3. 建立 100 条标准问答题库，开始跑准确率报告。
4. 梳理 `TourOrchestrator` 到首页、路线、地图、景点详情的闭环流程。
5. 给数字人增加赛题演示场景：欢迎、问路、讲解、感谢、未知问题。
6. 准备演示模式，确保无网络时仍能完整走完一条路线。
7. 对移动端做一次 UI/UX 收口：触摸尺寸、安全区、无障碍、结构性图标、减少动效。

---

## 12. 最终交付物建议

| 交付物 | 内容 |
|---|---|
| 移动端 App | 数字人导览、问答、路线、地图、记忆 |
| 后端服务 | RAG、TTS/ASR 适配、导览状态、数据上报 |
| 管理端 | 知识库维护、数字人配置、数据看板 |
| 数据资料 | 灵山胜境结构化知识库、FAQ、讲解词、标准题库 |
| 测试报告 | 准确率、延迟、数字人自然度、稳定性 |
| 演示材料 | 3-5 分钟演示脚本、视频、关键截图 |

---

## 13. 评审表达建议

答辩时建议用一句话概括项目：

> 我们做的不是一个简单问答机器人，而是一个能够在灵山胜境移动端陪游客完成“规划、导览、讲解、问答、记录、反馈”的 AI 数字人导游。

推荐演示顺序：

1. 打开 App，数字人欢迎并推荐路线。
2. 用户说“我只有一小时，想看最经典的景点”。
3. 数字人生成路线并进入地图导览。
4. 到达灵山大佛，数字人自动讲解并同步口型表情。
5. 用户追问历史文化问题，系统基于知识库回答。
6. 游览结束，生成旅行记忆和后台数据记录。

---

## 15. 2026-06-23 P3-P5 执行报告

本轮完成 P3“主动导览与路线闭环”、P4“旅行记忆与创新展示”、P5“后台分析与配置闭环”的演示级闭环补齐。

### P3 主动导览与路线闭环

已将移动端 `TourOrchestrator` 状态从原先的 `idle/free` 混用补齐为更明确的 `paused`、`completed` 状态。暂停、继续、自由探索、完成导览不再互相误判。

落地内容：

1. `software/mobile/hooks/useTourOrchestrator.ts`
   - 新增 `paused`、`completed` 状态。
   - `pauseTour()` 写入 `paused`，`resumeTour()` 根据进度恢复到 `navigate/completed`。
   - `completeSpot()` 最后一站完成后写入 `completed`，保留当前路线和进度，供记忆页生成总结。
   - 开始导览、暂停、继续、自由探索、景点到达、讲解播放、问答、路线完成均触发移动端事件上报。

2. `software/mobile/components/guide/TourProgressIndicator.tsx`
   - 新增 `paused/completed/free` 的准确状态文案。
   - 完成态不再显示“继续导览”。

3. 首页、聊天页、探索页、路线详情、景点详情已接入新状态：
   - `software/mobile/app/(tabs)/index.tsx`
   - `software/mobile/app/(tabs)/chat.tsx`
   - `software/mobile/app/(tabs)/explore.tsx`
   - `software/mobile/app/routes/[id].tsx`
   - `software/mobile/app/attractions/[id].tsx`

### P4 旅行记忆与创新展示

最后一站完成后不再自动 `endTour()` 清空路线，而是进入旅行记忆页，保留“已完成路线”作为手帐生成依据。

落地内容：

1. `software/mobile/app/attractions/[id].tsx`
   - 完成最后一个景点后跳转 `/memory`，保留路线进度。
   - 景点“记忆瞬间”保存后同步上报 `memory_created`。

2. `software/mobile/app/(tabs)/memory.tsx`
   - 导览完成时显示“导览完成”回顾卡。
   - 支持直接生成/刷新旅程总结。
   - 支持打开分享手帐预览。
   - 新建记忆时同步上报 `memory_created`，并带上路线、景点、完成状态。

### P5 后台分析与配置闭环

新增移动端导览事件表、上报 API、运营聚合 API，并在管理端数据大屏展示路线完成率、景点热度和最近移动端事件。

落地内容：

1. 后端数据模型与迁移
   - `backend/app/models/mobile_event.py`
   - `backend/alembic/versions/003_add_mobile_tour_events.py`
   - `backend/app/models/__init__.py`

2. 后端 API
   - `POST /api/analytics/mobile-events`
   - `GET /api/analytics/mobile-tour-summary`

3. 后端聚合逻辑
   - `backend/app/core/analytics.py`
   - 汇总字段包含：总事件、活跃会话、路线开始数、路线完成数、完成率、路线榜、景点热度、偏好分布、最近事件。

4. 管理端数据大屏
   - `frontend/src/api/analytics.ts`
   - `frontend/src/pages/admin/DashboardPage.tsx`
   - 新增“移动端导览闭环”面板，并随大屏 5 秒轮询刷新。

### 验证结果

```bash
cd software/mobile
npm run test -- --runInBand --silent
npx tsc --noEmit
```

结果：移动端 9 个测试套件、57 个用例全部通过；TypeScript 检查通过。

```bash
python -m py_compile backend/app/models/mobile_event.py backend/app/core/analytics.py backend/app/api/analytics.py backend/alembic/versions/003_add_mobile_tour_events.py
python -m pytest backend/tests/test_analytics.py -q
```

结果：后端编译通过；analytics 定向测试 15 个用例全部通过。

管理端执行 `npm run build` 时仍被仓库已有问题阻塞，包括 `@testing-library/react` 导出不匹配、VRM 目录大小写混用、AMap 命名空间缺失等；本轮新增的 `DashboardPage` 与 `analytics.ts` 未出现在错误列表中。

### 当前可演示闭环

1. 首页选择主动导览或路线详情开始导览。
2. 地图/景点详情显示导览进度，支持暂停、继续、自由探索。
3. 景点讲解、问答、打卡、记忆创建自动进入事件流。
4. 最后一站完成后进入旅行记忆页，生成总结并分享手帐。
5. 管理端数据大屏展示移动端路线完成率、景点热度和最近事件。
