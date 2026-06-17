# React Native 迁移方案

> 将灵山胜境智慧旅游 Web 应用迁移为 React Native 移动端 App  
> **版本**: v5.0 | **日期**: 2026-06-08 | **状态**: 决策已确认，待实施

---

## 〇、已确认决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| **框架选型** | Expo (managed workflow) | 开箱即用，比赛展示友好 |
| **数字人** | ✅ **VRM 3D 模型** | 复用现有 VRMStage，适配到 RN |
| **3D 模型 (VRM Demo)** | ✅ 保留 | @react-three/fiber + expo-gl |
| **管理后台** | ❌ 不迁移 | 保持 Web 版 |
| **禅径通幽** | ✅ 重构为地图导航 | VRM 数字人带路 |
| **旅行记忆** | ✅ 保留 | 原样迁移 |
| **时空穿越** | ✅ 重构为动画讲解 | VRM 数字人讲解 |

---

## 一、数字人方案：VRM 3D（更新）

### 1.1 为什么用 VRM

| 优势 | 说明 |
|------|------|
| 复用现有资源 | 项目已有 `avatar.vrm` 模型 + 8 套服装预设 |
| 复用现有逻辑 | VRMStage.tsx 已有完整的 idle 动画、表情、口型同步 |
| 效果最好 | 3D 角色 + 眨眼 + 呼吸 + 口型同步 + 头部微动 |
| 表情丰富 | happy/angry/sad/relaxed/surprised，匹配对话情绪 |
| 服装系统 | 8 套服装预设可切换 |

### 1.2 RN 适配策略

**现有 VRMStage 是 vanilla Three.js**（非 R3F 声明式），核心依赖：
- `THREE.WebGLRenderer` → RN 用 `expo-gl` 的 GLView
- `OrbitControls` → 用 `react-native-gesture-handler` 替代
- `ResizeObserver` → 用 `onLayout` 替代
- DOM 操作 → 全部移除
- `requestAnimationFrame` → RN 原生支持

### 1.3 全局 VRM 管理器（关键架构）

数字人出现在 **4 个页面**，每次都加载模型太重。用一个全局单例：

```
┌─────────────────────────────────────────┐
│           VRMManager (全局单例)          │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ VRM 模型 │  │ 场景/灯光 │  ← 只加载  │
│  │ (单例)   │  │ (单例)   │    一次     │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────────────────────────┐      │
│  │  API: setExpression / setMouth│      │
│  │       setLookAt / setOutfit  │      │
│  └──────────────────────────────┘      │
└─────────────────────────────────────────┘
          │
    ┌─────┼─────┬──────┐
    ▼     ▼     ▼      ▼
  对话页 导航页 历史页  首页
 (全屏) (浮窗) (浮窗) (浮窗)
```

- 模型只加载一次，后续页面切换复用
- 不同页面只是不同尺寸的"窗口"
- 全屏模式（对话页）：带 OrbitControls 手势旋转
- 浮窗模式（导航/历史/首页）：固定视角，自动 idle 动画

### 1.4 两种显示模式

```
全屏模式（对话页）              浮窗模式（导航/历史/首页）
┌───────────────────┐          ┌─────────────────────────┐
│                   │          │  其他页面内容            │
│                   │          │                         │
│   VRM 3D 角色     │          │  ┌──────┐               │
│   (可手势旋转)     │          │  │ VRM  │ 对话气泡       │
│                   │          │  │ 小窗 │ 或导航文字      │
│                   │          │  └──────┘               │
│                   │          │                         │
│  ─────────────    │          └─────────────────────────┘
│  💬 消息/控制      │
└───────────────────┘          尺寸：约 80×110pt
尺寸：约 300×400pt              位置：右下角悬浮
```

### 1.5 各页面数字人行为

| 页面 | 模式 | 表情 | 口型 | 交互 |
|------|------|------|------|------|
| 对话 | 全屏 | 根据回复切换 | TTS 播放时同步 | 手势旋转 |
| 地图导航 | 浮窗 | neutral → happy | 讲解时同步 | 无 |
| 时空穿越 | 浮窗 | surprised/relaxed | 旁白时同步 | 无 |
| 首页 | 浮窗 | neutral | 不说话时关闭 | 可点击展开对话 |

---

## 二、VRM RN 适配技术方案

### 2.1 核心组件：VRMView（expo-gl）

