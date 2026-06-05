# 智慧旅游数字人导览系统 · 优化计划书

> 📌 任务：前后端全链路优化（比赛冲刺）
> 📌 团队编制：Person A（对话引擎） + Person B（数字人体验）（共 2 人）
> 📌 项目周期：2 周（10 个工作日）
> 📌 格式约定：任务编号格式 `[模块]-[序号]`，状态标记：🔴 未开始 → 🔵 进行中 → ✅ 已完成

**核心原则：**

- Person A 负责「对话引擎」模块的前后端（结构化输出 + 语义缓存 + 降级熔断 + RAG + Function Call + 上下文 + 聊天页 + 结构化渲染）
- Person B 负责「数字人体验」模块的前后端（TTS + 音素 + 多语音 + 离线包 + 表情 + 唇形 + 悬浮助手 + 语音优化 + 离线模式 + 多形象）
- 两个模块通过统一 JSON Schema 接口协议解耦，各自独立开发 + 各自测试
- 联调仅做接口对接验证，不改代码

***

## 一、项目概述

### 1.1 优化背景

当前系统已完成基础功能，但存在以下核心问题：

- 大模型响应慢（2-5 秒），卡顿感强
- 缓存命中率低（精确匹配 only，命中率 \~30%）
- 输出格式不稳定，前端经常因大模型乱输出而崩溃
- 数字人是"静态图片人"，无表情无唇形
- 无离线模式，景区弱网环境体验差

### 1.2 优化目标

| 指标          | 当前值        | 目标值                |
| ----------- | ---------- | ------------------ |
| 首次响应延迟      | 2-5s       | < 500ms（流式首 token） |
| 缓存命中响应      | 精确匹配 \~30% | 语义匹配 ≥ 90%         |
| 大模型 API 调用量 | 100%       | 减少 90%（语义缓存）       |
| 输出格式合规率     | \~70%      | 100%（强制校验 + 重试）    |
| 数字人表情       | 无          | 5 种表情自动切换          |
| 唇形同步        | 无          | 音素级唇形驱动            |
| 离线可用        | 无          | Top50 问答离线可用       |

### 1.3 JSON Schema 接口协议（两人约定）

```typescript
// Person A 后端输出 → Person B 前端消费
interface ChatResponse {
  text: string;                    // 主回答文案（数字人播报内容）
  emotion: "smile" | "think" | "sorry" | "surprise" | "neutral";
  entities: Entity[];              // 实体列表（前端渲染卡片 + 地图跳转）
  actions: Action[];               // 操作按钮
  tts: TTSInfo;                    // TTS 音频信息
  source: "faq" | "rag" | "cache" | "offline";
  latency_ms: number;
  cached: boolean;
}

interface Entity {
  type: "spot" | "facility" | "restaurant" | "hotel";
  name: string;
  id: string;
  distance?: number;               // 米
  image_url?: string;
  ticket_price?: string;
  open_hours?: string;
}

interface Action {
  type: "navigate" | "add_trip" | "listen_detail" | "view_image";
  label: string;
  payload: string;                 // JSON string
}

interface TTSInfo {
  audio_url?: string;
  duration_ms?: number;
  phonemes?: Phoneme[];            // 唇形同步用
}

interface Phoneme {
  char: string;
  start_ms: number;
  end_ms: number;
  mouth_shape: "closed" | "half" | "open";
}
```

***

## 二、团队分工总览

| 角色           | 职责范围         | 核心交付                                                                  |
| ------------ | ------------ | --------------------------------------------------------------------- |
| **Person A** | 对话引擎模块（前后端）  | 结构化输出、语义缓存、降级熔断、RAG 增强、Function Call、上下文管理、聊天页重构、结构化渲染、快捷指令、实体跳转、对话历史 |
| **Person B** | 数字人体验模块（前后端） | TTS 流式、音素时间戳、多语音、离线包、表情系统、唇形同步、悬浮助手、语音交互、离线模式、多形象切换                   |

***

## 三、开发内容详细计划

***

### 模块 A · 对话引擎（Person A 负责，前后端）

> 📌 负责人：**Person A（独立完成）**
> 目标：结构化输出 + 语义缓存 + 降级熔断 + RAG 增强 + Function Call + 上下文管理 + 聊天页重构 + 结构化渲染

