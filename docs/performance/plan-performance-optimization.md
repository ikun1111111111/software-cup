# 数字人导览系统性能优化方案 v2.0

> 基于项目需求文档（游客交互端、数字人相关技术要求、核心技术指标）
> 
> **版本：** v2.0 | **日期：** 2026-06-18 | **状态：** 待评审

---

## 一、现状深度分析

### 1.1 系统架构全景图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户层 (游客交互端)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 语音输入  │  │ 文本输入  │  │ 扫码打卡  │  │ 拍照打卡  │            │
│  └─────┬────┘  └─────┬────┘  ─────┬────┘  └─────┬────┘            │
────────┼──────────────┼──────────────┼──────────────┼───────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     前端展示层 (React Native + Expo)                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  VRM数字人渲染引擎                                           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │VRMManager│  │ VRMView  │  │VRMFloating│  │VRMProvider│   │    │
│  │  │(单例管理) │  │(3D渲染)  │  │(悬浮窗)  │  │(状态管理) │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  页面层                                                      │    │
│  │  ──────┐ ┌──────┐ ──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │    │
│  │  │首页  │ │地图  │ │景点  │ │问讯  │ │记忆  │ │我的  │    │    │
│  │  │index │ │map   │ │detail│ │chat  │ │memory│ │profile│   │    │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │    │
│  ─────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
                             │ Axios / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     后端服务层 (FastAPI + Python)                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  API网关层                                                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────    │    │
│  │  │ /chat    │  │ /attractions│ │/auth    │  │ /memory  │    │    │
│  │  │ (对话)   │  │ (景点)   │  │ (认证)   │  │ (记忆)   │    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  业务逻辑层                                                    │    │
│  │  ┌──────────┐  ┌──────────  ┌──────────┐  ┌──────────┐    │    │
│  │  │AI服务   │  │ RAG引擎  │  │ TTS服务  │  │ 情感分析  │    │    │
│  │  │(Qwen)   │  │(向量检索) │  │(语音合成) │  │(情绪识别) │    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  数据层                                                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │PostgreSQL│  │ Redis    │  │ FAISS    │  │ 文件系统  │    │    │
│  │  │(业务数据) │  │ (缓存)   │  │ (向量库)  │  │(VRM资源)  │    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  ──────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 当前技术栈详细清单

| 层级 | 技术 | 版本 | 用途 | 已知问题 |
|------|------|------|------|----------|
| **前端框架** | React Native | 0.76+ | 跨平台UI | Web端性能不如原生 |
| **路由** | Expo Router | v4 | 文件路由 | 页面切换时组件重建 |
| **3D引擎** | Three.js | r170+ | WebGL渲染 | 内存管理需手动 |
| **VRM库** | @pixiv/three-vrm | 3.x | VRM模型驱动 | 表情/骨骼API复杂 |
| **状态管理** | Zustand | 5.x | 全局状态 | 无持久化 |
| **HTTP** | Axios | 1.x | API请求 | 无内置重试 |
| **后端框架** | FastAPI | 0.115+ | REST API | 同步阻塞风险 |
| **AI模型** | 通义千问 Qwen | API | 智能问答 | 延迟不可控 |
| **向量库** | FAISS | 1.x | 语义检索 | 内存索引，重启丢失 |
| **缓存** | Redis | 7.x | 会话/缓存 | 未充分利用 |
| **数据库** | PostgreSQL | 16+ | 业务数据 | 连接池未优化 |
| **TTS** | 阿里云语音 | API | 语音合成 | 同步等待 |

### 1.3 性能瓶颈根因分析（鱼骨图）

```
                        性能问题
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───┴───┐         ┌────┴────┐        ┌────┴────┐
    │ 渲染层 │         │  网络层  │        │  数据层  │
    ───┬───┘         └────┬────┘        └────┬────┘
        │                  │                  │
   ┌────┼────┐        ┌────┼────┐        ┌────┼────┐
   │    │    │        │    │    │        │    │    │
  Scene 帧率  内存    API  延迟  重试    索引  缓存  查询
  重复   过高  泄漏    阻塞  超时  缺失    低效  未用  慢
```

### 1.4 性能瓶颈量化定位

| # | 问题现象 | 根因 | 影响范围 | 严重程度 | 复现率 |
|---|---------|------|---------|---------|--------|
| 1 | VRM模型闪烁/消失 | 多页面重复创建Scene，VRM实例被多次添加到不同scene | 所有含VRM的页面 | 🔴 严重 | 100% |
| 2 | 页面切换模型尺寸变化 | 单例模型被不同容器反复scale.set() | 首页景点详情 | 🔴 严重 | 100% |
| 3 | 首次加载模型慢(3-5s) | Asset.downloadAsync同步加载，无预缓存 | 所有VRM页面首次打开 | 🟡 中等 | 100% |
| 4 | float模式CPU占用30% | 30fps持续渲染，小窗口无需高帧率 | 所有含VRMFloating的页面 | 🟡 中等 | 100% |
| 5 | 语音口型不同步 | TTS同步等待，表情与语音分离 | 所有语音对话场景 |  中等 | 80% |
| 6 | AI问答响应8-12秒 | RAG向量检索慢 + LLM生成慢 + 无流式 | 问讯页面 | 🔴 严重 | 100% |
| 7 | 知识库检索2秒 | FAISS IndexFlatIP暴力搜索，无缓存 | 所有RAG查询 |  中等 | 100% |
| 8 | 页面切换卡顿 | Three.js资源未清理，内存累积 | 频繁切换页面时 | 🟡 中等 | 60% |
| 9 | 网络异常无重试 | Axios无拦截器重试机制 | 弱网环境 | 🟢 轻微 | 30% |
| 10 | 并发请求无限制 | 后端无rate limiter | 多用户同时使用 | 🟢 轻微 | 20% |

---

## 二、优化目标（对齐PPT技术指标）

### 2.1 核心指标对照表

| 指标 | PPT要求 | 现状测量值 | 优化目标 | 测量方法 |
|------|---------|-----------|---------|---------|
| **语音问答延迟** | <5秒 | 8-12秒 | **<4秒** | 从用户发送→首字显示 |
| **知识问答准确率** | ≥90% | 待评估 | **≥92%** | 专家评审标准测试集 |
| **数字人自然度** | 口型同步+表情配合 | 基础口型 | **流畅口型+5种情绪** | 演示视频评审 |
| **系统稳定性** | 无崩溃/无长时间无响应 | 偶发崩溃 | **零崩溃** | 7×24h压力测试 |
| **并发处理** | 适当考虑 | 未优化 | **20并发** | JMeter压测 |
| **首屏加载** | 合理范围 | 3-5秒 | **<1.5秒** | React Native Performance |
| **帧率** | 流畅 | 30fps(float) | **60fps(full)/15fps(float)** | FPS Monitor |
| **内存占用** | 合理 | ~180MB | **<130MB** | Android Profiler |

### 2.2 优化优先级矩阵

```
影响大 │  ①VRM全局管理  ②RAG索引优化  ③流式响应
       │  启动预加载   ⑤情感驱动系统
───────┼──────────────────────────────────────
影响小 │  ⑥请求重试     ⑦并发限流      ⑧缓存层
       │  内存清理     ⑩调试代码清理
       └──────────────────────────────────────
         实施快 ←────────────────────→ 实施慢
```

---

