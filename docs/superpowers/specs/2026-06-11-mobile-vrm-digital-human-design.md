# 移动端 VRM 3D 数字人集成设计

> 日期：2026-06-11 | 状态：待评审 | 范围：`software/mobile/`

---

## 一、背景与现状

### 1.1 已有资产

| 资产 | 路径 | 状态 |
|------|------|------|
| VRM 模型 ×7 | `frontend/public/models/*.vrm` | ✅ 可直接复用 |
| Web 端 Live2DStage | `frontend/src/components/DigitalHuman/Live2DStage.tsx` | ✅ 参考实现（vanilla three.js 风格） |
| 移动端 VRMManager | `mobile/components/vrm/VRMManager.ts` | ✅ 状态管理逻辑完整（表情/口型/页面上下文） |
| 移动端 VRMFloating | `mobile/components/vrm/VRMFloating.tsx` | ⚠️ emoji 占位符，UI 框架完整，渲染层待替换 |
| 迁移方案文档 | `docs/mobile-migration/react-native-migration-plan.md` | ✅ 已确定 VRM 3D 方案 |

### 1.2 当前缺失

- **无 3D 渲染库**：`package.json` 不含 `three` / `expo-gl` / `@pixiv/three-vrm`
- **无 VRM 模型文件**：`mobile/assets/` 中没有 `.vrm` 文件
- **无 3D 渲染组件**：无 `VRMView.tsx` 或等价组件
- **无 idle 动画逻辑**：blink / breath / headSway 仅在 Web 端 Live2DStage 中实现

### 1.3 VRMManager.ts 已有能力（可直接复用）

```
speak(text, emotion, duration)   → 触发说话 + 表情
stopSpeaking()                   → 停止说话
setEmotion(emotion)              → 设置表情 (neutral/happy/sad/angry/relaxed/surprised)
setPageContext(context, data)    → 设置页面上下文（驱动开场白）
getWelcomeText()                 → 获取当前页面欢迎语
getQuickQuestions()              → 获取当前页面快捷问题
on/off(event, callback)          → 事件监听 (speak/emotionChange/mouthChange/stateChange)
```

---

## 二、技术方案选择

### 方案 A：expo-gl + three.js + @pixiv/three-vrm（推荐）

```
┌─────────────────────────────────────────┐
│            React Native 进程            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  GLView (expo-gl, 原生 OpenGL)    │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  three.js WebGLRenderer     │  │  │
│  │  │  + @pixiv/three-vrm         │  │  │
│  │  │  + idle动画 / 口型 / 表情   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  VRMManager.ts ←→ VRMView.tsx          │
│  (状态)           (渲染 + 动画)         │
└─────────────────────────────────────────┘
```

| 维度 | 评估 |
|------|------|
| 渲染质量 | ★★★★★ 原生 OpenGL，全效果支持 |
| 性能 | ★★★★☆ 原生 GL 上下文，无跨进程开销 |
| 集成复杂度 | ★★★★☆ RN props 直驱，无需桥接 |
| 包体积 | ★★★☆☆ +three.js ~2MB（gzip ~600KB）|
| Expo Go 兼容 | ★★☆☆☆ 需 eject 或使用 dev client |

**风险**：`@pixiv/three-vrm` 对 React Native 环境兼容性需提前 PoC 验证。

### 方案 B：WebView + Three.js（降级方案）

```
┌─────────────────────────────────────────┐
│            React Native 进程            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  react-native-webview             │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  本地 HTML + Three.js       │  │  │
│  │  │  + @pixiv/three-vrm         │  │  │
│  │  │  (独立 JS 上下文)           │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│         ↕ postMessage 桥接              │
│  VRMManager.ts                          │
└─────────────────────────────────────────┘
```

| 维度 | 评估 |
|------|------|
| 渲染质量 | ★★★★★ 浏览器 WebGL，全效果支持 |
| 性能 | ★★★☆☆ 额外 WebView 进程，内存开销大 |
| 集成复杂度 | ★★☆☆☆ postMessage 桥接，表情/口型延迟 |
| 包体积 | ★★★☆☆ WebView 引擎 + three.js |
| Expo Go 兼容 | ★★★★★ 完全兼容 |

**适用场景**：方案 A PoC 不通过时降级使用。

### 方案 C：预渲染视频/序列帧（保底方案）

