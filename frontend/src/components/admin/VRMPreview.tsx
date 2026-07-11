import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

interface VRMPreviewProps {
  modelUrl: string;
  width?: number;
  height?: number;
  className?: string;
}

export const VRMPreview: React.FC<VRMPreviewProps> = ({
  modelUrl,
  width = 320,
  height = 420,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let disposed = false;
    let rafId = 0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, width / Math.max(height, 1), 0.1, 20);
    camera.position.set(0, 1.1, 3.2);
    camera.lookAt(0, 1.0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb4d4ff, 0.35);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xfff0dd, 0.25);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    let vrm: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let lastTime = performance.now();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          setError('无法解析 VRM 模型');
          setLoading(false);
          return;
        }

        VRMUtils.rotateVRM0(vrm);
        scene.add(vrm.scene);

        // 调整上臂旋转，从 T-pose 改为手臂自然下垂的 A-pose
        const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
        const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
        if (leftUpperArm) {
          leftUpperArm.rotation.z += 1.1;
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.z -= 1.1;
        }
        vrm.humanoid.update();
        vrm.update(0);

        // 自动缩放使全身可见
        vrm.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = box.getSize(new THREE.Vector3());
        const targetHeight = 1.75;
        const scale = targetHeight / Math.max(size.y, 0.01);
        vrm.scene.scale.set(scale, scale, scale);
        vrm.scene.updateWorldMatrix(true, true);

        const center = box.getCenter(new THREE.Vector3());
        vrm.scene.position.x = -center.x * scale;
        vrm.scene.position.y = -box.min.y * scale - 0.05;
        vrm.scene.position.z = -center.z * scale;

        mixer = new THREE.AnimationMixer(vrm.scene);
        const animate = (time = performance.now()) => {
          if (disposed) return;
          const dt = Math.min((time - lastTime) / 1000, 0.1);
          lastTime = time;

          vrm?.update(dt);
          mixer?.update(dt);

          renderer.render(scene, camera);
          rafId = requestAnimationFrame(animate);
        };
        animate();
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('[VRMPreview] load failed:', err);
        setError('VRM 模型加载失败');
        setLoading(false);
      },
    );

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      mixer?.stopAllAction();
      vrm?.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const materials = Array.isArray((obj as THREE.Mesh).material)
          ? ((obj as THREE.Mesh).material as THREE.Material[])
          : [(obj as THREE.Mesh).material as THREE.Material];
        materials.forEach((m) => m?.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, width, height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {(loading || error) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-secondary)',
            fontSize: 13,
            background: 'rgba(247,245,240,0.6)',
            borderRadius: 'inherit',
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '2px solid rgba(201,169,110,0.2)',
                  borderTopColor: 'var(--gold-leaf)',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span>正在加载 VRM 模型…</span>
            </>
          ) : (
            <span>{error}</span>
          )}
        </div>
      )}
    </div>
  );
};
