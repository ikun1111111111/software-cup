import {
  splitSentences,
  getTimedTextSlice,
  getSubtitleCueForCharIndex,
  textToSubtitleCues,
  analyzeSentence,
  textToTimeline,
  ExpressionPlayer,
  type TimelineEvent,
} from '../utils/textTimeline';

describe('getTimedTextSlice', () => {
  test('reveals text in proportion to elapsed speech time', () => {
    expect(getTimedTextSlice('abcdefghij', 0, 10000)).toBe('');
    expect(getTimedTextSlice('abcdefghij', 5000, 10000)).toBe('abcde');
    expect(getTimedTextSlice('abcdefghij', 10000, 10000)).toBe('abcdefghij');
  });

  test('does not reveal beyond the text when elapsed time exceeds duration', () => {
    expect(getTimedTextSlice('abc', 15000, 10000)).toBe('abc');
  });
});

// ── splitSentences ──

describe('splitSentences', () => {
  test('空字符串返回空数组', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   ')).toEqual([]);
  });

  test('按中文句号分割', () => {
    const result = splitSentences('你好。再见。');
    expect(result).toEqual(['你好。', '再见。']);
  });

  test('按感叹号和问号分割', () => {
    const result = splitSentences('太棒了！真的吗？');
    expect(result).toEqual(['太棒了！', '真的吗？']);
  });

  test('按逗号分割', () => {
    const result = splitSentences('灵山大佛高88米，非常壮观。');
    expect(result.length).toBe(2);
    expect(result[0]).toContain('88米');
    expect(result[1]).toContain('壮观');
  });

  test('混合标点', () => {
    const result = splitSentences('你好！欢迎来到灵山，这里很美。去过吗？');
    expect(result.length).toBe(4);
  });

  test('无标点的单句', () => {
    const result = splitSentences('你好世界');
    expect(result).toEqual(['你好世界']);
  });
});

// ── textToSubtitleCues ──

describe('textToSubtitleCues', () => {
  test('builds timed subtitle cues from spoken sentences', () => {
    const cues = textToSubtitleCues('灵山大照壁。景区入口的仪式性节点，通过照壁开启游线。继续往前看。', 9000);

    expect(cues[0]).toEqual({ timeMs: 0, text: '灵山大照壁。', startChar: 0, endChar: 6 });
    expect(cues[1].timeMs).toBeGreaterThan(0);
    expect(cues[1].text).toContain('景区入口');
    expect(cues[cues.length - 1].text).toBe('继续往前看。');
  });

  test('splits long subtitle chunks so the avatar bubble can refresh', () => {
    const cues = textToSubtitleCues('这是一段没有标点但是非常长的导览文字需要在小气泡里分段显示给用户看', 6000, 16);

    expect(cues.length).toBeGreaterThan(1);
    expect(cues.every((cue) => cue.text.length <= 16)).toBe(true);
  });

  test('finds the current subtitle from speech boundary char index', () => {
    const cues = textToSubtitleCues('第一句。第二句，第三句。', 6000);

    expect(getSubtitleCueForCharIndex(cues, 0)?.text).toBe('第一句。');
    expect(getSubtitleCueForCharIndex(cues, 5)?.text).toBe('第二句，');
    expect(getSubtitleCueForCharIndex(cues, 9)?.text).toBe('第三句。');
  });
});

// ── analyzeSentence ──

describe('analyzeSentence', () => {
  test('感叹句 → surprised + nod', () => {
    const { expression, action } = analyzeSentence('太壮观了！');
    expect(expression).toBe('surprised');
    expect(action).toBe('nod');
  });

  test('含数字 → lookUp', () => {
    const { expression, action } = analyzeSentence('大佛高88米');
    expect(action).toBe('lookUp');
  });

  test('问句 → relaxed + tiltHead', () => {
    const { expression, action } = analyzeSentence('你去过吗？');
    expect(expression).toBe('relaxed');
    expect(action).toBe('tiltHead');
  });

  test('否定词 → shakeHead', () => {
    const { expression, action } = analyzeSentence('不去也没关系');
    expect(action).toBe('shakeHead');
  });

  test('开心词汇 → happy', () => {
    const { expression } = analyzeSentence('欢迎来到灵山，非常开心');
    expect(expression).toBe('happy');
  });

  test('悲伤词汇 → sad', () => {
    const { expression } = analyzeSentence('很抱歉，不太清楚');
    expect(expression).toBe('sad');
  });

  test('愤怒词汇 → angry', () => {
    const { expression } = analyzeSentence('真是讨厌');
    expect(expression).toBe('angry');
  });

  test('思考词汇 → thinking + lookUp', () => {
    const { expression, action } = analyzeSentence('让我想想');
    expect(expression).toBe('thinking');
    expect(action).toBe('lookUp');
  });

  test('默认 → neutral + none', () => {
    const { expression, action } = analyzeSentence('灵山大佛');
    expect(expression).toBe('neutral');
    expect(action).toBe('none');
  });

  test('导览常用话术会触发可见指引动作', () => {
    expect(analyzeSentence('好的，我们继续前往灵山大佛').action).toBe('point');
    expect(analyzeSentence('这里是梵宫，我来为你讲解').action).toBe('point');
    expect(analyzeSentence('打开地图自由逛').action).toBe('point');
  });
});

