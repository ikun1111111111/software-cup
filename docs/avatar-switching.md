# 形象切换功能

## 功能概述

形象切换让用户在管理后台选择不同的数字人外观，预览区实时反映变化。

## 数据流

```
用户点击形象选项
  → AvatarAppearance.onChange(newConfig)
  → AvatarPage.handleAppearanceChange()
  → config.appearance.model 更新
  → getModelPath(config.appearance.model) 查找 Live2D 路径
  → <DigitalHuman modelPath={...}> 接收新路径
  → <Live2DStage modelPath={...}> 通过 pixi-live2d-display 加载模型
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `frontend/src/config/avatarModels.ts` | 模型 ID → Live2D 文件路径映射 |
| `frontend/src/pages/admin/AvatarPage.tsx` | 管理页面，组装预览和配置面板 |
| `frontend/src/components/admin/AvatarAppearance.tsx` | 外观选择 UI（模型/皮肤/发型/服装/饰品） |
| `frontend/src/components/DigitalHuman/DigitalHuman.tsx` | 数字人组件，接收 modelPath prop |
| `frontend/src/components/DigitalHuman/Live2DStage.tsx` | PIXI 渲染层，加载 .model3.json |

## 当前状态

三个 model ID（model-1/2/3）目前都指向同一个 Live2D 模型（haru）。

**外观联动：** 皮肤选择会驱动 Live2D 表情切换，产生可见的视觉变化：

| 皮肤 ID | 表情名 | 效果 |
|---------|--------|------|
| `skin-1`（默认肤色） | `f00` | 默认表情 |
| `skin-2`（白皙） | `f01` | 明亮表情 |
| `skin-3`（小麦色） | `f02` | 温暖表情 |

发型、服装、饰品为 UI 层占位，暂不影响 Live2D 渲染。添加新模型后可扩展为纹理/参数映射。

## 如何添加新 Live2D 模型

1. 将模型文件夹放入 `public/models/<name>/`，确保包含 `.model3.json` 文件
2. 在 `frontend/src/config/avatarModels.ts` 的 `MODEL_MAP` 中添加映射：

```ts
export const MODEL_MAP: Record<string, string> = {
  'model-1': '/models/haru/haru_greeter_t03.model3.json',
  'model-2': '/models/new-model/new-model.model3.json',  // 新增
  'model-3': '/models/haru/haru_greeter_t03.model3.json',
};
```

3. 无需修改其他文件，`getModelPath()` 会自动解析新路径