***

#### `A-001` 结构化输出强制校验

> 强制大模型返回 JSON，解决乱输出导致前端崩溃的问题

- **前置任务**：无
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 修改 SYSTEM\_PROMPT\_CHAT，要求返回 JSON 格式 — `backend/app/core/prompts.py`
- [ ] 新增 `parse_structured_output()` 函数 — `backend/app/core/llm_router.py`
- [ ] JSON 解析失败 → 重试 2 次 → 兜底返回纯文本包装
- [ ] 校验 emotion 必须是 5 种之一，entities/actions 必须是数组
- [ ] 修改 `token_generator()` 流式结束后附加结构化元数据 — `backend/app/api/chat.py`

**产出文件：**

```
backend/app/
  core/
    prompts.py               # 修改：添加 JSON Schema 输出格式
    llm_router.py            # 修改：添加 parse_structured_output()
  api/
    chat.py                  # 修改：流式结束后附加结构化数据
  tests/
    test_structured_output.py # 单元测试
```

***

#### `A-002` 多级降级与熔断

> 主模型超时→备用模型→离线预设回答，保证比赛不翻车

- **前置任务**：无
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建熔断器（连续 3 次失败 → 熔断 30s）— `backend/app/core/circuit_breaker.py`
- [ ] 添加超时控制（单次 LLM 调用 10s）— `backend/app/core/llm_router.py`
- [ ] 降级链：主模型 → 备用模型 → 离线预设回答
- [ ] 统一异常处理：任何环节失败返回友好 ChatResponse

**产出文件：**

```
backend/app/
  core/
    circuit_breaker.py       # 新建：熔断器
    llm_router.py            # 修改：添加超时 + 降级链
  tests/
    test_circuit_breaker.py  # 单元测试
```

***

#### `A-003` 语义缓存

> 向量相似度缓存，命中率从 30% 提升到 90%，省 90% API 成本

- **前置任务**：`A-001`
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建语义缓存模块 — `backend/app/core/semantic_cache.py`
- [ ] 使用 `bge-small-zh-v1.5` 本地向量化（100MB）
- [ ] Redis 存储：精确匹配 (MD5) → 语义搜索 (余弦 > 0.9) → RAG
- [ ] 修改 `_check_cache()` 和 `_set_cache()` — `backend/app/api/chat.py`
- [ ] 新建缓存预热脚本 — `backend/scripts/warm_cache.py`
- [ ] 语义缓存命中时，异步调用 Person B 的 TTS 接口补充 phonemes

**产出文件：**

```
backend/app/
  core/
    semantic_cache.py        # 新建：语义缓存
  api/
    chat.py                  # 修改：集成语义缓存
  scripts/
    warm_cache.py            # 新建：缓存预热
  tests/
    test_semantic_cache.py   # 单元测试
```

***

#### `A-004` RAG 知识库增强

> 分块策略优化 + 检索增强，解决通用大模型"胡说八道"的问题

- **前置任务**：无
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 分块策略改为按类型分块（景点/历史/门票/交通）— `backend/app/services/knowledge_service.py`
- [ ] 每个 chunk 添加 `category` metadata
- [ ] 检索时根据问题类型过滤 chunk — `backend/app/core/rag.py`
- [ ] BM25 专有名词增强 — `backend/app/core/bm25_search.py`

**产出文件：**

```
backend/app/
  services/
    knowledge_service.py     # 修改：分块策略
  core/
    rag.py                   # 修改：按类型过滤
    bm25_search.py           # 修改：专有名词增强
  tests/
    test_rag_enhanced.py     # 单元测试
```

***

#### `A-005` Function Call 工具调用

> 让大模型能查实时客流、天气、设施状态，回答有实用价值

- **前置任务**：`A-001`
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建工具目录 — `backend/app/services/tools/`
- [ ] `flow_tool.py` — 查询实时客流（模拟数据）
- [ ] `weather_tool.py` — 查询天气（接入免费 API）
- [ ] `facility_tool.py` — 查询设施状态（模拟数据）
- [ ] `ticket_tool.py` — 查询门票价格（静态数据）
- [ ] `route_tool.py` — 生成个性化路线
- [ ] prompts.py 添加 tools 定义
- [ ] 新建工具执行器 — `backend/app/core/tool_executor.py`
- [ ] 工具结果缓存：实时数据 1min，静态数据 1h

