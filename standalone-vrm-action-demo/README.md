# Standalone VRM Blender Action Demo

这是一个独立的灵山数字人 VRM 表演原型，用于验证文字驱动动作、表情、眨眼和口型的组合效果。

## 打开方式

在这个目录运行：

```bash
python -m http.server 8123
```

然后打开：

```text
http://localhost:8123
```

## 替换 Blender 动作

把 Blender 导出的 `.glb` 动作文件放到：

```text
assets/animations/blender-wave.glb
```

也可以在页面里点“选择 GLB”临时试播一个文件。

## 文字表演

在“小景表演控制台”输入灵山讲解词后点击“播放文字表演”。Demo 会：

1. 只有“用户问题”是问句时，才进入思考状态并播放 `thinking.glb`；主动欢迎和普通陈述直接表演。
2. 根据“小景回答”选择挥手、讲解、指引或点头动作。只有“请看、这边、前方、左右侧”等明确方位表达才触发指引，普通景点、路线和历史介绍使用讲解动作。
3. 使用 VRM 表情通道叠加情绪、自动眨眼和模拟口型。
4. 调用浏览器中文语音朗读；结束后回到自然待机。

这是验证交互方向的原型。正式接入项目时，语音和口型时间轴应复用项目现有 TTS 数据。

GLB 身体动作采用相对首帧的旋转差进行重定向，并叠加到 VRM 的自然 A Pose。静态头发、裙摆等二级骨骼轨道不会覆盖当前模型姿态。

自然待机期间会每隔约 4.5 至 8.5 秒，从 `waiting1.glb`、`waiting2.glb`、`waiting3.glb` 中随机选择一个播放。三个动作也可以在“手动动作测试”区域单独触发。

数字人正在讲解或播放语音时，随机 waiting 调度会暂停，只保留自然呼吸、眨眼、口型和当前讲解动作。语音结束后重新开始待机计时。

## 动作与表情配对

页面“表情单独预览”区域可以在不播放语音和身体动作的情况下，直接切换中性、开心、思考、专注、平静、关切、惊讶和严肃表情。进入预览时镜头会自动切到面部近景，并暂停随机 waiting；开始问答或身体动作时恢复全身镜头。

当前 VRM 0 模型原生提供 `Neutral / Angry / Fun / Joy / Sorrow / Surprised` 六类情绪基底。语义表情分别使用不同基底或不同权重组合，不代表模型拥有八套独立的原生 BlendShape。

该模型自带的 Surprised BlendShape 实际表现为眯眼微笑，因此 Demo 不直接使用它；surprised 由反向眼睑展开和 O 圆嘴口型组合，避免与 happy 混淆。

| 动作 | 默认表情 | 说明 |
|---|---|---|
| `wave` | `happy` | 轻微开心，欢迎或告别 |
| `thinking` | `thinking` | 低权重思考神态 |
| `listen` | `attentive` | 专注并保持轻微友好 |
| `explain` | `calm` | 平静讲解，配合实时口型 |
| `showcase`、`nod` | `happy` | 指引或肯定时轻微微笑 |
| `point-right`、`bow` | `calm` | 温和、中性的动作表情 |
| `waiting1/2/3`、`natural-idle` | `neutral` | 不附加情绪表情 |

回答内容可以覆盖动作的默认表情：抱歉、遗憾等内容使用 `concerned`，惊喜、壮观等内容使用 `surprised`。

## 文件说明

- `index.html`：文字驱动表演与独立动作测试页面
- `assets/red-ponytail.vrm`：测试用红衣单马尾 VRM 模型
- `assets/animations/blender-wave.glb`：默认测试动作
- `assets/animations/waiting1.glb`：轻量待机动作
- `assets/animations/waiting2.glb`：待机动作二
- `assets/animations/waiting3.glb`：待机动作三
- `vendor/`：本地 Three.js 和 three-vrm 依赖
