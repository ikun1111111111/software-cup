import {
  extractFirstCompleteSentence,
  splitPrefetchedAnswer,
} from '../utils/firstSentencePrefetch';

describe('first sentence TTS prefetch', () => {
  test('waits for a configured sentence terminator and ignores commas', () => {
    expect(extractFirstCompleteSentence('灵山大佛高八十八米')).toBeNull();
    expect(extractFirstCompleteSentence('灵山大佛高八十八米，值得参观')).toBeNull();
    expect(extractFirstCompleteSentence('灵山大佛高八十八米。值得参观')).toBe('灵山大佛高八十八米。');
    expect(extractFirstCompleteSentence('先看大佛；再去梵宫')).toBe('先看大佛；');
    expect(extractFirstCompleteSentence('先看大佛;再去梵宫')).toBe('先看大佛;');
  });

  test('does not return an empty sentence for leading punctuation', () => {
    expect(extractFirstCompleteSentence('！后续内容')).toBeNull();
  });

  test('splits only when the final answer still matches and has a remainder', () => {
    expect(splitPrefetchedAnswer('第一句。第二句。', '第一句。')).toEqual({
      first: '第一句。',
      rest: '第二句。',
    });
    expect(splitPrefetchedAnswer('改写后的答案。', '第一句。')).toBeNull();
    expect(splitPrefetchedAnswer('第一句。', '第一句。')).toBeNull();
    expect(splitPrefetchedAnswer('第一句。   ', '第一句。')).toBeNull();
  });
});
