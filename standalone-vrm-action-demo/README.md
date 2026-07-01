# Standalone VRM Blender Action Demo

这是一个和移动端项目无关的独立 VRM 动作测试页。

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

## 文件说明

- `index.html`：独立测试页面
- `assets/red-ponytail.vrm`：测试用红衣单马尾 VRM 模型
- `assets/animations/blender-wave.glb`：默认测试动作
- `vendor/`：本地 Three.js 和 three-vrm 依赖