| 维度 | 评估 |
|------|------|
| 性能 | ★★★★★ 视频播放，极低开销 |
| 交互性 | ★☆☆☆☆ 无法动态切换表情/口型 |
| 效果 | ★★☆☆☆☆ 固定动作，无实时响应 |

**仅在 A/B 均失败时考虑，不推荐。**

### 方案选择结论

> **首选方案 A（expo-gl）**，开工前必须先做 PoC（1-2 天）。  
> **PoC 不通过则降级方案 B（WebView）**。  
> **方案 C 为最终保底**。

---

## 三、整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        mobile/                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               VRMManager.ts（已有，单例）                │    │
│  │  状态：emotion / isSpeaking / mouthOpen / pageContext    │    │
│  │  事件：on('speak') / on('emotionChange') / ...           │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │ 事件驱动                               │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │              VRMView.tsx（新建，3D 渲染）                 │    │
│  │  ┌────────────────────────────────────────────────┐     │    │
│  │  │  expo-gl GLView                                │     │    │
│  │  │  ┌──────────────────────────────────────┐     │     │    │
│  │  │  │  three.js Scene / Camera / Lights    │     │     │    │
│  │  │  │  + @pixiv/three-vrm VRM 模型         │     │     │    │
│  │  │  │  + VRMIdleAnim (blink/breath/sway)   │     │     │    │
│  │  │  └──────────────────────────────────────┘     │     │    │
│  │  └────────────────────────────────────────────────┘     │    │
│  │  Props: mode / expression / mouthOpen / lookAt           │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │           VRMFloating.tsx（改造，升级渲染层）              │    │
│  │  • 保留：拖拽手势 / 气泡 / 名牌 / 缩放动画              │    │
│  │  • 替换：emoji → VRMView (mode="float")                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           useVRMSync.ts（新建，TTS 同步 hook）            │    │
│  │  • 监听 VRMManager 事件                                 │    │
│  │  • 驱动 expression / mouthOpen state                    │    │
│  │  • 供页面组件消费，传入 VRMView                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 四、文件清单

### 4.1 新建文件

```
mobile/
├── assets/models/
│   └── avatar.vrm                  # 复制自 frontend/public/models/ 中选定模型
│
├── components/vrm/
│   ├── VRMView.tsx                 # 核心 3D 渲染组件
│   ├── VRMIdleAnim.ts             # idle 动画（blink/breath/headSway）
│   └── vrm-scene.html             # [仅方案B] WebView 渲染用 HTML
│
└── hooks/
    └── useVRMSync.ts              # TTS → 口型/表情 同步 hook
```

### 4.2 修改文件

```
mobile/
├── components/vrm/
│   ├── VRMManager.ts             # 扩展：增加模型加载逻辑 / getOrLoad()
│   └── VRMFloating.tsx           # 改造：emoji → VRMView
│
├── app/(tabs)/chat.tsx           # 集成：全屏 VRMView + 手势旋转
├── app/(tabs)/index.tsx          # 集成：浮窗 VRMFloating 已含 VRM
├── app/(tabs)/explore.tsx        # 集成：同上
├── app/(tabs)/memory.tsx         # 集成：同上
├── app/history/index.tsx         # 集成：浮窗 + 朝代换装
├── app/attractions/[id].tsx      # 集成：浮窗讲解
├── app/routes/[id].tsx           # 集成：浮窗导航
│
└── package.json                  # 新增依赖
```

---

## 五、核心组件设计

### 5.1 VRMView.tsx — 3D 渲染组件

```typescript
// components/vrm/VRMView.tsx

interface VRMViewProps {
  mode: 'full' | 'float';
  expression?: Emotion;        // neutral | happy | sad | angry | relaxed | surprised
  mouthOpen?: number;          // 0-1，口型开合度
  lookAt?: { x: number; y: number };  // 视线方向 -1~1
  enableGesture?: boolean;     // 全屏模式：开启手势旋转
  outfitPreset?: string;       // 服装预设名
}
```

**关键实现点：**

- `expo-gl` 的 `GLView` 提供原生 WebGL 上下文
- `expo-three` 的 `Renderer` 适配 RN 的 GL context（处理 `endFrameEXP`）
- VRM 模型从全局 `VRMManager.getOrLoad()` 获取，不重复加载
- `mode='full'` 时高度 380pt，支持手势旋转（react-native-gesture-handler Pan/Pinch）
- `mode='float'` 时尺寸 72×96pt，固定视角，无手势，背景透明
- `requestAnimationFrame` 驱动渲染循环，每帧调用 `vrm.update(dt)` + `gl.endFrameEXP()`
- 空闲时保持渲染（idle 动画需要持续更新），但可降频至 30fps 节省电量

