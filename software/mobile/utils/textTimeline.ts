export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised' | 'thinking' | 'grateful';
export type { Action } from '../components/vrm/VRMIdleAnim';
import type { Action } from '../components/vrm/VRMIdleAnim';

export interface TimelineEvent {
  timeMs: number;
  expression: Emotion;
  action: Action;
  durationMs?: number;
}

export interface SubtitleCue {
  timeMs: number;
  text: string;
  startChar: number;
  endChar: number;
}

export interface SpeechBoundary {
  char: string;
  start_ms: number;
}

export interface TextBoundary {
  timeMs: number;
  charIndex: number;
}

export function mapSpeechBoundariesToText(
  text: string,
  boundaries: SpeechBoundary[],
): TextBoundary[] {
  let searchFrom = 0;
  let fallbackIndex = 0;

  return boundaries.map((boundary) => {
    const token = boundary.char.trim();
    const foundAt = token ? text.indexOf(token, searchFrom) : -1;
    const charIndex = foundAt >= 0
      ? foundAt
      : Math.min(Math.max(text.length - 1, 0), fallbackIndex);

    const advanceBy = Math.max(token.length, 1);
    searchFrom = foundAt >= 0 ? foundAt + advanceBy : Math.min(text.length, charIndex + advanceBy);
    fallbackIndex = searchFrom;

    return { timeMs: boundary.start_ms, charIndex };
  });
}

export function getTimedTextSlice(text: string, elapsedMs: number, durationMs: number): string {
  if (!text) return '';
  if (!Number.isFinite(durationMs) || durationMs <= 0) return text;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return '';

  const progress = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  const charCount = Math.min(text.length, Math.ceil(text.length * progress));
  return text.slice(0, charCount);
}

// ── 分句器 ──

export function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  const parts = text.split(/(?<=[。！？!?；;，,])/);
  return parts.filter((s) => s.trim().length > 0);
}

interface SubtitleChunk {
  text: string;
  startChar: number;
  endChar: number;
}

function splitLongSubtitleChunk(text: string, startChar: number, maxChars: number): SubtitleChunk[] {
  const chunk = text.trim();
  if (!chunk) return [];

  const trimmedStartChar = startChar + text.length - text.trimStart().length;
  if (chunk.length <= maxChars) {
    return [{ text: chunk, startChar: trimmedStartChar, endChar: trimmedStartChar + chunk.length }];
  }

  const chunks: SubtitleChunk[] = [];
  for (let i = 0; i < chunk.length; i += maxChars) {
    const textPart = chunk.slice(i, i + maxChars);
    chunks.push({
      text: textPart,
      startChar: trimmedStartChar + i,
      endChar: trimmedStartChar + i + textPart.length,
    });
  }
  return chunks;
}

function textToSubtitleChunks(text: string, maxChars: number): SubtitleChunk[] {
  let searchFrom = 0;
  return splitSentences(text).flatMap((sentence) => {
    const foundAt = text.indexOf(sentence, searchFrom);
    const sentenceStart = foundAt >= 0 ? foundAt : searchFrom;
    searchFrom = sentenceStart + sentence.length;
    return splitLongSubtitleChunk(sentence, sentenceStart, maxChars);
  });
}

export function textToSubtitleCues(
  text: string,
  durationMs: number,
  maxChars = 36,
): SubtitleCue[] {
  const chunks = textToSubtitleChunks(text, maxChars);

  if (chunks.length === 0) return [];

  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
  let accumulatedRatio = 0;

  return chunks.map((chunk) => {
    const cue = {
      timeMs: Math.round(accumulatedRatio * durationMs),
      text: chunk.text,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
    };
    accumulatedRatio += chunk.text.length / Math.max(totalChars, 1);
    return cue;
  });
}

export function getSubtitleCueForCharIndex(cues: SubtitleCue[], charIndex: number): SubtitleCue | undefined {
  if (cues.length === 0) return undefined;
  if (!Number.isFinite(charIndex)) return cues[0];

  const index = Math.max(0, Math.floor(charIndex));
  const directMatch = cues.find((cue) => index >= cue.startChar && index < cue.endChar);
  if (directMatch) return directMatch;

  for (let i = cues.length - 1; i >= 0; i--) {
    if (index >= cues[i].startChar) {
      return cues[i];
    }
  }
  return cues[0];
}

// ── 情感分析 ──

