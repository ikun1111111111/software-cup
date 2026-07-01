import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';

const VRM_URL = '/models/8024308560058477433.vrm';
const WAVE_GLB_URL = '/animations/mixamo/wave-export.glb';

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      material?.dispose();
    }
  });
}

function fitCameraToObjects(camera: THREE.PerspectiveCamera, controls: OrbitControls, objects: THREE.Object3D[]) {
  const box = new THREE.Box3();
  for (const object of objects) {
    box.expandByObject(object);
  }

  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const distance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

  controls.target.copy(center);
  camera.position.set(center.x, center.y + maxSize * 0.25, center.z + distance * 1.35);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = Math.max(distance * 100, 30);
  camera.updateProjectionMatrix();
  controls.update();
}

function MotionPreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixersRef = useRef<THREE.AnimationMixer[]>([]);
  const rafRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const [status, setStatus] = useState('正在初始化...');
  const [clipInfo, setClipInfo] = useState('尚未读取动画');

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f4efe6');

    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(0, 1.35, 4);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xd6ecff, 0.8);
    fill.position.set(-4, 3, -2);
    scene.add(fill);

    const grid = new THREE.GridHelper(5, 20, '#c7baa5', '#e2d7c7');
    scene.add(grid);

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
    let motionScene: THREE.Object3D | null = null;

    const loadAssets = async () => {
      try {
        const vrmLoader = new GLTFLoader();
        vrmLoader.register((parser) => new VRMLoaderPlugin(parser));

        setStatus('正在加载 VRM 模型...');
        const vrmGltf = await vrmLoader.loadAsync(VRM_URL);
        if (disposed) return;

        const vrm = vrmGltf.userData.vrm as VRM;
        VRMUtils.removeUnnecessaryVertices(vrmGltf.scene);
        VRMUtils.combineSkeletons(vrmGltf.scene);
        vrm.scene.position.set(-0.9, 0, 0);
        vrm.scene.rotation.y = Math.PI;
        vrm.scene.name = '当前 VRM 数字人';
        scene.add(vrm.scene);
        vrmRef.current = vrm;
        vrmScene = vrm.scene;

        setStatus('正在加载 Blender 导出的 wave-export.glb...');
        const gltfLoader = new GLTFLoader();
        const motionGltf = await gltfLoader.loadAsync(WAVE_GLB_URL);
        if (disposed) return;

        motionScene = motionGltf.scene;
        motionScene.name = 'Blender 导出的 Mixamo Wave GLB';
        motionScene.position.set(0.95, 0, 0);
        motionScene.rotation.y = Math.PI;
        scene.add(motionScene);

        if (motionGltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(motionScene);
          for (const clip of motionGltf.animations) {
            mixer.clipAction(clip).reset().play();
          }
          mixersRef.current.push(mixer);
          const names = motionGltf.animations.map((clip) => `${clip.name || '未命名'} ${clip.duration.toFixed(2)}s`);
          setClipInfo(names.join(' / '));
        } else {
          setClipInfo('这个 GLB 没有动画轨道');
        }

        fitCameraToObjects(camera, controls, [vrm.scene, motionScene]);
        setStatus('已加载。左边是你的 VRM，右边是 Blender 导出的动作源。');
      } catch (error) {
        setStatus(`加载失败：${(error as Error).message}`);
      }
    };

    loadAssets();

    const animate = () => {
      if (disposed) return;

      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clockRef.current.getDelta(), 0.05);

      for (const mixer of mixersRef.current) {
        mixer.update(dt);
      }

      const vrm = vrmRef.current;
      if (vrm) {
        const blink = Math.max(0, Math.sin(performance.now() / 760) - 0.965) * 24;
        vrm.expressionManager?.setValue('blink', blink);
        vrm.update(dt);
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
      mixersRef.current = [];
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
      if (motionScene) {
        disposeObject(motionScene);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <main className="preview-shell">
      <section className="stage">
        <canvas ref={canvasRef} />
        <div ref={containerRef} className="stage-probe" />
      </section>

      <aside className="panel">
        <p className="eyebrow">Blender GLB 验证</p>
        <h1>动作源预览</h1>
        <p className="intro">
          这一步不做重定向，只检查 Blender 导出的动作文件是否干净。右边角色如果能自然挥手，
          后面才值得继续把动作套到 VRM 上。
        </p>

        <div className="status-card">
          <strong>状态</strong>
          <span>{status}</span>
        </div>

        <div className="status-card">
          <strong>动画轨道</strong>
          <span>{clipInfo}</span>
        </div>

        <div className="checklist">
          <strong>现在只看三件事</strong>
          <p>1. 右边角色是不是完整，没有身体碎开。</p>
          <p>2. 播放时是不是明确在挥手。</p>
          <p>3. 动作节奏是不是适合“导游打招呼”。</p>
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
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    color: #211a15;
    background: #eee5d7;
  }
  .preview-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .stage {
    position: relative;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(60, 45, 31, 0.16);
    border-radius: 8px;
    background: #f4efe6;
    box-shadow: 0 20px 70px rgba(47, 34, 22, 0.14);
  }
  .stage canvas,
  .stage-probe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .stage-probe { pointer-events: none; }
  .panel {
    overflow: auto;
    border: 1px solid rgba(60, 45, 31, 0.16);
    border-radius: 8px;
    padding: 22px;
    background: rgba(255, 250, 242, 0.9);
    box-shadow: 0 20px 70px rgba(47, 34, 22, 0.1);
  }
  .eyebrow {
    margin: 0 0 8px;
    color: #94704d;
    font-size: 12px;
    font-weight: 700;
  }
  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 800;
  }
  .intro {
    margin: 12px 0 0;
    color: #6d5f53;
    font-size: 14px;
    line-height: 1.75;
  }
  .status-card,
  .checklist {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid rgba(72, 132, 116, 0.22);
    border-radius: 8px;
    background: rgba(72, 132, 116, 0.08);
  }
  .status-card strong,
  .status-card span,
  .checklist strong {
    display: block;
  }
  .status-card span {
    margin-top: 8px;
    color: #284f49;
    line-height: 1.55;
  }
  .checklist p {
    margin: 8px 0 0;
    color: #62564b;
    line-height: 1.6;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionPreview />
  </React.StrictMode>,
);