**两种模式的尺寸与行为：**

```
full 模式（对话页）              float 模式（其他页面）
┌──────────────────────┐        ┌──────────┐
│                      │        │  VRM 3D  │
│    VRM 3D 角色       │        │  72×96pt │
│    可手势旋转        │        │  圆角 12  │
│    380pt 高          │        └──────────┘
│                      │         透明背景
└──────────────────────┘         无手势
```

### 5.2 VRMIdleAnim.ts — 空闲动画

从 Web 端 `Live2DStage.tsx` 移植核心逻辑，不依赖 pixi.js：

```typescript
// components/vrm/VRMIdleAnim.ts

export function applyIdleAnimation(vrm: VRM, elapsed: number, dt: number) {
  // 1. 眨眼：每 3-5 秒随机触发，持续 0.15s
  //    vrm.expressionManager.setValue('blink', value)

  // 2. 呼吸：sin 波形，周期 3s，幅度 0.02
  //    通过骨骼位移实现胸部微起伏

  // 3. 头部微摆：sin/cos 叠加，周期 4-7s
  //    vrm.lookAt 或头部骨骼旋转
}

export function applyMouthOpen(vrm: VRM, value: number) {
  // value: 0-1
  // vrm.expressionManager.setValue('aa', value)  // VRM 标准口型 morph
}

export function applyExpression(vrm: VRM, emotion: Emotion) {
  // Emotion → VRMExpressionPresetName 映射
  // happy → 'happy'
  // sad → 'sad'
  // angry → 'angry'
  // relaxed → 'relaxed'
  // surprised → 'surprised'
  // neutral → 'neutral'
}
```

### 5.3 VRMManager.ts 扩展

在现有基础上增加模型加载管理能力：

```typescript
// 扩展部分（追加到现有 VRMManager.ts）

class VRMManagerClass {
  // ... 现有代码保持不变 ...

  // 新增：VRM 模型实例管理
  private vrm: VRM | null = null;
  private loadingPromise: Promise<VRM> | null = null;

  async getOrLoad(): Promise<VRM> {
    if (this.vrm) return this.vrm;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.loadVRM();
    this.vrm = await this.loadingPromise;
    return this.vrm;
  }

  private async loadVRM(): Promise<VRM> {
    const asset = Asset.fromModule(require('../../assets/models/avatar.vrm'));
    await asset.downloadAsync();
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(asset.localUri!);
    const vrm = gltf.userData.vrm as VRM;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletones(gltf.scene);
    // 旋转模型使其面向相机（VRM 默认朝向 Z-）
    VRMUtils.rotateVRM0(vrm, Math.PI);
    return vrm;
  }

  // 供 VRMView 调用的实时控制方法
  setExpressionPreset(name: string, value: number) {
    this.vrm?.expressionManager?.setValue(name, value);
  }

  setLookAtTarget(x: number, y: number) {
    this.vrm?.lookAt?.lookAt(new THREE.Vector3(x * 3, 1.3 + y * 2, 2));
  }

  update(dt: number) {
    this.vrm?.update(dt);
  }
}
```

### 5.4 useVRMSync.ts — TTS 同步 Hook

```typescript
// hooks/useVRMSync.ts
// 供页面组件使用，将 VRMManager 事件转化为 React state

interface VRMSyncState {
  expression: Emotion;
  mouthOpen: number;
  isSpeaking: boolean;
  subtitle: string;
}

export function useVRMSync(): VRMSyncState & {
  triggerSpeak: (text: string, emotion?: Emotion) => void;
}
```

**流程：**

```
页面调用 triggerSpeak(text, emotion)
    ↓
VRMManager.speak(text, emotion)
    ↓ emit('speak') / emit('emotionChange')
useVRMSync 监听事件 → 更新 state
    ↓
VRMView 接收 props → 渲染对应表情/口型
    ↓
同时调用 TTS API 播放音频（可选）
```

---

## 六、模型资源处理

### 6.1 模型选择

现有 7 个 VRM 模型，建议：

| 用途 | 模型选择原则 | 目标 |
|------|-------------|------|
| 主数字人（小灵） | 选取 1 个最精致的作为 `avatar.vrm` | 全 App 通用 |
| 服装/角色切换 | 保留其余模型，按需加载 | VRM Demo 页 / 换装功能 |

