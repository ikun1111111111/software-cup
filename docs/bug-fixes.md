# Bug Fixes - 2026-06-04 (更新)

## 17. 移动端地图点击推荐点位后视口跳到错误位置

**日期**：2026-07-16

**现象**：在移动端地图页点击底部“推荐顺路看”的点位卡片后，地图短暂移动，随后又跳到全景或其他无关位置，无法稳定停在所选点位。

**根因**：原生地图使用 WebView 承载高德地图。点位选择会更新 `activeSpotId`，而 `activeSpotId` 被放入地图 HTML 的 `useMemo` 依赖中，导致每次选择都重建并重新加载 WebView。新地图初始化时执行 `setFitView`，覆盖了卡片点击后刚执行的 `setCenter`。

**修复文件**：
- `software/mobile/components/map/AmapView.native.tsx`
- `software/mobile/components/map/AmapView.shared.ts`
- `software/mobile/__tests__/amapViewHtml.test.ts`
- `software/mobile/__tests__/mapNativeSelection.test.ts`

**方案**：保持地图 HTML 和 WebView 实例稳定，通过 `window.setActiveSpot()` 在现有地图内同步选中点的高亮、尺寸和层级；选中状态变化不再触发地图重载，因此点位卡片触发的居中命令不会被全图自适应覆盖。

**验证**：地图相关 9 个测试套件共 25 个用例通过，TypeScript `tsc --noEmit` 通过。

---

## 1. PixiJS `checkMaxIfStatementsInShader` 崩溃

**现象**：Live2D 数字人加载时报错 `Invalid value of '0' passed to checkMaxIfStatementsInShader`，页面卡死。

**根因**：某些 GPU（尤其是集显）报告 `MAX_TEXTURE_IMAGE_UNITS = 0`，PixiJS v7 的 `BatchRenderer.contextChange` 将该值传入 `checkMaxIfStatementsInShader(0, gl)`，直接抛异常。之前设置 `pixi.settings.IF_STATEMENTS_NUMBER = 64` 无效，因为 BatchRenderer 从 GPU 参数读取而非 settings。

**修复文件**：`frontend/src/components/DigitalHuman/Live2DStage.tsx`

**方案**：在 `loadCubismRuntime()` 中 override `BatchRenderer.prototype.contextChange`，用 try/catch 包裹原始方法，失败时用 `maxTextures = max(gpuMax, 1)` 完成 shader 和几何池初始化。标记 `__safe` 防止重复 patch。

---

## 11. pixi.js v7 `isInteractive` 兼容性错误

**现象**：控制台报错 `TypeError: currentTarget.isInteractive is not a function`，Live2D 模型无法加载。

**根因**：`pixi-live2d-display` v0.4 内部事件系统调用了 pixi.js v6 的 `isInteractive()` 方法。pixi.js v7 移除了该 API，改为 `eventMode` 属性。

**修复文件**：`frontend/src/components/DigitalHuman/Live2DStage.tsx`

**方案**：完全禁用 PIXI 事件系统，改用 React 事件处理鼠标交互。

```ts
const app = new pixi.Application({
  eventMode: 'none',
  eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
} as any);
```

- 移除 `model.interactive = true` 和 `model.on('pointerdown', handleClick)`
- 鼠标跟踪：React `onPointerMove` → `modelRef.current.focus()`
- 点击动作：React `onClick` → `modelRef.current.motion()`

---

## 12. 形象配置切换无视觉变化

**现象**：管理后台 `/admin/avatar` 页面点击肤色、发型、服装等选项，预览区的 Live2D 数字人没有任何变化。

**根因**：
1. `avatarModels.ts` 中三个 model ID（model-1/2/3）全部指向同一个 haru 模型文件
2. `AvatarAppearance` 的 skin/hair/outfit/accessories 是纯 UI 层 ID，没有映射到任何 Live2D 参数
3. `AvatarPage` 只传了 `modelPath` 和 `emotion="neutral"` 给 `DigitalHuman`，没有传递外观配置
4. `DigitalHuman` 不接受 expression prop，无法直接驱动 Live2D 表情

**修复文件**：
- `frontend/src/config/avatarModels.ts` — 新增 `getExpressionForAppearance()` 函数
- `frontend/src/components/DigitalHuman/DigitalHuman.tsx` — 新增 `expression` prop
- `frontend/src/pages/admin/AvatarPage.tsx` — 传递 expression 给 DigitalHuman

