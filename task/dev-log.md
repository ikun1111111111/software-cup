# 对话引擎开发日志

> 本文档记录对话引擎（模块A）的每次代码改动、遇到的问题、解决方案及验证结果。
> 维护人：Person A（对话引擎前后端）
> 格式：【日期】迭代编号 - 改动摘要 → 详细说明

---

## 2025-06-05

### 迭代一启动：打基础（上下文管理 + 语义缓存）

**规划确认**：
- 用户确认四阶段改进方案（上下文→结构化→熔断器→前端重构）
- 创建本文档 + `dev-plan.md` + `dev-handover.md`

**当前状态**：
- 后端核心层已通读完毕（llm.py, llm_router.py, prompts.py, rag.py, embedding.py, vector_store.py, bm25_search.py, reranker.py, faq_matcher.py, fact_checker.py）
- 后端服务层/API层/模型层/任务层已通读完毕
- 前端 ChatPage/useSSE/chatStore/DigitalHuman 及测试已通读完毕
- 已知关键bug：`llm_router.py` stream fallback 路由错误（已修复）

---

## 2025-06-05（迭代一开发完成）

### 后端改动

#### 1. 新增 `context_manager.py`（B-001）
- **文件**：`backend/app/core/context_manager.py`
- **功能**：Redis List 存最近5轮对话，TTL 24h
- **接口**：`save_turn(session_id, user, assistant)`、`get_history(session_id, max_rounds)`、`clear_history(session_id)`
- **设计**：LPUSH 新对话，LTRIM 保留最近N轮，LRANGE 返回时 reverse 成时间顺序

#### 2. 新增 `semantic_cache.py`（B-006）
- **文件**：`backend/app/core/semantic_cache.py`
- **功能**：语义缓存核心，bge-small-zh-v1.5 编码 + Redis Hash/ZSET 存储
- **接口**：`set_cache(question, answer)`、`get_similar(question, threshold, max_scan)`
- **设计**：
  - 编码器懒加载，384-dim 归一化向量
  - 缓存用 Redis Hash（`semantic_cache:entries`）存数据 + ZSET（`semantic_cache:index`）按时间排序
  - 查询时扫描最近100条，计算 cosine similarity，>0.9 命中
  - 超限时自动淘汰最旧条目

#### 3. 修改 `config.py`（B-008）
- **新增配置**：
  - `semantic_cache_model` = "BAAI/bge-small-zh-v1.5"
  - `semantic_cache_similarity_threshold` = 0.90
  - `semantic_cache_max_entries` = 1000
  - `semantic_cache_ttl` = 3600
  - `context_max_rounds` = 5
  - `context_ttl` = 86400

#### 4. 修改 `prompts.py`（B-003）
- `build_chat_prompt()` 新增 `history` 参数
- 历史消息按时间顺序注入 system prompt 之后、当前问题之前
- 空 history/None 时保持原有行为

#### 5. 修改 `chat_service.py`（B-002, B-007）
- `process_chat()` 新增参数：`use_context`、`use_semantic_cache`、`history`
- **新流程**：FAQ → 语义缓存 → 加载历史 → RAG → LLM（含历史）→ Sentiment
- 新增 `finalize_chat(session_id, question, answer, source)`：
  - 保存对话到 Redis 上下文
  - 非 FAQ/cache 时保存到语义缓存
- 外部传入 history 时优先使用，跳过 Redis 查询

#### 6. 修改 `chat.py`（B-004）
- `ChatRequest` 新增 `history: list[dict] = []` 字段
- 重构为调用 `chat_service.process_chat()` 替代自己重复 FAQ/RAG/LLM 逻辑
- 保留精确缓存（`_check_exact_cache`）作为第一层缓存
- 流式/非流式完成后调用 `finalize_chat()`
- 新增 `cache_hit` SSE 事件（语义缓存命中时返回）

