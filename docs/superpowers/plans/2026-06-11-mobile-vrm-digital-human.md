# 移动端 VRM 3D 数字人 · 实施计划书

> 日期：2026-06-11 | 关联设计：`2026-06-11-mobile-vrm-digital-human-design.md`  
> 状态标记：🔴 未开始 → 🔵 进行中 → ✅ 已完成

---

## 总览

| 步骤 | 内容 | 预估时间 | 依赖 |
|------|------|---------|------|
| Step 0 | PoC 兼容性验证 | 1-2 天 | 无 |
| Step 1 | 安装依赖 + 配置打包 | 2 小时 | Step 0 ✅ |
| Step 2 | VRMManager 扩展（模型加载） | 3 小时 | Step 1 |
| Step 3 | VRMView.tsx 实现 | 4-6 小时 | Step 2 |
| Step 4 | VRMIdleAnim.ts 实现 | 2-3 小时 | Step 3 |
| Step 5 | useVRMSync.ts 实现 | 2 小时 | Step 3 |
| Step 6 | VRMFloating.tsx 改造 | 2-3 小时 | Step 3, 4 |
| Step 7 | 对话页全屏集成 | 3-4 小时 | Step 3, 4, 5 |
| Step 8 | 各页面浮窗集成 | 3-4 小时 | Step 6 |
| Step 9 | 性能调优 + 真机测试 | 2-3 天 | Step 7, 8 |

**总计：约 10-14 天**（含 PoC 和调优）

---

## Step 0：PoC 兼容性验证

### 目标
在真机上验证 `expo-gl + three.js + @pixiv/three-vrm` 能否正常渲染 VRM 模型。

### 具体操作

**1. 创建 PoC 项目（临时）**
```bash
cd software/mobile
# 在现有项目中创建一个临时 PoC 入口，不污染主代码
# 创建 app/poc-vrm.tsx 作为测试页
```

**2. 安装依赖**
```bash
npx expo install expo-gl
npm install expo-three three @pixiv/three-vrm
```

**3. 复制一个 VRM 模型到 assets**
```bash
mkdir -p assets/models
cp ../../frontend/public/models/4353238926149796085.vrm assets/models/avatar.vrm
```

**4. 编写最小渲染 demo**

目标文件：`app/poc-vrm.tsx`

核心验证点：
- [ ] GLView onContextCreate 能获取 GL context
- [ ] `new Renderer({ gl })` 能创建 three.js renderer
- [ ] `GLTFLoader + VRMLoaderPlugin` 能加载 .vrm 文件
- [ ] `scene.add(vrm.scene)` 能显示模型
- [ ] `expressionManager.setValue('happy', 1)` 能切换表情
- [ ] `expressionManager.setValue('aa', 0.5)` 能控制口型
- [ ] requestAnimationFrame 渲染循环正常运行
- [ ] 帧率 ≥ 30fps（在真机上）

**5. 判断标准**

| 情况 | 处理 |
|------|------|
| 全部通过 | 采用方案 A（expo-gl）→ 进入 Step 1 |
| GL context 正常但 VRM 加载失败 | 尝试方案 B（WebView） |
| 帧率 < 15fps 或崩溃 | 尝试方案 B |
| Expo Go 不支持 expo-gl | 改用 dev client 或方案 B |

---

## Step 1：安装依赖 + 配置打包

### 1.1 安装依赖

```bash
cd software/mobile

# expo-gl（Expo 官方 WebGL 上下文）
npx expo install expo-gl

# three.js 生态
npm install expo-three three @pixiv/three-vrm

# 类型定义（如需）
npm install -D @types/three
```

### 1.2 配置 app.json 资源打包

在 `app.json` 中确认 `assetBundlePatterns` 包含模型目录：

```json
{
  "expo": {
    "assetBundlePatterns": [
      "assets/images/**",
      "assets/models/**"
    ]
  }
}
```

### 1.3 复制 VRM 模型

```bash
mkdir -p assets/models
# 选择一个最精致的模型作为主数字人（需人工评估）
cp ../../frontend/public/models/4353238926149796085.vrm assets/models/avatar.vrm
```

### 产出

- [x] `package.json` 新增 `expo-gl` / `three` / `expo-three` / `@pixiv/three-vrm`
- [x] `assets/models/avatar.vrm` 存在
- [x] `app.json` 配置正确

---

## Step 2：VRMManager.ts 扩展