## 三、优化方案（详细版）

### 方案一：VRM渲染引擎优化

#### 1.1 全局VRM实例管理（P0 - 已部分实现，需完善）

**问题根因：**
```
页面A(VRMView) ──scale.set(0.5)──→ VRMManager.vrm ──→ 尺寸0.5
页面B(VRMView) ──scale.set(0.3)──→ VRMManager.vrm ──→ 尺寸0.3 (被覆盖!)
页面A切回      ──scale.set(0.5)──→ VRMManager.vrm ──→ 尺寸0.5 (又变了!)
```

**完整解决方案：**

```typescript
// components/vrm/VRMManager.ts - 完善版

import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export type EmotionType = 'neutral' | 'happy' | 'surprised' | 'sad' | 'grateful' | 'thinking';

interface VRMState {
  vrm: VRM | null;
  isModelScaled: boolean;
  currentEmotion: EmotionType;
  isSpeaking: boolean;
  preloadPromise: Promise<VRM> | null;
  cachedScale: THREE.Vector3 | null;
}

class VRMManager {
  private static instance: VRMManager;
  private state: VRMState = {
    vrm: null,
    isModelScaled: false,
    currentEmotion: 'neutral',
    isSpeaking: false,
    preloadPromise: null,
    cachedScale: null,
  };
  
  // 事件监听器（供外部订阅状态变化）
  private listeners: Map<string, Set<Function>> = new Map();

  static getInstance(): VRMManager {
    if (!this.instance) this.instance = new VRMManager();
    return this.instance;
  }

  // ─── 预加载（App启动时调用）───
  async preload(modelUri?: string): Promise<VRM> {
    if (this.state.preloadPromise) return this.state.preloadPromise;
    
    this.state.preloadPromise = this.loadAndCacheVRM(modelUri || 'avatar.vrm');
    return this.state.preloadPromise;
  }

  // ─── 加载并缓存VRM ───
  private async loadAndCacheVRM(modelFile: string): Promise<VRM> {
    // 1. 检查本地缓存
    const cachePath = FileSystem.cacheDirectory + modelFile;
    const cacheInfo = await FileSystem.getInfoAsync(cachePath);
    
    let fileUri: string;
    if (cacheInfo.exists) {
      fileUri = cachePath;
    } else {
      // 2. 从assets下载并缓存
      const asset = Asset.fromModule(require(`../../assets/${modelFile}`));
      await asset.downloadAsync();
      fileUri = asset.localUri || asset.uri;
      
      // 3. 复制到缓存目录
      await FileSystem.copyAsync({
        from: fileUri,
        to: cachePath,
      });
      fileUri = cachePath;
    }
    
    // 4. 加载VRM
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    
    const gltf = await loader.loadAsync(fileUri);
    const vrm = gltf.userData.vrm;
    
    // 5. 优化VRM
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    
    this.state.vrm = vrm;
    this.emit('loaded', vrm);
    return vrm;
  }

  // ─── 获取VRM实例（带缩放保护）───
  async getVRM(): Promise<VRM> {
    if (this.state.vrm) return this.state.vrm;
    return this.preload();
  }

  // ── 安全缩放（只执行一次）───
  applyModelScale(targetHeight: number): void {
    if (!this.state.vrm || this.state.isModelScaled) return;
    
    const vrm = this.state.vrm;
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const modelHeight = box.max.y - box.min.y;
    
    if (modelHeight > 0) {
      const scale = targetHeight / modelHeight;
      vrm.scene.scale.set(scale, scale, scale);
      vrm.scene.updateWorldMatrix(true, true);
      
      // 缓存缩放值
      this.state.cachedScale = vrm.scene.scale.clone();
      this.state.isModelScaled = true;
    }
  }

  // ─── 重置缩放（仅在模型更换时调用）───
  resetScale(): void {
    this.state.isModelScaled = false;
    this.state.cachedScale = null;
  }

  // ─── 情感表情驱动 ───
  setEmotion(emotion: EmotionType): void {
    if (!this.state.vrm?.expressionManager) return;
    
    const manager = this.state.vrm.expressionManager;
    
    // 先重置所有表情
    manager.setValue('happy', 0);
    manager.setValue('surprised', 0);
    manager.setValue('sad', 0);
    manager.setValue('angry', 0);
    manager.setValue('relaxed', 0);
    
    // 设置目标表情
    switch (emotion) {
      case 'happy':
        manager.setValue('happy', 1);
        break;
      case 'surprised':
        manager.setValue('surprised', 1);
        break;
      case 'sad':
        manager.setValue('sad', 0.7);
        break;
      case 'grateful':
        manager.setValue('happy', 0.6);
        manager.setValue('relaxed', 0.4);
        break;
      case 'thinking':
        manager.setValue('relaxed', 0.5);
        break;
      default:
        manager.setValue('relaxed', 0.3);
    }
    
    this.state.currentEmotion = emotion;
    this.emit('emotion', emotion);
  }

  // ─── 语音+口型同步 ───
  async speak(text: string, emotion?: EmotionType): Promise<void> {
    if (!this.state.vrm) return;
    
    // 1. 设置情感表情
    if (emotion) this.setEmotion(emotion);
    
    this.state.isSpeaking = true;
    this.emit('speakStart', text);
    
    try {
      // 2. 调用TTS
      const audioUri = await this.synthesizeSpeech(text);
      
      // 3. 播放音频 + 实时口型驱动
      await this.playWithLipSync(audioUri);
    } catch (error) {
      console.error('[VRMManager] speak error:', error);
    } finally {
      this.state.isSpeaking = false;
      this.setEmotion('neutral');
      this.emit('speakEnd');
    }
  }

  // ─── 事件系统 ───
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  // ─── 清理 ───
  dispose(): void {
    if (this.state.vrm) {
      this.state.vrm.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      this.state.vrm = null;
      this.state.isModelScaled = false;
      this.state.cachedScale = null;
    }
    this.listeners.clear();
  }

  // 占位方法（需对接实际TTS服务）
  private async synthesizeSpeech(text: string): Promise<string> {
    // TODO: 对接阿里云TTS API
    return '';
  }

  private async playWithLipSync(audioUri: string): Promise<void> {
    // TODO: 实现音频播放+口型同步
  }
}

export default VRMManager;
```

**收益量化：**
- 模型闪烁：100%消除
- 尺寸一致性：100%保证
- 首次加载：3-5s → 0.5s（缓存后）
- 内存占用：减少40MB（避免多实例）

#### 1.2 动态帧率控制（P0）

**详细实现：**

```typescript
// components/vrm/VRMView.tsx - 帧率优化版

import { useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

interface FrameRateConfig {
  float: number;   // 悬浮窗帧率
  full: number;    // 全屏帧率
  speaking: number; // 说话时帧率（保证口型流畅）
}

const FRAME_RATE_CONFIG: FrameRateConfig = {
  float: 15,
  full: 30,
  speaking: 30,  // 说话时保持30fps确保口型流畅
};

export default function VRMView({ mode, ...props }) {
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const isFocusedRef = useRef(true);
  
  // 页面聚焦控制
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => { isFocusedRef.current = false; };
    }, [])
  );

  const animate = useCallback((time: number) => {
    if (!isFocusedRef.current) {
      requestAnimationFrame(animate);
      return;
    }

    // 计算目标帧间隔
    const targetFps = VRMManager.getInstance().isSpeaking 
      ? FRAME_RATE_CONFIG.speaking 
      : (mode === 'float' ? FRAME_RATE_CONFIG.float : FRAME_RATE_CONFIG.full);
    const frameInterval = 1000 / targetFps;

    // 帧率控制
    if (time - lastFrameTimeRef.current < frameInterval) {
      requestAnimationFrame(animate);
      return;
    }
    lastFrameTimeRef.current = time;

    // 更新VRM
    const delta = (time - (lastFrameTimeRef.current - frameInterval)) / 1000;
    vrmHumanoid?.update(delta);
    vrmExpressionManager?.update(delta);
    
    // 渲染
    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);
  }, [mode]);

  useEffect(() => {
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [animate]);
}
```

