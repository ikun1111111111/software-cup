# 灵山胜境知识库种子数据 — 开发总结

> **项目**: 数字传承人 — 智慧灵山胜境景区系统
> **日期**: 2026-06-05
> **分支**: main
> **提交数**: 12 个 commits

---

## 一、目标

从《灵山胜境：历史、文化、景点特色与个性化游览指南》文档中提取结构化知识数据，建立完整的景点、路线、FAQ 知识库，并为前端游客端的推荐、扫码、对话功能提供真实数据基础。

---

## 二、完成的工作

### 1. 数据层 — 种子数据创建（3 个 JSON 文件）

| 文件 | 内容 | 数量 |
|------|------|------|
| `backend/data/ling_sheng_jing_spots.json` | 景点讲解词、标签、关联景点 | 12 个景点 |
| `backend/data/ling_sheng_jing_routes.json` | 个性化路线（含讲解重点+特色体验） | 3 条路线 |
| `backend/data/ling_sheng_jing_faq.json` | 问答对（6 大分类） | 22 个 Q&A |

**12 个景点**:
灵山大佛、梵宫、九龙灌浴、五印坛城、祥符禅寺、佛手广场、百子戏弥勒、曼飞龙塔、灵山精舍、灵山大照壁、菩提大道、三圣殿

**3 条路线**:

| 路线 | 类型 | 时长 | 景点数 |
|------|------|------|--------|
| 历史文化爱好者路线 | history | 6 小时 | 7 个 |
| 自然风光爱好者路线 | nature | 5 小时 | 5 个 |
| 亲子家庭路线 | family | 4 小时 | 5 个 |

**FAQ 6 大分类**: 景点介绍、历史文化、游览指南、门票交通、美食体验、游览路线

### 2. 数据层 — 数据库模型与导入脚本

- **`backend/app/models/tourist.py`**: 新增 `ScenicSpot`（景点）和 `TourRoute`（路线）两个 SQLAlchemy 模型
- **`backend/scripts/seed_lingshengjing.py`**: 异步导入脚本，支持 upsert（重复运行不产生重复数据）

### 3. API 层 — REST 端点

| 端点 | 功能 | 过滤参数 |
|------|------|----------|
| `GET /api/spots` | 景点列表 | `category`（可选） |
| `GET /api/spots/{spot_id}` | 景点详情 | — |
| `GET /api/routes` | 路线列表 | `route_type`（可选） |
| `GET /api/routes/{route_id}` | 路线详情 | — |

新增文件: `backend/app/api/spots.py`, `backend/app/api/routes_api.py`

### 4. 前端 API 层

- **`frontend/src/api/spots.ts`**: `listSpots()`, `getSpotById()` — 类型: `Spot`, `SpotDetail`
- **`frontend/src/api/routes.ts`**: `listRoutes()`, `getRouteById()` — 类型: `TourRoute`, `TourRouteDetail`

### 5. 前端页面重构

#### RecommendPage（推荐路线页）
- 删除硬编码 MOCK_ROUTES，改为从 API 实时获取
- 新增路线详情展开视图：显示景点序号、讲解重点、特色体验
- 兴趣标签映射到后端 route_type 参数（history/nature/family）

#### QRScan（扫码导览）
- 安装 `html5-qrcode` 库，实现真实摄像头扫码
- 景点列表从 `/api/spots` API 加载，不再硬编码
- 扫码结果通过 id / qr_code / name 三级匹配到景点
- 新增 `matchSpot` 纯函数，支持精确匹配 + 模糊匹配
- 更新 `onScan` 回调签名：`(data: string)` → `(spot: Spot)`
- TouristDashboard 同步更新 handleQRScan，扫码后导航到讲解页面
- 20 个测试用例全部通过

#### ChatPage（对话页）
- 快捷问题从 3 个扩展到 5 个灵山胜境专属问题：
  - 灵山大佛有多高？
  - 九龙灌浴表演时间？
  - 推荐历史文化路线
  - 小灵山名字的来历
  - 景区有什么好吃的？

### 6. 推荐引擎增强

- `backend/app/core/recommender.py` 的 `_KNOWN_SPOTS` 从 7 个扩展到 12 个
- `_SPOT_TO_TAGS` 和 `_SPOT_TO_DURATION` 同步更新，覆盖所有新景点

---

## 三、技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React + Ant Design)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ RecommendPage│  │   QRScan     │  │    ChatPage      │  │
│  │  API驱动路线  │  │ html5-qrcode │  │ 5个专属快捷问题   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │              API Client (spots.ts / routes.ts)         │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│                    后端 (FastAPI + SQLAlchemy)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  spots.py    │  │  routes_api  │  │  recommender.py  │  │
│  │  GET /spots  │  │  GET /routes │  │  12个景点数据     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │           SQLAlchemy Models (ScenicSpot, TourRoute)    │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    数据库 (PostgreSQL / SQLite)              │
│  scenic_spots | tour_routes | faq_entries                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、变更统计

| 类型 | 文件数 | 说明 |
|------|--------|------|
| 新增文件 | 10 | 3 个 JSON + 2 个 API + 2 个 API 客户端 + 导入脚本 + __init__ + 测试 |
| 修改文件 | 5 | models, main.py, RecommendPage, QRScan, TouristDashboard, ChatPage, recommender |
| 新增依赖 | 1 | html5-qrcode |

---

## 五、关键决策

1. **数据格式**: ID 统一使用 kebab-case（如 `ling-shan-da-fo`），qr_code 统一 `LSJ_SPOT_<id>` 格式
2. **upsert 逻辑**: 导入脚本使用 `select` 检查是否存在，避免重复插入
3. **扫码匹配策略**: 精确匹配 id/qr_code 优先，名称模糊匹配兜底，避免 ID 碰撞（如 "1" 误匹配 "10"）
4. **API 响应解包**: 前端使用 `res.data.data` 从 Axios 响应链中提取真实数据
5. **防过期闭包**: QRScan 中用 `spotsRef` 保持最新景点列表，避免扫码回调使用过期数据

---

## 六、测试覆盖

- **QRScan**: 20 个测试用例
  - 渲染测试（3）、景点加载（2）、点击交互（3）、重置（1）
  - 扫码成功（3）、matchSpot 单元测试（8）
- 后端种子脚本：需数据库运行环境验证（开发环境已就绪）
