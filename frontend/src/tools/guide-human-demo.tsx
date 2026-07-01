import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

type GuideMode = 'idle' | 'speak' | 'wave' | 'point' | 'think';

type EulerPose = { x: number; y: number; z: number };

const MODEL_URL = '/models/guide.glb';

const MODES: { id: GuideMode; label: string; tone: string }[] = [
  { id: 'idle', label: '待机', tone: 'steady' },
  { id: 'speak', label: '讲解', tone: 'warm' },
  { id: 'wave', label: '挥手', tone: 'bright' },
  { id: 'point', label: '指引', tone: 'clear' },
  { id: 'think', label: '思考', tone: 'soft' },
];

const CONTROLLED_BONES: VRMHumanBoneName[] = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'rightShoulder',
  'leftUpperArm',
  'rightUpperArm',
  'leftLowerArm',
  'rightLowerArm',
  'leftHand',
  'rightHand',
];

const BASE_POSE: Record<string, EulerPose> = {
  hips: { x: 0, y: 0, z: 0 },
  spine: { x: 0, y: 0, z: 0 },
  chest: { x: 0, y: 0, z: 0 },
  upperChest: { x: 0, y: 0, z: 0 },
  neck: { x: 0, y: 0, z: 0 },
  head: { x: 0, y: 0, z: 0 },
  leftShoulder: { x: 0, y: 0, z: 0 },
  rightShoulder: { x: 0, y: 0, z: 0 },
  leftUpperArm: { x: 0.1, y: 0, z: 1.42 },
  rightUpperArm: { x: 0.1, y: 0, z: -1.42 },
  leftLowerArm: { x: 0.08, y: 0, z: 0 },
  rightLowerArm: { x: 0.08, y: 0, z: 0 },
  leftHand: { x: 0, y: 0, z: 0 },
  rightHand: { x: 0, y: 0, z: 0 },
};

function copyPose(base: Record<string, EulerPose>) {
  const pose: Record<string, EulerPose> = {};
  for (const [key, value] of Object.entries(base)) {
    pose[key] = { ...value };
  }
  return pose;
}

function lerpPose(current: Record<string, EulerPose>, target: Record<string, EulerPose>, alpha: number) {
  for (const bone of CONTROLLED_BONES) {
    const key = bone as string;
    const now = current[key] ?? { x: 0, y: 0, z: 0 };
    const next = target[key] ?? BASE_POSE[key] ?? { x: 0, y: 0, z: 0 };
    now.x += (next.x - now.x) * alpha;
    now.y += (next.y - now.y) * alpha;
    now.z += (next.z - now.z) * alpha;
    current[key] = now;
  }
}

function buildPose(mode: GuideMode, t: number, intensity: number) {
  const pose = copyPose(BASE_POSE);
  const talk = Math.sin(t * 4.2) * 0.5 + Math.sin(t * 6.7) * 0.25;
  const breathe = Math.sin(t * 1.15);
  const weight = THREE.MathUtils.clamp(intensity, 0.2, 1.2);

  pose.spine.z = breathe * 0.012 * weight;
  pose.chest.x = Math.sin(t * 0.9) * 0.008 * weight;
  pose.upperChest.z = Math.sin(t * 0.7 + 0.6) * 0.012 * weight;
  pose.head.y = Math.sin(t * 0.38) * 0.035 * weight;
  pose.head.z = Math.sin(t * 0.52) * 0.012 * weight;

  if (mode === 'speak') {
    pose.chest.x -= 0.015 * weight;
    pose.head.x = Math.sin(t * 2.5) * 0.04 * weight;
    pose.leftUpperArm.x = -0.25 * weight + talk * 0.035;
    pose.leftUpperArm.y = 0.1 * weight;
    pose.leftUpperArm.z = 1.16 - talk * 0.035;
    pose.rightUpperArm.x = -0.22 * weight - talk * 0.04;
    pose.rightUpperArm.y = -0.12 * weight;
    pose.rightUpperArm.z = -1.14 + talk * 0.035;
    pose.leftLowerArm.x = 0.42 * weight + Math.sin(t * 3.1) * 0.06;
    pose.rightLowerArm.x = 0.46 * weight + Math.sin(t * 3.5 + 1.4) * 0.06;
  }

  if (mode === 'wave') {
    const wave = Math.sin(t * 7.2);
    pose.head.y = -0.08 + Math.sin(t * 0.8) * 0.02;
    pose.rightUpperArm.x = -0.18 * weight;
    pose.rightUpperArm.y = -0.28 * weight;
    pose.rightUpperArm.z = -0.56;
    pose.rightLowerArm.x = 0.1;
    pose.rightLowerArm.y = 0.02;
    pose.rightLowerArm.z = 2.15 + wave * 0.28 * weight;
    pose.rightHand.z = wave * 0.25 * weight;
    pose.leftUpperArm.z = 1.34;
    pose.leftLowerArm.x = 0.12;
  }

  if (mode === 'point') {
    pose.head.y = -0.14 + Math.sin(t * 0.9) * 0.018;
    pose.chest.y = -0.035 * weight;
    pose.rightUpperArm.x = -0.45 * weight;
    pose.rightUpperArm.y = -0.22 * weight;
    pose.rightUpperArm.z = -0.82;
    pose.rightLowerArm.x = 0.28 * weight;
    pose.rightLowerArm.y = -0.04;
    pose.rightLowerArm.z = 0.22;
    pose.leftUpperArm.x = 0.04;
    pose.leftUpperArm.z = 1.36;
  }

  if (mode === 'think') {
    pose.head.x = 0.08 * weight + Math.sin(t * 0.9) * 0.01;
    pose.head.y = 0.12 * weight;
    pose.chest.x = 0.018 * weight;
    pose.leftUpperArm.x = -0.4 * weight;
    pose.leftUpperArm.y = 0.18 * weight;
    pose.leftUpperArm.z = 0.95;
    pose.leftLowerArm.x = 1.08 * weight;
    pose.rightUpperArm.z = -1.36;
    pose.rightLowerArm.x = 0.12;
  }

  return pose;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) material?.dispose();
  });
}

