# 智慧旅游管理后台 — Claude 开发规范

## 项目技术栈

- **后端**: FastAPI + SQLAlchemy(async) + Alembic + PostgreSQL + Redis + Milvus + Celery
- **前端**: React 18 + TypeScript + Vite + Ant Design 5 + ECharts + echarts-for-react
- **后端API响应格式**: 直接返回裸JSON（非 `{code,data,message}` 包装）

## 前端设计规范

- **避免 AI slop**: 不用过度居中对齐、紫色渐变、统一圆角、Inter 字体
- **字体**: 选择有特色、有性格的字体组合（展示字体 + 正文字体），避免 Arial/Roboto/system fonts
- **配色**: 主色 + 锐利点缀色，避免均匀分布的怯懦配色；用 CSS 变量保持一致性
- **动效**: CSS 优先，关键页面用 orchestrated stagger 入场动画，避免零散微交互
- **布局**: 非对称、重叠、对角线流动、破网格元素，或极简留白
- **背景**: 渐变网格、噪点纹理、几何图案、层叠透明度、戏剧性阴影

## Word 导出规范（docx-js）

- **页面尺寸**: 显式设置，默认 A4；US Letter 用 `width: 12240, height: 15840`（DXA，1440=1英寸）
- **边距**: 默认 1 英寸 `margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }`
- **列表**: 永远用 `numbering` 配置 `LevelFormat.BULLET`，不要手写 `•` 字符
- **表格**: 必须同时设置 `columnWidths` 和每个 cell 的 `width`，都用 `WidthType.DXA`
- **不要用 `\n`**: 用独立的 `Paragraph` 元素
- **图片**: `ImageRun` 必须带 `type: "png"`/`"jpg"`
- **样式覆盖**: 用 `"Heading1"`/`"Heading2"` 等精确 ID 覆盖内置样式
- **验证**: 生成后用 `.claude/skills/docx/scripts/office/validate.py` 验证

## E2E 测试规范（Playwright）

- **动态页面**: 必须先 `page.wait_for_load_state('networkidle')` 再检查 DOM
- **服务生命周期**: 用 `.claude/skills/webapp-testing/scripts/with_server.py` 管理前后端
- **选择器**: 优先用 `text=`、`role=`、CSS selector 或 ID
- **截图排查**: `page.screenshot(path='...', full_page=True)` + `page.content()` 用于定位问题
- **同步 API**: 用 `sync_playwright()`，始终 `browser.close()`

## 代码风格

- **默认不写注释**: 只解释 WHY（隐藏约束、微妙不变式、特定 bug 的 workaround）
- **不解释 WHAT**: 良好命名的标识符已经说明了
- **不写多行 docstring**: 最多一行简短说明
- **不提前抽象**: 三行相似代码优于过早抽象
- **信任内部代码**: 只在系统边界（用户输入、外部 API）做验证
- **向后兼容**: 不需要时直接改代码，不要加 feature flag
