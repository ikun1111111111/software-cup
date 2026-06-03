# Phase 3 规划文档：知识库管理 API（A-006）

## 模块概述

为管理后台提供知识库 CRUD 接口：文档上传/列表/详情/删除/重新索引，FAQ 增删改查，文件上传（支持 MinIO/本地存储）。

---

## 架构设计

```
管理后台
    │
    ├─→ POST /api/upload              → 保存文件 → 返回 file_path
    │
    ├─→ POST /api/knowledge/docs      → 创建 KnowledgeDoc → 触发 process_document
    │      GET  /api/knowledge/docs   → 分页列表 + 状态筛选
    │      GET  /api/knowledge/docs/{id}
    │      PUT  /api/knowledge/docs/{id}
    │      DELETE /api/knowledge/docs/{id}
    │      POST /api/knowledge/docs/{id}/reindex  → 删除旧向量 → 重新 process_document
    │
    └─→ POST /api/knowledge/faq       → 创建 FAQ
           GET  /api/knowledge/faq    → 分页列表 + 分类筛选
           PUT  /api/knowledge/faq/{id}
           DELETE /api/knowledge/faq/{id}
```

---

## 文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `app/api/knowledge.py` | 知识库 CRUD + FAQ CRUD + 重新索引 |
| `app/api/upload.py` | 文件上传接口（支持 multipart/form-data） |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `app/main.py` | `app.include_router(knowledge_router)` + `app.include_router(upload_router)` |
| `app/services/knowledge_service.py` | 补充 `delete_document()` 业务逻辑 |
| `app/core/vector_store.py` | 补充 `delete_by_doc_id()` 调用确认 |

---

## 接口定义

### 文档管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/knowledge/docs` | GET | 文档列表（分页、status 筛选） |
| `/api/knowledge/docs` | POST | 创建文档（title, content, file_type, file_path） |
| `/api/knowledge/docs/{id}` | GET | 文档详情（含 chunks 列表） |
| `/api/knowledge/docs/{id}` | PUT | 更新文档（重新触发索引） |
| `/api/knowledge/docs/{id}` | DELETE | 删除文档 + 关联 chunks + 向量 |
| `/api/knowledge/docs/{id}/reindex` | POST | 重新索引（删除旧向量 → 重新分块 → 写入新向量） |

### FAQ 管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/knowledge/faq` | GET | FAQ 列表（分页、category 筛选） |
| `/api/knowledge/faq` | POST | 创建 FAQ |
| `/api/knowledge/faq/{id}` | PUT | 更新 FAQ |
| `/api/knowledge/faq/{id}` | DELETE | 删除 FAQ |

### 文件上传

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传文件（返回 file_path + url） |

---

## 假设清单

1. **MinIO 可选**：如果 MinIO 不可用，文件保存到本地 `backend/uploads/` 目录
2. **重新索引异步**：重新索引可能耗时较长（BGE-M3 编码），接口同步返回 queued，实际处理异步
3. **文档删除级联**：删除文档时同步删除 PostgreSQL chunks + Milvus 向量 + BM25 索引条目
4. **分页默认**：page=1, page_size=20, max_page_size=100

---

## 风险点

| 风险 | 影响 | 预案 |
|------|------|------|
| 重新索引大文档超时 | 接口长时间无响应 | 改为 Celery 异步任务，接口立即返回 queued |
| MinIO 连接失败 | 文件无法上传 | 降级到本地文件系统 |
| 删除文档时 Milvus 失败 | PG 数据已删，向量残留 | 先删向量再删 PG，Milvus 失败时记录待清理任务 |