**产出文件：**

```
backend/app/
  services/tools/
    __init__.py
    flow_tool.py             # 客流查询
    weather_tool.py          # 天气查询
    facility_tool.py         # 设施状态
    ticket_tool.py           # 门票价格
    route_tool.py            # 路线生成
  core/
    tool_executor.py         # 工具执行器
    prompts.py               # 修改：添加 tools 定义
  tests/
    test_tool_executor.py    # 单元测试
```

***

#### `A-006` 用户上下文管理

> 多轮对话 + 用户偏好记忆，数字人能记住"我带了老人"

- **前置任务**：无
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建上下文管理器 — `backend/app/core/context_manager.py`
- [ ] Redis 存储对话历史（TTL: 24h），每次携带最近 5 轮
- [ ] 用户偏好记忆（身份/偏好/位置）
- [ ] 修改 chat.py 集成上下文

**产出文件：**

```
backend/app/
  core/
    context_manager.py       # 新建：上下文管理
  api/
    chat.py                  # 修改：集成上下文
  tests/
    test_context_manager.py  # 单元测试
```

***

#### `A-007` 聊天页重构 + 结构化响应渲染

> 接收 ChatResponse JSON，渲染主文案 + 实体卡片 + 操作按钮

- **前置任务**：`A-001`
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建响应解析器 — `frontend/src/utils/responseParser.ts`
- [ ] 新建结构化响应组件 — `frontend/src/components/Chat/StructuredResponse.tsx`
- [ ] 新建实体卡片组件 — `frontend/src/components/Chat/EntityCard.tsx`
- [ ] 新建操作按钮组件 — `frontend/src/components/Chat/ActionButtons.tsx`
- [ ] 修改 ChatPage 接收 ChatResponse — `frontend/src/pages/tourist/ChatPage.tsx`
- [ ] emotion 字段传递给数字人组件

**产出文件：**

```
frontend/src/
  utils/
    responseParser.ts        # 新建：响应解析
  components/Chat/
    StructuredResponse.tsx   # 新建：结构化响应
    EntityCard.tsx           # 新建：实体卡片
    ActionButtons.tsx        # 新建：操作按钮
  pages/tourist/
    ChatPage.tsx             # 修改：集成结构化渲染
  __tests__/
    responseParser.test.ts   # 单元测试
    StructuredResponse.test.tsx
```

***

#### `A-008` 实体关键词跳转

> 回答中的景点/设施自动高亮，点击触发地图定位 + 数字人讲解

- **前置任务**：`A-007`
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建实体高亮组件 — `frontend/src/components/Chat/EntityHighlight.tsx`
- [ ] 关键词自动高亮为蓝色链接
- [ ] 点击触发自定义事件 `entity:click`（Person B 的 FloatingAssistant 监听）

**产出文件：**

```
frontend/src/
  components/Chat/
    EntityHighlight.tsx      # 新建：实体高亮
  __tests__/
    EntityHighlight.test.tsx # 单元测试
```

***

#### `A-009` 智能快捷指令栏

> 根据上下文动态切换快捷按钮，初始页 / 聊到景点时不同

- **前置任务**：`A-007`
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建智能快捷指令组件 — `frontend/src/components/Chat/SmartQuickBar.tsx`
- [ ] 初始页：「推荐必玩景点」「找卫生间」「查门票价格」「规划 1 日游」
- [ ] 聊到景点时：使用后端 `actions` 字段驱动
- [ ] 点击发送对应消息

**产出文件：**

```
frontend/src/
  components/Chat/
    SmartQuickBar.tsx        # 新建：智能快捷指令
  __tests__/
    SmartQuickBar.test.tsx   # 单元测试
```

***

#### `A-010` 对话历史侧边栏

> 左侧侧边栏保留历史对话，点击历史问题数字人重新讲解

- **前置任务**：`A-007`
- **负责人**：Person A
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建对话历史组件 — `frontend/src/components/Chat/ChatHistory.tsx`
- [ ] 左侧侧边栏保留历史对话
- [ ] 点击历史问题，数字人重新讲解
- [ ] 触发自定义事件 `history:click`（Person B 的 DigitalHuman 响应）

**产出文件：**

