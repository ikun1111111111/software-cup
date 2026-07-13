import fs from 'fs';
import path from 'path';
import { textToTimeline } from '../utils/textTimeline';

describe('home VRM greeting action', () => {
  test('starts the homepage greeting with an explicit wave action', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toMatch(/speakWithDigitalHuman\('欢迎来到灵山胜境[\s\S]*?action: 'wave'[\s\S]*?actionDuration: 1600[\s\S]*?replaceCurrent: true/s);
    expect(source).toMatch(/if \(!isFocused\) return undefined;[\s\S]*?homeDigitalHuman\.activate\(\);[\s\S]*?speakWithDigitalHuman\('欢迎来到灵山胜境/s);
    expect(source).not.toContain("if (!isFocused || Platform.OS === 'web') return undefined;");
  });

  test('does not switch the homepage greeting to explain between clauses', () => {
    const events = textToTimeline('欢迎来到灵山胜境，我是小灵，今天由我带你游灵山', 5000);

    expect(events.slice(0, -1).map((event) => event.action)).toEqual(['wave', 'wave', 'wave']);
  });
});
