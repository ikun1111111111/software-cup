import { useEffect, useRef } from 'react';

export interface BoneTargets {
  leftUpperArm: { x: number; y: number; z: number };
  rightUpperArm: { x: number; y: number; z: number };
  leftLowerArm: { x: number; y: number; z: number };
  rightLowerArm: { x: number; y: number; z: number };
  rightHand?: { x: number; y: number; z: number };
  waveMode?: boolean;
}

interface GestureSegment {
  startTime: number;
  endTime: number;
  targets: BoneTargets;
}

interface GestureProps {
  isSpeaking: boolean;
  audioTimeSec: number;
  audioDurationSec: number;
  text?: string;
  onGestureChange: (targets: BoneTargets) => void;
}

export const GESTURE_REST: BoneTargets = {
  leftUpperArm:  { x: 0.12, y: 0, z: 0 },
  rightUpperArm: { x: 0.12, y: 0, z: 0 },
  leftLowerArm:  { x: 0.05, y: 0, z: 0 },
  rightLowerArm: { x: 0.05, y: 0, z: 0 },
};

const WAVE_RIGHT: BoneTargets = {
  leftUpperArm:  { x: 0.12, y: 0, z: 0 },
  rightUpperArm: { x: 0.12, y: 0, z: 0 },
  leftLowerArm:  { x: 0.05, y: 0, z: 0 },
  rightLowerArm: { x: 2.2, y: 0, z: 0 },
  rightHand:     { x: 0, y: 0, z: 0 },
  waveMode: true,
};

const PRESENT_LEFT: BoneTargets = {
  leftUpperArm:  { x: -0.5, y: 0.2, z: 0.5 },
  rightUpperArm: { x: 0.12, y: 0, z: 0 },
  leftLowerArm:  { x: 0.5, y: 0, z: 0 },
  rightLowerArm: { x: 0.05, y: 0, z: 0 },
};

const PRESENT_RIGHT: BoneTargets = {
  leftUpperArm:  { x: 0.12, y: 0, z: 0 },
  rightUpperArm: { x: -0.5, y: -0.2, z: 0.5 },
  leftLowerArm:  { x: 0.05, y: 0, z: 0 },
  rightLowerArm: { x: 0.5, y: 0, z: 0 },
};

const PRESENT_BOTH: BoneTargets = {
  leftUpperArm:  { x: -0.5, y: 0.15, z: 0.4 },
  rightUpperArm: { x: -0.5, y: -0.15, z: 0.4 },
  leftLowerArm:  { x: 0.5, y: 0, z: 0 },
  rightLowerArm: { x: 0.5, y: 0, z: 0 },
};

const EMPHASIZE: BoneTargets = {
  leftUpperArm:  { x: -0.3, y: 0, z: 0.2 },
  rightUpperArm: { x: -0.3, y: 0, z: 0.2 },
  leftLowerArm:  { x: 0.7, y: 0, z: 0 },
  rightLowerArm: { x: 0.7, y: 0, z: 0 },
};

const THINK: BoneTargets = {
  leftUpperArm:  { x: -0.6, y: 0.3, z: 0.5 },
  rightUpperArm: { x: 0.05, y: 0, z: 0 },
  leftLowerArm:  { x: 1.4, y: 0, z: 0 },
  rightLowerArm: { x: 0.05, y: 0, z: 0 },
};

function classifyGesture(content: string, index: number, _total: number): BoneTargets {
  if (index === 0 && /你好|欢迎|大家好|各位/.test(content)) return WAVE_RIGHT;
  if (/左边|西侧|往左|这里/.test(content)) return PRESENT_LEFT;
  if (/右边|东侧|往右|梵宫|大佛/.test(content)) return PRESENT_RIGHT;
  if (/前方|直走|前面|整个|全部|全部景点/.test(content)) return PRESENT_BOTH;
  if (/注意|重要|必去|推荐|记得/.test(content)) return EMPHASIZE;
  if (/历史|传说|故事|由来|为什么|文化|由来/.test(content)) return THINK;
  return GESTURE_REST;
}

function buildSegments(text: string, durationSec: number): GestureSegment[] {
  const sentences = text.split(/([，。！？；、\n])/).filter(s => s.trim().length > 0);
  const totalChars = text.replace(/[，。！？；、\n]/g, '').length;
  const charsPerSec = Math.max(1, totalChars / durationSec);
  const segments: GestureSegment[] = [];
  let currentTime = 0;
  const meaningful = sentences.filter(s => !s.match(/^[，。！？；、\n]$/));

  for (let i = 0; i < meaningful.length; i++) {
    const content = meaningful[i].trim();
    if (!content) continue;
    const segDuration = Math.max(0.8, content.length / charsPerSec);
    segments.push({
      startTime: currentTime,
      endTime: currentTime + segDuration,
      targets: classifyGesture(content, i, meaningful.length),
    });
    currentTime += segDuration;
  }
  return segments;
}

const SpeakingGestureController: React.FC<GestureProps> = ({
  isSpeaking,
  audioTimeSec,
  audioDurationSec,
  text = '',
  onGestureChange,
}) => {
  const segmentsRef = useRef<GestureSegment[]>([]);
  const lastTextRef = useRef('');
  const lastSegmentIdxRef = useRef(-1);

  useEffect(() => {
    if (!isSpeaking) {
      segmentsRef.current = [];
      lastTextRef.current = '';
      lastSegmentIdxRef.current = -1;
      onGestureChange(GESTURE_REST);
      return;
    }
    if (text && text !== lastTextRef.current) {
      lastTextRef.current = text;
      const duration = audioDurationSec > 0 ? audioDurationSec : Math.max(3, text.length / 4);
      segmentsRef.current = buildSegments(text, duration);
      lastSegmentIdxRef.current = -1;
    }
  }, [isSpeaking, text, audioDurationSec, onGestureChange]);

  useEffect(() => {
    if (!isSpeaking || segmentsRef.current.length === 0) return;

    const segments = segmentsRef.current;
    let idx = 0;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (audioTimeSec >= segments[i].startTime) { idx = i; break; }
    }

    if (idx !== lastSegmentIdxRef.current) {
      lastSegmentIdxRef.current = idx;
      onGestureChange(segments[idx].targets);
    }
  }, [isSpeaking, audioTimeSec, onGestureChange]);

  return null;
};

export default SpeakingGestureController;
