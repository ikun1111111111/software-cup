import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type * as PIXI from 'pixi.js';

let Live2DModel: any = null;
let MotionPreloadStrategy: any = null;
let cubismLoaded = false;
let pixiModule: any = null;

async function loadCubismRuntime() {
  if (cubismLoaded) return;
  try {
    const pixi = await import('pixi.js');
    pixiModule = pixi;
    const live2d = await import('pixi-live2d-display/cubism4');
    Live2DModel = live2d.Live2DModel;
    MotionPreloadStrategy = live2d.MotionPreloadStrategy;
    (Live2DModel as any).registerTicker?.(pixi.Ticker);

    const EventBoundary = (pixi as any).EventBoundary;
    const patchMethod = (methodName: string) => {
      if (EventBoundary?.prototype?.[methodName]) {
        const original = EventBoundary.prototype[methodName];
        EventBoundary.prototype[methodName] = function (...args: any[]) {
          try {
            return original.apply(this, args);
          } catch (e: any) {
            if (e?.message?.includes('isInteractive')) return null;
            throw e;
          }
        };
      }
    };
    patchMethod('hitTestMoveRecursive');
    patchMethod('hitTestRecursive');

    const BatchRenderer = (pixi as any).BatchRenderer;
    if (BatchRenderer?.prototype?.contextChange && !(BatchRenderer.prototype.contextChange as any).__safe) {
      const settings = (pixi as any).settings;
      const ENV = (pixi as any).ENV;
      const checkMax = (pixi as any).checkMaxIfStatementsInShader;
      const origContextChange = BatchRenderer.prototype.contextChange;

      BatchRenderer.prototype.contextChange = function safeContextChange(this: any) {
        try {
          origContextChange.call(this);
        } catch {
          const gl = this.renderer?.gl;
          const maxTex = gl ? Math.max(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 0, 1) : 1;
          this.maxTextures = settings?.PREFER_ENV === ENV?.WEBGL_LEGACY ? 1 : maxTex;
          try {
            if (checkMax) this.maxTextures = checkMax(this.maxTextures, gl);
          } catch {
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
  /** Costume texture paths (2 files: texture_00 and texture_01). Takes precedence over texturePath. */
  texturePaths?: [string, string];
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

/** Parse a CSS filter string into a PIXI ColorMatrixFilter array. */
function buildColorFilter(cssFilter?: string): any[] {
  if (!cssFilter || cssFilter === 'none') return [];
  if (!pixiModule?.ColorMatrixFilter) return [];

  const cmf = new pixiModule.ColorMatrixFilter();
  const hueMatch = cssFilter.match(/hue-rotate\(([^)]+)\)/);
  const satMatch = cssFilter.match(/saturate\(([^)]+)\)/);
  const briMatch = cssFilter.match(/brightness\(([^)]+)\)/);
  const conMatch = cssFilter.match(/contrast\(([^)]+)\)/);
  const sepMatch = cssFilter.match(/sepia\(([^)]+)\)/);

  if (sepMatch) cmf.sepia(false);
  if (hueMatch) cmf.hue(parseFloat(hueMatch[1]), false);
  if (satMatch) cmf.saturate(parseFloat(satMatch[1]) - 1, false);
  if (briMatch) cmf.brightness(parseFloat(briMatch[1]), false);
  if (conMatch) cmf.contrast(parseFloat(conMatch[1]), false);

  return [cmf];
}

const Live2DStage = forwardRef<Live2DModelActions, Live2DStageProps>(({
  modelPath,
  texturePath,
  texturePaths,
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
  const colorFilterRef = useRef<any[]>([]);
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
        const pixi = pixiModule || await import('pixi.js');
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
        switchTexture: async () => {},
      });
    }
  }, [onModelRef]);

  // Apply costume textures when texturePaths changes or model finishes loading.
  // isLoading is a dep so the initial textures get applied once the model is ready.
  useEffect(() => {
    const paths = texturePaths || (texturePath ? [texturePath] : null);
    if (!paths || !modelRef.current || isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const pixi = pixiModule || await import('pixi.js');
        const loaded = await Promise.all(paths.map((p: string) => pixi.Assets.load(p)));
        if (cancelled) return;
        const model = modelRef.current;
        if (!model?.textures) return;
        for (let i = 0; i < loaded.length && i < model.textures.length; i++) {
          model.textures[i] = loaded[i];
        }
      } catch (e) {
        console.warn('[Live2DStage] texture swap failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [texturePaths, texturePath, isLoading]);

  // Update color filter ref when cssFilter changes (ticker applies it per-frame)
  useEffect(() => {
    colorFilterRef.current = buildColorFilter(cssFilter);
  }, [cssFilter]);

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

  // Initialize PIXI app and load model — only re-runs when modelPath changes.
  // Size/position changes are handled by ResizeObserver (no full reload).
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

        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
          modelRef.current = null;
        }

        await loadCubismRuntime();
        const pixi = pixiModule || await import('pixi.js');
        (window as any).__pixi_module = pixi;

        // Wait for container dimensions with timeout fallback
        const waitForLayout = () =>
          new Promise<void>((resolve) => {
            let elapsed = 0;
            const poll = () => {
              if (destroyed) return resolve();
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect && rect.width > 0 && rect.height > 0) return resolve();
              elapsed += 50;
              if (elapsed >= LAYOUT_TIMEOUT_MS) return resolve();
              setTimeout(poll, 50);
            };
            poll();
          });

        await waitForLayout();
        if (destroyed) return;

        const rect = containerRef.current!.getBoundingClientRect();
        const w = Math.max(Math.floor(rect.width) || width, 1);
        const h = Math.max(Math.floor(rect.height) || height, 1);

        canvas.width = w;
        canvas.height = h;

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

        const model = await Live2DModel.from(modelPath, {
          motionPreload: MotionPreloadStrategy.IDLE,
          autoInteract: false,
        });

        if (destroyed) {
          model.destroy();
          return;
        }

        app.ticker.add(() => {
          const v = lipSyncValuesRef.current;
          const core = model.internalModel?.coreModel;
          if (!core) return;
          if (v.mouthOpenY > 0.01 || v.mouthForm > 0.01) {
            core.setParameterValueById('ParamMouthOpenY', v.mouthOpenY);
            core.setParameterValueById('ParamMouthForm', v.mouthForm);
          }
          core.setParameterValueById('ParamAngleZ', v.angleZ);
          const cf = colorFilterRef.current;
          model.filters = cf.length > 0 ? cf : null;
        });

        // Auto-fit model to canvas
        model.scale.set(scale);
        const curW = model.width || 0;
        const curH = model.height || 0;
        if (curW > 0 && curH > 0) {
          const fitScale = Math.min(w / (curW / scale), h / (curH / scale)) * 0.92;
          model.scale.set(fitScale);
        }
        model.anchor.set(0.5, 0.5);
        model.x = w / 2 + x;
        model.y = h / 2 + y;

        app.stage.addChild(model);
        modelRef.current = model;

        // ResizeObserver handles all size changes — no need to recreate the app
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

        colorFilterRef.current = buildColorFilter(cssFilter);

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
  }, [modelPath, handleClick]);

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