```typescript
// components/vrm/VRMView.tsx
import { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GLView, GLViewProps } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';

interface VRMViewProps {
  mode: 'full' | 'float';
  expression?: VRMExpressionPresetName | 'neutral';
  mouthOpen?: number;       // 0-1 口型开合
  lookAt?: { x: number; y: number };
  outfitPreset?: string;
  enableGesture?: boolean;  // 全屏模式开启手势旋转
}

export function VRMView({
  mode,
  expression = 'neutral',
  mouthOpen = 0,
  lookAt = { x: 0, y: 0 },
  enableGesture = false,
}: VRMViewProps) {
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const vrmRef = useRef<VRM | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { width, height };
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / Math.max(height, 1);
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const onContextCreate = useCallback(async (gl: any) => {
    const { width, height } = sizeRef.current;

    // 创建 Three.js renderer（使用 expo-gl context）
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // 透明背景
    rendererRef.current = renderer;

    // 场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xB4D4FF, 0.3);
    fill.position.set(-2, 3, -1);
    scene.add(fill);

    // 相机
    const camera = new THREE.PerspectiveCamera(30, width / Math.max(height, 1), 0.1, 20);
    camera.position.set(0, 1.3, 2.0);
    cameraRef.current = camera;

    // 加载 VRM（从全局管理器获取或首次加载）
    vrmRef.current = await VRMManager.getOrLoad();
    if (vrmRef.current) {
      scene.add(vrmRef.current.scene);
    }

    // 启动渲染循环
    const render = () => {
      // ... idle animation (blink, breath, head sway)
      // 复用 VRMStage.tsx 的动画逻辑
      vrmRef.current?.update(dt);
      renderer.render(scene, camera);
      gl.endFrameEXP(); // expo-gl 需要
    };

    // requestAnimationFrame loop
    const animate = () => {
      render();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  return (
    <View style={[
      styles.container,
      mode === 'full' ? styles.fullMode : styles.floatMode,
    ]} onLayout={onLayout}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
        msaaSamples={4} // 抗锯齿
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  fullMode: { width: '100%', height: 400 },
  floatMode: { width: 80, height: 110, borderRadius: 12 },
});
```

### 2.2 全局 VRM 管理器

```typescript
// components/vrm/VRMManager.ts
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Asset } from 'expo-asset';

class VRMManagerClass {
  private vrm: VRM | null = null;
  private loading: Promise<VRM> | null = null;

  async getOrLoad(): Promise<VRM> {
    if (this.vrm) return this.vrm;
    if (this.loading) return this.loading;

    this.loading = this.load();
    this.vrm = await this.loading;
    return this.vrm;
  }

  private async load(): Promise<VRM> {
    // 从本地 assets 加载 VRM
    const asset = Asset.fromModule(require('../../assets/models/avatar.vrm'));
    await asset.downloadAsync();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(asset.localUri!, resolve, undefined, reject);
    });

    const vrm = gltf.userData?.vrm as VRM;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletones(gltf.scene);

    return vrm;
  }

  setExpression(name: string, value: number) {
    this.vrm?.expressionManager?.setValue(name, value);
  }

  setMouthOpen(value: number) {
    this.vrm?.expressionManager?.setValue('aa', value);
  }

  setLookAt(x: number, y: number) {
    this.vrm?.lookAt?.lookAt(new THREE.Vector3(x * 3, 1.3 + y * 2, 2));
  }

  getVRM() {
    return this.vrm;
  }
}

export const VRMManager = new VRMManagerClass();
```

### 2.3 对话页集成

```typescript
// app/(tabs)/chat.tsx（简化）
import { VRMView } from '../../components/vrm/VRMView';

export default function ChatPage() {
  const [expression, setExpression] = useState('neutral');
  const [mouthOpen, setMouthOpen] = useState(0);

  return (
    <View style={{ flex: 1 }}>
      {/* VRM 全屏展示 */}
      <VRMView
        mode="full"
        expression={expression}
        mouthOpen={mouthOpen}
        enableGesture
      />

      {/* 消息列表 */}
      <FlatList ... />

      {/* 输入栏 */}
      <ChatInput ... />
    </View>
  );
}
```

### 2.4 地图导航浮窗

