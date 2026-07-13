# 灵山胜境 · 智能文旅数字人导览系统

基于多模态大模型与 VRM 数字人技术的景区智能导览解决方案，包含游客交互端（移动端）、管理后台与后端服务。

## 功能特性

- **AI 数字人导游**：VRM 模型实时渲染、语音/口型同步、情感动作与节日服装切换
- **多模态交互**：支持语音输入、文本问答、语音识别（ASR）与语音合成（TTS）
- **知识库问答**：基于 RAG 的景区历史、文化、景点特色问答
- **管理后台**：数字人形象/服装/声音配置、知识库文档管理、数据看板
- **游客洞察**：行为数据导入、情感分析、满意度与热门问题统计

## 技术栈

| 层 | 技术 |
|---|---|
| 前端（管理后台） | React 18 + TypeScript + Vite + Ant Design + Three.js / @pixiv/three-vrm |
| 移动端 | React Native + Expo + Expo Router + @pixiv/three-vrm |
| 后端 | Python 3.11 + FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL + Redis + Celery |
| 向量检索 | Milvus + BGE-M3 / BGE-Reranker |
| 语音 | 百炼 CosyVoice v3（首选）+ Azure Speech SDK / edge-tts + 浏览器语音合成 fallback |
| 容器化 | Docker + Docker Compose |

## 项目结构

```
.
├── backend/                 # FastAPI 后端
│   ├── app/                 # 应用代码
│   ├── scripts/             # 数据导入脚本
│   ├── requirements.txt     # Python 依赖
│   └── Dockerfile           # 后端容器镜像
├── frontend/                # React 管理后台
│   ├── src/
│   ├── package.json
│   ├── nginx.conf
│   └── Dockerfile
├── software/mobile/         # React Native / Expo 游客端
│   ├── app/                 # 页面（Expo Router）
│   ├── components/
│   └── package.json
└── docs/                    # 赛题文档与原始数据
```

## 本地开发

### 1. 基础设施

确保已安装并启动：

- PostgreSQL 14+
- Redis 6+
- Milvus 2.3+
- MinIO（可选，用于文件存储）

创建数据库：

```sql
CREATE DATABASE smart_tourism;
CREATE USER tourism WITH PASSWORD 'tourism123';
GRANT ALL PRIVILEGES ON DATABASE smart_tourism TO tourism;
```

### 2. 后端

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端默认地址：http://localhost:8000  
API 文档：http://localhost:8000/docs

### 3. 前端（管理后台）

```bash
cd frontend
npm install
npm run dev
```

默认地址：http://localhost:5173

### 4. 移动端

```bash
cd software/mobile
npm install
npx expo start
```

按提示在 iOS 模拟器、Android 模拟器或 Expo Go 中运行。

> 提示：管理后台前端内也包含一个响应式移动端页面 `/mobile`，本地启动 frontend 后可直接通过浏览器访问 `http://localhost:5173/mobile` 进行预览。

## 数据导入

将赛题提供的文档导入数据库：

```bash
cd backend

# 旅游行为数据（Excel）
.\venv\Scripts\python.exe scripts\import_behaviors.py

# 景点结构化数据
.\venv\Scripts\python.exe scripts\import_spots.py

# 导游指南文档（知识库）
.\venv\Scripts\python.exe scripts\import_guide.py
```

管理后台的“数据大屏”依赖 `tourist_behaviors` 行为数据表。新建数据库后需先执行旅游行为数据导入；当前脚本采用追加写入，请仅在空表初始化时运行一次，避免重复导入。

## Docker 部署

### 构建镜像

```bash
# 后端
cd backend
docker build -t smart-tourism-backend .

# 前端
cd ../frontend
docker build -t smart-tourism-frontend .
```

### 运行容器

```bash
# 后端
docker run -d \
  --name tourism-backend \
  -p 8000:8000 \
  -e DB_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  -e MILVUS_HOST=host.docker.internal \
  smart-tourism-backend

# 前端
docker run -d \
  --name tourism-frontend \
  -p 80:80 \
  smart-tourism-frontend
```

### 使用 Docker Compose（推荐）

```bash
docker compose up -d
```

若只想启动核心依赖（数据库、缓存），可指定服务：

```bash
docker compose up -d postgres redis minio etcd milvus
```

## 环境变量

后端通过 `.env` 文件或环境变量读取配置，常用项：

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | PostgreSQL 连接 | localhost / 5432 / tourism / tourism123 / smart_tourism |
| `REDIS_HOST` / `REDIS_PORT` | Redis 连接 | localhost / 6379 |
| `MILVUS_HOST` / `MILVUS_PORT` | Milvus 连接 | localhost / 19530 |
| `DEEPSEEK_API_KEY` | DeepSeek / 兼容 OpenAI 的 LLM Key | "" |
| `QWEN_API_KEY` | 百炼 DashScope API Key；启用 `cosyvoice-v3-flash` 高质量语音（必须以 `sk-` 开头） | "" |
| `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` | Azure 语音（可选） | "" |

完整配置见 [backend/app/core/config.py](backend/app/core/config.py)。

TTS 会依次尝试百炼 CosyVoice v3、Azure Speech（已配置时）和 edge-tts；后端音源全部不可用时，前端继续降级到浏览器语音。API Key 仅应保存在被 Git 忽略的 `.env` 文件中，不要写入代码、日志或提交记录。

## 运行测试

```bash
# 后端
cd backend
pytest

# 前端
cd frontend
npm run test

# 移动端
cd software/mobile
npm run test
```

## 许可证

本项目为比赛作品，仅供学习与参赛使用。