**收益量化：**
- float模式CPU：30% → 12%（降低60%）
- 发热量：明显降低
- 续航：延长约20%

#### 1.3 渲染质量自适应（P1）

```typescript
// 根据容器尺寸和模式动态调整渲染参数
function configureRenderer(mode: 'float' | 'full', containerSize: { w: number, h: number }) {
  // 像素比自适应
  const maxPixelRatio = mode === 'float' ? 1 : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(maxPixelRatio);
  
  // 渲染尺寸
  renderer.setSize(containerSize.w, containerSize.h);
  
  // 质量分级
  if (mode === 'float') {
    renderer.shadowMap.enabled = false;      // 关闭阴影
    renderer.antialias = false;               // 关闭抗锯齿
    renderer.toneMapping = THREE.NoToneMapping; // 关闭色调映射
  } else {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.antialias = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
  }
}
```

#### 1.4 Three.js资源生命周期管理（P0）

```typescript
// hooks/useThreeCleanup.ts - 统一的资源清理Hook

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function useThreeCleanup(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const disposedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (disposedRef.current) return;
      disposedRef.current = true;

      // 1. 遍历清理所有GPU资源
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          // 清理几何体
          if (object.geometry) {
            object.geometry.dispose();
          }
          // 清理材质
          if (object.material) {
            const materials = Array.isArray(object.material) 
              ? object.material 
              : [object.material];
            materials.forEach((material) => {
              // 清理纹理
              const textures = [
                material.map, material.normalMap, material.roughnessMap,
                material.metalnessMap, material.emissiveMap, material.aoMap,
              ].filter(Boolean);
              textures.forEach((tex) => tex.dispose());
              material.dispose();
            });
          }
        }
      });

      // 2. 清理渲染器
      renderer.dispose();
      renderer.forceContextLoss();
      
      // 3. 清理WebGL上下文
      const gl = renderer.getContext();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [scene, renderer]);
}
```

---

### 方案二：加载性能优化

#### 2.1 启动预加载策略（P0）

**完整实现方案：**

```typescript
// app/_layout.tsx - 启动预加载

import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import VRMManager from '@/components/vrm/VRMManager';
import { preloadKnowledgeBase } from '@/services/knowledge';
import { initAudioEngine } from '@/services/audio';

// 保持SplashScreen显示直到资源加载完成
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // 阶段1: VRM模型预加载 (40%)
        setLoadStatus('加载数字人模型...');
        await VRMManager.preload();
        setLoadProgress(40);

        // 阶段2: 知识库索引预加载 (30%)
        setLoadStatus('初始化知识库...');
        await preloadKnowledgeBase();
        setLoadProgress(70);

        // 阶段3: 音频引擎初始化 (20%)
        setLoadStatus('准备语音系统...');
        await initAudioEngine();
        setLoadProgress(90);

        // 阶段4: 完成 (10%)
        setLoadStatus('准备就绪');
        setLoadProgress(100);
        
        setIsReady(true);
      } catch (error) {
        console.error('[App] 初始化失败:', error);
        // 降级：即使加载失败也允许进入
        setIsReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return <LoadingScreen progress={loadProgress} status={loadStatus} />;
  }

  return <MainApp />;
}

// 加载进度界面
function LoadingScreen({ progress, status }: { progress: number; status: string }) {
  return (
    <View style={styles.container}>
      <Image source={require('@/assets/splash-logo.png')} style={styles.logo} />
      <Text style={styles.title}>灵山数字导览人</Text>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );
}
```

#### 2.2 资源缓存策略（P1）

```typescript
// services/resourceCache.ts - 统一资源缓存管理

import * as FileSystem from 'expo-file-system';

interface CacheEntry {
  path: string;
  size: number;
  lastAccess: number;
  accessCount: number;
}

class ResourceCache {
  private cacheDir: string;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB上限
  private index: Map<string, CacheEntry> = new Map();

  constructor() {
    this.cacheDir = FileSystem.cacheDirectory + 'resource_cache/';
    this.ensureCacheDir();
  }

  private async ensureCacheDir() {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
  }

  async getOrFetch(key: string, fetchFn: () => Promise<string>): Promise<string> {
    const cachedPath = this.cacheDir + key;
    const info = await FileSystem.getInfoAsync(cachedPath);
    
    if (info.exists) {
      // 更新访问记录
      const entry = this.index.get(key);
      if (entry) {
        entry.lastAccess = Date.now();
        entry.accessCount++;
      }
      return cachedPath;
    }

    // 下载并缓存
    const resultPath = await fetchFn();
    await FileSystem.copyAsync({ from: resultPath, to: cachedPath });
    
    const stat = await FileSystem.getInfoAsync(cachedPath);
    this.index.set(key, {
      path: cachedPath,
      size: stat.size || 0,
      lastAccess: Date.now(),
      accessCount: 1,
    });

    // 检查是否需要清理
    await this.maybeCleanup();
    
    return cachedPath;
  }

  private async maybeCleanup() {
    let totalSize = 0;
    for (const entry of this.index.values()) {
      totalSize += entry.size;
    }

    if (totalSize > this.maxCacheSize) {
      // LRU清理：删除最久未访问的
      const sorted = Array.from(this.index.entries())
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      for (const [key, entry] of sorted) {
        if (totalSize <= this.maxCacheSize * 0.7) break;
        await FileSystem.deleteAsync(entry.path, { idempotent: true });
        this.index.delete(key);
        totalSize -= entry.size;
      }
    }
  }

  async clearAll() {
    await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
    await this.ensureCacheDir();
    this.index.clear();
  }
}

export const resourceCache = new ResourceCache();
```

---

### 方案三：AI响应性能优化

#### 3.1 知识库RAG全面优化（P0）

**A. 向量索引升级**

