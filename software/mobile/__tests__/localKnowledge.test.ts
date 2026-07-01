import {
  findLocalKnowledgeAnswer,
  getLocalKnowledgeEntryCount,
  getLocalDemoAnswer,
  getOfflineFallbackAnswer,
} from '../utils/localKnowledge';

describe('localKnowledge', () => {
  test('keeps enough local demo entries for competition fallback', () => {
    expect(getLocalKnowledgeEntryCount()).toBeGreaterThanOrEqual(25);
  });

  test('matches Lingshan Buddha height questions', () => {
    const result = getLocalDemoAnswer('灵山大佛有多高？');

    expect(result?.answer).toContain('88米');
    expect(result?.displayAnswer).toBe(result?.answer);
    expect(result?.emotion).toBe('surprised');
  });

  test('answers attraction best-time questions from current spot context', () => {
    const result = getLocalDemoAnswer('当前景点是灵山大佛。最佳游览时间是什么时候？', {
      spotId: 'ling-shan-da-fo',
      spotName: '灵山大佛',
    });

    expect(result?.answer).toContain('春秋季节');
    expect(result?.answer).toContain('建议停留1.5-2小时');
    expect(result?.answer).not.toContain('88米');
    expect(result?.sourceLabel).toBe('景点详情游览提示');
  });

  test('answers attraction duration questions from current spot context', () => {
    const result = getLocalDemoAnswer('这一站建议游览多久？', {
      spotId: 'jiu-long-guan-yu',
      spotName: '九龙灌浴',
    });

    expect(result?.answer).toContain('九龙灌浴建议游览30-45分钟');
    expect(result?.answer).toContain('每日4-5场表演');
  });

  test('matches Nine Dragons Bathing show questions', () => {
    const result = getLocalDemoAnswer('九龙灌浴什么时候表演');

    expect(result?.answer).toContain('每日有4到5场');
  });

  test('matches family route questions', () => {
    const result = getLocalDemoAnswer('带孩子怎么玩比较轻松？');

    expect(result?.answer).toContain('亲子路线');
    expect(result?.answer).toContain('百子戏弥勒');
  });

  test('matches short-time route questions', () => {
    const result = getLocalDemoAnswer('我只有一小时，灵山怎么快速玩？');

    expect(result?.answer).toContain('九龙灌浴');
    expect(result?.answer).toContain('灵山大佛');
  });

  test('matches etiquette and service questions', () => {
    const result = getLocalDemoAnswer('礼佛有什么注意事项？');

    expect(result?.answer).toContain('保持安静');
    expect(result?.category).toBe('service');
  });

  test('returns null for unknown questions in direct local matching', () => {
    expect(findLocalKnowledgeAnswer('今天无锡股票行情怎么样')).toBeNull();
  });

  test('offline fallback refuses unknown questions without inventing facts', () => {
    const result = getOfflineFallbackAnswer('今天无锡股票行情怎么样');

    expect(result.answer).toContain('还没有找到可靠答案');
    expect(result.displayAnswer).toBe(result.answer);
    expect(result.score).toBe(0);
  });
});