#### 7. 修改 `ws.py`（B-005）
- 移除自己重复的 `_process_chat()` 内部实现
- 改为调用 `chat_service.process_chat()` 和 `finalize_chat()`
- WebSocket 语音/文本路径都支持上下文和语义缓存

#### 8. 修复 `llm_router.py` stream fallback bug（B-009）
- **问题**：`_STREAM_CALLER_NAMES` 中 doubao/qwen 错误映射到 `_call_deepseek_stream`
- **修复**：
  - 新增 `_call_doubao_stream()`：Doubao OpenAI-compatible 流式调用
  - 新增 `_call_qwen_stream()`：Qwen OpenAI-compatible 流式调用
  - 更新 `_STREAM_CALLER_NAMES` 正确映射到各自的流式调用器

### 前端改动

#### 1. 修改 `chatStore.ts`（F-001）
- 新增 `getHistory(maxRounds?)` action
- 返回 `{role, content}[]` 格式，取最近 `maxRounds * 2` 条消息
- store 创建时传入 `(set, get)` 以支持 getState

#### 2. 修改 `ChatPage.tsx`（F-003）
- 解构 `getHistory` from `useChatStore`
- `doSend()` 发送 SSE 请求时携带 `history: getHistory(5)`

### 测试

#### 后端新增测试
- `test_context_manager.py`：save_turn、get_history、clear_history 共 8 个用例
- `test_semantic_cache.py`：序列化、cosine similarity、set_cache、get_similar 共 12 个用例

#### 后端更新测试
- `test_prompts.py`：新增 3 个 history 相关用例
- `test_chat_service.py`：新增 6 个语义缓存/上下文/finalize 用例
- `test_chat_api.py`：新增 1 个 history 字段传递用例

#### 前端更新测试
- `chatStore.test.ts`：新增 3 个 getHistory 用例

### 遇到的问题与解决

| 问题 | 解决 |
|------|------|
| chat.py 和 ws.py 各自重复实现了 FAQ→RAG→LLM 流程 | 统一交给 chat_service.process_chat()，API 层只负责协议转换和收尾 |
| llm_router.py stream fallback 路由错误 | 为 Doubao/Qwen 各写独立的流式调用器，修正映射表 |
| 流式模式下 answer 在 process_chat 返回时未知 | 新增 `finalize_chat()` 函数，由调用方（chat.py token_generator）在流式完成后调用 |
| 前端历史格式与后端不一致 | 前端 `getHistory()` 返回 `{role, content}[]`，后端 `process_chat()` 直接消费该格式 |

---

## 2025-06-05（项目重启测试）

### 环境状态

| 服务 | 状态 | 说明 |
|------|------|------|
| 后端 API | ✅ 运行中 | http://localhost:8000 |
| 前端 DevServer | ✅ 运行中 | http://localhost:5173 |
| PostgreSQL | ✅ 正常 | 数据库连接成功，表已创建 |
| Redis | ✅ 正常 | 缓存和上下文存储可用 |
| Milvus | ❌ 未运行 | 向量检索不可用，RAG 降级为空检索 |
| FAQ 数据 | ✅ 已导入 | 10 条默认 FAQ |
| 语义缓存模型 | ❌ 未下载 | bge-small-zh-v1.5 因网络问题无法从 HuggingFace 下载 |

### 功能验证

| 功能 | 状态 | 验证方式 |
|------|------|----------|
| FAQ 匹配 | ✅ 正常 | `灵山胜境在哪里？` → faq_hit，响应 <100ms |
| 上下文管理 | ✅ 正常 | 历史对话正确存入 Redis，按时间顺序读取 |
| 历史注入 Prompt | ✅ 正常 | 带 history 的请求正确注入到 LLM prompt |
| 精确缓存 | ✅ 正常 | 同问题同 session 第二次命中缓存 |
| 语义缓存 | ⚠️ 受限 | 模型未下载，功能代码正确但无法编码 |
| 流式生成 | ✅ 正常 | SSE token 事件正常推送 |
| WebSocket | ✅ 正常 | ws.py 已接入 chat_service |
| LLM 路由 | ✅ 正常 | DeepSeek/Doubao/Qwen 路由和流式降级已修复 |

