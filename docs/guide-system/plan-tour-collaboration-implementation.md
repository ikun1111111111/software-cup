# 移动端主动导览与协同导览实现记录

日期：2026-06-23

## 目标

修复移动端主动导览方案加载不稳定的问题，并将协同导览改为复用同一条游览路线。协同房间不再只保存景点名称列表，而是保存来自 `TourRoute` 的共享路线骨架，确保房主和成员看到的路线顺序与游览路线详情一致。

## 已实现变更

### 主动导览

- 移动端新增 `/api/tour` 请求封装，支持 `POST /api/tour/start`、`POST /api/tour/progress` 和 `GET /api/tour/progress/{session_id}`。
- `useTourOrchestrator.startTour` 改为先本地进入导览状态，再调用 `/api/tour/start` 用后端返回的 `route / first_spot / next_spots` 校准导览计划。
- `GuidePlanModal` 的路线加载逻辑增加稳定兜底：路线详情失败时仍保留路线列表项，避免方案弹窗空白。

### 协同导览

- 房间模型新增 `active_route`，字段包含：
  - `route_id`
  - `name`
  - `spot_order`
  - `spot_names`
  - `duration`
  - `route_type`
- 后端新增 `PUT /api/room/{room_id}/route`，根据 `route_id` 从 `TourRoute` 读取路线和景点顺序，写入房间并广播 `route_updated`。
- 房间 WebSocket 的 `room_state` 消息会携带 `active_route`，用于成员加入后恢复共享路线。
- 移动端新增 `useRoomSync` 和 `roomSync` 状态合并工具，处理 `room_state`、成员变化、`route_updated` 和行程变更。
- 探索页协同导览卡片支持：
  - 创建或加入房间
  - 查看成员与连接状态
  - 选择共享游览路线
  - 展示共享路线站点顺序
  - 一键跟随共享路线进入主动导览

## 数据流

1. 用户创建或加入协同房间。
2. 房主在移动端选择一条游览路线。
3. 移动端调用 `PUT /api/room/{room_id}/route`。
4. 后端读取 `TourRoute.spot_order` 和景点名称，写入 `room.active_route`。
5. 后端通过 WebSocket 广播 `route_updated`。
6. 所有成员收到同一份 `active_route`，点击“跟随此路线导览”后写入 `TourContext`。

## 验证

已通过：

```bash
cd software/mobile
npm exec tsc -- --noEmit
npm test -- --runInBand tourProgress.test.ts offlineDemo.test.ts localDemoData.test.ts roomSync.test.ts
```

```bash
python -m pytest backend\tests\test_room_service.py backend\tests\test_room_api.py
```

覆盖点：

- 导览进度推进规则。
- 离线演示路线数据。
- 协同房间 `route_updated` 后保持路线顺序。
- 后端房间 `active_route` 保存与 API 返回。
- 原有创建房间、加入房间、添加景点、视觉识别同步房间能力未回退。

## 后续建议

- 在真机环境验证 WebSocket 长连接稳定性。
- 将协同导览房间入口从探索页进一步拆成独立页面，承载成员聊天、路线管理和进度同步。
- 后续可扩展房主控制权：暂停、下一站、结束导览同步给所有成员。
