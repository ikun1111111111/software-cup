# 灵山胜境 AI 数字人智慧导览系统 · 项目计划书

> 📌 赛题：软件杯 — AI 数字人智慧导览系统
> 📌 项目周期：8 周
> 📌 生成日期：2026-06-05
> 📌 格式约定：模块编号格式 `M[序号]`（如 M1、M2），任务编号格式 `M[模块]-[序号]`（如 M1-001、M5-001），状态标记：🔴 未开始 → 🔵 进行中 → ✅ 已完成

**核心原则：**
- 所有功能拆分为 **独立模块**，每个模块自包含任务、文件、测试
- 后端全链路已通（206 个测试通过），模块 A~M 仅做数据填充和联调验证
- 赛题 7 大功能（F1-F7）+ 6 项创新功能 + 4 个串联功能，共 20 个独立模块
- 模块间通过 API 接口通信，各自开发 + 各自测试，联调仅做接口对接验证
- **每个人的任务已汇总至本文件对应大模块中，每人只看自己的部分即可**

***

## 一、项目概述

### 1.1 项目背景

国家大力推进文旅产业数字化转型，传统景区导览面临讲解资源不足、信息更新滞后、难以满足个性化与深度体验需求等痛点。本项目利用 AI 数字人技术，构建智能、互动、个性化的景区导览服务。

### 1.2 核心目标

| 指标 | 目标值 | 当前状态 |
|------|--------|----------|
| 事实性问答准确率 | ≥ 90%（基于标准测试集） | 已有 100 题评测脚本，待数据填充后复测 |
| 语音交互端到端延迟 | < 5 秒 | SSE 流式 + WebSocket 已就绪，待联调验证 |
| 数字人表现 | 口型同步、表情配合 | Live2D + LipSync + EmotionController 已集成 |
| 系统稳定性 | 无崩溃或长时间无响应 | 206 个后端测试保障 |

### 1.3 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React 19 + TypeScript + Vite | 已有 42 个源文件 + 35 个测试文件 |
| UI 组件库 | Ant Design 5 + 自定义新中式样式 | 游客端新中式风格，管理端暗色主题 |
| 数字人渲染 | Live2D Cubism SDK + pixi-live2d-display | 2D 数字人驱动，口型表情 |
| 后端框架 | Python 3.11 + FastAPI | 异步支持好，AI 生态无缝衔接 |
| LLM 主模型 | DeepSeek-V3 API | 中文能力强，成本低 |
| LLM 多路 | Qwen + Doubao | 4 key 轮询 + 自动降级 |
| ASR | faster-whisper (medium) | 开源，中文识别优秀（模拟 fallback） |
| TTS | CosyVoice | 阿里开源，中文自然度最佳（模拟 fallback） |
| Embedding | BGE-M3 (BAAI) | 中文向量化效果最好 |
| Reranker | BGE-Reranker-v2-m3 | 检索精排 |
| 向量数据库 | Milvus | 支持混合检索 |
| 关系数据库 | PostgreSQL 16 | 成熟稳定 |
| 缓存 | Redis 7 | 热点问答缓存、Celery 队列 |
| 知识图谱 | Neo4j | 佛教文化知识存储 |
| 任务队列 | Celery + Redis | 文档索引、报告生成等异步任务 |
| 实时通信 | WebSocket + SSE | 双向通信 + 流式输出 |
| 可视化 | ECharts 5 | 数据大屏图表 |

***

## 二、赛题功能 × 项目现状对标

| 赛题功能 | 赛题要求 | 对应模块 | 后端 | 前端 | 综合 | 差距分析 |
|----------|----------|----------|------|------|------|----------|
| **F1 多模态交互** | 语音/文本输入，数字人语音+表情+口型回答 | M5 数字人交互 | ✅ 85% | ✅ 75% | **80%** | ASR/TTS 为模拟 fallback，需联调验证 |
| **F2 智能问答** | 景区历史、文化、景点特色问答，准确率≥90% | M2 知识问答 | ✅ 85% | ✅ 70% | **78%** | 知识图谱未填充灵山数据 |
| **F3 个性化推荐** | 根据兴趣推荐路线 | M6 推荐系统 + M11 DNA推荐 | ✅ 75% | ⚠️ 45% | **60%** | 算法需升级，前端需升级 |
| **F4 知识库管理** | 文档上传/更新/维护 | M3 知识库 | ✅ 90% | — | **90%** | 需导入灵山数据 |
| **F5 数字人管理** | 配置外观/服装/声音 | M4 数字人配置 | ✅ 85% | ⚠️ 55% | **70%** | 前端配置选项需扩充 |
| **F6 感受度报告** | 交互分析→情感趋势→建议 | M7 感受度报告 | ✅ 80% | ❌ 20% | **50%** | 前端报告页面缺失 |
| **F7 数据大屏** | 服务人次/热门问答/满意度 | M8 数据大屏 | ✅ 60% | ❌ 15% | **38%** | 前端可视化大屏未开发 |

### 已完成后端模块回顾

| 任务编号 | 任务名 | 状态 | 核心文件 |
|----------|--------|------|----------|
| `A-001` | RAG 知识库（向量化 + 混合检索） | ✅ | `core/rag.py`, `core/vector_store.py`, `core/bm25_search.py` |
| `A-002` | LLM 多 API 混合路由 | ✅ | `core/llm.py`, `core/llm_router.py` |
| `A-003` | 对话服务（SSE + WebSocket） | ✅ | `api/chat.py`, `api/ws.py`, `services/chat_service.py` |
| `A-004` | ASR + TTS 语音服务 | ✅ | `core/asr.py`, `core/tts.py` |
| `A-005` | 推荐服务 | ✅ | `api/recommend.py`, `services/recommend_service.py` |
| `A-006` | 知识库管理 API | ✅ | `api/knowledge.py`, `api/upload.py` |
| `A-007` | 数字人配置 + 分析 + 大屏 API | ✅ | `api/avatar.py`, `api/analytics.py` |
| `A-008` | 模块 A · 单元测试 | ✅ | 206 passed, 0 failed |

### 核心优势
- **后端全链路已通**：RAG→LLM→对话→推荐→报告 端到端可用
- **206 个后端测试**保证稳定性
- **140,447 条真实行为数据**支撑推荐算法和数据分析
- **20+ 景点结构化知识**可直接入库
- **Live2D 数字人**前端已集成表情/口型/情感控制

***

## 三、按人分工模块计划

### 👤 队长负责模块（7 个：M1/M5/M9/M10/M17/M18/M19）

> 关键路径前置 + 核心串联 + 跨模块联调
>
> 执行顺序：M1（Week 1）→ M5（Week 2-3）→ M17（Week 2-3）→ M18（Week 3）→ M19（Week 3）→ M20（Week 4）→ M9（Week 5）→ M10（Week 6）

---

#### M1 · 数据底座（Week 1）

> 📌 目标：导入 14 万条行为数据 + 20+ 景点知识图谱，为所有模块提供数据底座

**`M1-001` Excel 行为数据导入** — 将 140,447 条游客行为数据导入分析数据库

- **前置任务**：无（数据底座起点）
- **状态**：🔴 未开始

**开发内容：**

- [ ] pandas 解析 Excel（17 列：tourist_id, attraction_name, visit_date, costs 等）
- [ ] 数据清洗与标准化 — `backend/app/services/data_import.py`
- [ ] 批量写入 PostgreSQL — `backend/app/models/behavior.py`
- [ ] 统计指标预计算（服务人次、热门景点、平均满意度）
- [ ] `/api/analytics` 统计服务接口确认数据源

**产出文件：**