```
frontend/src/
  components/Chat/
    ChatHistory.tsx          # 新建：对话历史
  __tests__/
    ChatHistory.test.tsx     # 单元测试
```

***

#### `A-011` 模块 A · 单元测试

> 为对话引擎全部前后端编写测试

- **前置任务**：`A-001` \~ `A-010`
- **负责人**：Person A
- **状态**：🔴 未开始
- **产出位置**：`backend/tests/` + `frontend/src/__tests__/`

**测试内容：**

| #  | 测试项                      | 测试场景                | 预期结果              |
| -- | ------------------------ | ------------------- | ----------------- |
| 1  | 结构化输出 — 正常 JSON          | 输入合法 JSON           | 原样返回              |
| 2  | 结构化输出 — 缺字段              | `{"text":"回答"}`     | 补全默认值             |
| 3  | 结构化输出 — 非法 emotion       | `"emotion":"happy"` | 修正为 "neutral"     |
| 4  | 结构化输出 — 纯文本降级            | `"普通回答"`            | 包装为 ChatResponse  |
| 5  | 结构化输出 — 重试机制             | 连续 2 次无效 JSON       | 第 3 次或兜底          |
| 6  | 语义缓存 — 精确命中              | "门票多少钱" (已缓存)       | 返回缓存, cached=true |
| 7  | 语义缓存 — 语义命中              | "票价是多少" (相似)        | 返回缓存, 余弦 > 0.9    |
| 8  | 语义缓存 — 未命中               | "附近有餐厅吗"            | 返回 null, 走 RAG    |
| 9  | 语义缓存 — Redis 不可用         | 连接失败                | 降级不报错             |
| 10 | 熔断器 — 正常                 | 主模型正常               | 返回主模型结果           |
| 11 | 熔断器 — 超时降级               | 主模型 10s 超时          | 切换备用模型            |
| 12 | 熔断器 — 熔断触发               | 连续 3 次失败            | 熔断 30s            |
| 13 | 熔断器 — 熔断恢复               | 30s 后               | 允许尝试主模型           |
| 14 | RAG — 按类型分块              | 景点文档                | chunks 带 category |
| 15 | RAG — 按类型检索              | "门票价格"              | 只返回 ticket 类型     |
| 16 | Function Call — 天气       | "今天会下雨吗"            | 调用 query\_weather |
| 17 | Function Call — 超时       | 工具 5s 无响应           | 跳过, 直接回答          |
| 18 | Function Call — 缓存       | 重复查询                | 返回缓存结果            |
| 19 | 上下文 — 新会话                | session 不存在         | 空上下文              |
| 20 | 上下文 — 多轮                 | 连续 5 轮              | 携带最近 5 轮          |
| 21 | 上下文 — 用户偏好               | "我是老人"              | 记住身份              |
| 22 | 前端 — responseParser      | 完整 JSON             | 正确解析              |
| 23 | 前端 — StructuredResponse  | 有 entities          | 渲染卡片              |
| 24 | 前端 — EntityHighlight     | 有实体                 | 高亮 + 点击事件         |
| 25 | 前端 — SmartQuickBar       | 初始状态                | 显示默认按钮            |
| 26 | 联调 — ChatResponse Schema | 后端输出                | 符合 Schema         |
| 27 | 联调 — emotion 字段          | 后端设置                | 前端正确接收            |
| 28 | 联调 — entity:click        | 前端触发                | 事件正确传递            |

**产出文件：**

```
backend/tests/
  test_structured_output.py
  test_semantic_cache.py
  test_circuit_breaker.py
  test_rag_enhanced.py
  test_tool_executor.py
  test_context_manager.py
  test_integration_chat_response.py
frontend/src/__tests__/
  responseParser.test.ts
  StructuredResponse.test.tsx
  EntityHighlight.test.tsx
  SmartQuickBar.test.tsx
  ChatHistory.test.tsx
```

***

### 模块 B · 数字人体验（Person B 负责，前后端）

> 📌 负责人：**Person B（独立完成）**
> 目标：TTS 流式 + 音素时间戳 + 多语音 + 离线包 + 表情系统 + 唇形同步 + 悬浮助手 + 语音交互 + 离线模式 + 多形象

***

#### `B-001` TTS 流式返回与缓存

> 后端不等完整音频，边生成边转发，同一回答只生成一次

