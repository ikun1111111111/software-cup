# 后端剩余任务规划文档

## 模块概述
补齐队员1（后端）所有未完成任务：数字人配置 API、感受度报告 Celery 任务、TTS 生产化完善、准确率自动化评测、延迟压测脚本。

## 架构设计

### 数据流
```
管理端 ──► api/avatar.py ──► AvatarConfig (PG)
       ──► api/analytics.py ──► analytics.py ──► InteractionLog (PG)
       ──► POST /api/analytics/report (触发) ──► tasks/report_task.py
                                           ──► report_generator.py
                                           ──► LLM (Qwen-Long)
                                           ──► 报告结果写入 PG / Redis

游客端 ──► ws.py ──► tts.py ──► CosyVoice HTTP / fallback

CI/CD ──► test_accuracy_100.py ──► chat_service ──► 对比标准答案 ──► 准确率报告
       ──► test_pressure.py (Locust) ───► /api/chat/stream ──► 延迟报告
```

### 模块划分
| 模块 | 职责 | 文件 |
|------|------|------|
| 数字人配置 | CRUD + 激活切换 | `api/avatar.py` |
| 报告生成引擎 | 聚合数据 + Prompt 组装 | `core/report_generator.py` |
| 报告异步任务 | Celery 包装 + 结果存储 | `tasks/report_task.py` |
| TTS 完善 | HTTP fallback 健壮化 | `core/tts.py` (修改) |
| 准确率评测 | 100 题测试集 + 评分 | `data/test_set.json`, `tests/test_accuracy_100.py` |
| 延迟压测 | Locust 脚本 | `tests/test_pressure.py` |

## 文件清单

### 新增文件
| 文件路径 | 职责 |
|---------|------|
| `backend/app/api/avatar.py` | 数字人配置 REST API（CRUD + 激活切换 + 获取当前激活配置） |
| `backend/app/core/report_generator.py` | 从 interaction_logs 聚合数据，组装 LLM Prompt，生成感受度报告 |
| `backend/app/tasks/report_task.py` | Celery 异步任务：调用 report_generator，结果存 Redis/PG |
| `backend/data/test_set.json` | 100 题灵山胜境标准测试集（question + expected_keywords + category） |
| `backend/tests/test_avatar_api.py` | 数字人 API 单元测试（mock DB） |
| `backend/tests/test_report_generator.py` | 报告生成引擎单元测试 |
| `backend/tests/test_accuracy_100.py` | 准确率自动化评测脚本 |
| `backend/tests/test_pressure.py` | Locust 压测脚本 |

### 修改文件
| 文件路径 | 修改内容 |
|---------|---------|
| `backend/app/main.py` | 挂载 `avatar.router` |
| `backend/app/tasks/celery_app.py` | `include` 增加 `app.tasks.report_task` |
| `backend/app/core/tts.py` | 完善 HTTP fallback 错误处理，空音频时抛明确异常 |

## 接口定义

### Avatar API (`/api/avatar`)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/avatar` | 列表（分页） |
| POST | `/api/avatar` | 创建 |
| GET | `/api/avatar/{id}` | 详情 |
| PUT | `/api/avatar/{id}` | 更新 |
| DELETE | `/api/avatar/{id}` | 删除（硬删，数据量小） |
| POST | `/api/avatar/{id}/activate` | 激活该数字人（同时取消其他激活） |
| GET | `/api/avatar/active` | 获取当前激活的数字人配置 |

### Report Trigger API (`/api/analytics/report`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analytics/report` | 触发异步报告生成，返回 task_id |
| GET | `/api/analytics/report/status/{task_id}` | 查询报告生成状态 |

### Report Task (Celery)
```python
generate_report_task(start_date: str | None, end_date: str | None, days: int = 7)
# 结果存 Redis: report:{task_id} = {"status": "done", "content": "...", "generated_at": "..."}
```

## 假设清单
1. 数字人配置数据量极小（<100 条），不做软删除，直接硬删。
2. 感受度报告生成频率不高，结果暂存 Redis（7 天 TTL），不单独建表。
3. TTS 生产环境优先使用 CosyVoice HTTP 服务；本地开发无服务时返回 HTTP 503 风格异常，由前端降级处理。
4. 准确率评测使用"关键词命中"策略：LLM 回答中包含 expected_keywords 中的关键信息即算正确（避免语义相似度带来的歧义）。
5. Locust 压测需要运行中的后端服务，脚本中注释说明启动方式。

## 风险点
| 风险 | 预案 |
|------|------|
| TTS HTTP 服务未部署 | 已提供 fallback + 明确错误信息；docker-compose 中保留注释供后续启用 |
| 报告生成 LLM 调用超时 | Celery 任务设置 5 分钟超时，失败可重试 2 次 |
| 准确率评测消耗 API key | 评测脚本支持 `--subset 20` 参数先跑小批量验证 |
| 压测脚本依赖外部 Locust | 已在 requirements.txt 中有 `locust==2.32.4` |
