export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'relaxed' | 'surprised' | 'thinking' | 'grateful';
export type Action = 'nod' | 'shakeHead' | 'tiltHead' | 'lookUp' | 'lookDown' | 'wave' | 'point' | 'clap' | 'bow' | 'none';

export interface TimelineEvent {
  timeMs: number;
  expression: Emotion;
  action: Action;
  durationMs?: number;
}

// ── 分句器 ──

export function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  const parts = text.split(/(?<=[。！？!?；;，,])/);
  return parts.filter((s) => s.trim().length > 0);
}

// ── 情感分析 ──

export function analyzeSentence(sentence: string): { expression: Emotion; action: Action } {
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
  else if (/(请看|那边|这里|前方|左边|右边|看这|看那|这边|那边|往这|往那|指向|指着|看看|瞧|瞧这|瞧那)/.test(s)) {
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

// ── 时间轴生成 ──

export function textToTimeline(text: string, durationMs: number): TimelineEvent[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return [{ timeMs: 0, expression: 'neutral', action: 'none' }];
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  const events: TimelineEvent[] = [];
  let accumulatedRatio = 0;

  for (const sentence of sentences) {
    const timeMs = Math.round(accumulatedRatio * durationMs);
    const { expression, action } = analyzeSentence(sentence);
    events.push({ timeMs, expression, action, durationMs: action === 'lookUp' ? 2500 : 800 });
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
