# 对话引擎对接文档

> 本文档整理对话引擎（模块A）需要与其他组员（Person B 数字人体验、Captain）对接的所有接口、消息、字段和约定。
> 维护人：Person A（对话引擎前后端）
> 更新时机：每次新增/修改前后端契约时

---

## 一、与 Person B（数字人体验）的对接

### 1.1 ChatResponse 结构化输出（迭代二交付）

**对接背景**：迭代二完成后，后端不再返回纯文本，而是返回标准 JSON。Person B 需要解析其中的 `emotion` 和 `tts` 字段来驱动数字人。

**字段说明**：

```typescript
interface ChatResponse {
  text: string;           // 回答正文，数字人需要朗读的文本
  emotion: "smile" | "think" | "sorry" | "surprise" | "neutral";  // 表情指令
  entities: Array<{       // 提到的实体，可点击跳转
    name: string;         // 如 "灵山大佛"
    type: "spot" | "event" | "facility" | "route";
    url?: string;         // 跳转链接，如 "/spot/灵山大佛"
  }>;
  actions: Array<{       // 推荐操作按钮
    type: "navigate" | "book" | "query" | "show_map";
    label: string;       // 按钮文字，如 "查看地图"
    payload?: any;       // 附加数据
  }>;
  tts: {
    enabled: boolean;    // 是否启用语音播报
    audio_url?: string;   // TTS音频URL（如走服务端合成）
    phonemes?: any[];     // 唇形同步数据（如走WebSocket语音路径）
  };
  source: "faq" | "rag" | "cache" | "offline";  // 来源标签
  latency_ms: number;    // 响应耗时
  cached: boolean;       // 是否命中缓存
}
```

**Person B 需要做的事**：

| 字段 | 接收方式 | Person B 动作 |
|------|----------|---------------|
| `emotion` | SSE `done` 事件 / WebSocket JSON | 调用 `EmotionController` 设置对应表情（smile→happy, think→thinking, sorry→sad, surprise→surprised, neutral→default） |
| `tts.enabled` | 同上 | 为 true 时触发语音播报流程 |
| `tts.phonemes` | WebSocket `voice_answer` | 驱动 `LipSync` 唇形同步 |
| `text` | 同上 | 作为数字人朗读的文本内容 |

**当前状态**：❌ 尚未实现（迭代二交付）

---

### 1.2 实体关键词跳转（迭代四交付）

**对接背景**：迭代四完成后，消息气泡中的实体（如"灵山大佛"）会变成可点击的蓝色链接。

**需要 Person B 确认**：

| 实体类型 | 示例 | 跳转目标 | 需要确认 |
|----------|------|----------|----------|
| `spot`（景点） | 灵山大佛、梵宫、九龙灌浴 | 景点详情页 | 页面路由是什么？如 `/spot/:name` 还是 `/detail?id=xxx` |
| `event`（活动） | 灵山吉祥颂、九龙灌浴表演 | 活动/表演详情页 | 同上 |
| `facility`（设施） | 素食餐厅、医务室 | 设施信息页 | 是否有对应页面？ |
| `route`（路线） | 推荐游玩路线 | 地图/路线页 | 是否已有地图组件？ |

**当前状态**：❌ 尚未实现（迭代四交付）

---

### 1.3 语音交互 WebSocket 契约（已存在，需确认是否调整）

**现有契约**（`ws.py` 已实现）：

**前端 → 后端（发送）**：
```json
{"session_id": "xxx", "type": "voice", "audio_base64": "..."}
```

**后端 → 前端（接收）**：
```json
{
  "type": "voice_answer",
  "asr_text": "灵山大佛有多高",
  "answer": "灵山大佛高88米...",
  "source": "rag",
  "audio_base64": "...",
  "phonemes": [{"phoneme": "灵", "start": 0.0, "end": 0.25}],
  "sentiment_score": 0.5,
  "sentiment_label": "neutral",
  "latency_ms": 2345
}
```

**需要 Person B 确认**：
1. TTS 音频播放是用 `AudioSync` 组件直接播 `audio_base64`，还是等迭代二的 `tts.audio_url`？
2. 唇形同步数据格式 `phonemes` 是否满足 `LipSync` 组件需求？

**当前状态**：✅ 已实现，但迭代二可能调整 `tts` 字段结构

---

## 二、与 Captain（项目管理/部署）的对接

### 2.1 新增依赖包