- **前置任务**：无
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] TTS 流式返回：不等完整音频，边生成边转发 — `backend/app/core/tts.py`
- [ ] 音频缓存：同一回答只生成一次，存 MinIO/OSS — `backend/app/core/tts.py`
- [ ] 新建 TTS API 接口 — `backend/app/api/tts.py`
- [ ] `/api/tts/stream` 流式接口 + `/api/tts/cache` 缓存接口

**产出文件：**

```
backend/app/
  core/
    tts.py                   # 修改：流式 + 缓存
  api/
    tts.py                   # 新建：TTS API
  tests/
    test_tts_streaming.py    # 单元测试
```

***

#### `B-002` 音素时间戳（唇形同步数据）

> 调用 TTS 时获取音素时间戳，前端不用自己解析频谱

- **前置任务**：`B-001`
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 调用 TTS 时获取音素时间戳 — `backend/app/core/tts.py`
- [ ] 返回 `Phoneme[]` 数组（char, start\_ms, end\_ms, mouth\_shape）
- [ ] Person A 的 `ChatResponse.tts.phonemes` 字段填充

**产出文件：**

```
backend/app/
  core/
    tts.py                   # 修改：添加音素提取
  tests/
    test_phoneme_timestamp.py # 单元测试
```

***

#### `B-003` 多语音/方言封装

> 统一封装不同 TTS 接口，前端只传 voice 参数

- **前置任务**：`B-001`
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 统一封装不同 TTS 接口 — `backend/app/core/tts.py`
- [ ] 参数：`voice: "mandarin" | "nanjinghua" | "sichuanhua"`
- [ ] 方言用免费地方语音模型

**产出文件：**

```
backend/app/
  core/
    tts.py                   # 修改：多方言支持
```

***

#### `B-004` 离线包生成

> 后端生成 100MB 以内的离线压缩包，包含 Top50 问答 + 音频

- **前置任务**：`B-001`
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建离线包 API — `backend/app/api/offline.py`
- [ ] `/api/offline/package` 接口
- [ ] 打包 Top50 问答文字 + 音频 + 景点信息 + 缩略图
- [ ] 支持增量更新
- [ ] 新建离线包生成脚本 — `backend/scripts/generate_offline.py`

**产出文件：**

```
backend/app/
  api/
    offline.py               # 新建：离线包 API
  scripts/
    generate_offline.py      # 新建：离线包生成
  tests/
    test_offline_package.py  # 单元测试
```

***

#### `B-005` 数字人表情系统

> 优先使用后端 emotion 字段驱动，5 种表情 + 过渡动画

- **前置任务**：无
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 修改 EmotionController 优先使用 `ChatResponse.emotion` — `frontend/src/components/DigitalHuman/EmotionController.tsx`
- [ ] 5 种表情切换 + 300ms 渐变动画
- [ ] 修改 DigitalHuman 接收 emotion prop — `frontend/src/components/DigitalHuman/DigitalHuman.tsx`

**产出文件：**

```
frontend/src/
  components/DigitalHuman/
    EmotionController.tsx    # 修改：优先使用后端 emotion
    DigitalHuman.tsx         # 修改：接收 emotion prop
  __tests__/
    EmotionController.test.tsx # 单元测试
```

***

#### `B-006` 唇形同步增强

> 优先使用 phonemes，降级到 WebAudio 频谱分析

- **前置任务**：`B-002`
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 修改 LipSync 优先使用 `ChatResponse.tts.phonemes` — `frontend/src/components/DigitalHuman/LipSync.tsx`
- [ ] 降级方案：WebAudio 频谱分析 → 3 级嘴型（闭嘴/半开/全开）
- [ ] 配合头部轻微左右晃动
- [ ] 修改 AudioSync 流式音频播放 — `frontend/src/components/DigitalHuman/AudioSync.tsx`

**产出文件：**

```
frontend/src/
  components/DigitalHuman/
    LipSync.tsx              # 修改：优先使用 phonemes
    AudioSync.tsx            # 修改：流式音频播放
  __tests__/
    LipSync.test.tsx         # 单元测试
```

***

#### `B-007` 全局悬浮数字人助手

> 可拖拽悬浮球，所有页面可用，Ctrl+K 唤醒