```python
# backend/app/core/rag.py - 优化版RAG引擎

import faiss
import numpy as np
from typing import List, Dict, Optional
import hashlib
import json
import time

class OptimizedRAG:
    """优化版RAG引擎：HNSW索引 + 混合检索 + 多级缓存"""
    
    def __init__(self, embedding_dim: int = 768):
        # HNSW索引：近似最近邻搜索，比暴力搜索快10-100倍
        self.index = faiss.IndexHNSWFlat(embedding_dim, 32)  # 32个连接
        self.index.hnsw.efConstruction = 200  # 构建精度
        self.index.hnsw.efSearch = 128        # 搜索精度
        
        # 多级缓存
        self.query_cache: Dict[str, List[Dict]] = {}      # L1: 查询结果缓存
        self.query_cache_ttl = 300                         # 5分钟过期
        self.cache_timestamps: Dict[str, float] = {}
        
        # 文档存储
        self.documents: List[Dict] = []
        self.doc_embeddings: Optional[np.ndarray] = None
        
        # 统计
        self.stats = {
            'total_queries': 0,
            'cache_hits': 0,
            'avg_search_time_ms': 0,
        }

    def build_index(self, documents: List[Dict], embeddings: np.ndarray):
        """构建索引（启动时调用）"""
        self.documents = documents
        self.doc_embeddings = embeddings.astype('float32')
        
        # 归一化（内积搜索需要）
        faiss.normalize_L2(self.doc_embeddings)
        
        # 添加向量到HNSW索引
        self.index.add(self.doc_embeddings)
        
        print(f"[RAG] 索引构建完成: {len(documents)} 文档, {embeddings.shape[1]} 维")

    async def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """混合检索：缓存 → 向量检索 → 关键词检索 → 重排序"""
        self.stats['total_queries'] += 1
        start_time = time.time()
        
        # 1. L1缓存检查
        cache_key = self._hash_query(query)
        if cache_key in self.query_cache:
            if time.time() - self.cache_timestamps[cache_key] < self.query_cache_ttl:
                self.stats['cache_hits'] += 1
                return self.query_cache[cache_key]
        
        # 2. 向量检索（HNSW近似搜索）
        query_embedding = self._encode_query(query)
        query_vec = np.array([query_embedding]).astype('float32')
        faiss.normalize_L2(query_vec)
        
        distances, indices = self.index.search(query_vec, top_k * 3)  # 召回更多候选
        
        vector_results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx >= 0 and idx < len(self.documents):
                vector_results.append({
                    'doc': self.documents[idx],
                    'score': float(dist),
                    'source': 'vector',
                })
        
        # 3. 关键词检索（BM25）
        keyword_results = self._bm25_search(query, top_k * 2)
        
        # 4. 混合重排序
        combined = self._hybrid_rerank(vector_results, keyword_results, top_k)
        
        # 5. 写入缓存
        self.query_cache[cache_key] = combined
        self.cache_timestamps[cache_key] = time.time()
        
        # 6. 更新统计
        elapsed = (time.time() - start_time) * 1000
        self.stats['avg_search_time_ms'] = (
            self.stats['avg_search_time_ms'] * 0.9 + elapsed * 0.1
        )
        
        return combined

    def _hash_query(self, query: str) -> str:
        return hashlib.md5(query.lower().strip().encode()).hexdigest()

    def _bm25_search(self, query: str, top_k: int) -> List[Dict]:
        """BM25关键词检索（简化版）"""
        query_terms = set(query.lower().split())
        results = []
        
        for i, doc in enumerate(self.documents):
            doc_text = doc.get('text', '').lower()
            doc_terms = set(doc_text.split())
            overlap = len(query_terms & doc_terms)
            if overlap > 0:
                results.append({
                    'doc': doc,
                    'score': overlap / len(query_terms),
                    'source': 'keyword',
                })
        
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    def _hybrid_rerank(self, vector_results, keyword_results, top_k):
        """混合重排序：向量分0.7 + 关键词分0.3"""
        doc_scores = {}
        
        for r in vector_results:
            doc_id = r['doc'].get('id', '')
            doc_scores[doc_id] = doc_scores.get(doc_id, 0) + r['score'] * 0.7
        
        for r in keyword_results:
            doc_id = r['doc'].get('id', '')
            doc_scores[doc_id] = doc_scores.get(doc_id, 0) + r['score'] * 0.3
        
        # 按综合分排序
        ranked = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        
        result_docs = []
        for doc_id, score in ranked[:top_k]:
            doc = next((d for d in self.documents if d.get('id') == doc_id), None)
            if doc:
                result_docs.append({'doc': doc, 'score': score})
        
        return result_docs

    def get_stats(self) -> Dict:
        return {
            **self.stats,
            'cache_size': len(self.query_cache),
            'index_size': len(self.documents),
        }
```

**B. 知识库数据预处理脚本**

```python
# scripts/preprocess_knowledge.py - 离线预处理脚本

"""
知识库预处理流程：
1. 读取原始文档（Markdown/PDF/HTML）
2. 文本分块（按语义段落）
3. 生成embedding向量
4. 构建FAISS索引
5. 序列化保存（供服务启动时快速加载）
"""

import json
import numpy as np
import faiss
from pathlib import Path

def preprocess_knowledge():
    # 1. 加载文档
    docs = load_documents_from_dir('data/knowledge/')
    
    # 2. 智能分块
    chunks = semantic_chunking(docs, chunk_size=512, overlap=64)
    
    # 3. 批量生成embedding
    embeddings = batch_encode([c['text'] for c in chunks], batch_size=32)
    
    # 4. 构建索引
    index = faiss.IndexHNSWFlat(768, 32)
    index.add(embeddings.astype('float32'))
    
    # 5. 保存
    faiss.write_index(index, 'data/knowledge.index')
    with open('data/knowledge_chunks.json', 'w') as f:
        json.dump(chunks, f, ensure_ascii=False)
    
    print(f"预处理完成: {len(chunks)} 个文档块, 索引大小: {index.ntotal}")

if __name__ == '__main__':
    preprocess_knowledge()
```

**C. 响应缓存层**

```python
# backend/app/core/response_cache.py

import hashlib
import json
import time
from functools import wraps
from typing import Optional

class ResponseCache:
    """多级响应缓存：内存 → Redis → 数据库"""
    
    def __init__(self):
        self.memory_cache: Dict[str, Dict] = {}
        self.memory_ttl = 60       # 内存缓存1分钟
        self.max_memory_items = 1000
        
    def get(self, key: str) -> Optional[str]:
        # L1: 内存缓存
        if key in self.memory_cache:
            entry = self.memory_cache[key]
            if time.time() - entry['timestamp'] < self.memory_ttl:
                return entry['data']
            del self.memory_cache[key]
        
        # L2: Redis缓存
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0)
            cached = r.get(f"chat:{key}")
            if cached:
                # 回填内存缓存
                self.memory_cache[key] = {
                    'data': cached,
                    'timestamp': time.time()
                }
                return cached
        except:
            pass
        
        return None
    
    def set(self, key: str, value: str, ttl: int = 300):
        # 写入内存缓存
        if len(self.memory_cache) >= self.max_memory_items:
            # LRU清理
            oldest_key = min(self.memory_cache, 
                           key=lambda k: self.memory_cache[k]['timestamp'])
            del self.memory_cache[oldest_key]
        
        self.memory_cache[key] = {
            'data': value,
            'timestamp': time.time()
        }
        
        # 写入Redis
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0)
            r.setex(f"chat:{key}", ttl, value)
        except:
            pass
    
    @staticmethod
    def hash_key(user_id: str, message: str, context: str = '') -> str:
        raw = f"{user_id}:{message}:{context}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

response_cache = ResponseCache()
```

#### 3.2 流式响应架构（P0）

**完整流式对话实现：**