```
backend/app/
  services/
    data_import.py           # Excel 数据导入
  models/
    behavior.py              # 行为数据表
  api/
    analytics.py             # 统计服务接口（已有，需确认数据源）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | Excel 解析 | 读取 140,447 条数据 | 全部字段正确解析 |
| 2 | 数据清洗 | 缺失值/异常值处理 | 无脏数据入库 |
| 3 | 批量写入 | 写入 PostgreSQL | 50,000 游客 + 152 景点关联 |
| 4 | 统计接口 | GET /api/analytics | 返回正确统计指标 |

---

**`M1-002` 景点结构化数据入库（知识图谱填充）** — 将灵山胜境 20+ 景点的结构化数据导入 Neo4j

- **前置任务**：`M1-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] Neo4j 知识图谱 Schema 设计（景点-朝代-事件-文化内涵关系）
- [ ] 灵山大佛区域数据入库（LS-001 至 LS-016+）— `backend/app/services/kg_import.py`
- [ ] 拈花湾区域数据入库（NH-001 至 NH-006+）
- [ ] RAG 检索语料增强（知识图谱 → 文本 chunk）
- [ ] 100 题准确率复测 — `backend/tests/test_accuracy_100.py`

**产出文件：**

```
backend/app/
  services/
    kg_import.py             # 知识图谱数据导入
  data/
    lingshan_attractions.json # 灵山景点结构化数据
  tests/
    test_accuracy_100.py     # 100 题准确率评测
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 知识图谱查询 | 查询"灵山大佛高度" | 返回 88 米 |
| 2 | RAG 检索 | 提问"梵宫的建筑特色" | 返回相关 chunk |
| 3 | 准确率复测 | 运行 100 题测试集 | 准确率 ≥ 90% |

---

**`M1-003` 讲解词文档上传（RAG 语料就绪）** — 将灵山历史、文化、景点特色讲解词上传至知识库

- **前置任务**：`M1-002`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 讲解词文档整理（Word/PDF/Markdown → 纯文本）
- [ ] 调用 `/api/knowledge/docs` 批量上传文档
- [ ] 触发 Celery 异步索引任务 — `backend/app/tasks/index_task.py`
- [ ] 索引状态监控（待索引→索引中→已完成）

**产出文件：**

```
backend/data/
  lingshan_guide_words/       # 讲解词文档
backend/app/
  tasks/
    index_task.py             # Celery 异步索引任务（已有）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 文档上传 | POST /api/knowledge/docs | 文档创建成功 |
| 2 | 异步索引 | Celery 任务执行 | 向量入库完成 |
| 3 | 检索验证 | 提问讲解词相关问题 | RAG 返回正确 chunk |

---

#### M5 · 数字人交互（F1）（Week 2-3）

> 📌 目标：多模态交互全链路跑通——语音/文本输入 → 数字人语音+表情+口型回答
> 📌 前置：M1 数据底座，A-003/A-004 对话+语音服务已完成 ✅

**`M5-001` 游客端 — 数字人对话页联调** — 完善游客与数字人的多模态交互体验

- **前置任务**：`M2-001`（队员B 负责的景点详情页）
- **状态**：🔴 未开始

**开发内容：**

- [ ] 对话主界面优化（新中式气泡样式、朱砂红/宣纸风格）— `frontend/src/pages/tourist/ChatPage.tsx`
- [ ] 语音输入 → ASR → LLM → TTS → 数字人播报全链路
- [ ] SSE 流式接收 + 逐字显示优化 — `frontend/src/hooks/useSSE.ts`
- [ ] WebSocket 全链路联调 — `frontend/src/components/DigitalHuman/DigitalHuman.tsx`
- [ ] 快捷问题（印章风格按钮）

**产出文件：**

```
frontend/src/
  pages/tourist/
    ChatPage.tsx             # 对话主界面（已有，需优化）
  components/DigitalHuman/
    DigitalHuman.tsx         # 数字人交互组件（已有，需联调）
  hooks/
    useSSE.ts                # SSE 流式接收（已有，需优化）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 文本对话 | 输入"灵山大佛多高" | SSE 流式回复正确 |
| 2 | 语音对话 | 录音提问 → 数字人播报 | 全链路延迟 < 5 秒 |
| 3 | 表情同步 | 情感分析触发 | 数字人表情切换自然 |
| 4 | 口型同步 | TTS 播放中 | 口型与音频同步 |

---

#### M17 · 拍照识景→协同导览串联（⭐⭐⭐⭐⭐ 最高优先级）（Week 2-3）

> 📌 目标：将已有但孤立的三个功能串联为真实可用的工作流
> 📌 前置：拍照识景、协同导览、推荐路线基础设施均已就绪

**现状分析：**

| 功能 | 后端状态 | 前端状态 | 串联缺口 |
|------|---------|---------|---------|
| 拍照识景 | ✅ `vision.py` + `vision_service.py` | ✅ `VisionPage.tsx` + `PhotoCapture.tsx` | 识别结果无法推送给房间成员 |
| 协同导览 | ✅ `room.py` + `room_service.py` (Redis-backed) | ✅ `RoomPage.tsx` + `useRoomWebSocket` | 缺少 AI 问答 + 行程推送来源 |
| 推荐路线 | ✅ `recommender.py` + `routes_api.py` | ✅ `RecommendPage.tsx` | 仅有预定义路线，无动态推荐 + 无推送 |

---

**`M17-001` 后端 — 景点同步到协同房间** — 拍照识别结果 + 推荐景点 → 一键加入房间行程，WebSocket 实时广播

- **前置任务**：无（基础设施已就绪）
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新增 `add_spot_to_itinerary()` 函数 — `backend/app/services/room_service.py`（`update_itinerary` 之后）
- [ ] 创建 `sync_vision_to_room()` 桥接服务 — `backend/app/services/vision_room_sync.py`
- [ ] 创建 `POST /api/vision/sync-to-room` 桥接端点 — `backend/app/api/vision_room.py`
- [ ] 新增 `POST /{room_id}/itinerary/add-spot` 端点 — `backend/app/api/room.py`
- [ ] 注册 `vision_room.router` — `backend/app/main.py`
- [ ] 编写 `test_room_service.py`（`add_spot_to_itinerary` 4 项测试）
- [ ] 编写 `test_vision_room_sync.py`（可信度过滤 + 去重 4 项测试）
- [ ] 编写 `test_room_api.py`（创建房间 + 添加景点 + 同步端点 6 项测试）

**产出文件：**

```
backend/app/
  services/
    room_service.py            # 已有，新增 add_spot_to_itinerary()
    vision_room_sync.py        # 新增：拍照→房间同步服务
  api/
    room.py                    # 已有，新增 add-spot 端点
    vision_room.py             # 新增：桥接 API
  main.py                      # 注册 vision_room router
backend/tests/
  test_room_service.py         # 新增：room service 测试
  test_vision_room_sync.py     # 新增：同步服务测试
  test_room_api.py             # 新增：room API 测试
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 添加景点 | 向空行程添加"灵山大佛" | 行程列表含该景点，source="vision" |
| 2 | 去重 | 再次添加同名景点 | 无重复，行程数不变 |
| 3 | 房间不存在 | 向 "000000" 添加景点 | 抛出 ValueError |
| 4 | 多景点累积 | 依次添加 2 个不同景点 | 行程列表含 2 项 |
| 5 | 低可信度拒绝 | 同步 confidence=0.1 | 抛出 ValueError "可信度过低" |
| 6 | 未知景点拒绝 | 同步"未知景点" | 抛出 ValueError |
| 7 | 同步 API | POST /api/vision/sync-to-room | 返回 status="ok" + itinerary_count |
| 8 | 房间创建 | POST /api/room/create | 返回 6 位房间号 + 成员列表 |

---

**`M17-002` 前端 — 拍照识景同步按钮 + 房间行程实时更新** — VisionPage 新增"同步到协同房间"按钮，RoomPage 行程接收 `spot_added` 广播

