# 2026-06-25 Mobile Map Guide Buttons

## Symptom

地图导览页按钮点击后反馈不明显，部分场景看起来像加载很久或没有作用。截图中的“地图校准”外观像按钮，但实际有些位置只是状态展示。

## Root Cause

- `useMapSpots` 首屏依赖在线景点接口返回后才结束 loading；后端慢或未启动时会受到请求超时/重试影响。
- 地图页的讲解、指路、校准操作多依赖语音、地图 ref 或导览上下文变化，没有稳定的页面内反馈。
- `TourContext.startNarration` 在后端 SSE 不可用时只更新状态，没有写入本地 narration 文本，当前页无法立即展示讲解内容。

## Fix

- 地图景点列表优先使用本地演示数据即时渲染，在线接口只做后台刷新。
- 增加地图页操作反馈：讲解、指路、模拟抵达、地图校准、地图失败都会更新卡片提示。
- 将“地图校准”胶囊和点位指标改为可点击控件，统一调用定位/校准逻辑。
- `startNarration` 同步写入本地 narration 文本，离线或后端未启动时仍能立即展示讲解。

## Evidence

- `npm test -- --runInBand` passed: 25 suites, 111 tests.
- `npx tsc --noEmit` passed.
- Expo Web started on `http://localhost:8102`; `/map` returned HTTP 200.

## Regression Test

- `software/mobile/__tests__/mapSpotsFallback.test.ts` covers local mappable fallback data, coordinate filtering, and malformed online response fallback.

## Status

DONE