```typescript
// app/navigate/index.tsx（简化）
import { VRMView } from '../../components/vrm/VRMView';

export default function NavigatePage() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <MapView ... />

      {/* VRM 浮窗 */}
      <View style={styles.floatContainer}>
        <VRMView
          mode="float"
          expression={isSpeaking ? 'happy' : 'neutral'}
          mouthOpen={isSpeaking ? currentMouthValue : 0}
        />
        <Text style={styles.narration}>{currentNarration}</Text>
      </View>
    </View>
  );
}
```

---

## 三、页面迁移范围（最终版）

### 迁移到移动端（13 个页面/功能）

| 页面 | Web 路径 | 移动端位置 | 数字人行为 |
|------|---------|-----------|-----------|
| 首页 | `/` | Tab 1 | 浮窗欢迎 |
| 对话 | `/chat` | Tab 2 | 全屏 + 手势旋转 |
| 探索 | `/explore` | Tab 3 | — |
| 排行榜 | `/leaderboard` | Tab 4 | — |
| 景点列表 | `/attractions` | Stack | — |
| 景点详情 | `/attractions/:id` | Stack | — |
| 禅径通幽 | `/recommend` | 首页入口 | 浮窗导航讲解 |
| 旅行记忆 | `/memory` | 首页入口 | — |
| 时空穿越 | `/history` | 首页入口 | 浮窗历史旁白 |
| VRM Demo | `/vrm-demo` | 首页入口 | 全屏交互展示 |
| 协作房间 | `/room/:id` | 首页入口 | — |
| Vision | 功能入口 | 首页入口 | — |
| QR 扫描 | 探索内 | 探索 Tab 内 | — |

### 不迁移

| 页面 | 原因 |
|------|------|
| 管理后台全部 | 保持 Web 版 |

---

## 四、项目架构

### 4.1 目录结构

```
mobile/
├── app/                     # Expo Router 页面
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # 首页
│   │   ├── chat.tsx        # 对话（VRM 全屏）
│   │   ├── explore.tsx     # 探索
│   │   └── leaderboard.tsx # 排行榜
│   │
│   ├── attractions/        # 景点
│   ├── navigate/           # ⚡ 禅径通幽（VRM 浮窗导航）
│   ├── history/            # ⚡ 时空穿越（VRM 浮窗讲解）
│   ├── memory/             # 旅行记忆
│   ├── vrm/                # VRM Demo（全屏交互）
│   ├── room/               # 协作房间
│   ├── vision/             # 拍照识别
│   └── _layout.tsx
│
├── components/
│   ├── vrm/                # ⭐ VRM 数字人系统
│   │   ├── VRMManager.ts   # 全局单例（模型加载/表情/口型）
│   │   ├── VRMView.tsx     # 显示组件（full/float 两种模式）
│   │   └── VRMIdleAnim.ts  # idle 动画（blink/breath/headSway）
│   │
│   ├── ui/                 # 基础 UI
│   │   ├── SealButton.tsx
│   │   ├── InkCard.tsx
│   │   ├── OrientalTitle.tsx
│   │   ├── ScrollReveal.tsx
│   │   └── ChatBubble.tsx
│   │
│   ├── voice/
│   │   └── VoiceWaveform.tsx
│   │
│   ├── navigate/           # 地图导航组件
│   │   ├── NavigateMap.tsx
│   │   ├── RouteOverlay.tsx
│   │   └── SpotMarker.tsx
│   │
│   ├── history/            # 历史动画组件
│   │   ├── TimelineSlider.tsx
│   │   ├── SceneIllustration.tsx
│   │   └── QuizCard.tsx
│   │
│   └── common/
│       ├── SpotCard.tsx
│       ├── MemoryCard.tsx
│       ├── StampWall.tsx
│       └── PuzzleGame.tsx
│
├── api/
│   ├── request.ts
│   ├── spots.ts
│   ├── routes.ts
│   ├── chat.ts
│   ├── tts.ts
│   ├── story.ts
│   ├── history.ts
│   ├── memory.ts
│   ├── puzzle.ts
│   ├── room.ts
│   ├── vision.ts
│   └── push.ts
│
├── stores/
│   ├── userStore.ts
│   └── chatStore.ts
│
├── hooks/
│   ├── useSSE.ts
│   ├── useWebSocket.ts
│   ├── useLocation.ts
│   ├── useAudioRecorder.ts
│   ├── useAudioPlayer.ts
│   ├── useVRMSync.ts       # ⭐ 数字人同步（TTS → 口型/表情）
│   └── useTheme.ts
│
├── constants/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── shadows.ts
│
├── assets/
│   ├── fonts/
│   ├── models/
│   │   └── avatar.vrm          # ⭐ 复用 Web 端 VRM 模型
│   └── images/
│       └── history/            # 历史场景插画
│
└── app.json
```