- **前置任务**：`M17-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新增 `syncSpotToRoom()` API 函数 — `frontend/src/api/vision.ts`
- [ ] 新增 `addSpotToItinerary()` API 函数 — `frontend/src/api/room.ts`
- [ ] 创建 `useVisionRoomSync` Hook — `frontend/src/hooks/useVisionRoomSync.ts`
- [ ] 创建 `VisionSyncButton` 组件 — `frontend/src/components/Room/VisionSyncButton.tsx`
- [ ] 修改 `VisionPage.tsx` 底部栏 — 双按钮布局（同步 + 去对话）
- [ ] 修改 `useRoomWebSocket.ts` — 新增 `spot_added` 消息处理

**产出文件：**

```
frontend/src/
  api/
    vision.ts                  # 已有，新增 syncSpotToRoom()
    room.ts                    # 已有，新增 addSpotToItinerary()
  hooks/
    useVisionRoomSync.ts       # 新增：拍照→房间同步 Hook
    useRoomWebSocket.ts        # 已有，新增 spot_added 处理
  components/Room/
    VisionSyncButton.tsx       # 新增：同步按钮
  pages/tourist/
    VisionPage.tsx             # 已有，新增同步按钮
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 同步按钮 | 识别成功后在 VisionPage | 显示"同步到协同房间"按钮 |
| 2 | 未加入房间 | 无 roomId 时 | 按钮不显示 |
| 3 | 点击同步 | 已加入房间 + 点击 | 提示"已同步到房间行程" |
| 4 | WebSocket 广播 | 同步成功后 | 所有房间成员行程时间线同时更新 |

---

#### M18 · 协同导览 LLM 智能问答（⭐⭐⭐⭐）（Week 3）

> 📌 目标：协同房间内新增 AI 导游问答，所有成员共享问答历史
> 📌 前置：M5 数字人交互（LLM + RAG 已通），协同房间 WebSocket 已就绪

**`M18-001` 后端 — 房间 WebSocket 接入 LLM 回答** — 房间内提问由 AI 导游实时回答，所有成员可见

- **前置任务**：`M5-001`（LLM + RAG 链路）
- **状态**：🔴 未开始

**开发内容：**

- [ ] 增强 `room.py` WebSocket `chat` 消息处理 — 接入 LLM + RAG 回答
- [ ] 新增 `chat_answer` WebSocket 消息类型 — AI 回答推送给提问者
- [ ] 失败降级 — LLM 不可用时返回"抱歉，暂时无法回答"

**修改文件：**

```
backend/app/
  api/
    room.py                    # 已有，增强 chat 消息处理
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 房间提问 | 发送"灵山大佛多高" | AI 返回回答 + 广播给成员 |
| 2 | LLM 降级 | LLM 服务不可用 | 返回"抱歉，暂时无法回答" |

---

**`M18-002` 前端 — 协同房间 AI 问答面板** — RoomPage 新增问答面板 + 路线共享卡片

- **前置任务**：`M18-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 创建 `RoomChat` 组件 — `frontend/src/components/Room/RoomChat.tsx`
- [ ] 创建 `RouteShareCard` 组件 — `frontend/src/components/Room/RouteShareCard.tsx`
- [ ] 修改 `useRoomWebSocket.ts` — 新增 `chat_answer` 消息处理
- [ ] 修改 `RoomPage.tsx` — 行程时间线后整合 AI 问答面板

**产出文件：**

```
frontend/src/
  components/Room/
    RoomChat.tsx               # 新增：房间 AI 问答面板
    RouteShareCard.tsx         # 新增：路线共享卡片
  hooks/
    useRoomWebSocket.ts        # 已有，新增 chat_answer 处理
  pages/tourist/
    RoomPage.tsx               # 已有，新增 AI 问答面板
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 提问显示 | 发送问题 | 问题气泡显示在右侧 |
| 2 | AI 回答 | 收到 chat_answer | AI 回答气泡显示在左侧 |
| 3 | 自动滚动 | 新消息到达 | 面板自动滚动到底部 |
| 4 | 未连接 | WebSocket 断开 | 输入框禁用，提示"未连接" |

---

#### M19 · 推荐路线动态化 + 房间推送（⭐⭐⭐⭐⭐）（Week 3）

> 📌 目标：推荐路线页接入动态推荐引擎，支持一键推送到协同房间
> 📌 前置：A-005 推荐 API ✅，M17-001 房间行程同步 ✅

**`M19-001` 前端 — 动态推荐引擎接入 + 房间推送** — RecommendPage 显示 AI 个性化推荐列表 + "全部推送到房间"按钮

- **前置任务**：`M17-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新增 `getRecommendations()` + `submitFeedback()` API — `frontend/src/api/routes.ts`
- [ ] 创建 `RecommendEngine` 组件 — `frontend/src/components/Recommend/RecommendEngine.tsx`
- [ ] 创建 `RoutePushButton` 组件 — `frontend/src/components/Recommend/RoutePushButton.tsx`
- [ ] 修改 `RecommendPage.tsx` — 兴趣标签后插入动态推荐区

**产出文件：**

```
frontend/src/
  api/
    routes.ts                  # 已有，新增 recommend API
  components/Recommend/
    RecommendEngine.tsx        # 新增：动态推荐引擎组件
    RoutePushButton.tsx        # 新增：推荐→房间推送按钮
  pages/tourist/
    RecommendPage.tsx          # 已有，新增动态推荐区
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 动态推荐加载 | 进入推荐页 | 显示"AI 正在为你推荐..." → 推荐列表 |
| 2 | 推荐策略标签 | 冷启动用户 | 显示"新游客"标签 |
| 3 | 推送到房间 | 点击"全部推送到房间" | 提示"N 个景点已推送" |
| 4 | 房间行程验证 | 切换到房间页面 | 行程时间线新增推荐景点 |

---

#### M20 · 三功能联调验收（Week 4）

> 📌 目标：拍照识景 → 协同导览 → 推荐路线全链路可用
> 📌 前置：M17/M18/M19 全部完成

**`M20-001` 端到端联调验证**

- **前置任务**：M17/M18/M19 全部完成
- **状态**：🔴 未开始

**验收流程：**

1. **拍照识景 → 协同房间** — 窗口 A 创建房间 → 窗口 B 加入 → 拍照识别 → 点击"同步到协同房间" → 验证两个窗口行程时间线同时出现新景点
2. **协同房间 LLM 问答** — 在房间页面提问"灵山大佛多高" → 验证 AI 返回回答，房间其他成员也能看到
3. **推荐路线 → 协同房间推送** — 进入推荐页面 → 显示动态推荐列表 → 点击"全部推送到房间" → 验证房间行程时间线新增推荐景点
4. **后端测试全量验证** — `cd backend && python -m pytest tests/ -v --tb=short -x` Expected: 215+ tests pass
5. **前端构建验证** — `cd frontend && npm run build` Expected: 无 TypeScript 错误

---

#### M9 · 联调验收（Week 5）

> 📌 目标：前后端接口对接验证，不改代码，只做集成验证
> 📌 前置：M1-M8 全部完成

**`M9-001` 前后端联调验收**

- **前置任务**：M1-M8 全部完成
- **状态**：🔴 未开始

**验收内容：**

- [ ] F1 游客端语音对话全链路（录音 → ASR → LLM → TTS → 数字人播报）
- [ ] F1 游客端文本对话全链路（输入 → SSE → 气泡显示）
- [ ] F1 数字人口型同步端到端
- [ ] F2 智能问答准确率 ≥ 90%（100 题最终评测）
- [ ] F3 个性化推荐端到端
- [ ] F4 管理后台知识库上传 → 索引 → 检索生效
- [ ] F5 数字人配置 → 前端实时生效
- [ ] F6 感受度报告生成 → 前端展示
- [ ] F7 数据大屏实时数据推送
- [ ] 延迟 < 5 秒（语音问答）
- [ ] 系统稳定性（无崩溃）

---

**`M9-002` 非功能性需求验证**

- **前置任务**：`M9-001`
- **状态**：🔴 未开始

| 指标 | 赛题要求 | 当前状态 | 达标路径 |
|------|----------|----------|----------|
| 多模态大模型 | ≥1 个 | ✅ DeepSeek + Qwen + Doubao | 已有，无需改动 |
| 问答准确率 | ≥90% | ⚠️ 待数据填充后复测 | 低于 90% 时扩充 RAG 语料 |
| 语音问答延迟 | <5 秒 | ⚠️ 待联调验证 | 超时则优化 LLM 调用 |
| 系统稳定性 | 不崩溃 | ✅ 206 个后端测试保障 | 已有集成测试覆盖 4 条端到端链路 |
| 口型/表情自然度 | 专家评估 | ⚠️ 待联调调优 | 调参 + 联调验证 |

---

#### M10 · 交付物（Week 6）

> 📌 目标：比赛提交所需文档和演示材料
> 📌 前置：M9 联调验收完成

**`M10-001` 交付物准备**

- **前置任务**：`M9-002`
- **状态**：🔴 未开始

**产出文件：**

```
docs/
  设计文档.md                # 产品总体设计文档
  部署手册.md                # Docker Compose 一键部署
  准确率报告.md              # 100 题评测报告
  延迟报告.md                # Locust 压测报告
  方案介绍.pptx              # 比赛 PPT
  演示视频.mp4               # 5-7 分钟演示视频