**方案**：将皮肤选择映射到 haru 模型的 Live2D 表情（f00/f01/f02），通过新增的 `expression` prop 直接驱动模型表情切换，产生可见的视觉反馈。

| 皮肤选项 | Live2D 表情 | 效果 |
|---------|------------|------|
| 默认肤色 (skin-1) | f00 | 默认表情 |
| 白皙 (skin-2) | f01 | 明亮表情 |
| 小麦色 (skin-3) | f02 | 温暖表情 |

---

## 13. EmotionController 自动重置覆盖直接表情控制

**现象**：通过 `expression` prop 设置的 Live2D 表情在约 5 秒后被 EmotionController 的 autoReset 机制重置为 `default`，形象配置的视觉效果短暂出现后消失。

**根因**：EmotionController 组件的 autoReset 功能会定时将表情重置为 `default`，与直接 expression 控制产生冲突。当 AvatarPage 传入 `expression="f01"` 时，EmotionController 仍在运行并将表情改回 `default`。

**修复文件**：`frontend/src/components/DigitalHuman/DigitalHuman.tsx`

**方案**：当 `expression` prop 存在时，禁用 EmotionController 的表情驱动和自动重置。

```tsx
<EmotionController
  emotion={expression ? 'neutral' : emotion}
  onExpressionChange={expression ? undefined : handleExpressionChange}
  autoReset={!expression}
  resetDelay={5000}
/>
```

---

## 2. React StrictMode 导致页面死机

**现象**：开发模式下页面打开后立即卡死。

**根因**：React StrictMode 在开发模式下让 effect 执行两次（mount → unmount → mount）。PIXI WebGL renderer 在同一个 canvas 上被创建→销毁→再创建，导致上下文冲突。

**修复文件**：`frontend/src/main.tsx`

**方案**：移除 `<React.StrictMode>` 包裹。StrictMode 仅在开发环境生效，生产环境不受影响。

---

## 3. Push 轮询每 30 秒弹出"服务器错误" toast

**现象**：页面每隔 30 秒弹出一次"服务器错误"提示。

**根因**：`usePushNotification` hook 每 30 秒轮询 `/api/push/check-location`，后端依赖的 Redis/RAG 不可用时返回 500。`request.ts` 的响应拦截器对每个 500 都调用 `message.error('服务器错误')`。

**修复文件**：
- `frontend/src/api/request.ts` — 错误拦截器支持 `silent` 配置，静默请求不弹 toast
- `frontend/src/api/push.ts` — `checkLocation` 请求标记 `{ silent: true }`
- `backend/app/api/push.py` — endpoint 加 try/catch，Redis/RAG 失败时返回 `{"triggered": false}` 而非 500

---

## 4. Push 响应缺少 `code` 字段被误判为业务错误

**现象**：Push 接口即使返回 200 也会弹出"请求失败"toast。

**根因**：`request.ts` 成功响应拦截器检查 `data.code !== 0 && data.code !== 200`。Push 端点返回 `{"triggered": false}` 没有 `code` 字段，`undefined !== 0` 为 `true`，被误判为业务错误。

**修复文件**：`frontend/src/api/request.ts`

**方案**：拦截器改为 `typeof data.code === 'number' && data.code !== 0 && data.code !== 200`，只在 `code` 字段存在且为数字时才检查。

---

## 5. SSE 聊天消息 Stale Closure — 问了问题没有回复

**现象**：发送消息后，数字人没有任何回复，助手消息一直为空。

**根因**：`ChatPage` 的 `onMessage` 回调通过闭包捕获 `messages` 变量。`doSend` 调用 `addMessage` 后 zustand 状态更新是异步的，`connect` 立刻用旧的 `messages` 创建回调。SSE token 到达时 `messages[messages.length - 1]` 引用的是旧的最后一条消息（不是刚添加的空助手消息），token 更新被静默跳过。

**修复文件**：`frontend/src/pages/tourist/ChatPage.tsx`

**方案**：`onMessage` 回调内改用 `useChatStore.getState().messages` 实时读取最新状态，不再依赖闭包捕获的旧值。

---

## 6. 缺少 `jieba` 依赖导致后端 500

**现象**: 聊天请求返回 500 Internal Server Error。