---

## 五、TTS → VRM 口型同步

### useVRMSync hook

```typescript
// hooks/useVRMSync.ts
import { useState, useEffect, useCallback } from 'react';
import { VRMManager } from '../components/vrm/VRMManager';
import { useAudioPlayer } from './useAudioPlayer';

/**
 * 同步 TTS 音频到 VRM 口型 + 表情
 * 
 * 流程：
 * 1. 获取后端 TTS 流式音频 + phoneme 时间戳
 * 2. 播放音频
 * 3. 根据 phoneme 时间戳更新 mouthOpen (0-1)
 * 4. 根据对话内容设置表情
 */
export function useVRMSync() {
  const [expression, setExpression] = useState<string>('neutral');
  const [mouthOpen, setMouthOpen] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { play } = useAudioPlayer();

  const speak = useCallback(async (text: string, emotion?: string) => {
    // 1. 设置表情
    if (emotion) setExpression(emotion);

    // 2. 获取 TTS 音频 + phoneme 时间戳
    const { audioUrl, phonemes } = await fetchTTSStream(text);

    // 3. 播放音频 + 同步口型
    setIsSpeaking(true);
    
    // phonemes 是后端返回的口型时间戳数组
    // [{time: 0.1, value: 0.5}, {time: 0.2, value: 0.8}, ...]
    phonemes.forEach(({ time, value }) => {
      setTimeout(() => {
        setMouthOpen(value);
        VRMManager.setMouthOpen(value);
      }, time * 1000);
    });

    // 4. 播放完成重置
    await play(audioUrl);
    setMouthOpen(0);
    setExpression('neutral');
    setIsSpeaking(false);
    VRMManager.setMouthOpen(0);
  }, []);

  return { speak, expression, mouthOpen, isSpeaking };
}
```

---

## 六、依赖清单（更新）

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-gl": "~15.0.0",
    "expo-asset": "~11.0.0",
    "react": "18.3.1",
    "react-native": "0.76.3",

    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.1.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-svg": "15.8.0",

    "three": "^0.184.0",
    "@pixiv/three-vrm": "^3.5.0",

    "axios": "^1.7.9",
    "zustand": "^5.0.0",
    "@react-native-async-storage/async-storage": "2.1.0",

    "expo-camera": "~16.0.0",
    "expo-location": "~18.0.0",
    "expo-av": "~15.0.0",
    "expo-haptics": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-image": "~2.0.0",
    "expo-font": "~13.0.0",
    "expo-splash-screen": "~0.29.0",

    "react-native-maps": "1.18.0",
    "react-native-modal": "^13.0.1",
    "react-native-toast-message": "^2.2.0"
  }
}
```

---

## 七、迁移阶段规划

### 阶段 1：基础框架 + VRM 适配（5-7 天）

- [ ] 初始化 Expo 项目
- [ ] 配置 Expo Router + 底部 Tab 导航
- [ ] 迁移设计系统常量
- [ ] 加载书法字体
- [ ] ⭐ **VRM RN 适配**
  - [ ] 验证 expo-gl + three.js + @pixiv/three-vrm 兼容性
  - [ ] 实现 VRMManager（全局单例）
  - [ ] 实现 VRMView（full + float 两种模式）
  - [ ] 移植 idle 动画（blink/breath/headSway）
  - [ ] 实现口型同步 API
- [ ] 基础 UI 组件
- [ ] Axios + AsyncStorage + API 层 + stores

**⚠️ 风险点**：先做 VRM 兼容性 PoC（1-2天），不通过则降级为静态头像

**交付物**：可运行 App + VRM 在手机上正常显示

---

### 阶段 2：核心页面（6-8 天）

- [ ] 首页（VRM 浮窗欢迎）
- [ ] 对话页（VRM 全屏 + 手势旋转 + TTS 口型同步）
- [ ] 探索页（地图 + QR 扫描）
- [ ] 景点列表 + 详情
- [ ] 排行榜

**交付物**：核心功能可用

---

### 阶段 3：重构页面（5-7 天）

- [ ] 禅径通幽（地图导航 + VRM 浮窗讲解）
- [ ] 时空穿越（历史动画 + VRM 浮窗旁白）
- [ ] 旅行记忆（原样迁移）

**交付物**：三个重构页面完成

---

### 阶段 4：进阶功能（3-5 天）

- [ ] VRM Demo（全屏交互 + 服装切换）
- [ ] 协作房间
- [ ] Vision 拍照识别
- [ ] 触觉反馈 + 推送通知 + 离线缓存

**交付物**：功能完整

---

### 阶段 5：打磨测试（3-4 天）

- [ ] 动画精调
- [ ] VRM 性能优化（帧率/内存/发热）
- [ ] 暗色模式
- [ ] 无障碍适配
- [ ] 真机测试
- [ ] 打包 + 演示视频

**交付物**：可分发版本

---

## 八、时间估算

| 阶段 | 工作量 | 累计 |
|------|--------|------|
| 阶段 1：框架 + VRM 适配 | 5-7 天 | 5-7 天 |
| 阶段 2：核心页面 | 6-8 天 | 11-15 天 |
| 阶段 3：重构页面 | 5-7 天 | 16-22 天 |
| 阶段 4：进阶功能 | 3-5 天 | 19-27 天 |
| 阶段 5：打磨测试 | 3-4 天 | 22-31 天 |

**总计**：3.5-4.5 周

---

## 九、VRM 兼容性 PoC（最高优先级）

**开工前必须先验证**，预计 1-2 天：

```bash
# 1. 创建最小 Expo 项目
npx create-expo-app vrm-poc --template blank-typescript
cd vrm-poc