```

---
---

### 👤 队员A负责模块（6 个：M3/M4/M6/M7/M8/M11）

> 管理端全部 + 推荐路线前端 + DNA 推荐全栈
>
> 执行顺序：M3（Week 2）→ M4（Week 3）→ M7/M8（Week 3-4，可并行）→ M6（Week 3）→ M11（Week 3-4）
>
> 注意：M6 和 M11 的 RecommendPage.tsx 修改需等队长完成 M19-001 后对接

---

#### M3 · 知识库管理（F4）（Week 2）

> 📌 目标：管理端知识库可用，文档上传→索引→检索生效
> 📌 前置：M1 数据底座，A-006 知识库 API 已完成 ✅

| 任务编号 | 说明 | 状态 |
|----------|------|------|
| A-006 | 知识库 CRUD + FAQ CRUD + 文件上传 API | ✅ 后端已完成 |
| M3-001 | 前端知识库管理页（文档上传/列表/分块预览/FAQ编辑） | 🔴 |

**M3-001 产出文件：**

```
frontend/src/
  pages/admin/
    KnowledgePage.tsx        # 知识库管理页
  components/admin/
    DocumentUpload.tsx       # 文档上传组件
    ChunkPreview.tsx         # 分块预览
    FAQEditor.tsx            # FAQ 编辑器
  api/
    knowledge.ts             # 知识库 API 封装（已有）
```

---

#### M4 · 数字人配置管理（F5）（Week 3）

> 📌 目标：管理端可配置数字人外观/服装/声音，前端实时预览
> 📌 前置：A-007 数字人配置 API 已完成 ✅

| 任务编号 | 说明 | 状态 |
|----------|------|------|
| A-007 | 数字人配置 CRUD API | ✅ |
| M4-001 | 前端数字人配置页优化（外观切换/声音选择/Live2D预览） | 🔴 |

**M4-001 产出文件：**

```
frontend/src/
  pages/admin/
    AvatarPage.tsx           # 数字人配置页（已有，需优化）
  components/admin/
    AvatarAppearance.tsx     # 外观切换（新增）
    VoiceSelector.tsx        # 声音选择（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 外观切换 | 选择不同服装 | Live2D 预览即时更新 |
| 2 | 声音试听 | 播放 TTS 样本 | 音色切换正确 |
| 3 | 配置保存 | 修改后保存 | API 返回成功，刷新后保留 |

---

#### M6 · 推荐系统（F3）（Week 3）

> 📌 目标：推荐/路线页升级（DNA 雷达图 + 个性化路线卡片）
> 📌 前置：M1 数据底座，A-005 推荐 API ✅

| 任务编号 | 说明 | 状态 |
|----------|------|------|
| A-005 | 推荐服务 API | ✅ |
| M6-001 | 推荐/路线页升级（DNA 雷达图 + 个性化路线卡片） | 🔴 |

**M6-001 产出文件：**

```
frontend/src/
  pages/tourist/
    RecommendPage.tsx        # 推荐路线页（已有，需升级）
  components/tourist/
    DNARadarChart.tsx        # DNA 雷达图（新增，暂用静态数据）
    RouteCard.tsx            # 路线卡片（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 路线推荐 | 选择"历史文化"兴趣 | 返回对应路线卡片 |
| 2 | 兴趣切换 | 从"历史"切到"自然" | 推荐路线即时刷新 |

---

#### M7 · 感受度报告（F6）（Week 3-4）

> 📌 目标：管理端感受度报告页可用——情感趋势/关注点/盲区/建议
> 📌 前置：M1 数据底座，A-007 分析 API 已完成 ✅

**`M7-001` 管理后台 — 感受度报告页** — 交互分析→情感趋势→服务建议

- **前置任务**：`M1-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 感受度报告页面 — `frontend/src/pages/admin/ReportPage.tsx`
- [ ] 情感趋势折线图（positive/neutral/negative）— ECharts
- [ ] 关注点词云（用户高频提问关键词）— ECharts wordcloud
- [ ] 盲区发现（无法回答的问题汇总）
- [ ] LLM 生成服务建议展示
- [ ] 分析 API 封装 — `frontend/src/api/analytics.ts`（已有）

**产出文件：**

```
frontend/src/
  pages/admin/
    ReportPage.tsx           # 感受度报告页（新增）
  components/admin/
    SentimentChart.tsx       # 情感趋势图（新增）
    WordCloud.tsx            # 关注点词云（新增）
    BlindSpotList.tsx        # 盲区列表（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 情感趋势 | 选择日期范围 | 折线图正确渲染 |
| 2 | 词云 | 加载关注点数据 | 高频关键词正确显示 |
| 3 | 服务建议 | LLM 生成报告 | 建议内容可读 |

---

#### M8 · 数据大屏（F7）（Week 3-4）

> 📌 目标：管理端数据大屏页可用——服务人次/热门问答/满意度/热力图
> 📌 前置：M1 数据底座，A-007 大屏 API 已完成 ✅

**`M8-001` 管理后台 — 数据大屏页** — 服务人次/热门问答/满意度趋势

- **前置任务**：`M1-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 数据大屏页面 — `frontend/src/pages/admin/DashboardPage.tsx`
- [ ] 今日/本周服务人次指标卡片
- [ ] 实时交互监控（SSE 推送）
- [ ] 热门问答 Top10 排行榜
- [ ] 满意度趋势图
- [ ] 客流热力图（基于 14 万条数据）
- [ ] 分析 API 封装 — `frontend/src/api/analytics.ts`（已有）

**产出文件：**

```
frontend/src/
  pages/admin/
    DashboardPage.tsx        # 数据大屏页（新增）
  components/admin/
    MetricsCard.tsx          # 指标卡片（新增）
    HotQuestions.tsx         # 热门问答排行（新增）
    HeatmapChart.tsx         # 客流热力图（新增）
    RealtimeMonitor.tsx      # 实时监控（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 指标卡片 | 加载大屏 | 服务人次/满意度数据正确 |
| 2 | 热门问答 | 加载排行榜 | Top10 数据正确 |
| 3 | 实时推送 | SSE 连接建立 | 数据实时更新 |
| 4 | 热力图 | 加载景点客流数据 | 热力图正确渲染 |

---

#### M11 · 旅游 DNA 推荐系统（创新功能 2）⭐⭐⭐⭐⭐（Week 3-4）

> 📌 目标：不是基于"去过哪里"推荐，而是基于"你是哪种游客"推荐
> 📌 前置：M1 数据底座（14 万条行为数据）

**`M11-001` DNA 推荐算法引擎** — K-Means 聚类 + 协同过滤推荐

- **前置任务**：`M1-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] K-Means 聚类训练（50,000 游客 → 6-8 个 DNA 簇）— `backend/app/services/dna_clustering.py`
- [ ] 特征工程：消费占比、停留时长、访问时间分布、景点类型多样性、同行人数
- [ ] DNA 评分计算（多维特征标准化 + 加权评分 + 雷达图坐标生成）
- [ ] 协同过滤推荐引擎（UserCF 用户相似性 + ContentBF 景点特征匹配）— `backend/app/services/collaborative_filter.py`
- [ ] `/api/recommend/dna` DNA 推荐接口（返回推荐路线 + 相似度 + 推荐理由）
- [ ] `/api/recommend/dna/profile` 用户 DNA 画像接口（返回 6 维评分）
- [ ] 推荐结果 Redis 缓存（同 DNA 类型用户共享推荐池）

---

**`M11-002` DNA 推荐前端** — DNA 雷达图 + 个性化路线卡片

