# Phase 1 规划文档：RAG 知识库 + LLM 多 API 路由

## 模块概述

补齐 RAG 检索系统的核心缺口，实现文档→向量入库→混合检索的全链路；同时构建 LLM 统一路由层，支持多模型调度与自动降级。

---

## 架构设计

### 数据流

```
文档上传/导入
    │
    ▼
┌─────────────────┐
│ parse_document  │  ← 解析 PDF/Word/Markdown/TXT
│ chunk_text      │  ← 按段落+句子边界分块
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
PostgreSQL   Milvus
(knowledge_  (embedding)
 chunks)      vector
    │         │
    │    ┌────┘
    │    ▼
    │  hybrid_search(query)
    │    │
    │    ├─→ vector_search (Milvus COSINE, top_k*2)
    │    ├─→ bm25_search (内存索引, top_k*2)
    │    └─→ RRF 融合 ──→ rerank(BGE-Reranker) ──→ top-5 chunks
    │
    └─→ 供 chat_service 构建 Prompt
```

### LLM 路由层

```
用户请求
    │
    ▼
llm_router.route(task_type, messages)
    │
    ├─→ task=chat ──→ DeepSeek-V3 ──→ 失败? ──→ Doubao/Qwen fallback
    ├─→ task=vision ──→ Qwen-VL-Max
    ├─→ task=sentiment ──→ Doubao-Lite
    ├─→ task=summary ──→ Qwen-Long
    └─→ task=verify ──→ Doubao-Lite
```

---

## 文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `app/core/embedding.py` | BGE-M3 向量化封装（懒加载模型、批量编码） |
| `app/core/vector_store.py` | Milvus 向量存储封装（插入/删除/搜索） |
| `app/core/bm25_search.py` | BM25 关键词检索（jieba 分词 + rank-bm25，服务启动时从 PG 重建索引） |
| `app/core/reranker.py` | BGE-Reranker-v2-m3 重排序封装 |
| `app/core/faq_matcher.py` | FAQ 精确/模糊匹配（从 chat_service 中独立出来） |
| `app/core/llm_router.py` | LLM 统一路由 + 自动降级 |
| `app/core/fact_checker.py` | 事实校验（豆包交叉验证） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `app/core/rag.py` | 接入 embedding.py / vector_store.py / bm25_search.py / reranker.py；精简重复逻辑 |
| `app/services/knowledge_service.py` | `process_document()` 补全向量入库 Milvus 流程 |
| `app/services/chat_service.py` | 引入 faq_matcher.py，替换内嵌的 FAQ 逻辑 |
| `app/core/llm.py` | 补充 Qwen-Long 长文总结封装；支持多 key 轮换 |
| `app/core/config.py` | 补充 DeepSeek 4 key 相关配置（已做） |
| `app/main.py` | 暂不挂载新路由（本阶段无 API 暴露，纯核心层） |

---

## 接口定义

### embedding.py

```python
class EmbeddingEngine:
    def __init__(self, model_name: str = "BAAI/bge-m3")
    async def encode(self, texts: list[str]) -> list[list[float]]
    async def encode_query(self, text: str) -> list[float]
    
# 全局单例
_engine: EmbeddingEngine | None = None

def get_embedding_engine() -> EmbeddingEngine
```

### vector_store.py

```python
class VectorStore:
    def __init__(self, collection_name: str)
    def ensure_collection(self)
    async def insert_chunks(self, chunks: list[dict]) -> list[str]  # 返回 embedding_ids
    async def search(self, query_embedding: list[float], top_k: int = 10) -> list[dict]
    async def delete_by_doc_id(self, doc_id: int)
    
# 全局单例
_store: VectorStore | None = None

def get_vector_store() -> VectorStore
```

### bm25_search.py

```python
class BM25Index:
    def __init__(self)
    def build(self, chunks: list[dict])  # 从 chunks 重建全量索引
    def search(self, query: str, top_k: int = 10) -> list[dict]
    def add_document(self, chunks: list[dict])  # 增量添加
    
# 全局单例
_index: BM25Index | None = None

def get_bm25_index() -> BM25Index
```

### faq_matcher.py

```python
async def search_faq(question: str, db_session) -> dict | None
# Returns: {"question": str, "answer": str, "source": "faq|faq_fuzzy", "faq_id": int} | None
```

### llm_router.py

```python
class LLMTask(str, Enum):
    chat = "chat"
    vision = "vision"
    sentiment = "sentiment"
    summary = "summary"
    verify = "verify"

async def route(task: LLMTask, messages: list[dict], **kwargs) -> str
# kwargs: stream, temperature, max_tokens, image_url 等
# 自动降级：主模型失败时切换备用模型，记录日志
```

### fact_checker.py

```python
async def verify_facts(question: str, answer: str, context: str) -> tuple[bool, str]
# Returns: (is_consistent, reasoning)
```

---

## 假设清单

1. **Milvus 已启动**：本阶段假设 `docker-compose up -d milvus` 已运行，可通过 `localhost:19530` 连接
2. **BGE-M3 模型下载**：首次运行时会自动从 HuggingFace 下载 `BAAI/bge-m3`，约 2GB，需要网络
3. **PostgreSQL 已有数据**：`python -m app.cli import` 已执行，knowledge_docs / knowledge_chunks 表有数据
4. **DeepSeek API 可用**：4 个 key 至少有一个可用，base_url 为官方地址
5. **BM25 索引内存化**：服务重启后从 PG 全量重建，假设 chunks 数量 < 10 万条（内存可承受）
6. **向量维度 1024**：BGE-M3 的 dense vector 维度固定为 1024，与 Milvus schema 一致

---

## 风险点

| 风险 | 影响 | 预案 |
|------|------|------|
| BGE-M3 下载失败/慢 | 向量化无法工作 | 预下载模型到 `backend/models/` 目录，配置本地路径 |
| Milvus 连接超时 | 向量检索失败 | 启动时捕获异常，降级为纯 BM25 + FAQ 检索 |
| DeepSeek 4 个 key 全部超限 | LLM 完全不可用 | 降级到 Qwen/Doubao；如全部不可用返回"服务暂不可用" |
| BM25 索引重建慢 | 服务启动时间长 | 异步后台重建，启动时用旧索引或空索引保底 |
| 向量入库与 PG 事务不一致 | 数据不一致 | 先写 PG（事务内），再写 Milvus（异步补偿） |