- **前置任务**：无
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建悬浮助手组件 — `frontend/src/components/DigitalHuman/FloatingAssistant.tsx`
- [ ] 可拖拽悬浮球，所有页面可用
- [ ] 状态：缩小头像 → 点击展开对话面板 → 再次收起
- [ ] 新消息时头像跳动动画
- [ ] 快捷键 `Ctrl+K` 唤醒
- [ ] 接收 Person A 的 `ChatResponse` 驱动表情和播报
- [ ] 监听 `entity:click` 事件触发展开
- [ ] 修改 App.tsx 全局挂载 — `frontend/src/App.tsx`

**产出文件：**

```
frontend/src/
  components/DigitalHuman/
    FloatingAssistant.tsx    # 新建：悬浮助手
  App.tsx                    # 修改：全局挂载
  __tests__/
    FloatingAssistant.test.tsx # 单元测试
```

***

#### `B-008` 语音交互优化

> 实时转写 + 语速调节 + 打断支持

- **前置任务**：无
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 修改 VoiceInput 实时语音转写显示 — `frontend/src/components/DigitalHuman/VoiceInput.tsx`
- [ ] 语速调节（0.5x-2x）、音量调节
- [ ] 用户说话时自动暂停数字人播报 + 发送 interrupt
- [ ] 偏好保存到 localStorage

**产出文件：**

```
frontend/src/
  components/DigitalHuman/
    VoiceInput.tsx           # 修改：实时转写 + 语速调节
  __tests__/
    VoiceInput.test.tsx      # 单元测试
```

***

#### `B-009` 离线可用模式

> IndexedDB 缓存 Top50 问答，网络断开自动切换

- **前置任务**：`B-004`
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建离线缓存服务 — `frontend/src/services/offlineCache.ts`
- [ ] IndexedDB 缓存 Top50 问答 + 音频
- [ ] 网络检测 + 自动切换离线模式
- [ ] 离线时数字人提示 "当前网络不佳，已加载离线导览"
- [ ] 网络恢复自动切回在线模式

**产出文件：**

```
frontend/src/
  services/
    offlineCache.ts          # 新建：离线缓存
  __tests__/
    offlineCache.test.ts     # 单元测试
```

***

#### `B-010` 多形象/多方言切换

> 方言导览 + 数字人皮肤切换 + 儿童模式

- **前置任务**：`B-003`
- **负责人**：Person B
- **状态**：🔴 未开始

**开发内容：**

- [ ] 新建语音选择器 — `frontend/src/components/Settings/VoiceSelector.tsx`
- [ ] 新建形象选择器 — `frontend/src/components/Settings/AvatarSelector.tsx`
- [ ] 方言切换下拉菜单 → 调用 Person B 后端 TTS 接口
- [ ] 数字人皮肤切换（古风/现代/卡通）
- [ ] 偏好保存到 localStorage

**产出文件：**

```
frontend/src/
  components/Settings/
    VoiceSelector.tsx        # 新建：语音选择
    AvatarSelector.tsx       # 新建：形象选择
  __tests__/
    VoiceSelector.test.tsx   # 单元测试
    AvatarSelector.test.tsx
```

***

#### `B-011` 模块 B · 单元测试

> 为数字人体验全部前后端编写测试

- **前置任务**：`B-001` \~ `B-010`
- **负责人**：Person B
- **状态**：🔴 未开始
- **产出位置**：`backend/tests/` + `frontend/src/__tests__/`

**测试内容：**