- **前置任务**：`M11-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] DNA 雷达图 — ECharts 6 维雷达图 — `frontend/src/components/tourist/DNARadarChart.tsx`
- [ ] 个性化路线卡片（显示推荐理由："和你 DNA 相似度 85% 的游客，90% 推荐此路线"）
- [ ] DNA 类型标签展示（如"深度文化控 · 经济型 · 社交型"）
- [ ] 兴趣偏好切换 → 实时刷新推荐

**产出文件：**

```
backend/app/
  services/
    dna_clustering.py         # K-Means DNA 聚类
    collaborative_filter.py   # 协同过滤推荐引擎
  api/
    recommend.py              # 推荐 API（已有，新增 DNA 端点）
frontend/src/
  components/tourist/
    DNARadarChart.tsx         # DNA 6 维雷达图（新增）
    RouteCard.tsx             # 个性化路线卡片（新增）
    DNATag.tsx                # DNA 类型标签（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | K-Means 聚类 | 50,000 游客特征数据 | 聚类收敛，6-8 类清晰可解释 |
| 2 | DNA 评分 | 输入用户行为记录 | 返回 6 维评分（0-100） |
| 3 | 用户画像 | 首次访问无画像 | 返回"待探索"默认画像 |
| 4 | 协同过滤 | 相似用户查询 | 返回 Top-20 相似用户 + 景点偏好 |
| 5 | 推荐接口 | POST /api/recommend/dna | 返回 3 条路线 + 相似度 + 理由 |
| 6 | DNA 雷达图 | 加载用户画像 | 6 维雷达图正确渲染 |
| 7 | 推荐理由 | 查看推荐卡片 | 显示"85% 相似用户推荐此路线" |
| 8 | 偏好切换 | 从"历史"切到"自然" | 推荐路线即时刷新 |

---
---

### 👤 队员B负责模块（6 个：M2/M12/M13/M14/M15/M16）

> 游客端全部 + 6 项创新功能全栈
>
> 执行顺序：M2（Week 1-2）→ M12（Week 4）→ M13（Week 4-5，依赖队长 M5）→ M14/M15/M16（Week 5-6，依赖 M9 联调）
>
> 注意：M13 和 M14 均修改 prompts.py，由同一人处理，内部协调即可

---

#### M2 · 知识问答（F2）（Week 1-2）

> 📌 目标：让赛题 F2 智能问答达标（准确率≥90%），前端景点详情页可用
> 📌 前置：M1 数据底座

**`M2-001` 前端景点详情页** — 游客端新增景点文化信息浏览页面

- **前置任务**：`M1-002`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 景点列表页 — `frontend/src/pages/tourist/AttractionList.tsx`
- [ ] 景点详情页（文化内涵、历史沿革、游览建议）— `frontend/src/pages/tourist/AttractionDetail.tsx`
- [ ] 景点分类筛选（佛教文化/自然风光/建筑艺术）
- [ ] 新中式 UI 样式（宣纸卡片、印章标签）

**产出文件：**

```
frontend/src/
  pages/tourist/
    AttractionList.tsx        # 景点列表页
    AttractionDetail.tsx      # 景点详情页
  api/
    attractions.ts            # 景点 API 封装
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 列表渲染 | 加载景点列表页 | 20+ 景点正确显示 |
| 2 | 详情跳转 | 点击景点卡片 | 跳转详情页，文化信息完整 |
| 3 | 分类筛选 | 选择"佛教文化" | 只显示对应类型景点 |

---

#### M12 · 游客行为热力图预测（创新功能 5）⭐⭐⭐⭐（Week 4）

> 📌 目标：从"事后统计"变成"事前预测"，直接影响游览决策
> 📌 前置：M1 数据底座（14 万条行为数据）

**`M12-001` 客流预测后端** — Prophet 时序预测模型 + 拥挤度 API

- **前置任务**：`M1-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 时序数据预处理（按景点+日期+时段聚合，构造时间序列）— `backend/app/services/crowd_predict.py`
- [ ] Prophet 客流预测模型（考虑工作日/周末/节假日季节性）
- [ ] `/api/analytics/crowd` 拥挤度查询接口（返回各景点当前/未来 N 小时预计客流）
- [ ] `/api/analytics/crowd/best-time` 最佳时段推荐接口
- [ ] `/api/analytics/crowd/alert` 拥挤预警接口（超过阈值触发）
- [ ] SSE 实时推送拥挤度变化

---

**`M12-002` 热力图前端** — 游客端拥挤地图 + 管理端全景热力图

- **前置任务**：`M12-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 景区地图热力图 — ECharts 地图热力图层 — `frontend/src/components/tourist/CrowdHeatmap.tsx`
- [ ] 拥挤度指示器（🟢 空闲 / 🟡 适中 / 🔴 拥挤）— `CrowdIndicator.tsx`
- [ ] 最佳时段推荐卡片 — `BestTimeCard.tsx`
- [ ] 管理端全景热力图（ECharts 地图 + 时间轴滑块）— `frontend/src/components/admin/AdminHeatmap.tsx`
- [ ] 拥挤预警面板 — `CrowdAlertPanel.tsx`
- [ ] 动态路线重规划建议

**产出文件：**

```
backend/app/
  services/
    crowd_predict.py          # Prophet 客流预测
  api/
    analytics.py              # 分析 API（已有，新增 crowd 端点）
frontend/src/
  components/tourist/
    CrowdHeatmap.tsx          # 游客端拥挤地图（新增）
    CrowdIndicator.tsx        # 拥挤度指示器（新增）
    BestTimeCard.tsx          # 最佳时段推荐卡片（新增）
  components/admin/
    AdminHeatmap.tsx          # 管理端全景热力图（新增）
    CrowdAlertPanel.tsx       # 拥挤预警面板（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | Prophet 训练 | 14 万条历史数据 | 模型收敛，MAPE < 20% |
| 2 | 客流预测 | 预测今日各时段客流 | 曲线与实际趋势吻合 |
| 3 | 拥挤查询 | GET /api/analytics/crowd | 返回 152 景点当前拥挤度 |
| 4 | 最佳时段 | 查询"大佛区域" | 返回建议时段（如 15:00-17:00） |
| 5 | 拥挤预警 | 客流超过阈值 | SSE 推送预警消息 |
| 6 | 热力图渲染 | 加载地图 + 景点数据 | 热力图层正确渲染 |
| 7 | 动态路线 | 选择"避开拥挤" | 返回重规划后的路线 |
| 8 | 管理面板 | 拖动时间轴滑块 | 热力图随时间变化 |

---

#### M13 · AI 数字人沉浸式导游（创新功能 1）⭐⭐⭐⭐⭐（Week 4-5）

> 📌 目标：从"录音播放式"导览升级为"交互式对话式"AI 导游
> 📌 前置：M5 数字人交互联调完成（队长负责）

**`M13-001` 多角色系统** — 佛祖/禅师/游客/徐霞客视角 + 情感自适应

- **前置任务**：`M5-001`
- **状态**：🔴 未开始

**后端开发内容：**

- [ ] 多角色 System Prompt 管理（佛祖/禅师/游客/徐霞客视角）— `backend/app/core/prompts.py`（已有，需扩展）
- [ ] `/api/chat/role` 角色切换接口
- [ ] 情感自适应讲解逻辑（根据游客反馈调整讲解深度和语气）— `backend/app/services/chat_service.py`（已有，需增强）
- [ ] 讲解风格参数化（严肃/轻松/详细/简略）
- [ ] 虚拟合影接口（接收前端截图 → 合成背景 → 返回图片 URL）— `backend/app/api/avatar.py`

**前端开发内容：**

- [ ] 角色选择器（佛祖/禅师/游客/历史人物 Tab 切换）— `frontend/src/components/DigitalHuman/RoleSelector.tsx`
- [ ] 角色切换时数字人风格变化（语气气泡、UI 色调、讲解开场白）
- [ ] 情感状态指示器（当前讲解风格标签）— `MoodIndicator.tsx`
- [ ] 虚拟合影按钮 → 截屏合成 → 分享图片生成 — `PhotoBooth.tsx`
- [ ] 数字人播报模式（自动播放景点讲解，类似导游带团）
- [ ] 情感驱动的表情/底座颜色联动（严肃=深蓝、轻松=朱砂红、温柔=青瓷绿）