function NaturalGuideStage({
  mode,
  intensity,
  onStatus,
}: {
  mode: GuideMode;
  intensity: number;
  onStatus: (status: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const modeRef = useRef(mode);
  const intensityRef = useRef(intensity);
  const poseRef = useRef(copyPose(BASE_POSE));
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef(0);
  const blinkRef = useRef({ next: 1.8 + Math.random() * 2.2, start: 0, active: false });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#efe7db');

    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 40);
    camera.position.set(0, 1.18, 2.65);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 1.08, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.45;
    controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.62;

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4.5, 3.8);
    key.castShadow = true;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xa7d8ff, 1.1);
    rim.position.set(-3, 2.5, -2.2);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 72),
      new THREE.MeshStandardMaterial({ color: '#d8cbb8', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.012;
    ground.receiveShadow = true;
    scene.add(ground);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let disposed = false;
    let vrmScene: THREE.Object3D | null = null;

    const loadModel = async () => {
      try {
        onStatus('正在加载模型');
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        const gltf = await loader.loadAsync(MODEL_URL);
        if (disposed) return;

        const vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          onStatus('没有读取到 VRM 数据');
          return;
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);

        const constraintManager = vrm.nodeConstraintManager as { update?: unknown } | undefined;
        if (constraintManager) {
          constraintManager.update = () => undefined;
        }

        const springBoneManager = (vrm as unknown as { springBoneManager?: { update?: unknown } }).springBoneManager;
        if (springBoneManager) {
          springBoneManager.update = () => undefined;
        }

        vrm.scene.rotation.y = Math.PI;
        vrm.scene.position.set(0, 0, 0);
        scene.add(vrm.scene);
        vrmScene = vrm.scene;
        vrmRef.current = vrm;
        onStatus('已就绪');
      } catch (error) {
        onStatus(`加载失败：${(error as Error).message}`);
      }
    };

    loadModel();

    const animate = () => {
      if (disposed) return;
      rafRef.current = requestAnimationFrame(animate);

      const dt = Math.min(clockRef.current.getDelta(), 0.05);
      const elapsed = clockRef.current.elapsedTime;
      const vrm = vrmRef.current;

      if (vrm) {
        const currentMode = modeRef.current;
        const currentIntensity = intensityRef.current;
        const mouth =
          currentMode === 'speak'
            ? THREE.MathUtils.clamp(0.18 + Math.abs(Math.sin(elapsed * 8.4)) * 0.42, 0, 0.72)
            : currentMode === 'wave'
              ? 0.12
              : 0;

        const blink = blinkRef.current;
        if (!blink.active && elapsed > blink.next) {
          blink.active = true;
          blink.start = elapsed;
        }

        let blinkValue = 0;
        if (blink.active) {
          const blinkTime = elapsed - blink.start;
          if (blinkTime < 0.08) blinkValue = blinkTime / 0.08;
          else if (blinkTime < 0.17) blinkValue = 1 - (blinkTime - 0.08) / 0.09;
          else {
            blink.active = false;
            blink.next = elapsed + 2.4 + Math.random() * 3.2;
          }
        }

        vrm.expressionManager?.setValue('blink', blinkValue);
        vrm.expressionManager?.setValue('aa', mouth);
        vrm.expressionManager?.setValue('happy', currentMode === 'wave' ? 0.22 : currentMode === 'speak' ? 0.12 : 0);
        vrm.expressionManager?.setValue('relaxed', currentMode === 'think' ? 0.16 : 0.04);

        vrm.scene.position.y = Math.sin(elapsed * 1.1) * 0.004;
        vrm.scene.rotation.y = Math.PI;
        vrm.update(dt);

        const targetPose = buildPose(currentMode, elapsed, currentIntensity);
        lerpPose(poseRef.current, targetPose, Math.min(1, dt * 6.5));

        for (const boneName of CONTROLLED_BONES) {
          const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
          const pose = poseRef.current[boneName as string];
          if (!bone || !pose) continue;
          bone.rotation.set(pose.x, pose.y, pose.z);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      controls.dispose();
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
      if (vrmScene) disposeObject(vrmScene);
      renderer.dispose();
    };
  }, [onStatus]);

  return (
    <section className="stage">
      <canvas ref={canvasRef} />
      <div ref={containerRef} className="stage-probe" />
    </section>
  );
}