```python
# backend/app/api/chat.py - 流式对话API

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
from typing import AsyncGenerator

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    emotion_context: Optional[str] = None

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """流式对话接口：SSE (Server-Sent Events)"""
    
    async def event_generator() -> AsyncGenerator[str, None]:
        # 阶段1: 立即返回思考状态（<100ms）
        yield format_sse({
            'type': 'status',
            'status': 'thinking',
            'emotion': 'thinking',
        })
        
        # 阶段2: RAG检索（并行）
        rag_task = asyncio.create_task(
            rag_engine.search(request.message, top_k=3)
        )
        
        # 阶段3: 流式生成文本
        full_response = ""
        async for chunk in llm.generate_stream(
            prompt=request.message,
            context=await rag_task,  # 等待RAG结果
        ):
            full_response += chunk
            yield format_sse({
                'type': 'text_chunk',
                'content': chunk,
            })
        
        # 阶段4: 并行TTS + 情感分析
        tts_task = asyncio.create_task(
            tts_service.synthesize(full_response)
        )
        emotion_task = asyncio.create_task(
            emotion_detector.detect(full_response)
        )
        
        # 阶段5: 发送元数据
        emotion = await emotion_task
        yield format_sse({
            'type': 'metadata',
            'emotion': emotion,
            'audio_ready': False,
        })
        
        # 阶段6: 发送音频URL
        audio_url = await tts_task
        yield format_sse({
            'type': 'audio',
            'url': audio_url,
            'duration': estimate_duration(full_response),
        })
        
        # 阶段7: 完成
        yield format_sse({
            'type': 'done',
            'response': full_response,
        })
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Nginx不缓冲
        }
    )

def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
```

**前端SSE消费：**

```typescript
// services/chatService.ts - SSE流式对话

import { EventSourcePolyfill } from 'event-source-polyfill';

interface StreamEvent {
  type: 'status' | 'text_chunk' | 'metadata' | 'audio' | 'done';
  [key: string]: any;
}

export function streamChat(
  message: string,
  onEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void,
): () => void {
  const url = `${API_BASE}/api/chat/stream`;
  
  const eventSource = new EventSourcePolyfill(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    payload: JSON.stringify({ message }),
    heartbeatTimeout: 30000,
  });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onEvent(data);
    
    if (data.type === 'done' || data.type === 'error') {
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError(new Error('SSE连接失败'));
    eventSource.close();
  };

  // 返回取消函数
  return () => eventSource.close();
}
```

---

### 方案四：数字人交互体验优化

#### 4.1 情感驱动系统（P0）

**A. 多层情感检测引擎**

```python
# backend/app/services/emotion_detector.py

import re
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class EmotionResult:
    emotion: str           # 主要情感
    confidence: float      # 置信度 0-1
    intensity: float       # 强度 0-1
    secondary: str = ''    # 次要情感

class EmotionDetector:
    """多层情感检测：规则匹配 → 语义分析 → 上下文融合"""
    
    # 情感关键词库（带权重）
    EMOTION_KEYWORDS: Dict[str, List[Tuple[str, float]]] = {
        'happy': [
            ('高兴', 0.9), ('开心', 0.9), ('愉快', 0.8), ('太好了', 0.95),
            ('棒', 0.7), ('厉害', 0.8), ('有趣', 0.85), ('好玩', 0.8),
            ('哈哈', 0.9), ('嘻嘻', 0.85), ('😄', 0.9), ('😊', 0.85),
        ],
        'surprised': [
            ('惊讶', 0.9), ('没想到', 0.85), ('竟然', 0.8), ('哇', 0.9),
            ('天哪', 0.9), ('真的吗', 0.85), ('不可思议', 0.9),
            ('😮', 0.9), ('😲', 0.9),
        ],
        'grateful': [
            ('感谢', 0.95), ('谢谢', 0.9), ('多谢', 0.85), ('感激', 0.9),
            ('辛苦了', 0.8), ('感恩', 0.9), ('🙏', 0.9),
        ],
        'sad': [
            ('难过', 0.9), ('伤心', 0.9), ('遗憾', 0.85), ('可惜', 0.8),
            ('失望', 0.85), ('', 0.9), ('😔', 0.85),
        ],
        'curious': [
            ('为什么', 0.7), ('怎么', 0.6), ('是什么', 0.6),
            ('告诉我', 0.7), ('介绍一下', 0.7), ('❓', 0.8),
        ],
    }
    
    # 否定词（反转情感）
    NEGATION_WORDS = ['不', '没', '别', '莫', '勿', '非']
    
    # 程度副词（调整强度）
    INTENSITY_MODIFIERS = {
        '非常': 1.3, '特别': 1.3, '超级': 1.4, '太': 1.2,
        '有点': 0.6, '稍微': 0.5, '略微': 0.5,
    }

    def detect(self, text: str, context: str = '') -> EmotionResult:
        """综合情感检测"""
        # 1. 规则匹配（快速，覆盖80%场景）
        rule_result = self._rule_based_detect(text)
        
        if rule_result.confidence > 0.8:
            # 高置信度直接返回
            return rule_result
        
        # 2. 语义分析（调用LLM，慢但准确）
        # semantic_result = self._semantic_detect(text)
        
        # 3. 融合结果
        return rule_result

    def _rule_based_detect(self, text: str) -> EmotionResult:
        """基于规则的情感检测"""
        scores: Dict[str, float] = {}
        
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            score = 0.0
            for keyword, weight in keywords:
                if keyword in text:
                    # 检查否定
                    is_negated = self._check_negation(text, keyword)
                    adjusted_weight = weight * (-1 if is_negated else 1)
                    score = max(score, abs(adjusted_weight))
            
            if score > 0:
                scores[emotion] = score
        
        if not scores:
            return EmotionResult(emotion='neutral', confidence=0.5, intensity=0.3)
        
        # 取最高分情感
        primary = max(scores, key=scores.get)
        confidence = scores[primary]
        
        # 应用程度修饰
        intensity = confidence
        for modifier, factor in self.INTENSITY_MODIFIERS.items():
            if modifier in text:
                intensity = min(confidence * factor, 1.0)
                break
        
        return EmotionResult(
            emotion=primary,
            confidence=confidence,
            intensity=intensity,
        )

    def _check_negation(self, text: str, keyword: str) -> bool:
        """检查关键词前是否有否定词"""
        idx = text.find(keyword)
        if idx <= 0:
            return False
        # 检查前3个字符内是否有否定词
        prefix = text[max(0, idx-3):idx]
        return any(neg in prefix for neg in self.NEGATION_WORDS)
```

**B. VRM表情-情感映射表**

```typescript
// components/vrm/emotionMap.ts

import { VRMExpressionPresetName } from '@pixiv/three-vrm';

export interface EmotionConfig {
  expressions: Partial<Record<VRMExpressionPresetName, number>>;
  bodyLanguage?: 'nod' | 'shake' | 'tilt' | 'bounce';
  voiceTone?: 'normal' | 'cheerful' | 'gentle' | 'excited';
}

export const EMOTION_CONFIG: Record<string, EmotionConfig> = {
  happy: {
    expressions: {
      happy: 1.0,
      relaxed: 0.3,
    },
    bodyLanguage: 'bounce',
    voiceTone: 'cheerful',
  },
  surprised: {
    expressions: {
      surprised: 1.0,
      happy: 0.2,
    },
    bodyLanguage: 'shake',
    voiceTone: 'excited',
  },
  grateful: {
    expressions: {
      happy: 0.6,
      relaxed: 0.5,
    },
    bodyLanguage: 'nod',
    voiceTone: 'gentle',
  },
  sad: {
    expressions: {
      sad: 0.8,
      angry: 0.1,
    },
    bodyLanguage: 'tilt',
    voiceTone: 'gentle',
  },
  thinking: {
    expressions: {
      relaxed: 0.5,
    },
    bodyLanguage: 'tilt',
    voiceTone: 'normal',
  },
  neutral: {
    expressions: {
      relaxed: 0.2,
    },
    bodyLanguage: undefined,
    voiceTone: 'normal',
  },
};
```