**产出文件：**

```
backend/app/
  core/
    prompts.py                # System Prompt（已有，扩展多角色）
  api/
    chat.py                   # 对话 API（已有，新增角色端点）
  services/
    chat_service.py           # 对话服务（已有，增强情感自适应）
frontend/src/
  components/DigitalHuman/
    RoleSelector.tsx          # 多角色选择器（新增）
    PhotoBooth.tsx            # 虚拟合影（新增）
    MoodIndicator.tsx         # 情感状态指示器（新增）
    DigitalHuman.tsx          # 数字人组件（已有，需增强播报模式）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 佛祖视角 | 提问"大佛为什么是金色的" | 庄严语气、佛教用语回答 |
| 2 | 禅师视角 | 同一问题 | 哲理化、禅意表达回答 |
| 3 | 游客视角 | 同一问题 | 轻松、口语化回答 |
| 4 | 历史人物视角 | 徐霞客角色 | 文言文风格、游记口吻 |
| 5 | 情感自适应 | 连续追问 → 深入模式 | 回答从简略切换为详细 |
| 6 | 角色切换 | 佛祖 → 禅师 | UI 色调 + 讲解风格同步变化 |
| 7 | 底座颜色联动 | 情感变化 | 底座光晕颜色跟随切换 |
| 8 | 虚拟合影 | 点击合影按钮 | 生成含数字人 + 景点背景的分享图 |
| 9 | 播报模式 | 进入景点区域 | 数字人自动开始讲解，情感/表情/口型同步 |

---

#### M14 · 时空穿越体验（创新功能 3）⭐⭐⭐⭐（Week 5）

> 📌 目标：将 1300 年灵山历史变成可互动的穿越式游览
> 📌 前置：M9 联调验收完成

**`M14-001` 历史知识图谱 + 角色扮演** — 景点-朝代-事件关系 + AI 角色扮演讲解

- **前置任务**：`M9-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] Neo4j 历史事件知识图谱（景点-朝代-事件关系）— `backend/app/services/history_kg.py`
- [ ] LLM 文言文风格生成 Prompt — `backend/app/core/prompts.py`（新增古风模板）
- [ ] `/api/history/timeline` 历史时间线接口
- [ ] `/api/history/roleplay` 历史角色扮演讲解接口
- [ ] `/api/history/today` "那年今日"历史卡片接口
- [ ] `/api/history/translate` 文言文/现代文切换接口

---

**`M14-002` 时间线 UI + 穿越交互** — 横向时间轴 + 时空之门 + 朝代切换

- **前置任务**：`M14-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 历史时间线组件 — 横向可滚动时间轴（唐→宋→明→清→现代）— `TimelineView.tsx`
- [ ] 时空之门入口按钮（到达景点后弹出穿越选择）— `TimeGate.tsx`
- [ ] 朝代视角切换器（选择不同时代，UI 风格跟随变化）— `EraSwitcher.tsx`
- [ ] 古风文案展示区（文言文/现代文切换按钮）— `AncientText.tsx`
- [ ] "那年今日"历史卡片弹窗 — `TodayCard.tsx`
- [ ] 数字人历史装扮切换（复用 Live2D 外观切换）
- [ ] 历史探索页 — `frontend/src/pages/tourist/HistoryExplore.tsx`

**产出文件：**

```
backend/app/
  services/
    history_kg.py             # 历史事件知识图谱
  core/
    prompts.py                # System Prompt（新增古风模板）
  api/
    history.py                # 历史体验 API（新增）
frontend/src/
  components/tourist/
    TimelineView.tsx          # 历史时间线组件（新增）
    TimeGate.tsx              # 时空之门入口（新增）
    EraSwitcher.tsx           # 朝代视角切换器（新增）
    AncientText.tsx           # 古文/现代文切换展示（新增）
    TodayCard.tsx             # "那年今日"历史卡片（新增）
  pages/tourist/
    HistoryExplore.tsx        # 历史探索页（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 历史知识图谱 | 查询"小灵山寺建造时间" | 返回唐代贞观年间 |
| 2 | 时间线接口 | GET /api/history/timeline | 返回 5 个朝代事件列表 |
| 3 | 角色扮演 | 唐代僧人视角讲解 | 文言文风格 + 佛教用语 |
| 4 | 那年今日 | 查询今日历史事件 | 返回"1200 年前的今天"类卡片 |
| 5 | 文言切换 | 点击"古风版" | 讲解内容切换为文言文 |
| 6 | 时间线渲染 | 加载时间线组件 | 横向可滚动，5 个朝代节点 |
| 7 | 时空之门 | 到达景点触发 | 弹出穿越选择对话框 |
| 8 | 数字人装扮 | 选择"唐代"视角 | 数字人切换唐代服饰 |
| 9 | 古今对比 | 查看同一景点不同时代 | 显示变迁差异 |

---

#### M15 · 禅意冥想声音疗愈（创新功能 4）⭐⭐⭐（Week 5-6）

> 📌 目标：从"观光"升级为"疗愈体验"，契合现代人减压需求
> 📌 前置：M9 联调验收完成

**`M15-001` 冥想词生成 + TTS 合成** — 基于景点知识 LLM 生成冥想引导词

- **前置任务**：`M9-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] `/api/zen/meditation-script` 冥想词生成接口（基于景点知识 LLM 生成）
- [ ] `/api/zen/report` 禅修报告生成接口（汇总游览记录 + 推荐内容）
- [ ] TTS 合成冥想引导词音频 — 复用已有 `core/tts.py`
- [ ] 景点-声音类型映射表（禅意花园→鸟鸣+流水、梵天花海→风声+花语、大佛→钟声+诵经）

---

**`M15-002` 声音地图 + 冥想播放器** — Web Audio API 混音 + 呼吸引导动画 + 禅修报告

- **前置任务**：`M15-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 场景声音地图（每个景点配专属环境音，Web Audio API 混音）— `SoundMap.tsx`
- [ ] 环境音选择器（钟声/流水/鸟鸣/风声/诵经声可组合播放）— `SoundSelector.tsx`
- [ ] 冥想引导播放器（LLM 生成冥想词 + TTS 合成音频）— `MeditationPlayer.tsx`
- [ ] 计时器 + 呼吸引导动画（4-7-8 呼吸法）— `BreathAnimation.tsx`
- [ ] 禅修打卡日记（游览结束后生成分享图）— `ZenReport.tsx`
- [ ] 白噪音后台播放器（离开景区后仍可播放，Service Worker 后台音频）— `WhiteNoisePlayer.tsx`
- [ ] 音量混音器（各环境音独立音量控制）— `VolumeMixer.tsx`

**产出文件：**

