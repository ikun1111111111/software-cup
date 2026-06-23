import type { VRM } from '@pixiv/three-vrm';

interface BlinkState {
  nextBlinkTime: number;
  blinkStartTime: number;
  isBlinking: boolean;
}

const blinkState: BlinkState = {
  nextBlinkTime: 0,
  blinkStartTime: 0,
  isBlinking: false,
};

function getNextBlinkInterval(elapsed: number): number {
  return elapsed + 3 + Math.random() * 2;
}

function computeBlinkValue(elapsed: number): number {
  if (!blinkState.isBlinking) {
    if (elapsed >= blinkState.nextBlinkTime) {
      blinkState.isBlinking = true;
      blinkState.blinkStartTime = elapsed;
      blinkState.nextBlinkTime = getNextBlinkInterval(elapsed);
    }
    return 0;
  }

  const blinkDuration = 0.15;
  const blinkProgress = (elapsed - blinkState.blinkStartTime) / blinkDuration;

  if (blinkProgress >= 1) {
    blinkState.isBlinking = false;
    return 0;
  }

  if (blinkProgress < 0.5) {
    return blinkProgress * 2;
  }
  return (1 - blinkProgress) * 2;
}

export function applyIdleAnimation(vrm: VRM, elapsed: number, dt: number, speaking: boolean = false): void {
  const blinkValue = computeBlinkValue(elapsed);
  vrm.expressionManager?.setValue('blink', blinkValue);

  const breathValue = Math.sin(elapsed * (Math.PI * 2) / 3) * 0.02;
  const rootBone = vrm.scene.children[0];
  if (rootBone) {
    rootBone.position.y = breathValue;
  }

  const headSwayAmplitude = speaking ? 0.015 : 0.03;
  const headRotX = Math.sin(elapsed * (Math.PI * 2) / 5) * headSwayAmplitude;
  const headRotZ = Math.cos(elapsed * (Math.PI * 2) / 7) * headSwayAmplitude * 0.7;

  const headBone = vrm.humanoid?.getNormalizedBoneNode('head');
  if (headBone) {
    headBone.rotation.x = headRotX;
    headBone.rotation.y = 0;
    headBone.rotation.z = headRotZ;
  }

  // Arms: T-pose → natural hanging (matches web VRMStage)
  const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');

  if (leftUpperArm) {
    leftUpperArm.rotation.z = 1.45;
    leftUpperArm.rotation.x = 0.12;
  }
  if (rightUpperArm) {
    rightUpperArm.rotation.z = -1.45;
    rightUpperArm.rotation.x = 0.12;
  }
  if (leftLowerArm) {
    leftLowerArm.rotation.x = 0.05;
  }
  if (rightLowerArm) {
    rightLowerArm.rotation.x = 0.05;
  }
}

// 口型平滑过渡
let currentMouthValue = 0;
const MOUTH_SMOOTHING = 0.3;

export function applyMouthOpen(vrm: VRM, value: number): void {
  currentMouthValue = currentMouthValue * MOUTH_SMOOTHING + value * (1 - MOUTH_SMOOTHING);
  vrm.expressionManager?.setValue('aa', Math.max(0, Math.min(1, currentMouthValue)));
}

// 记录上次设置的表情，避免每帧重复设置
let lastAppliedExpression: string | null = null;

export function applyExpression(vrm: VRM, emotion: string): void {
  // 只在表情变化时才设置，避免覆盖组合表情
  if (lastAppliedExpression === emotion) return;
  lastAppliedExpression = emotion;

  const expressions = ['happy', 'sad', 'angry', 'relaxed', 'surprised', 'neutral'];
  expressions.forEach((name) => {
    vrm.expressionManager?.setValue(name, name === emotion ? 1 : 0);
  });

  // thinking: 组合 relaxed + 自定义
  if (emotion === 'thinking') {
    vrm.expressionManager?.setValue('relaxed', 0.6);
    // 眉毛微皱（如果有）
    const browBone = vrm.humanoid?.getNormalizedBoneNode('head');
    if (browBone) {
      browBone.rotation.x = -0.05;
    }
  }

  // 注意：不设置 'aa'（嘴型），由 applyMouthOpen 单独控制
  // neutral: 保持自然中性表情
}

export type Action = 'nod' | 'shakeHead' | 'tiltHead' | 'lookUp' | 'lookDown' | 'wave' | 'point' | 'clap' | 'bow' | 'none';