**日志**: `ModuleNotFoundError: No module named 'jieba'`

**根因**: `faq_matcher.py` 导入 `jieba` 进行中文分词，但 `requirements.txt` 中未声明该依赖。

**修复**: `pip install jieba`

**文件**: `backend/app/core/faq_matcher.py:43`

---

## 7. 前端 SSE 请求方法错误 (GET vs POST)

**现象**: 后端返回 405 Method Not Allowed。

**日志**: `GET /api/chat/stream?session=...&message=... HTTP/1.1" 405 Method Not Allowed`

**根因**: `ChatPage.tsx` 将参数拼在 URL query string 中调用 `connect(url)`，`useSSE` hook 在无 body 时使用 GET 方法，但后端 `@router.post("/stream")` 只接受 POST。

**修复文件**: `frontend/src/pages/tourist/ChatPage.tsx`

**方案**: 改为传递 body 参数，触发 POST 请求。

```typescript
// 修复前
connect(`/api/chat/stream?session=${currentSessionId}&message=${encodeURIComponent(text.trim())}`);

// 修复后
connect('/api/chat/stream', {
  session_id: currentSessionId,
  question: text.trim(),
  stream: true,
});
```

---

## 8. SSE 事件解析不匹配

**现象**: 前端收到响应但无法显示内容。

**根因**: `useSSE` hook 只解析 `data:` 行，忽略 `event:` 行；且直接传递原始字符串而非 JSON 对象。后端发送格式为 `event: token\ndata: {"token": "...", "index": 0}`。

**修复文件**: `frontend/src/hooks/useSSE.ts`

**方案**: 增加 `event:` 行解析，自动 JSON 解析 `data:` 内容，将事件类型作为 `_event` 字段传递。

---

## 9. 前端事件类型处理不匹配

**现象**: SSE 数据已解析但聊天界面无显示。

**根因**: `ChatPage.tsx` 检查 `data.type === 'chunk'`，但后端实际发送的事件类型为 `token`、`faq_hit`、`done`、`error`。

**修复文件**: `frontend/src/pages/tourist/ChatPage.tsx`

**方案**: 更新 `onMessage` 处理逻辑，匹配后端实际事件类型（`token` → 逐字追加，`faq_hit` → 直接显示答案，`done` → 结束流式，`error` → 显示错误）。

---

## 10. API 路径双 `/api` 前缀

**现象**: 多个 API 返回 404 Not Found。

**日志**: `POST /api/api/push/check-location HTTP/1.1" 404 Not Found`

**根因**: `request.ts` 的 `baseURL` 已设置为 `/api`，但各 API 文件的路径也以 `/api/` 开头，导致拼接后变为 `/api/api/...`。

**修复**: 移除所有前端 API 文件路径中的 `/api` 前缀。

| 文件 | 修复前 | 修复后 |
|------|--------|--------|
| `push.ts` | `/api/push/...` | `/push/...` |
| `vision.ts` | `/api/vision/...` | `/vision/...` |
| `knowledge.ts` | `/api/knowledge/...` | `/knowledge/...` |
| `room.ts` | `/api/room/...` | `/room/...` |
| `analytics.ts` | `/api/analytics/...` | `/analytics/...` |
| `avatar.ts` | `/api/avatar/...` | `/avatar/...` |
| `story.ts` | `/api/story/...` | `/story/...` |

---

## 14. tsconfig.node.json 缺少 `composite` 设置

**现象**：`npm run build`（即 `tsc && vite build`）报错：
```
tsconfig.json(24,18): error TS6306: Referenced project must have setting "composite": true.
tsconfig.json(24,18): error TS6310: Referenced project may not disable emit.
```

**根因**：`tsconfig.json` 通过 `"references": [{ "path": "./tsconfig.node.json" }]` 引用了 `tsconfig.node.json`。TypeScript 的 project references 要求被引用项目必须设置 `"composite": true`，且不能设置 `"noEmit": true`。当前 `tsconfig.node.json` 缺少 `composite` 且有 `noEmit: true`。

**修复文件**：`frontend/tsconfig.node.json`

**方案**：
- 添加 `"composite": true`
- 移除 `"noEmit": true`

**影响**：`tsc` 类型检查无法运行，但 `npx vite build` 不受此影响（Vite 不走 tsc），所以生产构建仍可成功。