function analyzeSentenceLegacy(sentence: string): { expression: Emotion; action: Action } {
  const s = sentence.trim();

  // ── 表情分析（优先级从高到低）──
  let expression: Emotion = 'neutral';

  // surprised: 惊叹、震撼
  if (/(哇|天哪|天啊|我的天|太[!！]|真[!！]|好[!！]|太壮观|太棒|真棒|真壮观|好棒|太美了|太厉害了|太牛|太厉害|太精彩|太震撼|太惊人|太神奇|太不可思议)/.test(s)) {
    expression = 'surprised';
  }
  // happy: 开心、欢迎、赞美
  else if (/(开心|高兴|喜欢|欢迎|美好|精彩|壮观|美丽|漂亮|棒|好|赞|优秀|出色|完美|太好了|真好|真好|真棒|好极了|棒极了|太棒了|太开心|太高兴|太喜欢|太美好|太精彩|太壮观|太美丽|太漂亮)/.test(s)) {
    expression = 'happy';
  }
  // grateful: 感谢、感恩
  else if (/(谢谢|感谢|感恩|多谢|谢了|谢意|谢谢您|感谢你|感谢您|谢谢大家|感谢大家|感激|辛苦了|感恩)/.test(s)) {
    expression = 'grateful';
  }
  // thinking: 思考、犹豫
  else if (/(想想|思考|考虑|让我想想|想一想|想想看|思考一下|考虑一下|琢磨|琢磨一下|想想办法|思考思考|考虑考虑)/.test(s)) {
    expression = 'thinking';
  }
  // sad: 抱歉、遗憾、难过
  else if (/(抱歉|遗憾|难过|可惜|对不起|不好意思|抱歉啊|真抱歉|很抱歉|太遗憾|真遗憾|太难过|真难过|太可惜|真可惜|不清楚|不知道|不太清楚|不太知道|不太明白|不明白)/.test(s)) {
    expression = 'sad';
  }
  // angry: 生气、愤怒
  else if (/(生气|愤怒|讨厌|烦|气死|气人|真烦|真讨厌|真生气|真愤怒|太烦|太讨厌|太生气|太愤怒)/.test(s)) {
    expression = 'angry';
  }
  // relaxed: 不确定、推测
  else if (/(也许|可能|大概|或许|应该|估计|想必|大约|差不多|好像|似乎|仿佛|应该吧|可能吧|大概吧)/.test(s)) {
    expression = 'relaxed';
  }
  // 疑问句
  else if (/[？?]$/.test(s)) {
    expression = 'relaxed';
  }

  // ── 动作分析（优先级从高到低）──
  let action: Action = 'none';

  // wave: 打招呼、欢迎
  if (/(你好|欢迎|嗨|hi|hello|见到你|大家好|你们好|您好|哈喽|嘿)/.test(s)) {
    action = 'wave';
  }
  // point: 指引方向
  else if (/(请看|那边|这里|前方|左边|右边|左侧|右侧|看这|看那|这边|往这|往那|指向|指着|瞧这|瞧那|继续前往|跟我来)/.test(s)) {
    action = 'point';
  }
  // clap: 鼓掌、祝贺
  else if (/(鼓掌|拍手|祝贺|恭喜|庆祝|掌声|太棒了|太好了|真棒|真棒|好样的|干得好|厉害|真厉害|太厉害)/.test(s)) {
    action = 'clap';
  }
  // bow: 感谢、祝福、感恩
  else if (/(谢谢|感谢|感恩|多谢|谢了|谢意|谢谢您|感谢你|感谢您|谢谢大家|感谢大家|祝福|祝愿|祝福你|祝福您|祝您|祝你)/.test(s)) {
    action = 'bow';
  }
  // lookUp: 思考时抬头
  else if (/(想想|思考|考虑|让我想想|想一想|想想看|思考一下|考虑一下|琢磨|琢磨一下)/.test(s)) {
    action = 'lookUp';
  }
  // tiltHead: 疑问
  else if (/[？?]$/.test(s)) {
    action = 'tiltHead';
  }
  // shakeHead: 否定、拒绝
  else if (/(不太|不是|不行|不要|不对|不去|不想|不用|不必|不需要|没有|无法|否定|拒绝|别|不清楚|不知道|不明白|不可以|不能|不会|抱歉|遗憾|可惜|对不起|不好意思)/.test(s)) {
    action = 'shakeHead';
  }
  // nod: 肯定、同意、明白
  else if (/(是的|对|好|嗯|明白|了解|知道|同意|可以|好的|对对|对对对|没错|没错|确实|确实|当然|当然|当然可以|当然好|当然行|当然对|当然是的|我知道了|我懂了|我懂了|我了解|我明白|我同意|我可以|我知道|我懂|我清楚|我清楚|我了解|我明白了|我了解了|我懂了|我清楚了|我清楚了|我懂了|我了解了)/.test(s)) {
    action = 'nod';
  }
  // lookUp: 高度相关（优先级较低）
  else if (/(高达|米|层|楼|高|高度|海拔|身高)/.test(s)) {
    action = 'lookUp';
  }
  // nod: 感叹（优先级较低）
  else if (/[！!]|哇[！!]|太壮观|太棒|真棒/.test(s)) {
    action = 'nod';
  }

  return { expression, action };
}

