import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';

export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised' | 'thinking';

export type PageContext =
  | 'home'
  | 'attractions'
  | 'attraction-detail'
  | 'history'
  | 'memory'
  | 'explore'
  | 'chat';

export interface VRMState {
  isSpeaking: boolean;
  currentEmotion: Emotion;
  mouthOpen: number;
  subtitle: string;
  pageContext: PageContext;
  contextData: Record<string, any>;
}

type Listener = (data: any) => void;

const EMOTION_MAP: Record<Emotion, string> = {
  neutral: 'neutral',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  surprised: 'surprised',
  thinking: 'neutral',
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
    this.emit('stateChange', this.getState());
  }

  setEmotion(emotion: Emotion): void {
    this.state.currentEmotion = emotion;
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
    const map: Record<PageContext, string> = {
      home: '欢迎来到灵山胜境，我是您的数字导览员小灵',
      attractions: '为您推荐灵山大佛，来灵山不可错过',
      'attraction-detail': this.state.contextData?.spotName
        ? `这是${this.state.contextData.spotName}，让我为您详细讲解`
        : '这个景点很有意思',
      history: '穿越千年，让我带您了解灵山的历史',
      memory: '看看您的旅行记忆，记录美好时光',
      explore: '试试拍照识景，或扫描景区二维码',
      chat: '有什么可以帮您的吗？',
    };
    return map[this.state.pageContext] || '有什么可以帮您？';
  }

  getQuickQuestions(): string[] {
    const map: Record<PageContext, string[]> = {
      home: ['推荐一条游玩路线', '灵山大佛有多高？', '景区开放时间'],
      attractions: ['推荐一条游玩路线', '哪个景点最适合拍照？'],
      'attraction-detail': ['讲一个这里的故事', '这里有什么传说？', '最佳游览时间？'],
      history: ['灵山是什么时候建立的？', '讲讲唐朝的灵山'],
      memory: ['帮我润色这条记忆', '查看旅程总结'],
      explore: ['拍照识景怎么用？', '附近有什么景点？'],
      chat: ['推荐一条游玩路线', '景区开放时间', '门票多少钱？'],
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

  async getOrLoad(modelFile?: string): Promise<VRM> {
    const file = modelFile || 'avatar.vrm';
    if (this.vrm && this.currentModelFile === file) return this.vrm;
    if (modelFile && this.currentModelFile !== file) {
      this.dispose();
    }
    if (this.loadingPromise && this.currentModelFile === file) return this.loadingPromise;
    this.currentModelFile = file;
    this.loadingPromise = this.loadVRM(file);
    try {
      this.vrm = await this.loadingPromise;
      return this.vrm;
    } catch (e) {
      this.loadingPromise = null;
      throw e;
    }
  }

  private async loadVRM(modelFile: string = 'avatar.vrm'): Promise<VRM> {
    // Check if VRM asset exists before trying to load
    let asset;
    try {
      const vrmModules: Record<string, any> = {
        'avatar.vrm': require('../../assets/models/avatar.vrm'),
        '8024308560058477433.vrm': require('../../assets/models/8024308560058477433.vrm'),
        '4353238926149796085.vrm': require('../../assets/models/4353238926149796085.vrm'),
        '5186055420774500970.vrm': require('../../assets/models/5186055420774500970.vrm'),
        '4104272907947728185.vrm': require('../../assets/models/4104272907947728185.vrm'),
        '5784779633385764689.vrm': require('../../assets/models/5784779633385764689.vrm'),
        '8511002460770470367.vrm': require('../../assets/models/8511002460770470367.vrm'),
      };
      const vrmModule = vrmModules[modelFile] || vrmModules['avatar.vrm'];
      asset = Asset.fromModule(vrmModule);
      await asset.downloadAsync();
    } catch (error) {
      console.warn('VRM model not found, using fallback. Error:', error);
      throw new Error('VRM model file not found. Please add avatar.vrm to assets/models/');
    }

    const loader = new GLTFLoader();
    loader.register((parser: any) => new VRMLoaderPlugin(parser));

    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(asset.localUri!, resolve, undefined, reject);
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

  setExpressionPreset(name: string, value: number): void {
    this.vrm?.expressionManager?.setValue(name, value);
  }

  setEmotionByName(emotion: Emotion): void {
    const presetName = EMOTION_MAP[emotion] || 'neutral';
    this.vrm?.expressionManager?.setValue(presetName, 1);
  }

  resetExpressions(): void {
    if (!this.vrm?.expressionManager) return;
    Object.values(EMOTION_MAP).forEach((name) => {
      this.vrm!.expressionManager!.setValue(name, 0);
    });
    this.vrm.expressionManager.setValue('neutral', 1);
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
      this.vrm.scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.vrm = null;
    }
    this.loadingPromise = null;
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