```
backend/app/
  api/
    zen.py                    # 禅修 API（新增）
  services/
    meditation_service.py     # 冥想词生成 + TTS 合成（新增）
frontend/src/
  components/tourist/
    SoundMap.tsx              # 场景声音地图（新增）
    SoundSelector.tsx         # 环境音选择器（新增）
    MeditationPlayer.tsx      # 冥想引导播放器（新增）
    BreathAnimation.tsx       # 呼吸引导动画（新增）
    ZenReport.tsx             # 禅修打卡日记（新增）
    WhiteNoisePlayer.tsx      # 白噪音播放器（新增）
    VolumeMixer.tsx           # 音量混音器（新增）
frontend/public/
  audio/
    zen-environment/          # 环境音音频库
      bell.mp3                # 钟声
      water.mp3               # 流水
      birds.mp3               # 鸟鸣
      wind.mp3                # 风声
      chanting.mp3            # 诵经
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 冥想词生成 | POST /api/zen/meditation-script | 返回景点相关冥想引导词 |
| 2 | TTS 合成 | 冥想词 → 音频 | 语音自然，适合冥想节奏 |
| 3 | 声音地图 | 选择拈花湾景点 | 加载对应环境音组合 |
| 4 | 混音播放 | 同时播放 3 种环境音 | 无卡顿，音量平衡 |
| 5 | 冥想播放 | 点击"开始冥想" | TTS 引导词 + 环境音同步播放 |
| 6 | 呼吸引导 | 跟随 4-7-8 动画 | 动画节奏与呼吸指令同步 |
| 7 | 禅修报告 | 游览结束生成 | 含去过的景点、听过的内容、感悟记录 |
| 8 | 白噪音后台 | 切换到其他页面 | 音频继续播放，不中断 |
| 9 | 音量混音器 | 调节各环境音音量 | 独立控制，实时生效 |

---

#### M16 · 文化解谜游戏化（创新功能 6）⭐⭐⭐⭐（Week 6）

> 📌 目标：用游戏化解决"走马观花"问题，让游客主动探索文化
> 📌 前置：M9 联调验收完成

**`M16-001` AI 谜题生成 + 成就系统** — LLM 动态生成谜题 + 印章 + 成就 + 排行榜

- **前置任务**：`M9-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] `/api/puzzle/generate` AI 动态谜题生成接口（LLM 基于景点知识生成选择题/配对题）— `backend/app/api/puzzle.py`
- [ ] 谜题题库缓存（同一景点不同版本，避免重复）
- [ ] `/api/puzzle/answer` 答题验证接口
- [ ] `/api/puzzle/stamps` 数字印章收集接口（答题正确 → 解锁印章）
- [ ] `/api/puzzle/achievements` 成就系统接口（到达 X 个景点 + 答对 Y 题 = 解锁 Z 成就）
- [ ] `/api/puzzle/leaderboard` 排行榜接口
- [ ] 成就规则引擎 — `backend/app/services/achievement_engine.py`

---

**`M16-002` 谜题游戏界面 + 印章墙** — 选择题 UI + Canvas 印章生成 + 成就面板 + 排行榜

- **前置任务**：`M16-001`
- **状态**：🔴 未开始

**开发内容：**

- [ ] 谜题游戏界面（选择题 UI + 选项动画 + 即时反馈）— `PuzzleGame.tsx`
- [ ] 数字印章展示墙（收集的印章网格展示）— `StampWall.tsx`
- [ ] Canvas 印章生成器（基于景点文化元素生成独特 SVG/Canvas 印章图案）— `StampGenerator.tsx`
- [ ] 成就面板（成就列表 + 解锁进度 + 等级称号）— `AchievementPanel.tsx`
- [ ] 排行榜页面（Top 玩家积分排行）— `frontend/src/pages/tourist/Leaderboard.tsx`
- [ ] 景点解锁动画（答对谜题 → 隐藏内容展开 → 获得印章）— `UnlockAnimation.tsx`
- [ ] 游览结束生成"灵山探险报告"分享图 — `AdventureReport.tsx`

**产出文件：**

```
backend/app/
  api/
    puzzle.py                 # 谜题/印章/成就 API（新增）
  services/
    achievement_engine.py     # 成就规则引擎（新增）
frontend/src/
  components/tourist/
    PuzzleGame.tsx            # 谜题游戏界面（新增）
    StampWall.tsx             # 数字印章墙（新增）
    StampGenerator.tsx        # Canvas 印章生成器（新增）
    AchievementPanel.tsx      # 成就面板（新增）
    UnlockAnimation.tsx       # 景点解锁动画（新增）
    AdventureReport.tsx       # 探险报告分享图（新增）
  pages/tourist/
    Leaderboard.tsx           # 排行榜页面（新增）
```

**测试内容：**

| # | 测试项 | 测试场景 | 预期结果 |
|---|--------|---------|---------|
| 1 | 谜题生成 | POST /api/puzzle/generate（佛足广场） | 返回 3-5 道选择题 |
| 2 | 答题验证 | 选择正确答案 | 返回"正确" + 解锁内容 |
| 3 | 答题验证 | 选择错误答案 | 返回"错误" + 鼓励继续 |
| 4 | 印章解锁 | 连续答对 3 题 | 获得专属数字印章 |
| 5 | 成就解锁 | 到达 5 个景点 + 答对 10 题 | 解锁"文化学者"成就 |
| 6 | 印章渲染 | 查看印章墙 | 独特图案，非重复图片 |
| 7 | 排行榜 | 加载排行榜页面 | Top 玩家数据正确 |
| 8 | 探险报告 | 游览结束 | 生成含解谜记录 + 印章的分享图 |
| 9 | 题目多样性 | 同一景点两次游览 | 题目不完全相同（AI 动态生成） |

---

***

## 四、依赖关系与执行顺序

### 跨人依赖一览

| 依赖方 | 被依赖方 | 依赖内容 |
|--------|---------|---------|
| 队长 M5-001 | 队员B M2-001 | 数字人对话页依赖景点详情页 |
| 队员B M13-001 | 队长 M5-001 | 多角色系统依赖数字人交互联调 |
| 队员B M14/M15/M16 | 队长 M9-001 | 创新功能依赖联调验收 |
| 队员A M6/M11（RecommendPage） | 队长 M19-001 | RecommendPage.tsx 修改需在 M19 之后对接 |

### 并行开发执行图

```
Week 1-2          Week 2-3          Week 3            Week 3-4          Week 4        Week 5        Week 6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【队长】M1 数据底座  ──→ M5 数字人交互 ──→ M17 拍照→协同 ──→ M20 三功能联调 ──→ M9 联调 ──→ M10 交付物
                        ↑                  M18 协同LLM
                        │                  M19 推荐动态化
【队员B】M2 景点详情页 ──→ ┘            ┌── M13 多角色导游 ──→ M9 ──→ M14 时空穿越
                                         ├── M15 禅意冥想
                                         ├── M12 热力图预测（可提前至 Week 4）
                                         └── M16 文化解谜
【队员A】             M3 知识库 ──→ M4 数字人配置 ──→ M7 报告 + M8 大屏
                                         M6 推荐页 ← M19 后对接
                                         M11 DNA 推荐全栈

执行流程：
  第 1 批（Week 1-2）：队长M1 + 队员BM2          ← 数据底座就绪
  第 2 批（Week 2-3）：队长M5 + 队员AM3/M4       ← 赛题 F1-F5
  第 3 批（Week 3）：  队长M17/M18/M19            ← 三功能串联
  第 4 批（Week 3-4）：队员A M6/M7/M8/M11        ← 管理端 + DNA
  第 5 批（Week 4）：  队员B M12                  ← 热力图（可提前）
  第 6 批（Week 4-5）：队长M20 + 队员B M13       ← 联调 + 导游
  第 7 批（Week 5）：  队长M9 + 队员B M14/M15/M16 ← 全功能联调 + 创新
  第 8 批（Week 6）：  队长M10                     ← 交付物
```

### 无跨人代码冲突验证

| 人员 | 共享文件内部协调 | 跨人冲突？ |
|------|----------------|-----------|
| 队长 | M17/M18 均改 room.py + useRoomWebSocket.ts | ✅ 同一人 |
| 队员B | M13/M14 均改 prompts.py | ✅ 同一人 |
| 队员A | M3/M4/M6/M7/M8/M11 各自独立文件 | ✅ 无共享文件 |
| **跨成员** | 无任何共享文件 | ✅ 三人完全并行 |

***

## 五、非功能性需求对标总览

| 指标 | 赛题要求 | 当前状态 | 达标路径 | 负责人 |
|------|----------|----------|----------|--------|
| 多模态大模型 | ≥1 个 | ✅ DeepSeek + Qwen + Doubao | 已有，无需改动 | 队长 |
| 问答准确率 | ≥90% | ⚠️ 已有 100 题脚本，待数据填充 | 知识入库后复测，低于 90% 扩充语料 | 队长 |
| 语音延迟 | <5 秒 | ⚠️ SSE + WebSocket 已就绪 | 联调时监控，超时优化 LLM 调用 | 队长 |
| 系统稳定性 | 不崩溃 | ✅ 206 个后端测试 | 已有集成测试覆盖 4 条端到端链路 | 队长 |
| 口型/表情自然度 | 专家评估 | ⚠️ LipSync + EmotionController 已集成 | 联调验证，调优参数 | 队长 |

***

## 六、创新功能综合对比