**迭代一需要**：

| 包名 | 版本 | 用途 | 安装命令 |
|------|------|------|----------|
| `sentence-transformers` | >=2.3 | bge-small-zh-v1.5 语义编码 | `pip install sentence-transformers` |
| `numpy` | >=1.24 | 向量运算 | 已存在 |

**迭代三可能需要**：

| 包名 | 版本 | 用途 | 备注 |
|------|------|------|------|
| `httpx` | >=0.25 | Function Call 工具HTTP请求 | 已存在（tts.py用了） |

**需要 Captain 确认**：
- Docker 镜像是否需要重新构建？
- `sentence-transformers` 模型下载（~100MB）是打包进镜像还是启动时下载？

---

### 2.2 Redis 配置

**新增 Key 前缀**：

| Key 模式 | 用途 | TTL |
|----------|------|-----|
| `chat:{session_id}:{md5}` | 现有精确缓存 | 300s |
| `semantic_cache:*` | 语义缓存（迭代一） | 3600s |
| `session:{session_id}` | 对话历史（迭代一） | 86400s (24h) |
| `circuit:*` | 熔断器状态（迭代三） | 60s |

**需要 Captain 确认**：
- Redis 内存是否足够？当前配置 `redis_db: 0`，是否需要分库？

---

### 2.3 环境变量

**迭代一新增配置**（`.env` 和 `config.py`）：

```bash
# 语义缓存
SEMANTIC_CACHE_MODEL=BAAI/bge-small-zh-v1.5
SEMANTIC_CACHE_SIMILARITY_THRESHOLD=0.9
SEMANTIC_CACHE_MAX_ENTRIES=1000
SEMANTIC_CACHE_TTL=3600

# 上下文管理
CONTEXT_MAX_ROUNDS=5
CONTEXT_TTL=86400
```

**需要 Captain 确认**：
- `.env` 文件是否需要同步更新到部署环境？

---

## 三、接口变更记录

### 3.1 现有接口（不改）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat/stream` | SSE流式对话（迭代一增加 `history` 可选字段） |
| WS | `/ws/chat` | WebSocket对话（迭代一增加上下文维护） |
| GET | `/api/recommend` | 推荐接口（不变） |
| GET | `/api/analytics/*` | 分析接口（不变） |

### 3.2 新增接口（迭代四）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/chat/history` | 查询某会话历史 |
| GET | `/api/chat/sessions` | 查询会话列表 |

---

## 四、待确认事项清单

| 序号 | 事项 | 对接人 | 优先级 | 状态 |
|------|------|--------|--------|------|
| 1 | `ChatResponse.emotion` 字段映射到 Live2D 表情名称 | Person B | 高 | 待确认 |
| 2 | 景点详情页路由格式（`/spot/:name` ?） | Person B | 中 | 待确认 |
| 3 | TTS 音频播放方式（base64直播 vs audio_url） | Person B | 中 | 待确认 |
| 4 | `sentence-transformers` 模型部署方式 | Captain | 高 | 待确认 |
| 5 | Redis 内存/分库策略 | Captain | 低 | 待确认 |
| 6 | `.env` 环境变量同步 | Captain | 中 | 待确认 |

---

## 附录：当前已存在的接口契约（供参考）

### SSE 事件格式（`chat.py`）

```
event: faq_hit
data: {"answer": "...", "source": "faq", "faq_id": 1, "latency_ms": 12}

event: chunk
data: {"index": 0, "text": "...", "score": 0.95}

event: token
data: {"token": "88", "index": 0}

event: done
data: {"answer": "...", "source": "rag", "latency_ms": 2345, "sentiment_score": 0.5, "sentiment_label": "neutral"}

event: error
data: {"error": "生成回答时出错，请稍后重试"}
```

### WebSocket 消息格式（`ws.py`）

**发送**：
```json
{"session_id": "xxx", "type": "text", "question": "灵山大佛有多高？"}
{"session_id": "xxx", "type": "voice", "audio_base64": "..."}
```

**接收**：
```json
{"type": "answer", "answer": "...", "source": "rag", "chunks": [...], "sentiment_score": 0.5, "sentiment_label": "neutral", "latency_ms": 1234}
{"type": "voice_answer", "asr_text": "...", "answer": "...", "source": "rag", "audio_base64": "...", "phonemes": [...], "latency_ms": 2345}
{"type": "error", "message": "..."}
```

