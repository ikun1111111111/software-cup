# 对话引擎开发规划文档

> 本文档记录对话引擎（模块A）的全部开发规划，按阶段拆分，每次迭代前更新计划，完成后标记状态。
> 维护人：Person A（对话引擎前后端）
> 关联文档：`PLAN.md`（总计划）、`dev-log.md`（开发日志）、`dev-handover.md`（对接文档）

---

## 当前迭代

### 迭代一：打基础（上下文管理 + 语义缓存）✅ 已完成

**目标**：让系统"记得住、反应快"，为后续所有功能奠基。

**后端任务**：

| 编号 | 任务 | 目标文件 | 状态 |
|------|------|----------|------|
| B-001 | 新增 `context_manager.py`：Redis存储最近5轮对话，TTL 24h | `backend/app/core/context_manager.py` | ✅ 已完成 |
| B-002 | 修改 `chat_service.py`：`process_chat()` 接收并注入历史上下文 | `backend/app/services/chat_service.py` | ✅ 已完成 |
| B-003 | 修改 `prompts.py`：`build_chat_prompt()` 支持传入历史消息 | `backend/app/core/prompts.py` | ✅ 已完成 |
| B-004 | 修改 `chat.py`：SSE端点接收 `history` 参数并透传 | `backend/app/api/chat.py` | ✅ 已完成 |
| B-005 | 修改 `ws.py`：WebSocket端点维护并传入历史上下文 | `backend/app/api/ws.py` | ✅ 已完成 |
| B-006 | 新增 `semantic_cache.py`：语义缓存核心（bge-small-zh-v1.5 + Redis） | `backend/app/core/semantic_cache.py` | ✅ 已完成 |
| B-007 | 修改 `chat_service.py`：FAQ之后、RAG之前插入语义缓存检查 | `backend/app/services/chat_service.py` | ✅ 已完成 |
| B-008 | 修改 `config.py`：新增语义缓存相关配置 | `backend/app/core/config.py` | ✅ 已完成 |
| B-009 | 修复 `llm_router.py` stream fallback bug | `backend/app/core/llm_router.py` | ✅ 已完成 |
| B-010 | 后端单元测试：上下文管理 + 语义缓存 | `backend/tests/` | ✅ 已完成 |

**前端任务**：

| 编号 | 任务 | 目标文件 | 状态 |
|------|------|----------|------|
| F-001 | 扩展 `chatStore.ts`：维护当前会话完整历史 | `frontend/src/stores/chatStore.ts` | ✅ 已完成 |
| F-002 | 修改 `useSSE.ts`：发送时携带历史上下文 | `frontend/src/hooks/useSSE.ts` | ✅ 无需修改（body 透传） |
| F-003 | 修改 `ChatPage.tsx`：发送消息时把历史塞入请求体 | `frontend/src/pages/tourist/ChatPage.tsx` | ✅ 已完成 |
| F-004 | 前端单元测试：chatStore历史管理 | `frontend/src/__tests__/chatStore.test.ts` | ✅ 已完成 |

**验收标准**：
1. ✅ 连续提问"灵山大佛有多高？"→"它是什么材质？"，系统能正确理解"它"指灵山大佛。
2. ✅ "灵山大佛有多高？"和"灵山大佛高度是多少？"共享缓存，第二次响应<<100ms。
3. ⏳ 所有现有测试（206 backend + 463 frontend）继续通过（需环境验证）。

---

## 历史迭代

（暂无）

---

## 待排期迭代

### 迭代二：提质量（结构化输出 + RAG增强）

**目标**：让AI回答有固定格式，数字人知道该做什么表情；检索更精准。

**后端任务**：
- 新增 `structured_output.py`：ChatResponse Pydantic模型 + retry_parse
- 修改 `prompts.py`：SYSTEM_PROMPT_CHAT 要求输出JSON
- 修改 `chat_service.py`：调用 structured_output 包装LLM输出
- 修改 `rag.py`：Query分类 + 分类过滤 + Query扩展
- 修改 `llm_router.py`：支持 `response_format={"type":"json_object"}`

**前端任务**：
- 修改 `ChatBubble.tsx`：支持渲染来源标签（faq/rag/cache）
- 修改 `ChatPage.tsx`：解析结构化响应中的 `emotion` 并传给 DigitalHuman
- 新增 `EntityHighlight.tsx`：实体关键词高亮组件

**对接点**：
- `ChatResponse.emotion` 字段需要 Person B 接收并驱动数字人表情（详见 `dev-handover.md`）

---

### 迭代三：保稳定（熔断器 + Function Call）

**目标**：AI挂了也能服务；能查实时信息。

**后端任务**：
- 新增 `circuit_breaker.py`：CircuitBreaker 类（CLOSED/OPEN/HALF_OPEN）
- 修改 `llm_router.py`：集成熔断器，OPEN时走本地降级
- 新增 `function_call.py`：工具定义 + 解析器 + 执行器
- 新增 `tools/`：天气、客流、设施、票务、路线工具实现
- 修改 `chat_service.py`：Function Call 主循环（LLM→需工具？→执行→再调用LLM）

**前端任务**：
- 新增 `ActionButtons.tsx`：渲染 `ChatResponse.actions` 中的按钮
- 修改 `ChatPage.tsx`：点击Action按钮触发对应路由/弹窗

**对接点**：
- Function Call 的"实时客流"需要景区数据接口（可能需外部API或模拟数据）

---

### 迭代四：优体验（前端重构）

**目标**：实体可点击、快捷问题智能、有历史侧边栏。

**前端任务**：
- 新增 `SessionSidebar.tsx`：对话历史侧边栏
- 新增 `sessionStore.ts`：会话列表管理
- 修改 `ChatPage.tsx`：集成侧边栏 + 响应式布局调整
- 修改 `ChatPage.tsx`：快捷问题栏根据上下文动态生成
- 新增 `QuickQuestions.tsx`：智能快捷问题组件

**后端任务**：
- 新增 API：`GET /api/chat/history?session_id=xxx`：查询某会话历史
- 新增 API：`GET /api/chat/sessions`：查询当前用户的会话列表

**对接点**：
- 实体跳转路由需要 Person B 确认景点详情页路径（如 `/spot/灵山大佛`）

---

## 附录：技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 语义编码器 | `bge-small-zh-v1.5` | 384-dim，比BGE-M3快10倍，足够做相似度匹配 |
| 上下文存储 | Redis List | 按 `session:{id}` 存，LPUSH/LTRIM/LRANGE 操作简单高效 |
| 熔断器状态 | Redis String + 过期时间 | 不需要持久化，重启后重新统计 |
| 结构化输出 | Pydantic + `json_object` mode | DeepSeek/Qwen 都支持强制JSON输出 |

