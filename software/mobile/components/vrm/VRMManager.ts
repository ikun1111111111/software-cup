import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import type { Emotion, PageContext, VRMState } from './VRMTypes';
import { createVRMTransformKey, type VRMRenderMode } from './vrmTransformCache';
export type { Emotion, PageContext, VRMState } from './VRMTypes';

type Listener = (data: any) => void;

const EMOTION_MAP: Record<Emotion, string> = {
  neutral: 'neutral',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  surprised: 'surprised',
  thinking: 'neutral',
  grateful: 'happy',
};

class VRMManagerClass {
  private static instance: VRMManagerClass;

  private state: VRMState = {
    isSpeaking: false,
    currentEmotion: 'neutral',
    mouthOpen: 0,
    subtitle: '',
    pageContext: 'home',
    contextData: {},
  };

  private listeners: Map<string, Set<Listener>> = new Map();
  private speakTimer: ReturnType<typeof setTimeout> | null = null;

  // VRM 3D model management
  private vrm: VRM | null = null;
  private loadingPromise: Promise<VRM> | null = null;
  private currentModelFile: string = 'avatar.vrm';
  private transformCache = new Map<string, { scale: THREE.Vector3; position: THREE.Vector3 }>();
  private preloadedModelFile: string | null = null;
  private cacheDir = (Platform.OS === 'web' ? '' : (FileSystem.cacheDirectory || '') + 'vrm_cache/');

  private constructor() {
    ['speak', 'emotionChange', 'mouthChange', 'stateChange'].forEach((event) => {
      this.listeners.set(event, new Set());
    });
  }

  static getInstance(): VRMManagerClass {
    if (!VRMManagerClass.instance) {
      VRMManagerClass.instance = new VRMManagerClass();
    }
    return VRMManagerClass.instance;
  }

  getState(): VRMState {
    return { ...this.state };
  }

  speak(text: string, emotion: Emotion = 'neutral', duration?: number): void {
    if (this.speakTimer) clearTimeout(this.speakTimer);

    this.state.subtitle = text;
    this.state.isSpeaking = true;
    this.state.currentEmotion = emotion;

    // 同步设置 VRM 表情
    this.setEmotionByName(emotion);

    this.emit('speak', { text, emotion });
    this.emit('stateChange', this.getState());

    const autoDuration = duration || Math.max(2000, text.length * 150);
    this.speakTimer = setTimeout(() => this.stopSpeaking(), autoDuration);
  }

