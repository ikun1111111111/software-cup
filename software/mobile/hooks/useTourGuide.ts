import { useCallback, useEffect, useRef, useState } from 'react';
import type { DistanceInfo, DistanceLevel } from './useTourGeolocation';

// ============ 类型定义 ============

export type GuideVoiceMode = 'silent' | 'normal' | 'verbose';

export interface GuideStrategy {
  level: DistanceLevel;
  text: string;
  emotion: string;
  cooldownMs: number;  // 冷却时间，防止重复播报
}

// ============ Hook ============

interface UseTourGuideOptions {
  vrmSpeak: (text: string, emotion?: string) => void;
  mode?: GuideVoiceMode;     // 语音模式
  enabled?: boolean;          // 是否启用引导
}

/**
 * 数字人引导策略Hook
 * 基于GPS距离自动触发数字人语音引导
 */
export function useTourGuide(
  distanceInfo: DistanceInfo | null,
  options: UseTourGuideOptions,
) {
  const { vrmSpeak, mode = 'normal', enabled = true } = options;

  const lastLevelRef = useRef<DistanceLevel>('unknown');
  const lastSpeakTimeRef = useRef(0);
  const farRepeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentGuide, setCurrentGuide] = useState<string>('');

  // 清理定时器
  useEffect(() => {
    return () => {
      if (farRepeatTimerRef.current) {
        clearTimeout(farRepeatTimerRef.current);
      }
    };
  }, []);

  // 生成引导文本
  const getGuideText = useCallback((info: DistanceInfo, level: DistanceLevel): GuideStrategy | null => {
    if (!enabled) return null;

    const { spotName, distance } = info;

    switch (level) {
      case 'far':
        return {
          level: 'far',
          text: `您距离${spotName}约${distance}米，跟我来，让我为您导航`,
          emotion: 'neutral',
          cooldownMs: 60000, // far级别每60秒播报一次
        };

      case 'near':
        return {
          level: 'near',
          text: `前方${distance}米就是${spotName}了，准备好探索了吗`,
          emotion: 'happy',
          cooldownMs: 30000,
        };

      case 'close':
        return {
          level: 'close',
          text: `即将到达${spotName}！请打开景点详情页打卡`,
          emotion: 'excited',
          cooldownMs: 20000,
        };

      case 'arrived':
        return {
          level: 'arrived',
          text: `欢迎来到${spotName}！点击打卡记录您的到访`,
          emotion: 'happy',
          cooldownMs: 15000,
        };

      default:
        return null;
    }
  }, [enabled]);

  // 检查是否应该播报
  const shouldSpeak = useCallback((strategy: GuideStrategy): boolean => {
    const now = Date.now();
    const elapsed = now - lastSpeakTimeRef.current;

    // level变化 → 立即播报
    if (strategy.level !== lastLevelRef.current) {
      return true;
    }

    // 同一level → 检查冷却时间
    return elapsed >= strategy.cooldownMs;
  }, []);

  // 监听距离变化
  useEffect(() => {
    if (!distanceInfo || mode === 'silent') {
      setCurrentGuide('');
      return;
    }

    const strategy = getGuideText(distanceInfo, distanceInfo.level);
    if (!strategy) return;

    if (shouldSpeak(strategy)) {
      // 执行语音引导
      vrmSpeak(strategy.text, strategy.emotion);
      setCurrentGuide(strategy.text);
      lastSpeakTimeRef.current = Date.now();
      lastLevelRef.current = strategy.level;

      // far级别设置定时重复
      if (strategy.level === 'far') {
        if (farRepeatTimerRef.current) {
          clearTimeout(farRepeatTimerRef.current);
        }
        farRepeatTimerRef.current = setTimeout(() => {
          if (lastLevelRef.current === 'far') {
            vrmSpeak(strategy.text, strategy.emotion);
            lastSpeakTimeRef.current = Date.now();
            if (distanceInfo) {
              setCurrentGuide(strategy.text);
            }
          }
        }, strategy.cooldownMs);
      }
    }
  }, [distanceInfo, mode, getGuideText, shouldSpeak, vrmSpeak]);

  // 重置引导状态（切换景点时调用）
  const resetGuide = useCallback(() => {
    lastLevelRef.current = 'unknown';
    lastSpeakTimeRef.current = 0;
    setCurrentGuide('');
    if (farRepeatTimerRef.current) {
      clearTimeout(farRepeatTimerRef.current);
    }
  }, []);

  return {
    currentGuide,
    resetGuide,
    mode,
  };
}