---

## 15. QRScan 测试用例与重构后的组件不匹配（9 个测试失败）

**现象**：`vitest run` 报告 `QRScan.test.tsx` 全部 9 个测试失败，错误为 `Unable to find an element with the testId: scan-btn`。

**根因**：QRScan 组件从独立页面重写为内嵌卡片组件后，测试用例未同步更新。测试仍引用旧版的 test ID、文本和交互模式。

**具体不匹配项**：

| 测试期望 | 当前组件实际 | 说明 |
|---------|------------|------|
| `getByTestId('qr-scan')` | `qr-scan-card` | 容器 testId 已改 |
| `getByText('扫码定位')` | 组件内无此文本 | 标题已移至 TouristDashboard 卡片头 |
| `getByTestId('scan-btn')` | 不存在 | 旧版独立扫描按钮已移除，改为点击扫描框 |
| `getByTestId('scan-placeholder')` | 不存在 | 旧版占位符已移除 |
| `getAllByText('扫描中...')` | `正在扫描...` | 扫描中状态文本已更改 |
| `getByText('扫描成功')` | `已定位成功` | 成功状态文本已更改 |
| `getByText('开始扫描')` | 不存在 | 旧版按钮文案已移除 |
| `expect(button).toBeDisabled()` | 扫描框无 disabled 属性 | 交互方式改为条件渲染 |

**修复文件**：`frontend/src/__tests__/QRScan.test.tsx`

**方案**：重写测试用例，匹配新版卡片组件的 testId、文本和交互逻辑。

**影响**：CI 中 9 个测试持续失败，掩盖真正的回归问题。

---

## 16. ESLint 配置文件缺失

**现象**：`npm run lint` 报错 `ESLint couldn't find an eslint.config.(js|mjs|cjs) file`。

**根因**：`package.json` 的 lint 脚本使用 `eslint . --ext ts,tsx`（ESLint v8 语法），但项目安装的 ESLint 版本为 v10+，要求使用新的 flat config 格式 `eslint.config.js`。项目中既无 `.eslintrc.*` 也无 `eslint.config.*` 文件。

**修复方案**（二选一）：
1. **降级 ESLint**：安装 `eslint@8` 并创建 `.eslintrc.cjs`
2. **迁移到 flat config**：创建 `eslint.config.js` 并更新 lint 脚本为 `eslint .`

**影响**：`npm run lint` 无法运行，代码质量检查缺失。

---

## 涉及文件清单

| 文件 | 改动 |
|------|------|
| `frontend/src/components/DigitalHuman/Live2DStage.tsx` | Override BatchRenderer.contextChange + waitForLayout 超时 + 禁用 PIXI 事件系统 |
| `frontend/src/components/DigitalHuman/DigitalHuman.tsx` | 新增 expression prop + EmotionController 冲突修复 |
| `frontend/src/config/avatarModels.ts` | 新增 getExpressionForAppearance() 表情映射 |
| `frontend/src/pages/admin/AvatarPage.tsx` | 传递 expression 给 DigitalHuman |
| `frontend/src/main.tsx` | 移除 React StrictMode |
| `frontend/src/api/request.ts` | 支持 silent 配置 + 修复 code 字段判断 |
| `frontend/src/api/push.ts` | checkLocation 静默模式 + 路径修复 |
| `frontend/src/pages/tourist/ChatPage.tsx` | SSE stale closure 修复 + POST 请求 + 事件类型匹配 |
| `backend/app/api/push.py` | check_location endpoint 加 try/catch |
| `frontend/src/hooks/useSSE.ts` | SSE event/data 解析逻辑 |
| `frontend/src/api/vision.ts` | 路径修复 |
| `frontend/src/api/knowledge.ts` | 路径修复 |
| `frontend/src/api/room.ts` | 路径修复 |
| `frontend/src/api/analytics.ts` | 路径修复 |
| `frontend/src/api/avatar.ts` | 路径修复 |
| `frontend/src/api/story.ts` | 路径修复 |
| `frontend/tsconfig.node.json` | 添加 `composite: true`，移除 `noEmit`（Bug #14） |
| `frontend/src/__tests__/QRScan.test.tsx` | 重写测试用例匹配新版卡片组件（Bug #15） |
| `frontend/eslint.config.js` | 新建 flat config 文件（Bug #16） |
