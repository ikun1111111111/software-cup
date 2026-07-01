import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import { usePathname } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import type { Emotion } from './VRMTypes';
import { VRMManager, isStaleVRMLoadError } from './VRMManager';
import { applyIdleAnimation, applyMouthOpen, applyExpression, applyAction, resetMouthState, type Action } from './VRMIdleAnim';
import { getCostume } from '@/constants/costumeMap';
import type { VRMStageFraming, VRMStageMode } from './VRMStageTypes';
import { normalizeVRMRoutePath } from './vrmRouteVisibility';

// Web 端使用标准 WebGL canvas，因为 expo-gl 的 GLView 在 Web 端不工作
const IS_WEB = Platform.OS === 'web';
const MAX_FLOAT_PIXEL_RATIO = 1.5;
const MAX_FULL_PIXEL_RATIO = 2.5;

function getRendererPixelRatio(rawPixelRatio: number, mode: VRMStageMode): number {
  const maxPixelRatio = mode === 'float' ? MAX_FLOAT_PIXEL_RATIO : MAX_FULL_PIXEL_RATIO;
  const pixelRatio = rawPixelRatio || 1;
  return Math.max(1, Math.min(pixelRatio, maxPixelRatio));
}

function hasVisibleWebGLPixels(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (width <= 0 || height <= 0) return false;

    const pixel = new Uint8Array(4);
    const samples = [
      [0.5, 0.5],
      [0.5, 0.36],
      [0.5, 0.64],
      [0.36, 0.5],
      [0.64, 0.5],
      [0.42, 0.42],
      [0.58, 0.42],
      [0.42, 0.68],
      [0.58, 0.68],
    ];

    for (const [xRatio, yRatio] of samples) {
      const x = Math.max(0, Math.min(width - 1, Math.floor(width * xRatio)));
      const y = Math.max(0, Math.min(height - 1, Math.floor(height * yRatio)));
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      if (pixel[3] > 8 && (pixel[0] > 8 || pixel[1] > 8 || pixel[2] > 8)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function isVRMAttachedToScene(scene: THREE.Scene): boolean {
  const vrm = VRMManager.getVRM();
  return Boolean(vrm && vrm.scene.parent === scene);
}

async function loadAndAttachVRM(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  mode: VRMStageMode,
  costumeId?: string,
  framing?: VRMStageFraming,
  forceReload = false,
  shouldAttach?: () => boolean,
): Promise<boolean> {
  const costume = costumeId ? getCostume(costumeId) : null;
  const modelFile = costume?.modelFile || 'avatar.vrm';
  if (forceReload) {
    VRMManager.dispose();
  }
  const vrm = await VRMManager.getOrLoad(modelFile);
  if (shouldAttach && !shouldAttach()) return false;

  if (vrm.scene.parent) {
    vrm.scene.parent.remove(vrm.scene);
  }
  scene.add(vrm.scene);

  const restoredTransform = VRMManager.restoreModelTransform(modelFile, mode);
  if (!restoredTransform) {
    vrm.scene.scale.set(1, 1, 1);
    vrm.scene.position.set(0, 0, 0);
    vrm.scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const modelHeight = box.max.y - box.min.y;
    if (modelHeight > 0) {
      const targetH = framing?.targetHeight ?? (mode === 'float' ? 2.5 : 1.4);
      const s = targetH / modelHeight;
      vrm.scene.scale.set(s, s, s);
      vrm.scene.updateWorldMatrix(true, true);
      const box2 = new THREE.Box3().setFromObject(vrm.scene);
      const scaledH = box2.max.y - box2.min.y;
      const defaultOffsetY = mode === 'float' ? -0.65 : -scaledH * 0.3;
      vrm.scene.position.y = framing?.offsetY ?? defaultOffsetY;
      vrm.scene.position.x = (framing?.offsetX ?? 0) - (box2.max.x + box2.min.x) / 2;
      vrm.scene.position.z = (framing?.offsetZ ?? 0) - (box2.max.z + box2.min.z) / 2;
    }
    VRMManager.markModelScaled(modelFile, mode);
  }

  const camDist = framing?.cameraDistance ?? (mode === 'float' ? 4.4 : 2.2);
  const camY = framing?.cameraY ?? (mode === 'float' ? 0.7 : 0.6);
  camera.position.set(0, camY, camDist);
  camera.lookAt(0, camY, 0);
  camera.updateProjectionMatrix();
  return true;
}

function StaticAvatarFallback({
  mode,
  expression,
  speaking,
}: {
  mode: VRMStageMode;
  expression: Emotion;
  speaking: boolean;
}) {
  const isThinking = expression === 'thinking' || expression === 'relaxed';
  const isSad = expression === 'sad';
  const statusText = speaking ? '讲解声纹同步中' : isThinking ? '正在整理导览' : '数字人加载中';

  return (
    <View style={[styles.fallback, mode === 'full' ? styles.fallbackFull : styles.fallbackFloat]} pointerEvents="none">
      <View style={[styles.fallbackHalo, speaking && styles.fallbackHaloActive]} />
      <View style={styles.fallbackHaloRing} />
      <View
        style={[
          styles.fallbackSeal,
          speaking && styles.fallbackSealActive,
          isThinking && styles.fallbackSealThinking,
          isSad && styles.fallbackSealMuted,
        ]}
      >
        <View style={styles.fallbackSealGlow} />
        <View style={styles.fallbackMountain}>
          <View style={[styles.fallbackMountainLine, styles.fallbackMountainLineShort]} />
          <View style={styles.fallbackMountainLine} />
          <View style={[styles.fallbackMountainLine, styles.fallbackMountainLineLong]} />
        </View>
        <Text style={styles.fallbackSealText}>灵</Text>
        <View style={styles.fallbackWaveRow}>
          <View style={[styles.fallbackWave, speaking && styles.fallbackWaveActive]} />
          <View style={[styles.fallbackWave, styles.fallbackWaveMid, speaking && styles.fallbackWaveActive]} />
          <View style={[styles.fallbackWave, speaking && styles.fallbackWaveActive]} />
        </View>
      </View>
      <View style={styles.fallbackBody}>
        <Text style={styles.fallbackName}>小灵</Text>
        <Text style={styles.fallbackStatus}>{statusText}</Text>
      </View>
    </View>
  );
}

export interface VRMViewHandles {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
}

interface VRMViewProps {
  mode: VRMStageMode;
  expression?: Emotion;
  mouthOpen?: number;
  lookAt?: { x: number; y: number };
  enableGesture?: boolean;
  speaking?: boolean;
  costumeId?: string;
  action?: Action;
  actionDuration?: number;
  headRotation?: { x: number; y: number };
  framing?: VRMStageFraming;
  threeRefs?: React.MutableRefObject<VRMViewHandles>;
  externalAnimationMixer?: THREE.AnimationMixer | null;
  onReadyChange?: (ready: boolean) => void;
}

function getModelFileForCostume(costumeId?: string): string {
  const costume = costumeId ? getCostume(costumeId) : null;
  return costume?.modelFile || 'avatar.vrm';
}

function clearSceneModels(scene: THREE.Scene): void {
  const removable = scene.children.filter((child) => child.type !== 'AmbientLight' && child.type !== 'DirectionalLight');
  removable.forEach((child) => scene.remove(child));
}

type ManualReloadPayload = {
  modelFile?: string | null;
  routePath?: string | null;
};

/**
 * Web 端 VRM 渲染：使用标准 HTML canvas + Three.js WebGLRenderer
 */
function VRMViewWeb({
  mode = 'float',
  expression = 'neutral',
  mouthOpen = 0,
  lookAt = { x: 0, y: 0 },
  speaking = false,
  costumeId,
  action = 'none',
  actionDuration = 800,
  headRotation,
  framing,
  threeRefs,
  externalAnimationMixer,
  onReadyChange,
}: VRMViewProps) {
  const [modelReady, setModelReady] = useState(false);
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const expressionRef = useRef(expression);
  const mouthOpenRef = useRef(mouthOpen);
  const lookAtRef = useRef(lookAt);
  const speakingRef = useRef(speaking);
  const costumeIdRef = useRef(costumeId);
  const actionRef = useRef(action);
  const actionDurationRef = useRef(actionDuration);
  const actionStartRef = useRef(0);
  const prevActionRef = useRef<Action>('none');
  const headRotationRef = useRef(headRotation);
  const isFocusedRef = useRef(screenFocused);
  const lastFrameRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const routePathRef = useRef(normalizeVRMRoutePath(pathname));
  const modelLoadedRef = useRef(false);
  const modelReadyRef = useRef(false);
  const renderErrorWarnedRef = useRef(false);
  const onReadyChangeRef = useRef(onReadyChange);
  const externalAnimationMixerRef = useRef(externalAnimationMixer);
  // 用 ref 存储 threeRefs，避免父组件重渲染导致 initWebGL 重建
  const threeRefsRef = useRef(threeRefs);
  // 标记是否已初始化，防止 onLayout 重复触发
  const initializedRef = useRef(false);

  const setRenderReady = useCallback((ready: boolean) => {
    if (modelReadyRef.current === ready) return;
    modelReadyRef.current = ready;
    setModelReady(ready);
    onReadyChangeRef.current?.(ready);
  }, []);

  useEffect(() => { expressionRef.current = expression; }, [expression]);
  useEffect(() => { mouthOpenRef.current = mouthOpen; }, [mouthOpen]);
  useEffect(() => { lookAtRef.current = lookAt; }, [lookAt]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => {
    // 停止说话时立即重置口型平滑状态，避免残留
    if (!speaking) {
      resetMouthState();
    }
  }, [speaking]);
  useEffect(() => { costumeIdRef.current = costumeId; }, [costumeId]);
  useEffect(() => {
    actionRef.current = action;
    actionDurationRef.current = actionDuration;
  }, [action, actionDuration]);
  useEffect(() => { headRotationRef.current = headRotation; }, [headRotation]);
  useEffect(() => { threeRefsRef.current = threeRefs; }, [threeRefs]);
  useEffect(() => { externalAnimationMixerRef.current = externalAnimationMixer; }, [externalAnimationMixer]);
  useEffect(() => { onReadyChangeRef.current = onReadyChange; }, [onReadyChange]);
  useEffect(() => { routePathRef.current = normalizeVRMRoutePath(pathname); }, [pathname]);

  const initWebGL = useCallback(async (width: number, height: number) => {
    if (width === 0 || height === 0) return;
    // 防止重复初始化
    if (initializedRef.current) return;
    initializedRef.current = true;

    sizeRef.current = { width, height };

    // 清理旧的 renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current.forceContextLoss();
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // 创建 canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    // 清除旧 canvas
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvas);
    }
    canvasRef.current = canvas;

    // 创建 WebGLRenderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      console.warn('[VRMViewWeb] Failed to create WebGL renderer:', error);
      initializedRef.current = false;
      setRenderReady(false);
      return;
    }
    const targetPixelRatio = getRendererPixelRatio(window.devicePixelRatio, mode);
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    if (mode === 'float') {
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
    } else {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
    }

    rendererRef.current = renderer;

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xB4D4FF, 0.3);
    fill.position.set(-2, 3, -1);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(35, width / Math.max(height, 1), 0.1, 20);
    cameraRef.current = camera;

    if (threeRefsRef.current) {
      threeRefsRef.current.current = { scene, camera };
    }

    try {
      const costume = costumeIdRef.current ? getCostume(costumeIdRef.current) : null;
      const modelFile = costume?.modelFile || 'avatar.vrm';
      const vrm = await VRMManager.getOrLoad(modelFile);
      if (isFocusedRef.current) {
      if (vrm.scene.parent) {
        vrm.scene.parent.remove(vrm.scene);
      }
      scene.add(vrm.scene);

      // 恢复当前模型+模式的缩放和定位；不同模式不能共用同一份 transform。
      const restoredTransform = VRMManager.restoreModelTransform(modelFile, mode);

      // 首次加载当前模型+模式时计算缩放和定位
      if (!restoredTransform) {
        vrm.scene.scale.set(1, 1, 1);
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const modelHeight = box.max.y - box.min.y;
        if (modelHeight > 0) {
          const targetH = mode === 'float' ? 2.5 : 1.4;
          const s = targetH / modelHeight;
          vrm.scene.scale.set(s, s, s);
          vrm.scene.updateWorldMatrix(true, true);
          const box2 = new THREE.Box3().setFromObject(vrm.scene);
          const scaledH = box2.max.y - box2.min.y;
          if (mode === 'float') {
            vrm.scene.position.y = -0.65;
          } else {
            vrm.scene.position.y = -scaledH * 0.3;
          }
          vrm.scene.position.x = -(box2.max.x + box2.min.x) / 2;
          vrm.scene.position.z = -(box2.max.z + box2.min.z) / 2;
        }
        VRMManager.markModelScaled(modelFile, mode);
      }

      const camDist = mode === 'float' ? 4.4 : 2.2;
      const camY = mode === 'float' ? 0.7 : 0.6;
      camera.position.set(0, camY, camDist);
      camera.lookAt(0, camY, 0);
      camera.updateProjectionMatrix();
      modelLoadedRef.current = true;
      renderErrorWarnedRef.current = false;
      } else {
        modelLoadedRef.current = false;
        setRenderReady(false);
      }
    } catch (e) {
      if (isStaleVRMLoadError(e)) {
        setTimeout(() => {
          const liveScene = sceneRef.current;
          const liveCamera = cameraRef.current;
          if (!liveScene || !liveCamera) return;
          if (!isFocusedRef.current) return;
          loadAndAttachVRM(liveScene, liveCamera, mode, costumeIdRef.current, framing, false, () => isFocusedRef.current)
            .then((attached) => {
              if (!attached) return;
              modelLoadedRef.current = attached;
              renderErrorWarnedRef.current = false;
            })
            .catch((retryError) => {
              if (!isStaleVRMLoadError(retryError)) {
                console.warn('[VRMViewWeb] Failed to retry VRM load:', retryError);
              }
              modelLoadedRef.current = false;
              setRenderReady(false);
            });
        }, 160);
      } else {
        console.warn('[VRMViewWeb] Failed to load VRM:', e);
      }
      modelLoadedRef.current = false;
      setRenderReady(false);
      camera.position.set(0, 0.2, 2.2);
      camera.lookAt(0, 1.0, 0);
    }

    const animate = (time: number) => {
      if (!isFocusedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const targetFps = 30;
      const frameInterval = 1000 / targetFps;

      if (time - lastFrameRef.current < frameInterval) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameRef.current = time;

      const dt = Math.min(clockRef.current.getDelta(), 0.1);
      const elapsed = clockRef.current.getElapsedTime();

      const vrm = VRMManager.getVRM();
      if (vrm) {
        applyIdleAnimation(vrm, elapsed, dt, speakingRef.current);
        applyExpression(vrm, expressionRef.current);
        applyMouthOpen(vrm, mouthOpenRef.current);
        let actionLookAt = { x: 0, y: 0, headRotX: 0, headRotY: 0 };
        const curAction = actionRef.current;
        if (curAction !== 'none') {
          const now = Date.now();
          if (prevActionRef.current !== curAction) {
            actionStartRef.current = now;
            prevActionRef.current = curAction;
          }
          const actionElapsed = now - actionStartRef.current;
          actionLookAt = applyAction(vrm, curAction, actionElapsed, actionDurationRef.current);
        } else {
          actionStartRef.current = 0;
          prevActionRef.current = 'none';
        }
        VRMManager.setLookAtTarget(
          lookAtRef.current.x + actionLookAt.x,
          lookAtRef.current.y + actionLookAt.y,
        );
        externalAnimationMixerRef.current?.update(dt);
        VRMManager.update(dt);
      }

      try {
        renderer.render(scene, camera);
        if (modelReadyRef.current && isVRMAttachedToScene(scene)) {
          // readPixels forces a GPU sync, so only use it until the first visible frame.
        } else {
          const hasVisibleFrame = modelLoadedRef.current && hasVisibleWebGLPixels(renderer);
          if (hasVisibleFrame) {
            setRenderReady(true);
          } else if (modelReadyRef.current) {
            setRenderReady(false);
          }
        }
      } catch (e) {
        if (!renderErrorWarnedRef.current) {
          console.warn('[VRMViewWeb] Failed to render VRM frame:', e);
          renderErrorWarnedRef.current = true;
        }
        setRenderReady(false);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    clockRef.current.start();
    rafRef.current = requestAnimationFrame(animate);
  }, [mode, setRenderReady]);

  // 测量容器尺寸后初始化 WebGL
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      sizeRef.current = { width, height };
      initWebGL(width, height);
    }
  }, [initWebGL]);

  const reloadCurrentModel = useCallback(async (payload?: ManualReloadPayload, forceReload = true) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;
    if (!isFocusedRef.current) return;

    const modelFile = getModelFileForCostume(costumeIdRef.current);
    if (payload?.modelFile && payload.modelFile !== modelFile) return;
    if (payload?.routePath && payload.routePath !== routePathRef.current) return;

    modelLoadedRef.current = false;
    renderErrorWarnedRef.current = false;
    setRenderReady(false);
    clearSceneModels(scene);

    try {
      const attached = await loadAndAttachVRM(scene, camera, mode, costumeIdRef.current, framing, forceReload, () => isFocusedRef.current);
      if (!attached) return;
      modelLoadedRef.current = attached;
    } catch (error) {
      if (!isStaleVRMLoadError(error)) {
        console.warn('[VRMViewWeb] Manual VRM reload failed:', error);
      }
      modelLoadedRef.current = false;
      setRenderReady(false);
    }
  }, [framing, mode, setRenderReady]);

  useEffect(() => {
    const handleManualReload = (payload?: ManualReloadPayload) => {
      void reloadCurrentModel(payload);
    };
    VRMManager.on('manualReload', handleManualReload);
    return () => VRMManager.off('manualReload', handleManualReload);
  }, [reloadCurrentModel]);

  useEffect(() => {
    isFocusedRef.current = screenFocused;
    if (
      screenFocused
      && initializedRef.current
      && sceneRef.current
      && cameraRef.current
      && (!modelLoadedRef.current || !isVRMAttachedToScene(sceneRef.current))
    ) {
      void reloadCurrentModel(undefined, false);
    }
    return () => {
      isFocusedRef.current = false;
    };
  }, [reloadCurrentModel, screenFocused]);

  // 清理
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <View
      style={[styles.container, mode === 'full' ? styles.fullMode : styles.floatMode]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {!modelReady && (
        <StaticAvatarFallback mode={mode} expression={expression} speaking={speaking} />
      )}
      {/* Web 端 canvas 容器 */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          opacity: modelReady ? 1 : 0,
        }}
      />
    </View>
  );
}