| #  | 测试项                 | 测试场景            | 预期结果                   |
| -- | ------------------- | --------------- | ---------------------- |
| 1  | TTS 流式生成            | 输入文本            | 返回音频流块                 |
| 2  | TTS 缓存命中            | 相同文本            | 返回 URL, 不重新生成          |
| 3  | TTS 缓存写入            | 新文本             | 生成 + 存储 + 返回 URL       |
| 4  | TTS 服务不可用           | 接口超时            | 返回空 TTSInfo            |
| 5  | 音素生成                | "你好"            | Phoneme\[] 含 2 元素      |
| 6  | 音素时间连续              | 多个音素            | start\_ms 和 end\_ms 连续 |
| 7  | mouth\_shape 有效     | 每个音素            | "closed"/"half"/"open" |
| 8  | 离线包生成               | 调用接口            | 返回压缩包                  |
| 9  | 离线包增量               | 已有包             | 只更新变化内容                |
| 10 | 表情 — smile          | emotion="smile" | 切换微笑表情                 |
| 11 | 表情 — think          | emotion="think" | 切换思考表情                 |
| 12 | 表情过渡                | 连续不同 emotion    | 300ms 渐变               |
| 13 | 唇形 — phonemes 有数据   | Phoneme\[]      | 按时间戳驱动嘴型               |
| 14 | 唇形 — phonemes 无数据   | 空数组             | 降级到频谱分析                |
| 15 | 唇形 — 播放中断           | 用户打断            | 立即停止唇形                 |
| 16 | 悬浮球 — 初始状态          | 页面加载            | 显示缩小悬浮球                |
| 17 | 悬浮球 — 点击展开          | 点击              | 展开对话面板                 |
| 18 | 悬浮球 — Ctrl+K        | 按快捷键            | 切换展开/收起                |
| 19 | 悬浮球 — 新消息           | 收到响应            | 跳动动画                   |
| 20 | 语音 — 实时转写           | 用户说话            | 输入框显示文字                |
| 21 | 语音 — 打断             | 用户说话            | 暂停播报 + interrupt       |
| 22 | 离线 — 网络断开           | onLine=false    | 自动切换离线                 |
| 23 | 离线 — 命中             | "门票多少钱"         | 返回缓存                   |
| 24 | 离线 — 未命中            | 未知问题            | 提示 "网络不佳"              |
| 25 | 联调 — tts.phonemes   | 后端生成            | 前端 LipSync 消费          |
| 26 | 联调 — tts.audio\_url | 后端缓存            | 前端 AudioSync 消费        |
| 27 | 联调 — entity:click   | Person A 触发     | FloatingAssistant 监听   |
| 28 | 联调 — emotion 字段     | Person A 设置     | EmotionController 消费   |

**产出文件：**

```
backend/tests/
  test_tts_streaming.py
  test_phoneme_timestamp.py
  test_offline_package.py
frontend/src/__tests__/
  EmotionController.test.tsx
  LipSync.test.tsx
  FloatingAssistant.test.tsx
  VoiceInput.test.tsx
  offlineCache.test.ts
  VoiceSelector.test.tsx
  AvatarSelector.test.tsx
```

***

## 四、测试计划总览

### 4.1 单元测试分布

| 模块        | 负责人      | 测试用例数    | 产出位置                      |
| --------- | -------- | -------- | ------------------------- |
| 对话引擎后端（A） | Person A | \~20     | `backend/tests/`          |
| 对话引擎前端（A） | Person A | \~8      | `frontend/src/__tests__/` |
| 数字人后端（B）  | Person B | \~10     | `backend/tests/`          |
| 数字人前端（B）  | Person B | \~18     | `frontend/src/__tests__/` |
| **合计**    | —        | **\~56** | —                         |

### 4.2 联调测试

| 联调点               | Person A (提供) | Person B (消费)        | 联调时机          |
| ----------------- | ------------- | -------------------- | ------------- |
| ChatResponse JSON | 后端输出          | 前端渲染表情/唇形            | Week 1 Day 3  |
| emotion 字段        | 后端设置          | 前端 EmotionController | Week 1 Day 3  |
| tts.phonemes      | 后端生成          | 前端 LipSync           | Week 1 Day 5  |
| tts.audio\_url    | 后端缓存          | 前端 AudioSync         | Week 1 Day 5  |
| entity:click 事件   | 前端触发          | 前端 FloatingAssistant | Week 2 Day 8  |
| history:click 事件  | 前端触发          | 前端 DigitalHuman      | Week 2 Day 10 |

***

## 五、任务依赖图

```
模块 A · 对话引擎（Person A 独立, Week 1-2）
├── A-001 结构化输出 ──┐
├── A-002 降级熔断     │
│                      ├── A-003 语义缓存
│                      ├── A-005 Function Call
├── A-004 RAG 增强     │
├── A-006 上下文管理   │
│                      │
│                      ├── A-007 聊天页重构 + 结构化渲染
│                      │   ├── A-008 实体跳转
│                      │   ├── A-009 快捷指令
│                      │   └── A-010 对话历史
│                      │
│                      └── A-011 模块A测试

模块 B · 数字人体验（Person B 独立, Week 1-2）
├── B-001 TTS 流式 ────┐
│                      ├── B-002 音素时间戳
│                      ├── B-003 多语音封装
│                      │   └── B-010 多形象切换
│                      └── B-004 离线包生成
│                          └── B-009 离线模式
│
├── B-005 表情系统
├── B-006 唇形同步 (依赖 B-002)
├── B-007 悬浮助手
├── B-008 语音交互
│
└── B-011 模块B测试
```

