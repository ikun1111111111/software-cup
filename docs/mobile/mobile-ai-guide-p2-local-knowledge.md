# 移动端 P2 本地知识问答落地记录

日期：2026-06-22

## 目标

先在移动端建立可演示、可测试的本地知识问答兜底，让比赛现场即使后端 RAG、网络或 SSE 不稳定，也能稳定回答灵山胜境高频问题，并继续驱动数字人播报、字幕、表情和动作。

## 已完成

1. 新增 `software/mobile/utils/localKnowledge.ts`
   - 内置 25+ 条灵山胜境高频问答，覆盖景点、演出、路线、服务、礼仪、亲子、老人、拍照、雨天和演示兜底等场景。
   - 提供 `findLocalKnowledgeAnswer`、`getLocalDemoAnswer`、`getOfflineFallbackAnswer` 三层接口。
   - 返回 `displayAnswer` 和 `sourceLabel`，屏幕气泡展示来源，数字人播报只读取答案正文。
   - 使用保守关键词评分，未知问题不直接命中，离线兜底会明确说明“本地演示知识库里还没有找到可靠答案”。

2. 新增 `software/mobile/__tests__/localKnowledge.test.ts`
   - 覆盖灵山大佛高度、九龙灌浴表演时间、亲子路线推荐。
   - 覆盖 25+ 本地条目数量、短时路线、礼佛注意事项、来源展示。
   - 覆盖未知问题不直接命中和离线兜底拒答。

3. 修复 `software/mobile/app/(tabs)/chat.tsx`
   - 恢复问询页、快捷问题、导览快捷操作、录音、发送、设置等移动端可见中文文案。
   - 高频问题本地优先回答，减少演示延迟。
   - 后端 SSE 报错时，用本地兜底回答填充当前助手气泡，避免页面停留在错误态。
   - 本地回答继续调用 `DigitalHumanDriver`，同步触发数字人播报和情绪。

4. 修复 `software/mobile/app/attractions/index.tsx`
   - 将使用 `sortedSpots` 的预加载 `useEffect` 移到变量声明之后，消除 TypeScript 阻塞。

## 验证结果

```bash
cd software/mobile
npx tsc --noEmit
npm test -- --runInBand
```

结果：

- TypeScript 通过。
- Jest 4 个测试套件、43 个用例全部通过。

## 下一步

1. 与后端 FAQ/RAG 标准题库保持同源，避免移动端和服务端答案分叉。
2. 继续补齐 100+ 标准评测题，用于知识问答准确率报告。
3. 继续 P3：打通首页、路线、地图、景点详情与聊天页之间的主动导览闭环。