/**
 * Native 端 VRM 渲染：使用 expo-gl GLView + expo-three Renderer
 */
function VRMViewNative({
  mode = 'float',
  expression = 'neutral',
  mouthOpen = 0,
  lookAt = { x: 0, y: 0 },
  speaking = false,
  costumeId,
  action = 'none',
  actionDuration = 800,
  headRotation,
  framing,
  threeRefs,
  externalAnimationMixer,
  onReadyChange,
}: VRMViewProps) {
  const [modelReady, setModelReady] = useState(false);
  const pathname = usePathname();
  const screenFocused = useIsFocused();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const expressionRef = useRef(expression);
  const mouthOpenRef = useRef(mouthOpen);
  const lookAtRef = useRef(lookAt);
  const speakingRef = useRef(speaking);
  const costumeIdRef = useRef(costumeId);
  const actionRef = useRef(action);
  const actionDurationRef = useRef(actionDuration);
  const actionStartRef = useRef(0);
  const prevActionRef = useRef<Action>('none');
  const headRotationRef = useRef(headRotation);
  const isFocusedRef = useRef(screenFocused);
  const lastFrameRef = useRef(0);
  const modelLoadedRef = useRef(false);
  const routePathRef = useRef(normalizeVRMRoutePath(pathname));
  const onReadyChangeRef = useRef(onReadyChange);
  const externalAnimationMixerRef = useRef(externalAnimationMixer);
  // 用 ref 存储 threeRefs，避免父组件重渲染导致 onContextCreate 重建
  const threeRefsRef = useRef(threeRefs);
  // 标记是否已初始化，防止 GL 上下文重复创建
  const initializedRef = useRef(false);

  const setNativeRenderReady = useCallback((ready: boolean) => {
    setModelReady(ready);
    onReadyChangeRef.current?.(ready);
  }, []);

  useEffect(() => { expressionRef.current = expression; }, [expression]);
  useEffect(() => { mouthOpenRef.current = mouthOpen; }, [mouthOpen]);
  useEffect(() => { lookAtRef.current = lookAt; }, [lookAt]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => {
    // 停止说话时立即重置口型平滑状态，避免残留
    if (!speaking) {
      resetMouthState();
    }
  }, [speaking]);
  useEffect(() => { costumeIdRef.current = costumeId; }, [costumeId]);
  useEffect(() => {
    actionRef.current = action;
    actionDurationRef.current = actionDuration;
  }, [action, actionDuration]);
  useEffect(() => { headRotationRef.current = headRotation; }, [headRotation]);
  useEffect(() => { threeRefsRef.current = threeRefs; }, [threeRefs]);
  useEffect(() => { externalAnimationMixerRef.current = externalAnimationMixer; }, [externalAnimationMixer]);
  useEffect(() => { onReadyChangeRef.current = onReadyChange; }, [onReadyChange]);
  useEffect(() => { routePathRef.current = normalizeVRMRoutePath(pathname); }, [pathname]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { width, height };
    setSize({ width, height });

    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / Math.max(height, 1);
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const onContextCreate = useCallback(async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let { width, height } = sizeRef.current;
    if (width === 0 || height === 0) {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (sizeRef.current.width > 0 && sizeRef.current.height > 0) {
            clearInterval(timer);
            width = sizeRef.current.width;
            height = sizeRef.current.height;
            resolve();
          }
        }, 50);
        setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
      });
    }
    if (width === 0 || height === 0) return;

    const renderer = new Renderer({ gl }) as unknown as THREE.WebGLRenderer;
    const targetPixelRatio = getRendererPixelRatio(
      gl.drawingBufferWidth / Math.max(width, 1),
      mode,
    );
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(width, height);

    renderer.setClearColor(0x000000, 0);
    gl.enable(gl.BLEND);

    if (mode === 'float') {
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
    } else {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
    }

    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xB4D4FF, 0.3);
    fill.position.set(-2, 3, -1);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(35, width / Math.max(height, 1), 0.1, 20);
    cameraRef.current = camera;

    if (threeRefsRef.current) {
      threeRefsRef.current.current = { scene, camera };
    }

    try {
      const costume = costumeIdRef.current ? getCostume(costumeIdRef.current) : null;
      const modelFile = costume?.modelFile || 'avatar.vrm';
      const vrm = await VRMManager.getOrLoad(modelFile);
      if (isFocusedRef.current) {
      if (vrm.scene.parent) {
        vrm.scene.parent.remove(vrm.scene);
      }
      scene.add(vrm.scene);

      const restoredTransform = VRMManager.restoreModelTransform(modelFile, mode);

      if (!restoredTransform) {
        vrm.scene.scale.set(1, 1, 1);
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const modelHeight = box.max.y - box.min.y;
        if (modelHeight > 0) {
          const targetH = mode === 'float' ? 2.5 : 1.4;
          const s = targetH / modelHeight;
          vrm.scene.scale.set(s, s, s);
          vrm.scene.updateWorldMatrix(true, true);
          const box2 = new THREE.Box3().setFromObject(vrm.scene);
          const scaledH = box2.max.y - box2.min.y;
          if (mode === 'float') {
            vrm.scene.position.y = -0.65;
          } else {
            vrm.scene.position.y = -scaledH * 0.3;
          }
          vrm.scene.position.x = -(box2.max.x + box2.min.x) / 2;
          vrm.scene.position.z = -(box2.max.z + box2.min.z) / 2;
        }
        VRMManager.markModelScaled(modelFile, mode);
      }

      const camDist = mode === 'float' ? 4.4 : 2.2;
      const camY = mode === 'float' ? 0.7 : 0.6;
      camera.position.set(0, camY, camDist);
      camera.lookAt(0, camY, 0);
      camera.updateProjectionMatrix();
      modelLoadedRef.current = true;
      setNativeRenderReady(true);
      } else {
        modelLoadedRef.current = false;
        setNativeRenderReady(false);
      }
    } catch (e) {
      if (isStaleVRMLoadError(e)) {
        setTimeout(() => {
          const liveScene = sceneRef.current;
          const liveCamera = cameraRef.current;
          if (!liveScene || !liveCamera) return;
          if (!isFocusedRef.current) return;
          loadAndAttachVRM(liveScene, liveCamera, mode, costumeIdRef.current, framing, false, () => isFocusedRef.current)
            .then((attached) => {
              if (!attached) return;
              modelLoadedRef.current = attached;
              setNativeRenderReady(true);
            })
            .catch((retryError) => {
              if (!isStaleVRMLoadError(retryError)) {
                console.warn('[VRMViewNative] Failed to retry VRM load:', retryError);
              }
              modelLoadedRef.current = false;
              setNativeRenderReady(false);
            });
        }, 160);
      } else {
        console.warn('[VRMViewNative] Failed to load VRM:', e);
      }
      modelLoadedRef.current = false;
      setNativeRenderReady(false);
      camera.position.set(0, 0.2, 2.2);
      camera.lookAt(0, 1.0, 0);
    }

    const animate = (time: number) => {
      if (!isFocusedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const targetFps = 30;
      const frameInterval = 1000 / targetFps;

      if (time - lastFrameRef.current < frameInterval) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameRef.current = time;

      const dt = Math.min(clockRef.current.getDelta(), 0.1);
      const elapsed = clockRef.current.getElapsedTime();

      const vrm = VRMManager.getVRM();
      if (vrm) {
        applyIdleAnimation(vrm, elapsed, dt, speakingRef.current);
        applyExpression(vrm, expressionRef.current);
        applyMouthOpen(vrm, mouthOpenRef.current);
        let actionLookAt = { x: 0, y: 0, headRotX: 0, headRotY: 0 };
        const curAction = actionRef.current;
        if (curAction !== 'none') {
          const now = Date.now();
          if (prevActionRef.current !== curAction) {
            actionStartRef.current = now;
            prevActionRef.current = curAction;
          }
          const actionElapsed = now - actionStartRef.current;
          actionLookAt = applyAction(vrm, curAction, actionElapsed, actionDurationRef.current);
        } else {
          actionStartRef.current = 0;
          prevActionRef.current = 'none';
        }
        VRMManager.setLookAtTarget(
          lookAtRef.current.x + actionLookAt.x,
          lookAtRef.current.y + actionLookAt.y,
        );
        externalAnimationMixerRef.current?.update(dt);
        VRMManager.update(dt);
      }

      try {
        renderer.render(scene, camera);
      } catch (e) {
        // MToon materials may have null uniform entries on web; skip frame
      }
      gl.endFrameEXP();

      rafRef.current = requestAnimationFrame(animate);
    };

    clockRef.current.start();
    rafRef.current = requestAnimationFrame(animate);
  }, [framing, mode, setNativeRenderReady]);

  const reloadCurrentModel = useCallback(async (payload?: ManualReloadPayload, forceReload = true) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;
    if (!isFocusedRef.current) return;

    const modelFile = getModelFileForCostume(costumeIdRef.current);
    if (payload?.modelFile && payload.modelFile !== modelFile) return;
    if (payload?.routePath && payload.routePath !== routePathRef.current) return;

    setNativeRenderReady(false);
    clearSceneModels(scene);

    try {
      const attached = await loadAndAttachVRM(scene, camera, mode, costumeIdRef.current, framing, forceReload, () => isFocusedRef.current);
      if (!attached) return;
      modelLoadedRef.current = attached;
      setNativeRenderReady(true);
    } catch (error) {
      if (!isStaleVRMLoadError(error)) {
        console.warn('[VRMViewNative] Manual VRM reload failed:', error);
      }
      modelLoadedRef.current = false;
      setNativeRenderReady(false);
    }
  }, [framing, mode, setNativeRenderReady]);

  useEffect(() => {
    const handleManualReload = (payload?: ManualReloadPayload) => {
      void reloadCurrentModel(payload);
    };
    VRMManager.on('manualReload', handleManualReload);
    return () => VRMManager.off('manualReload', handleManualReload);
  }, [reloadCurrentModel]);

  useEffect(() => {
    isFocusedRef.current = screenFocused;
    if (
      screenFocused
      && initializedRef.current
      && sceneRef.current
      && cameraRef.current
      && (!modelLoadedRef.current || !isVRMAttachedToScene(sceneRef.current))
    ) {
      void reloadCurrentModel(undefined, false);
    }
    return () => {
      isFocusedRef.current = false;
    };
  }, [reloadCurrentModel, screenFocused]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        const gl = renderer.getContext();
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    };
  }, []);

  if (size.width === 0 || size.height === 0) {
    return (
      <View
        style={[styles.container, mode === 'full' ? styles.fullMode : styles.floatMode]}
        onLayout={onLayout}
      >
        <StaticAvatarFallback mode={mode} expression={expression} speaking={speaking} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, mode === 'full' ? styles.fullMode : styles.floatMode]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {!modelReady && (
        <StaticAvatarFallback mode={mode} expression={expression} speaking={speaking} />
      )}
      <GLView
        style={[StyleSheet.absoluteFill, { opacity: modelReady ? 1 : 0 }]}
        onContextCreate={onContextCreate}
        msaaSamples={mode === 'full' ? 4 : 2}
        pointerEvents="none"
      />
    </View>
  );
}