### 6.2 模型存放路径

```
mobile/assets/models/
├── avatar.vrm          # 主模型，打包进 App（~5-15MB）
└── (其他角色.vrm)      # 可选，按需从服务端下载
```

### 6.3 模型打包注意事项

- `app.json` 的 `assetBundlePatterns` 需包含 `assets/models/**`
- VRM 文件通过 `expo-asset` 加载，`Asset.fromModule(require(...))` 会自动打包
- 模型建议预处理：减面（<50K 顶点）、压缩纹理（KTX2/ASTC），控制包体积
- 目标：主模型 < 10MB（含纹理）

---

## 七、各页面集成方案

### 7.1 集成总览

| 页面 | VRM 模式 | 触发条件 | 数字人行为 |
|------|---------|---------|-----------|
| 首页 `(tabs)/index` | 浮窗 | 页面加载 | 欢迎语 + neutral 表情 |
| 对话 `(tabs)/chat` | 全屏 | 页面加载 | TTS 口型同步 + 表情联动 + 手势旋转 |
| 探索 `(tabs)/explore` | 浮窗 | 页面加载 | 扫码/识别成功后 surprise + 讲解 |
| 记忆 `(tabs)/memory` | 浮窗 | 页面加载 | 浏览记忆时 neutral |
| 景点详情 `attractions/[id]` | 浮窗 | 进入页面 | "这是XX景点..." + happy 表情 |
| 路线详情 `routes/[id]` | 浮窗 | 进入页面 | 路线讲解 + 导航提示 |
| 时空穿越 `history/index` | 浮窗 | 切换朝代 | 朝代换装 + 历史旁白 |

### 7.2 VRMFloating 改造要点

现有 `VRMFloating.tsx` 保留：
- ✅ 拖拽手势（Gesture.Pan）
- ✅ 气泡字幕（speaking + subtitle）
- ✅ 名牌（"小灵"）
- ✅ 入场弹簧动画
- ✅ 说话时的扩散光环

替换：
```
- <Text style={styles.avatarEmoji}>🧑‍🦰</Text>
+ <VRMView mode="float" expression={currentEmotion} mouthOpen={mouthValue} />
```

### 7.3 对话页全屏集成

`app/(tabs)/chat.tsx` 布局：

```
┌──────────────────────────┐
│  VRMView mode="full"     │  ← 380pt 高，可手势旋转
│  expression={expr}       │
│  mouthOpen={mouth}       │
├──────────────────────────┤
│  FlatList (消息列表)     │
├──────────────────────────┤
│  ChatInput (输入栏)      │
└──────────────────────────┘
```

---

## 八、性能优化

### 8.1 渲染策略

| 策略 | 实现方式 |
|------|---------|
| 全局单例加载 | `VRMManager.getOrLoad()` 只加载一次，页面切换复用模型实例 |
| 浮窗降分辨率 | float 模式 GLView 像素比设为 0.75，减少 GPU 负担 |
| 限制帧率 | 浮窗模式限制 30fps，全屏模式 60fps |
| 离屏暂停 | 页面不可见时（`useFocusEffect`）停止渲染循环 |
| 模型预处理 | 减面 + 纹理压缩，控制 draw calls < 50 |

### 8.2 内存控制

- 全 App 只保留 1 个 VRM 实例在内存
- 浮窗 GLView 销毁时不释放 VRM（保留在 VRMManager 单例中）
- 切换到对话页全屏时，复用同一实例，不重新加载
- 目标：VRM 相关内存占用 < 150MB

### 8.3 发热控制

- 浮窗模式：30fps + 降像素比 + 简化 idle 动画（仅眨眼+呼吸，无头部摆动）
- 全屏模式：60fps + 完整 idle 动画
- 后台/离屏时：完全停止 requestAnimationFrame

---

## 九、依赖清单

新增依赖（追加到现有 `package.json`）：

```json
{
  "expo-gl": "~15.0.0",
  "expo-three": "^8.0.0",
  "three": "^0.170.0",
  "@pixiv/three-vrm": "^3.5.0"
}
```

**安装命令：**

```bash
cd software/mobile
npx expo install expo-gl
npm install expo-three three @pixiv/three-vrm
```

