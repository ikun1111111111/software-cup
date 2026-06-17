import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import type { BoneTargets } from '../DigitalHuman/SpeakingGestureController';

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

export type DemoExpression = VRMExpressionPresetName | 'neutral';

export type OutfitPreset =
  | 'elegant'
  | 'modern'
  | 'ink'
  | 'festive'
  | 'lantern'
  | 'spring'
  | 'moonlight'
  | 'scholar';

export interface VRMStageProps {
  url?: string;
  className?: string;
  style?: React.CSSProperties;
  expression?: DemoExpression;
  mouthOpen?: number;
  outfitPreset?: OutfitPreset;
  lookAt?: { x: number; y: number };
  cameraDistance?: number;
  modelOffsetY?: number;
  isSpeaking?: boolean;
  gestureTargets?: BoneTargets | null;
}

/* ----------------------------------------------------------------
   Outfit Presets — 8 costume color schemes
   ---------------------------------------------------------------- */

const OUTFIT_PRESETS: Record<OutfitPreset, { outfit: string; hair?: string; accent?: string }> = {
  elegant: { outfit: '#8B7868', hair: '#2A2520' },
  modern: { outfit: '#6A9C89', hair: '#3A3530' },
  ink: { outfit: '#5A5A5A', hair: '#1A1A1A' },
  festive: { outfit: '#C84B31', hair: '#2A2520', accent: '#D4A84B' },
  lantern: { outfit: '#E85D3A', hair: '#3A2520', accent: '#F4A848' },
  spring: { outfit: '#7BA898', hair: '#2A3530' },
  moonlight: { outfit: '#A8B8D8', hair: '#E8E0D8' },
  scholar: { outfit: '#4A6878', hair: '#2A2A30' },
};

const DEFAULT_VRM_URL = '/models/8024308560058477433.vrm';

/* ----------------------------------------------------------------
   VRMStage — vanilla Three.js renderer with idle animation
   ---------------------------------------------------------------- */

