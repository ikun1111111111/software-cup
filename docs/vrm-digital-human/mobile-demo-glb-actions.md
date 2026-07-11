# 移动端 Demo GLB 动作接入

## 2026-07-11

移动端数字人已统一使用独立动作 Demo 中验证过的 GLB 动作：

| 业务状态 | 动作 | 表情 |
| --- | --- | --- |
| 欢迎、问候 | `wave` | `happy`（低强度） |
| 用户提问后等待回答 | `thinking` | `thinking` |
| 普通回答、景点和历史讲解 | `explain` | `relaxed`（平静） |
| 倾听用户 | `listen` | `relaxed`（专注） |
| 明确方向指引 | `showcase` | `happy`（低强度） |
| 无语音空闲 | `waiting1/2/3` 随机轮换 | `neutral` |

实现入口为 `software/mobile/components/vrm/vrmDemoActionPlayer.ts`，由共享的
`VRMView` 驱动，因此首页悬浮数字人、景点页、路线页、对话页和表现包 Demo
使用同一套动作系统。

播放器只绑定有变化的 `J_Bip_*` 人形骨骼四元数轨道，并以 GLB 首帧为源基准、
以当前 VRM 姿态为目标基准计算相对旋转。这样可避免 T Pose，也不会把头发和裙摆
的二级骨骼动画写入当前模型。GLB 姿态在 `vrm.update()` 后应用，防止 normalized
skeleton 在同一帧覆盖动作。

随机待机只在 `action === none` 且没有说话时运行；开始说话、思考或其他动作后会
立即停止并重置计时。当前新增的七个 GLB 资源合计约 76 MB，后续发布包需要考虑
按需下载或压缩动画资源。