### 2.1 当前状态

`VRMManager.ts` 已有：状态管理 + 事件系统（完整可用）  
缺失：VRM 模型加载 / three.js 控制方法

### 2.2 需要新增的内容

**追加到现有文件**（不重写，只扩展）：

```
新增 import：
  - THREE from 'three'
  - { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
  - { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
  - { Asset } from 'expo-asset'

新增私有成员：
  - private vrm: VRM | null = null
  - private loadingPromise: Promise<VRM> | null = null

新增方法：
  - async getOrLoad(): Promise<VRM>
      → 返回模型实例（懒加载，单例）
  - private async loadVRM(): Promise<VRM>
      → Asset.fromModule → downloadAsync → GLTFLoader → VRMLoaderPlugin
  - setExpressionPreset(name: string, value: number): void
      → vrm.expressionManager.setValue(name, value)
  - setLookAtTarget(x: number, y: number): void
      → vrm.lookAt.lookAt(Vector3)
  - update(dt: number): void
      → vrm.update(dt)（驱动 VRM 内部更新）
  - getVRM(): VRM | null
      → 返回当前模型实例
```

### 2.3 注意事项

- 现有 `speak() / setEmotion() / setPageContext()` 等方法保持不动
- `loadingPromise` 保证并发调用 `getOrLoad()` 时只加载一次
- 模型加载失败时 `vrm = null`，不阻塞其他功能

---

## Step 3：VRMView.tsx 实现

### 3.1 组件接口

```typescript
interface VRMViewProps {
  mode: 'full' | 'float';
  expression?: Emotion;
  mouthOpen?: number;      // 0-1
  lookAt?: { x: number; y: number };
  enableGesture?: boolean;
  outfitPreset?: string;
}
```

### 3.2 核心实现流程

```
组件挂载
  ↓
GLView onContextCreate(gl)
  ↓
创建 Renderer({ gl }) + Scene + Camera + Lights
  ↓
VRMManager.getOrLoad() → 获取 VRM 实例
  ↓
scene.add(vrm.scene)
  ↓
启动 requestAnimationFrame 循环：
  ├─ applyIdleAnimation(vrm, elapsed, dt)
  ├─ applyExpression(vrm, currentExpression)
  ├─ applyMouthOpen(vrm, currentMouthOpen)
  ├─ vrm.update(dt)
  ├─ renderer.render(scene, camera)
  └─ gl.endFrameEXP()
  ↓
Props 变化时更新 state（expression/mouthOpen/lookAt）
  ↓
组件卸载 → cancelAnimationFrame → 停止渲染循环
```

### 3.3 关键技术细节

**GLView 与 RN 叠层：**
- GLView 设置 `style={{ opacity: 1 }}` 时遮盖下层内容
- float 模式需要透明背景：`renderer.setClearColor(0x000000, 0)` + `gl.enable(gl.BLEND)`
- expo-gl 透明 GLView 需要 `msaaSamples={0}`（关闭抗锯齿，避免透明问题）

**帧率控制：**
- 全屏模式：每帧渲染
- 浮窗模式：每 2 帧渲染一次（约 30fps），用 `frameCount % 2 === 0` 控制

**离屏暂停：**
- 使用 `useFocusEffect` 监听页面焦点
- 失焦时 `cancelAnimationFrame`，得焦时恢复

### 3.4 手势旋转（全屏模式）

```
enableGesture=true 时：
  ├─ Pan gesture → 绕 Y 轴旋转相机
  ├─ Pinch gesture → 缩放相机 Z 轴距离
  └─ 手势结束时平滑回弹到默认视角
```

---

## Step 4：VRMIdleAnim.ts 实现

### 4.1 三个动画通道

**眨眼（blink）**
```
周期：3-5 秒随机间隔
动画：0 → 1 → 0，总时长 0.15s
实现：用随机数生成下次眨眼时间，到时间后触发
morph: expressionManager.setValue('blink', value)
```

**呼吸（breath）**
```
波形：sin(time * 2π / 3)  周期 3s
幅度：0.02（骨骼 Y 轴位移）
目标：胸骨或上半身骨骼
```

**头部微摆（headSway）**
```
波形：sin(time * 2π / 5) × 0.03（X 轴旋转）
     + cos(time * 2π / 7) × 0.02（Z 轴旋转）
周期：5s 和 7s（非谐波叠加，避免机械感）
目标：头部骨骼（head bone）
```

