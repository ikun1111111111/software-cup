import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type * as PIXI from 'pixi.js';

let Live2DModel: any = null;
let MotionPreloadStrategy: any = null;
let cubismLoaded = false;

async function loadCubismRuntime() {
  if (cubismLoaded) return;
  try {
    const pixi = await import('pixi.js');
    const live2d = await import('pixi-live2d-display/cubism4');
    Live2DModel = live2d.Live2DModel;
    MotionPreloadStrategy = live2d.MotionPreloadStrategy;
    (Live2DModel as any).registerTicker?.(pixi.Ticker);

    // Patch PIXI v7 EventBoundary to avoid isInteractive crash with pixi-live2d-display
    const EventBoundary = (pixi as any).EventBoundary;
    const patchMethod = (methodName: string) => {
      if (EventBoundary?.prototype?.[methodName]) {
        const original = EventBoundary.prototype[methodName];
        EventBoundary.prototype[methodName] = function (...args: any[]) {
          try {
            return original.apply(this, args);
          } catch (e: any) {
            if (e?.message?.includes('isInteractive')) {
              return null;
            }
            throw e;
          }
        };
      }
    };
    patchMethod('hitTestMoveRecursive');
    patchMethod('hitTestRecursive');

    // Fix: some GPUs (especially integrated) report MAX_TEXTURE_IMAGE_UNITS = 0,
    // which causes checkMaxIfStatementsInShader(0, gl) to throw.
    // Override BatchRenderer.prototype.contextChange with a safe version.
    const BatchRenderer = (pixi as any).BatchRenderer;
    if (BatchRenderer?.prototype?.contextChange && !(BatchRenderer.prototype.contextChange as any).__safe) {
      const settings = (pixi as any).settings;
      const ENV = (pixi as any).ENV;
      const checkMax = (pixi as any).checkMaxIfStatementsInShader;
      const origContextChange = BatchRenderer.prototype.contextChange;

      BatchRenderer.prototype.contextChange = function safeContextChange(this: any) {
        try {
          // Try original first
          origContextChange.call(this);
        } catch {
          // GPU returned 0 for MAX_TEXTURE_IMAGE_UNITS — build a minimal working state
          const gl = this.renderer?.gl;
          const maxTex = gl ? Math.max(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 0, 1) : 1;
          this.maxTextures = settings?.PREFER_ENV === ENV?.WEBGL_LEGACY ? 1 : maxTex;
          try {
            if (checkMax) this.maxTextures = checkMax(this.maxTextures, gl);
          } catch {
            // Even clamped value failed — use absolute minimum
            this.maxTextures = 1;
          }
          this._shader = this.shaderGenerator.generateShader(this.maxTextures);
          for (let i = 0; i < this._packedGeometryPoolSize; i++) {
            this._packedGeometries[i] = new this.geometryClass();
          }
        }
      };
      (BatchRenderer.prototype.contextChange as any).__safe = true;
    }

    cubismLoaded = true;
  } catch (e) {
    throw new Error('Live2D Cubism 4 runtime not available. Ensure live2dcubismcore.js is loaded.');
  }
}

export interface Live2DModelActions {
  setExpression: (name: string) => void;
  motion: (group: string, index?: number) => void;
  setParameter: (id: string, value: number) => void;
  getModel: () => any;
  /** Swap the model's body texture at runtime. */
  switchTexture: (textureUrl: string) => Promise<void>;
}

export interface Live2DStageProps {
  modelPath: string;
  /** Optional costume texture PNG path. When changed, the model reloads with the new texture. */
  texturePath?: string;
  /** CSS filter applied to the canvas for costume visual variation. */
  cssFilter?: string;
  width?: number;
  height?: number;
  scale?: number;
  x?: number;
  y?: number;
  onModelLoaded?: (model: any) => void;
  onError?: (error: string) => void;
  onModelRef?: (actions: Live2DModelActions) => void;
}

const LAYOUT_TIMEOUT_MS = 3000;

