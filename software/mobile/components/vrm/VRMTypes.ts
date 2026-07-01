/**
 * VRM 系统共享类型定义
 * 提取到独立文件，避免 import 类型时触发 Three.js 等重型库加载。
 */
export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised' | 'thinking' | 'grateful';

export type PageContext =
  | 'home'
  | 'attractions'
  | 'attraction-detail'
  | 'history'
  | 'memory'
  | 'explore'
  | 'chat'
  | 'map'
  | 'routes'
  | 'route-detail'
  | 'profile';

export interface VRMState {
  isSpeaking: boolean;
  currentEmotion: Emotion;
  mouthOpen: number;
  subtitle: string;
  pageContext: PageContext;
  contextData: Record<string, any>;
}

export interface VRMAvoidanceInsets {
  right: number;
  bottom: number;
  width: number;
  height: number;
  visible: boolean;
}

/** VRMFloating 暴露的 ref 接口 */
export interface VRMFloatingRef {
  speak: (text: string, emotion?: string) => void;
  speakWithTimeline: (text: string, emotion?: Emotion) => void;
  setExpression: (name: Emotion) => void;
  setAction: (action: any, duration?: number) => void;
}

/** VRMView 暴露的句柄 */
export interface VRMViewHandles {
  scene: any | null; // THREE.Scene — 避免 type-only import 触发模块加载
  camera: any | null; // THREE.PerspectiveCamera
}