### 4.2 与口型/表情的协调

```
当 mouthOpen > 0 时：
  - 暂停眨眼（避免说话时眨眼不自然，可选）
  - 头部微摆幅度减半（说话时头部更稳定）
  - breath 正常进行

当 expression != 'neutral' 时：
  - 保持该表情直到 mouthOpen == 0 且持续 1s 后恢复 neutral
```

---

## Step 5：useVRMSync.ts 实现

### 5.1 Hook 接口

```typescript
interface VRMSyncResult {
  expression: Emotion;
  mouthOpen: number;
  isSpeaking: boolean;
  subtitle: string;
  triggerSpeak: (text: string, emotion?: Emotion) => void;
  stopSpeaking: () => void;
}

function useVRMSync(): VRMSyncResult
```

### 5.2 实现逻辑

```
useEffect:
  ├─ VRMManager.on('speak', handler)
  │    → setIsSpeaking(true)
  │    → setSubtitle(text)
  │    → setExpression(emotion)
  ├─ VRMManager.on('emotionChange', handler)
  │    → setExpression(emotion)
  ├─ VRMManager.on('mouthChange', handler)
  │    → setMouthOpen(value)
  ├─ VRMManager.on('stateChange', handler)
  │    → 全量同步
  └─ cleanup: VRMManager.off(...)

triggerSpeak(text, emotion):
  ├─ 调用 VRMManager.speak(text, emotion)
  ├─ 可选：并行调用 TTS API 获取音频
  └─ 可选：播放音频 + 用 AudioContext 分析音量驱动 mouthOpen
```

---

## Step 6：VRMFloating.tsx 改造

### 6.1 改动范围

**不变：**
- 拖拽手势逻辑（Gesture.Pan + offsetX/Y）
- 气泡字幕（speaking && subtitle → bubble）
- 名牌（"小灵"）
- 入场弹簧动画（expandScale）
- 说话光环（ring + ringScale/ringOpacity）
- onPress 回调

**改动：**
```diff
- <View style={styles.avatar}>
-   <Text style={styles.avatarEmoji}>🧑‍🦰</Text>
- </View>
+ <View style={styles.avatar}>
+   <VRMView
+     mode="float"
+     expression={currentEmotion}
+     mouthOpen={currentMouthOpen}
+   />
+ </View>
```

### 6.2 新增 state 接入

```
使用 useVRMSync() 获取：
  - currentEmotion
  - currentMouthOpen
  - isSpeaking → 控制光环
  - subtitle → 控制气泡
```

### 6.3 avatar 样式调整

```
现有：
  width: 72, height: 72, borderRadius: 36

改为：
  width: 72, height: 96（VRM 是立像，高度需更多）
  borderRadius: 12（圆角矩形）
  overflow: 'hidden'
  backgroundColor: 'transparent'（显示 3D 透明背景）
```

---

## Step 7：对话页全屏集成

### 7.1 布局变更

`app/(tabs)/chat.tsx` 当前布局未知，需要读取后设计集成方式。

目标布局：
```
<View style={{ flex: 1 }}>
  {/* VRM 区域 */}
  <VRMView
    mode="full"
    expression={sync.expression}
    mouthOpen={sync.mouthOpen}
    enableGesture
  />

  {/* 消息列表 */}
  <FlatList ... />

  {/* 输入栏 */}
  <ChatInput ... />
</View>
```

### 7.2 TTS 对接流程

```
用户发送消息 → API 获取回复
  ↓
回复文本 → VRMManager.speak(text, emotion)
  ↓
useVRMSync 监听到 speak 事件 → 更新 state
  ↓
VRMView 接收新 props → 渲染对应表情/口型
  ↓
同时：调用 /api/tts 获取音频 URL
  ↓
播放音频（expo-av Audio.Sound）
  ↓
（可选）用 Audio.analyseAudio 实时驱动 mouthOpen
```

---

## Step 8：各页面浮窗集成

### 8.1 需要改动的页面

| 页面文件 | 当前 VRMFloating | 改动 |
|---------|-----------------|------|
| `app/(tabs)/index.tsx` | ✅ 已有 | 无需改动（浮窗自动升级） |
| `app/(tabs)/explore.tsx` | ✅ 已有 | 无需改动 |
| `app/(tabs)/memory.tsx` | ✅ 已有 | 无需改动 |
| `app/history/index.tsx` | ✅ 已有 | 增加朝代 → 表情映射 |
| `app/attractions/[id].tsx` | ✅ 已有 | 进入时触发景点讲解 |
| `app/routes/[id].tsx` | ✅ 已有 | 进入时触发路线提示 |