> ⚠️ **Expo Go 限制**：`expo-gl` 和原生 three.js 在 Expo Go 中可能不受支持。  
> 如出现兼容性问题，需使用 `npx expo run:android` / `npx expo run:ios` 构建 dev client。  
> 方案 B（WebView）可作为无需 eject 的备选。

---

## 十、PoC 验证清单

**正式开发前必须完成（预计 1-2 天）：**

```
□ 1. 新建最小 Expo 项目，安装 expo-gl + three + @pixiv/three-vrm
□ 2. 加载 avatar.vrm，在手机上显示
□ 3. 验证：能否正常渲染？帧率多少？（目标 ≥ 30fps）
□ 4. 验证：expressionManager.setValue() 能否切换表情？
□ 5. 验证：mouthOpen (aa morph) 能否响应？
□ 6. 验证：expo-gl GLView 是否能与 RN View 正常叠层？
□ 7. 测量：内存增量（目标 < 150MB）
□ 8. 测量：连续运行 5 分钟是否发热严重？
```

**通过标准**：帧率 ≥ 30fps、表情/口型可控制、无崩溃、内存 < 300MB（App 整体）  
**不通过**：切换到方案 B（WebView）

---

## 十一、实施步骤

### 第一步：PoC 验证（Day 1-2）

1. 安装依赖，运行最小 demo
2. 在真机上验证 VRM 渲染可行性
3. 确定最终采用方案 A 还是方案 B

### 第二步：核心组件开发（Day 3-5）

```
□ 实现 VRMManager.getOrLoad() — 模型加载单例
□ 实现 VRMView.tsx — expo-gl 3D 渲染组件（full + float 两种模式）
□ 实现 VRMIdleAnim.ts — blink / breath / headSway 动画
□ 实现 useVRMSync.ts — TTS → expression/mouthOpen state 同步
```

### 第三步：VRMFloating 改造（Day 5-6）

```
□ 替换 emoji 为 VRMView (mode="float")
□ 对接 VRMManager 事件驱动表情/口型
□ 保持现有拖拽/气泡/名牌/动画不变
□ 各 Tab 页面验证浮窗显示正常
```

### 第四步：对话页全屏集成（Day 6-7）

```
□ chat.tsx 集成 VRMView (mode="full")
□ 实现手势旋转（react-native-gesture-handler Pan/Pinch）
□ 对接 TTS API + 口型同步
□ 表情根据对话内容自动切换
```

### 第五步：各页面集成（Day 7-9）

```
□ 首页 — 浮窗欢迎语
□ 景点详情 — 浮窗景点讲解
□ 路线详情 — 浮窗路线提示
□ 时空穿越 — 浮窗朝代换装 + 旁白
□ 探索页 — 浮窗 + 扫码/识别触发讲解
```

### 第六步：性能调优（Day 9-10）

```
□ 帧率监测与限制
□ 内存峰值测量
□ 离屏暂停逻辑验证
□ 发热测试（连续运行 10 分钟）
□ 低端机型适配（骁龙 660 级别）
```

---

## 十二、风险与对策

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| `@pixiv/three-vrm` 不兼容 RN | 高 | 中 | PoC 先验证；降级方案 B（WebView） |
| Expo Go 不支持 expo-gl | 高 | 高 | 使用 dev client 构建；或降级方案 B |
| VRM 帧率过低 / 发热 | 中 | 高 | 降帧率 / 降像素比 / 简化浮窗动画 |
| 多 GLView 实例冲突 | 中 | 中 | 全局单例，同时只挂载 1 个 VRMView |
| 模型文件过大影响包体积 | 低 | 低 | 预处理减面 + 纹理压缩，目标 < 10MB |
| VRM 表情名与 Emotion 类型不匹配 | 低 | 低 | 建立 Emotion → VRMExpression 映射表，提前验证 |

---

## 十三、Emotion → VRM 表情映射

```typescript
const EMOTION_MAP: Record<Emotion, string> = {
  neutral:   'neutral',
  happy:     'happy',
  sad:       'sad',
  angry:     'angry',
  relaxed:   'relaxed',
  surprised: 'surprised',
};
```

> VRM 标准预设表情（VRMExpressionPresetName）与 VRMManager 的 Emotion 类型一一对应，  
> 如实际模型不含某预设，则降级为 `neutral` + 自定义 morph 组合。

---

**文档版本**：v1.0  
**创建日期**：2026-06-11  
**最后更新**：2026-06-11  
**状态**：待评审