const Live2DStage = forwardRef<Live2DModelActions, Live2DStageProps>(({
  modelPath,
  texturePath,
  cssFilter,
  width = 300,
  height = 400,
  scale = 0.15,
  x = 0,
  y = 0,
  onModelLoaded,
  onError,
  onModelRef,
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  // Lip sync values applied via ticker (after idle motion) to avoid override
  const lipSyncValuesRef = useRef({ mouthOpenY: 0, mouthForm: 0, angleZ: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expose model actions to parent
  useImperativeHandle(ref, () => ({
    setExpression: (name: string) => {
      modelRef.current?.expression(name);
    },
    motion: (group: string, index?: number) => {
      modelRef.current?.motion(group, index);
    },
    setParameter: (id: string, value: number) => {
      // Store in ref for ticker-based application (avoids idle motion override)
      if (id === 'ParamMouthOpenY') lipSyncValuesRef.current.mouthOpenY = value;
      else if (id === 'ParamMouthForm') lipSyncValuesRef.current.mouthForm = value;
      else if (id === 'ParamAngleZ') lipSyncValuesRef.current.angleZ = value;
    },
    getModel: () => modelRef.current,
    switchTexture: async (textureUrl: string) => {
      const model = modelRef.current;
      if (!model) return;
      try {
        const pixi = await import('pixi.js');
        const tex = await pixi.Assets.load(textureUrl);
        // pixi-live2d-display stores textures on the internal sprite
        const sprites = model.internalModel?.coreModel?._drawables;
        if (sprites) {
          // Try to find the first drawable with a texture and swap it
          for (const sprite of Object.values(sprites) as any[]) {
            if (sprite?.texture) {
              sprite.texture = tex;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[Live2DStage] switchTexture failed, texture may not exist:', textureUrl, e);
      }
    },
  }), []);

  // Notify parent of model actions ref
  useEffect(() => {
    if (onModelRef && modelRef.current) {
      onModelRef({
        setExpression: (name: string) => modelRef.current?.expression(name),
        motion: (group: string, index?: number) => modelRef.current?.motion(group, index),
        setParameter: (id: string, value: number) => {
          if (id === 'ParamMouthOpenY') lipSyncValuesRef.current.mouthOpenY = value;
          else if (id === 'ParamMouthForm') lipSyncValuesRef.current.mouthForm = value;
          else if (id === 'ParamAngleZ') lipSyncValuesRef.current.angleZ = value;
        },
        getModel: () => modelRef.current,
      });
    }
  }, [onModelRef]);

  // Apply costume texture when texturePath changes (without full model reload)
  useEffect(() => {
    if (!texturePath || !modelRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const pixi = await import('pixi.js');
        const tex = await pixi.Assets.load(texturePath);
        if (cancelled) return;
        const core = modelRef.current?.internalModel?.coreModel;
        if (!core) return;
        // Cubism 4: iterate drawables, swap first texture-bearing slot
        const count = core.getDrawableCount?.() ?? 0;
        for (let i = 0; i < count; i++) {
          const idx = core.getDrawableTextureIndex?.(i);
          if (idx >= 0) {
            // Swap via PIXI sprite if available
            const sprites = modelRef.current.internalModel?.sprites;
            if (sprites && sprites[i]) {
              sprites[i].texture = tex;
            }
            break;
          }
        }
      } catch {
        // Texture file may not exist yet — silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, [texturePath]);

  // Click to trigger random motion
  const handleClick = useCallback(() => {
    if (!modelRef.current) return;
    const motions = ['TapBody', 'TapHead', 'Tap'];
    const randomMotion = motions[Math.floor(Math.random() * motions.length)];
    try {
      modelRef.current.motion(randomMotion);
    } catch {
      // Model may not have this motion group
    }
  }, []);

  // Initialize PIXI app and load model
  useEffect(() => {
    if (!canvasRef.current || !modelPath) return;

    const canvas = canvasRef.current;
    let destroyed = false;
    let clickHandler: (() => void) | null = null;
    let moveHandler: ((e: MouseEvent) => void) | null = null;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Destroy previous app if exists
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
          modelRef.current = null;
        }

        // Dynamically load Cubism runtime + PIXI
        await loadCubismRuntime();
        const pixi = await import('pixi.js');

        // Wait for container to have real dimensions.
        // requestAnimationFrame runs before layout, so we use setTimeout to let
        // the browser finish layout first, then read bounding rect.
        const waitForLayout = () =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              if (destroyed) return resolve();
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect && rect.width > 0 && rect.height > 0) return resolve();
              // One more frame as fallback
              requestAnimationFrame(() => resolve());
            }, 50);
          });

        await waitForLayout();
        if (destroyed) return;

        // Use actual rendered dimensions, fall back to props if container is zero-sized
        const rect = containerRef.current!.getBoundingClientRect();
        const w = Math.max(Math.floor(rect.width) || width, 1);
        const h = Math.max(Math.floor(rect.height) || height, 1);

        // Set canvas size explicitly before creating renderer
        canvas.width = w;
        canvas.height = h;

        // Create PIXI Application with verified dimensions
        // Disable PIXI's event system — pixi-live2d-display v0.4 uses v6 API
        // (isInteractive() removed in v7). We handle mouse tracking via native DOM events.
        const app = new pixi.Application({
          view: canvas,
          width: w,
          height: h,
          backgroundAlpha: 0,
          antialias: true,
          autoStart: true,
          eventMode: 'none',
          eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
        } as any);

        appRef.current = app;

        // Load Live2D model
        const model = await Live2DModel.from(modelPath, {
          motionPreload: MotionPreloadStrategy.IDLE,
          autoInteract: false,
        });

        if (destroyed) {
          model.destroy();
          return;
        }

        // Enable built-in lip sync so our parameter updates are applied on top of idle motion
        // Register ticker callback to apply lip sync values AFTER idle motion updates
        app.ticker.add(() => {
          const v = lipSyncValuesRef.current;
          const core = model.internalModel?.coreModel;
          if (!core) return;
          if (v.mouthOpenY > 0.01 || v.mouthForm > 0.01) {
            core.setParameterValueById('ParamMouthOpenY', v.mouthOpenY);
            core.setParameterValueById('ParamMouthForm', v.mouthForm);
          }
          core.setParameterValueById('ParamAngleZ', v.angleZ);
        });

        // Auto-fit: scale model to fit entirely within canvas
        model.scale.set(scale);
        const curW = model.width || 0;
        const curH = model.height || 0;
        if (curW > 0 && curH > 0) {
          const unscaledW = curW / scale;
          const unscaledH = curH / scale;
          const fitScale = Math.min(w / unscaledW, h / unscaledH) * 0.92;
          model.scale.set(fitScale);
        }
        model.anchor.set(0.5, 0.5);
        model.x = w / 2 + x;
        model.y = h / 2 + y;

        app.stage.addChild(model);
        modelRef.current = model;

        // ResizeObserver: keep renderer in sync with container size changes
        // and fix the "thin line" bug caused by zero-size reads during init.
        const ro = new ResizeObserver((entries) => {
          if (destroyed || !appRef.current || !modelRef.current) return;
          for (const entry of entries) {
            const { width: cw, height: ch } = entry.contentRect;
            if (cw > 0 && ch > 0) {
              const newW = Math.floor(cw);
              const newH = Math.floor(ch);
              appRef.current.renderer.resize(newW, newH);
              const m = modelRef.current;
              const fitScale = Math.min(
                newW / (m.width / m.scale.x),
                newH / (m.height / m.scale.y)
              ) * 0.92;
              m.scale.set(fitScale);
              m.x = newW / 2 + x;
              m.y = newH / 2 + y;
            }
          }
        });
        if (containerRef.current) {
          ro.observe(containerRef.current);
        }
        roRef.current = ro;

        // Use native DOM events instead of PIXI events to avoid
        // isInteractive compatibility issues
        clickHandler = () => handleClick();
        canvas.addEventListener('click', clickHandler);

        moveHandler = (e: MouseEvent) => {
          if (!modelRef.current || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          modelRef.current.focus(px, py);
        };
        canvas.addEventListener('mousemove', moveHandler);

        setIsLoading(false);
        onModelLoaded?.(model);
      } catch (err: any) {
        if (destroyed) return;
        const errMsg = err?.message || 'Failed to load Live2D model';
        console.error('[Live2DStage]', errMsg, err);
        setError(errMsg);
        setIsLoading(false);
        onError?.(errMsg);
      }
    };

    init();

    return () => {
      destroyed = true;
      if (clickHandler && canvas) {
        canvas.removeEventListener('click', clickHandler);
      }
      if (moveHandler && canvas) {
        canvas.removeEventListener('mousemove', moveHandler);
      }
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [modelPath, width, height, scale, x, y, handleClick]);

  return (
    <div
      ref={containerRef}
      data-testid="live2d-stage"
      style={{
        position: 'relative',
        width,
        height,
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="live2d-canvas"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          minWidth: typeof width === 'number' ? width : 200,
          minHeight: typeof height === 'number' ? height : 300,
          cursor: 'pointer',
          filter: cssFilter || 'none',
          transition: 'filter 0.6s ease',
        }}
      />
      {isLoading && (
        <div
          data-testid="loading-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(248, 246, 242, 0.9)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: 36,
              height: 36,
              border: '3px solid #E8E5DF',
              borderTopColor: '#1A5FB4',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '13px', color: '#A8A198' }}>数字人加载中...</span>
          </div>
        </div>
      )}
      {error && (
        <div
          data-testid="error-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(248, 246, 242, 0.95)',
            gap: '8px',
            padding: '20px',
          }}
        >
          <span style={{ fontSize: '28px' }}>:(</span>
          <span style={{ color: '#DC4444', fontSize: '13px', textAlign: 'center' }}>{error}</span>
          <span style={{ color: '#A8A198', fontSize: '12px', textAlign: 'center' }}>
            请确认模型文件已放置在 public/models/ 目录下
          </span>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

Live2DStage.displayName = 'Live2DStage';

export default Live2DStage;