| 维度 | 数字人导游 | DNA 推荐 | 时空穿越 | 禅意疗愈 | 热力图预测 | 文化解谜 |
|------|-----------|---------|---------|---------|-----------|---------|
| **创新度** | 高 | 高 | 极高 | 中 | 中 | 高 |
| **技术可行性** | 高（已有基础） | 高（数据充足） | 中（需历史知识） | 中（需音频素材） | 高（有时序数据） | 中（需游戏逻辑） |
| **数据支撑** | 中 | 强（14 万条） | 强（20+ 景点） | 低 | 强（14 万条） | 中 |
| **差异化竞争力** | 极强 | 强 | 极强 | 强 | 中 | 极强 |
| **开发周期** | 2 周 | 2 周 | 1 周 | 2 周 | 1 周 | 1 周 |
| **对应赛题加分** | AI 交互 + 数字人 | 数据科学 + ML | 文化传承 + AR | 健康 + 音频 | 数据可视化 | 游戏化 + 社交 |
| **对应模块** | `M13` | `M11` | `M14` | `M15` | `M12` | `M16` |

### 推荐实施优先级

| 排名 | 功能 | 模块编号 | 理由 |
|------|------|----------|------|
| 1 | **AI 数字人沉浸式导游** | `M13` | 技术基础最完善，差异化最强，比赛展示效果最佳 |
| 2 | **旅游 DNA 个性化推荐** | `M11` | 数据最充足（14 万条），算法可实现，明确比赛评分点 |
| 3 | **热力图实时预测** | `M12` | 可视化效果好，数据支撑强，管理端 + 游客端双赢 |
| 4 | **时空穿越体验** | `M14` | 创新度最高，技术复杂度较高，作为亮点功能 |
| 5 | **文化解谜游戏化** | `M16` | 游戏化展示效果好，适合比赛演示，用户粘性强 |
| 6 | **禅意冥想疗愈** | `M15` | 差异化好但数据支撑弱，作为拈花湾专属特色 |

***

## 七、API 端点总览

### 赛题基础 API

| 模块 | 端点 | 方法 | 说明 | 状态 |
|------|------|------|------|------|
| 对话 | `/api/chat/stream` | POST (SSE) | 流式对话 | ✅ |
| 对话 | `/ws/chat` | WebSocket | 音频流双向通信 | ✅ |
| 推荐 | `/api/recommend/routes` | GET | 路线推荐 | ✅ |
| 推荐 | `/api/recommend/profile` | GET/PUT | 游客画像 | ✅ |
| 分析 | `/api/analytics` | GET | 统计服务 | ⚠️ 需确认数据源 |
| 分析 | `/api/analytics/sentiment` | GET | 情感趋势 | ✅ |
| 分析 | `/api/analytics/report` | GET | 感受度报告 | ✅ |
| 知识库 | `/api/knowledge/docs` | GET/POST | 文档列表/上传 | ✅ |
| 知识库 | `/api/knowledge/docs/{id}` | GET/PUT/DELETE | 文档详情/修改/删除 | ✅ |
| 知识库 | `/api/knowledge/docs/{id}/reindex` | POST | 重新索引 | ✅ |
| 知识库 | `/api/knowledge/faq` | GET/POST/PUT/DELETE | FAQ 管理 | ✅ |
| 文件 | `/api/upload` | POST | 文件上传 | ✅ |
| 数字人 | `/api/avatar/config` | GET/PUT | 数字人配置 | ✅ |
| 大屏 | `/api/dashboard/metrics` | GET | 指标数据 | ✅ |
| 大屏 | `/api/dashboard/realtime` | WebSocket | 实时监控 | ✅ |

### 串联功能 API（M17~M19）

| 模块 | 端点 | 方法 | 说明 | 状态 |
|------|------|------|------|------|
| M17 | `/api/vision/sync-to-room` | POST | 拍照识别结果同步到房间行程 | 🔴 M17 |
| M17 | `/api/room/{room_id}/itinerary/add-spot` | POST | 添加单个景点到房间行程 | 🔴 M17 |
| M18 | `/api/room/{room_id}/ws` | WebSocket | 增强：chat → LLM 回答 + chat_answer | 🔴 M18 |

### 创新功能 API

| 模块 | 端点 | 方法 | 说明 | 状态 |
|------|------|------|------|------|
| M13 | `/api/chat/role` | POST | 多角色切换 | 🔴 M13 |
| M11 | `/api/recommend/dna` | POST | DNA 个性化推荐 | 🔴 M11 |
| M11 | `/api/recommend/dna/profile` | GET | 用户 DNA 画像 | 🔴 M11 |
| M12 | `/api/analytics/crowd` | GET | 拥挤度预测 | 🔴 M12 |
| M12 | `/api/analytics/crowd/best-time` | GET | 最佳时段推荐 | 🔴 M12 |
| M12 | `/api/analytics/crowd/alert` | GET | 拥挤预警 | 🔴 M12 |
| M14 | `/api/history/timeline` | GET | 历史时间线 | 🔴 M14 |
| M14 | `/api/history/roleplay` | POST | 角色扮演讲解 | 🔴 M14 |
| M14 | `/api/history/today` | GET | "那年今日"卡片 | 🔴 M14 |
| M14 | `/api/history/translate` | POST | 文言文/现代文切换 | 🔴 M14 |
| M15 | `/api/zen/meditation-script` | POST | 冥想词生成 | 🔴 M15 |
| M15 | `/api/zen/report` | GET | 禅修报告 | 🔴 M15 |
| M16 | `/api/puzzle/generate` | POST | AI 生成谜题 | 🔴 M16 |
| M16 | `/api/puzzle/answer` | POST | 答题验证 | 🔴 M16 |
| M16 | `/api/puzzle/stamps` | GET | 数字印章收集 | 🔴 M16 |
| M16 | `/api/puzzle/achievements` | GET | 成就系统 | 🔴 M16 |
| M16 | `/api/puzzle/leaderboard` | GET | 排行榜 | 🔴 M16 |

***

## 八、评分项对照

| 评分项 | 满分 | 对应实现 | 对应模块 | 当前预估 |
|--------|------|----------|----------|----------|
| 多模态交互 | 40 | 语音→ASR→LLM→TTS→数字人口型全链路 | M5 + M9 | 80% → 95% |
| 智能问答与讲解 | 40 | RAG 混合检索 + LLM + FAQ 白名单，≥90% 准确率 | M2 + M9 + M18 | 78% → 92% |
| 管理后台 | 40 | 知识库管理 + 数字人配置 + 报告 + 数据大屏 | M3 + M4 + M7 + M8 | 55% → 85% |
| 数字人技术集成度 | 15 | Live2D 口型同步 + 表情 + Idle 动画 + 多角色 | M5 + M13 | 70% → 90% |
| 大模型与知识库应用 | 15 | 多 API 混合路由 + Milvus + 混合检索 + 重排序 + Neo4j | A-001 ~ A-002 + M1 | 85% → 95% |
| 行业实用与体验性 | 20 | Web H5 随时可用，延迟 < 5s，拍照→协同→推荐全链路 | M17 + M19 + M9 | 70% → 95% |
| 文档质量 | 10 | 设计文档 + 部署手册 + PPT + 视频 | M10 | 50% → 90% |
| **加分项** | — | 6 项创新功能 + 3 项串联功能 | M11 ~ M19 | 0% → 85% |
| **合计** | **100+** | | | **综合目标：一等奖** |

***

## 九、下一步最高优先级

1. **三功能串联（M17/M18/M19）** → 拍照识景→协同导览→推荐路线全链路可用（⭐ 新增最高优先级，现有基础设施已就绪，改动最小、收益最大）
2. **导入灵山景点数据** → 让 M1 数据底座就绪（`M1-002`）
3. **联调数字人多模态** → 让 M5 语音/表情/口型全链路跑通（`M5-001`）
4. **开发管理后台前端** → 补齐 M7 感受度报告 + M8 数据大屏（`M7-001` + `M8-001`）

***

*文档版本: v6.0 | 创建日期: 2026-06-05 | 更新日期: 2026-06-05 | 项目: 灵山胜境 AI 数字人智慧导览系统*
