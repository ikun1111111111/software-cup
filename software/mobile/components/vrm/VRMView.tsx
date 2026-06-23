import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import type { Emotion } from './VRMTypes';
import { VRMManager } from './VRMManager';
import { applyIdleAnimation, applyMouthOpen, applyExpression, applyAction, type Action } from './VRMIdleAnim';
import { getCostume } from '@/constants/costumeMap';

// Web 端使用标准 WebGL canvas，因为 expo-gl 的 GLView 在 Web 端不工作
const IS_WEB = Platform.OS === 'web';

export interface VRMViewHandles {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
}

interface VRMViewProps {
  mode: 'full' | 'float';
  expression?: Emotion;
  mouthOpen?: number;
  lookAt?: { x: number; y: number };
  enableGesture?: boolean;
  speaking?: boolean;
  costumeId?: string;
  action?: Action;
  actionDuration?: number;
  headRotation?: { x: number; y: number };
  threeRefs?: React.MutableRefObject<VRMViewHandles>;
}

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
  threeRefs,
}: VRMViewProps) {
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
  const isFocusedRef = useRef(true);
  const lastFrameRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  // 用 ref 存储 threeRefs，避免父组件重渲染导致 initWebGL 重建
  const threeRefsRef = useRef(threeRefs);
  // 标记是否已初始化，防止 onLayout 重复触发
  const initializedRef = useRef(false);

  useEffect(() => { expressionRef.current = expression; }, [expression]);
  useEffect(() => { mouthOpenRef.current = mouthOpen; }, [mouthOpen]);
  useEffect(() => { lookAtRef.current = lookAt; }, [lookAt]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { costumeIdRef.current = costumeId; }, [costumeId]);
  useEffect(() => {
    actionRef.current = action;
    actionDurationRef.current = actionDuration;
  }, [action, actionDuration]);
  useEffect(() => { headRotationRef.current = headRotation; }, [headRotation]);
  useEffect(() => { threeRefsRef.current = threeRefs; }, [threeRefs]);

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
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: mode === 'full',
      powerPreference: 'high-performance',
    });
    const targetPixelRatio = mode === 'float'
      ? Math.min(window.devicePixelRatio, 1)
      : Math.min(window.devicePixelRatio, 2);
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

      const camDist = mode === 'float' ? 4.0 : 2.2;
      const camY = 0.6;
      camera.position.set(0, camY, camDist);
      camera.lookAt(0, camY, 0);
      camera.updateProjectionMatrix();
    } catch (e) {
      console.warn('[VRMViewWeb] Failed to load VRM:', e);
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
        VRMManager.update(dt);
      }

      try {
        renderer.render(scene, camera);
      } catch (e) {
        // MToon materials may have null uniform entries on web; skip frame
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    clockRef.current.start();
    rafRef.current = requestAnimationFrame(animate);
  }, [mode]);

  // 测量容器尺寸后初始化 WebGL
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      sizeRef.current = { width, height };
      initWebGL(width, height);
    }
  }, [initWebGL]);

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

  useEffect(() => {
    isFocusedRef.current = true;
    return () => {
      isFocusedRef.current = false;
    };
  }, []);

  return (
    <View
      style={[styles.container, mode === 'full' ? styles.fullMode : styles.floatMode]}
      onLayout={onLayout}
      pointerEvents="none"
    >
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
  threeRefs,
}: VRMViewProps) {
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
  const isFocusedRef = useRef(true);
  const lastFrameRef = useRef(0);
  // 用 ref 存储 threeRefs，避免父组件重渲染导致 onContextCreate 重建
  const threeRefsRef = useRef(threeRefs);
  // 标记是否已初始化，防止 GL 上下文重复创建
  const initializedRef = useRef(false);

  useEffect(() => { expressionRef.current = expression; }, [expression]);
  useEffect(() => { mouthOpenRef.current = mouthOpen; }, [mouthOpen]);
  useEffect(() => { lookAtRef.current = lookAt; }, [lookAt]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { costumeIdRef.current = costumeId; }, [costumeId]);
  useEffect(() => {
    actionRef.current = action;
    actionDurationRef.current = actionDuration;
  }, [action, actionDuration]);
  useEffect(() => { headRotationRef.current = headRotation; }, [headRotation]);
  useEffect(() => { threeRefsRef.current = threeRefs; }, [threeRefs]);

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
    const targetPixelRatio = mode === 'float'
      ? Math.min(gl.drawingBufferWidth / Math.max(width, 1), 1)
      : Math.min(gl.drawingBufferWidth / Math.max(width, 1), 2);
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

      const camDist = mode === 'float' ? 4.0 : 2.2;
      const camY = 0.6;
      camera.position.set(0, camY, camDist);
      camera.lookAt(0, camY, 0);
      camera.updateProjectionMatrix();
    } catch (e) {
      console.warn('[VRMViewNative] Failed to load VRM:', e);
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
  }, [mode]);

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

  useEffect(() => {
    isFocusedRef.current = true;
    return () => {
      isFocusedRef.current = false;
    };
  }, []);

  if (size.width === 0 || size.height === 0) {
    return (
      <View
        style={[styles.container, mode === 'full' ? styles.fullMode : styles.floatMode]}
        onLayout={onLayout}
      />
    );
  }

  return (
    <View
      style={[styles.container, mode === 'full' ? styles.fullMode : styles.floatMode]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
        msaaSamples={mode === 'full' ? 4 : 0}
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
});
