/**
 * VRM 数字人表现包 (PerformancePreset)
 * 覆盖比赛演示最常见场景，定义表情、动作、注视、语音文本的稳定映射。
 */
import type { Emotion } from '@/components/vrm/VRMTypes';
import type { Action } from '@/components/vrm/VRMIdleAnim';

/** 注视目标，映射到头部旋转角度 */
export type GazeTarget = 'user' | 'map' | 'routeCard' | 'spotImage' | 'up' | 'left' | 'right' | 'down';

/** 富表情配置（未来可扩展强度、嘴型、眼型等） */
export interface ExpressionProfile {
  emotion: Emotion;
  intensity: number; // 0-1，预留字段
  durationMs: number;
}

/** 表现包：一个完整场景的数字人表现定义 */
export interface PerformancePreset {
  id: string;
  label: string; // 按钮文案
  description: string; // 场景说明
  expression: ExpressionProfile;
  primaryAction: Action;
  actionDurationMs: number;
  gaze: GazeTarget;
  headRotation: { x: number; y: number };
  speechText: string;
}

/** 注视目标 → 头部旋转角度映射 */
export const GAZE_ROTATION: Record<GazeTarget, { x: number; y: number }> = {
  user: { x: 0, y: 0 },
  map: { x: 0.1, y: 0.2 },
  routeCard: { x: 0, y: 0.15 },
  spotImage: { x: 0.05, y: -0.1 },
  up: { x: -0.25, y: 0 },
  left: { x: 0, y: -0.2 },
  right: { x: 0, y: 0.2 },
  down: { x: 0.2, y: 0 },
};

/** 8 个比赛演示表现包 */
export const PERFORMANCE_PRESETS: PerformancePreset[] = [
  {
    id: 'welcomeGuide',
    label: '欢迎',
    description: '首次出现，建立亲和力',
    expression: { emotion: 'happy', intensity: 0.8, durationMs: 5000 },
    primaryAction: 'wave',
    actionDurationMs: 2000,
    gaze: 'user',
    headRotation: GAZE_ROTATION.user,
    speechText: '欢迎来到灵山胜境，我是你的数字导游小灵。今天想怎么游玩，我都可以帮你安排。',
  },
  {
    id: 'listenUser',
    label: '倾听',
    description: '用户按住说话时',
    expression: { emotion: 'relaxed', intensity: 0.5, durationMs: 3000 },
    primaryAction: 'tiltHead',
    actionDurationMs: 1500,
    gaze: 'user',
    headRotation: { x: 0.02, y: -0.05 },
    speechText: '我在听，请告诉我你想玩多久、对哪些景点感兴趣。',
  },
  {
    id: 'thinkingAnswer',
    label: '思考',
    description: '等待回答生成',
    expression: { emotion: 'thinking', intensity: 0.6, durationMs: 4000 },
    primaryAction: 'tiltHead',
    actionDurationMs: 2000,
    gaze: 'left',
    headRotation: GAZE_ROTATION.left,
    speechText: '我来帮你整理一下最合适的路线，请稍等。',
  },
  {
    id: 'routePresent',
    label: '推荐路线',
    description: '展示路线卡片',
    expression: { emotion: 'happy', intensity: 0.7, durationMs: 6000 },
    primaryAction: 'point',
    actionDurationMs: 2000,
    gaze: 'routeCard',
    headRotation: GAZE_ROTATION.routeCard,
    speechText: '这条路线适合一小时游览，重点看灵山大佛和九龙灌浴，时间刚刚好。',
  },
  {
    id: 'spotNarration',
    label: '到点讲解',
    description: '景点现场讲解',
    expression: { emotion: 'relaxed', intensity: 0.5, durationMs: 7000 },
    primaryAction: 'nod',
    actionDurationMs: 1200,
    gaze: 'spotImage',
    headRotation: GAZE_ROTATION.spotImage,
    speechText: '这一站我们来到灵山大佛，它是景区最具代表性的地标，也是世界最高的青铜立佛。',
  },
  {
    id: 'amazedIntro',
    label: '惊叹介绍',
    description: '宏伟景观介绍',
    expression: { emotion: 'surprised', intensity: 0.8, durationMs: 5000 },
    primaryAction: 'lookUp',
    actionDurationMs: 2000,
    gaze: 'up',
    headRotation: GAZE_ROTATION.up,
    speechText: '灵山大佛高达八十八米，站在脚下仰望，真的非常震撼！',
  },
  {
    id: 'apologizeUnknown',
    label: '未知问题',
    description: '资料不足时的反馈',
    expression: { emotion: 'sad', intensity: 0.5, durationMs: 4000 },
    primaryAction: 'shakeHead',
    actionDurationMs: 1500,
    gaze: 'down',
    headRotation: GAZE_ROTATION.down,
    speechText: '这个问题资料里暂时没有明确提到，我不能随便编造，建议到游客中心咨询。',
  },
  {
    id: 'tourComplete',
    label: '完成总结',
    description: '游览结束的仪式感',
    expression: { emotion: 'grateful', intensity: 0.8, durationMs: 6000 },
    primaryAction: 'bow',
    actionDurationMs: 2000,
    gaze: 'user',
    headRotation: GAZE_ROTATION.user,
    speechText: '今天的路线完成啦！我可以帮你生成一份旅行记忆，记录走过的每一站。',
  },
];