export interface ActionLookAt {
  x: number;
  y: number;
  headRotX: number;
  headRotY: number;
}

let prevActionForTimer: Action = 'none';
let actionLocalStart = 0;

// lookUp 恢复状态
let isRecovering = false;
let recoverStart = 0;
const RECOVER_DURATION = 300; // 恢复时间 300ms
let recoverFromX = 0;
let recoverFromY = 0;

export function applyAction(
  vrm: VRM,
  action: Action,
  elapsed: number,
  durationMs: number = 800,
): ActionLookAt {
  const headBone = vrm.humanoid?.getNormalizedBoneNode('head');
  if (!headBone) return { x: 0, y: 0, headRotX: 0, headRotY: 0 };

  // 检测 lookUp 结束，启动恢复
  if (prevActionForTimer === 'lookUp' && action !== 'lookUp' && !isRecovering) {
    isRecovering = true;
    recoverStart = Date.now();
    recoverFromX = headBone.rotation.x;
    recoverFromY = headBone.rotation.y;
  }

  // 恢复期间
  if (isRecovering) {
    // 如果有新动作，立即结束恢复
    if (action !== 'none') {
      isRecovering = false;
    } else {
      const recoverElapsed = Date.now() - recoverStart;
      const recoverProgress = Math.min(recoverElapsed / RECOVER_DURATION, 1);
      const easeOut = 1 - Math.pow(1 - recoverProgress, 2);

      headBone.rotation.x = recoverFromX * (1 - easeOut);
      headBone.rotation.y = recoverFromY * (1 - easeOut);

      if (recoverProgress >= 1) {
        isRecovering = false;
      }

      return { x: 0, y: 0, headRotX: 0, headRotY: 0 };
    }
  }

  if (action === 'none') {
    prevActionForTimer = 'none';
    return { x: 0, y: 0, headRotX: 0, headRotY: 0 };
  }

  // 每次 action 变化时重置本地计时
  if (action !== prevActionForTimer) {
    prevActionForTimer = action;
    actionLocalStart = Date.now();
  }
  const localElapsed = Date.now() - actionLocalStart;

  const progress = Math.min(localElapsed / durationMs, 1);
  const decay = 1 - progress * progress;

  let lookAtX = 0;
  let lookAtY = 0;
  let headRotX = 0;
  let headRotY = 0;

  const t = localElapsed / 1000; // 转成秒

  switch (action) {
    case 'nod':
      headBone.rotation.x += Math.sin(t * Math.PI * 4) * 0.12 * decay;
      break;
    case 'shakeHead':
      headBone.rotation.y += Math.sin(t * Math.PI * 3) * 0.2 * decay;
      break;
    case 'tiltHead':
      headBone.rotation.z += Math.sin(t * Math.PI * 3) * 0.08 * decay;
      break;
    case 'lookUp': {
      const lookUpCurve = progress < 0.2
        ? (progress / 0.2) * (progress / 0.2)
        : progress > 0.8
          ? ((1 - progress) / 0.2) * ((1 - progress) / 0.2)
          : 1;
      headBone.rotation.x = 0.25 * lookUpCurve;
      headBone.rotation.y = 0.15 * lookUpCurve;
      lookAtX = 2.5 * lookUpCurve;
      lookAtY = 2.0 * lookUpCurve;
      break;
    }
    case 'lookDown':
      headBone.rotation.x += 0.15 * decay;
      lookAtY = -0.3 * decay;
      break;

    case 'wave': {
      const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
      const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
      const rightHand = vrm.humanoid?.getNormalizedBoneNode('rightHand');
      if (rightUpperArm && rightLowerArm) {
        const raiseCurve = progress < 0.15
          ? (progress / 0.15)
          : progress > 0.85
            ? ((1 - progress) / 0.15)
            : 1;
        rightUpperArm.rotation.z = -1.45 + 3.0 * raiseCurve;
        rightUpperArm.rotation.x = 0.12 * (1 - raiseCurve);
        rightUpperArm.rotation.y = 0;
        rightLowerArm.rotation.x = -5.0 * raiseCurve;
        rightLowerArm.rotation.z = 0;
        if (rightHand) {
          rightHand.rotation.x = 0.3 * raiseCurve;
          rightHand.rotation.y = Math.sin(t * Math.PI * 6) * 0.5 * decay * raiseCurve;
          rightHand.rotation.z = 0;
        }
        headBone.rotation.y = 0.2 * raiseCurve;
        lookAtX = 0.5 * raiseCurve;
        lookAtY = 0.3 * raiseCurve;
      }
      break;
    }

    case 'point': {
      const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
      const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
      const rightHand = vrm.humanoid?.getNormalizedBoneNode('rightHand');
      if (rightUpperArm && rightLowerArm) {
        const raiseCurve = progress < 0.15
          ? (progress / 0.15)
          : progress > 0.85
            ? ((1 - progress) / 0.15)
            : 1;
        rightUpperArm.rotation.z = -1.45 + 2.2 * raiseCurve;
        rightUpperArm.rotation.x = 0.12 * (1 - raiseCurve) - 0.8 * raiseCurve;
        rightUpperArm.rotation.y = -0.3 * raiseCurve;
        rightLowerArm.rotation.x = -3.0 * raiseCurve;
        rightLowerArm.rotation.z = 0;
        if (rightHand) {
          rightHand.rotation.x = 0.2 * raiseCurve;
          rightHand.rotation.y = 0;
        }
        // 手指：食指伸出，其余握拳
        const curl = 0.8 * raiseCurve;
        ['rightMiddleProximal','rightRingProximal','rightLittleProximal',
         'rightMiddleIntermediate','rightRingIntermediate','rightLittleIntermediate'].forEach(name => {
          const bone = vrm.humanoid?.getNormalizedBoneNode(name as any);
          if (bone) (bone as any).rotation.x = curl;
        });
        const thumb = vrm.humanoid?.getNormalizedBoneNode('rightThumbProximal');
        if (thumb) (thumb as any).rotation.z = -0.3 * raiseCurve;
        headBone.rotation.y = 0.4 * raiseCurve;
        headBone.rotation.x = -0.15 * raiseCurve;
        lookAtX = 1.5 * raiseCurve;
        lookAtY = 0.5 * raiseCurve;
      }
      break;
    }

    case 'clap': {
      const lua = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
      const rua = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
      const lla = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm');
      const rla = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm');
      const lh = vrm.humanoid?.getNormalizedBoneNode('leftHand');
      const rh = vrm.humanoid?.getNormalizedBoneNode('rightHand');
      if (lua && rua && lla && rla) {
        const raiseCurve = progress < 0.15
          ? (progress / 0.15)
          : progress > 0.85
            ? ((1 - progress) / 0.15)
            : 1;
        lua.rotation.z = 1.45 - 0.262 * raiseCurve;
        lua.rotation.x = 0.524 * raiseCurve;
        rua.rotation.z = -1.45 + 0.262 * raiseCurve;
        rua.rotation.x = 0.524 * raiseCurve;
        lla.rotation.y = -2.443 * raiseCurve;
        rla.rotation.y = 2.443 * raiseCurve;
        lla.rotation.z = 0.489 * raiseCurve;
        rla.rotation.z = -0.489 * raiseCurve;
        const clapOsc = Math.sin(t * Math.PI * 5) * 0.3 * decay * raiseCurve;
        if (lh) {
          lh.rotation.x = 0.698 * raiseCurve;
          lh.rotation.z = 1.2 * raiseCurve + clapOsc - 0.6 * raiseCurve - 1.047 * raiseCurve;
        }
        if (rh) {
          rh.rotation.x = -0.698 * raiseCurve;
          rh.rotation.z = 0.524 * raiseCurve - clapOsc;
        }
        headBone.rotation.x = 0.1 * raiseCurve;
        lookAtX = 0;
        lookAtY = 0.2 * raiseCurve;
      }
      break;
    }

    case 'bow': {
      const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
      const rootBone = vrm.scene.children[0];
      const bowCurve = progress < 0.25
        ? (progress / 0.25)
        : progress > 0.75
          ? ((1 - progress) / 0.25)
          : 1;
      headBone.rotation.x = -0.7 * bowCurve;
      headBone.rotation.y = 0;
      headBone.rotation.z = 0;
      if (spine) spine.rotation.x = -0.3 * bowCurve;
      if (rootBone) rootBone.rotation.x = -0.15 * bowCurve;
      lookAtY = -0.5 * bowCurve;
      break;
    }
  }

  return { x: lookAtX, y: lookAtY, headRotX, headRotY };
}

export function resetBlinkState(): void {
  blinkState.isBlinking = false;
  blinkState.nextBlinkTime = 0;
  blinkState.blinkStartTime = 0;
}