***

## 六、执行顺序总览

| 角色           | 任务编号  | 任务名                | 周期             |
| ------------ | ----- | ------------------ | -------------- |
| **Person A** | A-001 | 结构化输出强制校验          | Week 1 Day 1-2 |
| **Person A** | A-002 | 多级降级与熔断            | Week 1 Day 1-2 |
| **Person A** | A-003 | 语义缓存               | Week 1 Day 3-4 |
| **Person A** | A-004 | RAG 知识库增强          | Week 1 Day 3-4 |
| **Person A** | A-005 | Function Call 工具调用 | Week 1 Day 5   |
| **Person A** | A-006 | 用户上下文管理            | Week 1 Day 5   |
| **Person A** | A-007 | 聊天页重构 + 结构化渲染      | Week 2 Day 6-7 |
| **Person A** | A-008 | 实体关键词跳转            | Week 2 Day 8   |
| **Person A** | A-009 | 智能快捷指令栏            | Week 2 Day 8   |
| **Person A** | A-010 | 对话历史侧边栏            | Week 2 Day 9   |
| **Person A** | A-011 | 模块 A 单元测试          | Week 2 Day 10  |
| **Person B** | B-001 | TTS 流式返回与缓存        | Week 1 Day 1-2 |
| **Person B** | B-005 | 数字人表情系统            | Week 1 Day 1-2 |
| **Person B** | B-002 | 音素时间戳              | Week 1 Day 3   |
| **Person B** | B-006 | 唇形同步增强             | Week 1 Day 3-4 |
| **Person B** | B-003 | 多语音/方言封装           | Week 1 Day 4   |
| **Person B** | B-007 | 全局悬浮助手             | Week 1 Day 5   |
| **Person B** | B-008 | 语音交互优化             | Week 1 Day 5   |
| **Person B** | B-004 | 离线包生成              | Week 2 Day 6-7 |
| **Person B** | B-009 | 离线可用模式             | Week 2 Day 8   |
| **Person B** | B-010 | 多形象/多方言切换          | Week 2 Day 9   |
| **Person B** | B-011 | 模块 B 单元测试          | Week 2 Day 10  |

**关键设计：两个模块完全独立，各自开发 + 各自测试，无交叉依赖。联调仅做接口对接验证，不改代码。**

***

## 七、API 端点总览

### Person A 产出

| 模块 | 端点                 | 方法         | 说明                    |
| -- | ------------------ | ---------- | --------------------- |
| 对话 | `/api/chat/stream` | POST (SSE) | 流式对话（返回 ChatResponse） |
| 对话 | `/api/chat/stream` | POST       | 结构化输出 + 语义缓存 + 降级     |

### Person B 产出

| 模块  | 端点                     | 方法         | 说明       |
| --- | ---------------------- | ---------- | -------- |
| TTS | `/api/tts/stream`      | POST (SSE) | TTS 流式返回 |
| TTS | `/api/tts/cache`       | POST       | TTS 缓存查询 |
| 离线  | `/api/offline/package` | GET        | 离线包下载    |

***

## 八、评分项对照

| 评分项     | 满分      | 对应实现                                  |
| ------- | ------- | ------------------------------------- |
| 大模型响应速度 | 20      | 语义缓存 (100ms) + 流式输出 (首 token < 500ms) |
| 输出稳定性   | 15      | 结构化输出强制校验 + 重试 + 兜底                   |
| 数字人表现力  | 20      | 表情系统 + 唇形同步 + 悬浮助手                    |
| 业务联动    | 15      | 实体高亮 + 操作按钮 + Function Call           |
| 用户体验    | 15      | 快捷指令 + 打断支持 + 离线模式                    |
| 系统稳定性   | 15      | 多级降级 + 熔断 + 离线降级                      |
| **合计**  | **100** | <br />                                |

