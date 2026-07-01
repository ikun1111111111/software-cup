# 后端开发日志

## 2026-06-02 23:07 — Phase 0 上下文装载

**变更文件**：无（只读）

**完成内容**：
- 读取项目计划书（1066 行），明确队员1（后端）全部任务
- 扫描 backend/frontend 目录结构
- 读取核心文件：config.py, database.py, rag.py, llm.py, chat_service.py, knowledge_service.py, models/*.py
- 读取全部测试文件

**发现的关键缺口**：
1. `process_document()` 只写 PostgreSQL，没有写 Milvus（RAG 检索永远查不到数据）
2. `rag.py` 中 BM25 索引是全局内存变量，服务重启即丢失
3. `chat_service.py` 中 FAQ 匹配逻辑未独立，LLM 调用缺少路由/降级
4. `api/` 目录为空，所有业务路由未挂载
5. 前端是空壳，只有占位页面

---

## 2026-06-02 23:10 — API Key 配置

**变更文件**：
- `backend/.env` — 新增 4 个 DeepSeek API key
- `backend/.env` — 补充数据库/Redis/Milvus/MinIO 连接配置
- `.env` — 项目级环境变量（供 docker-compose 使用）
- `backend/app/core/config.py` — 新增 `deepseek_api_key_1~4` 配置字段

**遇到的问题**：无

---

## 2026-06-02 23:12 — Phase 2 方案规划

**变更文件**：
- `docs/plan-phase1-rag-llm.md` — Phase 1 规划文档
- `docs/log-backend.md` — 后端开发日志（本文档）

**当前状态**：✅ 用户已确认，进入 Phase 3

---

## 2026-06-02 23:15 — Phase 3 代码落地（Step 1：5 个核心模块）

**变更文件**（新增）：
- `app/core/embedding.py` — BGE-M3 向量化封装（懒加载 + 批量编码）
- `app/core/vector_store.py` — Milvus 向量存储（插入/搜索/删除）
- `app/core/bm25_search.py` — BM25 关键词检索（jieba + rank-bm25，支持增量更新）
- `app/core/reranker.py` — BGE-Reranker 重排序封装
- `app/core/faq_matcher.py` — FAQ 精确/模糊匹配（从 chat_service 独立）

**遇到的问题**：无

---

## 2026-06-02 23:18 — Phase 3 代码落地（Step 2：LLM 路由 + 事实校验）

**变更文件**（新增）：
- `app/core/llm_router.py` — LLM 统一路由（5 种任务类型）+ DeepSeek 4 key 轮询 + 自动降级
- `app/core/fact_checker.py` — 事实校验（豆包交叉验证）

**遇到的问题**：无

---

## 2026-06-02 23:20 — Phase 3 代码落地（Step 3：修改现有文件）

**变更文件**（修改）：
- `app/core/rag.py` — 接入 embedding/vector_store/bm25_search/reranker，精简为编排层
- `app/services/knowledge_service.py` — `process_document()` 补全向量入库 Milvus + BM25 增量更新
- `app/services/chat_service.py` — 引入 `faq_matcher.search_faq` + `llm_router.route/route_stream`
- `app/core/llm.py` — 补充 `chat_qwen_long()` 长文总结封装
- `app/main.py` — 启动时重建 BM25 索引 + Milvus collection 初始化

**关键修复**：
1. 向量入库流程打通：`process_document()` 现在会生成 embedding 写入 Milvus，并更新 PG 的 `embedding_id`
2. BM25 持久化：服务启动时从 PostgreSQL 全量重建，增量文档自动更新
3. FAQ 解耦：匹配逻辑从 chat_service 迁移到独立的 faq_matcher 模块

---

## 2026-06-02 23:22 — Phase 3 完成

**当前状态**：✅ Phase 3 代码落地完成

---

## 2026-06-02 23:25 — Phase 4 自动化测试

**新增测试文件**：
- `tests/test_embedding.py` — 8 个用例（初始化、编码、空输入、单例）
- `tests/test_bm25_search.py` — 6 个用例（构建、搜索、增量、清空、单例）
- `tests/test_rag.py` — 9 个用例（RRF融合、混合搜索、降级、rerank、完整管线）
- `tests/test_llm_router.py` — 9 个用例（key轮换、路由、降级、流式）
- `tests/test_fact_checker.py` — 5 个用例（一致/不一致/不确定/空上下文/服务失败）

**测试结果**：
- 新测试：39 passed, 0 failed
- 回归测试：29 passed, 1 failed（test_parse_pdf_file — pymupdf 未安装，已有问题）

**测试中发现并修复的代码问题**：
1. `llm_router.py`：`_call_deepseek` 同时包含 `yield` 和 `return value`，拆分为 `_call_deepseek_sync` 和 `_call_deepseek_stream`
2. `llm_router.py`：`_CALLERS` 静态字典导致 mock 不生效，改为 `_CALLER_NAMES` 运行时动态解析
3. `llm_router.py`：`qwen_vl` 参数传递问题（kwargs 中 image_url 重复），改为 `call_kwargs.pop()`
4. `llm_router.py`：`_key_index` 模块级全局变量导致测试间状态污染，改为函数属性
5. `embedding.py`：`_load_model()` 在过滤空字符串之前被调用，导致未安装模型时崩溃

---

## 2026-06-02 23:30 — Phase 5 联调验收 + Phase 6 Code Review

**验收检查项**：

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 代码逻辑正确性 | ✅ | RRF 融合、BM25 索引、向量入库流程已验证 |
| 错误处理完备 | ✅ | LLM 降级、Milvus 失败 fallback、空上下文跳过校验 |
| 安全漏洞 | ✅ | 无注入/XSS风险，API key 通过环境变量管理 |
| 未使用导入/变量 | ✅ | 已清理（rag.py 中去除了旧的内联函数）|
| 循环依赖 | ✅ | 无新增循环依赖 |
| 硬编码配置 | ✅ | 所有 key/URL 均从 settings 读取 |
| 向后兼容 | ✅ | `llm.py` 保持原有函数签名，`chat_service.py` 接口不变 |

**Review 结论**：Phase 1（A-001 + A-002）开发完成，代码质量合格，测试覆盖充分。

---

## 2026-06-02 23:40 — Phase 2（A-003 对话服务）完成

**变更文件**（新增）：
- `app/core/prompts.py` — System Prompt 模板统一管理（chat/verify/sentiment/summary）
- `app/api/chat.py` — SSE 流式对话接口 `/api/chat/stream`
  - Redis 热点缓存（TTL=5min）
  - FAQ 命中直接返回
  - RAG 检索后流式输出 token
  - 异步写入 interaction_logs
- `app/api/ws.py` — WebSocket 对话接口 `/ws/chat`
  - JSON 消息收发
  - FAQ → RAG → LLM 全链路
  - 异常处理和断开重连

**变更文件**（修改）：
- `app/main.py` — 挂载 chat router + ws router
- `app/services/chat_service.py` — 使用 `prompts.build_chat_prompt`
- `app/core/llm.py` — 修复 `chat_deepseek` 的 `yield`+`return` 语法错误，拆分为 `chat_deepseek_stream`

**新增测试**：
- `tests/test_prompts.py` — 6 个用例
- `tests/test_chat_api.py` — 6 个用例（校验/FAQ/缓存/RAG流式/非流式/失败降级）
- `tests/test_ws_api.py` — 5 个用例（FAQ/RAG/非法JSON/缺字段/LLM失败）

**全量回归**：77 passed, 0 failed

---

## 当前状态

| 任务 | 状态 | 说明 |
|------|------|------|
| A-001 RAG 知识库 | ✅ | 向量入库+混合检索+重排序 |
| A-002 LLM 多 API 路由 | ✅ | 4 key 轮询+自动降级 |
| A-003 对话服务 | ✅ | SSE + WebSocket 已暴露 |
## 2026-06-02 23:45 — Phase 3（A-006 知识库管理 API）完成

**变更文件**（新增）：
- `app/api/upload.py` — 文件上传接口，支持 pdf/docx/md/txt，保存到本地 `uploads/` 目录
- `app/api/knowledge.py` — 知识库完整 CRUD
  - 文档：列表/创建/详情/更新/删除/重新索引
  - FAQ：列表/创建/更新/软删除
  - 分页 + 状态/分类筛选

**变更文件**（修改）：
- `app/main.py` — 挂载 knowledge router + upload router

**新增测试**：
- `tests/test_upload_api.py` — 4 个用例（txt/pdf/不支持类型/空文件）
- `tests/test_knowledge_api.py` — 5 个用例通过 + 9 个 skip（需 PostgreSQL）

**全量回归**：82 passed, 9 skipped, 0 failed

---

## 当前状态

| 任务 | 状态 | 说明 |
|------|------|------|
| A-001 RAG 知识库 | ✅ | 向量入库+混合检索+重排序 |
| A-002 LLM 多 API 路由 | ✅ | 4 key 轮询+自动降级 |
| A-003 对话服务 | ✅ | SSE + WebSocket 已暴露 |
| A-006 知识库管理 API | ✅ | 文档/FAQ CRUD + 上传 |
| A-004 ASR + TTS | ⏳ | 语音链路 |
| A-005 推荐服务 | ⏳ | 游客画像+路线推荐 |
| A-007 分析+大屏 API | ⏳ | 管理端数据接口 |