# 2. 安装依赖
npx expo install expo-gl expo-asset
npm install three @pixiv/three-vrm

# 3. 将 avatar.vrm 复制到 assets/models/

# 4. 写最小 demo：expo-gl + GLView + three.js + VRM 加载

# 5. 在手机上运行，观察：
#    - 能否加载 VRM 模型？
#    - 帧率多少？（目标 ≥ 30fps）
#    - 内存占用？（目标 < 300MB）
#    - 表情/口型能否控制？
```

**通过** → 正式实施 VRM 方案  
**不通过** → 降级为静态头像 + 语音波形

---

## 十、风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| expo-gl + three.js 不兼容 | 中 | 致命 | PoC 提前验证；降级为静态头像 |
| VRM 帧率低 / 发热 | 高 | 高 | 限制 30fps；降低像素比；小窗口模式降低分辨率 |
| VRM 内存占用大 | 高 | 高 | 全局单例只加载一次；页面切换不重复加载 |
| @pixiv/three-vrm 在 RN 环境有问题 | 中 | 高 | PoC 验证；备选方案：预烘焙动画视频 |
| 多页面同时显示 VRM 冲突 | 低 | 中 | 全局单例 + 显示状态管理，同时只显示一个实例 |

---

## 十一、需准备的素材

### 已有
- [x] `avatar.vrm` 模型（`software/web/public/models/avatar.vrm`）
- [x] VRMStage 完整逻辑（blink/breath/headSway/expression/mouthOpen）
- [x] 8 套服装预设
- [x] 景点图片、设计色值、API 接口、Stores、Hooks

### 需准备
- [ ] 书法字体 .ttf（NotoSerifSC / ZCOOLXiaoWei）
- [ ] 历史场景插画 ×4（唐/宋/明/现代，AI 生成）
- [ ] App 图标 512x512
- [ ] 启动页设计

---

## 十二、比赛演示亮点

### VRM 数字人贯穿全 App

| 场景 | 展示效果 |
|------|---------|
| 打开 App | 浮窗小灵挥手欢迎 |
| 对话 | 全屏 3D 角色 + 手势旋转 + 口型同步 + 表情变化 |
| 地图导航 | 走到景点 → 浮窗小灵转头看景点 → 开口讲解 |
| 时空穿越 | 浮窗小灵穿古装 → 讲述历史 → 表情配合内容 |
| VRM Demo | 全屏交互 + 8 套服装切换 |

**技术亮点**：
- ✅ VRM 3D 数字人（非 Lottie/静态图，效果拉满）
- ✅ TTS → 口型实时同步
- ✅ 多页面全局单例（只加载一次，秒切换）
- ✅ 多智能体协作后端
- ✅ 地图导航 + LBS 自动触发
- ✅ 历史动画 + 沉浸式讲解

---

**文档版本**：v5.0  
**创建日期**：2026-06-08  
**最后更新**：2026-06-08  
**状态**：决策已确认，待实施
