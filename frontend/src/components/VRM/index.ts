/**
 * VRM 组件库导出
 *
 * 统一导出所有 VRM 相关组件和工具
 */

// VRMManager 全局单例
export { VRMManager, useVRMManager } from './VRMManager';
export type {
  PageContext,
  SpeakOptions,
  VRMState,
} from './VRMManager';

// FloatingGuide 浮窗组件
export { FloatingGuide } from './FloatingGuide';
export type { FloatingGuideRef } from './FloatingGuide';

// 使用示例（可选导入）
export * as FloatingGuideExamples from './FloatingGuide.examples';