function GuideHumanDemo() {
  const [mode, setMode] = useState<GuideMode>('speak');
  const [intensity, setIntensity] = useState(0.78);
  const [status, setStatus] = useState('正在初始化');

  return (
    <main className="demo-shell">
      <NaturalGuideStage mode={mode} intensity={intensity} onStatus={setStatus} />

      <aside className="control-panel">
        <div>
          <p className="kicker">SCENIC GUIDE</p>
          <h1>数字人导游</h1>
          <p className="subtitle">上半身动作控制器</p>
        </div>

        <div className="status-line">
          <span />
          <strong>{status}</strong>
        </div>

        <div className="mode-grid" aria-label="动作模式">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mode-button ${mode === item.id ? 'active' : ''}`}
              data-tone={item.tone}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="range-row">
          <span>动作幅度</span>
          <strong>{Math.round(intensity * 100)}%</strong>
          <input
            type="range"
            min="0.35"
            max="1.05"
            step="0.01"
            value={intensity}
            onChange={(event) => setIntensity(Number(event.target.value))}
          />
        </label>

        <div className="sample-card">
          <span>示例讲解</span>
          <p>欢迎来到景区。前方是游客服务中心，右侧通往历史文化展陈区。</p>
        </div>
      </aside>
    </main>
  );
}

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; }
  html, body, #root { width: 100%; height: 100%; margin: 0; }
  body {
    color: #211a14;
    background:
      linear-gradient(90deg, rgba(126, 86, 48, 0.08) 1px, transparent 1px),
      linear-gradient(0deg, rgba(126, 86, 48, 0.06) 1px, transparent 1px),
      #efe7db;
    background-size: 42px 42px;
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
  }
  .demo-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    width: 100%;
    height: 100%;
    padding: 18px;
    gap: 18px;
  }
  .stage {
    position: relative;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(63, 48, 34, 0.16);
    border-radius: 8px;
    background:
      radial-gradient(circle at 48% 32%, rgba(255,255,255,0.78), rgba(239,231,219,0.3) 38%, rgba(214,198,176,0.3) 100%);
    box-shadow: 0 28px 80px rgba(47, 35, 23, 0.16);
  }
  .stage canvas,
  .stage-probe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .stage-probe { pointer-events: none; }
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
    overflow: auto;
    border: 1px solid rgba(63, 48, 34, 0.16);
    border-radius: 8px;
    padding: 22px;
    background: rgba(255, 250, 242, 0.92);
    box-shadow: 0 28px 80px rgba(47, 35, 23, 0.11);
  }
  .kicker {
    margin: 0 0 8px;
    color: #8b5d33;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }
  h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.05;
    font-weight: 900;
  }
  .subtitle {
    margin: 8px 0 0;
    color: #6b5a4a;
    font-size: 15px;
  }
  .status-line {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 13px;
    border: 1px solid rgba(58, 130, 110, 0.22);
    border-radius: 8px;
    background: rgba(58, 130, 110, 0.08);
    color: #245248;
  }
  .status-line span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3a826e;
    box-shadow: 0 0 0 5px rgba(58, 130, 110, 0.14);
  }
  .status-line strong {
    font-size: 13px;
  }
  .mode-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .mode-button {
    min-height: 48px;
    border: 1px solid rgba(63, 48, 34, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.58);
    color: #2b2119;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
  }
  .mode-button:hover {
    transform: translateY(-1px);
    border-color: rgba(176, 70, 45, 0.35);
  }
  .mode-button.active {
    border-color: #b0462d;
    background: rgba(176, 70, 45, 0.12);
    color: #8a2f1d;
  }
  .range-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
    padding: 14px;
    border: 1px solid rgba(63, 48, 34, 0.12);
    border-radius: 8px;
    background: rgba(255,255,255,0.48);
  }
  .range-row span {
    color: #5f5145;
    font-weight: 700;
  }
  .range-row strong {
    color: #8a2f1d;
  }
  .range-row input {
    grid-column: 1 / -1;
    width: 100%;
    accent-color: #b0462d;
  }
  .sample-card {
    margin-top: auto;
    padding: 16px;
    border-left: 4px solid #3a826e;
    background: rgba(58, 130, 110, 0.08);
    border-radius: 0 8px 8px 0;
  }
  .sample-card span {
    display: block;
    color: #245248;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 8px;
  }
  .sample-card p {
    margin: 0;
    color: #54483d;
    line-height: 1.7;
    font-size: 14px;
  }
  @media (max-width: 900px) {
    .demo-shell {
      grid-template-columns: 1fr;
      height: auto;
      min-height: 100%;
    }
    .stage {
      min-height: 620px;
    }
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GuideHumanDemo />
  </React.StrictMode>,
);