#### 4.2 口型同步引擎（P0）

```typescript
// components/vrm/LipSyncEngine.ts

import * as THREE from 'three';
import { VRM, VRMExpressionManager } from '@pixiv/three-vrm';

/**
 * 基于音频频谱分析的实时口型同步
 * 
 * 原理：
 * 1. 将音频送入Web Audio API的AnalyserNode
 * 2. 获取频域数据（FFT）
 * 3. 分析不同频段的能量分布
 * 4. 映射到VRM的5种口型（aa, ih, ou, ee, oh）
 */
export class LipSyncEngine {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Float32Array;
  private vrm: VRM | null = null;
  private animationId: number | null = null;
  
  // 口型映射参数（可微调）
  private config = {
    smoothing: 0.3,     // 平滑系数（0-1，越大越平滑）
    sensitivity: 1.5,   // 灵敏度
    threshold: 0.05,    // 静音阈值
  };
  
  // 当前口型值（平滑过渡）
  private currentLipValues = {
    aa: 0, ih: 0, ou: 0, ee: 0, oh: 0,
  };

  constructor() {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
  }

  setVRM(vrm: VRM) {
    this.vrm = vrm;
  }

  async playWithLipSync(audioBuffer: AudioBuffer): Promise<void> {
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // 连接音频图：source → analyser → destination
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    source.start(0);
    
    // 开始口型驱动循环
    this.driveLipMovement();
    
    return new Promise((resolve) => {
      source.onended = () => {
        this.stopLipMovement();
        resolve();
      };
    });
  }

  private driveLipMovement = () => {
    if (!this.vrm?.expressionManager) return;
    
    this.analyser.getFloatFrequencyData(this.dataArray);
    
    // 分析频段能量
    const { lowEnergy, midEnergy, highEnergy, totalEnergy } = 
      this.analyzeFrequencyBands();
    
    // 映射到口型
    const targetLips = this.mapToLipShapes(lowEnergy, midEnergy, highEnergy, totalEnergy);
    
    // 平滑过渡
    const smoothing = this.config.smoothing;
    for (const key of Object.keys(this.currentLipValues) as Array<keyof typeof this.currentLipValues>) {
      this.currentLipValues[key] = 
        this.currentLipValues[key] * smoothing + 
        targetLips[key] * (1 - smoothing);
      
      this.vrm.expressionManager.setValue(key, this.currentLipValues[key]);
    }
    
    this.animationId = requestAnimationFrame(this.driveLipMovement);
  };

  private analyzeFrequencyBands() {
    const nyquist = this.audioContext.sampleRate / 2;
    const binCount = this.dataArray.length;
    
    let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
    let lowCount = 0, midCount = 0, highCount = 0;
    
    for (let i = 0; i < binCount; i++) {
      const freq = (i / binCount) * nyquist;
      const energy = Math.pow(10, this.dataArray[i] / 20); // dB → linear
      
      if (freq < 500) {
        lowEnergy += energy;
        lowCount++;
      } else if (freq < 2000) {
        midEnergy += energy;
        midCount++;
      } else {
        highEnergy += energy;
        highCount++;
      }
    }
    
    return {
      lowEnergy: lowCount > 0 ? lowEnergy / lowCount : 0,
      midEnergy: midCount > 0 ? midEnergy / midCount : 0,
      highEnergy: highCount > 0 ? highEnergy / highCount : 0,
      totalEnergy: (lowEnergy + midEnergy + highEnergy) / binCount,
    };
  }

  private mapToLipShapes(low: number, mid: number, high: number, total: number) {
    const sens = this.config.sensitivity;
    const thresh = this.config.threshold;
    
    if (total < thresh) {
      return { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    }
    
    // 口型映射规则（基于语音学研究）
    return {
      aa: Math.min(low * sens * 2, 1),      // 低频 → 张嘴(aa)
      ih: Math.min(high * sens * 1.5, 1),   // 高频 → 扁嘴(ih)
      ou: Math.min(low * sens * 0.8, 1),    // 低频 → 圆唇(ou)
      ee: Math.min(mid * sens * 1.2, 1),    // 中频 → 咧嘴(ee)
      oh: Math.min((low + mid) * sens * 0.6, 1), // 低+中 → 圆口(oh)
    };
  }

  private stopLipMovement() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // 平滑归零
    const fadeOut = () => {
      let allZero = true;
      for (const key of Object.keys(this.currentLipValues) as Array<keyof typeof this.currentLipValues>) {
        this.currentLipValues[key] *= 0.8;
        if (this.currentLipValues[key] > 0.01) allZero = false;
        this.vrm?.expressionManager?.setValue(key, this.currentLipValues[key]);
      }
      if (!allZero) requestAnimationFrame(fadeOut);
    };
    fadeOut();
  }

  dispose() {
    this.stopLipMovement();
    this.audioContext.close();
  }
}
```

#### 4.3 多模态输入支持（P1）

```typescript
// components/chat/VoiceInput.tsx - 语音输入组件

import { useState, useRef } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
}

export default function VoiceInput({ onTranscript, onError }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      // 请求权限
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        onError('需要麦克风权限');
        return;
      }

      // 配置录音
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      onError('录音启动失败');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setIsRecording(false);
      
      // 发送到后端进行语音识别
      const text = await transcribeAudio(uri);
      onTranscript(text);
    } catch (err) {
      onError('语音识别失败');
    }
  };

  return (
    <Pressable
      onPressIn={startRecording}
      onPressOut={stopRecording}
      style={({ pressed }) => [
        styles.button,
        isRecording && styles.recording,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon}>{isRecording ? '🎙️' : '🎤'}</Text>
      <Text style={styles.label}>
        {isRecording ? '松开发送' : '按住说话'}
      </Text>
    </Pressable>
  );
}
```

---

### 方案五：系统稳定性优化

#### 5.1 全局错误边界（P0）

