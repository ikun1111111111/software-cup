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
}

export interface Live2DStageProps {
  modelPath: string;
  width?: number;
  height?: number;
  scale?: number;
  x?: number;
  y?: number;
  onModelLoaded?: (model: any) => void;
  onError?: (error: string) => void;
  onModelRef?: (actions: Live2DModelActions) => void;
}

const Live2DStage = forwardRef<Live2DModelActions, Live2DStageProps>(({
  modelPath,
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
      if (modelRef.current?.internalModel?.coreModel) {
        modelRef.current.internalModel.coreModel.setParameterValueById(id, value);
      }
    },
    getModel: () => modelRef.current,
  }), []);

  // Notify parent of model actions ref
  useEffect(() => {
    if (onModelRef && modelRef.current) {
      onModelRef({
        setExpression: (name: string) => modelRef.current?.expression(name),
        motion: (group: string, index?: number) => modelRef.current?.motion(group, index),
        setParameter: (id: string, value: number) => {
          if (modelRef.current?.internalModel?.coreModel) {
            modelRef.current.internalModel.coreModel.setParameterValueById(id, value);
          }
        },
        getModel: () => modelRef.current,
      });
    }
  }, [onModelRef]);

  // Mouse tracking for eye/head follow
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!modelRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Focus on pointer position (maps to model core parameters)
    modelRef.current.focus(px * rect.width, py * rect.height);
  }, []);

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

        // Ensure the container has been laid out with real dimensions.
        // If the container is still zero-sized, wait one frame for layout.
        const waitForLayout = () =>
          new Promise<void>((resolve) => {
            const check = () => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect && rect.width > 0 && rect.height > 0) {
                resolve();
              } else {
                requestAnimationFrame(check);
              }
            };
            requestAnimationFrame(check);
          });

        await waitForLayout();
        if (destroyed) return;

        // Use actual rendered dimensions from the container
        const rect = containerRef.current!.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);

        // Set canvas size explicitly before creating renderer
        canvas.width = w;
        canvas.height = h;

        // Create PIXI Application with verified dimensions
        // Workaround: some GPUs report maxIfStatements=0 which crashes PIXI batch renderer
        const batchAny = (pixi as any).BatchRenderer;
        if (batchAny) {
          batchAny.defaultMaxIfStatements = 64;
        }

        const app = new pixi.Application({
          view: canvas,
          width: w,
          height: h,
          backgroundAlpha: 0,
          antialias: true,
          autoStart: true,
        });

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

        // Auto-fit: scale model to fit entirely within canvas
        model.scale.set(scale);
        const curW = model.width || 0;
        const curH = model.height || 0;
        if (curW > 0 && curH > 0) {
          // model.width/height are in canvas pixels at current scale,
          // so dividing by scale gives unscaled size, then compute fit
          const unscaledW = curW / scale;
          const unscaledH = curH / scale;
          const fitScale = Math.min(w / unscaledW, h / unscaledH) * 0.92;
          model.scale.set(fitScale);
        }
        model.anchor.set(0.5, 0.5);
        model.x = w / 2 + x;
        model.y = h / 2 + y;

        // Enable interaction
        model.interactive = true;
        model.on('pointerdown', handleClick);

        app.stage.addChild(model);
        modelRef.current = model;

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
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [modelPath, width, height, scale, x, y]);

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
        onPointerMove={handlePointerMove}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
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