const VRMStage: React.FC<VRMStageProps> = ({
  url = DEFAULT_VRM_URL,
  className,
  style,
  expression = 'neutral',
  mouthOpen = 0,
  outfitPreset = 'modern',
  lookAt = { x: 0, y: 0 },
  cameraDistance = 2.2,
  modelOffsetY = 0,
  isSpeaking = false,
  gestureTargets = null,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const rafRef = useRef<number>(0);
  const disposedRef = useRef(false);
  const timeRef = useRef({ last: 0, elapsed: 0 });

  const expressionRef = useRef<DemoExpression>(expression);
  const mouthOpenRef = useRef(mouthOpen);
  const lookAtRef = useRef(lookAt);
  const presetRef = useRef<OutfitPreset>(outfitPreset);
  const cameraDistanceRef = useRef(cameraDistance);
  const modelOffsetYRef = useRef(modelOffsetY);
  const isSpeakingRef = useRef(isSpeaking);
  const gestureTargetsRef = useRef<BoneTargets | null>(gestureTargets);

  expressionRef.current = expression;
  mouthOpenRef.current = mouthOpen;
  lookAtRef.current = lookAt;
  presetRef.current = outfitPreset;
  cameraDistanceRef.current = cameraDistance;
  modelOffsetYRef.current = modelOffsetY;
  isSpeakingRef.current = isSpeaking;
  gestureTargetsRef.current = gestureTargets;

  const materialsRef = useRef<Map<string, { original: THREE.Color; category: string }>>(new Map());
  const blinkRef = useRef({ nextBlink: 3 + Math.random() * 3, blinking: false, blinkStart: 0 });
  const smoothGestureRef = useRef({
    leftUpperArm: { x: 0.12, y: 0, z: 0 },
    rightUpperArm: { x: 0.12, y: 0, z: 0 },
    leftLowerArm: { x: 0.05, y: 0, z: 0 },
    rightLowerArm: { x: 0.05, y: 0, z: 0 },
    rightHand: { x: 0, y: 0, z: 0 },
  });
  const prevWaveRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    disposedRef.current = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0, 0.2, cameraDistanceRef.current);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xB4D4FF, 0.3);
    fill.position.set(-2, 3, -1);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 8;
    controls.target.set(0, 1.0, 0);
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const loadVRM = async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      loader.register((parser: any) => new VRMLoaderPlugin(parser));

      try {
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            url,
            (gltf) => resolve(gltf),
            undefined,
            (error) => {
              console.error('VRM load error:', error);
              reject(error);
            }
          );
        });
        if (disposedRef.current) return;

        const vrm = gltf.userData?.vrm as VRM;
        if (!vrm) {
          showError('VRM data not found');
          return;
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);

        materialsRef.current.clear();
        vrm.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat?.color) {
              const name = mat.name.toLowerCase();
              const category =
                name.includes('hair') ? 'hair' :
                name.includes('body') || name.includes('outfit') ? 'outfit' :
                name.includes('face') ? 'face' : 'skin';
              materialsRef.current.set(mat.uuid, { original: mat.color.clone(), category });
            }
          }
        });

        applyPreset(presetRef.current, vrm);

        // Completely disable constraint manager to prevent it from overriding arm rotations
        const cm = vrm.nodeConstraintManager as any;
        if (cm) {
          cm.update = () => {};
          cm.setup = () => {};
          if (cm._constraints) cm._constraints.length = 0;
        }

        // Disable SpringBone — cloth physics pulls sleeves into fan shapes
        const sbm = (vrm as any).springBoneManager;
        if (sbm) {
          sbm.update = () => {};
        }


        scene.add(vrm.scene);
        vrmRef.current = vrm;


        containerRef.current?.querySelector('[data-loading]')?.remove();
      } catch (err) {
        console.error('VRM processing failed:', err);
        showError('模型加载失败: ' + (err as Error).message);
      }
    };

    const showError = (msg: string) => {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:16px 24px;background:rgba(220,68,68,0.1);border:1px solid #DC4444;border-radius:12px;color:#DC4444;font-size:13px;text-align:center;max-width:280px;z-index:10;`;
      el.textContent = msg;
      containerRef.current?.appendChild(el);
    };

    const loadingEl = document.createElement('div');
    loadingEl.setAttribute('data-loading', '');
    loadingEl.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:16px 24px;background:rgba(26,95,180,0.08);border:1px solid rgba(26,95,180,0.3);border-radius:12px;color:#1A5FB4;font-size:13px;text-align:center;z-index:10;`;
    loadingEl.textContent = '加载模型中...';
    containerRef.current?.appendChild(loadingEl);

    loadVRM();

    const onResize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(onResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      onResize();
    }

    const animate = () => {
      if (disposedRef.current) return;
      rafRef.current = requestAnimationFrame(animate);

      const now = performance.now() / 1000;
      const dt = Math.min(now - timeRef.current.last, 0.1) || 0.016;
      const t = timeRef.current.elapsed + dt;
      timeRef.current.last = now;
      timeRef.current.elapsed = t;

      const vrm = vrmRef.current;

      if (vrm) {
        const breath = Math.sin(t * 1.2) * 0.003;
        vrm.scene.position.y = modelOffsetYRef.current + breath;

        const blink = blinkRef.current;
        if (!blink.blinking && t > blink.nextBlink) {
          blink.blinking = true;
          blink.blinkStart = t;
        }

        let blinkValue = 0;
        if (blink.blinking) {
          const bt = t - blink.blinkStart;
          if (bt < 0.08) {
            blinkValue = bt / 0.08;
          } else if (bt < 0.16) {
            blinkValue = 1 - (bt - 0.08) / 0.08;
          } else {
            blink.blinking = false;
            blink.nextBlink = t + 3 + Math.random() * 3;
            blinkValue = 0;
          }
        }
        vrm.expressionManager?.setValue('blink', blinkValue);

        // Expressions
        const preset = expressionRef.current;
        const presetMap: Record<string, VRMExpressionPresetName> = {
          happy: 'happy', angry: 'angry', sad: 'sad',
          relaxed: 'relaxed', surprised: 'surprised',
        };
        const names: VRMExpressionPresetName[] = ['happy', 'angry', 'sad', 'relaxed', 'surprised'];
        for (const p of names) {
          vrm.expressionManager?.setValue(
            p,
            presetMap[preset] === p ? Math.min(1, 0.08 / dt) : Math.max(0, -0.08 / dt)
          );
        }
        vrm.expressionManager?.setValue('aa', mouthOpenRef.current);

        // Look-at target — point eyes toward camera
        const l = lookAtRef.current;
        vrm.lookAt?.lookAt(new THREE.Vector3(l.x * 3, 1.3 + l.y * 2, 3));

        // Update VRM — expressions, lookAt run here
        vrm.update(dt);

        // Face camera (rotate 180°)
        vrm.scene.rotation.y = Math.PI;

        // Override pose after vrm.update (which resets bones)
        const leftUpper = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
        const rightUpper = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
        const leftLower = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
        const rightLower = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');

        const gestures = gestureTargetsRef.current;
        const smooth = smoothGestureRef.current;
        const LERP_SPEED = Math.min(1, dt * 5);
        const isWaving = gestures?.waveMode === true;

        // Reset smooth values when wave ends — snap back to rest
        if (prevWaveRef.current && !isWaving) {
          smooth.leftUpperArm = { x: 0.12, y: 0, z: 0 };
          smooth.rightUpperArm = { x: 0.12, y: 0, z: 0 };
          smooth.leftLowerArm = { x: 0.05, y: 0, z: 0 };
          smooth.rightLowerArm = { x: 0.05, y: 0, z: 0 };
          smooth.rightHand = { x: 0, y: 0, z: 0 };
        }
        prevWaveRef.current = isWaving;

        const tLUA = gestures ? gestures.leftUpperArm : { x: 0.12, y: 0, z: 0 };
        const tRUA = gestures ? gestures.rightUpperArm : { x: 0.12, y: 0, z: 0 };
        const tLLA = gestures ? gestures.leftLowerArm : { x: 0.05, y: 0, z: 0 };
        const tRLA = gestures ? gestures.rightLowerArm : { x: 0.05, y: 0, z: 0 };
        const tRH = gestures?.rightHand ?? { x: 0, y: 0, z: 0 };

        smooth.leftUpperArm.x += (tLUA.x - smooth.leftUpperArm.x) * LERP_SPEED;
        smooth.leftUpperArm.y += (tLUA.y - smooth.leftUpperArm.y) * LERP_SPEED;
        smooth.leftUpperArm.z += (tLUA.z - smooth.leftUpperArm.z) * LERP_SPEED;
        smooth.rightUpperArm.x += (tRUA.x - smooth.rightUpperArm.x) * LERP_SPEED;
        smooth.rightUpperArm.y += (tRUA.y - smooth.rightUpperArm.y) * LERP_SPEED;
        smooth.rightUpperArm.z += (tRUA.z - smooth.rightUpperArm.z) * LERP_SPEED;
        smooth.leftLowerArm.x += (tLLA.x - smooth.leftLowerArm.x) * LERP_SPEED;
        smooth.rightLowerArm.x += (tRLA.x - smooth.rightLowerArm.x) * LERP_SPEED;
        smooth.rightHand.x += (tRH.x - smooth.rightHand.x) * LERP_SPEED;
        smooth.rightHand.y += (tRH.y - smooth.rightHand.y) * LERP_SPEED;
        smooth.rightHand.z += (tRH.z - smooth.rightHand.z) * LERP_SPEED;

        if (leftUpper) {
          leftUpper.rotation.z = 1.45 + smooth.leftUpperArm.z;
          leftUpper.rotation.x = smooth.leftUpperArm.x;
          leftUpper.rotation.y = smooth.leftUpperArm.y;
        }
        if (rightUpper) {
          rightUpper.rotation.z = -1.45 + smooth.rightUpperArm.z;
          rightUpper.rotation.x = smooth.rightUpperArm.x;
          rightUpper.rotation.y = smooth.rightUpperArm.y;
        }
        if (leftLower) {
          leftLower.rotation.x = smooth.leftLowerArm.x;
        }
        if (rightLower) {
          if (isWaving) {
            const wave = Math.sin(t * Math.PI * 2.5);
            rightLower.rotation.x = 0;
            rightLower.rotation.y = 0;
            rightLower.rotation.z = Math.PI * 5 / 6 + wave * 0.3;
          } else {
            rightLower.rotation.x = smooth.rightLowerArm.x;
            rightLower.rotation.y = 0;
            rightLower.rotation.z = 0;
          }
        }

        // Right hand bone
        const rightHand = vrm.humanoid?.getNormalizedBoneNode('rightHand');
        if (rightHand) {
          if (isWaving) {
            const wave = Math.sin(t * Math.PI * 2.5);
            rightHand.rotation.x = 0;
            rightHand.rotation.y = 0;
            rightHand.rotation.z = wave * 0.3;
          } else {
            rightHand.rotation.x = 0;
            rightHand.rotation.y = 0;
            rightHand.rotation.z = 0;
          }
        }

        // Head: idle sway + speaking nods
        const headBone = vrm.humanoid?.getNormalizedBoneNode('head');
        if (headBone) {
          // Base idle sway
          headBone.rotation.y = Math.sin(t * 0.25) * 0.025;
          headBone.rotation.z = Math.sin(t * 0.3) * 0.008;

          if (isSpeakingRef.current) {
            // Speaking: rhythmic head nods
            headBone.rotation.x = Math.sin(t * 2.5) * 0.04;
            // Slightly more head movement when speaking
            headBone.rotation.y += Math.sin(t * 0.8) * 0.03;
          } else {
            headBone.rotation.x = 0;
          }
        }

        // Subtle spine sway when speaking
        const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
        if (spine && isSpeakingRef.current) {
          spine.rotation.z = Math.sin(t * 1.2) * 0.008;
          spine.rotation.x = Math.sin(t * 0.8) * 0.005;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      disposedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
      renderer.dispose();
    };
  }, [url]);

  const applyPreset = (preset: OutfitPreset, vrm: VRM) => {
    const colors = OUTFIT_PRESETS[preset];
    if (!colors || !vrm) return;

    const targetColor = new THREE.Color(colors.outfit);
    vrm.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat?.color) {
          const data = materialsRef.current.get(mat.uuid);
          if (data?.category === 'outfit') {
            mat.color.copy(data.original).lerp(targetColor, 0.6);
          }
        }
      }
    });
  };

  useEffect(() => {
    if (vrmRef.current) {
      applyPreset(presetRef.current, vrmRef.current);
    }
  }, [outfitPreset]);

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

export default VRMStage;