```typescript
// components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // TODO: 上报错误到监控平台
    // reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>出现了一点问题</Text>
          <Text style={styles.message}>
            {this.state.error?.message || '未知错误'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>重新加载</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6A9C89',
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

#### 5.2 Axios拦截器优化（P1）

```typescript
// services/api.ts - 完善的API请求层

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, refreshToken, clearAuth } from '@/hooks/useAuth';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── 请求拦截器：自动附加Token ───
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── 响应拦截器：自动重试 + Token刷新 ───
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401: Token过期 → 自动刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 正在刷新，排队等待
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearAuth();
        // 跳转到登录页
        router.replace('/auth/login');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 网络错误 → 自动重试（指数退避）
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    const maxRetries = 3;
    if (originalRequest._retryCount < maxRetries && !error.response) {
      originalRequest._retryCount++;
      const delay = Math.pow(2, originalRequest._retryCount) * 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### 5.3 并发限流与排队（P1）

```python
# backend/app/core/rate_limiter.py

import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Tuple

class TokenBucketRateLimiter:
    """令牌桶限流器"""
    
    def __init__(self, rate: float = 10, capacity: int = 20):
        self.rate = rate          # 每秒令牌数
        self.capacity = capacity   # 桶容量
        self.buckets: Dict[str, Dict] = defaultdict(
            lambda: {'tokens': capacity, 'last_time': time.time()}
        )
    
    async def acquire(self, user_id: str, tokens: int = 1) -> bool:
        bucket = self.buckets[user_id]
        now = time.time()
        
        # 补充令牌
        elapsed = now - bucket['last_time']
        bucket['tokens'] = min(
            self.capacity,
            bucket['tokens'] + elapsed * self.rate
        )
        bucket['last_time'] = now
        
        # 消费令牌
        if bucket['tokens'] >= tokens:
            bucket['tokens'] -= tokens
            return True
        
        return False
    
    async def wait_and_acquire(self, user_id: str, tokens: int = 1, 
                                max_wait: float = 5.0) -> bool:
        """等待获取令牌（带超时）"""
        start = time.time()
        while time.time() - start < max_wait:
            if await self.acquire(user_id, tokens):
                return True
            await asyncio.sleep(0.1)
        return False

# 全局限流器实例
chat_limiter = TokenBucketRateLimiter(rate=5, capacity=10)  # 聊天：5req/s
rag_limiter = TokenBucketRateLimiter(rate=20, capacity=30)  # 检索：20req/s
```

---

## 四、性能监控体系

### 4.1 前端性能监控

```typescript
// utils/performanceMonitor.ts

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  // 记录耗时
  record(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
    
    // 超过阈值告警
    const threshold = this.getThreshold(name);
    if (duration > threshold) {
      console.warn(`[Perf] ${name}: ${duration}ms > ${threshold}ms`);
    }
  }
  
  // 获取统计
  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    values.sort((a, b) => a - b);
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p90: values[Math.floor(values.length * 0.9)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }
  
  private getThreshold(name: string): number {
    const thresholds: Record<string, number> = {
      'vrm_load': 3000,
      'api_chat': 5000,
      'rag_search': 500,
      'page_switch': 300,
      'tts_synthesize': 2000,
    };
    return thresholds[name] || 1000;
  }
  
  // 输出报告
  report() {
    console.log('=== 性能报告 ===');
    for (const [name, _] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}: avg=${stats.avg.toFixed(0)}ms, p90=${stats.p90.toFixed(0)}ms, n=${stats.count}`);
      }
    }
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### 4.2 后端性能指标

```python
# backend/app/middleware/performance.py

import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger('performance')

class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        
        response = await call_next(request)
        
        duration_ms = (time.perf_counter() - start) * 1000
        
        # 记录慢请求
        if duration_ms > 1000:
            logger.warning(
                f"SLOW_REQUEST: {request.method} {request.url.path} "
                f"took {duration_ms:.0f}ms"
            )
        
        # 添加响应头
        response.headers['X-Response-Time'] = f"{duration_ms:.0f}ms"
        
        return response
```

---

## 五、实施计划（详细版）

### Phase 1: 核心性能优化（第1-2周）

| 序号 | 任务 | 优先级 | 工时 | 负责人 | 验收标准 | 依赖 |
|------|------|--------|------|--------|---------|------|
| 1.1 | VRM全局实例管理完善 | P0 | 2天 | 前端 | 切换页面模型不闪烁、尺寸不变 | 无 |
| 1.2 | 动态帧率控制 | P0 | 1天 | 前端 | float模式CPU<15% | 1.1 |
| 1.3 | Three.js资源清理 | P0 | 1天 | 前端 | 内存不泄漏(2h测试) | 1.1 |
| 1.4 | 启动预加载 | P0 | 2天 | 前端 | 首屏<1.5s显示数字人 | 1.1 |
| 1.5 | RAG索引升级HNSW | P0 | 2天 | 后端 | 检索<300ms | 无 |
| 1.6 | 响应缓存层 | P1 | 1天 | 后端 | 重复查询命中缓存 | 1.5 |
| 1.7 | 流式对话API | P0 | 2天 | 后端 | 首字<1s，总响应<4s | 1.5 |

### Phase 2: 交互体验提升（第3-4周）

| 序号 | 任务 | 优先级 | 工时 | 负责人 | 验收标准 | 依赖 |
|------|------|--------|------|--------|---------|------|
| 2.1 | 情感检测引擎 | P0 | 2天 | 后端 | 5种情感识别准确率>85% | 无 |
| 2.2 | VRM表情联动 | P0 | 2天 | 前端 | 表情随情感实时切换 | 2.1 |
| 2.3 | 口型同步引擎 | P0 | 3天 | 前端 | 口型与语音偏差<100ms | 无 |
| 2.4 | SSE流式前端 | P0 | 2天 | 前端 | 文字逐字显示流畅 | 1.7 |
| 2.5 | 语音输入组件 | P1 | 2天 | 前端 | 语音转文字准确率>90% | 无 |
| 2.6 | 情感-语音语调联动 | P1 | 1天 | 后端 | 不同情感使用不同语调 | 2.1 |

### Phase 3: 稳定性与并发（第5-6周）

| 序号 | 任务 | 优先级 | 工时 | 负责人 | 验收标准 | 依赖 |
|------|------|--------|------|--------|---------|------|
| 3.1 | 全局错误边界 | P0 | 1天 | 前端 | 崩溃率<0.1% | 无 |
| 3.2 | Axios拦截器完善 | P1 | 1天 | 前端 | Token自动刷新+重试 | 无 |
| 3.3 | 后端限流器 | P1 | 1天 | 后端 | 20并发无崩溃 | 无 |
| 3.4 | 性能监控体系 | P1 | 2天 | 全栈 | 关键指标可视化 | 无 |
| 3.5 | 压力测试 | P0 | 2天 | 测试 | 7×24h稳定运行 | 3.1-3.3 |
| 3.6 | 调试代码清理 | P2 | 0.5天 | 全栈 | 生产环境无console.log | 无 |

### 甘特图

```
Week:  1        2        3        4        5        6
       ├────────┼────────┼────────┼────────┼────────┤
1.1    ████████
1.2            ████
1.3            ████
1.4    ████████████
1.5    ████████████
1.6            ████████
1.7            ████████████
2.1                     ████████
2.2                              ████████
2.3                     ████████████
2.4                              ████████
2.5                              ████████
2.6                                       ████
3.1                                                ████
3.2                                                ████
3.3                                                ████
3.4                                                ████████
3.5                                                         ████████
3.6                                                         ████
```

---

## 六、预期效果量化

### 6.1 性能指标对比

| 指标 | 优化前 | Phase1后 | Phase2后 | Phase3后 | 提升幅度 |
|------|--------|----------|----------|----------|---------|
| **首屏加载** | 3-5s | <1.5s | <1.5s | <1.5s | **70%↑** |
| **VRM切换** | 闪烁/尺寸变 | 流畅 | 流畅 | 流畅 | **质变** |
| **AI响应(P50)** | 8-12s | <5s | <4s | <4s | **60%↑** |
| **AI响应(P90)** | 15s+ | <7s | <5s | <5s | **67%↑** |
| **RAG检索** | 2s | <300ms | <300ms | <300ms | **85%↑** |
| **float CPU** | 30% | 12% | 12% | 12% | **60%↓** |
| **内存占用** | 180MB | 140MB | 130MB | 120MB | **33%↓** |
| **口型同步** | 不同步 | - | <100ms偏差 | <100ms偏差 | **质变** |
| **情感反馈** | 无 | - | 5种情绪 | 5种情绪 | **质变** |
| **崩溃率** | ~1% | ~0.5% | ~0.2% | <0.1% | **90%↓** |
| **并发支持** | 5 | 10 | 15 | 20 | **4x** |