  stopSpeaking(): void {
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }
    this.state.isSpeaking = false;
    this.state.subtitle = '';
    this.state.mouthOpen = 0;
    this.state.currentEmotion = 'neutral';
    this.setEmotionByName('neutral');
    this.emit('stateChange', this.getState());
  }

  setEmotion(emotion: Emotion): void {
    this.state.currentEmotion = emotion;
    this.setEmotionByName(emotion);
    this.emit('emotionChange', emotion);
  }

  setPageContext(context: PageContext, data?: Record<string, any>): void {
    this.state.pageContext = context;
    if (data) {
      this.state.contextData = { ...this.state.contextData, ...data };
    }
    this.emit('stateChange', this.getState());
  }

  getWelcomeText(): string {
    const map: Partial<Record<PageContext, string>> = {
      home: '欢迎来到灵山胜境，我是您的数字导览员小灵',
      attractions: '为您推荐灵山大佛，来灵山不可错过',
      'attraction-detail': this.state.contextData?.spotName
        ? `这是${this.state.contextData.spotName}，让我为您详细讲解`
        : '这个景点很有意思',
      history: '穿越千年，让我带您了解灵山的历史',
      memory: '看看您的旅行记忆，记录美好时光',
      explore: '试试拍照识景，或扫描景区二维码',
      chat: '有什么可以帮您的吗？',
      map: '查看景区地图，探索各个景点',
      routes: '为您精选了几条游览路线',
      'route-detail': '这条路线包含多个精彩景点',
    };
    return map[this.state.pageContext] || '有什么可以帮您？';
  }

  getQuickQuestions(): string[] {
    const map: Partial<Record<PageContext, string[]>> = {
      home: ['推荐一条游玩路线', '灵山大佛有多高？', '景区开放时间'],
      attractions: ['推荐一条游玩路线', '哪个景点最适合拍照？'],
      'attraction-detail': ['讲一个这里的故事', '这里有什么传说？', '最佳游览时间？'],
      history: ['灵山是什么时候建立的？', '讲讲唐朝的灵山'],
      memory: ['帮我润色这条记忆', '查看旅程总结'],
      explore: ['拍照识景怎么用？', '附近有什么景点？'],
      chat: ['推荐一条游玩路线', '景区开放时间', '门票多少钱？'],
      map: ['附近有什么景点？', '怎么去灵山大佛？'],
      routes: ['推荐一条短途路线', '哪条路线最经典？'],
      'route-detail': ['这条路线要多久？', '有哪些景点？'],
    };
    return map[this.state.pageContext] || ['有什么可以帮您？'];
  }

  on(event: string, callback: Listener): void {
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Listener): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(data); } catch {}
    });
  }

  // ========== VRM 3D Model Methods ==========

  /**
   * 预加载 VRM 模型（建议在 App 启动时调用）
   * 会优先使用文件系统缓存，避免每次都从 assets 重新下载。
   */
  async preload(modelFile: string = 'avatar.vrm'): Promise<VRM> {
    // 已经预加载过相同模型则直接返回
    if (this.vrm && this.currentModelFile === modelFile) return this.vrm;
    if (this.loadingPromise && this.currentModelFile === modelFile) return this.loadingPromise;

    this.preloadedModelFile = modelFile;
    this.currentModelFile = modelFile;
    this.loadingPromise = this.loadVRMWithCache(modelFile);

    try {
      this.vrm = await this.loadingPromise;
      return this.vrm;
    } catch (e) {
      this.loadingPromise = null;
      throw e;
    }
  }

  async getOrLoad(modelFile?: string): Promise<VRM> {
    const file = modelFile || 'avatar.vrm';
    if (this.vrm && this.currentModelFile === file) return this.vrm;
    if (modelFile && this.currentModelFile !== file) {
      this.dispose();
    }
    // 如果之前已经 preload 过，复用 preload 结果
    if (this.vrm && this.currentModelFile === file) return this.vrm;
    if (this.loadingPromise && this.currentModelFile === file) return this.loadingPromise;
    this.currentModelFile = file;
    this.loadingPromise = this.loadVRMWithCache(file);
    try {
      this.vrm = await this.loadingPromise;
      return this.vrm;
    } catch (e) {
      this.loadingPromise = null;
      throw e;
    }
  }

  private async ensureCacheDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
  }

  private getVRMModule(modelFile: string): any {
    const vrmModules: Record<string, any> = {
      'avatar.vrm': require('../../assets/models/avatar.vrm'),
      '8024308560058477433.vrm': require('../../assets/models/8024308560058477433.vrm'),
      '4353238926149796085.vrm': require('../../assets/models/4353238926149796085.vrm'),
      '5186055420774500970.vrm': require('../../assets/models/5186055420774500970.vrm'),
      '4104272907947728185.vrm': require('../../assets/models/4104272907947728185.vrm'),
      '5784779633385764689.vrm': require('../../assets/models/5784779633385764689.vrm'),
      '8511002460770470367.vrm': require('../../assets/models/8511002460770470367.vrm'),
    };
    return vrmModules[modelFile] || vrmModules['avatar.vrm'];
  }

  private async loadVRMWithCache(modelFile: string = 'avatar.vrm'): Promise<VRM> {
    // Web 平台不支持 expo-file-system，直接从 Asset 加载
    if (Platform.OS === 'web') {
      return this.loadVRMWeb(modelFile);
    }

    await this.ensureCacheDir();

    const cachePath = this.cacheDir + modelFile;
    const cacheInfo = await FileSystem.getInfoAsync(cachePath);

    let fileUri: string;
    if (cacheInfo.exists) {
      // 命中本地缓存
      fileUri = cachePath;
    } else {
      // 从 assets 下载并写入缓存
      let asset;
      try {
        const vrmModule = this.getVRMModule(modelFile);
        asset = Asset.fromModule(vrmModule);
        await asset.downloadAsync();
      } catch (error) {
        console.warn('VRM model not found, using fallback. Error:', error);
        throw new Error('VRM model file not found. Please add avatar.vrm to assets/models/');
      }

      fileUri = asset.localUri || asset.uri;
      if (!fileUri) {
        throw new Error('VRM asset localUri is null');
      }

      try {
        await FileSystem.copyAsync({ from: fileUri, to: cachePath });
        fileUri = cachePath;
      } catch (copyErr) {
        // 缓存失败仍可继续加载（直接用 asset 的 uri）
        console.warn('[VRMManager] cache copy failed, using asset uri:', copyErr);
      }
    }

    return this.parseVRM(fileUri);
  }

  /**
   * Web 平台专用：跳过文件缓存，直接从 Asset 加载 VRM。
   */
  private async loadVRMWeb(modelFile: string): Promise<VRM> {
    let asset: Asset;
    try {
      const vrmModule = this.getVRMModule(modelFile);
      asset = Asset.fromModule(vrmModule);
      await asset.downloadAsync();
    } catch (error) {
      console.warn('[VRMManager] Web: VRM model not found. Error:', error);
      throw new Error('VRM model file not found. Please add avatar.vrm to assets/models/');
    }

    const fileUri = asset.localUri || asset.uri;
    if (!fileUri) {
      throw new Error('VRM asset localUri is null');
    }

    return this.parseVRM(fileUri);
  }

  private async parseVRM(fileUri: string): Promise<VRM> {
    const loader = new GLTFLoader();
    loader.register((parser: any) => new VRMLoaderPlugin(parser));

    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(fileUri, resolve, undefined, reject);
    });

    const vrm = gltf.userData?.vrm as VRM;
    if (!vrm) throw new Error('Failed to parse VRM from GLTF');

    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm);

    return vrm;
  }

  getVRM(): VRM | null {
    return this.vrm;
  }

  hasScaledModel(modelFile: string = this.currentModelFile, mode: VRMRenderMode = 'float'): boolean {
    return this.transformCache.has(createVRMTransformKey(modelFile, mode));
  }

  markModelScaled(modelFile: string = this.currentModelFile, mode: VRMRenderMode = 'float'): void {
    if (this.vrm) {
      this.transformCache.set(createVRMTransformKey(modelFile, mode), {
        scale: this.vrm.scene.scale.clone(),
        position: this.vrm.scene.position.clone(),
      });
    }
  }

  /**
   * 恢复模型到首次缩放后的状态，避免后续页面重复缩放导致尺寸变化。
   */
  restoreModelScale(modelFile: string = this.currentModelFile, mode: VRMRenderMode = 'float'): boolean {
    const cached = this.transformCache.get(createVRMTransformKey(modelFile, mode));
    if (this.vrm && cached) {
      this.vrm.scene.scale.copy(cached.scale);
      this.vrm.scene.updateWorldMatrix(true, true);
      return true;
    }
    return false;
  }

  /**
   * 恢复模型的缩放和位置，GL 上下文丢失重建后必须调用。
   */
  restoreModelTransform(modelFile: string = this.currentModelFile, mode: VRMRenderMode = 'float'): boolean {
    if (!this.vrm) return false;
    const cached = this.transformCache.get(createVRMTransformKey(modelFile, mode));
    if (!cached) return false;
    this.vrm.scene.scale.copy(cached.scale);
    this.vrm.scene.position.copy(cached.position);
    this.vrm.scene.updateWorldMatrix(true, true);
    return true;
  }

  setExpressionPreset(name: string, value: number): void {
    this.vrm?.expressionManager?.setValue(name, value);
  }

  setEmotionByName(emotion: Emotion): void {
    if (!this.vrm?.expressionManager) return;
    const manager = this.vrm.expressionManager;

    // 先重置所有表情
    const allPresets = new Set(['neutral', 'happy', 'sad', 'angry', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh']);
    allPresets.forEach((name) => manager.setValue(name, 0));

    // 设置目标表情（可组合）
    switch (emotion) {
      case 'happy':
      case 'grateful':
        manager.setValue('happy', 0.9);
        manager.setValue('relaxed', 0.3);
        break;
      case 'surprised':
        manager.setValue('surprised', 0.9);
        manager.setValue('happy', 0.2);
        break;
      case 'sad':
        manager.setValue('sad', 0.8);
        break;
      case 'angry':
        manager.setValue('angry', 0.8);
        break;
      case 'thinking':
        manager.setValue('relaxed', 0.5);
        break;
      case 'neutral':
      default:
        manager.setValue('neutral', 0.3);
        break;
    }

    this.state.currentEmotion = emotion;
    this.emit('emotionChange', emotion);
  }

  resetExpressions(): void {
    if (!this.vrm?.expressionManager) return;
    const manager = this.vrm.expressionManager;
    Object.values(EMOTION_MAP).forEach((name) => {
      manager.setValue(name, 0);
    });
    manager.setValue('neutral', 0.3);
  }

  setMouthOpen(value: number): void {
    this.vrm?.expressionManager?.setValue('aa', Math.max(0, Math.min(1, value)));
  }

  setLookAtTarget(x: number, y: number): void {
    this.vrm?.lookAt?.lookAt(new THREE.Vector3(x * 3, 1.3 + y * 2, 2));
  }

  update(dt: number): void {
    this.vrm?.update(dt);
  }

  dispose(): void {
    if (this.vrm) {
      // 从父场景移除，避免残留引用
      if (this.vrm.scene.parent) {
        this.vrm.scene.parent.remove(this.vrm.scene);
      }
      this.vrm.scene.traverse((obj: any) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => {
            // 清理材质引用的纹理，防止显存泄漏
            if (m.map) m.map.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            if (m.metalnessMap) m.metalnessMap.dispose();
            if (m.emissiveMap) m.emissiveMap.dispose();
            if (m.aoMap) m.aoMap.dispose();
            m.dispose();
          });
        }
        if (obj.skeleton) {
          obj.skeleton.dispose?.();
        }
      });
      this.vrm = null;
    }
    this.loadingPromise = null;
    // 注意：不重置 transformCache；GL 上下文重建和模型切回时仍需按 model+mode 恢复。
  }

  reset(): void {
    this.stopSpeaking();
    this.state.currentEmotion = 'neutral';
    this.state.contextData = {};
    this.emit('stateChange', this.getState());
  }
}

export const VRMManager = VRMManagerClass.getInstance();
export default VRMManager;