export function analyzeSentence(sentence: string): { expression: Emotion; action: Action } {
  const text = sentence.trim();
  if (!text) return { expression: 'neutral', action: 'none' };

  let expression: Emotion = 'relaxed';
  if (/(惊喜|壮观|震撼|竟然|不可思议|太厉害|太美了)/.test(text)) {
    expression = 'surprised';
  } else if (/(抱歉|遗憾|可惜|无法|不知道|不清楚)/.test(text)) {
    expression = 'sad';
  } else if (/(危险|注意|禁止|不要|务必|安全)/.test(text)) {
    expression = 'angry';
  } else if (/(生气|愤怒|讨厌|真烦|气人)/.test(text)) {
    expression = 'angry';
  } else if (/(想想|思考|考虑|让我想想|琢磨)/.test(text)) {
    expression = 'thinking';
  } else if (/(谢谢|感谢|感恩)/.test(text)) {
    expression = 'grateful';
  } else if (/(欢迎|你好|很高兴|开心|太好了|恭喜)/.test(text)) {
    expression = 'happy';
  }

  if (/(欢迎|你好|您好|再见|幸会)/.test(text)) {
    return { expression: 'happy', action: 'wave' };
  }
  if (/(请看|看这里|看这边|前方|身后|左边|右边|左侧|右侧|跟我来)/.test(text)) {
    return { expression: expression === 'relaxed' ? 'happy' : expression, action: 'showcase' };
  }
  if (/^(没错|当然|可以|好的|是的)[，。！？!?]?$/.test(text)) {
    return { expression: 'happy', action: 'nod' };
  }
  return { expression, action: 'explain' };
}

function mergeTimelineSentences(sentences: string[]): string[] {
  const merged: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const compact = sentence.trim().replace(/[，,。！？!?；;]+$/, '');
    const next = sentences[i + 1];
    if (/^(好|好的|嗯|是的|可以|明白)$/.test(compact) && next) {
      merged.push(`${sentence}${next}`);
      i += 1;
      continue;
    }
    merged.push(sentence);
  }

  return merged;
}

function getDefaultActionDuration(action: Action): number {
  switch (action) {
    case 'wave':
    case 'thinking':
    case 'listen':
      return 2000;
    case 'explain':
      return 2600;
    case 'showcase':
      return 1800;
    case 'nod':
      return 1200;
    case 'waiting1':
    case 'waiting2':
    case 'waiting3':
      return 3000;
    case 'none':
    default:
      return 800;
  }
}

// ── 时间轴生成 ──

export function textToTimeline(text: string, durationMs: number): TimelineEvent[] {
  const sentences = mergeTimelineSentences(splitSentences(text));
  if (sentences.length === 0) {
    return [{ timeMs: 0, expression: 'neutral', action: 'none' }];
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  const primaryAction = analyzeSentence(text).action;
  const events: TimelineEvent[] = [];
  let accumulatedRatio = 0;

  for (const sentence of sentences) {
    const timeMs = Math.round(accumulatedRatio * durationMs);
    const { expression } = analyzeSentence(sentence);
    events.push({
      timeMs,
      expression,
      action: primaryAction,
      durationMs: getDefaultActionDuration(primaryAction),
    });
    accumulatedRatio += sentence.length / Math.max(totalChars, 1);
  }

  // 说话结束恢复 neutral
  events.push({ timeMs: durationMs, expression: 'neutral', action: 'none' });

  return events;
}

// ── 播放器 ──

export class ExpressionPlayer {
  private timeline: TimelineEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private currentIndex = -1;
  private onUpdate: ((expression: Emotion, action: Action, durationMs: number) => void) | null = null;

  play(timeline: TimelineEvent[], onUpdate: (expression: Emotion, action: Action, durationMs: number) => void): void {
    this.clearTimer();
    this.timeline = timeline;
    this.onUpdate = onUpdate;
    this.currentIndex = -1;
    this.startTime = Date.now();
    this.timer = setInterval(() => this.tick(), 100);
    this.tick();
  }

  stop(): void {
    this.clearTimer();
    this.currentIndex = -1;
    this.onUpdate?.('neutral', 'none', 800);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const elapsed = Date.now() - this.startTime;
    const lastEvent = this.timeline[this.timeline.length - 1];
    if (lastEvent && elapsed >= lastEvent.timeMs + 500) {
      this.clearTimer();
      this.currentIndex = -1;
      this.onUpdate?.('neutral', 'none', 800);
      return;
    }
    let newIndex = 0;
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      if (this.timeline[i].timeMs <= elapsed) {
        newIndex = i;
        break;
      }
    }
    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      const event = this.timeline[newIndex];
      this.onUpdate?.(event.expression, event.action, event.durationMs ?? 800);
    }
  }
}
