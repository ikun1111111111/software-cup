# 移动端 AI 数字人导览 P6-P8 完成报告

日期：2026-06-23  
范围：`software/mobile`

## 1. 完成结论

本轮已完成近期执行清单 P6-P8 收口：

- P6：演示模式完成。后端不可用、本地缓存为空时，移动端仍可展示路线、选择方案、开始导览，并继续本地问答。
- P7：移动端 UI/UX 收口完成。核心演示路径补齐触摸尺寸、安全区意识和无障碍标签。
- P8：验收闭环完成。新增离线路线测试，并通过 TypeScript 与 Jest 验证。

## 2. P6 演示模式

相关文件：

- `software/mobile/constants/offline-demo.ts`
- `software/mobile/services/dataSync.ts`
- `software/mobile/app/routes/index.tsx`
- `software/mobile/components/guide/GuidePlanModal.tsx`
- `software/mobile/hooks/useGuide.ts`

完成内容：

- 新增 3 条内置演示路线：经典一小时路线、佛教文化半日游、亲子轻松路线。
- 每条路线包含景点顺序、景点名称和讲解重点，支持无网络时完整走完路线。
- `dataSync` 在后端请求失败且本地无缓存时自动返回本地导览路线。
- 路线列表页和导览方案弹窗增加“演示数据模式”提示，避免现场断网时表现为异常空白。
- 智能向导 SSE 问答失败时自动切换到本地知识库兜底回答，并显示答案来源。

## 3. P7 UI/UX 收口

相关文件：

- `software/mobile/app/(tabs)/index.tsx`
- `software/mobile/app/(tabs)/chat.tsx`
- `software/mobile/app/routes/index.tsx`
- `software/mobile/components/guide/GuidePlanModal.tsx`
- `software/mobile/components/guide/SmartGuide.tsx`

完成内容：

- 首页登录入口、自由探索、主动导览、功能入口补充 `accessibilityRole` 和 `accessibilityLabel`。
- 聊天页语音、发送、暂停、继续、结束导览等高频按钮触摸尺寸提升到 44pt。
- 智能向导浮层的设置、关闭、发送、快捷问题、再听一次、继续提问按钮补齐 44pt 触摸区和无障碍状态。
- 路线筛选、路线卡片、导览方案卡片补充选中/禁用状态，便于读屏和比赛验收说明。

## 4. P8 验收结果

新增测试：

- `software/mobile/__tests__/offlineDemo.test.ts`

已执行：

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript：通过。
- Jest：通过。
- 测试统计：9 个测试套件，57 个测试用例，全部通过。

## 5. 变更摘要

本轮没有引入新依赖，也没有修改后端接口协议。移动端在联网时仍优先使用后端和本地缓存；断网或后端不可用时，自动进入演示数据模式，保证比赛现场主流程不中断。