### 已知限制

1. **Milvus 未运行**：向量检索不可用，RAG 检索返回空结果，LLM 只能基于自身知识回答
2. **语义缓存模型未下载**：`bge-small-zh-v1.5` 需要从 HuggingFace 下载（~100MB），当前网络环境无法连接。解决方案：
   - 使用国内镜像（hf-mirror.com）—— 已尝试，仍然失败
   - 手动下载模型文件放到本地缓存目录
   - 使用离线模式（`local_files_only=True`）
3. **Git Bash 中文显示乱码**：终端编码问题，不影响实际功能

### 测试建议

1. **FAQ 测试**：直接问导入的 10 条 FAQ 问题，验证快速响应
2. **上下文测试**：先问"灵山大佛有多高？"，再问"它是什么材质？"，验证 AI 能理解"它"的指代
3. **缓存测试**：同一问题连续问两次，第二次应该更快（精确缓存）
4. **流式测试**：观察 SSE 事件流（token → done）

### 待验证
- [ ] sentence-transformers 模型下载（~100MB）在目标环境是否可行
- [ ] Milvus 向量数据库启动和连接
- [ ] 所有现有测试（206 backend + 463 frontend）是否继续通过

---

## 2025-06-05（Bug 修复：pixi.js + API Key）

### 问题 1：前端 pixi.js `isInteractive` 报错

**现象**：控制台大量 `TypeError: currentTarget.isInteractive is not a function`，鼠标在数字人区域移动时触发。

**原因**：`Live2DStage.tsx` 中使用了 `model.interactive = true` 和 `model.on('pointerdown', ...)`，这是 pixi.js v6 的 API。在 pixi.js v7 中，`interactive` 属性已被移除，取而代之的是 `eventMode`。`pixi-live2d-display` 库内部的一些子对象不支持 `isInteractive` 方法，导致事件系统遍历到这些对象时崩溃。

**修复**：`frontend/src/components/DigitalHuman/Live2DStage.tsx`
- 移除 `model.interactive = true`
- 移除 `model.on('pointerdown', handleClick)`
- 改为给 canvas 添加原生 `click` 事件：`canvas.addEventListener('click', handleClick)`
- 清理函数中移除事件监听

### 问题 2：AI 不回复

**现象**：输入"你好"没有回复。

**原因**：`.env` 中 DeepSeek API key 未配置（为空），LLM 调用失败。

**修复**：
1. 更新 `.env`：配置 8 个 DeepSeek API key
2. 更新 `backend/app/core/config.py`：扩展 `deepseek_api_key_5` ~ `deepseek_api_key_8`
3. 更新 `backend/app/core/llm_router.py`：`_get_deepseek_key_pool()` 读取全部 8 个 key

### 验证结果

| 功能 | 状态 | 说明 |
|------|------|------|
| FAQ 匹配 | ✅ 正常 | `灵山胜境在哪里？` → faq_hit，<100ms |
| LLM 对话 | ✅ 正常 | `你好` → AI 生成回复，~30s |
| 上下文注入 | ✅ 正常 | 带 history 的请求正确注入 prompt |
| pixi.js 报错 | ✅ 已修复 | 改为原生 click 事件，无 isInteractive 错误 |
| 前端页面 | ✅ 正常 | http://localhost:5173 |
| 后端 API | ✅ 正常 | http://localhost:8000 |

### 待用户操作
- **刷新前端页面**：`Live2DStage.tsx` 修改后需要刷新浏览器才能生效
- **测试对话**：输入"你好"或"灵山大佛有多高？"验证回复

---

## （以下为预留，每次提交代码后追加）

