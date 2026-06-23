# 移动端景点页数字人主导重构实现文档

> 目标项目：`software/mobile/`  
> 页面范围：`app/attractions/index.tsx`  
> 日期：2026-06-23  
> 状态：实现完成，已验证

## 一、目标

将景点列表页从传统图文目录升级为“小灵数字人导览台”，让用户进入页面后先看到数字人、听到推荐，再进入景点选择。同步解决旧版首屏加载慢的问题，避免 8MB hero 背景图阻塞移动端 Web 渲染。

## 二、核心改动

| 文件 | 改动 |
|------|------|
| `software/mobile/app/attractions/index.tsx` | 重构为数字人导览台、精选景点横向流、完整景点卡片流、延后路线与详情预加载 |
| `software/mobile/components/vrm/VRMProvider.tsx` | 将 `/attractions` 加入页面内自带 VRM 列表，避免全局浮窗重复出现 |
| `docs/mobile/mobile-attractions-digital-human-redesign.md` | 新增本实现文档 |

## 三、体验设计

- 首屏使用页面内 `VRMView` 渲染小灵，配合 `useDigitalHumanDriver` 驱动表情、口型、动作和讲解字幕。
- 视觉方向为“未来佛境导览台”：墨黑主舞台、鎏金控制线、朱砂行动色、松绿信息色。
- 旧版景点列表下沉为两层内容：先展示“小灵精选”，再展示完整景点流。
- 景点卡片增加“小灵推荐理由”、预计停留时间、最佳游览时段和分类标签。
- 保留原有搜索、分类、分页、景点跳转和路线跳转能力。

## 四、性能处理

- 首屏不再引用 `assets/images/hero-bg-attractions.png`，避免 8MB 图片参与初始渲染。
- 景点数据读取顺序：内存缓存命中时直接使用；否则立即使用本地灵山静态数据渲染，再后台读取 SQLite 更新。
- 路线数据通过 `InteractionManager.runAfterInteractions` 延后加载，并使用本地路线数据，避免后端未启动时阻塞页面。
- 景点详情预加载只处理当前分页可见景点，并用 `Set` 去重；详情缓存直接写入本地 detail，避免列表页主动请求离线后端。
- 景点图片改用 `expo-image`，启用渐显和 `memory-disk` 缓存策略。

## 五、交互说明

| 触发 | 行为 |
|------|------|
| 页面进入 | 小灵欢迎并推荐首个精选景点 |
| 点击“听小灵推荐” | 播报推荐景点、理由、停留时间和最佳时段 |
| 点击“拍照识景” | 跳转 `/explore` 并提示拍照识景 |
| 点击“开始路线” | 有路线时进入第一条路线详情，否则进入路线列表 |
| 切换分类 | 小灵播报当前分类 |
| 搜索关键词 | 输入 2 个及以上字符后播报匹配结果数量 |
| 点击景点卡片 | 小灵讲推荐理由，并进入景点详情 |

## 六、验收记录

| 项目 | 结果 |
|------|------|
| TypeScript 检查 | `npx tsc --noEmit --pretty false` 通过 |
| 单元测试 | `npm test -- --runInBand` 通过，10 个测试套件、63 个用例 |
| Expo Web 8097 首屏 | `http://localhost:8097/attractions` 返回 200，出现“小灵导览台”“听小灵推荐” |
| 旧 hero 资源 | 未请求 `hero-bg-attractions.png` |
| 列表区域 | 滚动后可见“小灵精选”和“完整景点流” |
| 搜索交互 | 输入“梵宫”后收敛为 1 处结果 |
| 截图 | `tmp/attractions-redesign-mobile.png`、`tmp/attractions-redesign-list.png` |

已知说明：Playwright headless 环境中浏览器语音合成会报 `SpeechSynthesisErrorEvent`；全局 `ProactiveStrategyEngine` 在后端未启动时仍会请求 `/api/guide/*` 并产生连接拒绝，这不来自景点页数据加载链路。

## 七、后续优化建议

- 将 `SpotStoryMeta` 从页面内常量迁移到景点数据源，便于运营维护。
- 给小灵推荐增加用户偏好权重，例如亲子、历史、拍照、短途。
- 对旧的 `hero-bg-attractions.png` 做离线压缩，用于详情页或非首屏沉浸背景。