### 8.2 VRMManager.setPageContext 调用时机

各页面 `useEffect` 中：
```typescript
useEffect(() => {
  VRMManager.setPageContext('attraction-detail', { spotName: spot.name });
  VRMManager.speak(VRMManager.getWelcomeText(), 'happy');
}, [spot.id]);
```

---

## Step 9：性能调优 + 真机测试

### 9.1 性能指标

| 指标 | 浮窗模式 | 全屏模式 | 目标 |
|------|---------|---------|------|
| 帧率 | 30fps | 60fps | 不卡顿 |
| 内存增量 | < 80MB | < 150MB | 不 OOM |
| CPU 占用 | < 15% | < 30% | 不发热 |
| App 整体内存 | < 300MB | < 400MB | 低端机可用 |

### 9.2 测试场景

```
□ 连续使用 10 分钟，观察帧率和发热
□ 快速切换 5 个页面，观察是否有内存泄漏
□ 在对话页持续 TTS 播放 2 分钟，观察口型同步
□ 低端机（骁龙 660 / 天玑 700）测试
□ 背景切换回前台，VRM 是否正常恢复
□ 多次浮窗 → 全屏 → 浮窗切换，无 GL 上下文丢失
```

### 9.3 降级措施

如果帧率不达标：
1. 浮窗模式降至 20fps
2. 关闭头部微摆（只保留眨眼+呼吸）
3. 降低 GLView 像素比至 0.5
4. 最终方案：浮窗改为静态图片 + 嘴型动画（2D）

---

## 文件变更清单

### 新建文件

```
software/mobile/
├── assets/models/avatar.vrm              # VRM 模型文件
├── components/vrm/VRMView.tsx           # 3D 渲染组件
├── components/vrm/VRMIdleAnim.ts        # idle 动画逻辑
└── hooks/useVRMSync.ts                  # TTS 同步 hook
```

### 修改文件

```
software/mobile/
├── components/vrm/VRMManager.ts         # 扩展模型加载 + three.js 控制方法
├── components/vrm/VRMFloating.tsx       # emoji → VRMView 替换
├── app/(tabs)/chat.tsx                  # 集成全屏 VRM
├── app/(tabs)/index.tsx                 # setPageContext 调用
├── app/(tabs)/explore.tsx               # setPageContext 调用
├── app/(tabs)/memory.tsx                # setPageContext 调用
├── app/history/index.tsx                # setPageContext + 朝代换装
├── app/attractions/[id].tsx             # setPageContext + 景点讲解
├── app/routes/[id].tsx                  # setPageContext + 路线提示
├── package.json                         # 新增依赖
└── app.json                             # assetBundlePatterns 配置
```

### 可选删除（PoC 完成后）

```
software/mobile/
└── app/poc-vrm.tsx                      # PoC 临时测试页（完成后删除）
```

---

## 依赖版本锁定

| 包名 | 版本 | 用途 |
|------|------|------|
| `expo-gl` | ~15.0.0 | WebGL 上下文 |
| `expo-three` | ^8.0.0 | three.js RN 适配 |
| `three` | ^0.170.0 | 3D 引擎 |
| `@pixiv/three-vrm` | ^3.5.0 | VRM 加载/渲染 |

---

## 验收标准

### 功能验收

- [ ] App 启动后，首页浮窗显示 3D VRM 数字人（非 emoji）
- [ ] 数字人有 idle 动画（眨眼、呼吸、头部微摆）
- [ ] 对话页全屏显示 VRM，可手势旋转
- [ ] TTS 播放时口型同步，表情跟随对话情绪
- [ ] 各页面浮窗数字人根据页面上下文有对应行为
- [ ] 页面切换时 VRM 不重新加载（全局单例）

### 性能验收

- [ ] 浮窗模式帧率 ≥ 30fps
- [ ] 全屏模式帧率 ≥ 50fps
- [ ] App 整体内存 < 400MB
- [ ] 连续运行 10 分钟无明显发热
- [ ] 低端机（骁龙 660 级）可运行，帧率 ≥ 20fps

---

**文档版本**：v1.0  
**创建日期**：2026-06-11  
**最后更新**：2026-06-11  
**状态**：待评审
