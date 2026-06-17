import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import type { Emotion } from './VRMManager';
import { VRMManager } from './VRMManager';
import { applyIdleAnimation, applyMouthOpen, applyExpression, applyAction, type Action } from './VRMIdleAnim';
import { getCostume } from '@/constants/costumeMap';

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

export function VRMView({
  mode = 'float',
  expression = 'neutral',
  mouthOpen = 0,
  lookAt = { x: 0, y: 0 },
  enableGesture = false,
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
  const frameCountRef = useRef(0);
  const isFocusedRef = useRef(true);

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
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;

    const renderer = new Renderer({ gl }) as unknown as THREE.WebGLRenderer;
    // Match expo-gl's actual pixel ratio from drawing buffer
    const actualPixelRatio = gl.drawingBufferWidth / Math.max(width, 1);
    renderer.setPixelRatio(actualPixelRatio);
    renderer.setSize(width, height);

    renderer.setClearColor(0x000000, 0);
    gl.enable(gl.BLEND);
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

    if (threeRefs) {
      threeRefs.current = { scene, camera };
    }

    try {
      const costume = costumeIdRef.current ? getCostume(costumeIdRef.current) : null;
      const modelFile = costume?.modelFile || 'avatar.vrm';
      const vrm = await VRMManager.getOrLoad(modelFile);
      scene.add(vrm.scene);
      vrm.scene.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const modelHeight = box.max.y - box.min.y;
      if (modelHeight > 0) {
        const targetH = mode === 'float' ? 2.0 : 1.4;
        const s = targetH / modelHeight;
        vrm.scene.scale.set(s, s, s);
        vrm.scene.updateWorldMatrix(true, true);
        const box2 = new THREE.Box3().setFromObject(vrm.scene);
        vrm.scene.position.y = -box2.min.y;
        vrm.scene.position.x = -(box2.max.x + box2.min.x) / 2;
        vrm.scene.position.z = -(box2.max.z + box2.min.z) / 2;
      }
      const camDist = mode === 'float' ? 3.6 : 2.2;
      camera.position.set(0, 1.0, camDist);
      camera.lookAt(0, 1.0, 0);
      camera.updateProjectionMatrix();
    } catch (e) {
      console.warn('[VRMView] Failed to load VRM:', e);
      camera.position.set(0, 0.2, 2.2);
      camera.lookAt(0, 1.0, 0);
    }

    const animate = () => {
      if (!isFocusedRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      frameCountRef.current++;
      const shouldRender = mode === 'full' || frameCountRef.current % 2 === 0;

      if (!shouldRender) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = clockRef.current.getDelta();
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

        // 列出所有骨骼名称
        if (frameCountRef.current === 30) {
          vrm.scene.traverse((obj) => {
            if ((obj as any).isBone) {
              console.log('[bone]', obj.name);
            }
          });
        }
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
      rendererRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    isFocusedRef.current = true;
    return () => {
      isFocusedRef.current = false;
    };
  }, []);

  if (size.width === 0) {
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