// ── 统一导出组件 ──
export function VRMView(props: VRMViewProps) {
  if (IS_WEB) {
    return <VRMViewWeb {...props} />;
  }
  return <VRMViewNative {...props} />;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fullMode: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  floatMode: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,245,240,0.18)',
  },
  fallbackFloat: {
    borderRadius: 20,
  },
  fallbackFull: {
    paddingBottom: 40,
  },
  fallbackHalo: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(106,156,137,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.18)',
  },
  fallbackHaloActive: {
    backgroundColor: 'rgba(200,75,49,0.12)',
    borderColor: 'rgba(200,75,49,0.22)',
  },
  fallbackHaloRing: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.12)',
  },
  fallbackSeal: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(253,251,247,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(106,156,137,0.32)',
  },
  fallbackSealActive: {
    borderColor: 'rgba(200,75,49,0.34)',
  },
  fallbackSealThinking: {
    backgroundColor: 'rgba(232,242,238,0.9)',
  },
  fallbackSealMuted: {
    opacity: 0.76,
  },
  fallbackSealGlow: {
    position: 'absolute',
    top: -18,
    right: -12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(106,156,137,0.12)',
  },
  fallbackMountain: {
    position: 'absolute',
    bottom: 18,
    alignItems: 'center',
    gap: 3,
    opacity: 0.38,
  },
  fallbackMountainLine: {
    width: 34,
    height: 1,
    backgroundColor: 'rgba(106,156,137,0.72)',
  },
  fallbackMountainLineShort: {
    width: 18,
  },
  fallbackMountainLineLong: {
    width: 46,
  },
  fallbackSealText: {
    color: '#2A2520',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  fallbackWaveRow: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    gap: 4,
  },
  fallbackWave: {
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(106,156,137,0.34)',
  },
  fallbackWaveMid: {
    height: 12,
  },
  fallbackWaveActive: {
    backgroundColor: 'rgba(200,75,49,0.5)',
  },
  fallbackHead: {
    width: 72,
    height: 72,
    borderRadius: 28,
    backgroundColor: '#FDFBF7',
    borderWidth: 2,
    borderColor: 'rgba(106,156,137,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  fallbackHair: {
    position: 'absolute',
    top: 9,
    width: 34,
    height: 11,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#2A2520',
  },
  fallbackEyeRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  fallbackEye: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2A2520',
  },
  fallbackEyeThinking: {
    height: 4,
    borderRadius: 3,
  },
  fallbackMouth: {
    marginTop: 10,
    width: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#C84B31',
  },
  fallbackMouthHappy: {
    width: 22,
    height: 7,
  },
  fallbackMouthSad: {
    width: 16,
    backgroundColor: '#7A7468',
  },
  fallbackMouthSpeaking: {
    height: 12,
    width: 14,
  },
  fallbackBody: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(42,37,32,0.86)',
    alignItems: 'center',
  },
  fallbackName: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  fallbackStatus: {
    marginTop: 2,
    fontSize: 9,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '700',
  },
});