// ── textToTimeline ──

describe('textToTimeline', () => {
  test('空文本返回单个 neutral 事件', () => {
    const tl = textToTimeline('', 5000);
    expect(tl).toEqual([{ timeMs: 0, expression: 'neutral', action: 'none' }]);
  });

  test('最后一个事件是 neutral', () => {
    const tl = textToTimeline('你好！再见。', 5000);
    const last = tl[tl.length - 1];
    expect(last.expression).toBe('neutral');
    expect(last.action).toBe('none');
    expect(last.timeMs).toBe(5000);
  });

  test('事件数量 = 句子数 + 1（结尾 neutral）', () => {
    const sentences = splitSentences('你好！欢迎来到灵山。大佛高88米。去过吗？');
    const tl = textToTimeline('你好！欢迎来到灵山。大佛高88米。去过吗？', 6000);
    expect(tl.length).toBe(sentences.length + 1);
  });

  test('时间轴按时间排序', () => {
    const tl = textToTimeline('第一句，第二句，第三句。', 6000);
    for (let i = 1; i < tl.length; i++) {
      expect(tl[i].timeMs).toBeGreaterThanOrEqual(tl[i - 1].timeMs);
    }
  });

  test('第一事件时间是 0', () => {
    const tl = textToTimeline('任何文字。', 3000);
    expect(tl[0].timeMs).toBe(0);
  });

  test('时间按字数比例分配', () => {
    const text = '短。这是一段比较长的句子。';
    const tl = textToTimeline(text, 10000);
    // 第一句"短。"（1字）应该比第二句（9字）分配更少时间
    expect(tl[1].timeMs).toBeGreaterThan(tl[0].timeMs);
  });

  test('导览动作默认时长足够被用户看见', () => {
    const tl = textToTimeline('这里是灵山大佛。好的，我们继续前往下一站。', 6000);

    expect(tl[0]).toMatchObject({ action: 'point', durationMs: 1600 });
    expect(tl[1]).toMatchObject({ action: 'point', durationMs: 1600 });
  });
});

// ── ExpressionPlayer ──

describe('ExpressionPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('play 后 onUpdate 被调用', () => {
    const player = new ExpressionPlayer();
    const onUpdate = jest.fn();
    const timeline: TimelineEvent[] = [
      { timeMs: 0, expression: 'happy', action: 'nod' },
      { timeMs: 5000, expression: 'neutral', action: 'none' },
    ];

    player.play(timeline, onUpdate);
    // 第一个 tick 在 100ms 后
    jest.advanceTimersByTime(100);
    expect(onUpdate).toHaveBeenCalledWith('happy', 'nod', 800);

    player.stop();
  });

  test('stop 后 onUpdate 被调用为 neutral', () => {
    const player = new ExpressionPlayer();
    const onUpdate = jest.fn();
    const timeline: TimelineEvent[] = [
      { timeMs: 0, expression: 'happy', action: 'nod' },
      { timeMs: 5000, expression: 'neutral', action: 'none' },
    ];

    player.play(timeline, onUpdate);
    jest.advanceTimersByTime(100);
    player.stop();
    expect(onUpdate).toHaveBeenLastCalledWith('neutral', 'none', 800);
  });

  test('时间推进后切换表情', () => {
    const player = new ExpressionPlayer();
    const onUpdate = jest.fn();
    const timeline: TimelineEvent[] = [
      { timeMs: 0, expression: 'happy', action: 'nod' },
      { timeMs: 500, expression: 'sad', action: 'shakeHead' },
      { timeMs: 5000, expression: 'neutral', action: 'none' },
    ];

    player.play(timeline, onUpdate);

    // 初始 tick
    jest.advanceTimersByTime(100);
    expect(onUpdate).toHaveBeenCalledWith('happy', 'nod', 800);

    // 超过 500ms 应该切换到 sad
    jest.advanceTimersByTime(500);
    expect(onUpdate).toHaveBeenCalledWith('sad', 'shakeHead', 800);

    player.stop();
  });

  test('同一时间段内不重复触发 onUpdate', () => {
    const player = new ExpressionPlayer();
    const onUpdate = jest.fn();
    const timeline: TimelineEvent[] = [
      { timeMs: 0, expression: 'happy', action: 'nod' },
      { timeMs: 5000, expression: 'neutral', action: 'none' },
    ];

    player.play(timeline, onUpdate);
    jest.advanceTimersByTime(100);
    const callCount = onUpdate.mock.calls.length;

    // 再过 100ms，仍在同一时间段，不应再次调用
    jest.advanceTimersByTime(100);
    expect(onUpdate.mock.calls.length).toBe(callCount);

    player.stop();
  });
});