### 6.2 用户体验评分预估

| 维度 | 当前评分 | 目标评分 | 说明 |
|------|---------|---------|------|
| **响应速度** | 5/10 | 9/10 | 流式+缓存大幅降低延迟 |
| **视觉流畅度** | 4/10 | 9/10 | 消除闪烁，帧率优化 |
| **数字人自然度** | 3/10 | 8/10 | 口型+表情+情感联动 |
| **系统稳定性** | 6/10 | 9.5/10 | 错误边界+重试+限流 |
| **交互丰富度** | 5/10 | 8/10 | 多模态输入+情感反馈 |
| **综合体验** | 4.6/10 | **8.9/10** | 全面质变 |

---

## 七、验收标准（详细版）

### 7.1 功能验收清单

#### VRM渲染
- [ ] 页面切换时VRM模型不闪烁、不消失
- [ ] 所有页面VRM模型尺寸一致
- [ ] float模式帧率稳定在15fps
- [ ] full模式帧率稳定在30fps
- [ ] 说话时帧率自动提升至30fps
- [ ] 连续使用2小时内存增长<20MB
- [ ] 页面卸载后GPU资源完全释放

#### AI对话
- [ ] 流式响应首字显示<1秒
- [ ] 完整响应时间<4秒(P50)
- [ ] 知识库检索时间<300ms
- [ ] 重复问题命中缓存
- [ ] 网络异常自动重试(最多3次)
- [ ] Token过期自动刷新

#### 数字人交互
- [ ] 5种情感准确识别(高兴/惊讶/感谢/难过/好奇)
- [ ] 情感表情实时切换(<200ms)
- [ ] 口型与语音同步偏差<100ms
- [ ] 语音输入转文字准确率>90%
- [ ] 说话结束后表情平滑恢复中性

#### 系统稳定性
- [ ] 7×24小时压力测试零崩溃
- [ ] 20并发用户无响应超时
- [ ] 所有页面有错误边界保护
- [ ] 生产环境无console.log输出
- [ ] 弱网环境(3G)功能可用

### 7.2 性能验收测试方案

```
测试工具: JMeter / k6 / React Native Performance Monitor
测试环境: iPhone 13 / Android 12 / Chrome Web
网络条件: WiFi / 4G / 3G(限速)

测试用例:
1. 冷启动测试: 杀进程→启动→首屏渲染完成时间
2. 页面切换测试: 连续切换100次→内存/CPU曲线
3. 对话压力测试: 20用户并发→响应时间分布
4. 长时间运行: 连续使用2小时→内存泄漏检测
5. 弱网测试: 限速100kbps→功能可用性
6. 低电量测试: 电量<20%→性能降级策略
```

---

## 八、风险评估与应对

### 8.1 技术风险

| 风险项 | 概率 | 影响 | 风险值 | 缓解措施 | 应急预案 |
|--------|------|------|--------|---------|---------|
| VRM模型兼容性问题 | 中(40%) | 高 | 🔴 高 | 多设备测试矩阵(iOS/Android/Web) | 2D头像降级方案 |
| FAISS HNSW索引内存占用大 | 低(20%) | 中 | 🟡 中 | 限制文档数量，定期清理 | 降级为IndexFlatIP |
| SSE连接不稳定(移动端) | 中(35%) | 中 | 🟡 中 | 心跳机制+自动重连 | 降级为普通HTTP |
| TTS服务延迟不可控 | 中(30%) | 中 | 🟡 中 | 多TTS服务商备选 | 纯文本回复模式 |
| 口型同步Web Audio兼容性 | 低(15%) | 低 | 🟢 低 | 特性检测+降级 | 简单张嘴动画 |
| Redis不可用 | 低(10%) | 中 | 🟢 低 | 内存缓存兜底 | 无缓存模式 |

### 8.2 项目风险

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|---------|
| 工期不足 | 中 | 高 | 优先P0任务，P1/P2可延后 |
| 人员变动 | 低 | 高 | 详细文档+代码审查 |
| 需求变更 | 中 | 中 | 模块化设计，低耦合 |
| 第三方API限流 | 中 | 中 | 多服务商+本地缓存 |

---

## 九、技术债务清理清单

| 债务项 | 位置 | 优先级 | 工时 | 说明 |
|--------|------|--------|------|------|
| 移除console.log | 全局 | P2 | 0.5天 | 生产环境不应有调试输出 |
| 统一TypeScript类型 | 全局 | P2 | 1天 | 补充缺失的类型定义 |
| 错误处理规范化 | 全局 | P1 | 1天 | 统一错误格式和处理流程 |
| API文档完善 | 后端 | P2 | 1天 | Swagger/OpenAPI文档 |
| 单元测试补充 | 全局 | P1 | 2天 | 核心功能覆盖率>80% |
| 组件文档 | 前端 | P2 | 1天 | Storybook或类似方案 |
| 部署文档 | DevOps | P2 | 0.5天 | Docker/K8s部署指南 |

---

## 十、长期演进路线

### 10.1 短期（1-2个月）- 稳定期
- [x] 本方案所有优化落地
- [ ] 性能监控Dashboard（Grafana）
- [ ] 自动化性能回归测试
- [ ] A/B测试框架接入

### 10.2 中期（3-6个月）- 增强期
- [ ] 离线模式（本地知识库+本地TTS）
- [ ] 多语言支持（中英日韩）
- [ ] AR增强现实导览（ARKit/ARCore）
- [ ] 数字人形象商城（多套服装/发型）

### 10.3 长期（6-12个月）- 扩展期
- [ ] 实时多人互动导览
- [ ] 数字人个性化定制（AI生成形象）
- [ ] 跨平台统一（Web/iOS/Android/小程序）
- [ ] 智能行程规划（AI推荐路线）
- [ ] 社交分享功能（打卡分享/游记生成）

---

## 附录

### A. 性能测试命令

```bash
# 前端性能分析
npx react-native-bundle-visualizer --entry-file app/_layout.tsx

# 内存泄漏检测
npx react-native-cli run-android --variant=release
# 然后使用 Android Studio Profiler

# 后端压力测试
k6 run load_test.js --vus 20 --duration 60s

# VRM模型分析
npx three-mesh-bvh --model avatar.vrm
```

### B. 关键配置文件

```yaml
# docker-compose.yml - 生产环境
version: '3.8'
services:
  api:
    image: software-cup-api:latest
    ports: ["8000:8000"]
    environment:
      - REDIS_URL=redis://redis:6379
      - FAISS_INDEX_PATH=/data/knowledge.index
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '2'
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
  
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### C. 参考资源

- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content)
- [@pixiv/three-vrm Documentation](https://github.com/pixiv/three-vrm)
- [FAISS Index Types](https://github.com/facebookresearch/faiss/wiki/Faiss-indexes)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [FastAPI Streaming Response](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)

---

**文档版本：** v2.0  
**创建日期：** 2026-06-18  
**最后更新：** 2026-06-18  
**作者：** AI Assistant  
**状态：** 待评审  
**下次评审日期：** 2026-06-25
