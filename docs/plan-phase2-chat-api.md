# Phase 2 规划文档：对话服务（SSE + WebSocket）

## 模块概述

暴露 RESTful SSE 流式对话接口和 WebSocket 双向通信接口，整合 FAQ→RAG→LLM 全链路；支持 Redis 热点缓存、交互记录持久化、语音交互文本保底。

---

## 架构设计

### 数据流

```
客户端请求
    │
    ├─→ POST /api/chat/stream (SSE)
    │       │
    │       ├─→ Redis 缓存检查（热点问答，TTL=5min）
    │       ├─→ 未命中 → process_chat() → FAQ→RAG→LLM
    │       │              ├─→ FAQ 命中：直接返回答案
    │       │              └─→ RAG：SSE 流式输出 LLM token
    │       └─→ 写入 interaction_logs（异步，不阻塞响应）
    │
    └─→ WebSocket /ws/chat
            │
            ├─→ 接收 JSON 消息 {session_id, question, type:"text|voice"}
            ├─→ 调用 process_chat()
            └─→ 返回 JSON 响应 {answer, source, chunks, sentiment}
```

---

## 文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `app/api/chat.py` | SSE 流式对话接口 `/api/chat/stream` |
| `app/api/ws.py` | WebSocket 接口 `/ws/chat` |
| `app/core/prompts.py` | System Prompt 模板统一管理 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `app/main.py` | `app.include_router(chat_router)`, `app.add_websocket_route(ws_router)` |
| `app/services/chat_service.py` | 补充 Redis 缓存检查、异步写入 interaction_logs |
| `app/core/redis_client.py` | 如有需要，补充缓存 key 生成工具 |

---

## 接口定义

### POST `/api/chat/stream` (SSE)

**Request**:
```json
{
  "session_id": "uuid-string",
  "question": "灵山大佛有多高？",
  "stream": true
}
```

**Response** (SSE events):
```
event: faq_hit
data: {"answer": "灵山大佛高88米...", "faq_id": 3}

--- or ---

event: chunk
data: {"text": "[资料片段] 灵山大佛高88米...", "score": 0.95}

event: token
data: {"token": "灵", "index": 0}

event: token
data: {"token": "山", "index": 1}

event: done
data: {"answer": "灵山大佛高88米...", "source": "rag", "latency_ms": 1200}
```

### WebSocket `/ws/chat`

**Receive**:
```json
{"session_id": "uuid", "question": "...", "type": "text"}
```

**Send**:
```json
{
  "type": "answer",
  "answer": "灵山大佛高88米...",
  "source": "rag",
  "chunks": [{"text": "...", "score": 0.95}],
  "sentiment_score": 0.8,
  "sentiment_label": "positive",
  "latency_ms": 1200
}
```

---

## 假设清单

1. **Redis 已启动**：热点问答缓存依赖 Redis，未启动时跳过缓存
2. **LLM 流式可用**：`llm_router.route_stream()` 已测试通过
3. **前端支持 SSE**：浏览器 EventSource 或 fetch + ReadableStream
4. **语音交互延后**：WebSocket 先支持文本，语音二进制流在 A-004 接入
5. **interaction_logs 写入异步**：不阻塞接口响应，失败时记录 warning

---

## 风险点

| 风险 | 影响 | 预案 |
|------|------|------|
| SSE 连接意外断开 | 用户体验差 | 前端自动重连 + 后端检测断开停止生成 |
| WebSocket 并发过高 | 内存/连接数爆炸 | 限制单 IP 并发连接数 |
| Redis 缓存污染 | 过期答案被返回 | 知识库更新时主动清除相关缓存 |
| LLM 流式生成超时 | 用户长时间等待 | 设置 30s 超时，超时返回"思考中请稍候" |
